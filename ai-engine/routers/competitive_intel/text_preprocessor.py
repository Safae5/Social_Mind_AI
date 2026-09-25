### `routers/competitive_intel/text_preprocessor.py`


# routers/competitive_intel/text_preprocessor.py
"""
Prétraitement NLP des légendes avec NLTK.

Pipeline de nettoyage :
  1. Suppression URLs, mentions (@)
  2. Extraction et conservation des hashtags (séparément)
  3. Tokenisation NLTK
  4. Suppression des stopwords (FR + EN + réseaux sociaux)
  5. Lemmatisation (regrouper les formes d'un même mot)
  6. Filtrage des tokens courts et chiffres

Importance pour le clustering :
  Sans lemmatisation : "Découvrez collection" ≠ "découvrir collections"
  Avec lemmatisation : "decouvrir collection" = "decouvrir collection" → même cluster !
"""

import re
import string
import nltk
from nltk.corpus   import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem     import WordNetLemmatizer
import pandas as pd
import warnings
warnings.filterwarnings("ignore")

# Télécharger les ressources si nécessaires
for resource in ["punkt", "stopwords", "wordnet", "punkt_tab"]:
    try:
        if "punkt" in resource:
            nltk.data.find(f"tokenizers/{resource}")
        else:
            nltk.data.find(f"corpora/{resource}")
    except LookupError:
        nltk.download(resource, quiet=True)

lemmatizer = WordNetLemmatizer()

# Stopwords multilingues + réseaux sociaux
STOP_FR    = set(stopwords.words("french"))
STOP_EN    = set(stopwords.words("english"))
STOP_SOCIAL = {
    "rt","via","lol","omg","tbh","imo","fyi","dm","dms","bio","link",
    "swipe","up","post","story","reel","feed","insta","tiktok","twitter",
    "facebook","linkedin","instagram","youtube","like","follow","share",
    "comment","tag","bonjour","merci","voici","voilà","pourtoi","fyp",
    "foryou","viral","trending","collection","nouveau","nouvelle","nos"
}
ALL_STOPS = STOP_FR | STOP_EN | STOP_SOCIAL


def clean_text(text: str) -> str:
    """Nettoie le texte brut d'un post réseau social."""
    text = str(text).lower()
    text = re.sub(r"http\S+|www\S+", "", text)       # URLs
    text = re.sub(r"@\w+", "", text)                  # Mentions
    text = re.sub(r"#(\w+)", r"\1", text)             # #hashtag → hashtag
    text = re.sub(r"[^\w\s'-]", " ", text)            # Ponctuation
    text = re.sub(r"\s+", " ", text).strip()
    return text


def extract_hashtags(text: str) -> list[str]:
    """Extrait tous les hashtags d'un texte."""
    tags = re.findall(r"#(\w+)", str(text).lower())
    return [t for t in tags if len(t) > 2 and not t.isdigit()]


def preprocess_single(text: str) -> str:
    """Pipeline complet sur un texte : nettoyer → tokeniser → lemmatiser."""
    try:
        tokens = word_tokenize(clean_text(text), language="french")
    except Exception:
        tokens = clean_text(text).split()
    filtered = [
        t for t in tokens
        if len(t) > 2
        and t not in ALL_STOPS
        and not t.isdigit()
        and not all(c in string.punctuation for c in t)
    ]
    lemmas = [lemmatizer.lemmatize(t) for t in filtered]
    return " ".join(lemmas)


def preprocess_corpus(df: pd.DataFrame, text_col: str = "caption") -> pd.DataFrame:
    """
    Prétraite tout le corpus de légendes.

    Ajoute des colonnes :
      - processed_text  : texte nettoyé + lemmatisé
      - tokens          : liste de tokens
      - extracted_tags  : hashtags extraits
      - text_length     : longueur du texte original
      - token_count     : nombre de tokens utiles
    """
    print(f"🔄 Prétraitement NLP de {len(df)} légendes...")
    df["extracted_tags"]  = df[text_col].apply(extract_hashtags)
    df["processed_text"]  = df[text_col].apply(preprocess_single)
    df["tokens"]          = df[text_col].apply(
        lambda x: [t for t in word_tokenize(clean_text(x)) if len(t) > 2 and t not in ALL_STOPS]
        if x else []
    )
    df["text_length"] = df[text_col].apply(lambda x: len(str(x)))
    df["token_count"] = df["tokens"].apply(len)

    valid = (df["token_count"] > 0).sum()
    print(f"   ✅ {valid}/{len(df)} légendes avec contenu textuel utile")
    return df