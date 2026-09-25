### `routers/ad_optimizer/ctr_predictor.py`


# routers/ad_optimizer/ctr_predictor.py
"""
Prédiction du CTR avec XGBoost.

Le CTR (Click-Through Rate) est la métrique clé de la publicité digitale.
Prédire le CTR avant de lancer une annonce permet de choisir la meilleure
configuration (type, plateforme, audience, heure) avant de dépenser.

Features utilisées :
  - ad_type_enc       : type d'annonce (Vidéo > Carrousel > Image)
  - platform_enc      : plateforme (Meta, Google, TikTok...)
  - audience_age_enc  : tranche d'âge de l'audience ciblée
  - audience_gender_enc : genre
  - cpm               : coût pour 1000 impressions (indicateur concurrence)
  - spend_log         : budget (log-transformé pour normaliser)
  - impressions_log   : impressions estimées (log-transformé)
  - day_of_week       : jour de diffusion

XGBoost hyperparamètres :
  n_estimators=150, max_depth=5, learning_rate=0.08, subsample=0.8
"""

import numpy as np   # type: ignore
import pandas as pd  # type: ignore
from sklearn.preprocessing   import LabelEncoder   # type: ignore
from sklearn.model_selection import train_test_split  # type: ignore
from sklearn.metrics         import mean_absolute_error, r2_score  # type: ignore
import xgboost as xgb   # type: ignore
import warnings
warnings.filterwarnings("ignore")


def prepare_features_ctr(df: pd.DataFrame) -> tuple:
    """Prépare les features pour la prédiction CTR."""
    df_ml    = df.copy()
    encoders = {}

    for col in ["ad_type", "platform", "audience_age", "audience_gender"]:
        if col in df_ml.columns:
            le = LabelEncoder()
            df_ml[f"{col}_enc"] = le.fit_transform(df_ml[col].astype(str))
            encoders[col] = le

    if "spend" in df_ml.columns:
        df_ml["spend_log"] = np.log1p(df_ml["spend"])
    if "impressions" in df_ml.columns:
        df_ml["impressions_log"] = np.log1p(df_ml["impressions"])
    if "date" in df_ml.columns:
        df_ml["day_of_week"] = pd.to_datetime(df_ml["date"]).dt.dayofweek

    feature_cols = [c for c in [
        "ad_type_enc", "platform_enc", "audience_age_enc",
        "audience_gender_enc", "spend_log", "impressions_log",
        "cpm", "day_of_week"
    ] if c in df_ml.columns]

    X = df_ml[feature_cols].fillna(0)
    y = df_ml["ctr"].fillna(0)
    return X, y, encoders, feature_cols


def train_xgboost_ctr(df: pd.DataFrame) -> dict | None:
    """
    Entraîne XGBoost pour prédire le CTR.

    n_estimators=150 : plus d'arbres pour les données tabulaires pub
    max_depth=5 : profondeur suffisante sans overfitting
    learning_rate=0.08 : légèrement plus conservateur que 0.1

    Returns: dict avec model, encoders, feature_cols, metrics, importance_df
    """
    print("🤖 Entraînement XGBoost — Prédiction CTR...")
    X, y, encoders, feature_cols = prepare_features_ctr(df)

    if len(X) < 10:
        print("   ⚠️ Pas assez de données")
        return None

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = xgb.XGBRegressor(
        n_estimators=150, max_depth=5, learning_rate=0.08,
        subsample=0.8, colsample_bytree=0.8,
        min_child_weight=3, random_state=42, verbosity=0
    )
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

    y_pred = model.predict(X_test)
    mae    = mean_absolute_error(y_test, y_pred)
    r2     = r2_score(y_test, y_pred)

    importance_df = pd.DataFrame({
        "feature"   : feature_cols,
        "importance": model.feature_importances_
    }).sort_values("importance", ascending=False)
    importance_df["importance_pct"] = (
        importance_df["importance"] / importance_df["importance"].sum() * 100
    ).round(1)

    print(f"   ✅ XGBoost CTR — MAE: {mae:.3f}% | R²: {r2:.3f}")
    return {
        "model"        : model,
        "encoders"     : encoders,
        "feature_cols" : feature_cols,
        "metrics"      : {"mae": round(mae, 4), "r2": round(r2, 3)},
        "importance_df": importance_df,
    }


def predict_ctr(model_result: dict, ad_type: str, platform: str,
                 age: str, gender: str, estimated_spend: float = 200,
                 estimated_impressions: int = 5000, day_of_week: int = 2) -> dict:
    """
    Prédit le CTR pour une nouvelle configuration d'annonce.

    Benchmarks CTR par plateforme :
      Meta=0.9% | Google=0.35% | Instagram=1.2% | TikTok=1.5%
    """
    model     = model_result["model"]
    encoders  = model_result["encoders"]
    feat_cols = model_result["feature_cols"]

    def encode(col, val):
        if col in encoders:
            try:
                return encoders[col].transform([val])[0]
            except ValueError:
                return 0
        return 0

    cpm_est = (estimated_spend / estimated_impressions * 1000) if estimated_impressions > 0 else 5
    input_data = {
        "ad_type_enc"         : encode("ad_type", ad_type),
        "platform_enc"        : encode("platform", platform),
        "audience_age_enc"    : encode("audience_age", age),
        "audience_gender_enc" : encode("audience_gender", gender),
        "spend_log"           : np.log1p(estimated_spend),
        "impressions_log"     : np.log1p(estimated_impressions),
        "cpm"                 : cpm_est,
        "day_of_week"         : day_of_week,
    }
    X_pred   = pd.DataFrame([{c: input_data.get(c, 0) for c in feat_cols}])
    ctr_pred = float(max(0, model.predict(X_pred)[0]))

    benchmarks = {"Meta":0.9, "Google":0.35, "Instagram":1.2, "TikTok":1.5, "LinkedIn":0.5}
    benchmark  = benchmarks.get(platform, 1.0)

    if ctr_pred >= benchmark * 1.5:   evaluation = "🔥 Excellent — CTR bien au-dessus de la moyenne"
    elif ctr_pred >= benchmark:        evaluation = "✅ Bon — CTR au-dessus de la moyenne"
    elif ctr_pred >= benchmark * 0.6: evaluation = "⚡ Moyen — CTR dans la moyenne"
    else:                              evaluation = "❌ Faible — CTR sous la moyenne, revoir la config"

    return {
        "ctr_predicted"    : round(ctr_pred, 3),
        "benchmark"        : benchmark,
        "evaluation"       : evaluation,
        "projected_clicks" : int(estimated_impressions * ctr_pred / 100),
        "config"           : {
            "ad_type": ad_type, "platform": platform, "age": age, "gender": gender,
            "spend": estimated_spend, "impressions": estimated_impressions
        }
    }