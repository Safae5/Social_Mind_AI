## PHASE 3 — MODULES PYTHON AI ENGINE

### `routers/weekly_report/meta_fetcher.py`


# routers/weekly_report/meta_fetcher.py
"""
Récupération des métriques hebdomadaires via Meta Graph API v21.

Métriques récupérées sur les 7 derniers jours :
  - Portée totale (reach) de toutes les publications
  - Engagement total (likes + comments + shares + saves)
  - Nombre de nouveaux abonnés
  - Meilleure publication (la plus forte en engagement)
  - Publications par type (image, vidéo, reel, carrousel)

Documentation Meta Graph API :
  https://developers.facebook.com/docs/instagram-api/reference/ig-user/media
  https://developers.facebook.com/docs/instagram-api/reference/ig-media/insights

Mode test :
  Utiliser generate_sample_metrics() et generate_sample_4weeks()
  quand META_ACCESS_TOKEN n'est pas configuré.
"""

import requests
import os
from datetime import datetime, timedelta

GRAPH_BASE    = f"https://graph.facebook.com/{os.getenv('META_GRAPH_VERSION', 'v21.0')}"
# Instagram API with Instagram Login (compte connecté directement, sans Page
# Facebook liée) — jeton et espace d'ID totalement distincts de graph.facebook.com,
# confirmé en direct : un jeton Instagram Login est rejeté par graph.facebook.com
# ("Cannot parse access token") et vice versa. Voir aussi : le champ "impressions"
# fait échouer TOUT le batch d'insights sur cette surface ("does not support the
# impressions metric for this media product type") — reach/saved/shares seuls
# fonctionnent, confirmé en direct par appel individuel puis groupé.
GRAPH_BASE_IG = f"https://graph.instagram.com/{os.getenv('META_GRAPH_VERSION', 'v21.0')}"


def fetch_weekly_metrics(ig_user_id: str, access_token: str, platform: str = "instagram",
                          days_back: int = 7) -> dict:
    """
    Récupère toutes les métriques de la semaine écoulée.

    Args:
        ig_user_id   : ID du compte Instagram Business, ou id de Page Facebook
        access_token : Long-Lived Token Meta Graph API
        platform     : "instagram", "instagram_direct" ou "facebook" —
                       sélectionne les bons endpoints Graph API ("direct" =
                       compte connecté via Instagram Login, sans Page Facebook
                       liée : hôte graph.instagram.com et jeton incompatibles
                       avec les deux autres platforms)
        days_back    : nombre de jours à analyser (7 par défaut)

    Returns:
        dict avec total_reach, total_engagement, followers_gained,
        best_post, all_posts, period
    """
    graph_base = GRAPH_BASE_IG if platform == "instagram_direct" else GRAPH_BASE

    if platform == "facebook":
        posts = _fetch_facebook_posts(ig_user_id, access_token, days_back)
    else:
        posts = _fetch_instagram_posts(ig_user_id, access_token, days_back, graph_base,
                                        direct_login=(platform == "instagram_direct"))

    followers_now  = _get_followers_count(ig_user_id, access_token, graph_base)
    followers_week = (
        followers_now if platform in ("facebook", "instagram_direct")
        else _get_followers_week_ago(ig_user_id, access_token)
    )
    # Pour instagram_direct comme pour facebook, l'insight historique de
    # nombre d'abonnés n'est pas disponible sur cette surface (non testé /
    # non documenté par Meta pour Instagram Login) — on retombe honnêtement
    # sur la valeur actuelle plutôt que de deviner un endpoint.
    # page_fans / page_fan_adds (l'équivalent Facebook de follower_count) ont
    # été retirées des Insights Meta (confirmé dans social_manager/meta_client.py) —
    # inutile d'appeler un endpoint qui répondra toujours 400 : on retombe sur
    # la valeur actuelle, ce qui donne honnêtement gained=lost=0 plutôt qu'un
    # calcul basé sur une métrique qui n'existe plus.

    return {
        "period"          : {
            "start": (datetime.now() - timedelta(days=7)).strftime("%d/%m/%Y"),
            "end"  : datetime.now().strftime("%d/%m/%Y"),
        },
        "total_posts"     : len(posts),
        "total_reach"     : sum(p["reach"]      for p in posts),
        "total_engagement": sum(p["engagement"] for p in posts),
        "total_likes"     : sum(p["likes"]      for p in posts),
        "total_comments"  : sum(p["comments"]   for p in posts),
        "total_shares"    : sum(p["shares"]      for p in posts),
        "total_saves"     : sum(p["saves"]       for p in posts),
        "followers_now"   : followers_now,
        "followers_gained": max(0, followers_now - followers_week),
        "followers_lost"  : max(0, followers_week - followers_now),
        "best_post"       : max(posts, key=lambda p: p["engagement"]) if posts else None,
        "all_posts"       : posts,
    }


