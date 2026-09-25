### 2.5 — `image_generator.py`


# ai_engine/routers/content_generator/image_generator.py
import os
import time
from io import BytesIO
from huggingface_hub import InferenceClient
from huggingface_hub.errors import HfHubHTTPError

HF_TOKEN = os.getenv("HF_TOKEN", "hf_XXXXXXXXXXXXXXXXXXXX")
# stabilityai/sdxl-turbo n'a plus aucun provider d'inférence HuggingFace
# (inferenceProviderMapping vide — modèle retiré de tous les providers
# hébergés). FLUX.1-schnell est son remplaçant direct : même objectif
# (génération rapide, peu de steps), toujours servi en direct par
# plusieurs providers (fal-ai, nscale, wavespeed au 2026-09-04).
# provider="auto" laisse huggingface_hub choisir un provider disponible
# plutôt que de coder en dur une route HTTP qui peut se déprécier — c'est
# justement l'URL api-inference.huggingface.co codée en dur qui a cassé
# cette fonction (endpoint legacy retiré par HuggingFace).
IMAGE_MODEL = "black-forest-labs/FLUX.1-schnell"

PLATFORM_STYLE = {
    "instagram": "vibrant lifestyle photography, instagram aesthetic, shallow depth of field",
    "tiktok"   : "trendy gen-z aesthetic, bold colors, dynamic composition",
    "facebook" : "warm community photography, authentic, friendly",
    "linkedin" : "professional corporate photography, clean minimal, business",
    "twitter"  : "clean bold graphic, high contrast, impactful composition",
}
TONE_STYLE = {
    "professionnel": "professional studio lighting, clean background",
    "decontracte"  : "candid natural light, casual atmosphere",
    "inspirant"    : "golden hour, dramatic lighting, cinematic",
    "educatif"     : "clean flat lay, organized, educational",
    "humoristique" : "playful colors, fun, lighthearted",
    "premium"      : "luxury aesthetic, dark moody, gold accents",
    "urgent"       : "bold red accents, dynamic, attention-grabbing",
    "communautaire": "warm tones, people together, authentic",
}


def build_image_prompt(concept: str, platform: str, tone: str) -> tuple[str, str]:
    pos = (
        f"{concept}, {PLATFORM_STYLE.get(platform, 'professional photography')}, "
        f"{TONE_STYLE.get(tone, 'professional clean')}, "
        f"high quality, 8k, sharp focus, photorealistic, no text, no watermark"
    )
    neg = (
        "ugly, blurry, low quality, deformed, text, watermark, logo, "
        "cartoon, anime, pixelated, oversaturated"
    )
    return pos, neg


def generate_image(concept: str, platform: str, tone: str) -> bytes | None:
    """
    Génère une image PNG via FLUX.1-schnell (HuggingFace Inference Providers).

    Retourne les bytes de l'image, ou None en cas d'échec — jamais un
    placeholder silencieux. Un placeholder renvoyé comme si c'était le
    résultat réel est indétectable en aval (le caller ne peut pas savoir
    que la génération a échoué), donc l'appelant doit gérer explicitement
    le cas None plutôt que de recevoir une fausse image "réussie".
    """
    print(f"🎨 Génération image {IMAGE_MODEL}...")
    pos_prompt, neg_prompt = build_image_prompt(concept, platform, tone)

    client = InferenceClient(provider="auto", api_key=HF_TOKEN)

    for attempt in range(3):
        try:
            image = client.text_to_image(
                pos_prompt,
                model=IMAGE_MODEL,
                negative_prompt=neg_prompt,
                width=1024,
                height=1024,
            )
            buf = BytesIO()
            image.save(buf, format="PNG")
            content = buf.getvalue()
            print(f"✅ Image générée ({len(content)//1024} Ko)")
            return content
        except HfHubHTTPError as e:
            status = getattr(e.response, "status_code", None)
            if status == 503:
                print(f"   ⏳ Provider en chargement, tentative {attempt+1}/3...")
                time.sleep(20)
                continue
            print(f"❌ Erreur API tentative {attempt+1}/3 : {e}")
            time.sleep(5)
        except Exception as e:
            print(f"⚠️ Erreur tentative {attempt+1}/3 : {e}")
            time.sleep(5)

    print("❌ Génération image échouée après 3 tentatives — aucun visuel retourné")
    return None