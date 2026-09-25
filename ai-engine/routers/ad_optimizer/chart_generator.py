### `routers/ad_optimizer/chart_generator.py`


# routers/ad_optimizer/chart_generator.py
"""
5 graphiques analytiques publicitaires en base64 PNG.

1. ROAS par campagne (barplot horizontal + seuils rentabilité)
2. CTR vs ROAS scatter (quadrants de performance)
3. Optimisation budget actuel vs optimal (SciPy)
4. Convergence Q-Learning + heatmap Q-table
5. Heatmap CTR Âge × Genre
"""

import matplotlib   # type: ignore
matplotlib.use("Agg")
import matplotlib.pyplot as plt  # type: ignore
import matplotlib.patches as mpatches   # type: ignore
import seaborn as sns  # type: ignore
import pandas as pd   # type: ignore
import numpy as np   # type: ignore
import base64, io

plt.rcParams.update({
    "figure.facecolor" : "#f8f9fa",
    "axes.facecolor"   : "#ffffff",
    "axes.grid"        : True,
    "grid.alpha"       : 0.3,
    "axes.spines.top"  : False,
    "axes.spines.right": False,
})
COLORS = {
    "primary": "#0f3460", "success": "#27ae60", "warning": "#e67e22",
    "danger" : "#e74c3c", "purple" : "#6a1b9a",
    "palette": ["#0f3460","#27ae60","#e67e22","#e74c3c","#6a1b9a","#00796b"],
}


def fig_to_b64(fig: plt.Figure) -> str:
    """Convertit une figure Matplotlib en base64 PNG."""
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=120, bbox_inches="tight")
    buf.seek(0)
    b64 = base64.b64encode(buf.read()).decode("utf-8")
    plt.close(fig)
    return b64


def chart_roas_by_campaign(campaign_metrics: pd.DataFrame) -> str | None:
    """ROAS par campagne avec seuils de rentabilité."""
    if campaign_metrics.empty:
        return None
    fig, ax = plt.subplots(figsize=(12, 5))
    sorted_df = campaign_metrics.sort_values("actual_roas", ascending=True)
    colors    = [COLORS["success"] if r >= 2 else COLORS["warning"] if r >= 1
                 else COLORS["danger"] for r in sorted_df["actual_roas"]]

    bars = ax.barh(sorted_df["campaign_name"], sorted_df["actual_roas"], color=colors)
    ax.axvline(1.0, color=COLORS["danger"],  linewidth=2, linestyle="--", label="Seuil rentabilité (ROAS=1)")
    ax.axvline(3.0, color=COLORS["success"], linewidth=2, linestyle="--", label="ROAS cible (3x)")
    for bar, val in zip(bars, sorted_df["actual_roas"]):
        ax.text(bar.get_width() + 0.05, bar.get_y() + bar.get_height()/2,
                f"{val:.2f}x", va="center", fontsize=9, fontweight="bold")
    ax.set_title("ROAS par Campagne", fontsize=13, fontweight="bold", color=COLORS["primary"])
    ax.set_xlabel("ROAS (Return On Ad Spend)")
    ax.legend()
    fig.tight_layout()
    return fig_to_b64(fig)


def chart_ctr_vs_roas_scatter(df: pd.DataFrame) -> str | None:
    """Scatter plot CTR vs ROAS avec quadrants de performance."""
    if df.empty:
        return None
    fig, ax = plt.subplots(figsize=(10, 7))
    ctr_med  = df["ctr"].median()
    roas_med = df["roas"].median()

    color_map = {
        "Top Performer": COLORS["success"], "Normal": COLORS["primary"],
        "CTR Faible"   : COLORS["warning"], "ROAS Négatif": COLORS["danger"],
        "CPA Élevé"    : COLORS["purple"],
    }
    colors_pts = [color_map.get(s, COLORS["primary"]) for s in df.get("status", ["Normal"]*len(df))]
    ax.scatter(df["ctr"], df["roas"].clip(0, 10), c=colors_pts, alpha=0.6, s=60)
    ax.axvline(ctr_med,  color="gray", linewidth=1, linestyle=":", alpha=0.7)
    ax.axhline(roas_med, color="gray", linewidth=1, linestyle=":", alpha=0.7)
    ax.text(df["ctr"].max()*0.7, roas_med*1.5, "🔥 Top Performers\n(Scaler le budget)",
            fontsize=9, color=COLORS["success"], alpha=0.8)
    ax.text(0.1, roas_med*1.5, "⚡ Bon ROAS\n(Améliorer CTR)",
            fontsize=9, color=COLORS["warning"], alpha=0.8)
    ax.text(0.1, 0.2, "❌ Sous-performants\n(Couper ou optimiser)",
            fontsize=9, color=COLORS["danger"], alpha=0.8)
    legend_patches = [mpatches.Patch(color=c, label=l) for l, c in color_map.items()]
    ax.legend(handles=legend_patches, loc="upper right", fontsize=8)
    ax.set_title("CTR vs ROAS — Quadrants de Performance", fontsize=13, fontweight="bold", color=COLORS["primary"])
    ax.set_xlabel("CTR (%)")
    ax.set_ylabel("ROAS")
    fig.tight_layout()
    return fig_to_b64(fig)


