### `routers/weekly_report/report_writer.py`


# routers/weekly_report/report_writer.py
"""
Rédaction du résumé hebdomadaire en langage simple avec Mistral 7B.

Modèle : mistralai/Mistral-7B-Instruct-v0.3
Lien   : https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.3

Structure du résumé (4 sections JSON) :
  1. bilan           : 1-2 phrases résumant la semaine (ton positif et honnête)
  2. top_publication : meilleure pub expliquée en termes simples
  3. audience        : évolution des abonnés en langage simple
  4. recommandation  : UNE action concrète et précise pour la semaine prochaine

+ emoji_semaine : 1 emoji résumant le sentiment général
+ titre_semaine : titre court et accrocheur (max 8 mots)

RÈGLES DE RÉDACTION injectées dans le prompt Mistral :
  - Jamais de "CTR", "ROAS", "taux d'engagement", "reach", "KPI"
  - Parler directement à l'utilisateur ("vous" ou "tu")
  - Donner des chiffres concrets mais les expliquer simplement
  - La recommandation doit être UNE action concrète, pas vague
  - Maximum 250 mots au total
"""

import requests
import json
import re
import time
import os

HF_TOKEN   = os.getenv("HF_TOKEN", "hf_XXXXXXXXXXXXXXXXXXXX")
HF_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3"


def call_mistral(prompt: str, max_tokens: int = 600, retries: int = 3) -> str:
    """Appelle Mistral 7B via HuggingFace Inference API."""
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens"    : max_tokens,
            "temperature"       : 0.60,
            "return_full_text"  : False,
            "do_sample"         : True,
            "top_p"             : 0.9,
            "repetition_penalty": 1.1,
        }
    }
    for attempt in range(retries):
        try:
            r = requests.post(HF_API_URL, headers=headers, json=payload, timeout=120)
            if r.status_code == 503:
                wait = r.json().get("estimated_time", 30)
                time.sleep(min(wait, 60))
                continue
            r.raise_for_status()
            result = r.json()
            if isinstance(result, list) and result:
                return result[0].get("generated_text", "").strip()
        except Exception as e:
            print(f"   ⚠️ Mistral erreur {attempt+1}: {e}")
            time.sleep(5)
    return ""


def build_weekly_report_prompt(user_name: str, analyzed: dict,
                                platform: str, brand_niche: str = "") -> str:
    """Construit le prompt pour Mistral 7B."""
    reach       = analyzed["reach"]
    engagement  = analyzed["engagement"]
    followers   = analyzed["followers"]
    best_post   = analyzed.get("best_post")
    score       = analyzed["score"]
    score_text  = analyzed["score_text"]
    publications= analyzed["publications"]
    period      = analyzed.get("period", {})

    best_post_ctx = ""
    if best_post:
        best_post_ctx = (
            f"MEILLEURE PUBLICATION :\n"
            f"  Type : {best_post['type']}\n"
            f"  Aperçu : \"{best_post['caption_preview']}\"\n"
            f"  Vues : {best_post['reach']:,}\n"
            f"  J'aime : {best_post['likes']:,}\n"
            f"  Commentaires : {best_post['comments']:,}\n"
        )

    niche_ctx = f"Niche/secteur : {brand_niche}" if brand_niche else ""

    return f"""<s>[INST] Tu es un assistant marketing bienveillant qui aide les créateurs de contenu à comprendre leurs performances.

UTILISATEUR : {user_name}
PLATEFORME   : {platform}
PÉRIODE      : {period.get('start', 'N/A')} au {period.get('end', 'N/A')}
{niche_ctx}
SCORE DE LA SEMAINE : {score}/5 — {score_text}

DONNÉES DE LA SEMAINE :

PORTÉE (vues des publications) :
  Cette semaine  : {reach['formatted']} vues
  Évolution      : {reach['variation']['text']}

INTERACTIONS (likes, commentaires, partages, sauvegardes) :
  Cette semaine  : {engagement['formatted']} interactions
  J'aime         : {engagement['likes']:,}
  Commentaires   : {engagement['comments']:,}
  Partages       : {engagement['shares']:,}
  Sauvegardes    : {engagement['saves']:,}
  Évolution      : {engagement['variation']['text']}

{best_post_ctx}

ABONNÉS :
  {followers['simple_text']}
  Total actuel : {followers['formatted_now']} abonnés

PUBLICATIONS :
  {publications['simple_text']}

MISSION : Rédige un résumé hebdomadaire en LANGAGE SIMPLE pour {user_name}.

RÈGLES ABSOLUES :
1. JAMAIS de jargon marketing (pas de "CTR","ROAS","taux d'engagement","reach","KPI")
2. Toujours en français, ton chaleureux et encourageant
3. Parler directement à {user_name} (utiliser "vous")
4. Donner des chiffres concrets mais les expliquer simplement
5. La recommandation = UNE action concrète et précise, pas vague
6. Maximum 250 mots au total

Réponds UNIQUEMENT avec ce JSON valide :

{{
  "bilan"          : "1-2 phrases résumant la semaine de façon positive et honnête",
  "top_publication": "1-2 phrases sur la meilleure publication en termes simples",
  "audience"       : "1-2 phrases sur l'évolution des abonnés en termes simples",
  "recommandation" : "1 phrase d'action concrète et précise pour la semaine prochaine",
  "emoji_semaine"  : "1 emoji résumant le sentiment général",
  "titre_semaine"  : "Un titre court et accrocheur (max 8 mots)"
}}
[/INST]"""


