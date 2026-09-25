### `routers/ad_optimizer/data_loader.py`


# routers/ad_optimizer/data_loader.py
"""
Chargement et normalisation des métriques de campagnes publicitaires.
Les données arrivent en JSON depuis Laravel (Meta Ads API + Google Ads API).

M�triques clés de la publicité digitale :

CTR (Click-Through Rate) = Clics / Impressions × 100
  → Mesure l'attractivité de la publicité
  → Bon CTR : > 2% (Facebook), > 1% (Google Display)

CPC (Cost Per Click) = Budget dépensé / Clics
  → Coût unitaire par clic

CPA (Cost Per Acquisition) = Budget dépensé / Conversions
  → Coût pour obtenir un client

ROAS (Return On Ad Spend) = Revenus / Budget dépensé
  → ROAS > 3 = rentable en général

CPM (Cost Per Mille) = Budget / Impressions × 1000
  → Coût pour 1000 impressions
"""

import pandas as pd  # type: ignore
import numpy as np   # type: ignore
from datetime import datetime
import warnings
warnings.filterwarnings("ignore")


def normalize_campaign_data(records: list[dict]) -> tuple[pd.DataFrame, dict]:
    """
    Normalise les métriques JSON reçues depuis Laravel.
    Les données viennent de :
      - Meta Ads API v21 (GET /act_{id}/campaigns, /insights)
      - Google Ads API (GAQL)
      - Playwright scraping complémentaire

    Returns:
        df_clean : DataFrame avec métriques standardisées + KPIs calculés
        metadata : dict résumé des campagnes
    """
    if not records:
        return pd.DataFrame(), {}

    df = pd.DataFrame(records)
    print(f"📊 Normalisation : {len(df)} entrées campagnes")

    df_clean = pd.DataFrame()

    def safe_num(col, default=0):
        if col in df.columns:
            return pd.to_numeric(df[col], errors="coerce").fillna(default)
        return pd.Series([default] * len(df))

    def safe_str(col, default="Unknown"):
        if col in df.columns:
            return df[col].fillna(default).astype(str)
        return pd.Series([default] * len(df))

    # ---- Métriques brutes ----
    df_clean["impressions"]     = safe_num("impressions")
    df_clean["clicks"]          = safe_num("clicks")
    df_clean["spend"]           = safe_num("spend")
    df_clean["conversions"]     = safe_num("conversions")
    df_clean["revenue"]         = safe_num("revenue")
    df_clean["campaign_name"]   = safe_str("campaign_name", "Campagne")
    df_clean["platform"]        = safe_str("platform", "Meta")
    df_clean["audience_age"]    = safe_str("audience_age", "25-34")
    df_clean["audience_gender"] = safe_str("audience_gender", "All")
    df_clean["ad_type"]         = safe_str("ad_type", "Image")

    # ---- Date ----
    date_col = next((c for c in ["date", "date_start", "day", "timestamp"] if c in df.columns), None)
    if date_col:
        df_clean["date"] = pd.to_datetime(df[date_col], errors="coerce")
    else:
        df_clean["date"] = pd.date_range(end=datetime.now(), periods=len(df), freq="D")

    # ---- KPIs dérivés ----
    # CTR
    df_clean["ctr"] = np.where(
        df_clean["impressions"] > 0,
        (df_clean["clicks"] / df_clean["impressions"] * 100).round(4),
        0
    )
    # CPC
    df_clean["cpc"] = np.where(
        df_clean["clicks"] > 0,
        (df_clean["spend"] / df_clean["clicks"]).round(4),
        0
    )
    # CPA
    df_clean["cpa"] = np.where(
        df_clean["conversions"] > 0,
        (df_clean["spend"] / df_clean["conversions"]).round(4),
        df_clean["spend"]
    )
    # ROAS (si revenue=0, estimer via conversions × valeur_moyenne=50€)
    df_clean["roas"] = np.where(
        df_clean["spend"] > 0,
        (df_clean["revenue"] / df_clean["spend"]).round(4),
        0
    )
    avg_order_value = 50
    mask_no_revenue = (df_clean["revenue"] == 0) & (df_clean["spend"] > 0)
    df_clean.loc[mask_no_revenue, "roas"] = (
        df_clean.loc[mask_no_revenue, "conversions"] * avg_order_value /
        df_clean.loc[mask_no_revenue, "spend"]
    )

    # CPM
    df_clean["cpm"] = np.where(
        df_clean["impressions"] > 0,
        (df_clean["spend"] / df_clean["impressions"] * 1000).round(4),
        0
    )
    # Taux de conversion
    df_clean["conversion_rate"] = np.where(
        df_clean["clicks"] > 0,
        (df_clean["conversions"] / df_clean["clicks"] * 100).round(4),
        0
    )

    # ---- Score de performance composite ----
    # Formule : ROAS × 40% + CTR_norm × 30% + conv_rate_norm × 30%
    max_roas = max(df_clean["roas"].max(), 1)
    max_ctr  = max(df_clean["ctr"].max(),  1)
    max_cv   = max(df_clean["conversion_rate"].max(), 1)

    df_clean["performance_score"] = (
        (df_clean["roas"] / max_roas) * 40 +
        (df_clean["ctr"]  / max_ctr)  * 30 +
        (df_clean["conversion_rate"] / max_cv) * 30
    ).round(2)

    # ---- Statut automatique ----
    df_clean["status"] = "Normal"
    df_clean.loc[df_clean["ctr"]  < 0.5, "status"] = "CTR Faible"
    df_clean.loc[df_clean["roas"] < 1.0, "status"] = "ROAS Négatif"
    df_clean.loc[df_clean["cpa"]  > df_clean["cpa"].quantile(0.8), "status"] = "CPA Élevé"
    df_clean.loc[df_clean["performance_score"] >= 70, "status"] = "Top Performer"

    df_clean = df_clean.sort_values("date").reset_index(drop=True)

    # ---- Métadonnées ----
    total_spend = df_clean["spend"].sum()
    metadata = {
        "total_campaigns"  : df_clean["campaign_name"].nunique(),
        "total_spend"      : round(total_spend, 2),
        "total_revenue"    : round(df_clean["revenue"].sum(), 2),
        "total_clicks"     : int(df_clean["clicks"].sum()),
        "total_impressions": int(df_clean["impressions"].sum()),
        "total_conversions": int(df_clean["conversions"].sum()),
        "avg_ctr"          : round(df_clean["ctr"].mean(), 3),
        "avg_cpc"          : round(df_clean["cpc"].mean(), 3),
        "avg_cpa"          : round(df_clean["cpa"].mean(), 2),
        "avg_roas"         : round(df_clean["roas"].mean(), 2),
        "avg_cpm"          : round(df_clean["cpm"].mean(), 2),
        "overall_roas"     : round(df_clean["revenue"].sum() / total_spend, 2) if total_spend > 0 else 0,
        "underperforming"  : int(df_clean["status"].isin(["CTR Faible", "ROAS Négatif", "CPA Élevé"]).sum()),
        "top_performers"   : int((df_clean["status"] == "Top Performer").sum()),
        "platforms"        : df_clean["platform"].unique().tolist(),
        "date_start"       : str(df_clean["date"].min())[:10],
        "date_end"         : str(df_clean["date"].max())[:10],
    }

    print(f"   ✅ ROAS global : {metadata['overall_roas']} | CTR moy : {metadata['avg_ctr']}%")
    print(f"   ✅ Sous-performants : {metadata['underperforming']} | Top : {metadata['top_performers']}")
    return df_clean, metadata


