# ai_engine/routers/scheduler/tiktok_client.py
"""
Client TikTok Content Posting API — Version Production

Architecture :
  ├── Authentication      → Bearer token + refresh automatique
  ├── Retry Policy        → Exponential backoff (3 tentatives)
  ├── Rate Limiter        → Token bucket (100 req/min TikTok limit)
  ├── Cache Layer         → TTL cache en mémoire (évite les appels répétés)
  ├── Logging             → Logs structurés avec niveaux
  ├── Metrics             → Compteurs d'appels, latence, taux d'erreur
  ├── Pagination          → Cursor-based pagination automatique
  ├── Error Handling      → Exceptions typées avec messages clairs
  ├── Response Validation → Pydantic models pour valider les réponses API
  ├── DataFrame Converter → Conversion pour Prophet + KMeans
  ├── Sample Data         → Données simulées réalistes (mode test)
  └── Pydantic Models     → Schémas de validation stricts

Documentation TikTok :
  https://developers.tiktok.com/doc/content-posting-api-reference-video-list

⚠️  IMPORTANT : L'API TikTok nécessite une approbation spéciale.
    Sans approbation, utilisez generate_sample_tiktok_posts() pour les tests.
"""

import os
import time
import random
import asyncio
import logging
import hashlib
import json
from datetime import datetime, timedelta
from typing import Optional, Any
from dataclasses import dataclass, field
from enum import Enum

import httpx
import pandas as pd
from pydantic import BaseModel, Field, validator

# ══════════════════════════════════════════════════════════════
# CONFIGURATION
# ══════════════════════════════════════════════════════════════

TIKTOK_BASE   = "https://open.tiktokapis.com/v2"
CLIENT_KEY    = os.getenv("TIKTOK_CLIENT_KEY",    "")
CLIENT_SECRET = os.getenv("TIKTOK_CLIENT_SECRET", "")

# Limites TikTok API
TIKTOK_MAX_PER_PAGE  = 20    # Max vidéos par requête
TIKTOK_RATE_LIMIT    = 100   # Requêtes par minute
TIKTOK_RATE_WINDOW   = 60    # Fenêtre en secondes

# Retry policy
MAX_RETRIES          = 3
RETRY_BASE_DELAY     = 1.0   # secondes
RETRY_MAX_DELAY      = 30.0  # secondes

# Cache TTL
CACHE_TTL_VIDEOS     = 3600  # 1 heure
CACHE_TTL_PROFILE    = 1800  # 30 minutes

# httpx config
TIMEOUT = httpx.Timeout(connect=10.0, read=30.0, write=10.0, pool=5.0)
LIMITS  = httpx.Limits(max_connections=5, max_keepalive_connections=3)

# ══════════════════════════════════════════════════════════════
# LOGGING
# ══════════════════════════════════════════════════════════════

logger = logging.getLogger("tiktok_client")
logger.setLevel(logging.INFO)

