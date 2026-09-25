### `routers/analytics/router.py`


# routers/analytics/router.py
import os
import base64
from fastapi  import APIRouter, HTTPException   # type: ignore
from pydantic import BaseModel  # type: ignore
from typing   import Optional

from .data_loader          import normalize_metrics, generate_sample_data
from .exploratory          import (compute_global_kpis, performance_by_content_type,
                                    performance_by_platform, get_top_posts, generate_weekly_summary)
from .prophet_forecaster   import run_all_forecasts
from .engagement_predictor import train_all_models, predict_engagement_score
from .chart_generator      import generate_all_charts
from .report_generator     import generate_analytics_pdf_b64

router = APIRouter(prefix="/analytics", tags=["Analytics"])


class AnalyzeRequest(BaseModel):
    client_name   : str = "Client"
    metrics       : list[dict] = []      # Métriques JSON de Laravel
    period_days   : int = 30
    generate_pdf  : bool = True
    use_sample    : bool = False         # Utiliser données simulées


class PredictRequest(BaseModel):
    content_type   : str
    platform       : str
    hour           : int
    day_num        : int
    estimated_reach: int = 3000
    metrics        : list[dict] = []      # Métriques JSON de Laravel (mêmes conventions que /analyze)
    use_sample     : bool = False         # Utiliser données simulées


@router.post("/analyze")
async def analyze(req: AnalyzeRequest):
    """
    Pipeline complet Analytics IA :
    1. Normalisation des métriques (depuis Meta Graph API)
    2. Analyse exploratoire (KPIs, tendances, top posts)
    3. Prophet (prédictions 30 jours)
    4. XGBoost + Random Forest (prédiction engagement + importance features)
    5. Matplotlib (7 graphiques en base64)
    6. ReportLab (rapport PDF en base64)
    """
    try:
        # 1. Charger les données
        records = req.metrics if req.metrics and not req.use_sample else generate_sample_data(180)
        df, metadata = normalize_metrics(records)

        if df.empty:
            raise HTTPException(400, "Aucune métrique valide")

        # 2. Analyse exploratoire
        kpis         = compute_global_kpis(df, req.period_days)
        weekly       = generate_weekly_summary(df)
        top_posts    = get_top_posts(df, n=5)
        perf_type    = performance_by_content_type(df)
        perf_plat    = performance_by_platform(df)

        # 3. Prophet
        prophet_results = run_all_forecasts(df)

        # 4. XGBoost + Random Forest
        ml_result = train_all_models(df)

        # 5. Graphiques base64
        perf_type_dict = perf_type.to_dict(orient="records") if not perf_type.empty else []
        perf_plat_dict = perf_plat.to_dict(orient="records") if not perf_plat.empty else []

        charts = generate_all_charts(df, prophet_results, ml_result, perf_type, perf_plat)

        # Sérialiser les résultats Prophet
        prophet_stats = {
            metric: {
                "stats"        : result["stats"],
                "forecast_fut" : result["forecast_fut"][["ds", "yhat", "yhat_lower", "yhat_upper"]]
                                  .assign(ds=lambda x: x["ds"].astype(str))
                                  .to_dict(orient="records")
            }
            for metric, result in prophet_results.items()
        }

        # Sérialiser importance features
        importance_list = []
        if ml_result and "importance_df" in ml_result:
            importance_list = ml_result["importance_df"].to_dict(orient="records")

        # 6. PDF base64
        pdf_b64 = None
        if req.generate_pdf:
            pdf_b64 = generate_analytics_pdf_b64(
                req.client_name, kpis, weekly, top_posts,
                prophet_results, ml_result, charts,
                perf_type_dict, perf_plat_dict
            )

        return {
            "status"          : "success",
            "metadata"        : metadata,
            "kpis"            : kpis,
            "weekly_summary"  : weekly,
            "top_posts"       : top_posts,
            "perf_type"       : perf_type_dict,
            "perf_platform"   : perf_plat_dict,
            "prophet"         : prophet_stats,
            "ml_metrics"      : ml_result["xgb_metrics"] if ml_result else None,
            "importance"      : importance_list,
            "charts"          : charts,   # {nom: base64_png}
            "pdf_base64"      : pdf_b64,
        }

    except HTTPException:
        # Ne pas ré-envelopper un HTTPException volontaire (ex: 400 ci-dessus)
        # dans le except Exception générique plus bas — HTTPException hérite
        # d'Exception, donc sans ce garde-fou il finit toujours en 500 avec
        # un message du type "400: ..." au lieu du vrai code d'origine.
        raise
    except Exception as e:
        import traceback
        raise HTTPException(500, f"Erreur pipeline analytics : {str(e)}\n{traceback.format_exc()}")


@router.post("/predict")
async def predict(req: PredictRequest):
    """
    Prédit l'engagement d'un futur post (XGBoost).

    Entraîne le modèle sur les vraies métriques transmises (req.metrics) quand
    elles sont disponibles — mêmes conventions que /analyze. Ne retombe sur des
    données simulées que si aucune métrique réelle n'est fournie ; le champ
    data_source de la réponse indique toujours laquelle a été utilisée.
    En production, les modèles seraient persistés (joblib) pour éviter de
    ré-entraîner à chaque appel — non fait ici, hors scope de ce correctif.
    """
    try:
        use_sample = not req.metrics or req.use_sample
        records    = generate_sample_data(180) if use_sample else req.metrics
        df, _   = normalize_metrics(records)
        ml      = train_all_models(df)
        if not ml:
            raise HTTPException(422, "Modèles non disponibles")

        result = predict_engagement_score(
            ml, req.content_type, req.platform,
            req.hour, req.day_num
        )
        return {
            "status": "success",
            "data_source": "simulated" if use_sample else "real",
            **result,
        }

    except HTTPException:
        # Même garde-fou que /analyze : sans lui, le 422 "Modèles non
        # disponibles" ci-dessus se faisait ré-envelopper en 500 "422:
        # Modèles non disponibles" — Laravel ne pouvait alors jamais
        # distinguer "pas assez de données" (cas honnête) d'une vraie panne.
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/health")
async def health():
    return {"status": "ok", "service": "analytics"}