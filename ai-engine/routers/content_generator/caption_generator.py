### 2.4 — `caption_generator.py`


# ai_engine/routers/content_generator/caption_generator.py
import requests
import json
import re
import time
import os
from .platform_specs import PLATFORM_SPECS, TONE_DESCRIPTIONS

HF_TOKEN   = os.getenv("HF_TOKEN", "hf_XXXXXXXXXXXXXXXXXXXX")
HF_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3"


def call_mistral(prompt: str, max_tokens: int = 1200, retries: int = 3) -> str:
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens"    : max_tokens,
            "temperature"       : 0.75,
            "return_full_text"  : False,
            "do_sample"         : True,
            "top_p"             : 0.9,
            "repetition_penalty": 1.1,
        }
    }
    for attempt in range(retries):
        try:
            r = requests.post(HF_API_URL, headers=headers, json=payload, timeout=120)
            if r.status_code == 503:
                wait = r.json().get("estimated_time", 30)
                time.sleep(min(wait, 60))
                continue
            r.raise_for_status()
            result = r.json()
            if isinstance(result, list) and result:
                return result[0].get("generated_text", "").strip()
        except Exception as e:
            print(f"Mistral erreur tentative {attempt+1}: {e}")
            time.sleep(5)
    return ""


def build_prompt(subject: str, platform: str, tone: str,
                  language: str, brand_inject: str, extra_context: str) -> str:
    specs      = PLATFORM_SPECS.get(platform, PLATFORM_SPECS["instagram"])
    tone_desc  = TONE_DESCRIPTIONS.get(tone, tone)
    brand_sec  = f"\nVOIX DE MARQUE :\n{brand_inject}" if brand_inject else ""
    ctx_sec    = f"\nCONTEXTE : {extra_context}" if extra_context.strip() else ""

    return f"""<s>[INST] Tu es un expert en copywriting pour les réseaux sociaux.

MISSION : Génère exactement 3 variantes de légendes pour {platform.upper()}.

SUJET : {subject}{ctx_sec}
PLATEFORME : {platform} | TON : {tone} ({tone_desc}) | LANGUE : {language}

SPECS TECHNIQUES {platform.upper()} :
- Longueur optimale : {specs['optimal_chars']}
- Emojis : {specs['emoji_usage']}
- Hashtags : {specs['recommended_hashtags']} recommandés — {specs['hashtag_strategy']}
- Note : {specs['format_notes']}

CTAs adaptés : {' | '.join(specs['cta_examples'][:3])}
{brand_sec}

3 STYLES À GÉNÉRER :
- Variante 1 "Directe"      : Hook percutant, message assertif
- Variante 2 "Storytelling" : Narration émotionnelle, histoire
- Variante 3 "Éducative"    : Valeur concrète, astuce/conseil

RÈGLES :
1. Hook fort dans les 2 premières lignes
2. Hashtags inclus à la fin de chaque légende
3. CTA adapté à la plateforme
4. Respecter la longueur optimale
5. concept_image en anglais (pour Stable Diffusion)

Réponds UNIQUEMENT avec ce JSON valide :
{{
  "variants": [
    {{
      "id": 1, "style": "Directe",
      "caption": "texte complet avec hashtags",
      "hashtags": ["#tag1", "#tag2"],
      "cta": "texte CTA",
      "char_count": 145,
      "emoji_count": 3,
      "concept_image": "english description for image generation"
    }},
    {{
      "id": 2, "style": "Storytelling",
      "caption": "texte complet avec hashtags",
      "hashtags": ["#tag1", "#tag2"],
      "cta": "texte CTA",
      "char_count": 180,
      "emoji_count": 4,
      "concept_image": "english description for image generation"
    }},
    {{
      "id": 3, "style": "Éducative",
      "caption": "texte complet avec hashtags",
      "hashtags": ["#tag1", "#tag2"],
      "cta": "texte CTA",
      "char_count": 200,
      "emoji_count": 2,
      "concept_image": "english description for image generation"
    }}
  ]
}}
[/INST]"""


def parse_variants(text: str) -> list[dict]:
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group())
            variants = data.get("variants", [])
            for v in variants:
                v["char_count"] = len(v.get("caption", ""))
            return variants
        except Exception:
            cleaned = re.sub(r'[\x00-\x1f]', '', match.group())
            try:
                return json.loads(cleaned).get("variants", [])
            except Exception:
                pass
    return []


def fallback_variants(subject: str, platform: str) -> list[dict]:
    specs = PLATFORM_SPECS.get(platform, PLATFORM_SPECS["instagram"])
    ctas  = specs["cta_examples"]
    return [
        {
            "id": 1, "style": "Directe",
            "caption": f"✨ {subject.capitalize()} — voilà tout ce que vous devez savoir.\n\nNous avons tout ce qu'il vous faut !\n\n{ctas[0]}",
            "hashtags": [f"#{subject.replace(' ','').lower()}", "#contenu"],
            "cta": ctas[0], "char_count": 150, "emoji_count": 1,
            "concept_image": f"professional photo about {subject}, clean background"
        },
        {
            "id": 2, "style": "Storytelling",
            "caption": f"Tout a changé le jour où nous avons découvert {subject}...\n\nAujourd'hui on partage tout avec vous. ✨\n\n{ctas[1] if len(ctas) > 1 else ctas[0]}",
            "hashtags": [f"#{subject.replace(' ','').lower()}", "#histoire"],
            "cta": ctas[1] if len(ctas) > 1 else ctas[0], "char_count": 200, "emoji_count": 1,
            "concept_image": f"storytelling scene about {subject}, warm lighting"
        },
        {
            "id": 3, "style": "Éducative",
            "caption": f"💡 3 choses sur {subject} :\n\n1️⃣ Plus simple qu'on ne le pense\n2️⃣ Résultats rapides\n3️⃣ Accessible à tous\n\n{ctas[2] if len(ctas) > 2 else ctas[0]}",
            "hashtags": [f"#{subject.replace(' ','').lower()}", "#conseils", "#tips"],
            "cta": ctas[2] if len(ctas) > 2 else ctas[0], "char_count": 220, "emoji_count": 5,
            "concept_image": f"educational infographic about {subject}, bright colors"
        },
    ]


def generate_captions(subject: str, platform: str, tone: str, language: str,
                       brand_voice: dict, extra_context: str) -> list[dict]:
    print(f"✍️ Génération légendes {platform} — '{subject}'")
    prompt   = build_prompt(subject, platform, tone, language,
                             brand_voice.get("prompt_injection", ""), extra_context)
    response = call_mistral(prompt)
    variants = parse_variants(response)
    if not variants:
        print("⚠️ Fallback variantes de secours")
        variants = fallback_variants(subject, platform)
    for v in variants:
        v["char_count"] = len(v.get("caption", ""))
    print(f"✅ {len(variants)} variantes générées")
    return variants