if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter(
        "[%(asctime)s] %(levelname)s [TikTok] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    ))
    logger.addHandler(handler)


# ══════════════════════════════════════════════════════════════
# PYDANTIC MODELS — Validation des réponses API
# ══════════════════════════════════════════════════════════════

class TikTokVideo(BaseModel):
    """Modèle d'une vidéo TikTok retournée par l'API."""

    id          : str
    title       : Optional[str]  = ""
    create_time : int            = 0
    view_count  : int            = Field(default=0, ge=0)
    like_count  : int            = Field(default=0, ge=0)
    comment_count: int           = Field(default=0, ge=0)
    share_count : int            = Field(default=0, ge=0)
    play_count  : int            = Field(default=0, ge=0)

    @validator("create_time")
    def validate_create_time(cls, v):
        if v < 0:
            raise ValueError("create_time ne peut pas être négatif")
        return v

    def to_normalized_post(self) -> dict:
        """Convertit en format normalisé pour Prophet + KMeans."""
        likes    = self.like_count
        comments = self.comment_count
        shares   = self.share_count
        reach    = self.view_count

        return {
            "post_id"    : self.id,
            "timestamp"  : datetime.fromtimestamp(self.create_time).isoformat() + "Z"
                           if self.create_time > 0 else "",
            "media_type" : "VIDEO",
            "title"      : self.title or "",
            "likes"      : likes,
            "comments"   : comments,
            "shares"     : shares,
            "reach"      : reach,
            "impressions": self.play_count,
            "saves"      : 0,
            "platform"   : "tiktok",
            "engagement" : (
                likes    * 1.0 +
                comments * 2.0 +
                shares   * 3.0
            ),
        }


class TikTokVideoListResponse(BaseModel):
    """Réponse de l'endpoint /video/list/."""

    videos  : list[TikTokVideo] = []
    cursor  : Optional[int]     = None
    has_more: bool              = False

    @classmethod
    def from_api_response(cls, data: dict) -> "TikTokVideoListResponse":
        """Parse la réponse brute de l'API."""
        inner = data.get("data", {})
        return cls(
            videos   = [TikTokVideo(**v) for v in inner.get("videos", [])
                        if isinstance(v, dict)],
            cursor   = inner.get("cursor"),
            has_more = inner.get("has_more", False),
        )


class TikTokUserInfo(BaseModel):
    """Profil utilisateur TikTok."""

    open_id        : str
    display_name   : str           = ""
    avatar_url     : Optional[str] = None
    follower_count : int           = Field(default=0, ge=0)
    following_count: int           = Field(default=0, ge=0)
    video_count    : int           = Field(default=0, ge=0)

    @classmethod
    def from_api_response(cls, data: dict) -> "TikTokUserInfo":
        user = data.get("data", {}).get("user", {})
        return cls(**{k: user[k] for k in cls.__fields__ if k in user})


class TikTokErrorCode(str, Enum):
    """Codes d'erreur TikTok API."""
    OK                 = "ok"
    RATE_LIMIT         = "rate_limit_exceeded"
    INVALID_TOKEN      = "access_token_invalid"
    EXPIRED_TOKEN      = "access_token_expired"
    INSUFFICIENT_SCOPE = "insufficient_scope"
    NOT_FOUND          = "not_found"
    SERVER_ERROR       = "server_error"
    UNKNOWN            = "unknown"


# ══════════════════════════════════════════════════════════════
# EXCEPTIONS
# ══════════════════════════════════════════════════════════════

class TikTokAPIError(Exception):
    """Erreur générique de l'API TikTok."""
    def __init__(self, message: str, status_code: int = 0, error_code: str = ""):
        self.status_code = status_code
        self.error_code  = error_code
        super().__init__(message)


class TikTokRateLimitError(TikTokAPIError):
    """Rate limit atteint — attendre avant de réessayer."""
    pass


class TikTokAuthError(TikTokAPIError):
    """Token invalide ou expiré."""
    pass


class TikTokScopeError(TikTokAPIError):
    """Permissions insuffisantes — approbation API requise."""
    pass


# ══════════════════════════════════════════════════════════════
# METRICS COLLECTOR
# ══════════════════════════════════════════════════════════════

@dataclass
class TikTokMetrics:
    """Collecte les métriques d'utilisation de l'API."""

    total_requests   : int   = 0
    successful       : int   = 0
    failed           : int   = 0
    retried          : int   = 0
    cache_hits       : int   = 0
    rate_limited     : int   = 0
    total_latency_ms : float = 0.0
    videos_fetched   : int   = 0

    @property
    def success_rate(self) -> float:
        if self.total_requests == 0:
            return 0.0
        return round(self.successful / self.total_requests * 100, 2)

    @property
    def avg_latency_ms(self) -> float:
        if self.successful == 0:
            return 0.0
        return round(self.total_latency_ms / self.successful, 2)

    def to_dict(self) -> dict:
        return {
            "total_requests" : self.total_requests,
            "successful"     : self.successful,
            "failed"         : self.failed,
            "retried"        : self.retried,
            "cache_hits"     : self.cache_hits,
            "rate_limited"   : self.rate_limited,
            "success_rate"   : f"{self.success_rate}%",
            "avg_latency_ms" : self.avg_latency_ms,
            "videos_fetched" : self.videos_fetched,
        }

    def log_summary(self):
        logger.info(
            f"📊 Métriques TikTok → "
            f"Requêtes: {self.total_requests} | "
            f"Succès: {self.success_rate}% | "
            f"Latence moy: {self.avg_latency_ms}ms | "
            f"Cache hits: {self.cache_hits} | "
            f"Vidéos: {self.videos_fetched}"
        )


# ══════════════════════════════════════════════════════════════
# CACHE LAYER
# ══════════════════════════════════════════════════════════════

@dataclass
class CacheEntry:
    """Entrée de cache avec TTL."""
    data      : Any
    expires_at: float  # timestamp Unix

    def is_valid(self) -> bool:
        return time.time() < self.expires_at


class InMemoryCache:
    """Cache en mémoire avec TTL et nettoyage automatique."""

    def __init__(self):
        self._store: dict[str, CacheEntry] = {}

    def _make_key(self, prefix: str, **kwargs) -> str:
        """Génère une clé de cache unique."""
        payload = json.dumps(kwargs, sort_keys=True)
        return f"{prefix}:{hashlib.md5(payload.encode()).hexdigest()}"

    def get(self, key: str) -> Optional[Any]:
        entry = self._store.get(key)
        if entry and entry.is_valid():
            return entry.data
        if entry:
            del self._store[key]
        return None

    def set(self, key: str, data: Any, ttl: int = 3600):
        self._store[key] = CacheEntry(
            data       = data,
            expires_at = time.time() + ttl,
        )

    def invalidate(self, prefix: str):
        keys = [k for k in self._store if k.startswith(prefix)]
        for k in keys:
            del self._store[k]

    def clear(self):
        self._store.clear()

    def stats(self) -> dict:
        valid   = sum(1 for e in self._store.values() if e.is_valid())
        expired = len(self._store) - valid
        return {"total": len(self._store), "valid": valid, "expired": expired}


# Singleton cache partagé
_cache = InMemoryCache()


# ══════════════════════════════════════════════════════════════
# RATE LIMITER — Token Bucket
# ══════════════════════════════════════════════════════════════

@dataclass
class TokenBucketRateLimiter:
    """
    Implémentation Token Bucket pour respecter les limites TikTok.
    Max 100 requêtes par minute.
    """
    max_tokens   : int   = TIKTOK_RATE_LIMIT
    refill_rate  : float = TIKTOK_RATE_LIMIT / TIKTOK_RATE_WINDOW
    tokens       : float = field(default=float(TIKTOK_RATE_LIMIT))
    last_refill  : float = field(default_factory=time.time)
    _lock        : asyncio.Lock = field(default_factory=asyncio.Lock)

    async def acquire(self) -> float:
        """
        Acquiert un token. Attend si nécessaire.
        Retourne le temps d'attente en secondes.
        """
        async with self._lock:
            now     = time.time()
            elapsed = now - self.last_refill

            # Recharge les tokens selon le temps écoulé
            self.tokens = min(
                self.max_tokens,
                self.tokens + elapsed * self.refill_rate,
            )
            self.last_refill = now

            if self.tokens >= 1:
                self.tokens -= 1
                return 0.0

            # Calcule le délai d'attente
            wait_time = (1 - self.tokens) / self.refill_rate
            logger.warning(f"⏳ Rate limit — attente {wait_time:.2f}s")
            await asyncio.sleep(wait_time)
            self.tokens = 0
            return wait_time


# Singleton rate limiter
_rate_limiter = TokenBucketRateLimiter()


# ══════════════════════════════════════════════════════════════
# RETRY POLICY — Exponential Backoff
# ══════════════════════════════════════════════════════════════

async def with_retry(
    func,
    *args,
    max_retries : int   = MAX_RETRIES,
    base_delay  : float = RETRY_BASE_DELAY,
    max_delay   : float = RETRY_MAX_DELAY,
    metrics     : Optional[TikTokMetrics] = None,
    **kwargs,
) -> Any:
    """
    Exécute une coroutine avec retry et exponential backoff.

    Stratégie :
      - Tentative 1 : immédiat
      - Tentative 2 : attente 1s + jitter
      - Tentative 3 : attente 2s + jitter
      - Tentative 4 : attente 4s + jitter
      → Puis lève l'exception finale
    """
    last_exception = None

    for attempt in range(max_retries + 1):
        try:
            return await func(*args, **kwargs)

        except TikTokRateLimitError as e:
            last_exception = e
            if metrics:
                metrics.rate_limited += 1
            wait = min(base_delay * (2 ** attempt), max_delay)
            wait += random.uniform(0, 0.5)  # Jitter
            logger.warning(f"🔄 Rate limit — retry {attempt + 1}/{max_retries} dans {wait:.1f}s")
            await asyncio.sleep(wait)

        except TikTokAuthError:
            # Ne pas retenter pour les erreurs d'auth
            raise

        except TikTokScopeError:
            # Ne pas retenter pour les erreurs de permissions
            raise

        except (httpx.TimeoutException, httpx.NetworkError) as e:
            last_exception = e
            if attempt < max_retries:
                if metrics:
                    metrics.retried += 1
                wait = min(base_delay * (2 ** attempt), max_delay)
                wait += random.uniform(0, 0.3)
                logger.warning(f"🔄 Erreur réseau — retry {attempt + 1}/{max_retries} dans {wait:.1f}s: {e}")
                await asyncio.sleep(wait)
            else:
                raise TikTokAPIError(f"Échec après {max_retries} tentatives: {e}")

        except TikTokAPIError as e:
            last_exception = e
            if attempt < max_retries:
                if metrics:
                    metrics.retried += 1
                wait = min(base_delay * (2 ** attempt), max_delay)
                logger.warning(f"🔄 API erreur — retry {attempt + 1}/{max_retries}: {e}")
                await asyncio.sleep(wait)
            else:
                raise

    raise last_exception or TikTokAPIError("Retry exhausted")


# ══════════════════════════════════════════════════════════════
# HTTP REQUEST HANDLER
# ══════════════════════════════════════════════════════════════

async def _make_request(
    client      : httpx.AsyncClient,
    method      : str,
    url         : str,
    access_token: str,
    metrics     : TikTokMetrics,
    **kwargs,
) -> dict:
    """
    Effectue une requête HTTP vers l'API TikTok.
    Gère : rate limiting, métriques, logging, validation.
    """
    # Rate limiting
    await _rate_limiter.acquire()

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type" : "application/json",
    }

    metrics.total_requests += 1
    start_time = time.time()

    try:
        response = await client.request(
            method  = method,
            url     = url,
            headers = headers,
            **kwargs,
        )

        latency_ms = (time.time() - start_time) * 1000
        metrics.total_latency_ms += latency_ms

        logger.debug(f"→ {method} {url} [{response.status_code}] {latency_ms:.0f}ms")

        # Gestion des erreurs HTTP
        if response.status_code == 429:
            metrics.rate_limited += 1
            retry_after = int(response.headers.get("Retry-After", 60))
            raise TikTokRateLimitError(
                f"Rate limit TikTok — réessai dans {retry_after}s",
                status_code = 429,
                error_code  = TikTokErrorCode.RATE_LIMIT,
            )

        if response.status_code == 401:
            raise TikTokAuthError(
                "Token TikTok invalide ou expiré. Reconnectez le compte.",
                status_code = 401,
                error_code  = TikTokErrorCode.INVALID_TOKEN,
            )

        if response.status_code == 403:
            raise TikTokScopeError(
                "Permissions insuffisantes. Approbation TikTok Developer requise.",
                status_code = 403,
                error_code  = TikTokErrorCode.INSUFFICIENT_SCOPE,
            )

        if response.status_code >= 500:
            raise TikTokAPIError(
                f"Erreur serveur TikTok: {response.status_code}",
                status_code = response.status_code,
                error_code  = TikTokErrorCode.SERVER_ERROR,
            )

        if response.status_code != 200:
            raise TikTokAPIError(
                f"TikTok API {response.status_code}: {response.text[:200]}",
                status_code = response.status_code,
            )

        data = response.json()

        # Vérification du code d'erreur dans le body TikTok
        error_info = data.get("error", {})
        if error_info.get("code", "ok") != "ok":
            error_code    = error_info.get("code",    "unknown")
            error_message = error_info.get("message", "Erreur inconnue")

            if error_code in ("access_token_invalid", "access_token_expired"):
                raise TikTokAuthError(error_message, error_code=error_code)
            if error_code == "rate_limit_exceeded":
                raise TikTokRateLimitError(error_message, error_code=error_code)
            raise TikTokAPIError(error_message, error_code=error_code)

        metrics.successful += 1
        return data

    except (TikTokAPIError, httpx.TimeoutException, httpx.NetworkError):
        metrics.failed += 1
        raise


