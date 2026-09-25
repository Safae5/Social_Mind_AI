### `routers/hashtags/trend_fetcher.py`


# routers/hashtags/trend_fetcher.py
"""
Récupération des tendances réelles via sources multiples :

1. META GRAPH API v21 (principale — données Instagram réelles)
   Endpoints :
     GET /ig_hashtag_search?user_id={id}&q={hashtag}  → ID du hashtag
     GET /{hashtag_id}/top_media                       → Top posts
     GET /{hashtag_id}/recent_media                    → Posts récents
   Doc : https://developers.facebook.com/docs/instagram-api/reference/ig-hashtag

2. GOOGLE TRENDS via pytrends (secondaire — tendances web)
   Retourne les requêtes associées en hausse sur 7 jours.
   Géo : MA (Maroc) par défaut, configurable.

3. WEB SCRAPING BeautifulSoup (tertiaire — suggestions hashtags)
   Source : sites publics de suggestions de hashtags.

4. MISTRAL 7B FALLBACK (si toutes les autres sources échouent)
   Génère des tendances contextuelles avec l'IA.
"""

import requests
import json
import re
import time
import os
from datetime import datetime, timedelta
from bs4 import BeautifulSoup

HF_TOKEN   = os.getenv("HF_TOKEN", "hf_XXXXXXXXXXXXXXXXXXXX")
GRAPH_BASE = "https://graph.facebook.com/v21.0"
# NOTE : META_TOKEN/META_IG_ID ne sont plus des globales lues depuis l'env —
# elles doivent venir du compte Instagram connecté par l'UTILISATEUR APPELANT
# (voir HashtagSuggesterController::trends() côté Laravel). Un seul token
# process-wide servirait les données d'UN SEUL compte Meta à tous les
# utilisateurs de la plateforme — c'est le bug qui a été corrigé ici.
HF_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3"


# ================================================================
# SOURCE 1 — META GRAPH API v21
# ================================================================

def get_hashtag_id_meta(hashtag: str, access_token: str, ig_user_id: str) -> str | None:
    """
    Récupère l'ID interne Instagram d'un hashtag.

    Endpoint : GET /ig_hashtag_search
    Params   : user_id (IG Business Account de L'UTILISATEUR APPELANT), q (hashtag sans #)

    Note : Chaque compte IG Business peut faire max 30 requêtes/semaine
    sur des hashtags uniques. Utiliser le cache pour optimiser.

    Returns:
        ID du hashtag (ex: "17841563242019228") ou None
    """
    if not access_token or not ig_user_id:
        return None

    tag_clean = hashtag.lstrip("#").lower().strip()
    try:
        r = requests.get(
            f"{GRAPH_BASE}/ig_hashtag_search",
            params={
                "user_id"     : ig_user_id,
                "q"           : tag_clean,
                "access_token": access_token,
            },
            timeout=15
        )
        if r.status_code == 200:
            ids = r.json().get("data", [])
            return ids[0]["id"] if ids else None
    except Exception as e:
        print(f"   ⚠️ Meta hashtag_search '{hashtag}': {e}")
    return None


def get_hashtag_top_media(hashtag_id: str, access_token: str, ig_user_id: str) -> list[dict]:
    """
    Récupère les 10 posts les plus populaires d'un hashtag.

    Endpoint : GET /{hashtag-id}/top_media
    Fields   : like_count, comments_count, media_type, timestamp
    Limite   : 10 posts max par requête (limitation Meta)
    """
    if not access_token or not ig_user_id:
        return []
    try:
        r = requests.get(
            f"{GRAPH_BASE}/{hashtag_id}/top_media",
            params={
                "user_id"     : ig_user_id,
                "fields"      : "id,media_type,like_count,comments_count,timestamp",
                "access_token": access_token,
            },
            timeout=15
        )
        if r.status_code == 200:
            return r.json().get("data", [])
    except Exception as e:
        print(f"   ⚠️ Meta top_media: {e}")
    return []


