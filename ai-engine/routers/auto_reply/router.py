### `routers/auto_reply/router.py`


# routers/auto_reply/router.py
from fastapi  import APIRouter, HTTPException   # type: ignore
from pydantic import BaseModel   # type: ignore
from .sentiment_classifier import classify_sentiment_roberta
from .spam_detector        import detect_spam
from .reply_generator      import generate_reply
from .brand_voice          import analyze_brand_voice, compute_brand_voice_score

router = APIRouter(prefix="/auto-reply", tags=["Auto Reply"])


class ClassifyRequest(BaseModel):
    text     : str
    platform : str = "instagram"


class GenerateReplyRequest(BaseModel):
    message_text         : str
    message_type         : str = "comment"
    sentiment            : str = "neutral"
    platform             : str = "instagram"
    brand_name           : str
    brand_examples       : list[str] = []
    post_context         : str = ""
    author_name          : str = ""
    conversation_history : list[dict] = []


class FullPipelineRequest(BaseModel):
    message_text         : str
    message_type         : str = "comment"
    platform             : str = "instagram"
    brand_name           : str
    brand_examples       : list[str] = []
    post_context         : str = ""
    author_name          : str = ""
    conversation_history : list[dict] = []


@router.post("/classify")
async def classify_single(req: ClassifyRequest):
    """Classifie le sentiment + détecte spam d'un message."""
    if not req.text.strip():
        raise HTTPException(400, "Texte requis")
    try:
        sentiment = classify_sentiment_roberta(req.text)
        spam      = detect_spam(req.text)
        if spam["is_spam"]:
            sentiment.update({"sentiment": "spam", "label_emoji": "⚫",
                               "auto_reply": False, "needs_review": False})
        return {"status": "success", **sentiment, "spam_info": spam}
    except Exception as e:
        raise HTTPException(500, f"Erreur : {str(e)}")


@router.post("/classify-batch")
async def classify_batch_endpoint(texts: list[str], platform: str = "instagram"):
    """Classifie un batch de messages (max 50)."""
    if not texts:
        raise HTTPException(400, "Liste requise")
    try:
        results = []
        for text in texts[:50]:
            sentiment = classify_sentiment_roberta(text)
            spam      = detect_spam(text)
            if spam["is_spam"]:
                sentiment.update({"sentiment": "spam", "label_emoji": "⚫", "auto_reply": False})
            results.append({"text": text[:100], **sentiment, "spam_info": spam})
        return {"status": "success", "results": results, "total": len(results)}
    except Exception as e:
        raise HTTPException(500, f"Erreur batch : {str(e)}")


@router.post("/generate-reply")
async def generate_reply_endpoint(req: GenerateReplyRequest):
    """Génère une réponse pour un commentaire ou DM."""
    if not req.message_text.strip():
        raise HTTPException(400, "Message requis")
    try:
        brand_voice = analyze_brand_voice(req.brand_examples)
        result      = generate_reply(
            message_text=req.message_text, message_type=req.message_type,
            sentiment=req.sentiment, platform=req.platform,
            brand_name=req.brand_name, brand_voice=brand_voice,
            post_context=req.post_context, author_name=req.author_name,
            conversation_history=req.conversation_history,
        )
        bv_score = compute_brand_voice_score(result["response_text"], req.brand_examples) \
                   if req.brand_examples else None
        return {"status": "success", **result, "brand_voice_score": bv_score}
    except Exception as e:
        raise HTTPException(500, f"Erreur : {str(e)}")


@router.post("/pipeline")
async def full_pipeline(req: FullPipelineRequest):
    """
    Pipeline complet en un seul appel :
    1. Détection spam → si spam : action = hide
    2. Classification sentiment
    3. Génération réponse Mistral 7B
    4. Action recommandée : auto_reply | flag_review | pending_approval
    """
    if not req.message_text.strip():
        raise HTTPException(400, "Message requis")
    try:
        # 1. Spam
        spam_result = detect_spam(req.message_text)
        if spam_result["is_spam"]:
            return {
                "status"        : "success",
                "classification": {"sentiment": "spam", "label_emoji": "⚫",
                                   "auto_reply": False, "needs_review": False,
                                   "confidence": spam_result["toxicity_score"]},
                "spam_info"     : spam_result,
                "reply"         : None,
                "action"        : "hide",
            }

        # 2. Sentiment
        classification = classify_sentiment_roberta(req.message_text)

        # 3. Génération réponse
        brand_voice = analyze_brand_voice(req.brand_examples)
        reply       = generate_reply(
            message_text=req.message_text, message_type=req.message_type,
            sentiment=classification["sentiment"], platform=req.platform,
            brand_name=req.brand_name, brand_voice=brand_voice,
            post_context=req.post_context, author_name=req.author_name,
            conversation_history=req.conversation_history,
        )

        # 4. Action recommandée
        if classification["auto_reply"]:     action = "auto_reply"
        elif classification["needs_review"]: action = "flag_review"
        else:                                action = "pending_approval"

        # 5. Score de conformité au ton de marque — même calcul que
        # /generate-reply, mais manquait ici alors que c'est CE endpoint
        # que ProcessMessageJob appelle pour la classification automatique
        # (brand_voice_score restait donc toujours null en base).
        bv_score = compute_brand_voice_score(reply["response_text"], req.brand_examples) \
                   if req.brand_examples else None

        return {
            "status"            : "success",
            "classification"    : classification,
            "spam_info"         : spam_result,
            "reply"             : reply,
            "action"            : action,
            "brand_voice_score" : bv_score,
        }

    except Exception as e:
        raise HTTPException(500, f"Erreur pipeline : {str(e)}")


@router.get("/health")
async def health():
    return {"status": "ok", "service": "auto-reply"}