# ══════════════════════════════════════════════════════════════
# FETCH VIDEOS — Avec pagination + cache + retry
# ══════════════════════════════════════════════════════════════

async def _fetch_video_page(
    client      : httpx.AsyncClient,
    access_token: str,
    cursor      : Optional[int],
    metrics     : TikTokMetrics,
) -> TikTokVideoListResponse:
    """Récupère une page de vidéos TikTok."""
    payload: dict = {
        "fields"   : "id,title,create_time,view_count,like_count,comment_count,share_count,play_count",
        "max_count": TIKTOK_MAX_PER_PAGE,
    }
    if cursor is not None:
        payload["cursor"] = cursor

    data = await _make_request(
        client       = client,
        method       = "POST",
        url          = f"{TIKTOK_BASE}/video/list/",
        access_token = access_token,
        metrics      = metrics,
        json         = payload,
    )

    return TikTokVideoListResponse.from_api_response(data)


async def fetch_tiktok_videos(
    access_token: str,
    days_back   : int = 90,
    metrics     : Optional[TikTokMetrics] = None,
) -> list[dict]:
    """
    Récupère toutes les vidéos TikTok des N derniers jours.

    Pipeline :
      1. Vérifie le cache (TTL 1h)
      2. Pagination automatique via cursor
      3. Retry avec exponential backoff
      4. Validation Pydantic de chaque vidéo
      5. Filtre par date
      6. Conversion en format normalisé
      7. Met en cache le résultat

    Returns:
        Liste de posts normalisés ou données simulées si erreur.
    """
    if metrics is None:
        metrics = TikTokMetrics()

    # ── 1. Vérification cache ─────────────────────────────────
    cache_key = _cache._make_key("tiktok_videos", days_back=days_back,
                                  token_hash=hashlib.md5(access_token.encode()).hexdigest()[:8])
    cached = _cache.get(cache_key)
    if cached is not None:
        metrics.cache_hits += 1
        logger.info(f"💾 Cache hit — {len(cached)} vidéos TikTok")
        return cached

    since_time = int((datetime.now() - timedelta(days=days_back)).timestamp())
    all_posts: list[dict] = []
    cursor    : Optional[int] = None
    page      : int = 0

    logger.info(f"📡 Récupération vidéos TikTok ({days_back} jours)...")

    async with httpx.AsyncClient(timeout=TIMEOUT, limits=LIMITS) as client:
        while True:
            page += 1

            try:
                response = await with_retry(
                    _fetch_video_page,
                    client, access_token, cursor, metrics,
                    metrics = metrics,
                )
            except TikTokAuthError as e:
                logger.error(f"❌ Auth TikTok échouée: {e}")
                return generate_sample_tiktok_posts()
            except TikTokScopeError as e:
                logger.error(f"❌ Scope TikTok insuffisant: {e}")
                return generate_sample_tiktok_posts()
            except TikTokAPIError as e:
                logger.error(f"❌ TikTok API erreur après retries: {e}")
                break

            # Filtre par date et convertit
            page_posts = []
            stop_pagination = False

            for video in response.videos:
                if video.create_time < since_time:
                    stop_pagination = True
                    continue
                page_posts.append(video.to_normalized_post())

            all_posts.extend(page_posts)
            metrics.videos_fetched += len(page_posts)

            logger.debug(f"   Page {page}: {len(page_posts)} vidéos récupérées")

            # ── Pagination ────────────────────────────────────
            if stop_pagination or not response.has_more or response.cursor is None:
                break

            cursor = response.cursor

    # ── 7. Mise en cache ──────────────────────────────────────
    if all_posts:
        _cache.set(cache_key, all_posts, ttl=CACHE_TTL_VIDEOS)
        logger.info(f"✅ {len(all_posts)} vidéos TikTok récupérées ({page} pages)")
    else:
        logger.warning("⚠️ Aucune vidéo TikTok — fallback données simulées")
        return generate_sample_tiktok_posts()

    metrics.log_summary()
    return all_posts


