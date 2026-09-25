### `routers/content_creator/caption_generator.py`


# routers/content_creator/caption_generator.py
"""
Génération de légende professionnelle avec Mistral 7B.

Modèle : mistralai/Mistral-7B-Instruct-v0.3
Lien   : https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.3
Rôle   : Remplace GPT-4o pour la génération de légendes (100% gratuit)

Pour l'Agent Créateur de Contenu IA (Professionnel) :
  - Prend en entrée : le profil client, la plateforme, le sujet, le ton
  - Génère UNE légende de qualité professionnelle (pas 3 variantes)
  - Inclut hashtags + CTA adaptés à la plateforme
  - Respecte les specs techniques de chaque réseau social

La légende est ensuite stockée dans le content_pack pour approbation.
Toutes les sorties nécessitent une approbation humaine avant publication.
"""

import requests
import json
import re
import time
import os
from .platform_specs import get_platform_specs, get_tone_description

HF_TOKEN   = os.getenv("HF_TOKEN", "hf_XXXXXXXXXXXXXXXXXXXX")
HF_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3"


def call_mistral(prompt: str, max_new_tokens: int = 800, retries: int = 3) -> str:
    """Appelle Mistral 7B via l'API HuggingFace Inference (gratuite)."""
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens"    : max_new_tokens,
            "temperature"       : 0.70,
            "return_full_text"  : False,
            "do_sample"         : True,
            "top_p"             : 0.9,
            "repetition_penalty": 1.1,
        }
    }
    for attempt in range(retries):
        try:
            print(f"   📡 Mistral 7B appel {attempt+1}/{retries}...")
            r = requests.post(HF_API_URL, headers=headers, json=payload, timeout=120)
            if r.status_code == 503:
                wait = r.json().get("estimated_time", 30)
                print(f"   ⏳ Modèle en chargement, attente {wait:.0f}s...")
                time.sleep(min(wait, 60))
                continue
            r.raise_for_status()
            result = r.json()
            if isinstance(result, list) and result:
                return result[0].get("generated_text", "").strip()
        except Exception as e:
            print(f"   ⚠️ Erreur tentative {attempt+1}: {e}")
            time.sleep(5)
    return ""


def build_caption_prompt(client_profile: dict, platform: str,
                          subject: str, tone: str,
                          language: str = "Français") -> str:
    """
    Construit le prompt de génération de légende professionnelle.

    Pour un usage SMMA professionnel, la légende doit refléter
    l'identité de marque du CLIENT (pas de l'agence).
    """
    specs       = get_platform_specs(platform)
    tone_desc   = get_tone_description(tone)

    # Contexte client
    client_name = client_profile.get("name", "")
    client_niche= client_profile.get("niche", "")
    client_tone = client_profile.get("brand_tone", tone)
    client_audience = client_profile.get("audience", "")

    cta_list = specs["cta_examples"][:3]

    return f"""<s>[INST] Tu es un expert en copywriting pour les réseaux sociaux,
travaillant pour une agence SMMA (Social Media Marketing Agency).

CONTEXTE CLIENT :
- Nom du client   : {client_name}
- Niche / Secteur : {client_niche}
- Audience cible  : {client_audience}
- Ton de marque   : {client_tone}

MISSION : Génère une légende professionnelle pour {platform.upper()}.

SUJET : {subject}
PLATEFORME : {platform} | TON SOUHAITÉ : {tone} — {tone_desc} | LANGUE : {language}

SPECS TECHNIQUES {platform.upper()} :
- Longueur optimale : {specs['optimal_chars']}
- Emojis : {specs['emoji_usage']}
- Hashtags : {specs['recommended_hashtags']} recommandés — {specs['hashtag_strategy']}
- Note importante : {specs['format_notes']}

CTAs adaptés à {platform} :
{chr(10).join([f'  - {cta}' for cta in cta_list])}

RÈGLES STRICTES :
1. Hook fort dans les 2 premières lignes (accroche immédiate)
2. Corps du message aligné avec la niche et l'audience du client
3. Hashtags inclus à la fin de la légende
4. CTA clair et adapté à la plateforme
5. Respecter EXACTEMENT la longueur optimale

Réponds UNIQUEMENT avec un JSON valide, sans texte avant ou après :

{{
  "caption"       : "texte complet de la légende incluant les hashtags",
  "hashtags"      : ["#hashtag1", "#hashtag2", "#hashtag3"],
  "cta"           : "texte du call-to-action uniquement",
  "char_count"    : 145,
  "emoji_count"   : 3,
  "image_concept" : "description courte en anglais du visuel à générer pour cette légende"
}}
[/INST]"""


def parse_caption_json(text: str) -> dict | None:
    """Extrait le JSON de la réponse Mistral."""
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


def fallback_caption(client_profile: dict, platform: str, subject: str) -> dict:
    """Légende de secours si l'API est indisponible."""
    specs       = get_platform_specs(platform)
    cta         = specs["cta_examples"][0]
    client_name = client_profile.get("name", "")
    niche       = client_profile.get("niche", subject)

    return {
        "caption"      : f"✨ {subject.capitalize()} — {client_name}\n\nDécouvrez tout ce que vous devez savoir sur {niche}.\n\n{cta}",
        "hashtags"     : [f"#{niche.replace(' ', '').lower()}", "#contenu", "#marketing"],
        "cta"          : cta,
        "char_count"   : 120,
        "emoji_count"  : 1,
        "image_concept": f"professional photo about {subject}, clean background, modern style",
    }


def generate_caption(client_profile: dict, platform: str,
                      subject: str, tone: str,
                      language: str = "Français") -> dict:
    """
    Génère la légende professionnelle via Mistral 7B.

    Args:
        client_profile : dict du profil client (name, niche, audience, brand_tone)
        platform       : plateforme cible (instagram, tiktok, facebook...)
        subject        : sujet du post
        tone           : ton souhaité
        language       : langue de génération

    Returns:
        dict avec caption, hashtags, cta, char_count, image_concept
    """
    print(f"✍️ Génération légende {platform} pour '{subject}' (client: {client_profile.get('name', '')})")

    prompt  = build_caption_prompt(client_profile, platform, subject, tone, language)
    response= call_mistral(prompt, max_new_tokens=600)
    caption = parse_caption_json(response)

    if not caption:
        print("   ⚠️ Fallback légende de secours")
        caption = fallback_caption(client_profile, platform, subject)
    else:
        caption["char_count"] = len(caption.get("caption", ""))

    print(f"   ✅ Légende générée ({caption.get('char_count', 0)} caractères)")
    return caption