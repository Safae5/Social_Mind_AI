### `routers/weekly_report/metrics_analyzer.py`


# routers/weekly_report/metrics_analyzer.py
"""
Calcul et formatage des métriques pour le résumé.

Transforme les données brutes Meta Graph API en informations
compréhensibles par un grand public.

Calcul des variations semaine/semaine :
  On compare avec la semaine précédente pour donner du contexte.
  +15% → "En progression", -10% → "En légère baisse"

Score global semaine (sur 5) basé sur le taux d'engagement :
  engagement_rate = (total_engagement / total_reach) * 100
  >= 8% → 5 étoiles (Excellente)
  >= 5% → 4 étoiles (Très bonne)
  >= 3% → 3 étoiles (Bonne)
  >= 1.5%→ 2 étoiles (Correcte)
  < 1.5% → 1 étoile  (À améliorer)
"""

import numpy as np


def analyze_metrics(current_metrics: dict, previous_metrics: dict | None = None) -> dict:
    """
    Analyse et compare les métriques semaine actuelle vs semaine précédente.

    Returns:
        dict avec métriques formatées en langage simple + variations + score
    """
    curr = current_metrics
    prev = previous_metrics or {}

    def variation(current_val: int, prev_val: int) -> dict:
        if prev_val == 0:
            return {"pct": 0, "emoji": "🆕", "text": "Première semaine de données"}
        pct = round((current_val - prev_val) / prev_val * 100, 1)
        if pct >= 20:
            emoji, text = "🚀", f"+{pct}% — Excellente semaine !"
        elif pct >= 5:
            emoji, text = "📈", f"+{pct}% — En progression"
        elif pct >= -5:
            emoji, text = "➡️", f"Stable ({pct:+.1f}%)"
        elif pct >= -20:
            emoji, text = "📉", f"{pct}% — En légère baisse"
        else:
            emoji, text = "⚠️", f"{pct}% — En baisse notable"
        return {"pct": pct, "emoji": emoji, "text": text}

    reach_current  = curr.get("total_reach", 0)
    reach_prev     = prev.get("total_reach", 0)
    eng_current    = curr.get("total_engagement", 0)
    eng_prev       = prev.get("total_engagement", 0)
    followers_net  = curr.get("followers_gained", 0) - curr.get("followers_lost", 0)

    # Score global
    #
    # engagement / max(1, reach) explosait dès que reach valait 0 (n'importe
    # quel engagement > 0 donnait un taux à 3 ou 4 chiffres, donc toujours
    # 5 étoiles) — pas un cas rare : reach est désormais TOUJOURS 0 pour un
    # compte Facebook (Meta a retiré cette métrique de l'API post-level,
    # voir _fetch_facebook_posts dans meta_fetcher.py). Quand reach est
    # indisponible, on retombe sur le taux d'engagement rapporté aux
    # abonnés — une vraie métrique standard, pas une valeur inventée —
    # plutôt que de diviser par un dénominateur arbitraire de 1.
    followers_now = curr.get("followers_now", 0)
    if reach_current > 0:
        engagement_rate = (eng_current / reach_current) * 100
    elif followers_now > 0:
        engagement_rate = (eng_current / followers_now) * 100
    else:
        engagement_rate = 0

    if engagement_rate >= 8:     score, score_text = 5, "Excellente semaine ! 🌟"
    elif engagement_rate >= 5:   score, score_text = 4, "Très bonne semaine ! 😊"
    elif engagement_rate >= 3:   score, score_text = 3, "Bonne semaine ✅"
    elif engagement_rate >= 1.5: score, score_text = 2, "Semaine correcte ⚡"
    else:                        score, score_text = 1, "Semaine à améliorer 💪"

    # Meilleure publication
    best_post     = curr.get("best_post", {})
    best_post_sum = None
    if best_post:
        caption_preview = (best_post.get("caption") or "Publication sans texte")[:80]
        if len(best_post.get("caption") or "") > 80:
            caption_preview += "..."
        media_type_fr = {
            "IMAGE"         : "📸 Photo",
            "VIDEO"         : "🎬 Vidéo",
            "CAROUSEL_ALBUM": "🎠 Carrousel",
            "REELS"         : "🎵 Reel",
        }.get(best_post.get("media_type", "IMAGE"), "📸 Post")
        best_post_sum = {
            "type"           : media_type_fr,
            "caption_preview": caption_preview,
            "likes"          : best_post.get("likes", 0),
            "comments"       : best_post.get("comments", 0),
            "reach"          : best_post.get("reach", 0),
            "engagement"     : best_post.get("engagement", 0),
            "post_id"        : best_post.get("id"),
        }

    return {
        "period"      : curr.get("period", {}),
        "score"       : score,
        "score_text"  : score_text,
        "score_stars" : "⭐" * score + "☆" * (5 - score),
        "reach"       : {
            "value"      : reach_current,
            "formatted"  : _format_number(reach_current),
            "variation"  : variation(reach_current, reach_prev),
            "simple_text": f"Vos publications ont été vues {_format_number(reach_current)} fois",
        },
        "engagement"  : {
            "value"      : eng_current,
            "formatted"  : _format_number(eng_current),
            "variation"  : variation(eng_current, eng_prev),
            "likes"      : curr.get("total_likes", 0),
            "comments"   : curr.get("total_comments", 0),
            "shares"     : curr.get("total_shares", 0),
            "saves"      : curr.get("total_saves", 0),
            "simple_text": f"{_format_number(eng_current)} personnes ont interagi avec votre contenu",
        },
        "followers"   : {
            "now"          : curr.get("followers_now", 0),
            "gained"       : curr.get("followers_gained", 0),
            "lost"         : curr.get("followers_lost", 0),
            "net"          : followers_net,
            "formatted_now": _format_number(curr.get("followers_now", 0)),
            "simple_text"  : _followers_simple_text(followers_net, curr.get("followers_gained", 0)),
        },
        "best_post"   : best_post_sum,
        "publications": {
            "total"      : curr.get("total_posts", 0),
            "simple_text": f"Vous avez publié {curr.get('total_posts', 0)} fois cette semaine",
        },
        "raw"         : {
            "engagement_rate": round(engagement_rate, 2),
            "reach_current"  : reach_current,
            "eng_current"    : eng_current,
        },
    }


