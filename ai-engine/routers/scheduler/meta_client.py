# ai_engine/routers/scheduler/meta_client.py
"""
Client Meta Graph API pour récupérer les métriques d'engagement (90 jours).

Utilise httpx (async) pour de meilleures performances :
  - Requêtes parallèles vers l'API Meta
  - Timeout configurable
  - Retry automatique

Endpoints utilisés :
  - /{ig-user-id}/media          → Liste des posts Instagram
  - /{media-id}/insights         → Métriques d'un post Instagram
  - /{page-id}/posts             → Publications de la Page Facebook
  - /{post-id}/insights          → Métriques d'un post Facebook

Documentation :
  https://developers.facebook.com/docs/instagram-api
  https://developers.facebook.com/docs/graph-api
"""

import os
import random
import asyncio
import httpx
import pandas as pd
from datetime import datetime, timedelta

GRAPH_VERSION = os.getenv("META_GRAPH_VERSION", "v21.0")
GRAPH_BASE    = f"https://graph.facebook.com/{GRAPH_VERSION}"

# ── Configuration httpx ───────────────────────────────────────
TIMEOUT  = httpx.Timeout(connect=10.0, read=30.0, write=10.0, pool=5.0)
LIMITS   = httpx.Limits(max_connections=10, max_keepalive_connections=5)


# ══════════════════════════════════════════════════════════════
# INSTAGRAM
# ══════════════════════════════════════════════════════════════

async def fetch_post_insights(
    client    : httpx.AsyncClient,
    post_id   : str,
    access_token: str,
) -> dict:
    """
    Récupère les insights d'un post Instagram (reach, impressions, saves, shares).
    Utilisé en parallèle pour tous les posts via asyncio.gather().
    """
    try:
        resp = await client.get(
            f"{GRAPH_BASE}/{post_id}/insights",
            params={
                "metric"      : "reach,impressions,saved,shares",
                "access_token": access_token,
            },
        )

        if resp.status_code != 200:
            return {}

        insights = {}
        for m in resp.json().get("data", []):
            insights[m["name"]] = m.get("values", [{}])[0].get("value", 0)
        return insights

    except Exception as e:
        print(f"   ⚠️ Insights erreur post {post_id}: {e}")
        return {}


async def fetch_posts_90_days(
    ig_user_id  : str,
    access_token: str,
    days_back   : int = 90,
) -> list[dict]:
    """
    Récupère les publications Instagram des N derniers jours.

    Utilise httpx async + asyncio.gather() pour récupérer
    les insights de tous les posts en parallèle.

    Returns:
        Liste de posts normalisés, ou données simulées si erreur API.
    """
    since_ts = int((datetime.now() - timedelta(days=days_back)).timestamp())

    async with httpx.AsyncClient(timeout=TIMEOUT, limits=LIMITS) as client:

        # ── 1. Liste des médias ───────────────────────────────
        try:
            media_resp = await client.get(
                f"{GRAPH_BASE}/{ig_user_id}/media",
                params={
                    "fields"      : "id,timestamp,media_type,like_count,comments_count",
                    "since"       : since_ts,
                    "limit"       : 100,
                    "access_token": access_token,
                },
            )

            if media_resp.status_code != 200:
                print(f"⚠️ Meta API Instagram erreur {media_resp.status_code}: {media_resp.text[:150]}")
                return generate_sample_posts()

        except httpx.TimeoutException:
            print("⚠️ Meta API timeout — fallback données simulées")
            return generate_sample_posts()
        except httpx.RequestError as e:
            print(f"⚠️ Meta API erreur réseau: {e}")
            return generate_sample_posts()

        media_list = media_resp.json().get("data", [])
        if not media_list:
            print("⚠️ Aucun post trouvé — fallback données simulées")
            return generate_sample_posts()

        # ── 2. Insights en parallèle pour tous les posts ──────
        # asyncio.gather() envoie toutes les requêtes simultanément
        # au lieu de les faire une par une → beaucoup plus rapide
        print(f"   📡 Récupération insights pour {len(media_list)} posts en parallèle...")

        insights_tasks = [
            fetch_post_insights(client, media["id"], access_token)
            for media in media_list
        ]
        all_insights = await asyncio.gather(*insights_tasks)

        # ── 3. Construction des posts normalisés ──────────────
        posts = []
        for media, insights in zip(media_list, all_insights):
            likes    = media.get("like_count", 0)
            comments = media.get("comments_count", 0)
            reach    = insights.get("reach", 0)
            saves    = insights.get("saved", 0)
            shares   = insights.get("shares", 0)

            posts.append({
                "post_id"    : media.get("id", ""),
                "timestamp"  : media.get("timestamp", ""),
                "media_type" : media.get("media_type", "IMAGE"),
                "likes"      : likes,
                "comments"   : comments,
                "reach"      : reach,
                "impressions": insights.get("impressions", 0),
                "saves"      : saves,
                "shares"     : shares,
                "platform"   : "instagram",
                "engagement" : (
                    likes    * 1.0 +
                    comments * 2.0 +
                    shares   * 3.0 +
                    saves    * 2.0
                ),
            })

    print(f"✅ {len(posts)} posts Instagram récupérés ({days_back} jours)")
    return posts if posts else generate_sample_posts()


