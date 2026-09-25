## `routers/hashtags/router.py`


# routers/hashtags/router.py
from fastapi  import APIRouter, HTTPException
from pydantic import BaseModel
from typing   import Optional
from .keyword_extractor import prepare_keyword_context
from .hashtag_generator import generate_hashtags
from .trend_fetcher     import fetch_trends

router = APIRouter(prefix="/hashtags", tags=["Hashtag Suggester"])


class HashtagRequest(BaseModel):
    subject    : str
    platform   : str = "instagram"
    language   : str = "Français"
    n_hashtags : int = 25


class TrendRequest(BaseModel):
    subject      : str
    platform     : str = "instagram"
    language     : str = "Français"
    # Compte Instagram Business CONNECTÉ PAR L'UTILISATEUR APPELANT — transmis
    # par Laravel depuis son propre SocialAccount. Absents => la source Meta
    # Graph API est simplement sautée (fallback Google Trends/Mistral), comme
    # avant. Ne jamais retomber sur un token global process-wide ici : c'était
    # exactement le bug (données d'un seul compte Meta servies à tous les
    # utilisateurs) — voir trend_fetcher.py.
    access_token : Optional[str] = None
    ig_user_id   : Optional[str] = None


@router.post("/generate")
async def generate(req: HashtagRequest):
    """Pipeline : KeyBERT → Mistral 7B → Scoring → Résultats catégorisés."""
    if not req.subject.strip():
        raise HTTPException(400, "Le sujet ne peut pas être vide")
    n = max(15, min(30, req.n_hashtags))
    try:
        kw_ctx = prepare_keyword_context(req.subject)
        result = generate_hashtags(
            subject=req.subject, platform=req.platform,
            language=req.language, keywords=kw_ctx["all_relevant"], n_hashtags=n,
        )
        return {
            "status"           : "success",
            "subject"          : req.subject,
            "platform"         : req.platform,
            "total"            : result["total"],
            "categorized"      : result["categorized"],
            "optimal_set"      : result["optimal_set"],
            "strategy"         : result["strategy"],
            "keywords_detected": kw_ctx["keywords"],
        }
    except Exception as e:
        raise HTTPException(500, f"Erreur : {str(e)}")


@router.post("/trends")
async def trends(req: TrendRequest):
    """Pipeline : Meta Graph API → Google Trends → Mistral 7B fallback."""
    if not req.subject.strip():
        raise HTTPException(400, "Sujet requis")
    try:
        kw_ctx = prepare_keyword_context(req.subject)
        result = fetch_trends(
            subject=req.subject, platform=req.platform,
            language=req.language, keywords=kw_ctx["all_relevant"],
            access_token=req.access_token, ig_user_id=req.ig_user_id,
        )
        return {"status": "success", **result}
    except Exception as e:
        raise HTTPException(500, f"Erreur : {str(e)}")


@router.get("/health")
async def health():
    return {"status": "ok", "service": "hashtag-suggester"}