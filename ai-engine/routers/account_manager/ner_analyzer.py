### `routers/account_manager/ner_analyzer.py`


# routers/account_manager/ner_analyzer.py
"""
Extraction d'entités nommées avec spaCy.

Modèle : fr_core_news_md
Lien   : https://spacy.io/models/fr
Installation : python -m spacy download fr_core_news_md

Entités détectées dans la transcription de réunion :
  ORG  → marques, entreprises, agences (ex: "Zara", "Nike", "Meta")
  PER  → personnes citées (ex: "Mohamed", "Sarah")
  LOC  → lieux (ex: "Casablanca", "Rabat", "France")
  MISC → événements, produits, autres (ex: "Ramadan", "Eid")

Utilité pour l'agent Chef de Compte :
  - Identifier les concurrents cités par leur nom exact
  - Détecter les marchés géographiques mentionnés
  - Repérer les personnes influentes citées
  - Extraire les événements saisonniers pour le plan 30 jours
"""

import spacy # type: ignore

# Singleton spaCy
_nlp = None


def load_spacy_model():
    """Charge le modèle spaCy fr_core_news_md (singleton)."""
    global _nlp
    if _nlp is None:
        try:
            print("⏳ Chargement spaCy fr_core_news_md...")
            _nlp = spacy.load("fr_core_news_md")
            print("   ✅ spaCy chargé !")
        except OSError:
            print("   ⚠️ fr_core_news_md non installé. Lance : python -m spacy download fr_core_news_md")
            _nlp = None
    return _nlp


def extract_entities(text: str) -> dict:
    """
    Extrait les entités nommées de la transcription.

    Args:
        text : texte de la transcription

    Returns:
        dict avec listes d'entités par type
    """
    nlp = load_spacy_model()

    if not nlp:
        return {"ORG": [], "PER": [], "LOC": [], "MISC": [], "all": []}

    print("🏷️ Extraction entités nommées avec spaCy...")

    # Traiter par chunks si texte trop long (limite spaCy)
    max_chars = 100_000
    if len(text) > max_chars:
        text = text[:max_chars]

    doc = nlp(text)

    entities = {"ORG": [], "PER": [], "LOC": [], "MISC": []}
    all_entities = []

    for ent in doc.ents:
        label = ent.label_
        clean_text = ent.text.strip()

        # Filtrer les entités trop courtes ou numériques
        if len(clean_text) < 2 or clean_text.isdigit():
            continue

        # Normaliser le label
        if label in entities:
            if clean_text not in entities[label]:
                entities[label].append(clean_text)

        all_entities.append({
            "text" : clean_text,
            "label": label,
            "start": ent.start_char,
            "end"  : ent.end_char,
        })

    print(f"   ✅ {len(all_entities)} entités trouvées")
    return {**entities, "all": all_entities}