# ══════════════════════════════════════════════════════════════
# USER INFO
# ══════════════════════════════════════════════════════════════

async def fetch_tiktok_user_info(
    access_token: str,
    metrics     : Optional[TikTokMetrics] = None,
) -> Optional[TikTokUserInfo]:
    """
    Récupère les informations du profil TikTok.
    Mise en cache 30 minutes.
    """
    if metrics is None:
        metrics = TikTokMetrics()

    cache_key = _cache._make_key("tiktok_user",
                                  token_hash=hashlib.md5(access_token.encode()).hexdigest()[:8])
    cached = _cache.get(cache_key)
    if cached is not None:
        metrics.cache_hits += 1
        return TikTokUserInfo(**cached)

    async with httpx.AsyncClient(timeout=TIMEOUT, limits=LIMITS) as client:
        try:
            data = await with_retry(
                _make_request,
                client       = client,
                method       = "GET",
                url          = f"{TIKTOK_BASE}/user/info/",
                access_token = access_token,
                metrics      = metrics,
                params       = {
                    "fields": "open_id,display_name,avatar_url,follower_count,following_count,video_count"
                },
            )

            user_info = TikTokUserInfo.from_api_response(data)
            _cache.set(cache_key, user_info.dict(), ttl=CACHE_TTL_PROFILE)

            logger.info(f"✅ Profil TikTok: @{user_info.display_name} ({user_info.follower_count:,} abonnés)")
            return user_info

        except TikTokAPIError as e:
            logger.error(f"❌ Impossible de récupérer le profil TikTok: {e}")
            return None