def get_hashtag_recent_media(hashtag_id: str, access_token: str, ig_user_id: str) -> list[dict]:
    """
    Récupère les posts récents d'un hashtag.
    Utile pour détecter les tendances émergentes (pas seulement les top).

    Endpoint : GET /{hashtag-id}/recent_media
    """
    if not access_token or not ig_user_id:
        return []
    try:
        r = requests.get(
            f"{GRAPH_BASE}/{hashtag_id}/recent_media",
            params={
                "user_id"     : ig_user_id,
                "fields"      : "id,timestamp,like_count,comments_count",
                "access_token": access_token,
            },
            timeout=15
        )
        if r.status_code == 200:
            return r.json().get("data", [])
    except Exception as e:
        print(f"   ⚠️ Meta recent_media: {e}")
    return []


def fetch_trends_meta(keywords: list[str], access_token: str, ig_user_id: str) -> list[dict]:
    """
    Récupère les vraies tendances Instagram via Meta Graph API, en utilisant
    le compte Instagram Business CONNECTÉ PAR L'UTILISATEUR APPELANT
    (access_token/ig_user_id transmis par Laravel depuis son SocialAccount).

    Pour chaque mot-clé :
      1. Obtenir l'ID du hashtag (ig_hashtag_search)
      2. Récupérer les top posts (top_media)
      3. Calculer l'engagement moyen
      4. Score viral sur 10

    Rate limit Meta : 200 req/heure → pause 0.5s entre chaque appel.
    Hashtag unique : max 30 hashtags uniques/semaine par compte IG Business.
    """
    if not access_token or not ig_user_id:
        print("   ⚠️ Aucun compte Instagram connecté pour cet utilisateur — skip Meta API")
        return []

    print(f"📡 Meta Graph API — {len(keywords)} mots-clés...")
    trends = []

    for kw in keywords[:5]:
        try:
            hashtag_id = get_hashtag_id_meta(kw, access_token, ig_user_id)
            if not hashtag_id:
                continue

            top_posts = get_hashtag_top_media(hashtag_id, access_token, ig_user_id)
            if not top_posts:
                continue

            avg_likes    = sum(p.get("like_count", 0) for p in top_posts) / max(1, len(top_posts))
            avg_comments = sum(p.get("comments_count", 0) for p in top_posts) / max(1, len(top_posts))
            engagement   = avg_likes + avg_comments * 2

            if engagement > 10000:   score = 10
            elif engagement > 5000:  score = 8
            elif engagement > 1000:  score = 6
            elif engagement > 500:   score = 4
            else:                    score = 2

            trends.append({
                "titre"         : f"#{kw} — Tendance Instagram réelle",
                "description"   : (
                    f"{len(top_posts)} posts analysés · "
                    f"Likes moy. : {avg_likes:.0f} · "
                    f"Commentaires moy. : {avg_comments:.0f}"
                ),
                "hashtags"      : [f"#{kw}"],
                "format"        : "Reel / Post",
                "score_viral"   : score,
                "source"        : "meta_graph_api",
                "engagement_avg": round(engagement, 1),
            })

            time.sleep(0.5)  # Rate limit Meta

        except Exception as e:
            print(f"   ⚠️ Meta trend '{kw}': {e}")

    print(f"   ✅ {len(trends)} tendances Meta récupérées")
    return trends


# ================================================================
# SOURCE 2 — GOOGLE TRENDS via pytrends
# ================================================================

