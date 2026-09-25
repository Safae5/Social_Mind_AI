### `routers/auto_reply/brand_voice.py`


# routers/auto_reply/brand_voice.py
"""
Analyse de la voix de marque pour personnaliser les réponses.

L'utilisateur fournit 3 exemples de réponses qu'il a déjà écrites.
Analyse : ton, longueur, emojis, interpellation directe.

Similarité : paraphrase-multilingual-MiniLM-L12-v2
Lien : https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
"""

import re


def analyze_brand_voice(examples: list[str]) -> dict:
    """
    Analyse les exemples de réponses pour construire le profil de voix de marque.
    """
    valid = [e.strip() for e in examples if e.strip()]

    if not valid:
        return {
            "n_examples": 0, "dominant_tone": "chaleureux",
            "avg_length": 80, "uses_emojis": True,
            "uses_first_name": False, "prompt_injection": "",
        }

    avg_length = int(sum(len(e) for e in valid) / len(valid))

    emoji_pattern = re.compile("[\U0001F300-\U0001F9FF]", flags=re.UNICODE)
    all_emojis    = [e for ex in valid for e in emoji_pattern.findall(ex)]
    uses_emojis   = len(all_emojis) / max(1, len(valid)) > 0.5

    uses_first_name = any(
        re.search(r"@\w+|bonjour|salut|merci.*\w+", ex, re.IGNORECASE)
        for ex in valid
    )

    all_text   = " ".join(valid).lower()
    tone_scores = {
        "chaleureux"    : sum(1 for w in ["merci","super","génial","content","ravi","plaisir"] if w in all_text),
        "professionnel" : sum(1 for w in ["veuillez","cordialement","n'hésitez pas","nous"] if w in all_text),
        "decontracte"   : sum(1 for w in ["!","cool","top","waouh","sympa"] if w in all_text),
        "empathique"    : sum(1 for w in ["comprends","désolé","navré","entends"] if w in all_text),
    }
    dominant_tone = max(tone_scores, key=tone_scores.get)

    lines = [
        f"TON DE MARQUE : {dominant_tone}",
        f"Longueur cible : ~{avg_length} caractères",
        f"Emojis : {'Oui' if uses_emojis else 'Non'}",
        f"Interpellation : {'Oui (utiliser le prénom)' if uses_first_name else 'Non'}",
        "\nEXEMPLES DE RÉPONSES DE LA MARQUE :",
    ]
    for i, ex in enumerate(valid[:2], 1):
        lines.append(f"Exemple {i} : \"{ex[:100]}{'...' if len(ex) > 100 else ''}\"")

    return {
        "n_examples"      : len(valid),
        "dominant_tone"   : dominant_tone,
        "avg_length"      : avg_length,
        "uses_emojis"     : uses_emojis,
        "uses_first_name" : uses_first_name,
        "prompt_injection": "\n".join(lines),
    }


def compute_brand_voice_score(response: str, examples: list[str]) -> float:
    """Calcule la similarité sémantique réponse vs exemples de marque."""
    if not examples or not response:
        return 1.0
    try:
        from sentence_transformers import SentenceTransformer   # type: ignore
        import numpy as np  # type: ignore
        model      = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
        ref_embs   = model.encode(examples, normalize_embeddings=True)
        resp_emb   = model.encode([response], normalize_embeddings=True)
        ref_center = ref_embs.mean(axis=0)
        score      = float(np.dot(resp_emb[0], ref_center))
        return round(max(0.0, score), 3)
    except Exception:
        return 0.75