def _fetch_instagram_posts(ig_user_id: str, access_token: str, days_back: int,
                            graph_base: str = GRAPH_BASE, direct_login: bool = False) -> list[dict]:
    """
    Pipeline par post (Instagram Business) :
      1. GET /{ig_user_id}/media  → liste des publications
      2. GET /{post_id}/insights  → reach, saves, shares par post
      3. Calcul engagement = likes×1 + comments×2 + shares×3 + saves×2

    "impressions" fait échouer tout le batch d'insights sur la surface
    Instagram Login (confirmé en direct) — on ne le demande pas dans ce cas.
    """
    since_ts = int((datetime.now() - timedelta(days=days_back)).timestamp())
    insight_metrics = "reach,saved,shares" if direct_login else "reach,impressions,saved,shares"

    media_resp = requests.get(
        f"{graph_base}/{ig_user_id}/media",
        params={
            "fields"      : "id,caption,timestamp,media_type,like_count,comments_count",
            "since"       : since_ts,
            "limit"       : 50,
            "access_token": access_token,
        },
        timeout=15
    )

    posts = []
    if media_resp.status_code == 200:
        for post in media_resp.json().get("data", []):
            insights_resp = requests.get(
                f"{graph_base}/{post['id']}/insights",
                params={"metric": insight_metrics, "access_token": access_token},
                timeout=15
            )
            insights = {}
            if insights_resp.status_code == 200:
                for item in insights_resp.json().get("data", []):
                    insights[item["name"]] = item["values"][0]["value"]

            engagement = (
                post.get("like_count", 0) * 1 +
                post.get("comments_count", 0) * 2 +
                insights.get("shares", 0) * 3 +
                insights.get("saved", 0) * 2
            )

            posts.append({
                "id"        : post["id"],
                "caption"   : (post.get("caption") or "")[:150],
                "timestamp" : post.get("timestamp"),
                "media_type": post.get("media_type", "IMAGE"),
                "likes"     : post.get("like_count", 0),
                "comments"  : post.get("comments_count", 0),
                "reach"     : insights.get("reach", 0),
                "shares"    : insights.get("shares", 0),
                "saves"     : insights.get("saved", 0),
                "engagement": engagement,
            })

    return posts


def _fetch_facebook_posts(page_id: str, access_token: str, days_back: int) -> list[dict]:
    """
    Pipeline par post (Page Facebook).

    /{ig_user_id}/media n'existe pas pour une Page — l'edge posts est
    /{page_id}/posts, avec likes/comments/shares directement inclus dans les
    fields (pas besoin d'un round-trip /insights par post). reach et
    impressions post-level ont été retirées de l'API Graph (confirmé en
    direct dans social_manager/meta_client.py : "(#100) The value must be a
    valid insights metric") — on ne les fabrique pas, reach reste 0.
    """
    since_ts = int((datetime.now() - timedelta(days=days_back)).timestamp())

    posts_resp = requests.get(
        f"{GRAPH_BASE}/{page_id}/posts",
        params={
            "fields"      : "id,message,created_time,"
                            "likes.summary(true),comments.summary(true),shares",
            "since"       : since_ts,
            "limit"       : 50,
            "access_token": access_token,
        },
        timeout=15
    )

    posts = []
    if posts_resp.status_code == 200:
        for post in posts_resp.json().get("data", []):
            likes    = post.get("likes",    {}).get("summary", {}).get("total_count", 0)
            comments = post.get("comments", {}).get("summary", {}).get("total_count", 0)
            shares   = post.get("shares", {}).get("count", 0)

            posts.append({
                "id"        : post["id"],
                "caption"   : (post.get("message") or "")[:150],
                "timestamp" : post.get("created_time"),
                "media_type": "IMAGE",
                "likes"     : likes,
                "comments"  : comments,
                "reach"     : 0,
                "shares"    : shares,
                "saves"     : 0,
                "engagement": likes * 1 + comments * 2 + shares * 3,
            })

    return posts


