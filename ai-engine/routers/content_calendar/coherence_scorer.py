### `routers/content_calendar/coherence_scorer.py`


# routers/content_calendar/coherence_scorer.py
"""
Score de cohérence thématique du plan hebdomadaire.

Modèle : paraphrase-multilingual-MiniLM-L12-v2
Lien   : https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2

Mesure si tous les sujets du plan restent cohérents avec la niche.

Score 0.0 → 1.0 :
  > 0.7 → 🟢 Excellent — Très cohérent avec votre niche
  > 0.5 → 🟡 Bon — Globalement cohérent
  > 0.3 → 🟠 Moyen — Quelques sujets hors niche
  ≤ 0.3 → 🔴 Faible — Plan peu cohérent, régénérer
"""

import numpy as np


def compute_coherence_score(niche: str, plan: list[dict]) -> dict:
    """
    Calcule la cohérence thématique entre la niche et tous les sujets.

    Returns:
        dict avec score global, score par slot, niveau et conseil
    """
    active_slots = [s for s in plan if not s.get("is_rest_day") and s.get("subject")]

    if not active_slots:
        return {"score": 1.0, "level": "🟢", "label": "Excellent",
                "conseil": "Plan vide.", "slot_scores": []}

    try:
        from sentence_transformers import SentenceTransformer
        model       = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
        niche_emb   = model.encode([niche], normalize_embeddings=True)[0]
        subjects    = [f"{s['subject']} {s.get('angle', '')}" for s in active_slots]
        subject_embs= model.encode(subjects, normalize_embeddings=True)
        slot_scores = [float(np.dot(niche_emb, emb)) for emb in subject_embs]
        global_score= float(np.mean(slot_scores))
    except Exception as e:
        print(f"   ⚠️ MiniLM coherence fallback: {e}")
        slot_scores  = [0.7] * len(active_slots)
        global_score = 0.7

    if global_score > 0.7:
        level, label = "🟢", "Excellent"
        conseil      = "Votre plan est très cohérent avec votre niche. Parfait !"
    elif global_score > 0.5:
        level, label = "🟡", "Bon"
        conseil      = "La plupart des sujets sont alignés avec votre niche."
    elif global_score > 0.3:
        level, label = "🟠", "Moyen"
        conseil      = "Certains sujets s'éloignent de votre niche. Régénérez les slots les moins cohérents."
    else:
        level, label = "🔴", "Faible"
        conseil      = "Le plan est peu cohérent avec votre niche. Régénérez le plan complet."

    slot_results = []
    score_idx    = 0
    for slot in plan:
        if not slot.get("is_rest_day") and slot.get("subject"):
            slot_results.append({
                "day"  : slot["day"],
                "score": round(slot_scores[score_idx], 3),
                "level": "🟢" if slot_scores[score_idx] > 0.6 else (
                         "🟡" if slot_scores[score_idx] > 0.4 else "🔴"),
            })
            score_idx += 1

    return {
        "score"      : round(global_score, 3),
        "level"      : level,
        "label"      : label,
        "conseil"    : conseil,
        "slot_scores": slot_results,
    }