### `routers/account_manager/extractor.py`


# routers/account_manager/extractor.py
"""
Extraction TAL du profil client depuis la transcription.

Modèle : mistralai/Mistral-7B-Instruct-v0.3
Lien   : https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.3

Pipeline :
  1. Transcription de la réunion client (texte brut)
  2. Prompt structuré envoyé à Mistral 7B via HuggingFace Inference API
  3. Mistral extrait les informations clés en JSON :
     - niche / secteur d'activité
     - audience cible (âge, genre, localisation, intérêts)
     - objectifs marketing (notoriété, ventes, engagement...)
     - concurrents mentionnés
     - KPIs souhaités (followers, reach, leads, CA...)
     - budget mensuel estimé
     - plateformes cibles
     - ton de communication

Dataset de référence (Customer Support Twitter Dataset) :
  Utilisé pour calibrer l'extraction des patterns de communication
  et identifier les types de demandes clients récurrents.
  Lien : https://www.kaggle.com/datasets/thoughtvector/customer-support-on-twitter
"""

import json
import re
import time
import os
from huggingface_hub import InferenceClient
from huggingface_hub.errors import HfHubHTTPError

HF_TOKEN = os.getenv("HF_TOKEN", "hf_XXXXXXXXXXXXXXXXXXXX")
# mistralai/Mistral-7B-Instruct-v0.3 n'a plus qu'un provider d'inférence
# HuggingFace ("novita", status "error" — mort, pas juste temporairement
# indisponible), donc CHAQUE extraction échouait silencieusement et
# retombait sur _fallback_profile() — d'où les valeurs génériques
# ("À compléter manuellement", "18-35 ans / mixte / Maroc") qui n'ont
# jamais rien à voir avec l'audio réellement transcrit. Llama-3.1-8B-Instruct
# est servi en direct par 4 providers différents (novita, nscale,
# featherless-ai, deepinfra) au 2026-09-07 — vérifié en direct sur un
# vrai extrait de réunion avant ce correctif.
TEXT_MODEL = "meta-llama/Llama-3.1-8B-Instruct"

_client = InferenceClient(provider="auto", api_key=HF_TOKEN)


def call_mistral(prompt: str, max_tokens: int = 1000, retries: int = 3) -> str:
    """Appelle un LLM instruct via HuggingFace Inference Providers (chat)."""
    for attempt in range(retries):
        try:
            completion = _client.chat.completions.create(
                model=TEXT_MODEL,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=0.3,    # Bas pour extraction structurée
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


def extract_client_profile(transcription_text: str, client_name: str = "") -> dict:
    """
    Extrait le profil marketing client depuis la transcription.

    Prompt engineering :
    - Instructions claires pour retourner du JSON strict
    - Exemples de valeurs attendues dans chaque champ
    - Gestion du cas où une info n'est pas mentionnée (null)

    Returns:
        dict avec tous les champs du profil client
    """
    print("🔍 Extraction profil client avec Mistral 7B...")

    # Tronquer si trop long (limite tokens HuggingFace gratuit)
    words = transcription_text.split()
    if len(words) > 1500:
        text_excerpt = " ".join(words[:1500]) + "..."
    else:
        text_excerpt = transcription_text

    client_ctx = f"Nom du client : {client_name}\n" if client_name else ""

    prompt = f"""Tu es un expert en stratégie marketing digital pour les agences SMMA.
Analyse cette transcription de réunion client et extrais les informations marketing clés.

{client_ctx}TRANSCRIPTION DE LA RÉUNION :
---
{text_excerpt}
---

Extrais UNIQUEMENT les informations explicitement mentionnées dans la transcription.
Si une information n'est pas mentionnée, mets null.

Réponds UNIQUEMENT avec ce JSON valide :

{{
  "niche"            : "secteur/niche du client (ex: mode marocaine, restaurant, e-commerce)",
  "business_name"    : "nom de l'entreprise ou marque",
  "audience_cible"   : {{
    "age_range"      : "tranche d'âge (ex: 18-35 ans)",
    "genre"          : "homme / femme / mixte",
    "localisation"   : "ville, pays ou région ciblée",
    "interets"       : ["intérêt 1", "intérêt 2", "intérêt 3"]
  }},
  "objectifs"        : ["objectif 1", "objectif 2", "objectif 3"],
  "concurrents"      : ["concurrent 1", "concurrent 2"],
  "kpis"             : {{
    "followers_objectif": "nombre ou pourcentage (ex: +500 abonnés/mois)",
    "engagement_objectif": "taux ou chiffre (ex: 5% taux d'engagement)",
    "leads_objectif"    : "nombre ou null",
    "ca_objectif"       : "chiffre d'affaires visé ou null"
  }},
  "budget_mensuel"   : "budget en MAD/EUR ou null si non mentionné",
  "plateformes"      : ["instagram", "tiktok", "facebook"],
  "ton_communication": "professionnel / décontracté / luxe / humoristique",
  "produits_services": ["produit/service 1", "produit/service 2"],
  "problemes_actuels": ["problème identifié 1", "problème identifié 2"],
  "points_forts"     : ["avantage concurrentiel 1", "avantage concurrentiel 2"],
  "langue_contenu"   : "français / arabe / mixte / anglais"
}}"""

    response   = call_mistral(prompt, max_tokens=1000)
    profile    = _parse_json_response(response)

    if not profile:
        print("   🔄 Fallback profil de secours")
        profile = _fallback_profile(transcription_text, client_name)
    else:
        print("   ✅ Profil extrait avec Mistral 7B !")

    return profile


def _parse_json_response(text: str) -> dict | None:
    """Parse le JSON de la réponse Mistral."""
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            cleaned = re.sub(r'[\x00-\x1f]', '', match.group())
            try:
                return json.loads(cleaned)
            except Exception:
                pass
    return None


def _fallback_profile(text: str, client_name: str) -> dict:
    """Profil de secours basique si Mistral est indisponible."""
    text_lower = text.lower()

    # Détecter les plateformes mentionnées
    platforms = []
    for plat in ["instagram", "tiktok", "facebook", "linkedin", "twitter", "youtube"]:
        if plat in text_lower:
            platforms.append(plat)
    if not platforms:
        platforms = ["instagram", "facebook"]

    return {
        "niche"            : "À compléter manuellement",
        "business_name"    : client_name or "Client",
        "audience_cible"   : {
            "age_range"   : "18-35 ans",
            "genre"       : "mixte",
            "localisation": "Maroc",
            "interets"    : []
        },
        "objectifs"        : ["Augmenter la notoriété", "Générer des leads"],
        "concurrents"      : [],
        "kpis"             : {
            "followers_objectif" : None,
            "engagement_objectif": None,
            "leads_objectif"     : None,
            "ca_objectif"        : None,
        },
        "budget_mensuel"   : None,
        "plateformes"      : platforms,
        "ton_communication": "professionnel",
        "produits_services": [],
        "problemes_actuels": [],
        "points_forts"     : [],
        "langue_contenu"   : "français",
    }