### `routers/content_calendar/router.py`

# routers/content_calendar/router.py
from fastapi  import APIRouter, HTTPException
from pydantic import BaseModel
from typing   import Optional
from datetime import datetime

from .plan_generator   import generate_weekly_plan, regenerate_single_day
from .hashtag_builder  import build_hashtags_for_slot
from .coherence_scorer import compute_coherence_score

router = APIRouter(prefix="/content-calendar", tags=["Content Calendar"])


class GeneratePlanRequest(BaseModel):
    niche       : str
    platforms   : list[str]
    frequency   : int = 5
    language    : str = "Français"
    objectives  : list[str] = ["engagement", "notoriété"]
    brand_voice : str = ""
    week_start  : Optional[str] = None   # Format YYYY-MM-DD


class RegenerateDayRequest(BaseModel):
    niche         : str
    platforms     : list[str]
    day_name      : str
    date          : str
    existing_plan : list[dict]
    language      : str = "Français"


class BuildHashtagsRequest(BaseModel):
    subject        : str
    hashtag_themes : list[str]
    platform       : str
    niche          : str
    post_type      : Optional[str] = None


class CoherenceRequest(BaseModel):
    niche : str
    plan  : list[dict]


@router.post("/generate")
async def generate_plan(req: GeneratePlanRequest):
    """
    Pipeline complet :
      1. Mistral 7B → plan 7 jours JSON
      2. KeyBERT + MiniLM → hashtags pour chaque slot actif
      3. MiniLM → score cohérence thématique
    """
    if not req.niche.strip():
        raise HTTPException(400, "La niche est requise")
    if not req.platforms:
        raise HTTPException(400, "Au moins une plateforme requise")
    freq = max(1, min(7, req.frequency))
    try:
        plan = generate_weekly_plan(
            niche=req.niche, platforms=req.platforms, frequency=freq,
            language=req.language, objectives=req.objectives,
            brand_voice=req.brand_voice, week_start=req.week_start,
        )
        for slot in plan:
            if not slot.get("is_rest_day"):
                slot["hashtags"] = build_hashtags_for_slot(
                    subject=slot.get("subject", ""),
                    hashtag_themes=slot.get("hashtag_themes", []),
                    platform=slot.get("platform", req.platforms[0]),
                    niche=req.niche, post_type=slot.get("post_type"),
                )
            else:
                slot["hashtags"] = []

        coherence = compute_coherence_score(req.niche, plan)
        return {
            "status"      : "success",
            "plan"        : plan,
            "coherence"   : coherence,
            "week_start"  : plan[0]["date"] if plan else None,
            "week_end"    : plan[-1]["date"] if plan else None,
            "generated_at": datetime.now().isoformat(),
        }
    except Exception as e:
        raise HTTPException(500, f"Erreur génération plan : {str(e)}")


@router.post("/regenerate-day")
async def regenerate_day(req: RegenerateDayRequest):
    """Régénère la suggestion pour un seul jour."""
    if not req.niche.strip():
        raise HTTPException(400, "La niche est requise")
    try:
        new_slot = regenerate_single_day(
            niche=req.niche, platforms=req.platforms, day_name=req.day_name,
            date=req.date, existing_plan=req.existing_plan, language=req.language,
        )
        new_slot["hashtags"] = build_hashtags_for_slot(
            subject=new_slot.get("subject", ""),
            hashtag_themes=new_slot.get("hashtag_themes", []),
            platform=new_slot.get("platform", req.platforms[0]),
            niche=req.niche, post_type=new_slot.get("post_type"),
        )
        return {"status": "success", "slot": new_slot}
    except Exception as e:
        raise HTTPException(500, f"Erreur régénération : {str(e)}")


@router.post("/build-hashtags")
async def build_hashtags(req: BuildHashtagsRequest):
    """Construit les hashtags pour un slot individuel."""
    try:
        tags = build_hashtags_for_slot(
            subject=req.subject, hashtag_themes=req.hashtag_themes,
            platform=req.platform, niche=req.niche, post_type=req.post_type,
        )
        return {"status": "success", "hashtags": tags}
    except Exception as e:
        raise HTTPException(500, f"Erreur hashtags : {str(e)}")


@router.post("/coherence")
async def check_coherence(req: CoherenceRequest):
    """Calcule le score de cohérence thématique."""
    try:
        return {"status": "success", **compute_coherence_score(req.niche, req.plan)}
    except Exception as e:
        raise HTTPException(500, f"Erreur cohérence : {str(e)}")


@router.get("/health")
async def health():
    return {"status": "ok", "service": "content-calendar"}