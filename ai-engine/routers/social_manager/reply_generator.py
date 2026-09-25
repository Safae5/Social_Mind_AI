### `routers/social_manager/reply_generator.py`


# routers/social_manager/reply_generator.py
"""
Génération de réponses aux commentaires avec Mistral 7B.

Modèle : mistralai/Mistral-7B-Instruct-v0.3
Lien   : https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.3

Stratégie de réponse selon le sentiment :
  POSITIF  → Remercier chaleureusement, renforcer la relation
  NEUTRE   → Répondre informatif, encourager l'engagement
  NÉGATIF  → Répondre professionnellement, proposer solution,
              désamorcer la situation

Le prompt inclut :
  - Le ton de marque (professionnel, décontracté, luxe...)
  - Le contexte du post commenté
  - Le sentiment détecté par Twitter-RoBERTa
  - L'historique de la marque

Workflow d'approbation :
  1. Mistral génère la réponse (brouillon)
  2. La réponse est mise en attente d'approbation dans Laravel
  3. Le professionnel approuve / modifie / rejette
  4. Si approuvé → publication via Meta Graph API
"""

import requests
import json
import re
import time
import os

HF_TOKEN   = os.getenv("HF_TOKEN", "hf_XXXXXXXXXXXXXXXXXXXX")
HF_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3"


def call_mistral(prompt: str, max_tokens: int = 250, retries: int = 3) -> str:
    """Appelle Mistral 7B via HuggingFace Inference API."""
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens"    : max_tokens,
            "temperature"       : 0.70,
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
            print(f"   ⚠️ Mistral {attempt+1}: {e}")
            time.sleep(5)
    return ""


def generate_reply(
    comment_text   : str,
    sentiment_label: str,
    post_content   : str,
    brand_name     : str,
    brand_voice    : str = "professionnel et chaleureux",
    language       : str = "Français",
) -> dict:
    """
    Génère une réponse personnalisée à un commentaire.

    Args:
        comment_text    : texte du commentaire entrant
        sentiment_label : POSITIVE / NEUTRAL / NEGATIVE
        post_content    : contenu du post original (contexte)
        brand_name      : nom de la marque
        brand_voice     : ton de communication défini dans le profil client
        language        : langue de réponse

    Returns:
        dict avec reply_text, tone, word_count
    """
    print(f"   🤖 Génération réponse ({sentiment_label})...")

    instructions_by_sentiment = {
        "POSITIVE": (
            "Le commentaire est positif. Remercie sincèrement, renforce la relation "
            "client, utilise des emojis appropriés, invite à revenir ou à partager."
        ),
        "NEUTRAL": (
            "Le commentaire est neutre ou une question. Réponds de façon informative "
            "et utile, propose de l'aide si nécessaire, reste engageant."
        ),
        "NEGATIVE": (
            "Le commentaire est négatif ou une plainte. Réponds de façon TRÈS "
            "professionnelle et empathique, reconnais le problème sans admettre de faute, "
            "propose une solution concrète ou invite à contacter en DM. "
            "Ne sois JAMAIS défensif ou agressif."
        ),
    }

    sentiment_instruction = instructions_by_sentiment.get(
        sentiment_label, instructions_by_sentiment["NEUTRAL"]
    )

    prompt = f"""<s>[INST] Tu es le community manager de "{brand_name}".
Ton de communication : {brand_voice}
Langue : {language}

POST ORIGINAL :
{post_content[:200]}

COMMENTAIRE REÇU :
"{comment_text}"

INSTRUCTION :
{sentiment_instruction}

RÈGLES :
- Maximum 3 phrases courtes
- Utilise le prénom si disponible dans le commentaire
- Signe avec le nom de la marque ou un emoji signature
- N'utilise PAS de formules génériques comme "Merci pour votre commentaire"
- La réponse doit sonner humain, pas robotique

Génère uniquement le texte de la réponse, sans explication ni guillemets :
[/INST]"""

    reply = call_mistral(prompt, max_tokens=150)

    # Fallbacks si Mistral indisponible
    if not reply:
        fallbacks = {
            "POSITIVE": f"Merci beaucoup pour votre soutien ! 🙏 Ça nous touche vraiment. À bientôt sur nos prochaines publications ! — {brand_name}",
            "NEUTRAL" : f"Bonjour ! Merci pour votre message. N'hésitez pas à nous contacter en DM pour plus d'informations. — {brand_name}",
            "NEGATIVE": f"Bonjour, nous sommes désolés pour cette expérience. Pourriez-vous nous contacter en DM afin que nous puissions arranger cela ? — {brand_name}",
        }
        reply = fallbacks.get(sentiment_label, fallbacks["NEUTRAL"])

    # Nettoyage
    reply = reply.strip().strip('"').strip("'")
    if len(reply) > 500:
        reply = reply[:500] + "..."

    return {
        "reply_text" : reply,
        "tone"       : brand_voice,
        "word_count" : len(reply.split()),
        "sentiment_addressed": sentiment_label,
        "needs_approval"     : True,    # Toujours passer par l'approbation humaine
    }