def fetch_trends_google(subject: str, geo: str = "MA") -> list[dict]:
    """
    Récupère les tendances Google sur 7 jours via pytrends.

    pytrends est une bibliothèque non-officielle qui wrappe l'API
    publique de Google Trends (pas de clé API requise).

    geo : Code pays (MA=Maroc, FR=France, MA=Maroc, DZ=Algérie)
    timeframe : "now 7-d" = 7 derniers jours

    Returns les "rising queries" (requêtes en forte hausse).
    """
    try:
        from pytrends.request import TrendReq

        print(f"🔍 Google Trends (pytrends) — geo={geo}...")
        pytrends = TrendReq(hl="fr-FR", tz=0, timeout=(10, 25))
        pytrends.build_payload(
            [subject[:100]],
            timeframe="now 7-d",
            geo=geo,
        )

        related = pytrends.related_queries()
        trends  = []

        if subject[:100] in related:
            data = related[subject[:100]]
            if data and data.get("rising") is not None:
                rising = data["rising"].head(3)
                for _, row in rising.iterrows():
                    value = int(row.get("value", 0))
                    score = min(10, max(1, value // 10))
                    trends.append({
                        "titre"      : f"{row['query']} — Requête en hausse",
                        "description": f"↑ +{value}% sur Google Trends (7 jours) · Région : {geo}",
                        "hashtags"   : [f"#{row['query'].replace(' ', '').lower()[:30]}"],
                        "format"     : "Contenu éducatif / Actualité",
                        "score_viral": score,
                        "source"     : "google_trends",
                    })

        print(f"   ✅ {len(trends)} tendances Google Trends récupérées")
        return trends

    except ImportError:
        print("   ℹ️ pytrends non installé — pip install pytrends")
        return []
    except Exception as e:
        print(f"   ⚠️ Google Trends erreur : {e}")
        return []


# ================================================================
# SOURCE 3 — WEB SCRAPING BeautifulSoup
# ================================================================

def scrape_hashtag_suggestions(subject: str) -> list[str]:
    """
    Scrape des suggestions de hashtags depuis des sites publics.
    Utilisé comme source complémentaire pour enrichir les suggestions.

    Headers navigateur pour éviter les blocages anti-bot basiques.
    """
    suggestions = []
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        )
    }

    try:
        subject_encoded = subject.replace(" ", "-").lower()[:30]
        url = (
            f"https://www.all-hashtag.com/library/contents/"
            f"ajax_gethashtags.php?filter={subject_encoded}"
        )
        r = requests.get(url, headers=headers, timeout=10)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, "lxml")
            tags = soup.find_all("span", class_="hash")
            for tag in tags[:15]:
                tag_text = tag.get_text().strip()
                if tag_text and tag_text.startswith("#"):
                    suggestions.append(tag_text)
    except Exception as e:
        print(f"   ⚠️ Web scraping hashtags: {e}")

    return suggestions


# ================================================================
# SOURCE 4 — MISTRAL 7B FALLBACK
# ================================================================

def call_mistral(prompt: str) -> str:
    """Appelle Mistral 7B via HuggingFace Inference API."""
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens": 800, "temperature": 0.7,
            "return_full_text": False, "do_sample": True,
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
            print(f"   ⚠️ Mistral trends erreur {attempt+1}: {e}")
            time.sleep(5)
    return ""


