### `routers/social_manager/prophet_scheduler.py`


# routers/social_manager/prophet_scheduler.py
"""
Prédiction des horaires optimaux de publication avec Prophet.

Prophet (Meta/Facebook) est un modèle de prédiction de séries temporelles
open-source qui décompose les données en :
  - Tendance générale (croissance ou déclin)
  - Saisonnalité hebdomadaire (quels jours performent le mieux)
  - Saisonnalité journalière (quelles heures performent le mieux)
  - Effets des événements spéciaux (Ramadan, Eid, saisons)

Input  : Historique d'engagement via Meta Graph API (90 jours)
Output : 7 créneaux optimaux pour la semaine à venir

Avantage vs analyse statique :
  - S'adapte à chaque compte (pas de règles génériques)
  - Prend en compte les tendances propres à l'audience
  - Intervalles de confiance pour chaque prédiction
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings("ignore")


def prepare_engagement_dataframe(history: list[dict]) -> pd.DataFrame:
    """
    Prépare le DataFrame historique pour Prophet.

    Prophet exige exactement :
      'ds' : datetime (dates)
      'y'  : valeur à prédire (engagement score)

    Calcul de l'engagement score :
      (likes × 1) + (comments × 2) + (shares × 3) + (engaged × 1.5)
      normalisé par le reach pour comparer des posts de tailles différentes
    """
    df = pd.DataFrame(history)

    if df.empty:
        print("   ⚠️ Historique vide — utilisation données simulées")
        return _generate_simulated_history()

    df["datetime"]      = pd.to_datetime(df["datetime"])
    df["engagement"]    = (
        df.get("likes", pd.Series(0)) * 1.0 +
        df.get("comments", pd.Series(0)) * 2.0 +
        df.get("shares", pd.Series(0)) * 3.0 +
        df.get("engaged", pd.Series(0)) * 1.5
    )

    # Engagement rate si reach disponible
    reach = df.get("reach", pd.Series(0))
    df["engagement_rate"] = np.where(
        reach > 0,
        df["engagement"] / reach * 100,
        df["engagement"]
    )

    # Grouper par heure pour Prophet (granularité horaire)
    # pandas >= 2.2 a déprécié l'alias "H" (majuscule) au profit de "h" —
    # voir aussi make_future_dataframe(freq="h") plus bas, déjà corrigé ;
    # ce .dt.floor() avait été oublié lors de ce correctif précédent.
    df["ds"] = df["datetime"].dt.floor("h")
    prophet_df = df.groupby("ds")["engagement_rate"].mean().reset_index()
    prophet_df.columns = ["ds", "y"]
    prophet_df = prophet_df.sort_values("ds").reset_index(drop=True)

    print(f"   📊 {len(prophet_df)} points horaires pour Prophet")
    return prophet_df


def train_prophet_and_predict(prophet_df: pd.DataFrame,
                               forecast_days: int = 7) -> dict:
    """
    Entraîne Prophet sur l'historique et prédit les créneaux optimaux.

    Configuration Prophet pour les réseaux sociaux :
      weekly_seasonality = True   → Capture lundi vs dimanche
      daily_seasonality  = True   → Capture 8h vs 20h
      changepoint_prior_scale     → Flexibilité de la tendance

    Returns:
        dict avec :
          - forecast_df : DataFrame complet de prédictions
          - optimal_slots : 7 meilleurs créneaux de la semaine
          - best_days : classement des jours
          - best_hours : classement des heures
    """
    from prophet import Prophet

    print("🔮 Entraînement Prophet pour prédiction créneaux optimaux...")

    if len(prophet_df) < 24:
        print("   ⚠️ Pas assez de données — fallback heuristique")
        return _heuristic_optimal_slots()

    model = Prophet(
        weekly_seasonality     = True,
        daily_seasonality      = True,
        yearly_seasonality     = False,    # Pas assez de données
        changepoint_prior_scale= 0.05,
        seasonality_mode       = "multiplicative",
        interval_width         = 0.80,
    )

    model.fit(prophet_df)

    # Prédire les 7 prochains jours heure par heure
    # pandas >= 2.2 a déprécié l'alias "H" (majuscule) au profit de "h"
    future   = model.make_future_dataframe(periods=forecast_days * 24, freq="h")
    forecast = model.predict(future)

    # Isoler les prédictions futures
    now      = pd.Timestamp.now()
    fc_fut   = forecast[forecast["ds"] > now].copy()

    # Calculer l'heure et le jour de la semaine
    fc_fut["hour"]        = fc_fut["ds"].dt.hour
    fc_fut["day_of_week"] = fc_fut["ds"].dt.dayofweek
    fc_fut["day_name"]    = fc_fut["ds"].dt.day_name()
    fc_fut["date"]        = fc_fut["ds"].dt.date.astype(str)

    # Top 7 créneaux (un par jour si possible)
    fc_sorted   = fc_fut.sort_values("yhat", ascending=False)
    used_dates  = set()
    optimal_slots = []

    for _, row in fc_sorted.iterrows():
        if row["date"] not in used_dates:
            optimal_slots.append({
                "datetime"  : row["ds"].isoformat(),
                "date"      : row["date"],
                "day_name"  : row["day_name"],
                "hour"      : int(row["hour"]),
                "time_str"  : f"{int(row['hour']):02d}:00",
                "predicted_engagement": round(float(row["yhat"]), 2),
                "lower_bound": round(float(row["yhat_lower"]), 2),
                "upper_bound": round(float(row["yhat_upper"]), 2),
            })
            used_dates.add(row["date"])
        if len(optimal_slots) >= forecast_days:
            break

    # Meilleurs jours et heures globaux
    best_days  = fc_fut.groupby("day_name")["yhat"].mean().sort_values(ascending=False)
    best_hours = fc_fut.groupby("hour")["yhat"].mean().sort_values(ascending=False)

    days_fr = {
        "Monday": "Lundi", "Tuesday": "Mardi", "Wednesday": "Mercredi",
        "Thursday": "Jeudi", "Friday": "Vendredi", "Saturday": "Samedi",
        "Sunday": "Dimanche"
    }

    print(f"   ✅ {len(optimal_slots)} créneaux optimaux identifiés")
    print(f"   🏆 Meilleure heure : {best_hours.index[0]:02d}h00")

    return {
        "optimal_slots"    : optimal_slots,
        "best_days"        : [days_fr.get(d, d) for d in best_days.index.tolist()[:3]],
        "best_hours"       : [f"{h:02d}:00" for h in best_hours.index.tolist()[:3]],
        "model_trained"    : True,
        "data_points"      : len(prophet_df),
        "forecast_days"    : forecast_days,
    }


def _heuristic_optimal_slots() -> dict:
    """Créneaux heuristiques si pas assez de données."""
    OPTIMAL = [
        {"hour": 9, "day": 1}, {"hour": 12, "day": 2},
        {"hour": 19, "day": 3}, {"hour": 18, "day": 4},
        {"hour": 12, "day": 5}, {"hour": 19, "day": 6},
        {"hour": 20, "day": 0},
    ]
    slots = []
    today = datetime.now()
    for i, slot in enumerate(OPTIMAL):
        dt    = today + timedelta(days=(slot["day"] - today.weekday()) % 7 + i)
        dt    = dt.replace(hour=slot["hour"], minute=0, second=0)
        slots.append({
            "datetime"           : dt.isoformat(),
            "date"               : dt.strftime("%Y-%m-%d"),
            "day_name"           : dt.strftime("%A"),
            "hour"               : slot["hour"],
            "time_str"           : f"{slot['hour']:02d}:00",
            "predicted_engagement": 0.0,
            "lower_bound"        : 0.0,
            "upper_bound"        : 0.0,
        })
    return {
        "optimal_slots" : slots,
        "best_days"     : ["Mercredi", "Jeudi", "Mardi"],
        "best_hours"    : ["19:00", "12:00", "20:00"],
        "model_trained" : False,
        "data_points"   : 0,
        "forecast_days" : 7,
    }


def _generate_simulated_history() -> pd.DataFrame:
    """Génère un historique simulé si l'API est indisponible."""
    dates    = pd.date_range(end=datetime.now(), periods=90 * 24, freq="h")
    np.random.seed(42)

    # Simulation réaliste : pics le soir (18-21h) et midi
    hour_factor = np.array([
        0.3, 0.2, 0.1, 0.1, 0.1, 0.2, 0.5, 0.7, 0.8, 0.9, 1.0, 1.2,
        1.3, 1.2, 1.0, 1.0, 1.2, 1.4, 1.8, 2.0, 1.9, 1.6, 1.2, 0.8
    ])

    values = []
    for dt in dates:
        base = np.random.normal(3.0, 0.8)
        hf   = hour_factor[dt.hour]
        wf   = 1.3 if dt.weekday() in [4, 5] else 1.0
        values.append(max(0, base * hf * wf + np.random.normal(0, 0.3)))

    return pd.DataFrame({"ds": dates, "y": values})