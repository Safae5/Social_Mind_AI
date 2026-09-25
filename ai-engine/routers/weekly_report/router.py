### `routers/weekly_report/router.py`


# routers/weekly_report/router.py
from fastapi  import APIRouter, HTTPException
from pydantic import BaseModel
from typing   import Optional
from datetime import datetime

from .meta_fetcher     import (fetch_weekly_metrics, fetch_4_weeks_trend,
                                generate_sample_metrics, generate_sample_4weeks)
from .metrics_analyzer import analyze_metrics, prepare_trend_data
from .report_writer    import generate_weekly_report

router = APIRouter(prefix="/weekly-report", tags=["Weekly Report"])


class WeeklyReportRequest(BaseModel):
    user_name        : str
    platform         : str = "instagram"
    brand_niche      : str = ""
    ig_user_id       : Optional[str] = None
    access_token     : Optional[str] = None
    previous_metrics : Optional[dict] = None
    use_sample_data  : bool = False


@router.post("/generate")
async def generate_report(req: WeeklyReportRequest):
    """
    Pipeline complet en un seul appel :
      1. Récupération métriques Meta Graph API (ou données simulées)
      2. Récupération tendance 4 semaines
      3. Analyse et calcul des variations (Pandas + NumPy)
      4. Rédaction résumé en langage simple (Mistral 7B)
      5. Préparation données graphiques (Chart.js)
    """
    try:
        if req.use_sample_data or not req.ig_user_id or not req.access_token:
            print("   ℹ️ Utilisation données simulées (mode test)")
            current_metrics = generate_sample_metrics()
            weeks_data      = generate_sample_4weeks()
        else:
            print(f"   📡 Récupération métriques Meta pour {req.ig_user_id}...")
            current_metrics = fetch_weekly_metrics(req.ig_user_id, req.access_token, req.platform)
            weeks_data      = fetch_4_weeks_trend(req.ig_user_id, req.access_token, req.platform)

        analyzed   = analyze_metrics(current_metrics, req.previous_metrics)
        trend_data = prepare_trend_data(weeks_data)

        report = generate_weekly_report(
            user_name   = req.user_name,
            analyzed    = analyzed,
            platform    = req.platform,
            brand_niche = req.brand_niche,
        )

        return {
            "status"      : "success",
            "report"      : report,
            "metrics"     : analyzed,
            "trend_data"  : trend_data,
            "raw_metrics" : current_metrics,
            "generated_at": datetime.now().isoformat(),
        }

    except Exception as e:
        raise HTTPException(500, f"Erreur génération rapport : {str(e)}")


@router.get("/health")
async def health():
    return {"status": "ok", "service": "weekly-report"}