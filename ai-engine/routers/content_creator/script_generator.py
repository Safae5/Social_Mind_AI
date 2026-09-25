### `routers/content_creator/script_generator.py`


# routers/content_creator/script_generator.py
"""
Génération du script vidéo avec Mistral 7B.

Modèle : mistralai/Mistral-7B-Instruct-v0.3
Lien   : https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.3
Rôle   : Remplace GPT-4o pour la génération de scripts vidéo

Structure du script vidéo SMMA :
  1. HOOK (0-3 secondes)       : accroche immédiate, choc visuel ou question
  2. PROBLÈME (3-8 secondes)   : identifier le pain point de l'audience
  3. SOLUTION (8-20 secondes)  : présenter la valeur/solution du client
  4. PREUVE (20-30 secondes)   : témoignage, chiffre, résultat concret
  5. CTA (30-35 secondes)      : appel à l'action clair

Adapté par plateforme :
  - TikTok/Reels  : 15-60 secondes, rythme rapide
  - YouTube Short : 30-60 secondes
  - Facebook/LinkedIn : 1-3 minutes possible
"""

import requests
import json
import re
import time
import os

HF_TOKEN   = os.getenv("HF_TOKEN", "hf_XXXXXXXXXXXXXXXXXXXX")
HF_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3"

# Durées recommandées par plateforme
PLATFORM_VIDEO_DURATION = {
    "instagram" : "15-30 secondes (Reels)",
    "tiktok"    : "15-60 secondes",
    "facebook"  : "1-2 minutes",
    "linkedin"  : "1-3 minutes",
    "twitter"   : "30-60 secondes",
}

# Styles de narration par plateforme
PLATFORM_NARRATION_STYLE = {
    "instagram" : "dynamique, visuel, emojis à l'écran, transitions rapides",
    "tiktok"    : "ultra-direct, trending, hook immédiat, voix jeune et naturelle",
    "facebook"  : "conversationnel, accessible, storytelling, communautaire",
    "linkedin"  : "professionnel, expert, structured, données et insights",
    "twitter"   : "concis, percutant, opinion affirmée",
}


def call_mistral(prompt: str, max_tokens: int = 900, retries: int = 3) -> str:
    """Appelle Mistral 7B via HuggingFace Inference API."""
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens"    : max_tokens,
            "temperature"       : 0.65,
            "return_full_text"  : False,
            "do_sample"         : True,
            "top_p"             : 0.9,
            "repetition_penalty": 1.1,
        }
    }
    for attempt in range(retries):
        try:
            r = requests.post(HF_API_URL, headers=headers, json=payload, timeout=150)
            if r.status_code == 503:
                wait = r.json().get("estimated_time", 30)
                time.sleep(min(wait, 60))
                continue
            r.raise_for_status()
            result = r.json()
            if isinstance(result, list) and result:
                return result[0].get("generated_text", "").strip()
        except Exception as e:
            print(f"   ⚠️ Script erreur {attempt+1}: {e}")
            time.sleep(5)
    return ""


