### `routers/analytics/chart_generator.py`


# routers/analytics/chart_generator.py
"""
Génération des 7 graphiques analytiques avec Matplotlib + Seaborn.

Graphiques :
  1. Tendance d'engagement (série temporelle + rolling 7j)
  2. Prédictions Prophet (30 jours avec intervalles de confiance)
  3. Performance par type de contenu (barplot horizontal)
  4. Heatmap Heure × Jour (créneaux optimaux de publication)
  5. Importance des features Random Forest
  6. Distribution des taux d'engagement (histogramme)
  7. Performance par plateforme (barplot)

Tous les graphiques retournés en base64 PNG pour le frontend React.
"""

import matplotlib  # type: ignore
matplotlib.use("Agg")
import matplotlib.pyplot as plt   # type: ignore
import matplotlib.dates as mdates  # type: ignore
import seaborn as sns   # type: ignore
import pandas as pd   # type: ignore
import numpy as np   # type: ignore
import base64
import io
import os

plt.rcParams.update({
    "figure.facecolor" : "#f8f9fa",
    "axes.facecolor"   : "#ffffff",
    "axes.grid"        : True,
    "grid.alpha"       : 0.3,
    "axes.spines.top"  : False,
    "axes.spines.right": False,
})

COLORS = {
    "primary" : "#0f3460",
    "success" : "#27ae60",
    "warning" : "#e67e22",
    "danger"  : "#e74c3c",
    "accent"  : "#1a1a2e",
    "palette" : ["#0f3460","#27ae60","#e67e22","#e74c3c","#6a1b9a","#00796b"],
}


def fig_to_base64(fig: plt.Figure) -> str:
    """Convertit une figure Matplotlib en base64 PNG."""
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=120, bbox_inches="tight",
                facecolor=fig.get_facecolor())
    buf.seek(0)
    b64 = base64.b64encode(buf.read()).decode("utf-8")
    plt.close(fig)
    return b64


def fig_to_path(fig: plt.Figure, output_dir: str, filename: str) -> str:
    """Sauvegarde une figure sur disque et retourne le chemin."""
    os.makedirs(output_dir, exist_ok=True)
    path = os.path.join(output_dir, filename)
    fig.savefig(path, dpi=120, bbox_inches="tight")
    plt.close(fig)
    return path


def chart_engagement_trend(df: pd.DataFrame) -> str:
    """Tendance d'engagement dans le temps (rolling 7j)."""
    fig, ax = plt.subplots(figsize=(12, 4))
    daily = df.groupby(df["date"].dt.date)["engagement_rate"].mean().reset_index()
    daily.columns = ["date", "er"]
    daily["date"] = pd.to_datetime(daily["date"])
    daily["ma7"]  = daily["er"].rolling(7, min_periods=1).mean()

    ax.fill_between(daily["date"], daily["er"], alpha=0.15, color=COLORS["primary"])
    ax.plot(daily["date"], daily["er"], alpha=0.4, color=COLORS["primary"], linewidth=0.8, label="Journalier")
    ax.plot(daily["date"], daily["ma7"], color=COLORS["primary"], linewidth=2.5, label="Moyenne 7j")
    ax.set_title("Tendance du Taux d'Engagement", fontsize=13, fontweight="bold", color=COLORS["accent"])
    ax.set_xlabel("Date")
    ax.set_ylabel("Taux d'Engagement (%)")
    ax.legend()
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%d/%m"))
    plt.xticks(rotation=30)
    fig.tight_layout()
    return fig_to_base64(fig)


