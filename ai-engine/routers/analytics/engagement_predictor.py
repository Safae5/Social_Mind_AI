### `routers/analytics/engagement_predictor.py`


# routers/analytics/engagement_predictor.py
"""
Prédiction du score d'engagement avec XGBoost + Random Forest.

XGBoost : prédit l'engagement_score d'un futur post selon :
  - Heure de publication
  - Jour de la semaine
  - Type de contenu
  - Plateforme
  - Reach estimé (log)

Random Forest : calcule l'importance de chaque feature.
"""

import numpy as np  # type: ignore
import pandas as pd   # type: ignore
from sklearn.ensemble        import RandomForestRegressor   # type: ignore
from sklearn.model_selection import train_test_split   # type: ignore
from sklearn.preprocessing   import LabelEncoder   # type: ignore
from sklearn.metrics         import mean_absolute_error, r2_score   # type: ignore
import xgboost as xgb  # type: ignore
import warnings
warnings.filterwarnings("ignore")


def prepare_features(df: pd.DataFrame) -> tuple:
    """Prépare les features ML avec encodage et log-transform."""
    df_ml    = df.copy()
    encoders = {}

    for col in ["content_type", "platform", "day_of_week"]:
        if col in df_ml.columns:
            le = LabelEncoder()
            df_ml[f"{col}_enc"] = le.fit_transform(df_ml[col].astype(str))
            encoders[col] = le

    if "reach" in df_ml.columns:
        df_ml["reach_log"] = np.log1p(df_ml["reach"])

    feature_cols = [c for c in ["hour", "day_num", "content_type_enc",
                                 "platform_enc", "reach_log", "saves"]
                    if c in df_ml.columns]

    X = df_ml[feature_cols].fillna(0)
    y = df_ml["engagement_score"].fillna(0)
    return X, y, encoders, feature_cols


def train_xgboost(X: pd.DataFrame, y: pd.Series) -> tuple:
    """Entraîne XGBoost pour prédire le score d'engagement."""
    print("🤖 Entraînement XGBoost...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = xgb.XGBRegressor(
        n_estimators=100, max_depth=4, learning_rate=0.1,
        subsample=0.8, colsample_bytree=0.8, random_state=42, verbosity=0
    )
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

    y_pred = model.predict(X_test)
    mae    = mean_absolute_error(y_test, y_pred)
    r2     = r2_score(y_test, y_pred)
    print(f"   ✅ XGBoost — MAE: {mae:.2f}, R²: {r2:.3f}")
    return model, {"mae": round(mae, 2), "r2": round(r2, 3), "n_train": len(X_train)}


def train_random_forest(X: pd.DataFrame, y: pd.Series) -> tuple:
    """Entraîne Random Forest pour l'importance des features."""
    print("🌳 Entraînement Random Forest...")
    model = RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42, n_jobs=-1)
    model.fit(X, y)

    importance_df = pd.DataFrame({
        "feature"   : X.columns,
        "importance": model.feature_importances_
    }).sort_values("importance", ascending=False).reset_index(drop=True)
    importance_df["importance_pct"] = (
        importance_df["importance"] / importance_df["importance"].sum() * 100
    ).round(1)
    return model, importance_df


def train_all_models(df: pd.DataFrame) -> dict | None:
    """Pipeline complet d'entraînement des deux modèles."""
    X, y, encoders, feature_cols = prepare_features(df)
    if len(X) < 20:
        print("   ⚠️ Pas assez de données (minimum 20)")
        return None

    xgb_model, xgb_metrics  = train_xgboost(X, y)
    rf_model,  importance_df = train_random_forest(X, y)

    return {
        "xgb_model"    : xgb_model,
        "rf_model"     : rf_model,
        "encoders"     : encoders,
        "feature_cols" : feature_cols,
        "xgb_metrics"  : xgb_metrics,
        "importance_df": importance_df,
    }


def predict_engagement_score(ml_result: dict, content_type: str, platform: str,
                               hour: int, day_num: int,
                               estimated_reach: int = 3000,
                               estimated_saves: int = 50) -> dict:
    """Prédit le score d'engagement d'un futur post."""
    model        = ml_result["xgb_model"]
    encoders     = ml_result["encoders"]
    feature_cols = ml_result["feature_cols"]

    def encode(col, val):
        if col in encoders:
            try:
                return encoders[col].transform([val])[0]
            except ValueError:
                return 0
        return 0

    input_data = {
        "hour"             : hour,
        "day_num"          : day_num,
        "content_type_enc" : encode("content_type", content_type),
        "platform_enc"     : encode("platform", platform),
        "reach_log"        : np.log1p(estimated_reach),
        "saves"            : estimated_saves,
    }
    X_pred = pd.DataFrame([{col: input_data.get(col, 0) for col in feature_cols}])
    score  = float(max(0, model.predict(X_pred)[0]))

    if score >= 8:   evaluation = "🔥 Excellent — Fort potentiel viral"
    elif score >= 5: evaluation = "✅ Bon — Au-dessus de la moyenne"
    elif score >= 3: evaluation = "⚡ Moyen — Dans la moyenne"
    else:            evaluation = "❌ Faible — Optimiser le type ou l'horaire"

    days = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"]
    return {
        "predicted_score": round(score, 2),
        "evaluation"     : evaluation,
        "inputs"         : {
            "content_type": content_type, "platform": platform,
            "hour"        : f"{hour:02d}:00",
            "day"         : days[day_num % 7],
            "est_reach"   : estimated_reach,
        }
    }