def chart_budget_optimization(opt_result: dict) -> str | None:
    """Comparaison budget actuel vs optimisé."""
    if not opt_result:
        return None
    alloc_df = opt_result["allocation_df"]
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    x, w = range(len(alloc_df)), 0.35
    axes[0].bar([i-w/2 for i in x], alloc_df["budget_actuel_eur"],  w, label="Actuel",   color=COLORS["warning"], alpha=0.8)
    axes[0].bar([i+w/2 for i in x], alloc_df["budget_optimal_eur"], w, label="Optimisé", color=COLORS["success"], alpha=0.8)
    axes[0].set_xticks(list(x))
    axes[0].set_xticklabels(alloc_df["campaign_name"], rotation=30, ha="right", fontsize=8)
    axes[0].set_title("Budget Actuel vs Optimisé (SciPy linprog)", fontweight="bold")
    axes[0].set_ylabel("Budget (€)")
    axes[0].legend()
    variations  = alloc_df["variation_eur"]
    colors_var  = [COLORS["success"] if v >= 0 else COLORS["danger"] for v in variations]
    axes[1].barh(alloc_df["campaign_name"], variations, color=colors_var, alpha=0.8)
    axes[1].axvline(0, color="black", linewidth=1)
    axes[1].set_title(f"Variation Budget\nROAS : {opt_result['roas_before']:.2f}x → {opt_result['roas_after']:.2f}x (+{opt_result['improvement_pct']:.1f}%)", fontweight="bold")
    axes[1].set_xlabel("Variation (€)")
    fig.suptitle("Optimisation Budgétaire SciPy linprog", fontsize=13, fontweight="bold")
    fig.tight_layout()
    return fig_to_b64(fig)


def chart_q_learning_convergence(q_result: dict) -> str | None:
    """Convergence Q-Learning + heatmap Q-table."""
    if not q_result or len(q_result.get("rewards_history", [])) < 10:
        return None
    rewards = q_result["rewards_history"]
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    axes[0].plot(rewards, alpha=0.3, color=COLORS["primary"], linewidth=0.5)
    window  = max(10, len(rewards) // 20)
    rolling = pd.Series(rewards).rolling(window).mean()
    axes[0].plot(rolling, color=COLORS["success"], linewidth=2, label=f"Moy. mobile ({window})")
    axes[0].set_title("Convergence Q-Learning — Récompenses", fontweight="bold", color=COLORS["primary"])
    axes[0].set_xlabel("Épisode")
    axes[0].set_ylabel("Récompense")
    axes[0].legend()
    Q_table = q_result["Q_table"]
    action_labels = [ACTIONS[i]["label"] for i in range(4)] if "ACTIONS" not in dir() else ["−20%","=","＋10%","＋25%"]  # type: ignore
    action_labels = ["−20%", "=", "＋10%", "＋25%"]
    sns.heatmap(Q_table, ax=axes[1], cmap="RdYlGn",
                xticklabels=action_labels,
                yticklabels=[f"É{i}" for i in range(len(Q_table))],
                annot=False, cbar_kws={"label": "Valeur Q"})
    axes[1].set_title("Q-Table (États × Actions)", fontweight="bold")
    fig.suptitle("Apprentissage par Renforcement — Stratégie Enchères", fontsize=13, fontweight="bold")
    fig.tight_layout()
    return fig_to_b64(fig)


def chart_ctr_heatmap_age_gender(df: pd.DataFrame) -> str | None:
    """Heatmap CTR par Âge × Genre."""
    try:
        pivot = df.pivot_table(values="ctr", index="audience_age",
                                columns="audience_gender", aggfunc="mean")
        if pivot.empty:
            return None
        fig, ax = plt.subplots(figsize=(10, 6))
        sns.heatmap(pivot, ax=ax, annot=True, fmt=".2f", cmap="YlOrRd",
                    linewidths=0.5, cbar_kws={"label": "CTR (%)"})
        ax.set_title("CTR Moyen par Âge × Genre", fontsize=13, fontweight="bold", color=COLORS["primary"])
        ax.set_xlabel("Genre")
        ax.set_ylabel("Tranche d'Âge")
        fig.tight_layout()
        return fig_to_b64(fig)
    except Exception:
        return None


def generate_all_charts(df: pd.DataFrame, campaign_metrics: pd.DataFrame,
                         opt_result: dict | None, q_result: dict | None) -> dict:
    """Génère les 5 graphiques en base64."""
    print("📊 Génération des 5 graphiques publicitaires...")
    charts = {}
    for key, fn, args in [
        ("roas",       chart_roas_by_campaign,       (campaign_metrics,)),
        ("scatter",    chart_ctr_vs_roas_scatter,     (df,)),
        ("budget",     chart_budget_optimization,     (opt_result,)),
        ("qlearning",  chart_q_learning_convergence,  (q_result,)),
        ("heatmap_ctr",chart_ctr_heatmap_age_gender,  (df,)),
    ]:
        try:
            result = fn(*args)
            if result:
                charts[key] = result
                print(f"   ✅ {key}")
        except Exception as e:
            print(f"   ⚠️ {key}: {e}")
    print(f"   ✅ {len(charts)}/5 graphiques générés en base64")
    return charts