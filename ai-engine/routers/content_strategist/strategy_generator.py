### `routers/content_strategist/strategy_generator.py`


# routers/content_strategist/strategy_generator.py
"""
Génération de la stratégie narrative et du calendrier avec Mistral 7B.

Modèle : mistralai/Mistral-7B-Instruct-v0.3
Lien   : https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.3
Rôle   : Génère la stratégie éditoriale + le calendrier 7 jours en JSON

Workflow :
  1. Reçoit le profil client + piliers + hashtags
  2. Construit un prompt structuré [INST]...[/INST]
  3. Appelle l'API HuggingFace Inference (gratuite)
  4. Parse le JSON retourné
  5. Complète le calendrier si incomplet (fallback)

Toutes les réponses nécessitent approbation humaine avant utilisation.
"""

import requests
import json
import re
import time
import os

HF_TOKEN   = os.getenv("HF_TOKEN", "hf_XXXXXXXXXXXXXXXXXXXX")
HF_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3"


def call_mistral(prompt: str, max_new_tokens: int = 1500,
                  max_retries: int = 3) -> str:
    """Appelle Mistral 7B via l'API HuggingFace Inference (gratuite)."""
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens"    : max_new_tokens,
            "temperature"       : 0.4,
            "return_full_text"  : False,
            "do_sample"         : True,
            "top_p"             : 0.9,
        }
    }

    for attempt in range(max_retries):
        print(f"   📡 Appel Mistral ({attempt+1}/{max_retries})...")
        try:
            r = requests.post(HF_API_URL, headers=headers, json=payload, timeout=150)
            if r.status_code == 503:
                wait = r.json().get("estimated_time", 30)
                print(f"   ⏳ Modèle en chargement, attente {wait:.0f}s...")
                time.sleep(min(wait, 60))
                continue
            r.raise_for_status()
            result = r.json()
            if isinstance(result, list) and result:
                return result[0].get("generated_text", "").strip()
        except Exception as e:
            print(f"   ⚠️ Erreur : {e}")
            time.sleep(5)

    return ""


def parse_json(text: str) -> dict | None:
    """Extrait le JSON de la réponse Mistral."""
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            cleaned = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', match.group())
            try:
                return json.loads(cleaned)
            except Exception:
                pass
    return None


def build_strategy_prompt(profile: dict, pillars: list[dict],
                            hashtag_sets: dict) -> str:
    """Construit le prompt de génération de stratégie."""

    pillars_text = "\n".join([
        f"  - Pilier {p['id']}: {p['nom']} (mots-clés: {', '.join(p['mots_cles'][:4])})"
        for p in pillars
    ])

    hashtags_text = "\n".join([
        f"  - {pilier}: {', '.join(tags[:5])}"
        for pilier, tags in list(hashtag_sets.items())[:5]
    ])

    prompt = f"""<s>[INST] Tu es un Stratège de Contenu expert en marketing digital (SMMA).
Tu travailles pour l'agence Social Mind AI.

PROFIL CLIENT :
- Niche : {profile.get('niche', 'Marketing digital')}
- Secteur : {profile.get('secteur', 'Services')}
- Audience : {profile.get('audience', '25-45 ans, professionnels')}
- Objectifs : {profile.get('objectifs', "Augmenter la visibilité et l'engagement")}
- Plateformes : {', '.join(profile.get('plateformes', ['Instagram', 'TikTok', 'Facebook']))}
- Ton de marque : {profile.get('ton', 'professionnel et accessible')}

PILIERS DE CONTENU (découverts par BERTopic + LDA sur données réelles) :
{pillars_text}

HASHTAGS RECOMMANDÉS PAR PILIER (TF-IDF + KMeans) :
{hashtags_text}

Génère une stratégie de contenu complète.
Réponds UNIQUEMENT avec un JSON valide, sans texte avant ou après :

{{
  "strategie_editoriale": "résumé en 3-4 phrases de la stratégie globale",
  "tone_of_voice": "description du ton recommandé avec exemples concrets",
  "frequence_publication": {{
    "Instagram": "X fois par semaine",
    "TikTok": "X fois par semaine",
    "Facebook": "X fois par semaine",
    "LinkedIn": "X fois par semaine"
  }},
  "calendrier_7_jours": [
    {{
      "jour": "Lundi",
      "pilier": "nom du pilier",
      "plateforme": "Instagram",
      "type_contenu": "Reel / Carrousel / Story / Post / Article",
      "sujet": "sujet précis et accrocheur",
      "angle": "angle éditorial spécifique",
      "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"]
    }}
  ],
  "recommandations_cles": ["conseil 1", "conseil 2", "conseil 3", "conseil 4"]
}}

IMPORTANT : "calendrier_7_jours" doit contenir EXACTEMENT 7 objets,
un pour chaque jour de Lundi à Dimanche. [/INST]"""

    return prompt


