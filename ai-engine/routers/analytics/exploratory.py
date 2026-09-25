### `routers/analytics/exploratory.py`


# routers/analytics/exploratory.py
"""
Analyse exploratoire des métriques collectées.

Calculs effectués :
  1. KPIs globaux (moyennes, totaux, tendances)
  2. Performance par type de contenu
  3. Performance par jour et heure
  4. Performance par plateforme
  5. Top 5 meilleurs posts
  6. Résumé hebdomadaire (comparaison semaine précédente)
"""

import pandas as pd  # type: ignore
import numpy as np   # type: ignore


def compute_global_kpis(df: pd.DataFrame, period_days: int = 30) -> dict:
    """KPIs globaux sur la période récente."""
    cutoff = df["date"].max() - pd.Timedelta(days=period_days)
    recent = df[df["date"] >= cutoff]
    if recent.empty:
        recent = df

    mid = len(recent) // 2
    if mid > 0:
        first_half  = recent.iloc[:mid]["engagement_rate"].mean()
        second_half = recent.iloc[mid:]["engagement_rate"].mean()
        trend_pct   = round((second_half - first_half) / first_half * 100, 1) if first_half > 0 else 0
    else:
        trend_pct = 0

    return {
        "period_days"        : period_days,
        "total_posts"        : len(recent),
        "avg_engagement_rate": round(recent["engagement_rate"].mean(), 2),
        "avg_reach"          : round(recent["reach"].mean(), 1),
        "total_reach"        : int(recent["reach"].sum()),
        "total_likes"        : int(recent["likes"].sum()),
        "total_comments"     : int(recent["comments"].sum()),
        "total_shares"       : int(recent["shares"].sum()),
        "avg_likes"          : round(recent["likes"].mean(), 1),
        "avg_comments"       : round(recent["comments"].mean(), 1),
        "avg_shares"         : round(recent["shares"].mean(), 1),
        "trend_engagement"   : trend_pct,
        "trend_direction"    : "📈 En hausse" if trend_pct > 0 else "📉 En baisse" if trend_pct < 0 else "➡️ Stable",
    }


def performance_by_content_type(df: pd.DataFrame) -> pd.DataFrame:
    """Performance par type de contenu."""
    if "content_type" not in df.columns:
        return pd.DataFrame()
    grouped = df.groupby("content_type").agg(
        nb_posts       = ("likes", "count"),
        avg_likes      = ("likes", "mean"),
        avg_comments   = ("comments", "mean"),
        avg_shares     = ("shares", "mean"),
        avg_reach      = ("reach", "mean"),
        avg_engagement = ("engagement_rate", "mean"),
    ).round(1).reset_index()
    return grouped.sort_values("avg_engagement", ascending=False)


def performance_by_day(df: pd.DataFrame) -> pd.DataFrame:
    """Performance par jour de la semaine."""
    day_order = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
    day_fr    = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"]

    grouped = df.groupby("day_of_week").agg(
        avg_engagement = ("engagement_rate", "mean"),
        avg_reach      = ("reach", "mean"),
        avg_likes      = ("likes", "mean"),
        nb_posts       = ("likes", "count")
    ).round(2).reset_index()

    grouped = grouped.reindex(
        grouped.set_index("day_of_week").reindex([d for d in day_order if d in grouped["day_of_week"].values]).index.tolist()
    )
    grouped["day_fr"] = grouped["day_of_week"].map(dict(zip(day_order, day_fr)))
    return grouped


def performance_by_hour(df: pd.DataFrame) -> pd.DataFrame:
    """Performance par heure de publication."""
    return df.groupby("hour").agg(
        avg_engagement = ("engagement_rate", "mean"),
        avg_reach      = ("reach", "mean"),
        avg_likes      = ("likes", "mean"),
        nb_posts       = ("likes", "count")
    ).round(2).reset_index().sort_values("hour")


def performance_by_platform(df: pd.DataFrame) -> pd.DataFrame:
    """Performance par plateforme."""
    if "platform" not in df.columns:
        return pd.DataFrame()
    return df.groupby("platform").agg(
        nb_posts       = ("likes", "count"),
        avg_likes      = ("likes", "mean"),
        avg_comments   = ("comments", "mean"),
        avg_shares     = ("shares", "mean"),
        avg_reach      = ("reach", "mean"),
        avg_engagement = ("engagement_rate", "mean"),
    ).round(2).reset_index().sort_values("avg_engagement", ascending=False)


def get_top_posts(df: pd.DataFrame, n: int = 5) -> list[dict]:
    """Top N meilleurs posts."""
    top = df.nlargest(n, "engagement_score")[
        ["date", "content_type", "platform", "likes", "comments",
         "shares", "reach", "engagement_rate", "engagement_score"]
    ].copy()
    top["date"] = top["date"].dt.strftime("%Y-%m-%d %H:%M")
    return top.to_dict(orient="records")


def generate_weekly_summary(df: pd.DataFrame) -> dict:
    """Résumé semaine écoulée vs semaine précédente."""
    cutoff = df["date"].max() - pd.Timedelta(days=7)
    week   = df[df["date"] >= cutoff]
    if week.empty:
        return {}

    prev_cutoff = cutoff - pd.Timedelta(days=7)
    prev_week   = df[(df["date"] >= prev_cutoff) & (df["date"] < cutoff)]

    def pct_change(curr, prev):
        return round((curr - prev) / prev * 100, 1) if prev > 0 else 0

    curr_eng   = week["engagement_rate"].mean()
    prev_eng   = prev_week["engagement_rate"].mean() if not prev_week.empty else curr_eng
    curr_reach = week["reach"].mean()
    prev_reach = prev_week["reach"].mean() if not prev_week.empty else curr_reach

    best_type = "N/A"
    if "content_type" in week.columns and len(week) > 0:
        try:
            best_type = week.groupby("content_type")["engagement_rate"].mean().idxmax()
        except Exception:
            pass

    return {
        "posts_this_week"   : len(week),
        "avg_engagement"    : round(curr_eng, 2),
        "engagement_change" : pct_change(curr_eng, prev_eng),
        "avg_reach"         : round(curr_reach, 1),
        "reach_change"      : pct_change(curr_reach, prev_reach),
        "total_likes"       : int(week["likes"].sum()),
        "total_comments"    : int(week["comments"].sum()),
        "total_shares"      : int(week["shares"].sum()),
        "best_post_type"    : best_type,
    }