def _format_number(n: int) -> str:
    """Formate un nombre de façon lisible (1 200, 4 500, 12 000)."""
    if n >= 1_000_000:
        return f"{n/1_000_000:.1f}M".replace(".", ",")
    elif n >= 1_000:
        return f"{n:,}".replace(",", " ")
    return str(n)


def _followers_simple_text(net: int, gained: int) -> str:
    if net > 0:
        return f"+{net} nouveaux abonnés cette semaine ({gained} arrivées)"
    elif net == 0:
        return "Nombre d'abonnés stable cette semaine"
    return f"{abs(net)} abonnés en moins cette semaine — concentrez-vous sur votre contenu !"


def prepare_trend_data(weeks_data: list[dict]) -> dict:
    """
    Prépare les données de tendance pour Chart.js.

    Returns:
        dict avec labels, reach_data, engagement_data, trend, avg_reach, avg_engagement
    """
    labels     = [w["week_label"] for w in weeks_data]
    reach_data = [w["reach"]      for w in weeks_data]
    eng_data   = [w["engagement"] for w in weeks_data]

    if len(reach_data) >= 2:
        slope = np.polyfit(np.arange(len(reach_data)), reach_data, 1)[0]
        trend = "📈 En progression" if slope > 0 else ("📉 En baisse" if slope < -50 else "➡️ Stable")
    else:
        trend = "🆕 Données insuffisantes"

    return {
        "labels"         : labels,
        "week_dates"     : [w.get("week_dates", "") for w in weeks_data],
        "reach_data"     : reach_data,
        "engagement_data": eng_data,
        "posts_data"     : [w["posts_count"] for w in weeks_data],
        "trend"          : trend,
        "max_reach"      : max(reach_data) if reach_data else 0,
        "avg_reach"      : int(np.mean(reach_data)) if reach_data else 0,
        "avg_engagement" : int(np.mean(eng_data))   if eng_data   else 0,
    }