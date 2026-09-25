### `routers/analytics/data_loader.py`


# routers/analytics/data_loader.py
"""
Chargement et normalisation des métriques collectées.

Les données arrivent depuis Laravel en JSON (métriques collectées
via Meta Graph API + Playwright toutes les 6 heures).

Structure attendue depuis Laravel :
  [
    {
      "date"          : "2024-01-15 18:00:00",
      "platform"      : "instagram",
      "content_type"  : "Reel",
      "likes"         : 1250,
      "comments"      : 48,
      "shares"        : 32,
      "reach"         : 8400,
      "impressions"   : 9200,
      "saves"         : 67,
      "followers"     : 5240,
      "engagement_rate": null   # Calculé automatiquement
    },
    ...
  ]

Le module normalise ces données et calcule les métriques dérivées.
"""
  
import pandas as pd   # type: ignore
import numpy as np   # type: ignore
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings("ignore")


def normalize_metrics(records: list[dict]) -> tuple[pd.DataFrame, dict]:
    """
    Normalise les métriques JSON reçues depuis Laravel.

    Les données viennent de Meta Graph API (collecte 6h) et
    Playwright (scraping complémentaire).

    Returns:
        df_clean : DataFrame normalisé avec métriques dérivées
        metadata : dict résumé du dataset
    """
    if not records:
        return pd.DataFrame(), {}

    df = pd.DataFrame(records)
    print(f"📊 Normalisation : {len(df)} métriques")

    df_clean = pd.DataFrame()

    # ---- Date ----
    date_cols = ["date", "timestamp", "created_at", "collected_at"]
    date_col  = next((c for c in date_cols if c in df.columns), None)
    if date_col:
        df_clean["date"] = pd.to_datetime(df[date_col], errors="coerce")
    else:
        df_clean["date"] = pd.date_range(end=datetime.now(), periods=len(df), freq="6h")

    # ---- Métriques numériques ----
    def safe_num(col, default=0):
        if col in df.columns:
            return pd.to_numeric(df[col], errors="coerce").fillna(default)
        return pd.Series([default] * len(df))

    df_clean["likes"]       = safe_num("likes")
    df_clean["comments"]    = safe_num("comments")
    df_clean["shares"]      = safe_num("shares")
    df_clean["reach"]       = safe_num("reach")
    df_clean["impressions"] = safe_num("impressions")
    df_clean["saves"]       = safe_num("saves")
    df_clean["followers"]   = safe_num("followers")

    # Reach = impressions si manquant
    df_clean.loc[df_clean["reach"] == 0, "reach"] = df_clean.loc[
        df_clean["reach"] == 0, "impressions"
    ]
    # Fallback : reach estimé depuis likes
    df_clean.loc[df_clean["reach"] == 0, "reach"] = (
        df_clean.loc[df_clean["reach"] == 0, "likes"] * 15
    )

    # ---- Plateforme + type de contenu ----
    df_clean["platform"]     = df.get("platform", pd.Series(["instagram"] * len(df))).fillna("instagram")
    df_clean["content_type"] = df.get("content_type", pd.Series(["Post"] * len(df))).fillna("Post")
    df_clean["hour"]         = df_clean["date"].dt.hour
    df_clean["day_of_week"]  = df_clean["date"].dt.day_name()
    df_clean["day_num"]      = df_clean["date"].dt.dayofweek

    # ---- Score d'engagement composite (formule SMMA) ----
    # Pondération : commentaires × 2, partages × 3, saves × 2 (valent plus que les likes)
    total_interactions = (
        df_clean["likes"]    * 1.0 +
        df_clean["comments"] * 2.0 +
        df_clean["shares"]   * 3.0 +
        df_clean["saves"]    * 2.0
    )
    df_clean["engagement_score"] = np.where(
        df_clean["reach"] > 0,
        (total_interactions / df_clean["reach"] * 100).round(2),
        0
    )

    # ---- Taux d'engagement simple ----
    df_clean["engagement_rate"] = np.where(
        df_clean["reach"] > 0,
        ((df_clean["likes"] + df_clean["comments"] + df_clean["shares"])
         / df_clean["reach"] * 100).round(2),
        0
    )

    # ---- Nettoyage final ----
    df_clean = df_clean.dropna(subset=["date"]).sort_values("date").reset_index(drop=True)

    # ---- Métadonnées ----
    metadata = {
        "total_posts"       : len(df_clean),
        "date_start"        : str(df_clean["date"].min())[:10],
        "date_end"          : str(df_clean["date"].max())[:10],
        "platforms"         : df_clean["platform"].unique().tolist(),
        "content_types"     : df_clean["content_type"].unique().tolist(),
        "avg_likes"         : round(df_clean["likes"].mean(), 1),
        "avg_comments"      : round(df_clean["comments"].mean(), 1),
        "avg_shares"        : round(df_clean["shares"].mean(), 1),
        "avg_reach"         : round(df_clean["reach"].mean(), 1),
        "avg_engagement"    : round(df_clean["engagement_rate"].mean(), 2),
        "total_likes"       : int(df_clean["likes"].sum()),
        "total_comments"    : int(df_clean["comments"].sum()),
        "total_shares"      : int(df_clean["shares"].sum()),
        "total_reach"       : int(df_clean["reach"].sum()),
        "best_content_type" : df_clean.groupby("content_type")["engagement_rate"]
                              .mean().idxmax() if len(df_clean) > 0 else "N/A",
        "best_day"          : df_clean.groupby("day_of_week")["engagement_rate"]
                              .mean().idxmax() if len(df_clean) > 0 else "N/A",
        "best_hour"         : int(df_clean.groupby("hour")["engagement_rate"]
                              .mean().idxmax()) if len(df_clean) > 0 else 18,
    }

    print(f"   ✅ {len(df_clean)} métriques normalisées | Engagement moy: {metadata['avg_engagement']}%")
    return df_clean, metadata