def parse_report_json(text: str) -> dict | None:
    """Parse le JSON retourné par Mistral."""
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


def fallback_report(user_name: str, analyzed: dict) -> dict:
    """
    Résumé de secours construit automatiquement depuis les métriques.
    Utilisé si Mistral 7B est indisponible (cold start HuggingFace, timeout).
    """
    import random
    reach       = analyzed["reach"]
    followers   = analyzed["followers"]
    best_post   = analyzed.get("best_post")
    score       = analyzed["score"]

    score_emojis = {1: "💪", 2: "⚡", 3: "✅", 4: "😊", 5: "🌟"}
    score_intros = {
        1: "Cette semaine a été calme pour votre contenu,",
        2: "Cette semaine a été correcte,",
        3: "Bonne semaine pour votre contenu !",
        4: "Très bonne semaine !",
        5: "Excellente semaine !",
    }

    bilan = (
        f"{score_intros[score]} vos publications ont été vues "
        f"{reach['formatted']} fois. {reach['variation']['text']}."
    )

    top_pub = "Continuez à publier régulièrement pour améliorer vos résultats."
    if best_post:
        top_pub = (
            f"Votre {best_post['type']} a été votre meilleure publication avec "
            f"{best_post['reach']:,} vues et {best_post['likes']:,} j'aime."
        )

    recommandations = [
        "Publiez au moins 3 fois cette semaine avec des images de qualité.",
        "Répondez aux commentaires de vos publications pour booster votre visibilité.",
        "Essayez un format Reel ou vidéo courte cette semaine — ils ont plus de portée.",
        "Posez une question dans votre prochaine légende pour encourager les commentaires.",
        "Publiez avant 20h un jeudi ou vendredi pour maximiser la portée.",
    ]
    random.seed(sum(v for v in analyzed.get("raw", {}).values() if isinstance(v, (int, float))))

    return {
        "bilan"          : bilan,
        "top_publication": top_pub,
        "audience"       : followers["simple_text"],
        "recommandation" : random.choice(recommandations),
        "emoji_semaine"  : score_emojis.get(score, "✅"),
        "titre_semaine"  : f"Votre semaine du {analyzed.get('period', {}).get('start', 'N/A')}",
    }


def generate_weekly_report(user_name: str, analyzed: dict,
                            platform: str = "Instagram",
                            brand_niche: str = "") -> dict:
    """
    Génère le résumé hebdomadaire complet avec Mistral 7B.
    Fallback automatique si Mistral indisponible.

    Returns:
        dict avec bilan, top_publication, audience,
        recommandation, emoji_semaine, titre_semaine
    """
    print(f"📝 Génération résumé hebdomadaire pour {user_name}...")

    prompt   = build_weekly_report_prompt(user_name, analyzed, platform, brand_niche)
    response = call_mistral(prompt, max_tokens=600)
    report   = parse_report_json(response)

    if not report:
        print("   🔄 Fallback résumé automatique")
        report = fallback_report(user_name, analyzed)
    else:
        print("   ✅ Résumé généré avec Mistral 7B !")

    # Validation — s'assurer que toutes les clés sont présentes
    required = ["bilan","top_publication","audience","recommandation",
                "emoji_semaine","titre_semaine"]
    for key in required:
        if key not in report or not report[key]:
            report[key] = fallback_report(user_name, analyzed).get(key, "")

    return report