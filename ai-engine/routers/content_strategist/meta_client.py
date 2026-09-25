### `routers/content_strategist/meta_client.py`


# routers/content_strategist/meta_client.py
"""
Client Meta Graph API v21 pour récupérer les publications concurrentes.

Pourquoi l'API Meta au lieu d'un CSV Kaggle ?
  - Données TEMPS RÉEL : publications des dernières heures/jours
  - Hashtags actuels utilisés par les concurrents dans la niche
  - Métriques d'engagement réelles (likes, comments, shares)
  - Pas de données périmées ou hors contexte

Endpoints utilisés :
  GET /{page_id}/posts     → Publications récentes d'une page
  GET /{post_id}/insights  → Métriques d'un post
  GET /search              → Recherche de pages par niche

Documentation : https://developers.facebook.com/docs/graph-api/reference/

Limites API gratuite :
  - 200 appels/heure par token utilisateur
  - Insights disponibles sur 90 jours max
  - Seules les pages publiques accessibles sans token de page
"""

import requests
import time
import re
from datetime import datetime, timedelta
from typing import Optional


GRAPH_BASE = "https://graph.facebook.com/v21.0"


class MetaGraphClient:
    """Client pour l'API Meta Graph v21 — récupération données concurrentes."""

    def __init__(self, access_token: str):
        self.token   = access_token
        self.session = requests.Session()

    def _get(self, endpoint: str, params: dict = None, retries: int = 3) -> dict:
        """GET avec retry automatique sur rate limit."""
        url    = f"{GRAPH_BASE}/{endpoint}"
        params = params or {}
        params["access_token"] = self.token

        for attempt in range(retries):
            try:
                r = self.session.get(url, params=params, timeout=30)
                if r.status_code == 429:
                    print("   ⏳ Rate limit Meta — pause 60s...")
                    time.sleep(60)
                    continue
                r.raise_for_status()
                return r.json()
            except requests.RequestException as e:
                print(f"   ⚠️ Meta API {attempt+1}/{retries}: {e}")
                time.sleep(5 * (attempt + 1))
        return {}

    def get_page_posts(self, page_id: str, limit: int = 100,
                       days_back: int = 90) -> list[dict]:
        """
        Récupère les publications récentes d'une page concurrente.

        Args:
            page_id  : ID ou username de la page Facebook/Instagram
            limit    : nombre max de posts à récupérer
            days_back: période en jours (max 90 pour l'API gratuite)

        Returns:
            Liste de posts avec texte, hashtags, métriques
        """
        since = int((datetime.now() - timedelta(days=days_back)).timestamp())
        params = {
            "fields": "id,message,story,created_time,permalink_url",
            "limit" : min(limit, 100),
            "since" : since,
        }

        data  = self._get(f"{page_id}/posts", params=params)
        posts = data.get("data", [])
        print(f"   📊 {len(posts)} posts récupérés pour {page_id}")
        return posts

    def get_post_engagement(self, post_id: str) -> dict:
        """Métriques d'engagement d'un post (likes, comments, shares)."""
        data = self._get(f"{post_id}", params={
            "fields": "reactions.summary(true),comments.summary(true),shares"
        })
        return {
            "likes"   : data.get("reactions", {}).get("summary", {}).get("total_count", 0),
            "comments": data.get("comments",  {}).get("summary", {}).get("total_count", 0),
            "shares"  : data.get("shares",    {}).get("count", 0),
        }

    def collect_competitor_corpus(self, page_ids: list[str],
                                   days_back: int = 90) -> list[dict]:
        """
        Collecte le corpus complet de publications concurrentes.

        Pour chaque page : récupère les posts + métriques + hashtags extraits.

        Returns:
            Liste de dicts prêts pour BERTopic/LDA :
            {page_id, text, hashtags, likes, comments, shares, date}
        """
        print(f"📊 Collecte corpus concurrent (Meta Graph API v21)...")
        corpus = []

        for page_id in page_ids:
            posts = self.get_page_posts(page_id, limit=50, days_back=days_back)

            for post in posts:
                text = post.get("message") or post.get("story") or ""
                if not text.strip():
                    continue

                # Extraire les hashtags du texte
                hashtags = re.findall(r"#(\w+)", text.lower())
                hashtags = [h for h in hashtags if len(h) > 2]

                corpus.append({
                    "page_id"  : page_id,
                    "post_id"  : post.get("id", ""),
                    "text"     : text,
                    "hashtags" : hashtags,
                    "date"     : post.get("created_time", ""),
                    "url"      : post.get("permalink_url", ""),
                    "platform" : "facebook",
                })
                time.sleep(0.1)   # Rate limiting respectueux

        print(f"   ✅ {len(corpus)} publications collectées pour {len(page_ids)} pages")
        return corpus

    def search_pages_by_niche(self, niche: str, limit: int = 10) -> list[dict]:
        """
        Recherche des pages Facebook liées à une niche.
        Utile pour découvrir automatiquement les concurrents.

        Args:
            niche : mot-clé de la niche (ex: "mode maroc", "fitness")

        Returns:
            Liste de pages {id, name, fan_count, category}
        """
        data = self._get("search", params={
            "q"     : niche,
            "type"  : "page",
            "fields": "id,name,fan_count,category",
            "limit" : limit,
        })
        pages = data.get("data", [])
        print(f"   🔍 {len(pages)} pages trouvées pour '{niche}'")
        return pages