def generate_sample_data(n_posts: int = 180) -> list[dict]:
    """
    Génère des données simulées réalistes si aucune donnée Meta API disponible.
    Simule 180 posts sur 90 jours (2 posts/jour).
    Utile pour les tests sans token Meta.
    """
    import random
    np.random.seed(42)
    random.seed(42)

    platforms     = ["instagram", "tiktok", "facebook", "linkedin"]
    content_types = ["Reel", "Carrousel", "Photo", "Story", "Article", "Vidéo"]
    dates         = pd.date_range(end=datetime.now(), periods=n_posts, freq="12h")

    # Facteurs d'engagement réalistes
    hour_peaks    = {9:1.4, 10:1.3, 12:1.6, 13:1.4, 17:1.5, 18:1.8, 19:2.0, 20:1.9, 21:1.7}
    type_factors  = {"Reel":2.2, "Carrousel":1.8, "Vidéo":2.0, "Photo":1.2, "Story":0.8, "Article":1.4}
    trend         = np.linspace(1.0, 1.3, n_posts)

    rows = []
    for i, date in enumerate(dates):
        platform     = random.choice(platforms)
        content_type = random.choice(content_types)
        h            = date.hour
        h_factor     = hour_peaks.get(h, 0.7)
        t_factor     = type_factors.get(content_type, 1.0)

        reach    = int(max(100, np.random.normal(3000, 800) * h_factor * trend[i]))
        likes    = int(max(0, np.random.normal(reach * 0.08, reach * 0.02) * t_factor))
        comments = int(max(0, np.random.normal(likes * 0.08, likes * 0.03)))
        shares   = int(max(0, np.random.normal(likes * 0.04, likes * 0.02)))
        saves    = int(max(0, np.random.normal(likes * 0.06, likes * 0.02)))

        rows.append({
            "date"        : date.isoformat(),
            "platform"    : platform,
            "content_type": content_type,
            "likes"       : likes,
            "comments"    : comments,
            "shares"      : shares,
            "reach"       : reach,
            "impressions" : int(reach * 1.1),
            "saves"       : saves,
            "followers"   : 5000 + i * 12,
        })

    return rows