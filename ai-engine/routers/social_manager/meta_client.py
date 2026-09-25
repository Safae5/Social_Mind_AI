### `routers/social_manager/meta_client.py`


# routers/social_manager/meta_client.py
"""
Client Meta Graph API v21.

Fonctionnalités :
  - Récupération des pages Facebook et comptes Instagram Business
  - Fetch historique d'engagement (posts + insights sur 90 jours)
  - Fetch commentaires entrants avec pagination
  - Publication de posts (texte, image, vidéo)
  - Récupération métriques en temps réel

Endpoints utilisés :
  GET /me/accounts               → Pages gérées + tokens de page
  GET /{page_id}/posts           → Publications de la page
  GET /{post_id}/insights        → Métriques d'un post (impressions, reach, engagement)
  GET /{media_id}/comments       → Commentaires d'un post
  POST /{page_id}/feed           → Publier un post texte
  POST /{page_id}/photos         → Publier avec image
  GET /{ig_user_id}/media        → Médias Instagram Business

Authentification :
  - Page Access Token (longue durée, 60 jours) obtenu via OAuth
  - User Access Token échangé en long-lived token

Documentation officielle :
  https://developers.facebook.com/docs/graph-api/reference/
"""

import requests
import time
from datetime import datetime, timedelta
from typing import Optional


GRAPH_BASE = "https://graph.facebook.com/v21.0"


