### `routers/content_calendar/hashtag_builder.py`


# routers/content_calendar/hashtag_builder.py
"""
Génération des hashtags par slot via KeyBERT + MiniLM.

Modèle : paraphrase-multilingual-MiniLM-L12-v2 via KeyBERT
Lien   : https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2

Stratégie 3 niveaux :
  - Haut volume  : hashtags larges (mode, voyage, food)
  - Niche        : hashtags spécifiques à la niche
  - Longue traîne: hashtags très précis (#modemarocaine2025)

Limites par plateforme :
  Instagram : 30 hashtags
  TikTok    : 5 hashtags
  Facebook  : 3 hashtags
  LinkedIn  : 5 hashtags
  Twitter   : 2 hashtags
"""

import re
from typing import Optional

PLATFORM_HASHTAG_LIMITS = {
    "instagram": 30, "tiktok": 5, "facebook": 3, "linkedin": 5, "twitter": 2,
}

STOPWORDS = {
    "le","la","les","de","du","des","un","une","et","en","à","au",
    "je","tu","il","nous","vous","ils","que","qui","quoi","est","sont",
    "the","a","an","and","or","in","on","at","to","for","of","with",
}


def extract_keywords_keybert(text: str, top_n: int = 8) -> list[str]:
    """
    Extrait les mots-clés via KeyBERT + paraphrase-multilingual-MiniLM-L12-v2.
    Fallback vers extraction simple si KeyBERT non disponible.
    """
    try:
        from keybert import KeyBERT
        from sentence_transformers import SentenceTransformer
        model    = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
        kw_model = KeyBERT(model=model)
        keywords = kw_model.extract_keywords(
            text, keyphrase_ngram_range=(1, 2),
            stop_words=list(STOPWORDS), top_n=top_n, diversity=0.5,
        )
        return [kw for kw, score in keywords if score > 0.2]
    except Exception as e:
        print(f"   ⚠️ KeyBERT fallback: {e}")
        words = re.sub(r"[^\w\s]", " ", text.lower()).split()
        return [w for w in words if w not in STOPWORDS and len(w) > 3][:top_n]


def build_hashtags_for_slot(subject: str, hashtag_themes: list[str],
                              platform: str, niche: str,
                              post_type: Optional[str] = None) -> list[str]:
    """
    Construit la liste de hashtags optimale pour un slot.

    Combine :
      1. Mots-clés extraits du sujet (KeyBERT)
      2. Thèmes fournis par Mistral
      3. Hashtag niche de base
      4. Hashtag plateforme spécifique (#fyp, #reels)

    Returns:
        Liste de hashtags (avec #) dans la limite de la plateforme
    """
    limit    = PLATFORM_HASHTAG_LIMITS.get(platform, 10)
    raw_kw   = extract_keywords_keybert(
        f"{subject} {' '.join(hashtag_themes)} {niche}", top_n=10
    )

    all_tags = set()
    for kw in raw_kw:
        tag = re.sub(r"\s+", "", kw.lower())
        tag = re.sub(r"[^\w]", "", tag)
        if len(tag) > 2:
            all_tags.add(f"#{tag}")

    for theme in hashtag_themes:
        tag = re.sub(r"\s+", "", theme.lower())
        tag = re.sub(r"[^\w]", "", tag)
        if len(tag) > 2:
            all_tags.add(f"#{tag}")

    niche_tag = re.sub(r"\s+", "", niche.split()[0].lower())
    all_tags.add(f"#{niche_tag}")

    if platform == "tiktok":
        all_tags.update({"#fyp", "#pourtoi"})
    elif platform == "instagram" and post_type == "reel":
        all_tags.add("#reels")

    return sorted(all_tags)[:limit]