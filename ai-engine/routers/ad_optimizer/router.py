### `routers/ad_optimizer/router.py`


# routers/ad_optimizer/router.py
from fastapi  import APIRouter, HTTPException  # type: ignore
from pydantic import BaseModel  # type: ignore
from typing   import Optional

from .data_loader         import normalize_campaign_data, generate_sample_campaigns
from .ctr_predictor       import train_xgboost_ctr, predict_ctr
from .audience_classifier import train_audience_classifier, predict_segment_potential
from .budget_optimizer    import (compute_campaign_metrics, optimize_budget_scipy,
                                   identify_underperforming)
from .q_learning_bidder   import train_q_learning, get_bid_recommendation
from .chart_generator     import generate_all_charts
from .report_generator    import generate_roi_pdf_b64

router = APIRouter(prefix="/ad-optimizer", tags=["Ad Optimizer"])


class AnalyzeRequest(BaseModel):
    client_name   : str = "Client"
    campaigns     : list[dict] = []
    total_budget  : float = 5000.0
    run_qlearning : bool  = True
    generate_pdf  : bool  = True
    use_sample    : bool  = False


class PredictCTRRequest(BaseModel):
    ad_type              : str
    platform             : str
    age                  : str
    gender               : str
    estimated_spend      : float = 200
    estimated_impressions: int   = 5000
    day_of_week          : int   = 2
    campaigns            : list[dict] = []


class BidRequest(BaseModel):
    performance_score   : float = 50
    budget_remaining_pct: float = 60
    is_weekend          : bool  = False
    current_bid         : float = 0.8
    campaigns           : list[dict] = []


@router.post("/analyze")
async def analyze(req: AnalyzeRequest):
    """
    Pipeline complet Optimisation Publicitaire :
    1. Normalisation métriques (Meta Ads API + Google Ads + Playwright)
    2. XGBoost : prédiction CTR
    3. Scikit-learn : classification segments audience
    4. SciPy linprog : optimisation allocation budgétaire
    5. Q-Learning : stratégie enchères (optionnel)
    6. Matplotlib : 5 graphiques en base64
    7. ReportLab : rapport ROI PDF en base64
    """
    try:
        records = req.campaigns if req.campaigns and not req.use_sample else generate_sample_campaigns(50)
        df, metadata = normalize_campaign_data(records)

        if df.empty:
            raise HTTPException(400, "Aucune donnée valide")

        # 2. Métriques par campagne
        campaign_metrics = compute_campaign_metrics(df)
        underperforming  = identify_underperforming(df)

        # 3. XGBoost CTR
        ctr_model = train_xgboost_ctr(df)

        # 4. Classification segments
        segment_result = train_audience_classifier(df)

        # 5. Optimisation budget SciPy
        opt_result = optimize_budget_scipy(campaign_metrics, req.total_budget)

        # 6. Q-Learning
        q_result = None
        if req.run_qlearning:
            q_result = train_q_learning(df, episodes=500)

        # 7. Graphiques base64
        charts = generate_all_charts(df, campaign_metrics, opt_result, q_result)

        # Sérialiser les résultats
        cm_dict   = campaign_metrics.to_dict(orient="records") if not campaign_metrics.empty else []
        under_dict= underperforming.to_dict(orient="records") if not underperforming.empty else []
        top_segs  = []
        if segment_result and "top_segments" in segment_result:
            top_segs = segment_result["top_segments"].to_dict(orient="records")

        seg_summary = None
        if segment_result:
            seg_summary = {
                "best_name"  : segment_result["best_name"],
                "accuracy"   : segment_result["accuracy"],
                "rf_accuracy": segment_result["rf_accuracy"],
                "gb_accuracy": segment_result["gb_accuracy"],
                "top_segments": top_segs,
            }

        opt_summary = None
        if opt_result:
            opt_summary = {
                "roas_before"    : opt_result["roas_before"],
                "roas_after"     : opt_result["roas_after"],
                "improvement_pct": opt_result["improvement_pct"],
                "total_budget"   : opt_result["total_budget"],
                "allocation"     : opt_result["allocation_df"].to_dict(orient="records"),
                "scipy_success"  : opt_result["scipy_success"],
            }

        q_summary = None
        if q_result:
            q_summary = {
                "avg_reward": q_result["avg_reward"],
                "n_episodes": q_result["n_episodes"],
                "alpha"     : q_result["alpha"],
                "gamma"     : q_result["gamma"],
                "rewards_tail": q_result["rewards_history"][-50:],
            }

        # 8. PDF
        pdf_b64 = None
        if req.generate_pdf:
            pdf_b64 = generate_roi_pdf_b64(
                req.client_name, metadata, campaign_metrics, opt_result,
                underperforming, ctr_model["metrics"] if ctr_model else None,
                segment_result, q_result, charts
            )

        return {
            "status"          : "success",
            "data_source"     : "simulated" if (not req.campaigns or req.use_sample) else "real",
            "metadata"        : metadata,
            "campaign_metrics": cm_dict,
            "underperforming" : under_dict,
            "ctr_model"       : {"metrics": ctr_model["metrics"]} if ctr_model else None,
            "segment_result"  : seg_summary,
            "opt_result"      : opt_summary,
            "q_result"        : q_summary,
            "charts"          : charts,
            "pdf_base64"      : pdf_b64,
        }

    except Exception as e:
        import traceback
        raise HTTPException(500, f"Erreur pipeline ad-optimizer : {str(e)}\n{traceback.format_exc()}")


@router.post("/predict-ctr")
async def predict_ctr_endpoint(req: PredictCTRRequest):
    """Prédit le CTR pour une nouvelle configuration d'annonce."""
    try:
        is_real   = bool(req.campaigns)
        records   = req.campaigns if is_real else generate_sample_campaigns(50)
        df, _     = normalize_campaign_data(records)
        ctr_model = train_xgboost_ctr(df)
        if not ctr_model:
            raise HTTPException(422, "Modèle non disponible")
        result = predict_ctr(
            ctr_model, req.ad_type, req.platform, req.age, req.gender,
            req.estimated_spend, req.estimated_impressions, req.day_of_week
        )
        return {"status": "success", "data_source": "real" if is_real else "simulated", **result}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/bid-recommendation")
async def bid_recommendation_endpoint(req: BidRequest):
    """Recommande un ajustement d'enchère via Q-Learning."""
    try:
        is_real  = bool(req.campaigns)
        records  = req.campaigns if is_real else generate_sample_campaigns(50)
        df, _    = normalize_campaign_data(records)
        q_result = train_q_learning(df, episodes=300)
        result   = get_bid_recommendation(
            q_result, req.performance_score,
            req.budget_remaining_pct, req.is_weekend, req.current_bid
        )
        return {"status": "success", "data_source": "real" if is_real else "simulated", **result}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/health")
async def health():
    return {"status": "ok", "service": "ad-optimizer"}