def _get_followers_count(ig_user_id: str, access_token: str, graph_base: str = GRAPH_BASE) -> int:
    """Récupère le nombre actuel d'abonnés."""
    resp = requests.get(
        f"{graph_base}/{ig_user_id}",
        params={"fields": "followers_count", "access_token": access_token},
        timeout=10
    )
    if resp.status_code == 200:
        return resp.json().get("followers_count", 0)
    return 0


def _get_followers_week_ago(ig_user_id: str, access_token: str) -> int:
    """
    Estime le nombre d'abonnés il y a 7 jours via insights.
    Fallback = valeur actuelle si l'endpoint n'est pas disponible.
    """
    resp = requests.get(
        f"{GRAPH_BASE}/{ig_user_id}/insights",
        params={
            "metric"      : "follower_count",
            "period"      : "day",
            "since"       : int((datetime.now() - timedelta(days=8)).timestamp()),
            "until"       : int((datetime.now() - timedelta(days=7)).timestamp()),
            "access_token": access_token,
        },
        timeout=10
    )
    if resp.status_code == 200:
        data = resp.json().get("data", [])
        if data and data[0].get("values"):
            return data[0]["values"][0].get("value", 0)
    return _get_followers_count(ig_user_id, access_token)


def fetch_4_weeks_trend(ig_user_id: str, access_token: str, platform: str = "instagram") -> list[dict]:
    """
    Récupère les métriques des 4 dernières semaines pour le graphique Chart.js.

    Returns:
        Liste de 4 dicts : [{week_label, week_dates, reach, engagement, posts_count}]
    """
    weeks = []
    for week_offset in range(4, 0, -1):
        week_start = datetime.now() - timedelta(weeks=week_offset)
        week_end   = datetime.now() - timedelta(weeks=week_offset - 1)

        if platform == "facebook":
            week_reach, week_engagement, posts_count = _fetch_facebook_week_trend(
                ig_user_id, access_token, week_start, week_end
            )
        else:
            graph_base = GRAPH_BASE_IG if platform == "instagram_direct" else GRAPH_BASE
            week_reach, week_engagement, posts_count = _fetch_instagram_week_trend(
                ig_user_id, access_token, week_start, week_end, graph_base
            )

        weeks.append({
            "week_label" : f"Sem. {5 - week_offset}",
            "week_dates" : f"{week_start.strftime('%d/%m')} – {week_end.strftime('%d/%m')}",
            "reach"      : week_reach,
            "engagement" : week_engagement,
            "posts_count": posts_count,
        })

    return weeks


def _fetch_instagram_week_trend(ig_user_id: str, access_token: str,
                                 week_start: datetime, week_end: datetime,
                                 graph_base: str = GRAPH_BASE) -> tuple[int, int, int]:
    resp = requests.get(
        f"{graph_base}/{ig_user_id}/media",
        params={
            "fields"      : "id,like_count,comments_count,timestamp",
            "since"       : int(week_start.timestamp()),
            "until"       : int(week_end.timestamp()),
            "limit"       : 50,
            "access_token": access_token,
        },
        timeout=15
    )

    week_reach      = 0
    week_engagement = 0
    posts_count     = 0

    if resp.status_code == 200:
        for post in resp.json().get("data", []):
            ins_resp = requests.get(
                f"{graph_base}/{post['id']}/insights",
                params={"metric": "reach", "access_token": access_token},
                timeout=10
            )
            if ins_resp.status_code == 200:
                for item in ins_resp.json().get("data", []):
                    if item["name"] == "reach":
                        week_reach += item["values"][0]["value"]
            week_engagement += (
                post.get("like_count", 0) + post.get("comments_count", 0) * 2
            )
            posts_count += 1

    return week_reach, week_engagement, posts_count


