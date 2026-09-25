### `routers/competitive_intel/viral_detector.py`


# routers/competitive_intel/viral_detector.py
"""
Détection des patterns de contenu viral.

Un contenu viral = engagement_score dans le top 15% du corpus.

Approche TF-IDF différentielle :
  1. Séparer : posts viraux vs posts normaux
  2. TF-IDF sur les deux groupes
  3. Comparer les scores → mots avec score élevé dans viraux
     mais faible dans normaux = PATTERNS VIRAUX distinctifs

Analyses complémentaires :
  - Fréquence des hashtags dans les posts viraux
  - Types de contenu les plus viraux (Reel, Carrousel...)
  - Timing optimal (jour/heure)
  - Longueur optimale des légendes
  - Concurrent dominant dans les viraux
"""

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from collections import Counter
import warnings
warnings.filterwarnings("ignore")


def detect_viral_patterns(df: pd.DataFrame) -> dict:
    """Identifie tous les patterns des contenus viraux."""
    print("🔥 Détection des patterns viraux...")

    viral  = df[df["is_viral"] == True].copy()
    normal = df[df["is_viral"] == False].copy()

    print(f"   📊 Posts viraux : {len(viral)} / {len(df)} ({len(viral)*100//len(df)}%)")

    if len(viral) < 3:
        return {"error": "Pas assez de posts viraux (minimum 3)"}

    return {
        "viral_keywords"       : _extract_viral_keywords(viral, normal),
        "viral_hashtags"       : _extract_viral_hashtags(viral, df),
        "viral_by_type"        : _analyze_viral_by_type(viral, df),
        "viral_timing"         : _analyze_timing(viral),
        "viral_length"         : _analyze_length(viral, normal),
        "viral_by_competitor"  : viral.groupby("competitor").agg(
            viral_posts   = ("is_viral", "count"),
            avg_eng_viral = ("engagement_score", "mean"),
        ).sort_values("viral_posts", ascending=False).reset_index().to_dict(orient="records"),
        "total_viral"          : len(viral),
        "viral_rate"           : round(len(viral) / len(df) * 100, 1),
        "avg_viral_engagement" : round(viral["engagement_score"].mean(), 1),
        "avg_normal_engagement": round(normal["engagement_score"].mean(), 1),
        "viral_multiplier"     : round(
            viral["engagement_score"].mean() / max(1, normal["engagement_score"].mean()), 1
        ),
    }


def _extract_viral_keywords(viral_df: pd.DataFrame, normal_df: pd.DataFrame, n: int = 20) -> list:
    viral_texts  = viral_df["processed_text"].dropna().tolist()
    normal_texts = normal_df["processed_text"].dropna().tolist()
    if not viral_texts:
        return []
    try:
        vec          = TfidfVectorizer(max_features=200, min_df=1, ngram_range=(1, 2))
        viral_matrix = vec.fit_transform(viral_texts)
        features     = vec.get_feature_names_out()
        mean_scores  = np.array(viral_matrix.mean(axis=0)).flatten()
        if normal_texts:
            normal_vec    = TfidfVectorizer(vocabulary=vec.vocabulary_)
            normal_scores = np.array(normal_vec.fit_transform(normal_texts).mean(axis=0)).flatten()
            ratio_scores  = mean_scores / (normal_scores + 0.001)
        else:
            ratio_scores = mean_scores
        top_idx  = ratio_scores.argsort()[-n:][::-1]
        return [(features[i], round(float(ratio_scores[i]), 3))
                for i in top_idx if ratio_scores[i] > 0]
    except Exception as e:
        print(f"   ⚠️ Erreur mots-clés viraux : {e}")
        return []


def _extract_viral_hashtags(viral_df: pd.DataFrame, full_df: pd.DataFrame, n: int = 15) -> list:
    viral_tags  = [t for tags in viral_df["extracted_tags"] for t in tags]
    all_tags    = [t for tags in full_df["extracted_tags"]  for t in tags]
    viral_freq  = Counter(viral_tags)
    all_freq    = Counter(all_tags)
    results = []
    for tag, count in viral_freq.most_common(50):
        total = all_freq.get(tag, count)
        results.append({
            "hashtag"     : f"#{tag}",
            "viral_count" : count,
            "total_count" : total,
            "viral_ratio" : round(count / max(1, total), 3),
        })
    results.sort(key=lambda x: x["viral_ratio"], reverse=True)
    return results[:n]


def _analyze_viral_by_type(viral_df: pd.DataFrame, full_df: pd.DataFrame) -> list:
    if "content_type" not in full_df.columns:
        return []
    result = full_df.groupby("content_type").agg(
        total   = ("is_viral", "count"),
        viral   = ("is_viral", "sum"),
        avg_eng = ("engagement_score", "mean"),
    ).reset_index()
    result["viral_rate"] = (result["viral"] / result["total"] * 100).round(1)
    return result.sort_values("viral_rate", ascending=False).to_dict(orient="records")


def _analyze_timing(viral_df: pd.DataFrame) -> dict:
    timing = {}
    if "hour" in viral_df.columns:
        hour_dist = viral_df.groupby("hour")["engagement_score"].mean()
        timing["best_hours"] = hour_dist.nlargest(3).index.tolist()
    if "day_of_week" in viral_df.columns:
        day_dist = viral_df.groupby("day_of_week")["engagement_score"].mean()
        timing["best_days"] = day_dist.nlargest(3).index.tolist()
    return timing


def _analyze_length(viral_df: pd.DataFrame, normal_df: pd.DataFrame) -> dict:
    avg_v = viral_df["text_length"].mean() if "text_length" in viral_df.columns else 0
    avg_n = normal_df["text_length"].mean() if "text_length" in normal_df.columns else 0
    return {
        "avg_viral_length"  : round(avg_v, 1),
        "avg_normal_length" : round(avg_n, 1),
        "optimal_range"     : "court (< 150 chars)" if avg_v < 150 else "moyen (150-300 chars)",
    }