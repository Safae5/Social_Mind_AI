### `routers/hashtags/hashtag_generator.py`


# routers/hashtags/hashtag_generator.py
"""
Génération hashtags catégorisés avec Mistral 7B.
Modèle : mistralai/Mistral-7B-Instruct-v0.3
Lien   : https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.3
"""

import requests, json, re, time, os
from .volume_scorer import categorize_hashtags, build_optimal_set, get_strategy_advice

HF_TOKEN   = os.getenv("HF_TOKEN", "hf_XXXXXXXXXXXXXXXXXXXX")
HF_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3"


def call_mistral(prompt: str, max_tokens: int = 1000) -> str:
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens": max_tokens, "temperature": 0.6,
            "return_full_text": False, "do_sample": True,
            "top_p": 0.9, "repetition_penalty": 1.15,
        }
    }
    for attempt in range(3):
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


def build_hashtag_prompt(subject: str, platform: str, language: str,
                          keywords: list[str], n: int) -> str:
    platform_notes = {
        "instagram": f"Instagram accepte jusqu'à 30 hashtags. Générer {n} hashtags optimisés.",
        "tiktok"   : f"TikTok : inclure #fyp #pourtoi. Générer {n} hashtags.",
        "facebook" : f"Facebook : rester très ciblé. Générer {n} hashtags.",
        "linkedin" : f"LinkedIn : hashtags professionnels uniquement. Générer {n}.",
        "twitter"  : f"Twitter/X : hashtags courts percutants. Générer {n}.",
    }
    kw_str = ", ".join(keywords[:8]) if keywords else subject

    return f"""<s>[INST] Tu es un expert en marketing des réseaux sociaux et en stratégie de hashtags.

SUJET / NICHE : {subject}
PLATEFORME    : {platform}
LANGUE        : {language}
MOTS-CLÉS DÉTECTÉS : {kw_str}
NOTE : {platform_notes.get(platform.lower(), platform_notes['instagram'])}

Génère exactement {n} hashtags pertinents et optimisés.

RÈGLES STRICTES :
1. Hashtags SANS espace (seulement lettres, chiffres, underscores)
2. Commencer TOUJOURS par #
3. Mélanger français, anglais et termes de la niche
4. haut_volume = hashtags larges, universels (millions de posts réels)
5. moyen_volume = hashtags ciblés (centaines de milliers de posts)
6. niche = hashtags très spécifiques au sujet (dizaines de milliers)
7. Tous doivent être réalistes et réellement utilisés

Réponds UNIQUEMENT avec ce JSON valide :

{{
  "haut_volume": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
  "moyen_volume": ["#tag6", "#tag7", "#tag8", "#tag9", "#tag10", "#tag11"],
  "niche": ["#tag12", "#tag13", "#tag14", "#tag15", "#tag16", "#tag17", "#tag18"]
}}
[/INST]"""


def parse_hashtag_response(text: str) -> dict:
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        try:
            data   = json.loads(match.group())
            result = {
                "haut_volume" : data.get("haut_volume",  data.get("high",   [])),
                "moyen_volume": data.get("moyen_volume", data.get("medium", [])),
                "niche"       : data.get("niche", []),
            }
            for key in result:
                result[key] = [
                    f"#{t.lstrip('#').strip()}"
                    for t in result[key]
                    if isinstance(t, str) and len(t.strip()) > 1
                ]
            return result
        except Exception:
            cleaned = re.sub(r'[\x00-\x1f]', '', match.group())
            try:
                return json.loads(cleaned)
            except Exception:
                pass
    return {}


def fallback_hashtags(subject: str, platform: str) -> dict:
    base = subject.replace(" ", "").lower()[:15]
    return {
        "haut_volume" : ["#instagood", "#photooftheday", "#trending", "#viral",
                         "#fyp" if platform == "tiktok" else "#reels"],
        "moyen_volume": [f"#{base}", "#contenu", "#marketing",
                         "#socialmedia", "#digital", "#tips"],
        "niche"       : [f"#{base}tips", f"#{base}community", f"#{base}lovers",
                         f"#{base}life", f"#{base}daily", f"#{base}inspiration"],
    }


def generate_hashtags(subject: str, platform: str, language: str,
                       keywords: list[str], n_hashtags: int = 25) -> dict:
    """Pipeline complet de génération de hashtags avec Mistral 7B."""
    print(f"🏷️ Génération {n_hashtags} hashtags pour '{subject}' sur {platform}...")

    prompt   = build_hashtag_prompt(subject, platform, language, keywords, n_hashtags)
    response = call_mistral(prompt, max_tokens=800)
    raw      = parse_hashtag_response(response)

    if not raw or sum(len(v) for v in raw.values()) < 3:
        print("   🔄 Fallback hashtags de secours")
        raw = fallback_hashtags(subject, platform)

    all_tags = raw.get("haut_volume", []) + raw.get("moyen_volume", []) + raw.get("niche", [])

    # Dédupliquer
    seen, unique = set(), []
    for tag in all_tags:
        clean = tag.lstrip("#").lower()
        if clean not in seen:
            seen.add(clean)
            unique.append(tag)

    categorized = categorize_hashtags(unique)
    optimal_set = build_optimal_set(categorized, min(n_hashtags, len(unique)))
    strategy    = get_strategy_advice(categorized, platform)

    print(f"   ✅ {len(unique)} hashtags générés et catégorisés")
    return {
        "categorized"    : categorized,
        "optimal_set"    : optimal_set,
        "strategy"       : strategy,
        "total"          : len(unique),
        "raw_by_category": raw,
    }