### `routers/content_creator/platform_specs.py`


# routers/content_creator/platform_specs.py
"""
Spécifications techniques de chaque plateforme sociale.

Chaque plateforme a ses propres règles éditoriales :
  - Longueur optimale de la légende
  - Nombre de hashtags recommandés
  - Fréquence et style des emojis
  - Exemples de CTA qui performent
  - Style visuel recommandé pour SDXL-Turbo
"""

PLATFORM_SPECS = {
    "instagram": {
        "max_chars"             : 2200,
        "optimal_chars"         : "138-150 pour feed, 300 pour Reels",
        "recommended_hashtags"  : 12,
        "emoji_usage"           : "Fréquent — 3 à 6 emojis stratégiques",
        "tone_keywords"         : "inspirant, aspirationnel, authentique, visuel",
        "cta_examples"          : [
            "🔗 Lien en bio !",
            "💾 Save pour plus tard",
            "👇 Tag un ami qui a besoin de voir ça",
            "❤️ Double-tap si tu es d'accord",
            "💬 Dis-nous en commentaire",
        ],
        "hashtag_strategy"      : "Mix populaires (#love) + niche + marque",
        "format_notes"          : "Hook fort dans les 125 premiers caractères",
        "platform_emoji"        : "📸",
        "image_style"           : "vibrant lifestyle photography, instagram aesthetic, shallow depth of field, high contrast",
        "aspect_ratio"          : "1:1 (1024×1024) ou 9:16 pour Reels",
    },
    "tiktok": {
        "max_chars"             : 2200,
        "optimal_chars"         : "< 150 caractères — ultra court",
        "recommended_hashtags"  : 5,
        "emoji_usage"           : "Oui — casual, fun, Gen-Z",
        "tone_keywords"         : "direct, casual, fun, viral, relatable, Gen-Z",
        "cta_examples"          : [
            "⬆️ Suis pour plus de contenu",
            "💬 Commente 🔥 si tu veux la suite",
            "🔁 Partage à ton meilleur ami",
            "👆 Part 2 en commentaire si tu veux",
        ],
        "hashtag_strategy"      : "#fyp #pourtoi + 2-3 hashtags niche très ciblés",
        "format_notes"          : "#fyp #pourtoi quasi-obligatoires. Hook = première phrase = tout.",
        "platform_emoji"        : "🎵",
        "image_style"           : "trendy gen-z aesthetic, bold colors, dynamic composition, youth culture",
        "aspect_ratio"          : "9:16 vertical (pour couverture TikTok)",
    },
    "facebook": {
        "max_chars"             : 63206,
        "optimal_chars"         : "40-80 mots (posts courts = +2x de portée)",
        "recommended_hashtags"  : 2,
        "emoji_usage"           : "Modéré — 1 à 3 emojis",
        "tone_keywords"         : "communautaire, conversationnel, accessible, partage",
        "cta_examples"          : [
            "Partagez si vous êtes d'accord 👇",
            "Qu'en pensez-vous ? Dites-nous en commentaire",
            "Taguez quelqu'un qui devrait voir ça",
            "Réagissez avec ❤️ si cela vous parle",
        ],
        "hashtag_strategy"      : "2-3 hashtags pertinents seulement",
        "format_notes"          : "Facebook coupe après 3-4 lignes. Mettre l'essentiel en premier.",
        "platform_emoji"        : "👥",
        "image_style"           : "warm community photography, authentic, relatable, friendly atmosphere",
        "aspect_ratio"          : "1:1 ou 16:9",
    },
    "linkedin": {
        "max_chars"             : 3000,
        "optimal_chars"         : "150 à 300 mots — structuré avec espaces",
        "recommended_hashtags"  : 3,
        "emoji_usage"           : "Limité — 0 à 3 emojis maximum",
        "tone_keywords"         : "professionnel, expert, insight, valeur, leadership, storytelling",
        "cta_examples"          : [
            "Qu'en pensez-vous ? Je lis tous les commentaires.",
            "Partagez si cela peut aider votre réseau.",
            "Quelle est votre expérience sur ce sujet ?",
            "Suivez pour plus d'insights chaque semaine.",
        ],
        "hashtag_strategy"      : "3 hashtags professionnels ciblés (#Marketing #Innovation)",
        "format_notes"          : "Accroche (1 ligne) → Développement → Conclusion + CTA. Sauts de ligne.",
        "platform_emoji"        : "💼",
        "image_style"           : "professional corporate photography, clean minimal, business context, neutral tones",
        "aspect_ratio"          : "1:1 ou 1.91:1",
    },
    "twitter": {
        "max_chars"             : 280,
        "optimal_chars"         : "200-250 caractères",
        "recommended_hashtags"  : 1,
        "emoji_usage"           : "Optionnel — 1 emoji max",
        "tone_keywords"         : "direct, percutant, opinion, débat, concis",
        "cta_examples"          : [
            "RT si vous pensez la même chose.",
            "Répondez avec votre avis ci-dessous.",
            "Thread 🧵 si vous voulez les détails.",
        ],
        "hashtag_strategy"      : "1-2 hashtags tendance uniquement si pertinents",
        "format_notes"          : "280 caractères max. Opinion claire. Pas d'hésitation.",
        "platform_emoji"        : "🐦",
        "image_style"           : "clean bold graphic, high contrast, news-worthy composition, impactful",
        "aspect_ratio"          : "16:9 ou 1:1",
    },
}

TONE_DESCRIPTIONS = {
    "professionnel"  : "Sérieux, expert, crédible — vocabulaire soigné, pas d'argot",
    "decontracte"    : "Amical, détendu, accessible — comme une conversation",
    "inspirant"      : "Motivant, émotionnel, aspirationnel — stories et citations",
    "educatif"       : "Pédagogique, informatif, structuré — tips et astuces",
    "humoristique"   : "Léger, drôle, relatable — jeux de mots, autodérision",
    "premium"        : "Élégant, exclusif, luxe — vocabulaire haut de gamme",
    "urgent"         : "Dynamique, FOMO, time-sensitive — offres limitées",
    "communautaire"  : "Chaleureux, inclusif, bienveillant — nous + vous",
}


def get_platform_specs(platform: str) -> dict:
    return PLATFORM_SPECS.get(platform, PLATFORM_SPECS["instagram"])


def get_tone_description(tone: str) -> str:
    return TONE_DESCRIPTIONS.get(tone, tone)