def _fetch_facebook_week_trend(page_id: str, access_token: str,
                                week_start: datetime, week_end: datetime) -> tuple[int, int, int]:
    """
    Reach post-level n'existe plus côté Graph API (voir _fetch_facebook_posts) —
    week_reach reste honnêtement 0 plutôt que d'appeler un endpoint /insights
    qui répondrait systématiquement une erreur permanente.
    """
    resp = requests.get(
        f"{GRAPH_BASE}/{page_id}/posts",
        params={
            "fields"      : "id,likes.summary(true),comments.summary(true),shares,created_time",
            "since"       : int(week_start.timestamp()),
            "until"       : int(week_end.timestamp()),
            "limit"       : 50,
            "access_token": access_token,
        },
        timeout=15
    )

    week_engagement = 0
    posts_count     = 0

    if resp.status_code == 200:
        for post in resp.json().get("data", []):
            likes    = post.get("likes",    {}).get("summary", {}).get("total_count", 0)
            comments = post.get("comments", {}).get("summary", {}).get("total_count", 0)
            shares   = post.get("shares", {}).get("count", 0)
            week_engagement += likes + comments * 2 + shares * 3
            posts_count += 1

    return 0, week_engagement, posts_count


def generate_sample_metrics() -> dict:
    """
    Génère des métriques simulées réalistes pour les tests.
    Utilisé quand META_ACCESS_TOKEN n'est pas encore configuré.
    """
    import random
    random.seed(42)

    posts = []
    for i in range(5):
        likes    = random.randint(80, 500)
        comments = random.randint(5, 40)
        reach    = random.randint(500, 3000)
        shares   = random.randint(2, 20)
        saves    = random.randint(5, 50)
        posts.append({
            "id"        : f"post_{i+1}",
            "caption"   : f"Publication test #{i+1} — contenu simulé pour démonstration",
            "timestamp" : (datetime.now() - timedelta(days=i+1)).isoformat(),
            "media_type": random.choice(["IMAGE", "VIDEO", "CAROUSEL_ALBUM"]),
            "likes"     : likes,
            "comments"  : comments,
            "reach"     : reach,
            "shares"    : shares,
            "saves"     : saves,
            "engagement": likes + comments * 2 + shares * 3 + saves * 2,
        })

    return {
        "period"          : {
            "start": (datetime.now() - timedelta(days=7)).strftime("%d/%m/%Y"),
            "end"  : datetime.now().strftime("%d/%m/%Y"),
        },
        "total_posts"     : len(posts),
        "total_reach"     : sum(p["reach"]      for p in posts),
        "total_engagement": sum(p["engagement"] for p in posts),
        "total_likes"     : sum(p["likes"]      for p in posts),
        "total_comments"  : sum(p["comments"]   for p in posts),
        "total_shares"    : sum(p["shares"]      for p in posts),
        "total_saves"     : sum(p["saves"]       for p in posts),
        "followers_now"   : 1247,
        "followers_gained": 23,
        "followers_lost"  : 5,
        "best_post"       : max(posts, key=lambda p: p["engagement"]),
        "all_posts"       : posts,
    }


def generate_sample_4weeks() -> list[dict]:
    """Génère 4 semaines simulées pour les graphiques Chart.js."""
    import random
    random.seed(42)
    weeks   = []
    base    = 4000
    for i in range(4):
        base += random.randint(-300, 600)
        weeks.append({
            "week_label" : f"Sem. {i + 1}",
            "week_dates" : f"Semaine {i + 1}",
            "reach"      : max(500, base),
            "engagement" : max(100, int(base * 0.08) + random.randint(-50, 100)),
            "posts_count": random.randint(3, 7),
        })
    return weeks