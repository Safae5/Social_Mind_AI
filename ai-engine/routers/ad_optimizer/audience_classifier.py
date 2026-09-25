### `routers/ad_optimizer/audience_classifier.py`


# routers/ad_optimizer/audience_classifier.py
"""
Classification des segments d'audience avec Scikit-learn.

Objectif : identifier quels segments (âge × genre × plateforme × format)
ont le plus fort potentiel de conversion.

Classes :
  🔥 FORT  (2) : ROAS >= 3 ET CTR >= 2% ET conv_rate >= 2%
  ✅ MOYEN (1) : performances dans la moyenne
  ❌ FAIBLE(0) : sous-performances à réduire

Algorithmes :
  - Random Forest Classifier (robuste, interprétable)
  - Gradient Boosting Classifier (plus précis)
  → Comparaison automatique, meilleur sélectionné
"""

import numpy as np    # type: ignore
import pandas as pd    # type: ignore
from sklearn.ensemble        import RandomForestClassifier, GradientBoostingClassifier   # type: ignore
from sklearn.preprocessing   import LabelEncoder   # type: ignore
from sklearn.model_selection import train_test_split  # type: ignore
from sklearn.metrics         import classification_report, accuracy_score   # type: ignore
import warnings
warnings.filterwarnings("ignore")


def create_audience_labels(df: pd.DataFrame) -> pd.DataFrame:
    """Crée les labels de classification basés sur les performances réelles."""
    df = df.copy()
    df["audience_class"] = 1  # Moyen par défaut
    # Fort
    df.loc[
        (df["roas"] >= 3.0) & (df["ctr"] >= 2.0) & (df["conversion_rate"] >= 2.0),
        "audience_class"
    ] = 2
    # Faible
    df.loc[
        (df["roas"] < 1.0) | ((df["ctr"] < 0.5) & (df["conversion_rate"] < 0.5)),
        "audience_class"
    ] = 0
    dist = df["audience_class"].value_counts()
    print(f"   📊 Classes — 🔥 Fort:{dist.get(2,0)} | ✅ Moyen:{dist.get(1,0)} | ❌ Faible:{dist.get(0,0)}")
    return df


def prepare_features_audience(df: pd.DataFrame) -> tuple:
    """Prépare les features pour la classification."""
    df_ml    = df.copy()
    encoders = {}
    for col in ["audience_age", "audience_gender", "platform", "ad_type"]:
        if col in df_ml.columns:
            le = LabelEncoder()
            df_ml[f"{col}_enc"] = le.fit_transform(df_ml[col].astype(str))
            encoders[col] = le

    feature_cols = [c for c in [
        "audience_age_enc", "audience_gender_enc", "platform_enc",
        "ad_type_enc", "ctr", "cpc", "cpm", "conversion_rate", "spend"
    ] if c in df_ml.columns]

    return df_ml[feature_cols].fillna(0), df_ml["audience_class"].fillna(1), encoders, feature_cols


def train_audience_classifier(df: pd.DataFrame) -> dict | None:
    """Entraîne et compare Random Forest vs Gradient Boosting."""
    print("🎯 Classification des segments d'audience...")
    df_labeled = create_audience_labels(df.copy())
    X, y, encoders, feature_cols = prepare_features_audience(df_labeled)

    if len(X) < 15:
        print("   ⚠️ Pas assez de données (minimum 15)")
        return None

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42)

    rf = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42, n_jobs=-1)
    rf.fit(X_train, y_train)
    rf_acc = accuracy_score(y_test, rf.predict(X_test))

    gb = GradientBoostingClassifier(n_estimators=100, max_depth=4, learning_rate=0.1, random_state=42)
    gb.fit(X_train, y_train)
    gb_acc = accuracy_score(y_test, gb.predict(X_test))

    best_model = rf if rf_acc >= gb_acc else gb
    best_name  = "Random Forest" if rf_acc >= gb_acc else "Gradient Boosting"
    best_acc   = max(rf_acc, gb_acc)

    print(f"   ✅ RF:{rf_acc:.3f} | GB:{gb_acc:.3f} → Meilleur : {best_name} ({best_acc:.3f})")

    df_labeled["predicted_class"] = best_model.predict(X)
    class_map = {0: "❌ Faible", 1: "✅ Moyen", 2: "🔥 Fort"}
    df_labeled["segment_label"]   = df_labeled["predicted_class"].map(class_map)

    top_segments = (
        df_labeled[df_labeled["predicted_class"] == 2]
        .groupby(["audience_age", "audience_gender", "platform"])
        .agg(avg_roas=("roas","mean"), avg_ctr=("ctr","mean"), count=("roas","count"))
        .sort_values("avg_roas", ascending=False)
        .head(10).reset_index()
    )

    report = classification_report(
        y_test, best_model.predict(X_test),
        target_names=["Faible","Moyen","Fort"], output_dict=True
    )

    return {
        "best_model"  : best_model,
        "best_name"   : best_name,
        "accuracy"    : round(best_acc, 3),
        "rf_accuracy" : round(rf_acc, 3),
        "gb_accuracy" : round(gb_acc, 3),
        "encoders"    : encoders,
        "feature_cols": feature_cols,
        "report"      : report,
        "top_segments": top_segments,
        "df_labeled"  : df_labeled,
    }


def predict_segment_potential(classifier_result: dict, age: str, gender: str,
                                platform: str, ad_type: str, ctr: float = 1.0,
                                cpc: float = 0.8, cpm: float = 5.0,
                                conv_rate: float = 2.0, spend: float = 200) -> dict:
    """Prédit le potentiel d'un segment d'audience."""
    model     = classifier_result["best_model"]
    encoders  = classifier_result["encoders"]
    feat_cols = classifier_result["feature_cols"]

    def encode(col, val):
        if col in encoders:
            try:
                return encoders[col].transform([val])[0]
            except ValueError:
                return 0
        return 0

    input_data = {
        "audience_age_enc"    : encode("audience_age", age),
        "audience_gender_enc" : encode("audience_gender", gender),
        "platform_enc"        : encode("platform", platform),
        "ad_type_enc"         : encode("ad_type", ad_type),
        "ctr": ctr, "cpc": cpc, "cpm": cpm,
        "conversion_rate": conv_rate, "spend": spend,
    }
    X_pred = pd.DataFrame([{c: input_data.get(c, 0) for c in feat_cols}])
    pred   = int(model.predict(X_pred)[0])
    proba  = model.predict_proba(X_pred)[0]

    labels = {0: "❌ Faible potentiel", 1: "✅ Potentiel moyen", 2: "🔥 Fort potentiel"}
    recs   = {
        2: f"✅ Augmenter le budget sur {platform} — {age} {gender}. ROAS élevé → Cibler lookalike audiences.",
        1: f"⚡ Optimiser les créatifs pour {platform} — {age} {gender}. Tester Vidéo/Carrousel.",
        0: f"❌ Réduire budget sur {platform} — {age} {gender}. Sous-performe — réallouer."
    }

    return {
        "segment_class"  : pred,
        "segment_label"  : labels[pred],
        "confidence"     : round(max(proba) * 100, 1),
        "proba_faible"   : round(proba[0] * 100, 1),
        "proba_moyen"    : round(proba[1] * 100, 1),
        "proba_fort"     : round(proba[2] * 100, 1),
        "recommendation" : recs[pred],
    }