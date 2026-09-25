### 3.5 — `ai_engine/routers/scheduler/router.py`


# ai_engine/routers/scheduler/router.py
"""
Endpoints FastAPI du Planificateur Intelligent.
Appelés par Laravel (backend) en tant que proxy authentifié.
"""

from fastapi            import APIRouter, HTTPException
from pydantic           import BaseModel
from typing             import Optional

from .meta_client       import fetch_posts_90_days, fetch_facebook_page_posts, posts_to_dataframe
from .tiktok_client     import fetch_tiktok_videos
from .prophet_forecaster import run_prophet_on_api_data
from .kmeans_clusterer  import cluster_and_select_slots
from .analyzer          import compute_analytics

import asyncio
import pandas as pd
import numpy as np

router = APIRouter(prefix="/scheduler", tags=["Scheduler"])


class AnalyzeRequest(BaseModel):
    user_id           : int
    social_account_id : int
    platform          : str         # "instagram" | "facebook" | "tiktok"
    access_token      : str
    platform_user_id  : str
    page_id           : Optional[str] = None


@router.post("/analyze")
async def analyze_and_optimize(request: AnalyzeRequest):
    """
    Pipeline complet :
    1. Récupération des données via API officielle
    2. Prophet pour prédire les créneaux
    3. KMeans pour classer les créneaux
    4. Retour des créneaux optimaux à Laravel
    """
    try:
        # ---- Étape 1 : Récupération des données API ----
        print(f"📡 Récupération des données {request.platform}...")

        if request.platform == "instagram":
            posts = await fetch_posts_90_days(
                request.platform_user_id,
                request.access_token,
                days_back=90
            )
        elif request.platform == "facebook":
            if not request.page_id:
                raise HTTPException(400, "page_id requis pour Facebook")
            posts = await fetch_facebook_page_posts(
                request.page_id,
                request.access_token,
                days_back=90
            )
        elif request.platform == "tiktok":
            posts = await fetch_tiktok_videos(
                request.access_token,
                days_back=90
            )
        else:
            raise HTTPException(400, f"Plateforme non supportée : {request.platform}")

        if not posts:
            raise HTTPException(404, "Aucune donnée récupérée depuis l'API")

        # ---- Étape 2 : Convertir en DataFrame ----
        df = posts_to_dataframe(posts)

        # ---- Étape 3 : Prédictions Prophet ----
        print("📈 Analyse Prophet...")
        forecast_df = run_prophet_on_api_data(df, forecast_days=7)

        # ---- Étape 4 : Clustering KMeans ----
        print("🔍 Clustering KMeans...")
        optimal_slots = cluster_and_select_slots(forecast_df, n_slots=14)

        # ---- Étape 5 : Analytics pour les graphiques React ----
        analytics = compute_analytics(df)

        # data_source : les générateurs de repli (Instagram/TikTok, quand
        # l'API réelle échoue) préfixent systématiquement post_id avec
        # "sample_"/"tiktok_sample_" — Facebook n'a pas de repli (voir
        # meta_client.fetch_facebook_page_posts, qui renvoie [] et lève un
        # 404 plus haut). C'est le seul signal disponible sans changer la
        # signature des clients — cf. Laravel SchedulerService::persistOptimalSlots
        # qui stocke ce champ tel quel dans optimal_slots.data_source.
        first_post_id = str(posts[0].get("post_id", "")) if posts else ""
        data_source = "sample" if first_post_id.startswith(("sample_", "tiktok_sample_")) else "real"

        return {
            "status"        : "success",
            "platform"      : request.platform,
            "data_points"   : len(df),
            "data_source"   : data_source,
            "optimal_slots" : optimal_slots,
            "analytics"     : analytics,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Erreur analyse IA : {str(e)}")


@router.get("/health")
async def health():
    return {"status": "ok", "service": "scheduler"}