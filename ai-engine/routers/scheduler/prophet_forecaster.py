# ai_engine/routers/scheduler/prophet_forecaster.py
"""
Prédiction Prophet des créneaux optimaux de publication.
Identique à la version précédente, adapté pour recevoir
un DataFrame depuis les APIs officielles.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings("ignore")


def run_prophet_on_api_data(df: pd.DataFrame, forecast_days: int = 7) -> pd.DataFrame:
    """
    Lance Prophet sur les données récupérées depuis les APIs sociales.

    Args:
        df           : DataFrame retourné par posts_to_dataframe()
        forecast_days: nombre de jours à prédire

    Returns:
        DataFrame des prédictions horaires futures
    """
    from prophet import Prophet

    if len(df) < 10:
        print("   ⚠️ Données insuffisantes pour Prophet — fallback analyse directe")
        return _direct_analysis_fallback(df, forecast_days)

    # Agréger par heure
    df_prophet = df.groupby(
        df["date"].dt.floor("h")
    )["engagement_score"].mean().reset_index()
    df_prophet.columns = ["ds", "y"]
    df_prophet["ds"] = df_prophet["ds"].dt.tz_localize(None)
    df_prophet = df_prophet.dropna().sort_values("ds")

    model = Prophet(
        yearly_seasonality  = False,
        weekly_seasonality  = True,
        daily_seasonality   = True,
        changepoint_prior_scale = 0.05,
        seasonality_mode    = "multiplicative",
        interval_width      = 0.80,
    )

    model.fit(df_prophet)

    future   = model.make_future_dataframe(periods=forecast_days * 24, freq="h")
    forecast = model.predict(future)

    # Filtrer le futur uniquement
    forecast_fut = forecast[forecast["ds"] > df_prophet["ds"].max()].copy()
    forecast_fut["hour"]        = forecast_fut["ds"].dt.hour
    forecast_fut["day_of_week"] = forecast_fut["ds"].dt.day_name()
    forecast_fut["day_num"]     = forecast_fut["ds"].dt.dayofweek
    forecast_fut["date_only"]   = forecast_fut["ds"].dt.date
    forecast_fut["yhat"]        = forecast_fut["yhat"].clip(lower=0)

    print(f"   ✅ Prophet : {len(forecast_fut)} créneaux prédits")
    return forecast_fut


def _direct_analysis_fallback(df: pd.DataFrame, forecast_days: int) -> pd.DataFrame:
    """Fallback simple si pas assez de données pour Prophet."""
    if df.empty:
        return pd.DataFrame()

    hourly_avg = df.groupby("hour")["engagement_score"].mean()
    daily_avg  = df.groupby("day_num")["engagement_score"].mean()

    rows = []
    now  = datetime.now()
    for d in range(1, forecast_days + 1):
        for h in range(24):
            dt    = (now + timedelta(days=d)).replace(hour=h, minute=0, second=0)
            score = (hourly_avg.get(h, 100) + daily_avg.get(dt.weekday(), 100)) / 2
            rows.append({
                "ds"          : dt,
                "yhat"        : score,
                "yhat_lower"  : score * 0.8,
                "yhat_upper"  : score * 1.2,
                "hour"        : h,
                "day_of_week" : dt.strftime("%A"),
                "day_num"     : dt.weekday(),
                "date_only"   : dt.date(),
            })

    return pd.DataFrame(rows)