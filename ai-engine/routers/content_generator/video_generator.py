### 2.6 — `video_generator.py`


# ai_engine/routers/content_generator/video_generator.py
import requests
import os
import time
import io

HF_TOKEN       = os.getenv("HF_TOKEN", "hf_XXXXXXXXXXXXXXXXXXXX")
MODELSCOPE_URL = "https://api-inference.huggingface.co/models/damo-vilab/text-to-video-ms-1.7b"
ZEROSCOPE_URL  = "https://api-inference.huggingface.co/models/cerspense/zeroscope_v2_576w"

PLATFORM_VIDEO_STYLE = {
    "instagram": "smooth cinematic b-roll, lifestyle, slow motion",
    "tiktok"   : "dynamic fast-paced, trendy, close-up shots",
    "facebook" : "warm authentic moment, people, community",
    "linkedin" : "professional office environment, business",
    "twitter"  : "impactful visual, bold composition",
}


def build_video_prompt(concept: str, platform: str) -> str:
    style  = PLATFORM_VIDEO_STYLE.get(platform, "cinematic quality")
    simple = concept.split(",")[0].strip()[:80]
    return (
        f"{simple}, {style}, "
        f"4k quality, smooth camera movement, professional, no text"
    )


def generate_video(concept: str, platform: str) -> bytes | None:
    """
    Génère une vidéo MP4 via ModelScope T2V (HuggingFace, gratuit).
    Retourne les bytes MP4 ou None si erreur.
    ⚠️ Peut prendre 2-5 minutes via l'API gratuite.
    """
    print(f"🎬 Génération vidéo ModelScope T2V...")
    prompt  = build_video_prompt(concept, platform)
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}

    for model_url, model_name in [
        (MODELSCOPE_URL, "ModelScope"),
        (ZEROSCOPE_URL,  "Zeroscope (fallback)")
    ]:
        for attempt in range(2):
            try:
                print(f"   📡 {model_name} tentative {attempt+1}...")
                r = requests.post(
                    model_url,
                    headers=headers,
                    json={"inputs": prompt},
                    timeout=300
                )
                if r.status_code == 503:
                    wait = 60
                    try: wait = r.json().get("estimated_time", 60)
                    except: pass
                    time.sleep(min(wait, 120))
                    continue
                if r.status_code == 200:
                    print(f"   ✅ Vidéo générée ({len(r.content)//1024} Ko)")
                    return r.content
                print(f"   ❌ {r.status_code}: {r.text[:100]}")
                time.sleep(10)
            except Exception as e:
                print(f"   ⚠️ {e}")
                time.sleep(5)

    print("⚠️ Génération vidéo échouée")
    return None