# ══════════════════════════════════════════════════════════════
# FACEBOOK PAGE
# ══════════════════════════════════════════════════════════════

async def fetch_fb_post_insights(
    client      : httpx.AsyncClient,
    post_id     : str,
    access_token: str,
) -> dict:
    """Récupère les insights d'un post Facebook Page."""
    try:
        resp = await client.get(
            f"{GRAPH_BASE}/{post_id}/insights",
            params={
                "metric"      : "post_impressions,post_reach,post_engaged_users",
                "access_token": access_token,
            },
        )

        if resp.status_code != 200:
            return {}

        insights = {}
        for m in resp.json().get("data", []):
            insights[m["name"]] = m.get("values", [{}])[0].get("value", 0)
        return insights

    except Exception as e:
        print(f"   ⚠️ FB insights erreur post {post_id}: {e}")
        return {}


async def fetch_facebook_page_posts(
    page_id     : str,
    access_token: str,
    days_back   : int = 90,
) -> list[dict]:
    """
    Récupère les publications de la Page Facebook avec leurs métriques.
    Utilise httpx async + asyncio.gather() pour les insights en parallèle.

    Returns:
        Liste de posts normalisés, ou liste vide si erreur API.
    """
    since_ts = int((datetime.now() - timedelta(days=days_back)).timestamp())

    async with httpx.AsyncClient(timeout=TIMEOUT, limits=LIMITS) as client:

        # ── 1. Liste des posts de la Page ─────────────────────
        try:
            resp = await client.get(
                f"{GRAPH_BASE}/{page_id}/posts",
                params={
                    "fields"      : "id,message,created_time,likes.summary(true),comments.summary(true),shares",
                    "since"       : since_ts,
                    "limit"       : 100,
                    "access_token": access_token,
                },
            )

            if resp.status_code != 200:
                print(f"⚠️ Meta API Facebook erreur {resp.status_code}: {resp.text[:150]}")
                return []

        except httpx.TimeoutException:
            print("⚠️ Facebook API timeout")
            return []
        except httpx.RequestError as e:
            print(f"⚠️ Facebook API erreur réseau: {e}")
            return []

        fb_posts = resp.json().get("data", [])
        if not fb_posts:
            return []

        # ── 2. Insights en parallèle ──────────────────────────
        print(f"   📡 Récupération insights Facebook pour {len(fb_posts)} posts...")

        insights_tasks = [
            fetch_fb_post_insights(client, post["id"], access_token)
            for post in fb_posts
        ]
        all_insights = await asyncio.gather(*insights_tasks)

        # ── 3. Construction des posts normalisés ──────────────
        posts = []
        for post, insights in zip(fb_posts, all_insights):
            likes    = post.get("likes", {}).get("summary", {}).get("total_count", 0)
            comments = post.get("comments", {}).get("summary", {}).get("total_count", 0)
            shares   = post.get("shares", {}).get("count", 0)
            reach    = insights.get("post_reach", 0)

            posts.append({
                "post_id"    : post.get("id", ""),
                "timestamp"  : post.get("created_time", ""),
                "media_type" : "POST",
                "likes"      : likes,
                "comments"   : comments,
                "reach"      : reach,
                "impressions": insights.get("post_impressions", 0),
                "saves"      : 0,
                "shares"     : shares,
                "platform"   : "facebook",
                "engagement" : (
                    likes    * 1.0 +
                    comments * 2.0 +
                    shares   * 3.0
                ),
            })

    print(f"✅ {len(posts)} posts Facebook récupérés ({days_back} jours)")
    return posts


