### `routers/content_creator/router.py`


# routers/content_creator/router.py
import os
import uuid
import base64
from fastapi  import APIRouter, HTTPException
from pydantic import BaseModel
from typing   import Optional

from .caption_generator import generate_caption
from .image_generator   import generate_image
from .script_generator  import generate_video_script
from .pdf_generator     import generate_content_pack_pdf

router = APIRouter(prefix="/content-creator", tags=["Content Creator"])

PDF_OUTPUT_DIR = "outputs/content_packs"
os.makedirs(PDF_OUTPUT_DIR, exist_ok=True)


class ContentCreatorRequest(BaseModel):
    # Profil client (depuis Agent Chef de Compte)
    client_id       : int
    client_name     : str
    client_niche    : str
    client_audience : str
    client_brand_tone: str = "professionnel"

    # Paramètres de génération
    platform        : str               # instagram | tiktok | facebook | linkedin | twitter
    subject         : str
    tone            : str = "professionnel"
    language        : str = "Français"

    # Options
    generate_image  : bool = True
    generate_script : bool = True
    generate_pdf    : bool = True


@router.post("/generate")
async def generate_content_pack(req: ContentCreatorRequest):
    """
    Pipeline complet Agent Créateur de Contenu IA :

    1. Mistral 7B        → Légende professionnelle (caption + hashtags + CTA)
    2. SDXL-Turbo        → Visuel créatif 1024×1024 (optionnel)
    3. Mistral 7B        → Script vidéo structuré 5 sections (optionnel)
    4. ReportLab         → PDF pack de contenu complet (optionnel)

    Toutes les sorties → stockage Laravel → approbation → Meta Graph API.
    """
    try:
        client_profile = {
            "id"        : req.client_id,
            "name"      : req.client_name,
            "niche"     : req.client_niche,
            "audience"  : req.client_audience,
            "brand_tone": req.client_brand_tone,
        }

        # ---- Étape 1 : Légende (Mistral 7B) ----
        print(f"\n🚀 Génération pack contenu — Client: {req.client_name} | {req.platform} | '{req.subject}'")
        caption_data = generate_caption(
            client_profile = client_profile,
            platform       = req.platform,
            subject        = req.subject,
            tone           = req.tone,
            language       = req.language,
        )

        # ---- Étape 2 : Image (SDXL-Turbo) ----
        image_bytes = None
        image_b64   = None
        image_generation_failed = False
        if req.generate_image:
            image_concept = caption_data.get("image_concept", req.subject)
            image_bytes   = generate_image(
                concept      = image_concept,
                platform     = req.platform,
                tone         = req.tone,
                client_niche = req.client_niche,
            )
            if image_bytes:
                image_b64 = base64.b64encode(image_bytes).decode("utf-8")
            else:
                # SDXL-Turbo a échoué après les tentatives — on ne fabrique jamais
                # d'image de remplacement (règle anti-fabrication du projet) :
                # le pack sera créé sans visuel, avec ce flag explicite.
                image_generation_failed = True

        # ---- Étape 3 : Script vidéo (Mistral 7B) ----
        script_data = None
        if req.generate_script:
            script_data = generate_video_script(
                client_profile = client_profile,
                platform       = req.platform,
                subject        = req.subject,
                tone           = req.tone,
                caption_data   = caption_data,
                language       = req.language,
            )

        # ---- Étape 4 : PDF ReportLab ----
        pdf_b64    = None
        pdf_path   = None
        if req.generate_pdf and script_data:
            pack_id  = uuid.uuid4().hex[:8]
            pdf_path = os.path.join(PDF_OUTPUT_DIR, f"pack_{req.client_id}_{pack_id}.pdf")

            generate_content_pack_pdf(
                client_profile = client_profile,
                caption_data   = caption_data,
                script_data    = script_data,
                image_bytes    = image_bytes,
                platform       = req.platform,
                subject        = req.subject,
                output_path    = pdf_path,
            )

            with open(pdf_path, "rb") as f:
                pdf_b64 = base64.b64encode(f.read()).decode("utf-8")

        return {
            "status"       : "success",
            "client_id"    : req.client_id,
            "platform"     : req.platform,
            "subject"      : req.subject,
            "caption"      : caption_data,
            "image_base64" : image_b64,
            "image_generation_failed": image_generation_failed,
            "script"       : script_data,
            "pdf_base64"   : pdf_b64,
        }

    except Exception as e:
        import traceback
        raise HTTPException(500, f"Erreur pipeline content creator: {str(e)}\n{traceback.format_exc()}")


@router.get("/health")
async def health():
    return {"status": "ok", "service": "content-creator"}