def generate_trends_mistral(subject: str, platform: str, language: str) -> dict:
    """
    Génère tendances + angles de contenu avec Mistral 7B.
    Utilisé en FALLBACK quand Meta API et Google Trends sont indisponibles,
    ou pour compléter les angles de contenu (toujours appelé).
    """
    current_month = datetime.now().strftime("%B %Y")
    prompt = f"""<s>[INST] Tu es un expert en stratégie de contenu réseaux sociaux.

NICHE : {subject}
PLATEFORME : {platform}
LANGUE : {language}
MOIS : {current_month}

Génère des tendances réalistes et des angles de contenu performants.
Réponds UNIQUEMENT avec ce JSON valide :

{{
  "tendances": [
    {{"titre": "titre court", "description": "explication 1-2 phrases", "hashtags": ["#tag1"], "format": "Reel", "score_viral": 8}},
    {{"titre": "titre 2", "description": "description 2", "hashtags": ["#tag2"], "format": "Carrousel", "score_viral": 7}},
    {{"titre": "titre 3", "description": "description 3", "hashtags": ["#tag3"], "format": "Story", "score_viral": 6}}
  ],
  "angles_contenu": [
    {{"angle": "Before/After", "description": "comment appliquer à la niche", "exemple": "exemple concret de titre", "format": "Reel", "difficulte": "Facile"}},
    {{"angle": "Mythes vs Réalités", "description": "...", "exemple": "...", "format": "Carrousel", "difficulte": "Moyen"}},
    {{"angle": "Guide débutant", "description": "...", "exemple": "...", "format": "Article", "difficulte": "Facile"}},
    {{"angle": "Coulisses", "description": "...", "exemple": "...", "format": "Story", "difficulte": "Facile"}},
    {{"angle": "Test/Comparaison", "description": "...", "exemple": "...", "format": "Vidéo", "difficulte": "Avancé"}}
  ]
}}
[/INST]"""

    response = call_mistral(prompt)
    match    = re.search(r'\{.*\}', response, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except Exception:
            cleaned = re.sub(r'[\x00-\x1f]', '', match.group())
            try:
                return json.loads(cleaned)
            except Exception:
                pass

    # Fallback structuré
    return {
        "tendances": [
            {
                "titre": f"Contenu authentique — {subject}",
                "description": "Les audiences favorisent l'authenticité et le contenu non filtré.",
                "hashtags": [f"#{subject.replace(' ','').lower()[:20]}"],
                "format": "Reel / TikTok", "score_viral": 8
            },
            {
                "titre": f"Conseils pratiques — {subject}",
                "description": "Les posts éducatifs de type tips génèrent un fort engagement.",
                "hashtags": ["#tips", "#conseils"],
                "format": "Carrousel", "score_viral": 7
            },
            {
                "titre": f"Communauté {subject} — Q&A",
                "description": "Les sessions questions-réponses créent de l'engagement communautaire.",
                "hashtags": ["#QandA"],
                "format": "Story / Live", "score_viral": 6
            },
        ],
        "angles_contenu": [
            {"angle": "Before/After",      "description": f"Transformation liée à {subject}.",       "exemple": f"30 jours de {subject} — résultats",          "format": "Reel",     "difficulte": "Facile"},
            {"angle": "Mythes vs Réalités","description": f"Déconstruire les idées reçues sur {subject}.", "exemple": f"5 MYTHES sur {subject}",              "format": "Carrousel","difficulte": "Moyen"},
            {"angle": "Guide débutant",    "description": f"Par où commencer avec {subject}.",        "exemple": f"Débutant en {subject} ? Par où commencer", "format": "Article",  "difficulte": "Facile"},
            {"angle": "Coulisses",         "description": f"Montrer le processus lié à {subject}.",  "exemple": f"Un jour dans ma vie — {subject}",            "format": "Story",    "difficulte": "Facile"},
            {"angle": "Test/Comparaison",  "description": f"Comparer des méthodes de {subject}.",    "exemple": f"J'ai testé 5 méthodes de {subject}",        "format": "Vidéo",    "difficulte": "Avancé"},
        ],
    }


# ================================================================
# FONCTION PRINCIPALE
# ================================================================

def fetch_trends(subject: str, platform: str, language: str,
                 keywords: list[str],
                 access_token: str | None = None,
                 ig_user_id: str | None = None) -> dict:
    """
    Pipeline complet de récupération des tendances.

    Ordre de priorité :
      1. Meta Graph API  → données Instagram réelles du compte CONNECTÉ
         PAR L'UTILISATEUR APPELANT (access_token/ig_user_id — absents si
         l'utilisateur n'a pas encore lié de compte Instagram : dans ce cas
         on saute simplement cette source, comme avant)
      2. Google Trends   → tendances web
      3. Mistral 7B      → complète toujours les angles de contenu

    Returns:
        dict avec tendances, angles_contenu, sources_used, métadonnées cache
    """
    print(f"📈 Récupération tendances '{subject}' sur {platform}...")

    meta_trends   = []
    google_trends = []

    # ---- 1. Meta Graph API (Instagram/Facebook uniquement) ----
    if access_token and ig_user_id and platform in ["instagram", "facebook"]:
        meta_trends = fetch_trends_meta(keywords[:5], access_token, ig_user_id)

    # ---- 2. Google Trends ----
    google_trends = fetch_trends_google(subject, geo="MA")

    # ---- 3. Mistral 7B (toujours pour les angles, complète si besoin) ----
    mistral_data = generate_trends_mistral(subject, platform, language)

    # ---- Fusion intelligente ----
    real_trends = meta_trends + google_trends

    if len(real_trends) >= 3:
        # Assez de données réelles
        final_trends = real_trends[:3]
    else:
        # Compléter avec Mistral
        mistral_trends = mistral_data.get("tendances", [])
        combined       = real_trends + mistral_trends
        final_trends   = combined[:3]

    # Trier par score viral
    final_trends.sort(key=lambda x: x.get("score_viral", 0), reverse=True)

    return {
        "tendances"      : final_trends[:3],
        "angles_contenu" : mistral_data.get("angles_contenu", [])[:5],
        "sources_used"   : {
            "meta_graph_api": len(meta_trends) > 0,
            "google_trends" : len(google_trends) > 0,
            "mistral_ai"    : True,
        },
        "generated_at": datetime.now().isoformat(),
        "cache_until" : (datetime.now() + timedelta(hours=24)).isoformat(),
        "subject"     : subject,
        "platform"    : platform,
    }