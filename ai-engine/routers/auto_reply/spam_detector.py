### `routers/auto_reply/spam_detector.py`

# routers/auto_reply/spam_detector.py
"""
Détection spam et contenu toxique.

Approche hybride :
  1. Règles heuristiques (rapide, 0 ressource GPU)
  2. unitary/toxic-bert (HuggingFace) — cas ambigus
     Lien : https://huggingface.co/unitary/toxic-bert
     Fine-tuné sur Jigsaw Toxic Comment Dataset.
     Détecte : toxicité, vulgarité, menaces, insultes.
     Seuil spam : score toxicité > 0.7

Patterns heuristiques détectés :
  - follow4follow, like4like
  - Liens promotionnels / arnaques
  - Emojis excessifs (>10 par message)
  - Majuscules excessives (>60% du texte)
  - Répétitions de caractères (aaaaaa)
  - Numéros de téléphone / WhatsApp
"""

import re
import torch   # type: ignore
from transformers import pipeline   # type: ignore

_spam_pipeline = None
MODEL_NAME     = "unitary/toxic-bert"

SPAM_PATTERNS = [
    r"follow\s*for\s*follow",
    r"f4f|l4l|like\s*for\s*like",
    r"(?:free|gratuit).{0,20}(?:iphone|samsung|argent|money|€|\$)",
    r"(?:gagnez?|gagner|earn).{0,30}(?:\d+\s*€|\d+\s*\$)",
    r"(?:bit\.ly|tinyurl|t\.co)\/\w+",
    r"(?:check|voir).{0,10}(?:bio|link|profil)",
    r"dm\s*(?:me|moi)\s*(?:for|pour)",
    r"(\w)\1{4,}",
    r"(?:\d{10,}|\+\d{10,})",
    r"(?:whatsapp|telegram|signal)\s*:?\s*\+?\d",
]
COMPILED_PATTERNS = [re.compile(p, re.IGNORECASE) for p in SPAM_PATTERNS]


def load_spam_model():
    """Charge toxic-bert (singleton)."""
    global _spam_pipeline
    if _spam_pipeline is None:
        print("⏳ Chargement toxic-bert...")
        _spam_pipeline = pipeline(
            "text-classification",
            model=MODEL_NAME, tokenizer=MODEL_NAME,
            top_k=None, device=-1,
        )
        print("   ✅ toxic-bert chargé !")
    return _spam_pipeline


def check_heuristic_spam(text: str) -> tuple[bool, str]:
    """Vérification heuristique rapide."""
    emoji_count = len(re.findall(r"[\U0001F300-\U0001F9FF]", text, flags=re.UNICODE))
    if emoji_count > 10:
        return True, "too_many_emojis"

    alpha_chars = [c for c in text if c.isalpha()]
    if alpha_chars and sum(1 for c in alpha_chars if c.isupper()) / len(alpha_chars) > 0.6:
        return True, "excessive_caps"

    for i, pattern in enumerate(COMPILED_PATTERNS):
        if pattern.search(text):
            return True, f"spam_pattern_{i}"

    return False, "clean"


def detect_spam(text: str, threshold: float = 0.7) -> dict:
    """
    Détecte si un commentaire est du spam.
    Étape 1 : heuristiques → Étape 2 : toxic-bert

    Returns:
        dict avec is_spam, reason, toxicity_score, action
    """
    text = str(text).strip()
    if not text:
        return {"is_spam": False, "reason": "empty", "toxicity_score": 0, "action": "keep"}

    is_heuristic_spam, reason = check_heuristic_spam(text)
    if is_heuristic_spam:
        return {"is_spam": True, "reason": reason, "toxicity_score": 0.95, "action": "hide"}

    try:
        classifier  = load_spam_model()
        results     = classifier(text[:512])[0]
        toxic_score = 0.0
        for item in results:
            if item["label"].lower() in ["toxic", "toxicity", "1"]:
                toxic_score = item["score"]
                break

        is_toxic = toxic_score >= threshold
        return {
            "is_spam"       : is_toxic,
            "reason"        : "toxic_content" if is_toxic else "clean",
            "toxicity_score": round(toxic_score, 4),
            "action"        : "hide" if is_toxic else "keep",
        }

    except Exception as e:
        print(f"   ⚠️ Erreur toxic-bert : {e}")
        return {"is_spam": False, "reason": "model_error", "toxicity_score": 0.0, "action": "keep"}