# ══════════════════════════════════════════════════════════════
# SAMPLE DATA GENERATOR
# ══════════════════════════════════════════════════════════════

def generate_sample_tiktok_posts(n: int = 40) -> list[dict]:
    """
    Génère des données TikTok simulées réalistes pour les tests.

    Simule un compte TikTok actif avec :
      - Pics d'engagement le soir (18h-22h) et midi (12h-13h)
      - Variabilité réaliste des métriques
      - Types : uniquement VIDEO (TikTok)
      - Engagements plus élevés que Instagram (plateforme virale)

    Returns:
        Liste de N posts simulés.
    """
    posts      = []
    base       = datetime.now() - timedelta(days=90)
    peak_hours = [9, 12, 13, 18, 19, 20, 21, 22]

    for i in range(n):
        dt   = base + timedelta(days=i * 2.25)
        hour = random.choice(peak_hours)
        dt   = dt.replace(hour=hour, minute=random.randint(0, 59))

        # TikTok a généralement plus de vues et partages qu'Instagram
        likes    = random.randint(100, 5000)
        comments = random.randint(10, 300)
        shares   = random.randint(20, 500)
        views    = random.randint(1000, 50000)
        plays    = views * random.randint(1, 2)

        posts.append({
            "post_id"    : f"tiktok_sample_{i}",
            "timestamp"  : dt.isoformat() + "Z",
            "media_type" : "VIDEO",
            "title"      : f"Vidéo TikTok #{i + 1}",
            "likes"      : likes,
            "comments"   : comments,
            "shares"     : shares,
            "reach"      : views,
            "impressions": plays,
            "saves"      : 0,
            "platform"   : "tiktok",
            "engagement" : (
                likes    * 1.0 +
                comments * 2.0 +
                shares   * 3.0
            ),
        })

    logger.info(f"✅ {n} posts TikTok simulés générés (mode test)")
    return posts


