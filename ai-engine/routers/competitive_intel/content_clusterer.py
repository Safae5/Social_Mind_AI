### `routers/competitive_intel/content_clusterer.py`


# routers/competitive_intel/content_clusterer.py
"""
Clustering du contenu concurrent avec K-Means et DBSCAN.

DEUX ALGORITHMES COMPLÉMENTAIRES :

K-Means :
  - Partitionne en K clusters de taille similaire
  - Idéal pour identifier les THÈMES PRINCIPAUX de contenu
  - Paramètre K choisi via score de silhouette (optimisation auto)
  - Chaque cluster = un axe de contenu des concurrents

DBSCAN (Density-Based Spatial Clustering) :
  - Trouve les clusters selon la DENSITÉ des points
  - Détecte automatiquement les outliers (label=-1)
  - LES OUTLIERS = CONTENUS VIRAUX EXCEPTIONNELS
    (points isolés car leurs métriques sont hors-normes)

VECTORISATION :
  TF-IDF → convertit textes en vecteurs numériques
  TF-IDF × IDF : mots distinctifs par concurrent vs corpus commun
  SVD : réduction dimensions pour améliorer K-Means
"""

import numpy as np  # type: ignore
import pandas as pd  # type: ignore
from sklearn.feature_extraction.text import TfidfVectorizer  # type: ignore
from sklearn.cluster                  import KMeans, DBSCAN # type: ignore
from sklearn.decomposition            import TruncatedSVD  # type: ignore
from sklearn.preprocessing            import normalize  # type: ignore
from sklearn.metrics                  import silhouette_score  # type: ignore
import warnings
warnings.filterwarnings("ignore")


def vectorize_texts(texts: list[str], max_features: int = 500, min_df: int = 2) -> tuple:
    """Vectorise les textes avec TF-IDF."""
    valid_texts = [t for t in texts if t and len(t.split()) >= 2]
    if len(valid_texts) < 5:
        print("   ⚠️ Pas assez de textes valides")
        return None, None

    vectorizer = TfidfVectorizer(
        max_features = max_features,
        min_df       = min(min_df, max(1, len(valid_texts) // 10)),
        max_df       = 0.90,
        ngram_range  = (1, 2),
        sublinear_tf = True
    )
    tfidf_matrix = vectorizer.fit_transform(valid_texts)
    print(f"   📊 Matrice TF-IDF : {tfidf_matrix.shape[0]} docs × {tfidf_matrix.shape[1]} features")
    return tfidf_matrix, vectorizer


def find_optimal_k(X: np.ndarray, k_range=range(2, 9)) -> int:
    """Trouve le nombre optimal de clusters via le score de silhouette."""
    best_k, best_score = 3, -1
    for k in k_range:
        if k >= len(X):
            break
        labels = KMeans(n_clusters=k, random_state=42, n_init=10).fit_predict(X)
        try:
            score = silhouette_score(X, labels)
            if score > best_score:
                best_score = score
                best_k = k
        except Exception:
            pass
    print(f"   🎯 K optimal : {best_k} (silhouette = {best_score:.3f})")
    return best_k


def cluster_content(df: pd.DataFrame) -> dict | None:
    """
    Pipeline complet de clustering du contenu concurrent.

    1. Filtre les textes vides
    2. TF-IDF vectorisation
    3. SVD réduction dimensions (LSA)
    4. K-Means → thèmes principaux
    5. DBSCAN → détection outliers viraux
    6. Extraction des mots-clés par cluster

    Returns: dict avec résultats K-Means, DBSCAN, mots-clés par cluster
    """
    df_valid = df[df["processed_text"].str.len() > 5].copy().reset_index(drop=True)
    if len(df_valid) < 10:
        print("   ⚠️ Pas assez de textes pour le clustering")
        return None

    print(f"📊 Clustering de {len(df_valid)} posts...")

    # 1. Vectorisation TF-IDF
    tfidf_matrix, vectorizer = vectorize_texts(df_valid["processed_text"].tolist())
    if tfidf_matrix is None:
        return None

    # 2. Réduction de dimensionnalité (SVD/LSA)
    n_comp   = min(30, tfidf_matrix.shape[1] - 1, tfidf_matrix.shape[0] - 1)
    svd      = TruncatedSVD(n_components=n_comp, random_state=42)
    X_reduced = normalize(svd.fit_transform(tfidf_matrix))

    # 3. K-Means
    n_clusters    = find_optimal_k(X_reduced)
    kmeans        = KMeans(n_clusters=n_clusters, random_state=42, n_init=10, max_iter=300)
    kmeans_labels = kmeans.fit_predict(X_reduced)
    for u, c in zip(*np.unique(kmeans_labels, return_counts=True)):
        print(f"   Cluster {u}: {c} posts ({c*100//len(kmeans_labels)}%)")

    # 4. DBSCAN
    dbscan        = DBSCAN(eps=0.4, min_samples=3, metric="cosine", n_jobs=-1)
    dbscan_labels = dbscan.fit_predict(X_reduced)
    n_outliers    = int((dbscan_labels == -1).sum())
    n_db_clusters = len(set(dbscan_labels)) - (1 if -1 in dbscan_labels else 0)
    print(f"   📊 {n_db_clusters} clusters DBSCAN, {n_outliers} outliers (contenus viraux)")

    df_valid["kmeans_cluster"] = kmeans_labels
    df_valid["dbscan_cluster"] = dbscan_labels
    df_valid["is_dbscan_viral"]= dbscan_labels == -1

    # 5. Mots-clés par cluster K-Means
    feature_names = vectorizer.get_feature_names_out()
    cluster_keywords = {}
    for cid in np.unique(kmeans_labels):
        indices       = np.where(kmeans_labels == cid)[0]
        cluster_mat   = tfidf_matrix[indices]
        mean_tfidf    = np.array(cluster_mat.mean(axis=0)).flatten()
        top_idx       = mean_tfidf.argsort()[-10:][::-1]
        cluster_keywords[int(cid)] = [feature_names[i] for i in top_idx if mean_tfidf[i] > 0]

    cluster_names = {cid: " / ".join(words[:3]).title() if words else f"Cluster {cid}"
                     for cid, words in cluster_keywords.items()}
    for cid, name in cluster_names.items():
        print(f"   🏷️  Cluster {cid} : {name}")

    # 6. Stats par cluster
    cluster_stats = df_valid.groupby("kmeans_cluster").agg(
        n_posts        = ("competitor", "count"),
        avg_engagement = ("engagement_score", "mean"),
        viral_posts    = ("is_viral", "sum"),
        top_competitor = ("competitor", lambda x: x.value_counts().index[0]),
    ).round(1).reset_index()
    cluster_stats["cluster_name"] = cluster_stats["kmeans_cluster"].map(cluster_names)

    return {
        "df_clustered"    : df_valid,
        "cluster_keywords": cluster_keywords,
        "cluster_names"   : cluster_names,
        "cluster_stats"   : cluster_stats,
        "n_clusters"      : n_clusters,
        "n_outliers"      : n_outliers,
        "X_reduced"       : X_reduced,
    }