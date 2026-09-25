### `routers/account_manager/strategy_gen.py`


# routers/account_manager/strategy_gen.py
"""
Génération de la stratégie marketing 30 jours avec Mistral 7B.

Modèle : mistralai/Mistral-7B-Instruct-v0.3
Lien   : https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.3

Structure de la stratégie générée :
  - Résumé exécutif (positionnement, USP)
  - Plan 4 semaines × 7 jours
  - Chaque semaine a un thème
  - Chaque jour actif : plateforme, type de contenu, sujet, heure

Ingénierie de prompt :
  Le prompt injecte le profil client JSON complet + les entités NER
  pour que Mistral personnalise la stratégie selon la niche exacte,
  les concurrents identifiés et les plateformes cibles.
"""

import json
import re
import time
import os
from datetime import datetime, timedelta
from huggingface_hub import InferenceClient
from huggingface_hub.errors import HfHubHTTPError

HF_TOKEN = os.getenv("HF_TOKEN", "hf_XXXXXXXXXXXXXXXXXXXX")
# Même correctif que extractor.py — mistralai/Mistral-7B-Instruct-v0.3 n'a
# plus de provider d'inférence vivant. Llama-3.1-8B-Instruct vérifié en
# direct (4 providers live au 2026-09-07).
TEXT_MODEL = "meta-llama/Llama-3.1-8B-Instruct"

_client = InferenceClient(provider="auto", api_key=HF_TOKEN)


def call_mistral(prompt: str, max_tokens: int = 1500, retries: int = 3) -> str:
    """Appelle un LLM instruct via HuggingFace Inference Providers (chat)."""
    for attempt in range(retries):
        try:
            completion = _client.chat.completions.create(
                model=TEXT_MODEL,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=0.65,
                top_p=0.9,
            )
            return (completion.choices[0].message.content or "").strip()
        except HfHubHTTPError as e:
            status = getattr(e.response, "status_code", None)
            if status == 503:
                print(f"   ⏳ Provider en chargement, tentative {attempt+1}/{retries}...")
                time.sleep(20)
                continue
            print(f"   ⚠️ Erreur API tentative {attempt+1}/{retries} : {e}")
            time.sleep(5)
        except Exception as e:
            print(f"   ⚠️ Mistral erreur {attempt+1}: {e}")
            time.sleep(5)
    return ""


def generate_30_day_strategy(
    client_profile : dict,
    entities       : dict,
    transcription  : str = "",
) -> dict:
    """
    Génère la stratégie marketing complète sur 30 jours.

    La stratégie est organisée en 4 semaines thématiques :
      Semaine 1 : Notoriété et présentation de la marque
      Semaine 2 : Engagement et communauté
      Semaine 3 : Conversion et preuves sociales
      Semaine 4 : Fidélisation et récapitulatif

    Args:
        client_profile : profil extrait par extractor.py
        entities       : entités NER de ner_analyzer.py
        transcription  : texte brut pour contexte additionnel

    Returns:
        dict avec résumé_exécutif, semaines (1-4), kpis_30j, budget_reco
    """
    print("📅 Génération stratégie 30 jours avec Mistral 7B...")

    niche      = client_profile.get("niche", "générale")
    platforms  = client_profile.get("plateformes", ["instagram"])
    objectifs  = client_profile.get("objectifs", ["notoriété"])
    audience   = client_profile.get("audience_cible", {})
    ton        = client_profile.get("ton_communication", "professionnel")
    business   = client_profile.get("business_name", "Client")
    concurrents= client_profile.get("concurrents", [])
    produits   = client_profile.get("produits_services", [])
    problemes  = client_profile.get("problemes_actuels", [])

    # Contexte entités NER
    ner_ctx = ""
    if entities.get("ORG"):
        ner_ctx += f"Marques/organisations citées : {', '.join(entities['ORG'][:5])}\n"
    if entities.get("LOC"):
        ner_ctx += f"Marchés géographiques : {', '.join(entities['LOC'][:5])}\n"

    platforms_str  = ", ".join(platforms)
    objectifs_str  = ", ".join(objectifs)
    concurrents_str= ", ".join(concurrents) if concurrents else "non mentionnés"
    produits_str   = ", ".join(produits)    if produits    else "non précisés"

    # Date de début (lundi prochain)
    today      = datetime.now()
    days_ahead = (0 - today.weekday()) % 7
    start_date = today + timedelta(days=days_ahead if days_ahead > 0 else 7)
    start_str  = start_date.strftime("%d/%m/%Y")

    prompt = f"""Tu es un expert en stratégie marketing digital pour agences SMMA.
Génère une stratégie marketing complète sur 30 jours pour ce client.

PROFIL CLIENT :
  Entreprise     : {business}
  Niche/Secteur  : {niche}
  Produits/Services : {produits_str}
  Objectifs      : {objectifs_str}
  Audience       : {audience.get('age_range','N/A')}, {audience.get('localisation','N/A')}
  Plateformes    : {platforms_str}
  Ton            : {ton}
  Concurrents    : {concurrents_str}
  Problèmes actuels : {', '.join(problemes) if problemes else 'non précisés'}
  Début du plan  : {start_str}
{ner_ctx}

STRUCTURE DU PLAN :
  Semaine 1 (Jours 1-7)  : NOTORIÉTÉ — Se faire connaître
  Semaine 2 (Jours 8-14) : ENGAGEMENT — Créer la communauté
  Semaine 3 (Jours 15-21): CONVERSION — Transformer en clients
  Semaine 4 (Jours 22-30): FIDÉLISATION — Retenir et récompenser

RÈGLES :
1. Varier les types de contenu (Reel, Carrousel, Story, Statique, Live)
2. Adapter chaque action à la niche "{niche}" et à l'audience
3. Prévoir 5-7 publications par semaine
4. Inclure des horaires optimaux
5. Chaque semaine a un thème clair

Réponds UNIQUEMENT avec ce JSON valide :

{{
  "resume_executif": {{
    "positionnement": "phrase de positionnement unique du client",
    "usp"           : "proposition de valeur unique (1 phrase)",
    "strategie_globale": "résumé de l'approche sur 30 jours (2-3 phrases)"
  }},
  "semaines": [
    {{
      "numero"     : 1,
      "theme"      : "NOTORIÉTÉ — Se faire connaître",
      "objectif"   : "objectif spécifique de la semaine",
      "actions"    : [
        {{
          "jour"     : 1,
          "plateforme": "instagram",
          "type"     : "Reel",
          "sujet"    : "sujet concret adapté à la niche",
          "heure"    : "19:00",
          "hashtags" : ["#hashtag1", "#hashtag2"],
          "conseil"  : "conseil de production ou de caption"
        }}
      ]
    }}
  ],
  "kpis_30_jours": {{
    "followers_vises"    : "objectif chiffré",
    "engagement_vise"    : "taux ou nombre",
    "portee_estimee"     : "nombre de comptes touchés estimé",
    "publications_total" : "nombre total de publications"
  }},
  "budget_recommande": {{
    "contenu"    : "budget production contenu/mois en MAD ou EUR",
    "pub_payante": "budget ads recommandé ou null",
    "total"      : "budget total mensuel estimé"
  }},
  "outils_recommandes": ["outil 1", "outil 2", "outil 3"]
}}"""

    response = call_mistral(prompt, max_tokens=2000)
    strategy = _parse_strategy_json(response)

    if not strategy:
        print("   🔄 Fallback stratégie de secours")
        strategy = _fallback_strategy(client_profile, start_date)
    else:
        print("   ✅ Stratégie 30 jours générée avec Mistral 7B !")

    return strategy