def chart_prophet_forecast(forecast_result: dict) -> str | None:
    """Prédictions Prophet avec intervalles de confiance."""
    if not forecast_result:
        return None
    fig, ax = plt.subplots(figsize=(12, 5))
    hist    = forecast_result["historical"]
    fc_fut  = forecast_result["forecast_fut"]
    label   = forecast_result["stats"]["metric_label"]

    ax.plot(hist["ds"], hist["y"], color=COLORS["primary"], linewidth=2, label="Historique", zorder=3)
    ax.plot(fc_fut["ds"], fc_fut["yhat"], color=COLORS["success"], linewidth=2.5,
            linestyle="--", label="Prédiction 30j", zorder=3)
    ax.fill_between(fc_fut["ds"], fc_fut["yhat_lower"], fc_fut["yhat_upper"],
                    alpha=0.25, color=COLORS["success"], label="Intervalle 80%")
    ax.axvline(hist["ds"].max(), color="gray", linewidth=1, linestyle=":", alpha=0.7, label="Aujourd'hui")
    ax.set_title(f"Prédiction Prophet — {label} (30 jours)", fontsize=13, fontweight="bold", color=COLORS["accent"])
    ax.set_xlabel("Date")
    ax.set_ylabel(label)
    ax.legend()
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%d/%m"))
    plt.xticks(rotation=30)
    fig.tight_layout()
    return fig_to_base64(fig)


def chart_content_type_performance(perf_df: pd.DataFrame) -> str | None:
    """Barplot horizontal : performances par type de contenu."""
    if perf_df.empty:
        return None
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    s1 = perf_df.sort_values("avg_engagement", ascending=True)
    axes[0].barh(s1["content_type"], s1["avg_engagement"],
                 color=COLORS["palette"][:len(s1)], edgecolor="white")
    axes[0].set_title("Engagement Moyen par Type", fontweight="bold", color=COLORS["accent"])
    axes[0].set_xlabel("Taux d'Engagement (%)")

    s2 = perf_df.sort_values("avg_reach", ascending=True)
    axes[1].barh(s2["content_type"], s2["avg_reach"],
                 color=COLORS["palette"][:len(s2)], edgecolor="white")
    axes[1].set_title("Reach Moyen par Type", fontweight="bold", color=COLORS["accent"])
    axes[1].set_xlabel("Reach Moyen")

    fig.suptitle("Performance par Type de Contenu", fontsize=14, fontweight="bold")
    fig.tight_layout()
    return fig_to_base64(fig)


def chart_heatmap_hour_day(df: pd.DataFrame) -> str | None:
    """Heatmap Heure × Jour des taux d'engagement."""
    pivot = df.pivot_table(values="engagement_rate", index="day_of_week",
                            columns="hour", aggfunc="mean")
    day_order = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
    day_fr    = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"]
    existing  = [d for d in day_order if d in pivot.index]
    pivot     = pivot.reindex(existing)
    pivot.index = [day_fr[day_order.index(d)] for d in existing]

    fig, ax = plt.subplots(figsize=(16, 6))
    sns.heatmap(pivot, ax=ax, cmap="YlOrRd", annot=True, fmt=".1f",
                linewidths=0.5, cbar_kws={"label": "Taux d'Engagement (%)"})
    ax.set_title("Heatmap Meilleurs Créneaux de Publication (Heure × Jour)",
                 fontsize=13, fontweight="bold", color=COLORS["accent"], pad=15)
    ax.set_xlabel("Heure de Publication")
    ax.set_ylabel("")
    fig.tight_layout()
    return fig_to_base64(fig)


def chart_feature_importance(importance_df: pd.DataFrame) -> str | None:
    """Importance des features Random Forest."""
    if importance_df is None or importance_df.empty:
        return None
    feature_labels = {
        "reach_log"        : "Portée (log)",
        "hour"             : "Heure de publication",
        "day_num"          : "Jour de la semaine",
        "content_type_enc" : "Type de contenu",
        "platform_enc"     : "Plateforme",
        "saves"            : "Sauvegardes",
    }
    labels = [feature_labels.get(f, f) for f in importance_df["feature"]]
    fig, ax = plt.subplots(figsize=(10, 5))
    bars = ax.barh(labels, importance_df["importance_pct"],
                   color=[COLORS["palette"][i % len(COLORS["palette"])] for i in range(len(importance_df))],
                   edgecolor="white")
    for bar, val in zip(bars, importance_df["importance_pct"]):
        ax.text(bar.get_width() + 0.3, bar.get_y() + bar.get_height()/2,
                f"{val:.1f}%", va="center", fontsize=9, fontweight="bold")
    ax.set_title("Importance des Features — Random Forest\n(Facteurs influençant l'engagement)",
                 fontsize=12, fontweight="bold", color=COLORS["accent"])
    ax.set_xlabel("Importance (%)")
    ax.invert_yaxis()
    fig.tight_layout()
    return fig_to_base64(fig)