def complete_calendar(existing: list, pillars: list[dict],
                       hashtag_sets: dict) -> list:
    """Complète un calendrier incomplet jusqu'à 7 jours."""
    days  = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
    types = ["Reel", "Carrousel", "Story", "Post", "Article", "Vidéo courte", "Infographie"]

    existing_days = [d.get("jour", "") for d in existing]

    for i, day in enumerate(days):
        if day not in existing_days:
            pillar = pillars[i % len(pillars)]
            tags   = list(hashtag_sets.get(pillar["nom"], []))[:5]
            existing.append({
                "jour"        : day,
                "pilier"      : pillar["nom"],
                "plateforme"  : "Instagram",
                "type_contenu": types[i % len(types)],
                "sujet"       : f"Contenu {pillar['nom']} — {', '.join(pillar['mots_cles'][:2])}",
                "angle"       : "Éducatif et engageant",
                "hashtags"    : tags,
            })

    return existing[:7]


def generate_content_strategy(profile: dict, pillars: list[dict],
                                hashtag_sets: dict) -> dict:
    """
    Pipeline complet de génération de stratégie avec Mistral 7B.

    Args:
        profile      : profil client (niche, audience, objectifs...)
        pillars      : piliers découverts par BERTopic + LDA
        hashtag_sets : dict {pilier: [hashtags]} par TF-IDF + KMeans

    Returns:
        dict stratégie complète avec calendrier 7 jours
    """
    print("🧠 Génération de la stratégie (Mistral 7B — HuggingFace gratuit)...")
    prompt = build_strategy_prompt(profile, pillars, hashtag_sets)

    response = call_mistral(prompt, max_new_tokens=1500)
    strategy = parse_json(response)

    if strategy is None:
        print("   ⚠️ JSON invalide — utilisation de la stratégie de secours")
        strategy = _fallback_strategy(profile, pillars, hashtag_sets)
    else:
        calendar = strategy.get("calendrier_7_jours", [])
        if len(calendar) < 7:
            print(f"   ⚠️ Calendrier incomplet ({len(calendar)} jours) — complétion...")
            strategy["calendrier_7_jours"] = complete_calendar(
                calendar, pillars, hashtag_sets
            )

    print("   ✅ Stratégie générée !")
    return strategy


def _fallback_strategy(profile: dict, pillars: list[dict],
                        hashtag_sets: dict) -> dict:
    """Stratégie de secours si l'API est indisponible."""
    days  = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
    types = ["Reel", "Carrousel", "Story", "Post", "Infographie", "Vidéo courte", "Carrousel"]
    plateformes = profile.get("plateformes", ["Instagram", "TikTok", "Facebook"])

    calendar = []
    for i, day in enumerate(days):
        pillar = pillars[i % len(pillars)]
        tags   = list(hashtag_sets.get(pillar["nom"], []))[:5]
        calendar.append({
            "jour"        : day,
            "pilier"      : pillar["nom"],
            "plateforme"  : plateformes[i % len(plateformes)],
            "type_contenu": types[i],
            "sujet"       : f"Contenu {pillar['nom']} — {', '.join(pillar['mots_cles'][:3])}",
            "angle"       : "Engageant et authentique",
            "hashtags"    : tags,
        })

    return {
        "strategie_editoriale" : f"Stratégie centrée sur {len(pillars)} piliers pour la niche {profile.get('niche', '')}.",
        "tone_of_voice"        : profile.get("ton", "professionnel et bienveillant"),
        "frequence_publication": {p: "5 fois par semaine" for p in plateformes},
        "calendrier_7_jours"   : calendar,
        "recommandations_cles" : [
            "Publier aux heures de forte audience (9h, 12h, 18h, 20h)",
            "Utiliser 5-10 hashtags ciblés plutôt que 30 génériques",
            "Alterner les piliers de contenu pour maintenir l'équilibre",
            "Analyser les métriques chaque semaine via l'Agent Analytics",
        ],
    }