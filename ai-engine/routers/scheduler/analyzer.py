### 3.7 — `ai_engine/routers/scheduler/analyzer.py`

# ai_engine/routers/scheduler/analyzer.py
"""
Calcul des analytics pour les graphiques React + Chart.js.
"""

import pandas as pd
import numpy as np

DAYS_ORDER = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
DAYS_FR    = {
    "Monday":"Lundi","Tuesday":"Mardi","Wednesday":"Mercredi",
    "Thursday":"Jeudi","Friday":"Vendredi","Saturday":"Samedi","Sunday":"Dimanche"
}


def compute_analytics(df: pd.DataFrame) -> dict:
    """
    Calcule toutes les métriques pour les graphiques React.
    Retourne des structures JSON prêtes à consommer par Chart.js.
    """
    if df.empty:
        return {}

    # ---- Heatmap Heure × Jour (pour Chart.js Matrix) ----
    pivot = df.pivot_table(
        values="engagement_score",
        index="day_of_week",
        columns="hour",
        aggfunc="mean"
    ).fillna(0)

    heatmap_data = []
    for day in DAYS_ORDER:
        if day in pivot.index:
            for hour in range(24):
                score = pivot.loc[day, hour] if hour in pivot.columns else 0
                heatmap_data.append({
                    "day"    : DAYS_FR.get(day, day),
                    "hour"   : hour,
                    "score"  : round(float(score), 1),
                    "label"  : f"{DAYS_FR.get(day,'')} {hour:02d}:00"
                })

    # ---- Performance horaire (pour Chart.js Bar) ----
    hourly = df.groupby("hour")["engagement_score"].mean()
    hourly_chart = {
        "labels": [f"{h:02d}:00" for h in range(24)],
        "data"  : [round(float(hourly.get(h, 0)), 1) for h in range(24)],
    }

    # ---- Performance journalière (pour Chart.js Bar) ----
    daily = df.groupby("day_of_week")["engagement_score"].mean()
    daily_ordered = [daily.get(d, 0) for d in DAYS_ORDER]
    daily_chart = {
        "labels": [DAYS_FR[d] for d in DAYS_ORDER],
        "data"  : [round(float(v), 1) for v in daily_ordered],
    }

    # ---- Tendance 90 jours (pour Chart.js Line) ----
    df["week_num"] = (df["date"] - df["date"].min()).dt.days // 7
    trend = df.groupby("week_num")["engagement_score"].mean()
    trend_chart = {
        "labels": [f"Sem. {i+1}" for i in range(len(trend))],
        "data"  : [round(float(v), 1) for v in trend.values],
    }

    # ---- KPIs globaux ----
    trend_pct = 0
    if len(trend) >= 2:
        trend_pct = round(
            (trend.iloc[-1] - trend.iloc[0]) / max(1, trend.iloc[0]) * 100, 1
        )

    return {
        "heatmap_data"  : heatmap_data,
        "hourly_chart"  : hourly_chart,
        "daily_chart"   : daily_chart,
        "trend_chart"   : trend_chart,
        "kpis": {
            "total_posts"   : len(df),
            "avg_engagement": round(float(df["engagement_score"].mean()), 1),
            "avg_likes"     : round(float(df["likes"].mean()), 1),
            "avg_comments"  : round(float(df["comments"].mean()), 1),
            "best_hour"     : int(df.groupby("hour")["engagement_score"].mean().idxmax()),
            "best_day"      : DAYS_FR.get(
                df.groupby("day_of_week")["engagement_score"].mean().idxmax(), "N/A"
            ),
            "trend_pct"     : trend_pct,
            "trend_dir"     : "📈 Croissance" if trend_pct > 0 else "📉 Déclin" if trend_pct < 0 else "➡️ Stable",
        }
    }