def chart_engagement_distribution(df: pd.DataFrame) -> str | None:
    """Distribution des taux d'engagement."""
    fig, ax = plt.subplots(figsize=(10, 4))
    data = df["engagement_rate"].clip(0, df["engagement_rate"].quantile(0.99))
    ax.hist(data, bins=30, color=COLORS["primary"], alpha=0.7, edgecolor="white")
    ax.axvline(data.mean(),   color=COLORS["danger"],  linewidth=2,
               linestyle="--", label=f"Moyenne : {data.mean():.1f}%")
    ax.axvline(data.median(), color=COLORS["success"], linewidth=2,
               linestyle="--", label=f"Médiane : {data.median():.1f}%")
    ax.set_title("Distribution des Taux d'Engagement", fontsize=12, fontweight="bold", color=COLORS["accent"])
    ax.set_xlabel("Taux d'Engagement (%)")
    ax.set_ylabel("Nombre de Posts")
    ax.legend()
    fig.tight_layout()
    return fig_to_base64(fig)


def chart_platform_performance(perf_platform: pd.DataFrame) -> str | None:
    """Barplot performances par plateforme."""
    if perf_platform is None or perf_platform.empty:
        return None
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    colors = [COLORS["palette"][i % len(COLORS["palette"])] for i in range(len(perf_platform))]
    axes[0].bar(perf_platform["platform"], perf_platform["avg_engagement"], color=colors)
    axes[0].set_title("Engagement par Plateforme", fontweight="bold")
    axes[0].set_ylabel("Taux d'Engagement (%)")
    plt.setp(axes[0].xaxis.get_majorticklabels(), rotation=15)
    axes[1].bar(perf_platform["platform"], perf_platform["avg_reach"], color=colors)
    axes[1].set_title("Reach Moyen par Plateforme", fontweight="bold")
    axes[1].set_ylabel("Reach Moyen")
    plt.setp(axes[1].xaxis.get_majorticklabels(), rotation=15)
    fig.suptitle("Performance par Plateforme", fontsize=13, fontweight="bold")
    fig.tight_layout()
    return fig_to_base64(fig)


def generate_all_charts(df: pd.DataFrame, prophet_results: dict,
                         ml_result: dict | None,
                         perf_type: pd.DataFrame, perf_platform: pd.DataFrame) -> dict:
    """
    Génère les 7 graphiques et les retourne en base64.
    Chaque graphique est encodé en base64 PNG pour le frontend React.
    """
    print("📊 Génération des 7 graphiques analytiques...")
    charts = {}

    charts["trend"]        = chart_engagement_trend(df)
    print("   ✅ Tendance engagement")

    if prophet_results and "engagement_rate" in prophet_results:
        charts["forecast"] = chart_prophet_forecast(prophet_results["engagement_rate"])
        print("   ✅ Prédictions Prophet")

    if not perf_type.empty:
        charts["content_type"] = chart_content_type_performance(perf_type)
        print("   ✅ Performance par type")

    charts["heatmap"] = chart_heatmap_hour_day(df)
    print("   ✅ Heatmap créneaux")

    if ml_result and "importance_df" in ml_result:
        charts["importance"] = chart_feature_importance(ml_result["importance_df"])
        print("   ✅ Importance features")

    charts["distribution"] = chart_engagement_distribution(df)
    print("   ✅ Distribution engagement")

    if not perf_platform.empty:
        charts["platforms"] = chart_platform_performance(perf_platform)
        print("   ✅ Performance plateformes")

    print(f"   ✅ {len(charts)} graphiques générés en base64")
    return charts