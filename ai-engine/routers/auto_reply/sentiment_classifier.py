## PHASE 3 — MODULES PYTHON AI ENGINE

### `routers/auto_reply/sentiment_classifier.py`


# routers/auto_reply/sentiment_classifier.py
"""
Classification du sentiment des commentaires et DMs.

Modèle principal : cardiffnlp/twitter-roberta-base-sentiment-latest
Lien : https://huggingface.co/cardiffnlp/twitter-roberta-base-sentiment-latest

Entraîné sur des tweets/commentaires réseaux sociaux.
Reconnaît : langage informel, emojis, abréviations.
3 classes : POSITIVE / NEUTRAL / NEGATIVE

Détection complémentaire de QUESTIONS :
  Règle 1 : présence de "?" → question
  Règle 2 : mot interrogatif dans les 3 premiers mots → question
  Si question → priorité sur la classification sentiment

Classes finales :
  - "positive"  → 🟢 Auto-réponse possible
  - "question"  → 🔵 Auto-réponse recommandée
  - "negative"  → 🔴 Signaler pour revue humaine
  - "spam"      → ⚫ Masquer automatiquement (depuis spam_detector)
"""

import re
import os
import torch   # type: ignore
from transformers import AutoTokenizer, AutoModelForSequenceClassification  # type: ignore

# Singleton — chargé une seule fois au démarrage
_model     = None
_tokenizer = None
MODEL_NAME = "cardiffnlp/twitter-roberta-base-sentiment-latest"

QUESTION_WORDS_FR = {
    "comment","pourquoi","quand","où","qui","quoi","quel","quelle",
    "combien","est-ce","peut-on","avez-vous","existe","disponible",
    "livrez","vendez","faites","acceptez","proposez",
}
QUESTION_WORDS_EN = {
    "how","why","when","where","who","what","which","whose",
    "do you","can you","is there","are there","do you have",
    "will you","can i","could you","would you",
}
QUESTION_INDICATORS = QUESTION_WORDS_FR | QUESTION_WORDS_EN


def load_sentiment_model():
    """Charge Twitter-RoBERTa au démarrage (singleton)."""
    global _model, _tokenizer
    if _model is None:
        print(f"⏳ Chargement Twitter-RoBERTa...")
        _tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        _model     = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
        _model.eval()
        print("   ✅ Modèle chargé !")
    return _model, _tokenizer


def is_question(text: str) -> bool:
    """Détecte si le texte est une question."""
    text_clean = text.strip().lower()
    if "?" in text_clean:
        return True
    first_words = set(text_clean.split()[:3])
    if first_words & QUESTION_INDICATORS:
        return True
    return False


def classify_sentiment_roberta(text: str) -> dict:
    """
    Classifie le sentiment d'un commentaire avec Twitter-RoBERTa.

    Returns:
        dict avec sentiment, confidence, scores, label_emoji,
        auto_reply, needs_review
    """
    try:
        model, tokenizer = load_sentiment_model()

        # Prétraitement spécifique Twitter-RoBERTa
        text_clean = re.sub(r"@\w+", "@user", text)
        text_clean = re.sub(r"http\S+|www\S+", "http", text_clean)
        text_clean = text_clean[:512]

        # Question détectée en priorité
        if is_question(text):
            return {
                "sentiment"   : "question",
                "confidence"  : 0.95,
                "scores"      : {"positive": 0, "neutral": 0, "negative": 0},
                "label_emoji" : "🔵",
                "auto_reply"  : True,
                "needs_review": False,
            }

        # Inférence RoBERTa
        inputs = tokenizer(text_clean, return_tensors="pt",
                           truncation=True, max_length=128)
        with torch.no_grad():
            outputs = model(**inputs)
            probs   = torch.softmax(outputs.logits, dim=1)
            probs_list = probs[0].tolist()

        # Labels : 0=Negative, 1=Neutral, 2=Positive
        id2label = model.config.id2label
        scores   = {id2label[i].lower(): round(p, 4) for i, p in enumerate(probs_list)}
        top_class   = max(scores, key=scores.get)
        confidence  = round(scores[top_class], 4)

        if top_class in ["positive", "pos"]:
            return {
                "sentiment": "positive", "confidence": confidence,
                "scores": scores, "label_emoji": "🟢",
                "auto_reply": True, "needs_review": False,
            }
        elif top_class in ["negative", "neg"] and confidence > 0.6:
            return {
                "sentiment": "negative", "confidence": confidence,
                "scores": scores, "label_emoji": "🔴",
                "auto_reply": False, "needs_review": True,
            }
        else:
            return {
                "sentiment": "neutral", "confidence": confidence,
                "scores": scores, "label_emoji": "⚪",
                "auto_reply": False, "needs_review": False,
            }

    except Exception as e:
        print(f"   ⚠️ Erreur classification : {e}")
        return {
            "sentiment": "neutral", "confidence": 0.5,
            "scores": {"positive": 0.33, "neutral": 0.34, "negative": 0.33},
            "label_emoji": "⚪", "auto_reply": False, "needs_review": False,
        }


def classify_batch(texts: list[str]) -> list[dict]:
    """Classifie une liste de messages."""
    return [classify_sentiment_roberta(t) for t in texts]