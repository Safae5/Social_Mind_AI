### `routers/hashtags/volume_scorer.py`


# routers/hashtags/volume_scorer.py
"""
Scoring et catégorisation des hashtags par volume estimé.

Sans accès temps réel aux APIs Instagram/TikTok, on utilise
un système de scoring heuristique basé sur :
  - Longueur du hashtag (court = populaire)
  - Correspondance avec des indicateurs de haut volume
  - Présence de mots spécifiques (= niche)
  - Nombre de mots composés

Catégories :
  🔥 Haut volume  : score >= 65 → >500K posts estimés
  ⚡ Moyen volume : score 35-64 → 50K-500K posts estimés
  🎯 Niche        : score < 35  → <50K posts estimés

Stratégie optimale : 20% haut + 40% moyen + 40% niche
"""

import re

HIGH_VOLUME_INDICATORS = {
    "love","instagood","photooftheday","fashion","beautiful","happy","cute",
    "mode","beaute","voyage","food","style","photo","nature","art","sport",
    "fitness","sante","maroc","algerie","tunisie","business","marketing",
    "entrepreneur","motivation","success","fyp","pourtoi","foryou","viral",
    "trending","reels","morocco","luxe","lifestyle","travel","beauty",
    "moda","musique","cuisine","makeup","skincare","workout","mindset",
}

SPECIFICITY_WORDS = {
    "maroc","moroccan","casablanca","rabat","fes","marrakech","algerie",
    "tunisie","alger","tunis","handmade","artisanal","local","authentique",
    "traditionnel","vegan","bio","organic","naturel","durable","debutant",
    "avance","professionnel","expert","premium","exclusive","haut de gamme",
}


def estimate_volume_score(hashtag: str) -> dict:
    """
    Estime le score de volume d'un hashtag (0-100).

    Returns:
        dict avec score, category, emoji, label, description, estimated
    """
    tag_clean = hashtag.lstrip("#").lower().strip()
    score     = 50

    # Tags courts → plus universels
    if len(tag_clean) <= 5:    score += 30
    elif len(tag_clean) <= 8:  score += 15
    elif len(tag_clean) <= 12: score += 5

    # Indicateurs haut volume
    for indicator in HIGH_VOLUME_INDICATORS:
        if indicator in tag_clean:
            score += 25
            break

    # Tags longs → plus spécifiques
    if len(tag_clean) > 20:    score -= 30
    elif len(tag_clean) > 15:  score -= 15

    # Mots spécifiques → niche
    for word in SPECIFICITY_WORDS:
        if word in tag_clean:
            score -= 20
            break

    # Chiffres → légèrement plus niche (ex: #mode2024)
    if any(c.isdigit() for c in tag_clean):
        score -= 10

    # Composé de plusieurs mots → plus niche
    word_count = len(re.findall(r'[A-Z][a-z]+|[a-z]+', tag_clean))
    if word_count > 3:   score -= 15
    elif word_count > 2: score -= 5

    score = max(0, min(100, score))

    if score >= 65:
        return {
            "hashtag": f"#{tag_clean}", "tag_clean": tag_clean, "score": score,
            "category": "high", "emoji": "🔥", "label": "Haut volume",
            "description": "Large audience · Forte concurrence", "estimated": ">500K posts",
        }
    elif score >= 35:
        return {
            "hashtag": f"#{tag_clean}", "tag_clean": tag_clean, "score": score,
            "category": "medium", "emoji": "⚡", "label": "Moyen volume",
            "description": "Audience ciblée · Bon équilibre", "estimated": "50K–500K posts",
        }
    else:
        return {
            "hashtag": f"#{tag_clean}", "tag_clean": tag_clean, "score": score,
            "category": "niche", "emoji": "🎯", "label": "Niche",
            "description": "Très ciblé · Fort engagement", "estimated": "<50K posts",
        }


def categorize_hashtags(hashtags: list[str]) -> dict:
    """Catégorise une liste de hashtags en 3 groupes."""
    scored = [estimate_volume_score(tag) for tag in hashtags]
    scored.sort(key=lambda x: x["score"], reverse=True)
    result = {
        "high"  : [h for h in scored if h["category"] == "high"],
        "medium": [h for h in scored if h["category"] == "medium"],
        "niche" : [h for h in scored if h["category"] == "niche"],
        "all"   : scored,
    }
    print(f"   📊 {len(result['high'])} haut · {len(result['medium'])} moyen · {len(result['niche'])} niche")
    return result


def build_optimal_set(categorized: dict, target: int = 20) -> list[str]:
    """
    Construit l'ensemble optimal selon la stratégie 20/40/40.

    20% haut volume  → portée maximale
    40% moyen volume → engagement équilibré
    40% niche        → ciblage précis
    """
    n_high   = max(1, int(target * 0.20))
    n_medium = max(1, int(target * 0.40))
    n_niche  = target - n_high - n_medium
    return (
        [h["hashtag"] for h in categorized["high"][:n_high]]   +
        [h["hashtag"] for h in categorized["medium"][:n_medium]] +
        [h["hashtag"] for h in categorized["niche"][:n_niche]]
    )


def get_strategy_advice(categorized: dict, platform: str) -> str:
    """Conseil de stratégie hashtag adapté à la plateforme."""
    total = len(categorized["all"])
    h = len(categorized["high"])
    m = len(categorized["medium"])
    n = len(categorized["niche"])
    advice = {
        "instagram": f"📸 **Instagram** : Utilisez les {total} hashtags générés. Mix {h} haut + {m} moyen + {n} niche. Limite : 30 hashtags max.",
        "tiktok"   : f"🎵 **TikTok** : 3-5 hashtags seulement. #fyp + #pourtoi + 1-2 hashtags niche ciblés. L'algorithme valorise la pertinence.",
        "linkedin" : f"💼 **LinkedIn** : 3-5 hashtags professionnels. Préférez les {n} hashtags niche qui ciblent votre secteur.",
        "facebook" : f"👥 **Facebook** : 2-3 hashtags maximum. 1 haut volume + 1-2 niche pour les groupes thématiques.",
        "twitter"  : f"🐦 **Twitter/X** : 1-2 hashtags trending uniquement. Plus de 2 réduit l'engagement.",
    }
    return advice.get(platform.lower(), advice["instagram"])