def generate_sample_campaigns(n: int = 50) -> list[dict]:
    """
    Génère des métriques de campagnes simulées réalistes.
    Utilisé pour les tests sans token Meta/Google Ads.
    """
    import random
    np.random.seed(42)
    random.seed(42)

    platforms  = ["Meta", "Google", "Instagram", "TikTok"]
    ad_types   = ["Image", "Vidéo", "Carrousel", "Stories", "Collection"]
    ages       = ["18-24", "25-34", "35-44", "45-54", "55+"]
    genders    = ["Male", "Female", "All"]
    campaigns  = [f"Campagne_{i+1}" for i in range(10)]
    dates      = pd.date_range(end=datetime.now(), periods=30, freq="D")

    type_factor = {"Vidéo":1.5, "Carrousel":1.3, "Stories":1.1, "Image":1.0, "Collection":1.2}
    rows = []
    for _ in range(n):
        ad_type    = random.choice(ad_types)
        tf         = type_factor.get(ad_type, 1.0)
        budget     = random.uniform(50, 500)
        impressions= int(max(100, np.random.normal(5000, 2000) * tf))
        ctr_base   = np.random.normal(1.8, 0.8) * tf
        clicks     = int(max(0, impressions * ctr_base / 100))
        spend      = min(budget, clicks * np.random.normal(0.8, 0.3))
        conversions= int(max(0, clicks * np.random.normal(0.03, 0.015)))
        revenue    = conversions * np.random.normal(80, 30)

        rows.append({
            "date"            : random.choice(dates).isoformat(),
            "campaign_name"   : random.choice(campaigns),
            "platform"        : random.choice(platforms),
            "ad_type"         : ad_type,
            "audience_age"    : random.choice(ages),
            "audience_gender" : random.choice(genders),
            "impressions"     : impressions,
            "clicks"          : max(0, clicks),
            "spend"           : round(max(0, spend), 2),
            "conversions"     : conversions,
            "revenue"         : round(max(0, revenue), 2),
        })
    return rows