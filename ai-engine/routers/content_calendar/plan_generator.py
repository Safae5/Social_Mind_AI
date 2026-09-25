### `routers/content_calendar/plan_generator.py`


# routers/content_calendar/plan_generator.py
"""
Génération du plan de contenu 7 jours avec Mistral 7B.

Modèle : mistralai/Mistral-7B-Instruct-v0.3
Lien   : https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.3

Le plan est personnalisé selon :
  - La niche/secteur de l'utilisateur
  - Les plateformes connectées
  - La fréquence cible (3, 5 ou 7 publications par semaine)
  - La langue et les objectifs

Structure de chaque slot (jour) :
  {
    "day"           : "Lundi",
    "date"          : "2025-01-20",
    "is_rest_day"   : false,
    "platform"      : "instagram",
    "post_type"     : "carousel",
    "subject"       : "5 façons de porter le caftan en 2025",
    "angle"         : "Éducatif — guide pratique avec photos",
    "caption_idea"  : "Idée de légende en 1-2 phrases",
    "best_time"     : "19:00",
    "hashtag_themes": ["mode", "caftan", "marocain"],
    "why"           : "Les carrousels éducatifs génèrent 3x plus de sauvegardes"
  }

Types de publication :
  reel     → Vidéo courte (Instagram Reels / TikTok)
  carousel → Carrousel multi-images (Instagram / LinkedIn)
  static   → Image statique (Instagram / Facebook)
  story    → Story éphémère (Instagram / Facebook)
  video    → Vidéo longue (YouTube / Facebook)
  article  → Article (LinkedIn)
"""

import requests
import json
import re
import time
import os
from datetime import datetime, timedelta

HF_TOKEN   = os.getenv("HF_TOKEN", "hf_XXXXXXXXXXXXXXXXXXXX")
HF_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3"

PLATFORM_POST_TYPES = {
    "instagram": ["reel", "carousel", "static", "story"],
    "tiktok"   : ["reel", "static"],
    "facebook" : ["static", "carousel", "video", "story"],
    "linkedin" : ["article", "static", "carousel"],
    "twitter"  : ["static"],
}

OPTIMAL_TIMES = {
    "instagram": ["07:00", "12:00", "17:00", "19:00", "21:00"],
    "tiktok"   : ["07:00", "12:00", "16:00", "19:00", "21:00"],
    "facebook" : ["09:00", "13:00", "15:00", "19:00"],
    "linkedin" : ["07:30", "09:00", "12:00", "17:30"],
    "twitter"  : ["08:00", "12:00", "17:00", "20:00"],
}

DAYS_FR = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"]


def call_mistral(prompt: str, max_tokens: int = 1500, retries: int = 3) -> str:
    """Appelle Mistral 7B via HuggingFace Inference API."""
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens"    : max_tokens,
            "temperature"       : 0.70,
            "return_full_text"  : False,
            "do_sample"         : True,
            "top_p"             : 0.9,
            "repetition_penalty": 1.1,
        }
    }
    for attempt in range(retries):
        try:
            r = requests.post(HF_API_URL, headers=headers, json=payload, timeout=180)
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