def build_script_prompt(client_profile: dict, platform: str,
                         subject: str, tone: str,
                         caption_data: dict,
                         language: str = "Français") -> str:
    """
    Construit le prompt de génération de script vidéo.

    Le script est basé sur la légende déjà générée pour cohérence.
    """
    duration       = PLATFORM_VIDEO_DURATION.get(platform, "30-60 secondes")
    narration_style= PLATFORM_NARRATION_STYLE.get(platform, "dynamique et engageant")
    client_name    = client_profile.get("name", "")
    client_niche   = client_profile.get("niche", "")
    client_audience= client_profile.get("audience", "")
    caption_text   = caption_data.get("caption", "")[:300]

    return f"""<s>[INST] Tu es un expert en production vidéo pour les réseaux sociaux,
spécialisé dans la création de scripts SMMA haute performance.

CONTEXTE CLIENT :
- Nom du client   : {client_name}
- Niche / Secteur : {client_niche}
- Audience cible  : {client_audience}

MISSION : Génère un script vidéo professionnel pour {platform.upper()}.

SUJET              : {subject}
DURÉE RECOMMANDÉE  : {duration}
STYLE DE NARRATION : {narration_style}
TON                : {tone}
LANGUE             : {language}

LÉGENDE DÉJÀ GÉNÉRÉE (pour cohérence) :
"{caption_text}"

STRUCTURE OBLIGATOIRE DU SCRIPT :
1. HOOK (0-3s)       : accroche visuelle OU question choc OU affirmation surprenante
2. PROBLÈME (3-8s)   : pain point de l'audience du client
3. SOLUTION (8-20s)  : valeur / solution / produit du client
4. PREUVE (20-30s)   : chiffre / témoignage / résultat concret
5. CTA (30-35s)      : appel à l'action précis et mémorable

RÈGLES STRICTES :
1. Chaque section doit avoir une durée en secondes
2. Inclure les didascalies visuelles [VISUEL: description de ce qu'on voit à l'écran]
3. La voix doit correspondre à l'audience et au ton du client
4. Le hook doit capter l'attention dans les 3 premières secondes absolument

Réponds UNIQUEMENT avec ce JSON valide :

{{
  "title"          : "titre interne du script",
  "platform"       : "{platform}",
  "total_duration" : "35 secondes",
  "language"       : "{language}",
  "sections": [
    {{
      "name"     : "HOOK",
      "timing"   : "0-3 secondes",
      "voiceover": "texte dit par la voix",
      "visual"   : "description de ce qu'on voit à l'écran"
    }},
    {{
      "name"     : "PROBLÈME",
      "timing"   : "3-8 secondes",
      "voiceover": "...",
      "visual"   : "..."
    }},
    {{
      "name"     : "SOLUTION",
      "timing"   : "8-20 secondes",
      "voiceover": "...",
      "visual"   : "..."
    }},
    {{
      "name"     : "PREUVE",
      "timing"   : "20-30 secondes",
      "voiceover": "...",
      "visual"   : "..."
    }},
    {{
      "name"     : "CTA",
      "timing"   : "30-35 secondes",
      "voiceover": "...",
      "visual"   : "..."
    }}
  ],
  "production_notes": "conseils techniques pour le tournage ou montage"
}}
[/INST]"""


def parse_script_json(text: str) -> dict | None:
    """Parse le JSON script depuis la réponse Mistral."""
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            cleaned = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', match.group())
            try:
                return json.loads(cleaned)
            except Exception:
                pass
    return None


def fallback_script(client_profile: dict, platform: str, subject: str) -> dict:
    """Script de secours si l'API Mistral est indisponible."""
    client_name = client_profile.get("name", "")
    return {
        "title"          : f"Script {platform} — {subject}",
        "platform"       : platform,
        "total_duration" : "35 secondes",
        "language"       : "Français",
        "sections": [
            {
                "name"     : "HOOK",
                "timing"   : "0-3 secondes",
                "voiceover": f"Vous pensez connaître {subject} ? Vous allez être surpris.",
                "visual"   : f"Plan rapproché du produit/service de {client_name}",
            },
            {
                "name"     : "PROBLÈME",
                "timing"   : "3-8 secondes",
                "voiceover": "La plupart des gens perdent du temps avec des solutions inefficaces.",
                "visual"   : "Scène illustrant le problème de l'audience cible",
            },
            {
                "name"     : "SOLUTION",
                "timing"   : "8-20 secondes",
                "voiceover": f"{client_name} a développé une approche unique pour résoudre ça.",
                "visual"   : "Démonstration du produit/service, résultat visible",
            },
            {
                "name"     : "PREUVE",
                "timing"   : "20-30 secondes",
                "voiceover": "Nos clients obtiennent des résultats concrets dès la première semaine.",
                "visual"   : "Témoignage client ou chiffre clé animé à l'écran",
            },
            {
                "name"     : "CTA",
                "timing"   : "30-35 secondes",
                "voiceover": "Cliquez sur le lien en bio pour commencer maintenant.",
                "visual"   : "Logo client + appel à l'action centré à l'écran",
            },
        ],
        "production_notes": "Filmer en lumière naturelle. Sous-titres recommandés. Musique de fond douce.",
    }


def generate_video_script(client_profile: dict, platform: str,
                            subject: str, tone: str,
                            caption_data: dict,
                            language: str = "Français") -> dict:
    """
    Génère le script vidéo professionnel via Mistral 7B.

    Args:
        client_profile : profil client (name, niche, audience)
        platform       : plateforme cible
        subject        : sujet du contenu
        tone           : ton de marque
        caption_data   : légende déjà générée (pour cohérence)
        language       : langue du script

    Returns:
        dict avec sections hook/problème/solution/preuve/CTA
    """
    print(f"🎬 Génération script vidéo {platform} — '{subject}'...")

    prompt = build_script_prompt(
        client_profile, platform, subject, tone, caption_data, language
    )
    response = call_mistral(prompt, max_tokens=900)
    script   = parse_script_json(response)

    if not script:
        print("   ⚠️ Fallback script de secours")
        script = fallback_script(client_profile, platform, subject)

    print(f"   ✅ Script généré ({len(script.get('sections', []))} sections)")
    return script