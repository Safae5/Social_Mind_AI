### 3.6 — `ai_engine/routers/scheduler/kmeans_clusterer.py`

# ai_engine/routers/scheduler/kmeans_clusterer.py
"""
Clustering KMeans des créneaux + sélection des meilleurs slots.
"""

import pandas as pd
import numpy as np
from sklearn.cluster       import KMeans
from sklearn.preprocessing import StandardScaler
from datetime              import datetime, timedelta


PERFORMANCE_LABELS = ["🔥 Excellent", "✅ Bon", "⚡ Moyen", "❄️ Faible"]

DAYS_FR = {
    "Monday":"Lundi","Tuesday":"Mardi","Wednesday":"Mercredi",
    "Thursday":"Jeudi","Friday":"Vendredi","Saturday":"Samedi","Sunday":"Dimanche"
}

DAY_INDEX = {  # 0=Lundi ... 6=Dimanche, matches the optimal_slots.day_of_week column
    "Monday":0,"Tuesday":1,"Wednesday":2,"Thursday":3,
    "Friday":4,"Saturday":5,"Sunday":6,
}


def cluster_and_select_slots(
    forecast_df: pd.DataFrame,
    n_clusters: int = 4,
    n_slots: int = 14,
    min_interval_hours: int = 6
) -> list[dict]:
    """
    Classifie les créneaux prédits en niveaux de performance
    et sélectionne les N meilleurs créneaux uniques.

    Returns:
        Liste de dicts décrivant chaque créneau optimal
    """
    if forecast_df.empty:
        return []

    features  = forecast_df[["yhat", "hour", "day_num"]].fillna(0)
    scaler    = StandardScaler()
    X_scaled  = scaler.fit_transform(features)

    k        = min(n_clusters, len(features) - 1)
    kmeans   = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels   = kmeans.fit_predict(X_scaled)

    forecast_df["cluster"] = labels

    # Mapper clusters → labels lisibles
    cluster_scores = (
        forecast_df.groupby("cluster")["yhat"]
        .mean()
        .sort_values(ascending=False)
    )
    perf_map = {
        cid: PERFORMANCE_LABELS[i] if i < len(PERFORMANCE_LABELS) else "⚡ Moyen"
        for i, (cid, _) in enumerate(cluster_scores.items())
    }
    forecast_df["performance_label"] = forecast_df["cluster"].map(perf_map)

    # Normaliser le score 0-100
    max_s = forecast_df["yhat"].max()
    min_s = forecast_df["yhat"].min()
    forecast_df["score_normalized"] = (
        (forecast_df["yhat"] - min_s) / max(1, max_s - min_s) * 100
    ).round(1)

    # Sélectionner les meilleurs créneaux (contraintes espacement)
    sorted_slots = forecast_df.sort_values("yhat", ascending=False).copy()
    sorted_slots["ds"] = pd.to_datetime(sorted_slots["ds"])

    selected    = []
    daily_count = {}

    for _, row in sorted_slots.iterrows():
        if len(selected) >= n_slots:
            break

        slot_dt  = row["ds"]
        date_key = slot_dt.date()

        if daily_count.get(date_key, 0) >= 3:
            continue

        too_close = any(
            abs((slot_dt - s["datetime"]).total_seconds() / 3600) < min_interval_hours
            for s in selected
        )
        if too_close:
            continue

        selected.append({
            "datetime"           : slot_dt,
            "day_of_week"        : row["day_of_week"],
            "day_fr"             : DAYS_FR.get(row["day_of_week"], row["day_of_week"]),
            "day_index"          : DAY_INDEX.get(row["day_of_week"], 0),
            "time"               : f"{int(row['hour']):02d}:00",
            "rank"               : len(selected) + 1,
            "hour"               : int(row["hour"]),
            "cluster"            : int(row["cluster"]),
            "performance_label"  : row["performance_label"],
            "predicted_score"    : row["score_normalized"],
            "avg_engagement"     : round(float(row["yhat"]), 1),
            "slot_label"         : f"{DAYS_FR.get(row['day_of_week'],'')} {int(row['hour']):02d}:00",
            "formatted_datetime" : slot_dt.strftime("%d/%m/%Y %H:%M"),
            "iso_datetime"       : slot_dt.isoformat(),
        })

        daily_count[date_key] = daily_count.get(date_key, 0) + 1

    selected.sort(key=lambda x: x["datetime"])
    print(f"   ✅ {len(selected)} créneaux optimaux sélectionnés")
    return selected