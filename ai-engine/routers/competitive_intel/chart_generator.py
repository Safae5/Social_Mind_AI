### `routers/competitive_intel/chart_generator.py`


# routers/competitive_intel/chart_generator.py
"""
6 graphiques analytiques de veille concurrentielle en base64 PNG.

1. Sentiment par concurrent (barplot empilé VADER + TextBlob)
2. Engagement moyen par concurrent (barplot coloré)
3. Carte des clusters thématiques (scatter 2D K-Means + DBSCAN)
4. Hashtags viraux (barplot horizontal avec score de viralité)
5. WordCloud des mots-clés viraux (TF-IDF)
6. Taux de viralité par type de contenu (barplot comparatif)
"""

import matplotlib  # type: ignore
matplotlib.use("Agg")
import matplotlib.pyplot as plt   # type: ignore
import matplotlib.patches as mpatches   # type: ignore
import seaborn as sns   # type: ignore
import pandas as pd   # type: ignore
import numpy as np   # type: ignore
import base64
import io
try:
    from wordcloud import WordCloud   # type: ignore
    WORDCLOUD_AVAILABLE = True
except ImportError:
    WORDCLOUD_AVAILABLE = False

plt.rcParams.update({
    "figure.facecolor" : "#f8f9fa",
    "axes.facecolor"   : "#ffffff",
    "axes.grid"        : True,
    "grid.alpha"       : 0.3,
    "axes.spines.top"  : False,
    "axes.spines.right": False,
})
COLORS = {
    "primary": "#0f3460", "success": "#27ae60", "warning": "#e67e22",
    "danger" : "#e74c3c", "purple" : "#6a1b9a",
    "palette": ["#0f3460","#27ae60","#e67e22","#e74c3c","#6a1b9a","#00796b","#c0392b","#2980b9"],
}


def _fig_to_b64(fig: plt.Figure) -> str:
    """Convertit une figure Matplotlib en base64 PNG."""
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=120, bbox_inches="tight")
    buf.seek(0)
    b64 = base64.b64encode(buf.read()).decode("utf-8")
    plt.close(fig)
    return b64


def chart_sentiment_by_competitor(sentiment_df: pd.DataFrame) -> str | None:
    """Barplot empilé du sentiment par concurrent."""
    if sentiment_df is None or sentiment_df.empty:
        return None
    fig, ax = plt.subplots(figsize=(12, 5))
    x = range(len(sentiment_df))
    ax.bar(x, sentiment_df["positive_pct"], color=COLORS["success"],  alpha=0.8, label="Positif")
    ax.bar(x, sentiment_df["neutral_pct"],  color="#95a5a6",           alpha=0.8,
           bottom=sentiment_df["positive_pct"], label="Neutre")
    ax.bar(x, sentiment_df["negative_pct"], color=COLORS["danger"],   alpha=0.8,
           bottom=sentiment_df["positive_pct"] + sentiment_df["neutral_pct"], label="Négatif")
    ax.set_xticks(list(x))
    ax.set_xticklabels(sentiment_df["competitor"], rotation=20, ha="right")
    ax.set_title("Analyse de Sentiment par Concurrent\n(VADER + TextBlob)", fontsize=13, fontweight="bold", color=COLORS["primary"])
    ax.set_ylabel("Pourcentage (%)")
    ax.legend()
    fig.tight_layout()
    return _fig_to_b64(fig)


def chart_engagement_comparison(df: pd.DataFrame) -> str | None:
    """Barplot de l'engagement moyen par concurrent."""
    if df.empty:
        return None
    eng_by_comp = df.groupby("competitor")["engagement_score"].mean().sort_values(ascending=False)
    fig, ax = plt.subplots(figsize=(12, 5))
    colors = COLORS["palette"][:len(eng_by_comp)]
    bars   = ax.bar(eng_by_comp.index, eng_by_comp.values, color=colors, alpha=0.85)
    for bar, val in zip(bars, eng_by_comp.values):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 20,
                f"{val:.0f}", ha="center", fontsize=9, fontweight="bold")
    ax.set_title("Engagement Moyen par Concurrent", fontsize=13, fontweight="bold", color=COLORS["primary"])
    ax.set_ylabel("Score d'Engagement Moyen")
    plt.xticks(rotation=15, ha="right")
    fig.tight_layout()
    return _fig_to_b64(fig)