def get_week_dates(start_date: datetime | None = None) -> list[str]:
    """Retourne les 7 dates de la semaine (Lundi → Dimanche)."""
    if start_date is None:
        today      = datetime.now()
        days_ahead = (0 - today.weekday()) % 7
        start_date = today + timedelta(days=days_ahead if days_ahead > 0 else 7)
    return [(start_date + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(7)]


def build_calendar_prompt(niche: str, platforms: list[str], frequency: int,
                           language: str, objectives: list[str], brand_voice: str,
                           week_dates: list[str]) -> str:
    """Construit le prompt pour Mistral 7B."""
    platforms_str  = ", ".join(platforms)
    objectives_str = ", ".join(objectives) if objectives else "engagement et notoriété"
    rest_days      = 7 - frequency
    week_start     = week_dates[0] if week_dates else "N/A"

    available_types = set()
    for p in platforms:
        available_types.update(PLATFORM_POST_TYPES.get(p, []))
    types_str = ", ".join(sorted(available_types))

    return f"""<s>[INST] Tu es un expert en stratégie de contenu pour les réseaux sociaux.

PROFIL DE L'UTILISATEUR :
  Niche/secteur      : {niche}
  Plateformes actives: {platforms_str}
  Fréquence cible    : {frequency} publications/semaine ({rest_days} jours de repos)
  Langue             : {language}
  Objectifs          : {objectives_str}
  Ton de marque      : {brand_voice or "professionnel et engageant"}
  Semaine du         : {week_start}

TYPES DISPONIBLES : {types_str}

MISSION : Génère un plan de contenu pour les 7 jours de la semaine.

RÈGLES :
1. Exactement {frequency} jours actifs, {rest_days} jours de repos (is_rest_day: true)
2. Varier les types de publication (max 2 fois le même type)
3. Varier les plateformes si plusieurs disponibles
4. Chaque sujet doit être CONCRET et SPÉCIFIQUE à "{niche}"
5. L'angle doit être actionnable (Before/After, Tutoriel, Coulisses, etc.)
6. Le champ "why" explique en 1 phrase pourquoi ce format ce jour-là

JOURS :
{', '.join([f'{d} ({w})' for d, w in zip(DAYS_FR, week_dates)])}

Réponds UNIQUEMENT avec ce JSON (tableau de 7 objets) :

[
  {{
    "day"            : "Lundi",
    "date"           : "{week_dates[0]}",
    "is_rest_day"    : false,
    "platform"       : "instagram",
    "post_type"      : "carousel",
    "subject"        : "Sujet concret et accrocheur",
    "angle"          : "Type d'angle — description courte",
    "caption_idea"   : "Idée de légende en 1-2 phrases",
    "best_time"      : "19:00",
    "hashtag_themes" : ["thème1", "thème2", "thème3"],
    "why"            : "Raison du choix format/plateforme"
  }},
  ...
]
[/INST]"""


def parse_plan_json(text: str) -> list[dict] | None:
    """Parse le JSON retourné par Mistral."""
    match = re.search(r'\[.*\]', text, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group())
            if isinstance(data, list) and len(data) > 0:
                return data
        except json.JSONDecodeError:
            cleaned = re.sub(r'[\x00-\x1f]', '', match.group())
            try:
                data = json.loads(cleaned)
                if isinstance(data, list):
                    return data
            except Exception:
                pass
    return None


def fallback_plan(niche: str, platforms: list[str],
                   frequency: int, week_dates: list[str]) -> list[dict]:
    """Plan de secours si Mistral est indisponible."""
    primary   = platforms[0] if platforms else "instagram"
    secondary = platforms[1] if len(platforms) > 1 else primary

    active_indices = [0, 2, 3, 4, 5][:frequency]
    templates = [
        {"post_type": "carousel", "angle": "Éducatif — liste de conseils",
         "caption_idea": f"Voici ce que vous devez savoir sur {niche} 👇", "best_time": "19:00"},
        {"post_type": "reel",     "angle": "Before/After — transformation",
         "caption_idea": f"Cette transformation liée à {niche} va vous surprendre", "best_time": "18:00"},
        {"post_type": "static",   "angle": "Citation inspirante",
         "caption_idea": f"Une pensée sur {niche} qui va vous motiver", "best_time": "08:00"},
        {"post_type": "reel",     "angle": "Tutoriel rapide",
         "caption_idea": f"Tuto express sur {niche} en moins de 60 secondes", "best_time": "12:00"},
        {"post_type": "carousel", "angle": "Guide complet débutant",
         "caption_idea": f"Tout ce qu'il faut savoir pour débuter en {niche}", "best_time": "20:00"},
    ]

    plan    = []
    tmpl_idx= 0
    for i, date in enumerate(week_dates):
        if i in active_indices:
            tmpl = templates[tmpl_idx % len(templates)]
            plat = primary if tmpl_idx % 2 == 0 else secondary
            plan.append({
                "day": DAYS_FR[i], "date": date, "is_rest_day": False,
                "platform": plat, "post_type": tmpl["post_type"],
                "subject": f"Contenu {niche} — {tmpl['angle']}",
                "angle": tmpl["angle"], "caption_idea": tmpl["caption_idea"],
                "best_time": tmpl["best_time"],
                "hashtag_themes": [niche.split()[0].lower(), "contenu", "socialmedia"],
                "why": "Format sélectionné automatiquement pour maximiser l'engagement.",
            })
            tmpl_idx += 1
        else:
            plan.append({
                "day": DAYS_FR[i], "date": date, "is_rest_day": True,
                "platform": None, "post_type": None, "subject": None,
                "angle": None, "caption_idea": None, "best_time": None,
                "hashtag_themes": [], "why": "Jour de repos.",
            })
    return plan


def validate_and_fix_plan(plan: list[dict], platforms: list[str],
                            frequency: int, week_dates: list[str]) -> list[dict]:
    """Valide et corrige le plan généré par Mistral."""
    while len(plan) < 7:
        plan.append({
            "day": DAYS_FR[len(plan)], "date": week_dates[len(plan)] if len(plan) < len(week_dates) else "",
            "is_rest_day": True, "platform": None, "post_type": None,
            "subject": None, "angle": None, "caption_idea": None,
            "best_time": None, "hashtag_themes": [], "why": "Jour de repos.",
        })
    plan = plan[:7]

    for i, slot in enumerate(plan):
        slot["day"]  = DAYS_FR[i]
        slot["date"] = week_dates[i] if i < len(week_dates) else slot.get("date", "")
        if not slot.get("is_rest_day"):
            if slot.get("platform") not in platforms:
                slot["platform"] = platforms[0]
            valid_types = PLATFORM_POST_TYPES.get(slot["platform"], ["static"])
            if slot.get("post_type") not in valid_types:
                slot["post_type"] = valid_types[0]
            if not slot.get("subject"):
                slot["subject"] = f"Contenu {slot['platform']} — Jour {i+1}"
            if not slot.get("best_time"):
                slot["best_time"] = OPTIMAL_TIMES.get(slot["platform"], ["18:00"])[0]
    return plan


def generate_weekly_plan(niche: str, platforms: list[str], frequency: int = 5,
                          language: str = "Français", objectives: list[str] = None,
                          brand_voice: str = "", week_start: str | None = None) -> list[dict]:
    """
    Génère le plan de contenu 7 jours avec Mistral 7B.

    Returns:
        Liste de 7 dicts (un par jour)
    """
    print(f"📅 Génération plan 7 jours — niche: {niche}, {frequency} pub/semaine...")

    start_dt   = datetime.strptime(week_start, "%Y-%m-%d") if week_start else None
    week_dates = get_week_dates(start_dt)
    objectives = objectives or ["engagement", "notoriété"]

    prompt = build_calendar_prompt(niche, platforms, frequency, language,
                                    objectives, brand_voice, week_dates)
    response = call_mistral(prompt, max_tokens=1500)
    plan     = parse_plan_json(response)

    if not plan:
        print("   🔄 Fallback plan automatique")
        plan = fallback_plan(niche, platforms, frequency, week_dates)
    else:
        print(f"   ✅ Plan généré avec Mistral 7B ! ({len(plan)} jours)")

    return validate_and_fix_plan(plan, platforms, frequency, week_dates)


def regenerate_single_day(niche: str, platforms: list[str], day_name: str,
                           date: str, existing_plan: list[dict],
                           language: str = "Français") -> dict:
    """
    Régénère la suggestion pour un seul jour sans refaire tout le plan.

    Args:
        existing_plan : plan existant pour éviter les doublons de sujet

    Returns:
        Nouveau slot pour ce jour
    """
    print(f"🔄 Régénération du {day_name} ({date})...")

    existing_subjects = [
        s["subject"] for s in existing_plan
        if not s.get("is_rest_day") and s.get("subject") and s.get("day") != day_name
    ]

    platforms_str = ", ".join(platforms)
    existing_ctx  = ""
    if existing_subjects:
        existing_ctx = (
            "\nSujets déjà utilisés cette semaine (à NE PAS répéter) :\n"
            + "\n".join(f"  - {s}" for s in existing_subjects[:5])
        )

    prompt = f"""<s>[INST] Tu es un expert en stratégie de contenu réseaux sociaux.

PROFIL :
  Niche/secteur : {niche}
  Plateformes   : {platforms_str}
  Langue        : {language}
  Jour à planifier : {day_name} ({date})
{existing_ctx}

Génère UNE SEULE suggestion de publication pour {day_name}.
Le sujet doit être DIFFÉRENT des sujets déjà utilisés.

Réponds UNIQUEMENT avec ce JSON :

{{
  "day"            : "{day_name}",
  "date"           : "{date}",
  "is_rest_day"    : false,
  "platform"       : "instagram",
  "post_type"      : "reel",
  "subject"        : "Sujet concret et original pour {niche}",
  "angle"          : "Angle créatif",
  "caption_idea"   : "Idée de légende",
  "best_time"      : "19:00",
  "hashtag_themes" : ["thème1", "thème2"],
  "why"            : "Raison du choix"
}}
[/INST]"""

    response = call_mistral(prompt, max_tokens=400)
    match    = re.search(r'\{.*\}', response, re.DOTALL)
    if match:
        try:
            slot = json.loads(match.group())
            if slot.get("subject") and slot.get("platform"):
                slot["day"]  = day_name
                slot["date"] = date
                if slot.get("platform") not in platforms:
                    slot["platform"] = platforms[0]
                return slot
        except Exception:
            pass

    # Fallback
    primary = platforms[0]
    return {
        "day": day_name, "date": date, "is_rest_day": False,
        "platform": primary, "post_type": "reel",
        "subject": f"Contenu original — {niche} ({day_name})",
        "angle": "Créatif — format libre",
        "caption_idea": f"Découvrez quelque chose d'unique sur {niche}",
        "best_time": "18:00", "hashtag_themes": [niche.split()[0].lower()],
        "why": "Format polyvalent adapté à ce créneau.",
    }