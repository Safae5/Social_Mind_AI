### `routers/content_strategist/hashtag_scorer.py`


# routers/content_strategist/hashtag_scorer.py
"""
Scoring et recommandation de hashtags via TF-IDF + KMeans.

TF-IDF (Term Frequency — Inverse Document Frequency) :
  Mesure l'importance d'un hashtag dans un document par rapport
  au corpus entier. Un hashtag présent dans peu de posts mais
  fortement dans certains = pertinent et spécifique.

KMeans (Scikit-learn) :
  Regroupe les hashtags en K clusters selon leur co-occurrence
  dans les posts → assigne des ensembles cohérents à chaque pilier.
"""

import re
import numpy as np
import pandas as pd
from collections import Counter
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
from sklearn.preprocessing import normalize


def extract_hashtags_from_corpus(corpus: list[dict]) -> tuple:
    """
    Extrait tous les hashtags du corpus de publications.

    Returns:
        all_hashtags      : liste de tous les hashtags
        hashtag_frequency : Counter des fréquences
        texts_with_tags   : liste de sets de hashtags par post
    """
    all_hashtags    = []
    texts_with_tags = []

    for item in corpus:
        # Hashtags déjà extraits + ceux dans le texte
        tags = list(item.get("hashtags", []))
        text_tags = re.findall(r"#(\w+)", str(item.get("text", "")).lower())
        tags = list(set(tags + [t for t in text_tags if len(t) > 2]))

        all_hashtags.extend(tags)
        texts_with_tags.append(set(tags))

    hashtag_freq = Counter(all_hashtags)
    print(f"   🏷️ {len(hashtag_freq)} hashtags uniques extraits")
    return all_hashtags, hashtag_freq, texts_with_tags


def score_hashtags_tfidf(corpus: list[dict], top_n: int = 50) -> pd.DataFrame:
    """
    Applique TF-IDF sur les hashtags pour identifier les plus pertinents.

    Chaque "document" TF-IDF = liste de hashtags d'un post.
    Score élevé = hashtag important dans certains posts
                  mais pas dans tous → pertinent et spécifique.

    Returns:
        DataFrame des hashtags avec score TF-IDF moyen
    """
    # Construire des "documents de hashtags"
    hashtag_docs = []
    for item in corpus:
        tags = list(item.get("hashtags", []))
        text_tags = re.findall(r"#(\w+)", str(item.get("text", "")).lower())
        all_tags  = list(set(tags + text_tags))
        doc = " ".join([t for t in all_tags if len(t) > 2])
        hashtag_docs.append(doc if doc else "vide")

    vectorizer = TfidfVectorizer(
        max_features=200, min_df=1, max_df=0.95, ngram_range=(1, 1)
    )

    try:
        tfidf_matrix  = vectorizer.fit_transform(hashtag_docs)
        feature_names = vectorizer.get_feature_names_out()
        mean_scores   = np.array(tfidf_matrix.mean(axis=0)).flatten()

        hashtag_scores = sorted(
            zip(feature_names, mean_scores),
            key=lambda x: x[1], reverse=True
        )

        df = pd.DataFrame(hashtag_scores[:top_n], columns=["hashtag", "tfidf_score"])
        df["hashtag"]     = "#" + df["hashtag"]
        df["tfidf_score"] = df["tfidf_score"].round(4)
        return df

    except Exception as e:
        print(f"   ⚠️ TF-IDF erreur : {e}")
        return pd.DataFrame(columns=["hashtag", "tfidf_score"])


def cluster_hashtags_by_pillar(hashtag_df: pd.DataFrame,
                                 pillars: list[dict],
                                 n_clusters: int = 5) -> dict:
    """
    KMeans pour assigner les hashtags aux piliers de contenu.

    Les hashtags sont vectorisés par character n-grams
    puis clustérisés en K groupes correspondant aux piliers.

    Returns:
        dict {pilier_nom: [liste de hashtags recommandés]}
    """
    if hashtag_df.empty or len(hashtag_df) < n_clusters:
        all_tags = list(hashtag_df["hashtag"]) if not hashtag_df.empty else []
        result   = {}
        chunk    = max(1, len(all_tags) // max(1, n_clusters))
        for i, pillar in enumerate(pillars):
            result[pillar["nom"]] = all_tags[i*chunk:(i+1)*chunk][:10]
        return result

    tag_texts  = hashtag_df["hashtag"].str.replace("#", "").tolist()
    vectorizer = TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4))

    try:
        X      = normalize(vectorizer.fit_transform(tag_texts))
        k      = min(n_clusters, len(tag_texts) - 1)
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = kmeans.fit_predict(X)

        pillar_hashtags = {}
        for i, pillar in enumerate(pillars[:k]):
            cluster_tags = hashtag_df[labels == i]["hashtag"].tolist()[:10]
            pillar_hashtags[pillar["nom"]] = cluster_tags

        return pillar_hashtags

    except Exception as e:
        print(f"   ⚠️ KMeans erreur : {e}")
        return {p["nom"]: [] for p in pillars}


def generate_generic_hashtags(niche: str) -> list[str]:
    """Génère des hashtags génériques selon la niche."""
    generic_by_niche = {
        "mode"    : ["#mode", "#fashion", "#style", "#outfit", "#tendance", "#lookoftheday"],
        "fitness" : ["#fitness", "#sport", "#entrainement", "#musculation", "#sante", "#motivation"],
        "food"    : ["#food", "#cuisine", "#recette", "#restaurant", "#gastronomie", "#foodie"],
        "business": ["#business", "#entrepreneur", "#marketing", "#startup", "#leadership", "#success"],
        "beaute"  : ["#beaute", "#beauty", "#skincare", "#makeup", "#soins", "#routine"],
        "default" : ["#contenu", "#marketing", "#reseauxsociaux", "#digital", "#maroc", "#smma"],
    }
    niche_lower = niche.lower()
    for key in generic_by_niche:
        if key in niche_lower:
            return generic_by_niche[key]
    return generic_by_niche["default"]


def generate_hashtag_sets(pillars: list[dict],
                            corpus: list[dict],
                            niche: str) -> dict:
    """
    Pipeline complet : extraction → scoring TF-IDF → clustering KMeans.

    Returns:
        dict avec scored_df, pillar_sets, generic_sets
    """
    print("🏷️ Scoring et clustering des hashtags (TF-IDF + KMeans)...")

    _, freq, _ = extract_hashtags_from_corpus(corpus)
    scored_df  = score_hashtags_tfidf(corpus, top_n=100)

    pillar_sets = cluster_hashtags_by_pillar(
        scored_df, pillars, n_clusters=len(pillars)
    )
    generic_sets = generate_generic_hashtags(niche)

    # Enrichir chaque pilier avec des génériques si nécessaire
    for pilier_nom in pillar_sets:
        existing = pillar_sets[pilier_nom]
        if len(existing) < 5:
            pillar_sets[pilier_nom] = existing + generic_sets[:5 - len(existing)]

        # Top hashtags pour la réponse API
        top_scored = []
        if not scored_df.empty:
            top_scored = scored_df.head(20).to_dict(orient="records")


    print(f"   ✅ Hashtags générés pour {len(pillar_sets)} piliers")
    return {
        "scored_df"   : scored_df,
        "pillar_sets" : pillar_sets,
        "generic_sets": generic_sets,
        "top_scored"  : top_scored,
    }