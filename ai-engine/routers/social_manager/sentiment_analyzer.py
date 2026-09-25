### `routers/social_manager/sentiment_analyzer.py`


# routers/social_manager/sentiment_analyzer.py
"""
Classification du sentiment des commentaires avec Twitter-RoBERTa.

Modèle : cardiffnlp/twitter-roberta-base-sentiment-latest
Lien   : https://huggingface.co/cardiffnlp/twitter-roberta-base-sentiment-latest

Pourquoi Twitter-RoBERTa au lieu de DistilBERT ?
  - Entraîné spécifiquement sur des tweets/commentaires sociaux
  - Comprend les emojis, l'argot internet, les hashtags
  - 3 classes : POSITIVE, NEUTRAL, NEGATIVE
  - Plus précis que DistilBERT pour les réseaux sociaux
  - Gratuit sur HuggingFace

Données Social Media Sentiments Analysis Dataset (Kaggle) :
  Lien  : https://www.kaggle.com/datasets/kashishparmar02/social-media-sentiments-analysis-dataset
  Usage : Validation du modèle sur des données réelles de réseaux sociaux
"""

from transformers import pipeline
import torch

# Singleton — chargé une seule fois
_sentiment_pipeline = None


def load_sentiment_model():
    """Charge Twitter-RoBERTa (singleton)."""
    global _sentiment_pipeline
    if _sentiment_pipeline is None:
        print("⏳ Chargement Twitter-RoBERTa...")
        device = 0 if torch.cuda.is_available() else -1
        _sentiment_pipeline = pipeline(
            "sentiment-analysis",
            model   = "cardiffnlp/twitter-roberta-base-sentiment-latest",
            device  = device,
            truncation = True,
            max_length = 128,
        )
        print("   ✅ Twitter-RoBERTa chargé !")
    return _sentiment_pipeline


def classify_sentiment(comment_text: str) -> dict:
    """
    Classifie le sentiment d'un commentaire.

    Args:
        comment_text : texte du commentaire

    Returns:
        dict avec label (POSITIVE/NEUTRAL/NEGATIVE), score, emoji
    """
    pipe   = load_sentiment_model()
    result = pipe(comment_text[:512])[0]    # Tronquer à 512 tokens

    label  = result["label"].upper()
    score  = round(result["score"], 3)

    # Normaliser les labels du modèle
    label_map = {
        "POSITIVE": "POSITIVE", "POS": "POSITIVE",
        "NEGATIVE": "NEGATIVE", "NEG": "NEGATIVE",
        "NEUTRAL" : "NEUTRAL",  "NEU": "NEUTRAL",
    }
    label = label_map.get(label, "NEUTRAL")

    emoji_map = {
        "POSITIVE": "😊", "NEUTRAL": "😐", "NEGATIVE": "😠"
    }
    action_map = {
        "POSITIVE": "like",      # Liker le commentaire positif
        "NEUTRAL" : "review",    # À examiner manuellement
        "NEGATIVE": "respond",   # Répondre rapidement au négatif
    }
    priority_map = {
        "POSITIVE": "low",
        "NEUTRAL" : "medium",
        "NEGATIVE": "high",
    }

    return {
        "label"          : label,
        "score"          : score,
        "emoji"          : emoji_map[label],
        "suggested_action": action_map[label],
        "priority"       : priority_map[label],
        "raw_label"      : result["label"],
    }


def classify_batch(comments: list[str]) -> list[dict]:
    """
    Classifie un batch de commentaires (plus efficace).

    Args:
        comments : liste de textes

    Returns:
        Liste de dicts de sentiment
    """
    if not comments:
        return []

    pipe = load_sentiment_model()
    try:
        results = pipe(
            [c[:512] for c in comments],
            batch_size = 8,
            truncation = True,
            max_length = 128,
        )
        sentiments = []
        for result in results:
            label = result["label"].upper()
            label_map = {
                "POSITIVE": "POSITIVE", "POS": "POSITIVE",
                "NEGATIVE": "NEGATIVE", "NEG": "NEGATIVE",
                "NEUTRAL" : "NEUTRAL",  "NEU": "NEUTRAL",
            }
            label = label_map.get(label, "NEUTRAL")
            sentiments.append({
                "label"           : label,
                "score"           : round(result["score"], 3),
                "emoji"           : {"POSITIVE": "😊", "NEUTRAL": "😐", "NEGATIVE": "😠"}[label],
                "suggested_action": {"POSITIVE": "like", "NEUTRAL": "review", "NEGATIVE": "respond"}[label],
                "priority"        : {"POSITIVE": "low", "NEUTRAL": "medium", "NEGATIVE": "high"}[label],
            })
        return sentiments
    except Exception as e:
        print(f"   ⚠️ Erreur batch sentiment : {e}")
        return [classify_sentiment(c) for c in comments]