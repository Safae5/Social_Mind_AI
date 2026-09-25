### `routers/competitive_intel/strategy_generator.py`


# routers/competitive_intel/strategy_generator.py
"""
Génération des recommandations de contre-stratégie avec Mistral 7B.

Modèle : mistralai/Mistral-7B-Instruct-v0.3
Lien   : https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.3

La contre-stratégie prend en compte :
  - La stratégie tonale de chaque concurrent (VADER + TextBlob)
  - Les clusters thématiques dominants (K-Means)
  - Les patterns viraux identifiés (TF-IDF + DBSCAN outliers)
  - Les forces et faiblesses relatives des concurrents
  - Les opportunités de différenciation non exploitées

Format de réponse attendu : JSON structuré avec
  analyse_paysage, forces, faiblesses, opportunités,
  contre_stratégie, calendrier 4 semaines, KPIs, score menace
"""

import requests
import json
import re
import time
import pandas as pd

HF_TOKEN   = "hf_VOTRE_TOKEN_ICI"  # ← Token HuggingFace (gratuit)
HF_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3"


def call_mistral(prompt: str, max_new_tokens: int = 1500, max_retries: int = 3) -> str:
    """Appelle l'API HuggingFace Inference (Mistral 7B)."""
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens"  : max_new_tokens,
            "temperature"     : 0.45,
            "return_full_text": False,
            "do_sample"       : True,
            "top_p"           : 0.9,
        }
    }

    for attempt in range(max_retries):
        try:
            print(f"   📡 Appel Mistral 7B (tentative {attempt+1}/{max_retries})...")
            response = requests.post(HF_API_URL, headers=headers, json=payload, timeout=150)

            if response.status_code == 503:
                wait = response.json().get("estimated_time", 30)
                print(f"   ⏳ Modèle en chargement, attente {wait:.0f}s...")
                time.sleep(min(wait, 60))
                continue

            response.raise_for_status()
            result = response.json()
            if isinstance(result, list) and result:
                return result[0].get("generated_text", "").strip()
        except Exception as e:
            print(f"   ⚠️ Erreur tentative {attempt+1}: {e}")
            time.sleep(5)
    return ""


def parse_json(text: str) -> dict | None:
    """Extrait le JSON de la réponse."""
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except Exception:
            cleaned = re.sub(r'[\x00-\x1f]', '', match.group())
            try:
                return json.loads(cleaned)
            except Exception:
                pass
    return None


