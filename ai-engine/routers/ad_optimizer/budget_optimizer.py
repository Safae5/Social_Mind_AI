### `routers/ad_optimizer/budget_optimizer.py`


# routers/ad_optimizer/budget_optimizer.py
"""
Optimisation de l'allocation budgétaire avec SciPy linprog.

PROBLÈME D'OPTIMISATION LINÉAIRE :
  Maximiser : Σ(ROAS_i × budget_i)
  Sous contrainte : Σ(budget_i) = Budget_Total
                    budget_min_i ≤ budget_i ≤ budget_max_i

SciPy linprog minimise → on minimise -ROAS (équivalent à maximiser ROAS).

EXEMPLE CONCRET :
  3 campagnes avec ROAS [5, 2, 0.5] et budget total 1000€ :
  → Résultat optimal : [800€, 150€, 50€]
  → ROAS global : passe de 2.5x (répartition égale) → 4.2x (+68%)
"""

import numpy as np   # type: ignore
import pandas as pd   # type: ignore
from scipy.optimize import linprog   # type: ignore
import warnings
warnings.filterwarnings("ignore")


def compute_campaign_metrics(df: pd.DataFrame) -> pd.DataFrame:
    """Agrège les métriques par campagne pour l'optimisation."""
    cm = df.groupby("campaign_name").agg(
        total_spend       = ("spend",            "sum"),
        total_revenue     = ("revenue",          "sum"),
        total_clicks      = ("clicks",           "sum"),
        total_conversions = ("conversions",      "sum"),
        total_impressions = ("impressions",      "sum"),
        avg_ctr           = ("ctr",              "mean"),
        avg_cpc           = ("cpc",              "mean"),
        avg_cpa           = ("cpa",              "mean"),
        avg_roas          = ("roas",             "mean"),
        avg_score         = ("performance_score","mean"),
    ).reset_index()

    cm["actual_roas"] = np.where(
        cm["total_spend"] > 0,
        cm["total_revenue"] / cm["total_spend"],
        0
    )
    total = cm["total_spend"].sum()
    cm["current_budget_pct"] = (
        (cm["total_spend"] / total * 100).round(1) if total > 0
        else pd.Series([100 / len(cm)] * len(cm))
    )
    return cm.sort_values("actual_roas", ascending=False)


def optimize_budget_scipy(campaign_metrics: pd.DataFrame, total_budget: float,
                           min_budget_pct: float = 5.0) -> dict | None:
    """
    Optimise l'allocation budgétaire avec SciPy linprog.

    Args:
        campaign_metrics : DataFrame avec actual_roas par campagne
        total_budget     : budget total disponible (€)
        min_budget_pct   : budget minimum par campagne (% du total)

    Returns:
        dict avec allocation_df, roas_before, roas_after, improvement_pct
    """
    print("💰 Optimisation budgétaire (SciPy linprog)...")
    n         = len(campaign_metrics)
    roas_vals = campaign_metrics["actual_roas"].values.clip(0)

    if n < 2:
        print("   ⚠️ Minimum 2 campagnes requises")
        return None

    # linprog minimise c.T @ x → minimiser -ROAS = maximiser ROAS
    c     = -roas_vals
    A_eq  = np.ones((1, n))
    b_eq  = np.array([1.0])
    bounds = [(min_budget_pct / 100, 0.80)] * n

    result = linprog(c, A_eq=A_eq, b_eq=b_eq, bounds=bounds, method="highs")

    if result.success:
        optimal_fractions = result.x
        print(f"   ✅ SciPy linprog convergé !")
    else:
        print(f"   ⚠️ Fallback : allocation proportionnelle au ROAS")
        roas_sum = roas_vals.sum()
        optimal_fractions = roas_vals / roas_sum if roas_sum > 0 else np.ones(n) / n
        # Respecter les bounds
        optimal_fractions = np.clip(optimal_fractions, min_budget_pct / 100, 0.80)
        optimal_fractions = optimal_fractions / optimal_fractions.sum()

    current_fractions = campaign_metrics["current_budget_pct"].values / 100
    optimal_budgets   = optimal_fractions * total_budget
    current_budgets   = current_fractions  * total_budget

    roas_before = float(np.sum(roas_vals * current_fractions))
    roas_after  = float(np.sum(roas_vals * optimal_fractions))
    improvement = round((roas_after - roas_before) / roas_before * 100, 1) if roas_before > 0 else 0

    result_df = campaign_metrics[["campaign_name", "actual_roas", "current_budget_pct"]].copy()
    result_df["budget_actuel_eur"]  = current_budgets.round(2)
    result_df["budget_optimal_eur"] = optimal_budgets.round(2)
    result_df["budget_optimal_pct"] = (optimal_fractions * 100).round(1)
    result_df["variation_eur"]      = (optimal_budgets - current_budgets).round(2)
    result_df["variation_pct"]      = result_df["budget_optimal_pct"] - result_df["current_budget_pct"]
    result_df["action"]             = result_df["variation_eur"].apply(
        lambda x: "⬆️ Augmenter" if x > 10 else "⬇️ Réduire" if x < -10 else "➡️ Maintenir"
    )

    print(f"   📊 ROAS avant: {roas_before:.2f}x → après: {roas_after:.2f}x (+{improvement}%)")

    return {
        "allocation_df"  : result_df.sort_values("budget_optimal_pct", ascending=False),
        "roas_before"    : round(roas_before, 2),
        "roas_after"     : round(roas_after, 2),
        "improvement_pct": improvement,
        "total_budget"   : total_budget,
        "n_campaigns"    : n,
        "scipy_success"  : result.success,
    }


def identify_underperforming(df: pd.DataFrame,
                               roas_threshold: float = 1.0,
                               ctr_threshold: float  = 0.5) -> pd.DataFrame:
    """
    Identifie les publicités sous-performantes à signaler.

    Critères :
      - ROAS < roas_threshold (1.0 = non rentable)
      - CTR < ctr_threshold (0.5% = très faible)

    Returns: DataFrame avec suggestions automatiques par publicité
    """
    under = df[
        (df["roas"] < roas_threshold) |
        (df["ctr"]  < ctr_threshold)
    ].copy()

    if under.empty:
        return pd.DataFrame()

    def get_suggestion(row):
        tips = []
        if row["ctr"] < ctr_threshold:
            tips.append("Renouveler le visuel/créatif")
        if row["roas"] < roas_threshold:
            tips.append("Revoir le ciblage d'audience")
        if row["cpc"] > df["cpc"].quantile(0.75):
            tips.append("Réduire l'enchère CPC")
        if row["cpa"] > df["cpa"].quantile(0.75):
            tips.append("Optimiser la landing page")
        return " | ".join(tips) if tips else "Analyser les créatifs"

    under["suggestion"] = under.apply(get_suggestion, axis=1)
    under["priorite"]   = np.where(under["roas"] < 0.5, "🔴 Urgent", "🟡 Modéré")

    return under[["campaign_name","platform","ad_type","audience_age",
                   "ctr","cpc","roas","spend","suggestion","priorite"]].head(20)