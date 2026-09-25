### `routers/competitive_intel/data_loader.py`


# routers/competitive_intel/data_loader.py
"""
Chargement et normalisation des données publiques des concurrents.
Les données arrivent en JSON depuis Laravel (Meta Graph API + Playwright).

Sources de données publiques :
  - Meta Graph API v21 : données publiques profils Instagram/Facebook
  - Playwright : scraping Facebook public posts + Instagram public profiles
  - Légendes / texte des publications
  - Likes, commentaires, partages
  - Hashtags utilisés
  - Date et fréquence de publication
  - Plateforme (Instagram, TikTok, Twitter, LinkedIn)
  - Nom du compte concurrent
  - Type de contenu (Reel, Post, Carrousel, Story...)
"""

import pandas as pd  # type: ignore
import numpy as np   # type: ignore
import re
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings("ignore")


def normalize_competitor_data(records: list[dict]) -> tuple[pd.DataFrame, dict]:
    """
    Normalise les données JSON reçues depuis Laravel.
    Les données viennent de :
      - Meta Graph API v21 (données publiques)
      - Playwright (scraping public)

    Returns:
        df_clean : DataFrame normalisé avec KPIs calculés
        metadata : dict avec stats globales
    """
    if not records:
        return pd.DataFrame(), {}

    df = pd.DataFrame(records)
    print(f"📊 Normalisation : {len(df)} posts de concurrents")

    df_clean = pd.DataFrame()

    def safe_str(col, default="Unknown"):
        if col in df.columns:
            return df[col].fillna(default).astype(str)
        return pd.Series([default] * len(df))

    def safe_num(col, default=0):
        if col in df.columns:
            return pd.to_numeric(df[col], errors="coerce").fillna(default)
        return pd.Series([default] * len(df))

    df_clean["competitor"]   = safe_str("competitor",   "Concurrent_1")
    df_clean["caption"]      = safe_str("caption",      "")
    df_clean["likes"]        = safe_num("likes")
    df_clean["comments"]     = safe_num("comments")
    df_clean["shares"]       = safe_num("shares")
    df_clean["reach"]        = safe_num("reach")
    df_clean["platform"]     = safe_str("platform",     "Instagram")
    df_clean["content_type"] = safe_str("content_type", "Post")

    # Hashtags
    if "hashtags" in df.columns:
        df_clean["hashtags_raw"] = df["hashtags"].fillna("").astype(str)
    else:
        df_clean["hashtags_raw"] = df_clean["caption"].apply(
            lambda x: " ".join(re.findall(r"#\w+", str(x)))
        )

    # Date
    date_col = next((c for c in ["date","timestamp","date_start","created_at"] if c in df.columns), None)
    if date_col:
        df_clean["date"] = pd.to_datetime(df[date_col], errors="coerce")
    else:
        df_clean["date"] = pd.date_range(end=datetime.now(), periods=len(df), freq="4h")

    # ---- Score d'engagement composite ----
    # Commentaires × 2 + partages × 3 = plus de valeur algorithmique
    df_clean["engagement_score"] = (
        df_clean["likes"]    * 1.0 +
        df_clean["comments"] * 2.0 +
        df_clean["shares"]   * 3.0
    )

    # ---- Taux d'engagement ----
    df_clean["engagement_rate"] = np.where(
        df_clean["reach"] > 0,
        (df_clean["engagement_score"] / df_clean["reach"] * 100).round(3),
        0
    )

    # ---- Indicateur viral (top 15%) ----
    threshold = df_clean["engagement_score"].quantile(0.85)
    df_clean["is_viral"] = df_clean["engagement_score"] >= threshold

    # ---- Heure et jour ----
    df_clean["hour"]        = df_clean["date"].dt.hour
    df_clean["day_of_week"] = df_clean["date"].dt.day_name()

    df_clean = df_clean.sort_values("date").reset_index(drop=True)

    # ---- Métadonnées ----
    metadata = {
        "total_posts"    : len(df_clean),
        "competitors"    : df_clean["competitor"].unique().tolist(),
        "n_competitors"  : df_clean["competitor"].nunique(),
        "platforms"      : df_clean["platform"].unique().tolist(),
        "date_start"     : str(df_clean["date"].min())[:10],
        "date_end"       : str(df_clean["date"].max())[:10],
        "avg_likes"      : round(df_clean["likes"].mean(), 1),
        "avg_comments"   : round(df_clean["comments"].mean(), 1),
        "avg_shares"     : round(df_clean["shares"].mean(), 1),
        "avg_engagement" : round(df_clean["engagement_score"].mean(), 1),
        "viral_posts"    : int(df_clean["is_viral"].sum()),
        "top_competitor" : df_clean.groupby("competitor")["engagement_score"]
                           .mean().idxmax() if len(df_clean) > 0 else "N/A",
    }

    print(f"   ✅ {metadata['n_competitors']} concurrents | {metadata['viral_posts']} posts viraux")
    return df_clean, metadata


