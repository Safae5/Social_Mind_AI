### `routers/content_strategist/text_preprocessor.py`


# routers/content_strategist/text_preprocessor.py
"""
Prétraitement NLP des textes de publications sociales.

Pipeline de nettoyage :
  1. Suppression URLs, mentions (@), emojis non-textuels
  2. Extraction et conservation des hashtags (séparément)
  3. Tokenisation NLTK
  4. Suppression des stopwords (FR + EN + réseaux sociaux)
  5. Lemmatisation spaCy (running→run, publient→publier)

Importance du prétraitement pour BERTopic et LDA :
  Sans lemmatisation : "publient", "publier", "publié" = mots différents
  Avec lemmatisation : "publier" = "publier" = "publier" → même cluster !
"""

import re
import string
import nltk
from nltk.corpus   import stopwords
from nltk.tokenize import word_tokenize
import warnings
warnings.filterwarnings("ignore")


# Charger spaCy (lazy loading)
_nlp = None
def get_nlp():
    global _nlp
    if _nlp is None:
        try:
            import spacy
            _nlp = spacy.load("fr_core_news_md")
            print("✅ spaCy fr_core_news_md chargé")
        except OSError:
            print("⚠️ spaCy non disponible — lemmatisation désactivée")
    return _nlp


# Stopwords multilingues + réseaux sociaux
STOP_FR     = set(stopwords.words("french"))
STOP_EN     = set(stopwords.words("english"))
STOP_SOCIAL = {
    "post", "story", "reel", "feed", "like", "follow", "share",
    "comment", "photo", "video", "compte", "page", "profil",
    "bonjour", "merci", "voici", "voilà",
    "insta", "instagram", "tiktok", "facebook", "linkedin", "twitter",
    "pourtoi", "fyp", "foryou", "viral", "trending", "dm", "bio",
    "swipe", "link", "lien",
}
ALL_STOPS = STOP_FR | STOP_EN | STOP_SOCIAL


def clean_text(text: str) -> str:
    """Nettoie un texte brut de post de réseau social."""
    text = str(text).lower()
    text = re.sub(r"http\S+|www\S+",  "",    text)   # URLs
    text = re.sub(r"@\w+",            "",    text)   # Mentions
    text = re.sub(r"#(\w+)",          r"\1", text)   # #hashtag → hashtag
    text = re.sub(r"[^\w\s'-]",       " ",   text)   # Ponctuation
    text = re.sub(r"\s+",             " ",   text)   # Espaces multiples
    return text.strip()


def extract_hashtags(text: str) -> list[str]:
    """Extrait tous les hashtags d'un texte."""
    tags = re.findall(r"#(\w+)", str(text).lower())
    return [t for t in tags if len(t) > 2 and not t.isdigit()]


def tokenize_and_filter(text: str) -> list[str]:
    """Tokenise et filtre les stopwords."""
    tokens = word_tokenize(clean_text(text), language="french")
    return [
        t for t in tokens
        if len(t) > 2
        and t not in ALL_STOPS
        and not t.isdigit()
        and not all(c in string.punctuation for c in t)
    ]


def lemmatize_text(text: str) -> str:
    """Lemmatise le texte avec spaCy si disponible."""
    nlp = get_nlp()
    if nlp is None:
        return " ".join(tokenize_and_filter(text))

    doc = nlp(clean_text(text)[:10000])
    lemmas = [
        token.lemma_.lower()
        for token in doc
        if not token.is_stop
        and not token.is_punct
        and not token.is_space
        and len(token.lemma_) > 2
        and token.lemma_.lower() not in ALL_STOPS
    ]
    return " ".join(lemmas)


def preprocess_corpus(corpus: list[dict]) -> tuple[list[str], list[list[str]]]:
    """
    Prétraite le corpus de publications concurrentes.

    Args:
        corpus : liste de dicts {text, hashtags, platform, ...}

    Returns:
        processed_texts : liste de textes lemmatisés (pour BERTopic)
        tokenized_texts  : liste de listes de tokens (pour LDA)
    """
    print(f"🔄 Prétraitement NLP de {len(corpus)} publications...")

    processed_texts = []
    tokenized_texts  = []

    for item in corpus:
        text = str(item.get("text", ""))

        # Inclure les hashtags dans le corpus pour enrichir l'analyse
        hashtags_str = " ".join(item.get("hashtags", []))
        full_text    = f"{text} {hashtags_str}"

        processed  = lemmatize_text(full_text)
        tokens     = processed.split()

        # Garder seulement les textes avec au moins 3 tokens utiles
        if len(tokens) >= 3:
            processed_texts.append(processed)
            tokenized_texts.append(tokens)
        else:
            processed_texts.append("")
            tokenized_texts.append([])

    valid = sum(1 for t in processed_texts if t.strip())
    print(f"   ✅ Prétraitement terminé : {valid}/{len(corpus)} textes valides")
    return processed_texts, tokenized_texts


def generate_sample_corpus(niche: str, n_samples: int = 60) -> list[dict]:
    """
    Génère un corpus simulé si Meta API et scraping sont indisponibles.
    Utile pour les tests sans tokens.
    """
    import random
    np_seed = 42
    random.seed(np_seed)

    templates = {
        "mode"     : ["Nouvelle collection disponible #mode #fashion #tendance",
                      "Style du jour : comment créer un look parfait #outfit #style",
                      "Nos meilleures pièces pour l'été #collection #été"],
        "fitness"  : ["Programme d'entraînement complet pour débutants #fitness #sport",
                      "Nutrition : les meilleurs aliments avant l'effort #nutrition #sante",
                      "5 exercices pour renforcer le core #musculation #entrainement"],
        "business" : ["Comment augmenter votre chiffre d'affaires #business #marketing",
                      "Les erreurs à éviter en entrepreneuriat #entrepreneur #startup",
                      "Stratégie digitale : les tendances 2024 #digital #smma"],
        "default"  : ["Découvrez notre nouvelle offre #contenu #marketing",
                      "Comment atteindre vos objectifs #motivation #success",
                      "Rejoignez notre communauté #community #business"],
    }

    niche_key = "default"
    for key in templates:
        if key in niche.lower():
            niche_key = key
            break

    base = templates[niche_key]
    corpus = []
    for _ in range(n_samples):
        text = random.choice(base)
        tags = extract_hashtags(text)
        corpus.append({"text": text, "hashtags": tags, "platform": "simulated"})

    return corpus