class MetaGraphClient:
    """Client pour l'API Meta Graph v21."""

    def __init__(self, page_access_token: str, page_id: str,
                 ig_user_id: Optional[str] = None):
        self.token    = page_access_token
        self.page_id  = page_id
        self.ig_id    = ig_user_id
        self.session  = requests.Session()

    def _get(self, endpoint: str, params: dict = None, retries: int = 3) -> dict:
        """GET avec retry automatique sur erreur transitoire (429/5xx/réseau)."""
        url    = f"{GRAPH_BASE}/{endpoint}"
        params = params or {}
        params["access_token"] = self.token

        for attempt in range(retries):
            try:
                r = self.session.get(url, params=params, timeout=30)
                if r.status_code == 429:
                    time.sleep(60)      # Rate limit Meta
                    continue
                if 400 <= r.status_code < 500:
                    # Erreur PERMANENTE (mauvais paramètre, permission
                    # manquante, métrique invalide...) : retenter ne change
                    # rien. Continuer à retry ces erreurs comme les 5xx
                    # (3 tentatives × jusqu'à 15s de backoff) faisait
                    # échouer TOUT appel de métrique invalide en ~30-45s
                    # par post — pour un historique de plusieurs posts, ça
                    # dépassait largement le timeout de la requête Laravel.
                    print(f"   ⚠️ Meta API {r.status_code} (permanent) : {r.text[:150]}")
                    return {}
                r.raise_for_status()
                return r.json()
            except requests.RequestException as e:
                print(f"   ⚠️ Meta API {attempt+1}/{retries}: {e}")
                time.sleep(5 * (attempt + 1))
        return {}

    def _post(self, endpoint: str, data: dict) -> dict:
        """POST sur l'API Graph."""
        url  = f"{GRAPH_BASE}/{endpoint}"
        data = {**data, "access_token": self.token}
        try:
            r = self.session.post(url, data=data, timeout=30)
            r.raise_for_status()
            return r.json()
        except requests.RequestException as e:
            print(f"   ⚠️ Meta POST erreur : {e}")
            return {}

    # ================================================================
    # HISTORIQUE D'ENGAGEMENT
    # ================================================================

    def get_page_posts(self, limit: int = 100, days_back: int = 90) -> list[dict]:
        """
        Récupère les publications de la Page sur les X derniers jours.

        Champs retournés : id, message, created_time,
                           attachments, full_picture, permalink_url
        """
        since = int((datetime.now() - timedelta(days=days_back)).timestamp())
        posts = []
        url   = f"{self.page_id}/posts"
        params = {
            # likes/comments/shares étaient absents des fields demandés —
            # post.get("likes") était donc TOUJOURS None, et le score
            # d'engagement (build_engagement_history ci-dessous) TOUJOURS
            # zéro pour de vraies publications. Avec un signal plat, Prophet
            # n'a aucune vraie saisonnalité à apprendre et peut converger
            # vers "la même heure tous les jours" — pas un vrai créneau.
            "fields": "id,message,created_time,attachments,permalink_url,"
                      "likes.summary(true),comments.summary(true),shares",
            "limit" : min(limit, 100),
            "since" : since,
        }

        while url:
            data   = self._get(url if url.startswith(self.page_id) else url, params)
            items  = data.get("data", [])
            posts += items

            if len(posts) >= limit:
                break

            # Pagination curseur
            paging = data.get("paging", {})
            next_page = paging.get("next")
            url    = next_page.split(f"{GRAPH_BASE}/")[1] if next_page else None
            params = None  # URL déjà encodée par Meta

        print(f"   📊 {len(posts)} posts récupérés (Meta Graph API)")
        return posts

    def get_post_insights(self, post_id: str) -> dict:
        """
        Récupère les métriques d'un post spécifique.

        Métrique disponible :
          post_reactions_by_type_total → Réactions par type

        post_impressions / post_impressions_unique / post_engaged_users ont
        été retirées de l'API Graph (confirmé en direct : "(#100) The value
        must be a valid insights metric" pour les 3 — seule
        post_reactions_by_type_total répond encore 200). Les demander
        faisait échouer CHAQUE appel insights, et avec le retry sur erreur
        4xx de _get() (non transitoire — retenter ne change rien), 3
        tentatives × ~10s de backoff par post cumulaient largement plus que
        le timeout de la requête Laravel pour un historique de quelques
        posts.
        """
        data = self._get(f"{post_id}/insights", params={
            "metric": "post_reactions_by_type_total",
        })
        metrics = {}
        for item in data.get("data", []):
            key = item["name"]
            # La valeur est dans une liste de périodes
            values = item.get("values", [])
            if values:
                metrics[key] = values[-1].get("value", 0)
        return metrics

    def build_engagement_history(self, days_back: int = 90) -> list[dict]:
        """
        Construit l'historique d'engagement complet pour Prophet.

        Récupère les posts + leurs insights et construit un DataFrame-ready
        liste avec : date, heure, likes, comments, shares, reach, impressions.

        Returns:
            Liste de dicts prête pour pd.DataFrame()
        """
        print(f"📊 Construction historique engagement (Meta Graph API, {days_back}j)...")
        posts  = self.get_page_posts(limit=200, days_back=days_back)
        history= []

        for post in posts:
            post_id  = post.get("id", "")
            created  = post.get("created_time", "")
            try:
                dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
            except Exception:
                continue

            insights = self.get_post_insights(post_id)
            likes    = post.get("likes", {}).get("summary", {}).get("total_count", 0)
            comments = post.get("comments", {}).get("summary", {}).get("total_count", 0)
            shares   = post.get("shares", {}).get("count", 0)

            history.append({
                "post_id"     : post_id,
                "date"        : dt.strftime("%Y-%m-%d"),
                "datetime"    : dt.isoformat(),
                "hour"        : dt.hour,
                "day_of_week" : dt.weekday(),   # 0=Lundi
                "likes"       : likes,
                "comments"    : comments,
                "shares"      : shares,
                # reach/impressions/engaged retirés : les métriques Meta
                # correspondantes n'existent plus (voir get_post_insights).
                # prepare_engagement_dataframe() (prophet_scheduler.py)
                # retombe déjà proprement sur l'engagement brut quand
                # reach=0, donc likes/comments/shares réels suffisent.
                "reach"       : 0,
                "impressions" : 0,
                "engaged"     : 0,
                "reactions"   : insights.get("post_reactions_by_type_total", {}),
                "platform"    : "facebook",
            })
            time.sleep(0.1)    # Respecter le rate limit Meta

        print(f"   ✅ {len(history)} posts avec métriques")
        return history

    # ================================================================
    # COMMENTAIRES
    # ================================================================

    def get_recent_comments(self, since_timestamp: int = None) -> list[dict]:
        """
        Récupère les commentaires récents sur tous les posts de la page.

        Returns:
            Liste de commentaires : {comment_id, message, from, created_time, post_id}
        """
        posts    = self.get_page_posts(limit=50, days_back=7)
        comments = []

        for post in posts:
            post_id = post.get("id", "")
            params  = {
                "fields": "id,message,from,created_time",
                "filter": "stream",
                "limit" : 25,
            }
            if since_timestamp:
                params["since"] = since_timestamp

            data = self._get(f"{post_id}/comments", params=params)
            for comment in data.get("data", []):
                # Exclure les réponses de la Page elle-même : "from" contient
                # alors l'id de la Page, pas d'un client. Sans ce filtre, la
                # réponse qu'on vient d'envoyer à un commentaire réapparaît
                # dans l'inbox comme un NOUVEAU commentaire "pending" à
                # traiter — l'inbox se remplit alors pour moitié de ses
                # propres réponses passées.
                if comment.get("from", {}).get("id") == self.page_id:
                    continue
                comments.append({
                    **comment,
                    "post_id"  : post_id,
                    "platform" : "facebook",
                })

        print(f"   💬 {len(comments)} commentaires récupérés")
        return comments

    # ================================================================
    # PUBLICATION
    # ================================================================

    def publish_post(self, message: str, link: str = None,
                     image_url: str = None) -> dict:
        """
        Publie un post sur la Page Facebook.

        Args:
            message   : Texte du post
            link      : URL à partager (optionnel)
            image_url : URL d'une image (optionnel)

        Returns:
            dict avec id du post créé
        """
        data = {"message": message}
        if link:
            data["link"] = link

        if image_url:
            # POST photo
            data["url"] = image_url
            result = self._post(f"{self.page_id}/photos", data)
        else:
            # POST texte
            result = self._post(f"{self.page_id}/feed", data)

        print(f"   ✅ Post publié : {result.get('id', 'N/A')}")
        return result

    def reply_to_comment(self, comment_id: str, message: str) -> dict:
        """Répond à un commentaire."""
        return self._post(f"{comment_id}/comments", {"message": message})

    # ================================================================
    # MÉTRIQUES TEMPS RÉEL
    # ================================================================

    def get_page_insights_hourly(self) -> dict:
        """
        Récupère les métriques de la page sur les dernières 24h.
        Utilisé par le scheduler Laravel (toutes les heures).

        page_impressions / page_engaged_users / page_fans / page_fan_adds
        ont été retirées de l'API Graph (confirmées en direct : "(#100) The
        value must be a valid insights metric" pour les 4 — même
        dépréciation que les métriques post-level dans get_post_insights()).
        Seules page_views_total, page_post_engagements et page_total_actions
        répondent encore 200 en Insights. Le nombre d'abonnés n'est plus une
        métrique Insights du tout : Meta l'expose désormais comme un champ
        direct de la Page (fan_count / followers_count), pas via /insights.
        """
        data = self._get(f"{self.page_id}/insights", params={
            "metric": ",".join([
                "page_views_total",
                "page_post_engagements",
                "page_total_actions",
            ]),
            "period": "day",
        })
        metrics = {}
        for item in data.get("data", []):
            values = item.get("values", [])
            if values:
                metrics[item["name"]] = values[-1].get("value", 0)

        page = self._get(str(self.page_id), params={"fields": "followers_count"})
        if "followers_count" in page:
            metrics["followers_count"] = page["followers_count"]

        return metrics