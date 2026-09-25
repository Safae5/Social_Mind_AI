### `routers/analytics/prophet_forecaster.py`


# routers/analytics/prophet_forecaster.py
"""
Prédiction des performances futures avec Prophet.

Prophet (Meta/Facebook) décompose automatiquement :
  - La tendance générale (croissance ou déclin)
  - La saisonnalité hebdomadaire (meilleurs jours)
  - Les effets des jours fériés (optionnel)

M�triques prédites :
  1. Taux d'engagement moyen (30 jours)
  2. Reach moyen (30 jours)
  3. Likes moyens (30 jours)

Format Prophet : df avec colonnes 'ds' (datetime) et 'y' (valeur).
"""

import pandas as pd  # type: ignore
import numpy as np   # type: ignore
import warnings
warnings.filterwarnings("ignore")


def prepare_prophet_df(df: pd.DataFrame, metric: str = "engagement_rate") -> pd.DataFrame:
    """Prépare le DataFrame au format Prophet (agrégé par jour)."""
    df_agg = df.groupby(df["date"].dt.date)[metric].mean().reset_index()
    df_agg.columns = ["ds", "y"]
    df_agg["ds"]   = pd.to_datetime(df_agg["ds"])
    return df_agg.dropna().sort_values("ds")


def run_prophet_forecast(df: pd.DataFrame, metric: str = "engagement_rate",
                          forecast_days: int = 30, label: str = "Engagement") -> dict | None:
    """
    Entraîne Prophet et génère les prédictions sur 30 jours.

    Returns:
        dict avec forecast_df, model, statistiques résumées
    """
    from prophet import Prophet # type: ignore

    print(f"📈 Prophet — Prédiction '{label}' sur {forecast_days} jours...")
    df_p = prepare_prophet_df(df, metric)

    if len(df_p) < 7:
        print(f"   ⚠️ Pas assez de données ({len(df_p)} jours)")
        return None

    model = Prophet(
        yearly_seasonality      = False,
        weekly_seasonality      = True,
        daily_seasonality       = False,
        changepoint_prior_scale = 0.05,
        seasonality_mode        = "multiplicative",
        interval_width          = 0.80,
    )
    model.fit(df_p)

    future   = model.make_future_dataframe(periods=forecast_days, freq="D")
    forecast = model.predict(future)

    last_date    = df_p["ds"].max()
    forecast_fut = forecast[forecast["ds"] > last_date].copy()

    stats = {
        "metric"          : metric,
        "metric_label"    : label,
        "current_avg"     : round(df_p["y"].tail(7).mean(), 2),
        "predicted_avg"   : round(forecast_fut["yhat"].mean(), 2),
        "predicted_min"   : round(forecast_fut["yhat_lower"].min(), 2),
        "predicted_max"   : round(forecast_fut["yhat_upper"].max(), 2),
        "predicted_end"   : round(forecast_fut["yhat"].iloc[-1], 2) if len(forecast_fut) > 0 else 0,
        "trend_direction" : "📈 Croissance" if forecast_fut["yhat"].mean() > df_p["y"].mean() else "📉 Déclin",
        "growth_pct"      : round(
            (forecast_fut["yhat"].mean() - df_p["y"].mean()) / df_p["y"].mean() * 100, 1
        ) if df_p["y"].mean() > 0 else 0,
    }

    print(f"   ✅ {stats['current_avg']} → {stats['predicted_avg']} ({stats['trend_direction']})")

    return {
        "model"        : model,
        "forecast_all" : forecast,
        "forecast_fut" : forecast_fut,
        "historical"   : df_p,
        "stats"        : stats,
    }


def run_all_forecasts(df: pd.DataFrame) -> dict:
    """Lance Prophet sur les 3 métriques clés."""
    metrics = [
        ("engagement_rate", "Taux d'Engagement (%)"),
        ("reach",           "Portée (Reach)"),
        ("likes",           "Likes"),
    ]
    results = {}
    for metric, label in metrics:
        if metric in df.columns:
            result = run_prophet_forecast(df, metric, 30, label)
            if result:
                results[metric] = result
    return results