### 2.3 — `brand_voice.py`


# ai_engine/routers/content_generator/brand_voice.py
import re
from collections import Counter


def analyze_brand_voice(examples: list[str]) -> dict:
    """
    Analyse les exemples de publications pour extraire le profil
    de voix de marque à injecter dans le prompt Mistral.
    """
    valid = [e.strip() for e in examples if e.strip()]

    if not valid:
        return {
            "n_examples"      : 0,
            "dominant_tone"   : "decontracte",
            "avg_words"       : 30,
            "uses_emojis"     : True,
            "prompt_injection": "",
        }

    # Longueur moyenne
    avg_words = int(sum(len(e.split()) for e in valid) / len(valid))

    # Emojis
    emoji_re   = re.compile("[\U0001F300-\U0001F9FF]", flags=re.UNICODE)
    all_emojis = [e for ex in valid for e in emoji_re.findall(ex)]
    uses_emojis = len(all_emojis) / max(1, len(valid)) > 0.5

    # Hashtags récurrents
    all_tags   = [t for ex in valid for t in re.findall(r"#\w+", ex.lower())]
    top_tags   = [h for h, _ in Counter(all_tags).most_common(5)]

    # Ton dominant
    all_text   = " ".join(valid).lower()
    tone_scores = {
        "professionnel": sum(1 for w in ["expertise","solution","professionnel","optimiser"] if w in all_text),
        "decontracte"  : sum(1 for w in ["super","génial","stylé","cool","waouh"] if w in all_text),
        "inspirant"    : sum(1 for w in ["rêve","objectif","succès","possible","croire"] if w in all_text),
        "educatif"     : sum(1 for w in ["astuce","conseil","comment","pourquoi","découvrez"] if w in all_text),
    }
    dominant_tone = max(tone_scores, key=tone_scores.get)
    has_questions  = any("?" in ex for ex in valid)
    has_cta        = any(kw in all_text for kw in ["lien","bio","commente","partage","tag"])

    # Prompt injection
    lines = [
        f"TON DÉTECTÉ : {dominant_tone}",
        f"Longueur cible : ~{avg_words} mots",
        f"Emojis : {'Oui (fréquent)' if uses_emojis else 'Non'}",
        f"Style fin : {'Avec question engageante' if has_questions else 'Affirmatif'}",
        f"CTA : {'Inclure un appel à l action' if has_cta else 'Pas obligatoire'}",
    ]
    if top_tags:
        lines.append(f"Hashtags marque récurrents : {' '.join(top_tags[:4])}")
    lines.append("\nSTYLE À IMITER :")
    for i, ex in enumerate(valid[:2], 1):
        lines.append(f"Ex {i}: \"{ex[:120]}{'...' if len(ex) > 120 else ''}\"")

    return {
        "n_examples"      : len(valid),
        "dominant_tone"   : dominant_tone,
        "avg_words"       : avg_words,
        "uses_emojis"     : uses_emojis,
        "top_hashtags"    : top_tags,
        "prompt_injection": "\n".join(lines),
    }