def chart_cluster_scatter(cluster_result: dict) -> str | None:
    """Visualisation 2D des clusters (SVD réduction)."""
    if cluster_result is None:
        return None
    from sklearn.decomposition import TruncatedSVD   # type: ignore
    X     = cluster_result["X_reduced"]
    df_cl = cluster_result["df_clustered"]
    X_2d  = TruncatedSVD(n_components=2, random_state=42).fit_transform(X) if X.shape[1] > 2 else X[:, :2]

    fig, ax = plt.subplots(figsize=(12, 8))
    labels  = df_cl["kmeans_cluster"].values
    names   = cluster_result["cluster_names"]
    palette = COLORS["palette"]

    for cid in np.unique(labels):
        mask  = labels == cid
        color = palette[int(cid) % len(palette)]
        ax.scatter(X_2d[mask, 0], X_2d[mask, 1], c=color, label=names.get(int(cid), f"C{cid}")[:25], alpha=0.6, s=50)

    viral_mask = df_cl["is_dbscan_viral"].values
    if viral_mask.any():
        ax.scatter(X_2d[viral_mask, 0], X_2d[viral_mask, 1], marker="*", c="gold", s=200, label="🔥 Viral (DBSCAN)", zorder=5)

    ax.set_title("Carte des Clusters Thématiques\n(K-Means + DBSCAN — Espace TF-IDF réduit)", fontsize=13, fontweight="bold", color=COLORS["primary"])
    ax.set_xlabel("Dimension 1 (SVD)")
    ax.set_ylabel("Dimension 2 (SVD)")
    ax.legend(loc="upper right", fontsize=8, framealpha=0.7)
    fig.tight_layout()
    return _fig_to_b64(fig)


def chart_viral_hashtags(viral_patterns: dict) -> str | None:
    """Barplot des hashtags viraux."""
    hashtags = viral_patterns.get("viral_hashtags", [])
    if not hashtags:
        return None
    fig, ax = plt.subplots(figsize=(10, 5))
    tags   = [h["hashtag"] for h in hashtags[:12]]
    scores = [h["viral_ratio"] for h in hashtags[:12]]
    colors = [COLORS["success"] if s >= 0.7 else COLORS["warning"] if s >= 0.4 else COLORS["primary"] for s in scores]
    bars   = ax.barh(tags, scores, color=colors, alpha=0.85)
    for bar, val in zip(bars, scores):
        ax.text(bar.get_width() + 0.01, bar.get_y() + bar.get_height()/2, f"{val:.2f}", va="center", fontsize=9)
    ax.set_title("Hashtags Viraux Détectés\n(Ratio présence dans posts viraux / total)", fontsize=13, fontweight="bold", color=COLORS["primary"])
    ax.set_xlabel("Score de Viralité")
    ax.invert_yaxis()
    fig.tight_layout()
    return _fig_to_b64(fig)


def chart_wordcloud_viral(viral_patterns: dict) -> str | None:
    """Nuage de mots des contenus viraux."""
    if not WORDCLOUD_AVAILABLE:
        return None
    keywords = viral_patterns.get("viral_keywords", [])
    if not keywords:
        return None
    word_freq = {kw[0]: max(1, kw[1] * 100) for kw in keywords}
    wc = WordCloud(width=800, height=400, background_color="white", colormap="Blues", max_words=50).generate_from_frequencies(word_freq)
    fig, ax = plt.subplots(figsize=(12, 5))
    ax.imshow(wc, interpolation="bilinear")
    ax.axis("off")
    ax.set_title("Mots-Clés des Contenus Viraux (TF-IDF)", fontsize=13, fontweight="bold", color=COLORS["primary"])
    fig.tight_layout()
    return _fig_to_b64(fig)


def chart_content_type_viral(viral_patterns: dict) -> str | None:
    """Taux de viralité par type de contenu."""
    viral_by_type = viral_patterns.get("viral_by_type", [])
    if not viral_by_type:
        return None
    df_type = pd.DataFrame(viral_by_type)
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    colors = COLORS["palette"][:len(df_type)]
    axes[0].bar(df_type["content_type"], df_type["viral_rate"], color=colors, alpha=0.85)
    axes[0].set_title("Taux de Viralité par Type", fontweight="bold")
    axes[0].set_ylabel("Taux de viralité (%)")
    plt.setp(axes[0].xaxis.get_majorticklabels(), rotation=15)
    axes[1].bar(df_type["content_type"], df_type["avg_eng"], color=colors, alpha=0.85)
    axes[1].set_title("Engagement Moyen par Type", fontweight="bold")
    axes[1].set_ylabel("Engagement moyen")
    plt.setp(axes[1].xaxis.get_majorticklabels(), rotation=15)
    fig.suptitle("Performance par Type de Contenu", fontsize=13, fontweight="bold")
    fig.tight_layout()
    return _fig_to_b64(fig)


def generate_all_charts(
    df              : pd.DataFrame,
    sentiment_by_comp: pd.DataFrame,
    cluster_result  : dict | None,
    viral_patterns  : dict,
) -> dict:
    """Génère les 6 graphiques en base64."""
    print("📊 Génération des 6 graphiques de veille concurrentielle...")
    charts = {}
    for key, fn, args in [
        ("sentiment",  chart_sentiment_by_competitor, (sentiment_by_comp,)),
        ("engagement", chart_engagement_comparison,   (df,)),
        ("clusters",   chart_cluster_scatter,          (cluster_result,)),
        ("hashtags",   chart_viral_hashtags,           (viral_patterns,)),
        ("wordcloud",  chart_wordcloud_viral,          (viral_patterns,)),
        ("types",      chart_content_type_viral,       (viral_patterns,)),
    ]:
        try:
            result = fn(*args)
            if result:
                charts[key] = result
                print(f"   ✅ {key}")
        except Exception as e:
            print(f"   ⚠️ {key}: {e}")
    print(f"   ✅ {len(charts)}/6 graphiques générés en base64")
    return charts