def _parse_strategy_json(text: str) -> dict | None:
    """Parse le JSON de la stratégie."""
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group())
            if "semaines" in data and isinstance(data["semaines"], list):
                return data
        except json.JSONDecodeError:
            cleaned = re.sub(r'[\x00-\x1f]', '', match.group())
            try:
                data = json.loads(cleaned)
                if "semaines" in data:
                    return data
            except Exception:
                pass
    return None


def _fallback_strategy(profile: dict, start_date: datetime) -> dict:
    """Stratégie de secours si Mistral est indisponible."""
    niche    = profile.get("niche", "votre secteur")
    platforms= profile.get("plateformes", ["instagram"])
    primary  = platforms[0] if platforms else "instagram"

    WEEK_THEMES = [
        ("NOTORIÉTÉ", "Se faire connaître"),
        ("ENGAGEMENT", "Créer la communauté"),
        ("CONVERSION", "Transformer en clients"),
        ("FIDÉLISATION", "Retenir et récompenser"),
    ]

    CONTENT_TYPES = [
        {"type": "Reel",       "sujet": f"Présentation de {niche}",   "heure": "19:00"},
        {"type": "Carrousel",  "sujet": f"Guide sur {niche}",         "heure": "12:00"},
        {"type": "Statique",   "sujet": f"Conseil sur {niche}",       "heure": "08:00"},
        {"type": "Story",      "sujet": f"Coulisses de {niche}",      "heure": "18:00"},
        {"type": "Reel",       "sujet": f"Témoignage client — {niche}","heure": "20:00"},
    ]

    semaines = []
    day_counter = 1

    for week_idx, (theme_key, theme_desc) in enumerate(WEEK_THEMES):
        actions = []
        # 5 publications par semaine (jours 1, 2, 3, 5, 7 de la semaine)
        pub_days = [1, 2, 3, 5, 7]
        for pub_idx, relative_day in enumerate(pub_days):
            absolute_day = day_counter + relative_day - 1
            if absolute_day > 30:
                break
            ct = CONTENT_TYPES[pub_idx % len(CONTENT_TYPES)]
            actions.append({
                "jour"      : absolute_day,
                "plateforme": primary,
                "type"      : ct["type"],
                "sujet"     : ct["sujet"],
                "heure"     : ct["heure"],
                "hashtags"  : [f"#{niche.replace(' ', '').lower()}", "#socialmedia"],
                "conseil"   : "Adapter au ton de marque défini.",
            })

        semaines.append({
            "numero"  : week_idx + 1,
            "theme"   : f"{theme_key} — {theme_desc}",
            "objectif": f"Objectif semaine {week_idx + 1} : {theme_desc.lower()}",
            "actions" : actions,
        })
        day_counter += 7

    return {
        "resume_executif": {
            "positionnement": f"Spécialiste {niche} sur {', '.join(platforms[:2])}",
            "usp"           : "Contenu authentique et régulier pour bâtir une communauté engagée.",
            "strategie_globale": "Plan en 4 phases : notoriété, engagement, conversion, fidélisation.",
        },
        "semaines"           : semaines,
        "kpis_30_jours"      : {
            "followers_vises"  : "+300-500 abonnés",
            "engagement_vise"  : "3-5% taux d'engagement",
            "portee_estimee"   : "10 000-20 000 comptes",
            "publications_total": "20 publications",
        },
        "budget_recommande"  : {
            "contenu"    : "2 000-5 000 MAD/mois",
            "pub_payante": None,
            "total"      : "2 000-5 000 MAD/mois",
        },
        "outils_recommandes" : ["Canva", "Later", "Meta Business Suite"],
    }