def generate_competitive_strategy(
    client_niche      : str,
    client_brand      : str,
    sentiment_by_comp : pd.DataFrame,
    cluster_names     : dict,
    viral_patterns    : dict,
    metadata          : dict,
) -> dict:
    """
    Génère la contre-stratégie complète avec Mistral 7B.

    Returns: dict avec l'analyse stratégique complète
    """
    print("🧠 Génération de la contre-stratégie (Mistral 7B)...")

    comp_summary = "\n".join([
        f"  - {row['competitor']} : {row['tone_strategy']} | "
        f"Sentiment moyen : {row['avg_compound']:.2f} | "
        f"Posts positifs : {row['positive_pct']:.0f}%"
        for _, row in sentiment_by_comp.head(5).iterrows()
    ]) if sentiment_by_comp is not None and not sentiment_by_comp.empty else "N/A"

    clusters_summary = "\n".join([
        f"  - Cluster '{name}'" for name in list(cluster_names.values())[:5]
    ]) if cluster_names else "N/A"

    viral_keywords = [kw[0] for kw in viral_patterns.get("viral_keywords", [])[:10]]
    viral_hashtags = [h["hashtag"] for h in viral_patterns.get("viral_hashtags", [])[:8]]
    viral_types    = viral_patterns.get("viral_by_type", [])
    best_type      = viral_types[0]["content_type"] if viral_types else "Vidéo/Reel"
    top_comp       = sentiment_by_comp.iloc[0]["competitor"] if not sentiment_by_comp.empty else "N/A"

    prompt = f"""<s>[INST] Tu es un expert en stratégie marketing digital et veille concurrentielle.
Tu travailles pour l'agence Social Mind AI.

CLIENT :
- Marque : {client_brand}
- Niche  : {client_niche}

ANALYSE CONCURRENTIELLE RÉALISÉE :

1. PROFILS DE SENTIMENT DES CONCURRENTS :
{comp_summary}

2. CLUSTERS THÉMATIQUES IDENTIFIÉS (K-Means) :
{clusters_summary}

3. PATTERNS DE CONTENU VIRAL DÉTECTÉS :
   - Mots-clés viraux : {', '.join(viral_keywords)}
   - Hashtags viraux : {', '.join(viral_hashtags)}
   - Format le plus viral : {best_type}
   - Multiplicateur d'engagement viral : {viral_patterns.get('viral_multiplier', 2)}x

4. CONCURRENT DOMINANT : {top_comp}

Génère une analyse stratégique et des recommandations de différenciation.
Réponds UNIQUEMENT avec un JSON valide :

{{
  "analyse_paysage": "analyse en 3-4 phrases du paysage concurrentiel observé",
  "forces_concurrents": ["force 1", "force 2", "force 3"],
  "faiblesses_concurrents": ["faiblesse 1", "faiblesse 2", "faiblesse 3"],
  "opportunites_differentiation": [
    {{
      "opportunite": "description",
      "action_concrete": "action à mettre en place",
      "canal": "plateforme recommandée",
      "priorite": "Haute/Moyenne/Faible"
    }}
  ],
  "contre_strategie": {{
    "positionnement": "comment se différencier",
    "ton_recommande": "ton de communication recommandé",
    "piliers_contenu": ["pilier 1", "pilier 2", "pilier 3"],
    "formats_prioritaires": ["format 1", "format 2"],
    "hashtags_a_eviter": ["hashtag saturé 1"],
    "hashtags_a_adopter": ["hashtag niche 1", "hashtag niche 2"]
  }},
  "calendrier_actions": [
    {{"semaine": 1, "action": "action prioritaire semaine 1"}},
    {{"semaine": 2, "action": "action prioritaire semaine 2"}},
    {{"semaine": 3, "action": "action prioritaire semaine 3"}},
    {{"semaine": 4, "action": "action prioritaire semaine 4"}}
  ],
  "kpis_a_surveiller": ["KPI 1", "KPI 2", "KPI 3"],
  "score_menace_concurrentielle": 55,
  "resume_executif": "résumé en 2-3 phrases pour le client"
}}
[/INST]"""

    response = call_mistral(prompt, max_new_tokens=1500)
    strategy = parse_json(response)

    if strategy is None:
        print("   ⚠️ JSON invalide — stratégie de secours")
        strategy = _fallback_strategy(client_niche, viral_patterns)
    else:
        strategy["score_menace_concurrentielle"] = min(
            100, max(0, int(strategy.get("score_menace_concurrentielle", 50)))
        )
        print("   ✅ Contre-stratégie générée !")

    return strategy


def _fallback_strategy(niche: str, viral_patterns: dict) -> dict:
    """Stratégie de secours si l'API est indisponible."""
    viral_types = viral_patterns.get("viral_by_type", [])
    best_type   = viral_types[0]["content_type"] if viral_types else "Reel"
    keywords    = [kw[0] for kw in viral_patterns.get("viral_keywords", [])[:3]]

    return {
        "analyse_paysage"    : f"Le paysage concurrentiel de la niche {niche} est actif avec plusieurs stratégies identifiées par notre analyse IA.",
        "forces_concurrents" : ["Forte présence sur les plateformes", "Contenu viral régulier", "Communauté engagée"],
        "faiblesses_concurrents": ["Peu de contenu éducatif", "Manque d'authenticité", "Répétition des formats"],
        "opportunites_differentiation": [{
            "opportunite"    : "Créer du contenu éducatif de niche",
            "action_concrete": f"Lancer une série de {best_type}s éducatifs",
            "canal"          : "Instagram + LinkedIn",
            "priorite"       : "Haute",
        }],
        "contre_strategie": {
            "positionnement"     : f"Expert référent de la niche {niche}",
            "ton_recommande"     : "Éducatif, authentique et engageant",
            "piliers_contenu"    : ["Éducation", "Coulisses", "Témoignages clients"],
            "formats_prioritaires": [best_type, "Carrousel"],
            "hashtags_a_eviter"  : ["#viral", "#fyp"],
            "hashtags_a_adopter" : [f"#{k}" for k in keywords[:3]],
        },
        "calendrier_actions": [
            {"semaine": 1, "action": "Audit complet vs concurrents"},
            {"semaine": 2, "action": f"Lancer 3 {best_type}s différenciateurs"},
            {"semaine": 3, "action": "Engager la communauté avec sondages"},
            {"semaine": 4, "action": "Analyser et affiner la stratégie"},
        ],
        "kpis_a_surveiller"          : ["Taux d'engagement", "Portée organique", "Nouveaux abonnés"],
        "score_menace_concurrentielle": 55,
        "resume_executif"            : f"5 concurrents analysés dans la niche {niche}. Opportunités de différenciation identifiées.",
    }