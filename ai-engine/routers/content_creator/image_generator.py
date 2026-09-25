### `routers/content_creator/image_generator.py`


# routers/content_creator/image_generator.py
"""
Génération du visuel créatif avec SDXL-Turbo.

Modèle : stabilityai/sdxl-turbo
Lien   : https://huggingface.co/stabilityai/sdxl-turbo
Rôle   : Remplace DALL-E 3 et Stable Diffusion — 100% gratuit HuggingFace

SDXL-Turbo est une version distillée de Stable Diffusion XL
optimisée pour la génération rapide en 4 steps seulement.
Résolution : 1024×1024 PNG.

Pour l'Agent Créateur de Contenu IA (Professionnel) :
  - Le concept d'image est extrait depuis la légende générée
  - Le style visuel est adapté à la plateforme du client
  - L'image est retournée en base64 pour stockage Laravel
  - Elle sera incluse dans le PDF du pack de contenu

Toutes les images nécessitent une approbation avant publication.
"""

import os
import time
from io import BytesIO
from huggingface_hub import InferenceClient
from huggingface_hub.errors import HfHubHTTPError
from .platform_specs import PLATFORM_SPECS

HF_TOKEN = os.getenv("HF_TOKEN", "hf_XXXXXXXXXXXXXXXXXXXX")
# stabilityai/sdxl-turbo n'a plus aucun provider d'inférence HuggingFace
# (inferenceProviderMapping vide — modèle retiré de tous les providers
# hébergés, plus seulement indisponible temporairement). FLUX.1-schnell
# est son remplaçant direct, toujours servi par plusieurs providers
# (fal-ai, nscale, wavespeed au 2026-09-04) — voir le même correctif dans
# content_generator/image_generator.py (agent standard).
IMAGE_MODEL = "black-forest-labs/FLUX.1-schnell"

TONE_VISUAL_STYLE = {
    "professionnel" : "professional studio lighting, clean background, corporate, polished",
    "decontracte"   : "candid natural light, casual atmosphere, lifestyle, relaxed",
    "inspirant"     : "golden hour, dramatic lighting, aspirational, cinematic, epic",
    "educatif"      : "clean flat lay, organized composition, infographic style, educational",
    "humoristique"  : "playful colors, fun composition, lighthearted, vibrant",
    "premium"       : "luxury aesthetic, dark moody, gold accents, high-end, minimal",
    "urgent"        : "bold red accents, dynamic composition, attention-grabbing, energetic",
    "communautaire" : "warm tones, people together, community, authentic smiles",
}


def build_image_prompt(concept: str, platform: str, tone: str,
                        client_niche: str = "") -> tuple[str, str]:
    """
    Construit le prompt positif et négatif optimisé pour SDXL-Turbo.

    SDXL-Turbo donne les meilleurs résultats avec :
    - Descriptions d'actions simples et concrètes en anglais
    - Style visuel adapté à la plateforme
    - Pas de texte/logos dans le prompt (interfère avec la composition)
    """
    platform_style = PLATFORM_SPECS.get(platform, {}).get(
        "image_style",
        "professional photography, high quality"
    )
    tone_style = TONE_VISUAL_STYLE.get(tone, "professional, clean")

    # Niche context pour personnalisation
    niche_context = f"in the {client_niche} industry, " if client_niche else ""

    positive_prompt = (
        f"{concept}, {niche_context}{platform_style}, {tone_style}, "
        f"high quality, 8k, sharp focus, professional photography, "
        f"no text, no watermark, no logo, photorealistic"
    )
    negative_prompt = (
        "ugly, blurry, low quality, deformed, bad anatomy, text, "
        "watermark, logo, signature, oversaturated, pixelated, "
        "cartoon, anime, illustration, painting, sketch, distorted"
    )
    return positive_prompt, negative_prompt


def generate_image(concept: str, platform: str, tone: str,
                    client_niche: str = "",
                    retries: int = 3) -> bytes | None:
    """
    Génère une image PNG via SDXL-Turbo (HuggingFace Inference API).

    Args:
        concept      : description du concept visuel (depuis caption_generator)
        platform     : plateforme cible (influence le style)
        tone         : ton de marque (influence le style visuel)
        client_niche : niche du client pour personnalisation
        retries      : nombre de tentatives

    Returns:
        bytes PNG ou None si erreur
    """
    print(f"🎨 Génération visuel {IMAGE_MODEL} — concept: {concept[:60]}...")

    positive_prompt, negative_prompt = build_image_prompt(concept, platform, tone, client_niche)
    print(f"   📝 Prompt: {positive_prompt[:80]}...")

    client = InferenceClient(provider="auto", api_key=HF_TOKEN)

    for attempt in range(retries):
        try:
            print(f"   📡 Tentative {attempt+1}/{retries}...")
            image = client.text_to_image(
                positive_prompt,
                model=IMAGE_MODEL,
                negative_prompt=negative_prompt,
                width=1024,
                height=1024,
            )
            buf = BytesIO()
            image.save(buf, format="PNG")
            content = buf.getvalue()
            print(f"   ✅ Image générée ({len(content) // 1024} Ko)")
            return content

        except HfHubHTTPError as e:
            status = getattr(e.response, "status_code", None)
            if status == 503:
                print(f"   ⏳ Provider en chargement, tentative {attempt+1}/{retries}...")
                time.sleep(20)
                continue
            print(f"   ❌ Erreur API tentative {attempt+1}/{retries} : {e}")
            time.sleep(5)

        except Exception as e:
            print(f"   ⚠️ Erreur tentative {attempt+1}/{retries} : {e}")
            time.sleep(5)

    print(f"   ❌ Génération image échouée après {retries} tentatives — aucun visuel retourné")
    return None