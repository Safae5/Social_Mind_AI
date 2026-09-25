### 2.7 — `router.py` (FastAPI)


# ai_engine/routers/content_generator/router.py
import base64
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from .brand_voice       import analyze_brand_voice
from .caption_generator import generate_captions
from .image_generator   import generate_image
from .video_generator   import generate_video

router = APIRouter(prefix="/content", tags=["Content Generator"])


class GenerateRequest(BaseModel):
    subject         : str
    platform        : str
    tone            : str
    language        : str = "Français"
    extra_context   : str = ""
    brand_examples  : list[str] = []
    generate_image  : bool = True
    generate_video  : bool = False


@router.post("/generate")
async def generate_content(req: GenerateRequest):
    """
    Pipeline complet :
    1. Analyse brand voice
    2. Génération 3 variantes (Mistral 7B)
    3. Génération image (SDXL-Turbo) — optionnel
    4. Génération vidéo (ModelScope T2V) — optionnel
    Retourne les fichiers en base64 pour Laravel.
    """
    try:
        # 1. Brand voice
        brand_voice = analyze_brand_voice(req.brand_examples)

        # 2. Légendes
        variants = generate_captions(
            subject       = req.subject,
            platform      = req.platform,
            tone          = req.tone,
            language      = req.language,
            brand_voice   = brand_voice,
            extra_context = req.extra_context,
        )

        # 3. Image
        image_b64 = None
        if req.generate_image and variants:
            concept    = variants[0].get("concept_image", req.subject)
            img_bytes  = generate_image(concept, req.platform, req.tone)
            if img_bytes:
                image_b64 = base64.b64encode(img_bytes).decode("utf-8")

        # 4. Vidéo
        video_b64 = None
        if req.generate_video and variants:
            concept    = variants[0].get("concept_image", req.subject)
            vid_bytes  = generate_video(concept, req.platform)
            if vid_bytes:
                video_b64 = base64.b64encode(vid_bytes).decode("utf-8")

        return {
            "status"          : "success",
            "variants"        : variants,
            "image_base64"    : image_b64,
            "video_base64"    : video_b64,
            "brand_voice_info": {
                "n_examples"    : brand_voice["n_examples"],
                "dominant_tone" : brand_voice["dominant_tone"],
            },
        }

    except Exception as e:
        raise HTTPException(500, f"Erreur génération : {str(e)}")


@router.get("/health")
async def health():
    return {"status": "ok", "service": "content-generator"}