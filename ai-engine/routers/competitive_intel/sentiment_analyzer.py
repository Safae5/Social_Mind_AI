### `routers/competitive_intel/sentiment_analyzer.py`


# routers/competitive_intel/sentiment_analyzer.py
"""
Analyse de sentiment des légendes concurrentes.

DEUX OUTILS COMPLÉMENTAIRES :

1. VADER (Valence Aware Dictionary and sEntiment Reasoner) :
   - Basé sur un dictionnaire de 7500+ mots valués
   - Spécialement conçu pour les réseaux sociaux
   - Comprend : majuscules (SUPER!!!), répétition, emojis
   - Retourne : compound (-1 → +1), pos, neu, neg
   - Rapide : analyse hors-ligne, pas d'API

2. TextBlob :
   - Retourne : polarity (-1 → +1) et subjectivity (0 → 1)
   - Subjectivity : 0 = objectif, 1 = très subjectif/émotionnel
   - Utile pour distinguer les contenus factuels vs émotionnels

Stratégie d'interprétation pour la veille :
  - Concurrent contenu très positif + subjectif → Stratégie aspirationnelle
  - Concurrent contenu neutre + faible subjectivité → Stratégie éducative
  - Concurrent contenu très subjectif + communautaire → Stratégie émotionnelle
"""

import numpy as np
import pandas as pd
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from textblob import TextBlob
import warnings
warnings.filterwarnings("ignore")

vader = SentimentIntensityAnalyzer()


def analyze_vader(text: str) -> dict:
    """Analyse VADER d'un texte : compound, pos, neu, neg + label."""
    scores   = vader.polarity_scores(str(text))
    compound = scores["compound"]
    label    = "POSITIVE" if compound >= 0.05 else "NEGATIVE" if compound <= -0.05 else "NEUTRAL"
    return {
        "vader_compound" : round(compound, 4),
        "vader_pos"      : round(scores["pos"], 3),
        "vader_neu"      : round(scores["neu"], 3),
        "vader_neg"      : round(scores["neg"], 3),
        "vader_sentiment": label,
    }


def analyze_textblob(text: str) -> dict:
    """Analyse TextBlob : polarity + subjectivity."""
    blob       = TextBlob(str(text))
    polarity   = blob.sentiment.polarity
    subjectivity = blob.sentiment.subjectivity
    label = "POSITIVE" if polarity >= 0.1 else "NEGATIVE" if polarity <= -0.1 else "NEUTRAL"
    return {
        "tb_polarity"    : round(polarity, 4),
        "tb_subjectivity": round(subjectivity, 4),
        "tb_sentiment"   : label,
    }


def analyze_single(text: str) -> dict:
    """Pipeline complet : VADER + TextBlob sur un texte."""
    vader_result = analyze_vader(text)
    tb_result    = analyze_textblob(text)
    v_sent = vader_result["vader_sentiment"]
    t_sent = tb_result["tb_sentiment"]
    return {
        **vader_result,
        **tb_result,
        "final_sentiment": v_sent,
        "confidence"     : 0.9 if v_sent == t_sent else 0.6,
        "is_emotional"   : tb_result["tb_subjectivity"] > 0.5,
    }


def analyze_corpus(df: pd.DataFrame, text_col: str = "caption") -> pd.DataFrame:
    """Analyse le sentiment de tout le corpus."""
    print(f"💬 Analyse de sentiment ({len(df)} posts)...")
    results   = df[text_col].apply(analyze_single)
    result_df = pd.DataFrame(list(results))
    for col in result_df.columns:
        df[col] = result_df[col].values
    total = len(df)
    pos   = (df["final_sentiment"] == "POSITIVE").sum()
    neg   = (df["final_sentiment"] == "NEGATIVE").sum()
    neu   = (df["final_sentiment"] == "NEUTRAL").sum()
    print(f"   ✅ Positif:{pos} ({pos*100//total}%) | Neutre:{neu} | Négatif:{neg}")
    return df


def get_sentiment_by_competitor(df: pd.DataFrame) -> pd.DataFrame:
    """
    Agrège le sentiment par concurrent.

    Infer le profil de stratégie tonale :
      - Positif > 70% + subjectif > 0.5 → Aspirationnel / Inspirant
      - Neutre > 60% + subjectivité < 0.4 → Éducatif / Informatif
      - Positif > 60% + émotionnel > 0.6 → Communautaire / Émotionnel
      - Négatif > 20% → Provocateur / Disruptif
      - Sinon → Promotionnel / Commercial
    """
    grouped = df.groupby("competitor").agg(
        total_posts      = ("final_sentiment", "count"),
        positive_pct     = ("final_sentiment", lambda x: (x == "POSITIVE").mean() * 100),
        negative_pct     = ("final_sentiment", lambda x: (x == "NEGATIVE").mean() * 100),
        neutral_pct      = ("final_sentiment", lambda x: (x == "NEUTRAL").mean() * 100),
        avg_compound     = ("vader_compound",  "mean"),
        avg_polarity     = ("tb_polarity",     "mean"),
        avg_subjectivity = ("tb_subjectivity", "mean"),
        emotional_pct    = ("is_emotional",    "mean"),
    ).round(2).reset_index()

    def infer_tone(row):
        if row["positive_pct"] > 70 and row["avg_subjectivity"] > 0.5:
            return "Aspirationnel / Inspirant"
        elif row["neutral_pct"] > 60 and row["avg_subjectivity"] < 0.4:
            return "Éducatif / Informatif"
        elif row["positive_pct"] > 60 and row["emotional_pct"] > 0.6:
            return "Communautaire / Émotionnel"
        elif row["negative_pct"] > 20:
            return "Provocateur / Disruptif"
        else:
            return "Promotionnel / Commercial"

    grouped["tone_strategy"] = grouped.apply(infer_tone, axis=1)
    return grouped.sort_values("avg_compound", ascending=False)