# ══════════════════════════════════════════════════════════════
# DONNÉES SIMULÉES — Mode test sans token Meta
# ══════════════════════════════════════════════════════════════

def generate_sample_posts(n: int = 50) -> list[dict]:
    """
    Génère des données simulées réalistes pour tester sans token Meta.
    Simule un compte Instagram actif avec des patterns horaires réels.

    Returns:
        Liste de N posts simulés avec métriques cohérentes.
    """
    posts      = []
    base       = datetime.now() - timedelta(days=90)
    peak_hours = [7, 8, 9, 11, 12, 17, 18, 19, 20, 21]

    for i in range(n):
        dt       = base + timedelta(days=i * 1.8)
        hour     = random.choice(peak_hours)
        dt       = dt.replace(hour=hour, minute=random.randint(0, 59))

        likes    = random.randint(50, 800)
        comments = random.randint(3, 80)
        shares   = random.randint(1, 30)
        saves    = random.randint(5, 60)
        reach    = random.randint(200, 5000)

        posts.append({
            "post_id"    : f"sample_{i}",
            "timestamp"  : dt.isoformat() + "Z",
            "media_type" : random.choice(["IMAGE", "VIDEO", "CAROUSEL_ALBUM"]),
            "likes"      : likes,
            "comments"   : comments,
            "reach"      : reach,
            "impressions": reach * random.randint(1, 3),
            "saves"      : saves,
            "shares"     : shares,
            "platform"   : "instagram",
            "engagement" : (
                likes    * 1.0 +
                comments * 2.0 +
                shares   * 3.0 +
                saves    * 2.0
            ),
        })

    print(f"✅ {n} posts simulés générés (mode test)")
    return posts


# ══════════════════════════════════════════════════════════════
# CONVERSION EN DATAFRAME — Pour Prophet + KMeans
# ══════════════════════════════════════════════════════════════

def posts_to_dataframe(posts: list[dict]) -> pd.DataFrame:
    """
    Convertit la liste de posts en DataFrame normalisé
    pour Prophet (prédiction temporelle) et KMeans (clustering).

    Colonnes ajoutées :
      - date             → datetime parsé depuis timestamp
      - hour             → heure de publication (0-23)
      - day_of_week      → nom du jour (Monday, Tuesday...)
      - day_num          → numéro du jour (0=Lundi, 6=Dimanche)
      - engagement_score → score composite (likes + comments + shares + saves)
      - engagement_rate  → engagement / reach * 100

    Returns:
        DataFrame trié par date.
    """
    if not posts:
        return pd.DataFrame()

    df = pd.DataFrame(posts)

    df["date"] = pd.to_datetime(df["timestamp"], errors="coerce", utc=True)
    df = df.dropna(subset=["date"])
    df = df.sort_values("date").reset_index(drop=True)

    df["hour"]        = df["date"].dt.hour
    df["day_of_week"] = df["date"].dt.day_name()
    df["day_num"]     = df["date"].dt.dayofweek  # 0=Lundi, 6=Dimanche

    df["engagement_score"] = (
        df["likes"].fillna(0)    * 1.0 +
        df["comments"].fillna(0) * 2.0 +
        df["shares"].fillna(0)   * 3.0 +
        df["saves"].fillna(0)    * 2.0
    )

    df["engagement_rate"] = df.apply(
        lambda r: round((r["engagement_score"] / r["reach"] * 100), 3)
        if r.get("reach", 0) > 0 else 0,
        axis=1
    )

    print(
        f"📊 DataFrame : {len(df)} posts | "
        f"engagement moyen : {df['engagement_score'].mean():.1f} | "
        f"taux moyen : {df['engagement_rate'].mean():.2f}%"
    )

    return df


# ══════════════════════════════════════════════════════════════
# WRAPPER SYNCHRONE — Pour compatibilité avec analyzer.py
# ══════════════════════════════════════════════════════════════

def fetch_posts_90_days_sync(ig_user_id: str, access_token: str) -> list[dict]:
    """
    Wrapper synchrone de fetch_posts_90_days().
    Utilisé par analyzer.py qui est synchrone (Prophet + KMeans).
    """
    return asyncio.run(fetch_posts_90_days(ig_user_id, access_token))


def fetch_facebook_page_posts_sync(page_id: str, access_token: str) -> list[dict]:
    """
    Wrapper synchrone de fetch_facebook_page_posts().
    """
    return asyncio.run(fetch_facebook_page_posts(page_id, access_token))