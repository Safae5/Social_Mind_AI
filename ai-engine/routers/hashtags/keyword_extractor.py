## `routers/hashtags/keyword_extractor.py`


# routers/hashtags/keyword_extractor.py
"""
Extraction mots-clés avec KeyBERT + spaCy NER.

Modèle HuggingFace utilisé :
  paraphrase-multilingual-MiniLM-L12-v2
  Lien : https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
  Supporte : Français + Anglais + Arabe (multilingue)

Pipeline :
  1. Nettoyage texte (regex)
  2. Extraction KeyBERT (embeddings sémantiques)
  3. Extraction entités spaCy (ORG, LOC, MISC)
  4. Fusion et déduplication
"""

import re

STOPWORDS_FR = {
    "le","la","les","de","du","des","un","une","et","en","à","au",
    "je","tu","il","nous","vous","ils","que","qui","quoi","dont",
    "est","sont","être","avec","pour","sur","dans","par","plus",
    "très","aussi","mais","ou","si","car","donc","cette","ces",
    "mon","ton","son","notre","votre","leur","ma","ta","sa",
}
STOPWORDS_EN = {
    "the","a","an","and","or","but","in","on","at","to","for",
    "of","with","by","from","is","are","was","were","be","been",
    "have","has","had","do","does","did","will","would","could",
    "should","may","might","can","this","that","these","those",
    "i","you","he","she","we","they","it","my","your","his","her",
}
ALL_STOPS = STOPWORDS_FR | STOPWORDS_EN


def clean_subject(text: str) -> str:
    """Nettoie et normalise le texte du sujet."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s\-']", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text


def extract_keywords_simple(subject: str, top_n: int = 10) -> list[str]:
    """
    Extraction simple par filtrage stopwords + bigrammes.
    Fallback si KeyBERT non disponible.
    """
    cleaned  = clean_subject(subject)
    tokens   = cleaned.split()
    keywords = [
        t for t in tokens
        if t not in ALL_STOPS and len(t) > 2 and not t.isdigit()
    ]
    bigrams = []
    for i in range(len(tokens) - 1):
        if tokens[i] not in ALL_STOPS and tokens[i+1] not in ALL_STOPS:
            bigram = f"{tokens[i]} {tokens[i+1]}"
            if len(bigram) > 5:
                bigrams.append(bigram)
    all_kw = list(dict.fromkeys(bigrams + keywords))
    return all_kw[:top_n]


def extract_keywords_keybert(subject: str, top_n: int = 10) -> list[str]:
    """
    Extraction KeyBERT avec paraphrase-multilingual-MiniLM-L12-v2.

    KeyBERT calcule la similarité cosinus entre l'embedding du texte
    entier et les embeddings de chaque candidat mot-clé.
    Retourne les mots-clés sémantiquement les plus proches du sujet.

    diversity=0.5 : évite les redondances (ex: "mode" et "modes")
    """
    try:
        from keybert import KeyBERT
        from sentence_transformers import SentenceTransformer

        model    = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
        kw_model = KeyBERT(model=model)

        keywords = kw_model.extract_keywords(
            subject,
            keyphrase_ngram_range = (1, 2),
            stop_words            = list(ALL_STOPS),
            top_n                 = top_n,
            diversity             = 0.5,
        )
        return [kw for kw, score in keywords if score > 0.2]

    except Exception as e:
        print(f"   ⚠️ KeyBERT fallback : {e}")
        return extract_keywords_simple(subject, top_n)


def extract_entities_spacy(subject: str) -> dict:
    """
    Extraction entités nommées avec spaCy fr_core_news_md.
    Détecte : ORG (marques), LOC (lieux), MISC (divers).
    """
    try:
        import spacy
        nlp = spacy.load("fr_core_news_md")
        doc = nlp(subject[:5000])
        entities = {"ORG": [], "PER": [], "LOC": [], "MISC": []}
        for ent in doc.ents:
            if ent.label_ in entities:
                entities[ent.label_].append(ent.text.lower())
        return {k: list(set(v)) for k, v in entities.items()}
    except Exception:
        return {"ORG": [], "PER": [], "LOC": [], "MISC": []}


def prepare_keyword_context(subject: str) -> dict:
    """
    Pipeline complet : KeyBERT + spaCy → contexte enrichi pour Mistral.
    """
    print(f"🔑 Extraction mots-clés pour : '{subject}'")

    keywords = extract_keywords_keybert(subject, top_n=12)
    entities = extract_entities_spacy(subject)

    all_relevant = list(dict.fromkeys(
        keywords +
        entities["ORG"] +
        entities["LOC"] +
        entities["MISC"]
    ))[:15]

    print(f"   ✅ {len(keywords)} mots-clés, {sum(len(v) for v in entities.values())} entités")

    return {
        "keywords"      : keywords,
        "entities"      : entities,
        "all_relevant"  : all_relevant,
        "keyword_string": ", ".join(all_relevant[:10]),
    }