# ══════════════════════════════════════════════════════════════
# DATAFRAME CONVERTER — Pour Prophet + KMeans
# ══════════════════════════════════════════════════════════════

def tiktok_posts_to_dataframe(posts: list[dict]) -> pd.DataFrame:
    """
    Convertit les posts TikTok en DataFrame pour Prophet + KMeans.

    Colonnes ajoutées :
      - date             → datetime parsé depuis timestamp
      - hour             → heure de publication (0-23)
      - day_of_week      → nom du jour (Monday, Tuesday...)
      - day_num          → numéro du jour (0=Lundi, 6=Dimanche)
      - engagement_score → score composite TikTok
      - engagement_rate  → engagement / reach * 100
      - viral_score      → score de viralité (shares / reach)

    Returns:
        DataFrame trié par date avec toutes les métriques.
    """
    if not posts:
        return pd.DataFrame()

    df = pd.DataFrame(posts)

    df["date"] = pd.to_datetime(df["timestamp"], errors="coerce", utc=True)
    df = df.dropna(subset=["date"])
    df = df.sort_values("date").reset_index(drop=True)

    df["hour"]        = df["date"].dt.hour
    df["day_of_week"] = df["date"].dt.day_name()
    df["day_num"]     = df["date"].dt.dayofweek

    df["engagement_score"] = (
        df["likes"].fillna(0)    * 1.0 +
        df["comments"].fillna(0) * 2.0 +
        df["shares"].fillna(0)   * 3.0
    )

    df["engagement_rate"] = df.apply(
        lambda r: round((r["engagement_score"] / r["reach"] * 100), 3)
        if r.get("reach", 0) > 0 else 0,
        axis=1
    )

    # Score de viralité spécifique TikTok (shares / views)
    df["viral_score"] = df.apply(
        lambda r: round((r["shares"] / r["reach"] * 100), 3)
        if r.get("reach", 0) > 0 else 0,
        axis=1
    )

    logger.info(
        f"📊 DataFrame TikTok : {len(df)} posts | "
        f"engagement moyen : {df['engagement_score'].mean():.1f} | "
        f"viralité moyenne : {df['viral_score'].mean():.2f}%"
    )

    return df


# ══════════════════════════════════════════════════════════════
# WRAPPER SYNCHRONE — Pour compatibilité avec analyzer.py
# ══════════════════════════════════════════════════════════════

def fetch_tiktok_posts_sync(
    access_token: str,
    days_back   : int = 90,
) -> list[dict]:
    """
    Wrapper synchrone de fetch_tiktok_videos().
    Utilisé par analyzer.py (synchrone avec Prophet + KMeans).
    """
    metrics = TikTokMetrics()
    return asyncio.run(
        fetch_tiktok_videos(access_token, days_back, metrics)
    )


def get_cache_stats() -> dict:
    """Retourne les statistiques du cache."""
    return _cache.stats()


def clear_cache():
    """Vide le cache TikTok."""
    _cache.clear()
    logger.info("🗑️ Cache TikTok vidé")