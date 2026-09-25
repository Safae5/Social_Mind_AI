### `routers/auto_reply/reply_generator.py`


# routers/auto_reply/reply_generator.py
"""
Génération des réponses avec Mistral 7B.
Modèle : mistralai/Mistral-7B-Instruct-v0.3
Lien   : https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.3

Types de réponses générées :
  1. Commentaire positif  : court (30-80 chars), chaleureux
  2. Question             : précis, oriente vers DMs si complexe
  3. Commentaire négatif  : empathique, non-défensif, propose solution en DM
  4. DM entrant           : plus long, personnalisé avec prénom
"""

import requests   # type: ignore
import json
import re
import time
import os

HF_TOKEN   = os.getenv("HF_TOKEN", "hf_XXXXXXXXXXXXXXXXXXXX")
HF_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3"


def call_mistral(prompt: str, max_tokens: int = 300, retries: int = 3) -> str:
    """Appelle Mistral 7B via HuggingFace Inference API."""
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens": max_tokens, "temperature": 0.65,
            "return_full_text": False, "do_sample": True,
            "top_p": 0.9, "repetition_penalty": 1.1,
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
            print(f"   ⚠️ Mistral erreur {attempt+1}: {e}")
            time.sleep(5)
    return ""


def build_comment_reply_prompt(comment_text: str, sentiment: str, platform: str,
                                brand_name: str, post_context: str,
                                brand_voice: dict, author_name: str = "") -> str:
    """Construit le prompt pour répondre à un commentaire."""
    bv_inject   = brand_voice.get("prompt_injection", "")
    avg_len     = brand_voice.get("avg_length", 80)
    uses_emojis = brand_voice.get("uses_emojis", True)
    uses_name   = brand_voice.get("uses_first_name", False)
    author_ctx  = f"\nAuteur : {author_name}" if author_name else ""

    if sentiment == "positive":
        instruction = (
            f"Génère une réponse COURTE et CHALEUREUSE ({avg_len//2}-{avg_len} chars max). "
            f"Remercie sincèrement, encourage l'engagement. "
            f"{'1-2 emojis pertinents.' if uses_emojis else 'Sans emojis.'}"
        )
    elif sentiment == "question":
        instruction = (
            f"Génère une réponse UTILE et DIRECTE ({avg_len}-{avg_len*2} chars). "
            f"Réponds si possible, sinon oriente vers les DMs. "
            f"{'1 emoji amical.' if uses_emojis else 'Sans emojis.'}"
        )
    elif sentiment == "negative":
        instruction = (
            f"Génère une réponse EMPATHIQUE et NON-DÉFENSIVE ({avg_len}-{avg_len*2} chars). "
            f"Reconnais l'insatisfaction, propose de résoudre en DM. "
            f"Ne jamais contester le commentaire. Sans emojis ou très discret."
        )
    else:
        instruction = (
            f"Génère une réponse NEUTRE et ENGAGEANTE ({avg_len} chars). "
            f"{'1 emoji.' if uses_emojis else 'Sans emojis.'}"
        )

    name_instruction = ""
    if uses_name and author_name:
        name_instruction = f"Commence par '{author_name.split()[0]}'."

    return f"""<s>[INST] Tu es le social media manager de {brand_name}.
Tu gères les commentaires sur {platform}.

COMMENTAIRE REÇU (sentiment: {sentiment.upper()}) :
"{comment_text}"{author_ctx}

CONTEXTE DU POST :
{post_context or "Publication générale de la marque"}

{bv_inject}

INSTRUCTION : {instruction}
{name_instruction}

RÈGLES :
1. Répondre uniquement en tant que {brand_name}
2. Ne jamais mentionner que tu es une IA
3. Rester dans la voix de marque
4. Réponse naturelle et authentique

Génère uniquement le texte de la réponse : [/INST]"""


def build_dm_reply_prompt(dm_text: str, sender_name: str, platform: str,
                           brand_name: str, brand_voice: dict,
                           conversation_history: list[dict] = None) -> str:
    """Construit le prompt pour répondre à un DM."""
    bv_inject   = brand_voice.get("prompt_injection", "")
    avg_len     = brand_voice.get("avg_length", 150)
    uses_emojis = brand_voice.get("uses_emojis", True)

    history_ctx = ""
    if conversation_history:
        history_ctx = "\nHISTORIQUE :\n"
        for msg in conversation_history[-5:]:
            role = "Client" if msg.get("from_user") else brand_name
            history_ctx += f"  {role}: \"{msg.get('text', '')[:100]}\"\n"

    return f"""<s>[INST] Tu es le social media manager de {brand_name}.
Tu gères les messages directs sur {platform}.

MESSAGE DIRECT :
De : {sender_name}
Message : "{dm_text}"
{history_ctx}

{bv_inject}

INSTRUCTION : Génère une réponse PERSONNALISÉE ({avg_len}-{avg_len*2} chars).
  - Adresse-toi à {sender_name.split()[0] if sender_name else "l'utilisateur"} par son prénom
  - Réponds précisément à sa demande
  - Propose une action concrète
  - {'1-2 emojis adaptés.' if uses_emojis else 'Sans emojis.'}
  - Si tu ne peux pas répondre, informe que tu vas transmettre

RÈGLES : Ne pas mentionner que tu es une IA. Rester dans la voix de {brand_name}.
Génère uniquement la réponse : [/INST]"""


def generate_reply(message_text: str, message_type: str, sentiment: str,
                   platform: str, brand_name: str, brand_voice: dict,
                   post_context: str = "", author_name: str = "",
                   conversation_history: list[dict] = None) -> dict:
    """
    Génère une réponse contextuelle avec Mistral 7B.

    Returns:
        dict avec response_text, char_count, word_count
    """
    print(f"✍️ Génération réponse {message_type} ({sentiment}) pour {brand_name}...")

    if message_type == "dm":
        prompt     = build_dm_reply_prompt(message_text, author_name, platform,
                                            brand_name, brand_voice, conversation_history)
        max_tokens = 400
    else:
        prompt     = build_comment_reply_prompt(message_text, sentiment, platform,
                                                 brand_name, post_context, brand_voice, author_name)
        max_tokens = 200

    response = call_mistral(prompt, max_tokens=max_tokens)

    if response:
        response = response.strip().strip('"').strip("'")
        for prefix in ["Réponse :", "Response:", "Answer:", "Reply:"]:
            if response.startswith(prefix):
                response = response[len(prefix):].strip()

    # Fallbacks si Mistral ne répond pas
    if not response:
        fallbacks = {
            "positive": "Merci beaucoup pour votre message ! 😊 Ça nous touche vraiment.",
            "question": "Bonjour ! Merci pour votre question. N'hésitez pas à nous envoyer un DM pour plus d'infos 📩",
            "negative": "Nous sommes désolés pour cette expérience. Pouvez-vous nous contacter en DM ?",
            "neutral" : "Merci pour votre message ! Nous sommes là si vous avez des questions 😊",
            "dm"      : f"Bonjour {author_name.split()[0] if author_name else ''} ! Merci pour votre message. Nous revenons vers vous rapidement.",
        }
        response = fallbacks.get(sentiment if message_type == "comment" else "dm",
                                  fallbacks["neutral"])

    print(f"   ✅ Réponse : {len(response)} caractères")
    return {"response_text": response, "char_count": len(response), "word_count": len(response.split())}