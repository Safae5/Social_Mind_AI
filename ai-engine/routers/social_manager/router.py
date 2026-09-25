### `routers/social_manager/router.py`


# routers/social_manager/router.py
from fastapi  import APIRouter, HTTPException
from pydantic import BaseModel
from typing   import Optional, List
from datetime import datetime

from .meta_client        import MetaGraphClient
from .scraper            import scrape_sync, scrape_instagram_public_profile
from .prophet_scheduler  import prepare_engagement_dataframe, train_prophet_and_predict
from .sentiment_analyzer import classify_sentiment, classify_batch
from .reply_generator    import generate_reply

router = APIRouter(prefix="/social-manager", tags=["Social Manager"])


# ================================================================
# MODÈLES DE REQUÊTES
# ================================================================

class OptimalSlotsRequest(BaseModel):
    page_access_token : str
    page_id           : str
    ig_user_id        : Optional[str] = None
    days_back         : int = 90
    forecast_days     : int = 7


class ScrapingRequest(BaseModel):
    instagram_username : Optional[str] = None
    facebook_page_url  : Optional[str] = None
    max_posts          : int = 30


class CommentPollRequest(BaseModel):
    page_access_token : str
    page_id           : str
    since_timestamp   : Optional[int] = None


class ClassifySentimentRequest(BaseModel):
    comments: List[str]


class GenerateReplyRequest(BaseModel):
    comment_text    : str
    sentiment_label : str   # POSITIVE / NEUTRAL / NEGATIVE
    post_content    : str = ""
    brand_name      : str = "Notre marque"
    brand_voice     : str = "professionnel et chaleureux"
    language        : str = "Français"


class PublishPostRequest(BaseModel):
    page_access_token : str
    page_id           : str
    message           : str
    image_url         : Optional[str] = None
    link              : Optional[str] = None


class ReplyCommentRequest(BaseModel):
    page_access_token : str
    comment_id        : str
    message           : str


# ================================================================
# ENDPOINTS
# ================================================================

@router.post("/optimal-slots")
async def get_optimal_slots(req: OptimalSlotsRequest):
    """
    Pipeline complet :
    1. Récupère historique via Meta Graph API
    2. Entraîne Prophet
    3. Retourne 7 créneaux optimaux pour la semaine

    Si l'API Meta retourne peu de données, complète automatiquement.
    """
    try:
        client  = MetaGraphClient(
            req.page_access_token, req.page_id, req.ig_user_id
        )
        history = client.build_engagement_history(days_back=req.days_back)

        prophet_df = prepare_engagement_dataframe(history)
        result     = train_prophet_and_predict(prophet_df, forecast_days=req.forecast_days)

        return {
            "status"         : "success",
            "data_source"    : "meta_graph_api",
            "posts_analyzed" : len(history),
            **result,
        }
    except Exception as e:
        raise HTTPException(500, f"Erreur prédiction créneaux : {str(e)}")


@router.post("/scrape-history")
async def scrape_history(req: ScrapingRequest):
    """
    Web scraping Playwright pour historique complémentaire.
    Utilisé quand l'API Meta ne couvre pas assez de données.
    """
    results = {}
    try:
        if req.instagram_username:
            posts = scrape_sync(
                scrape_instagram_public_profile(
                    req.instagram_username, req.max_posts
                )
            )
            results["instagram"] = {
                "posts": posts,
                "count": len(posts),
            }
        return {"status": "success", **results}
    except Exception as e:
        raise HTTPException(500, f"Erreur scraping : {str(e)}")


@router.post("/poll-comments")
async def poll_comments(req: CommentPollRequest):
    """
    Polling des commentaires via Meta Graph API.
    Appelé par le scheduler Laravel toutes les 15 minutes.

    Returns:
        Liste des nouveaux commentaires avec sentiment pré-classifié
    """
    try:
        client   = MetaGraphClient(req.page_access_token, req.page_id)
        comments = client.get_recent_comments(req.since_timestamp)

        if not comments:
            return {"status": "success", "comments": [], "new_count": 0}

        # Classifier les sentiments en batch
        texts       = [c.get("message", "") for c in comments]
        sentiments  = classify_batch(texts)

        enriched = []
        for comment, sentiment in zip(comments, sentiments):
            enriched.append({
                **comment,
                "sentiment": sentiment,
            })

        return {
            "status"   : "success",
            "comments" : enriched,
            "new_count": len(enriched),
            "polled_at": datetime.now().isoformat(),
        }
    except Exception as e:
        raise HTTPException(500, f"Erreur polling commentaires : {str(e)}")


@router.post("/classify-sentiment")
async def classify_sentiment_batch(req: ClassifySentimentRequest):
    """Classifie le sentiment d'une liste de commentaires (Twitter-RoBERTa)."""
    try:
        sentiments = classify_batch(req.comments)
        return {"status": "success", "sentiments": sentiments}
    except Exception as e:
        raise HTTPException(500, f"Erreur sentiment : {str(e)}")


@router.post("/generate-reply")
async def generate_comment_reply(req: GenerateReplyRequest):
    """
    Génère une réponse IA à un commentaire (Mistral 7B).
    La réponse nécessite approbation manuelle avant publication.
    """
    try:
        result = generate_reply(
            comment_text    = req.comment_text,
            sentiment_label = req.sentiment_label,
            post_content    = req.post_content,
            brand_name      = req.brand_name,
            brand_voice     = req.brand_voice,
            language        = req.language,
        )
        return {"status": "success", **result}
    except Exception as e:
        raise HTTPException(500, f"Erreur génération réponse : {str(e)}")


@router.post("/publish")
async def publish_post(req: PublishPostRequest):
    """Publie un post sur la Page Facebook via Meta Graph API."""
    try:
        client = MetaGraphClient(req.page_access_token, req.page_id)
        result = client.publish_post(
            message   = req.message,
            image_url = req.image_url,
            link      = req.link,
        )
        if not result.get("id"):
            raise HTTPException(500, "Publication échouée — pas d'ID retourné")
        return {
            "status"     : "success",
            "post_id"    : result["id"],
            "published_at": datetime.now().isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Erreur publication : {str(e)}")


@router.post("/reply-comment")
async def reply_comment(req: ReplyCommentRequest):
    """
    Répond à un commentaire précis via Meta Graph API (POST /{comment-id}/comments).

    /publish poste sur le fil de la Page ({page_id}/feed) — utiliser ce
    endpoint-ci pour approveReply() côté Laravel, sinon "approuver une
    réponse" publie un post de Page sans rapport au lieu de répondre au
    commentateur (reply_to_comment() existait déjà dans meta_client.py
    mais n'était jamais exposé par le router).
    """
    try:
        client = MetaGraphClient(req.page_access_token, page_id="")
        result = client.reply_to_comment(req.comment_id, req.message)
        if not result.get("id"):
            raise HTTPException(500, "Réponse échouée — pas d'ID retourné")
        return {
            "status"      : "success",
            "reply_id"    : result["id"],
            "published_at": datetime.now().isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Erreur réponse commentaire : {str(e)}")


@router.post("/page-metrics")
async def get_page_metrics(req: PublishPostRequest):
    """Récupère les métriques temps réel de la Page (appelé toutes les heures)."""
    try:
        client  = MetaGraphClient(req.page_access_token, req.page_id)
        metrics = client.get_page_insights_hourly()
        return {
            "status"     : "success",
            "metrics"    : metrics,
            "fetched_at" : datetime.now().isoformat(),
        }
    except Exception as e:
        raise HTTPException(500, f"Erreur métriques : {str(e)}")


@router.get("/health")
async def health():
    return {"status": "ok", "service": "social-manager"}