def generate_sample_competitors(n: int = 200) -> list[dict]:
    """
    Génère des données simulées réalistes de concurrents.
    Simule 5 concurrents avec des stratégies différentes.
    Utilisé pour les tests sans token Meta Graph API.
    """
    import random
    np.random.seed(42)
    random.seed(42)

    competitors = {
        "BrandA_Premium"   : {"tone": "premium",    "avg_eng": 2500},
        "BrandB_Young"     : {"tone": "casual",      "avg_eng": 4500},
        "BrandC_Expert"    : {"tone": "educational", "avg_eng": 1800},
        "BrandD_Community" : {"tone": "community",   "avg_eng": 3200},
        "BrandE_Promo"     : {"tone": "promotional", "avg_eng": 1200},
    }

    content_by_tone = {
        "premium"    : [
            "Découvrez notre nouvelle collection exclusive ✨ #luxury #premium #fashion",
            "L'excellence à chaque détail. Notre engagement envers la qualité #premium",
            "Parce que vous méritez ce qu'il y a de mieux 🌟 #lifestyle #luxury",
        ],
        "casual"     : [
            "POV : quand tu trouves le look parfait 😍 #fyp #mode #trending",
            "Elle a tout simplement validé ✅ #fashion #inspo #viral",
            "Qui d'autre additionne tout ça au panier ? 🛒 #relatable #shopping",
        ],
        "educational": [
            "5 astuces pour améliorer votre stratégie marketing aujourd'hui 📊 #marketing #tips",
            "Comment nos clients ont augmenté leur ROI de 300% en 3 mois 📈 #casestudy",
            "Thread : Tout ce que vous devez savoir sur le personal branding 🧵 #linkedin",
        ],
        "community"  : [
            "Merci pour votre soutien ! 10 000 abonnés 🎉 #merci #communauté",
            "Quelle est votre couleur préférée de la collection ? 💬 #sondage",
            "Taguez un ami qui adorerait ça ! 👇 #friendsgoals #partage",
        ],
        "promotional": [
            "SOLDES : -50% sur toute la collection ! ⏰ Offre limitée #promo #deal",
            "Flash sale : 24h seulement ! Profitez-en 🔥 #vente #soldes",
            "Code promo SAVE20 pour -20% 🎁 #discount #shopping",
        ]
    }

    platforms     = ["Instagram", "TikTok", "Facebook", "LinkedIn"]
    content_types = ["Reel", "Post", "Carrousel", "Story", "Article"]
    dates         = pd.date_range(end=datetime.now(), periods=60, freq="6h")

    rows = []
    for _ in range(n):
        comp_name = random.choice(list(competitors.keys()))
        comp_info = competitors[comp_name]
        caption   = random.choice(content_by_tone[comp_info["tone"]])
        base_eng  = comp_info["avg_eng"]

        likes    = int(max(0, np.random.normal(base_eng * 0.6, base_eng * 0.2)))
        comments = int(max(0, np.random.normal(base_eng * 0.05, base_eng * 0.02)))
        shares   = int(max(0, np.random.normal(base_eng * 0.03, base_eng * 0.01)))
        reach    = int(max(likes, likes * np.random.uniform(8, 20)))

        rows.append({
            "competitor"   : comp_name,
            "caption"      : caption,
            "platform"     : random.choice(platforms),
            "content_type" : random.choice(content_types),
            "likes"        : likes,
            "comments"     : comments,
            "shares"       : shares,
            "reach"        : reach,
            "hashtags"     : " ".join(re.findall(r"#\w+", caption)),
            "date"         : random.choice(dates).isoformat(),
        })
    return rows