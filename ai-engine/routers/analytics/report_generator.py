### `routers/analytics/report_generator.py`


# routers/analytics/report_generator.py
"""
Génération des rapports PDF analytiques avec ReportLab.

Rapport mensuel (30 jours) :
  - Page de titre + infos client
  - KPIs globaux
  - Tendance engagement (graphique)
  - Prédictions Prophet (graphique + stats)
  - Performance par type de contenu (tableau + graphique)
  - Heatmap meilleurs créneaux
  - Importance des features Random Forest
  - Top 5 meilleurs posts
  - Recommandations automatiques
"""

import os
import io
import datetime
import base64
from reportlab.lib.pagesizes  import A4  # type: ignore
from reportlab.lib.styles     import getSampleStyleSheet, ParagraphStyle  # type: ignore
from reportlab.lib.units      import cm  # type: ignore
from reportlab.lib.colors     import HexColor, white  # type: ignore
from reportlab.platypus       import (  # type: ignore
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image as RLImage,
)
from reportlab.lib.enums import TA_CENTER  # type: ignore
from PIL import Image as PILImage  # type: ignore

DARK_BLUE  = HexColor("#1a1a2e")
ACCENT     = HexColor("#0f3460")
LIGHT_BLUE = HexColor("#d6e4f7")
LIGHT_GREY = HexColor("#f2f2f2")
GREEN      = HexColor("#27ae60")
ORANGE     = HexColor("#e67e22")
TEXT       = HexColor("#2c3e50")
WHITE      = white


def _styles():
    s = getSampleStyleSheet()
    s.add(ParagraphStyle("H",  fontSize=22, fontName="Helvetica-Bold", textColor=WHITE, alignment=TA_CENTER))
    s.add(ParagraphStyle("SH", fontSize=12, fontName="Helvetica-Bold", textColor=WHITE))
    s.add(ParagraphStyle("B",  fontSize=10, fontName="Helvetica",      textColor=TEXT, leading=14))
    s.add(ParagraphStyle("Li", fontSize=9,  fontName="Helvetica",      textColor=TEXT, leftIndent=12, spaceAfter=3))
    return s


def _section(title, styles, color=None):
    color = color or ACCENT
    t = Table([[Paragraph(title, styles["SH"])]], colWidths=[17*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1), color),
        ("TOPPADDING",(0,0),(-1,-1), 8),
        ("BOTTOMPADDING",(0,0),(-1,-1), 8),
        ("LEFTPADDING",(0,0),(-1,-1), 12),
    ]))
    return [t, Spacer(1, 0.3*cm)]


def _add_chart_b64(b64_str: str | None, width: float = 15*cm, height: float = 6*cm) -> list:
    """Ajoute un graphique base64 au PDF."""
    if not b64_str:
        return [Paragraph("[Graphique non disponible]", ParagraphStyle("NA", fontSize=9, textColor=TEXT))]
    try:
        img_data = base64.b64decode(b64_str)
        img_buf  = io.BytesIO(img_data)
        rl_img   = RLImage(img_buf, width=width, height=height)
        return [rl_img, Spacer(1, 0.3*cm)]
    except Exception as e:
        return [Paragraph(f"[Erreur graphique: {e}]", ParagraphStyle("NA", fontSize=9, textColor=TEXT))]


def generate_analytics_pdf(
    client_name    : str,
    kpis           : dict,
    weekly_summary : dict,
    top_posts      : list,
    prophet_results: dict,
    ml_result      : dict | None,
    charts         : dict,
    perf_type      : dict | None,
    perf_platform  : dict | None,
    output_path    : str = "rapport_analytics.pdf",
) -> str:
    """
    Génère le rapport PDF analytique complet.

    Args:
        client_name    : Nom du client pour l'en-tête
        kpis           : dict KPIs globaux (compute_global_kpis)
        weekly_summary : dict résumé semaine
        top_posts      : liste des top 5 posts
        prophet_results: dict résultats Prophet par métrique
        ml_result      : dict résultats ML (XGBoost + RF)
        charts         : dict {nom: base64_png}
        perf_type      : dict performance par type de contenu
        perf_platform  : dict performance par plateforme
        output_path    : chemin du PDF à générer

    Returns:
        Chemin absolu du PDF généré
    """
    print(f"📄 Génération rapport PDF pour {client_name}...")
    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)

    doc    = SimpleDocTemplate(output_path, pagesize=A4,
                                leftMargin=2*cm, rightMargin=2*cm,
                                topMargin=2*cm, bottomMargin=2*cm)
    styles = _styles()
    body   = []
    date_str = datetime.datetime.now().strftime("%d/%m/%Y à %H:%M")

    # ================================================================
    # PAGE DE TITRE
    # ================================================================
    tt = Table([[Paragraph(
        f"📊 RAPPORT ANALYTICS MENSUEL<br/><font size=11>{client_name}</font>",
        styles["H"]
    )]], colWidths=[17*cm])
    tt.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1), DARK_BLUE),
        ("TOPPADDING",(0,0),(-1,-1), 25),
        ("BOTTOMPADDING",(0,0),(-1,-1), 20),
    ]))
    body.append(tt)
    body.append(Spacer(1, 0.5*cm))

    info_rows = [
        ["Client",     client_name],
        ["Période",    f"{kpis.get('period_days', 30)} derniers jours"],
        ["Posts",      str(kpis.get("total_posts", 0))],
        ["Source",     "Meta Graph API v21 + Playwright (collecte /6h)"],
        ["Généré le",  date_str],
    ]
    it = Table(info_rows, colWidths=[5*cm, 12*cm])
    it.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(0,-1), LIGHT_BLUE),
        ("FONTNAME",(0,0),(0,-1), "Helvetica-Bold"),
        ("FONTSIZE",(0,0),(-1,-1), 10),
        ("GRID",(0,0),(-1,-1), 0.5, HexColor("#dee2e6")),
        ("TOPPADDING",(0,0),(-1,-1), 7),
        ("BOTTOMPADDING",(0,0),(-1,-1), 7),
        ("LEFTPADDING",(0,0),(-1,-1), 10),
        ("ROWBACKGROUNDS",(0,0),(-1,-1), [WHITE, LIGHT_GREY]),
    ]))
    body.append(it)
    body.append(PageBreak())

    # ================================================================
    # KPIs GLOBAUX
    # ================================================================
    body += _section("📊 KPIs GLOBAUX", styles)
    kpi_data = [
        ["📝 Total posts",     str(kpis.get("total_posts", 0)),
         "⚡ Engagement moy.", f"{kpis.get('avg_engagement_rate', 0)}%"],
        ["👀 Portée moyenne",  f"{kpis.get('avg_reach', 0):,.0f}",
         "🌐 Portée totale",   f"{kpis.get('total_reach', 0):,}"],
        ["👍 Likes totaux",    f"{kpis.get('total_likes', 0):,}",
         "💬 Commentaires",    f"{kpis.get('total_comments', 0):,}"],
        ["🔁 Partages totaux", f"{kpis.get('total_shares', 0):,}",
         "📈 Tendance",        f"{kpis.get('trend_direction', '')} ({kpis.get('trend_engagement', 0):+.1f}%)"],
    ]
    kt = Table(kpi_data, colWidths=[4.5*cm, 3*cm, 5*cm, 4.5*cm])
    kt.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(0,-1), LIGHT_BLUE), ("BACKGROUND",(2,0),(2,-1), LIGHT_BLUE),
        ("FONTNAME",(0,0),(0,-1), "Helvetica-Bold"), ("FONTNAME",(2,0),(2,-1), "Helvetica-Bold"),
        ("FONTSIZE",(0,0),(-1,-1), 10),
        ("GRID",(0,0),(-1,-1), 0.5, HexColor("#dee2e6")),
        ("TOPPADDING",(0,0),(-1,-1), 7), ("BOTTOMPADDING",(0,0),(-1,-1), 7),
        ("LEFTPADDING",(0,0),(-1,-1), 8),
        ("ROWBACKGROUNDS",(0,0),(-1,-1), [WHITE, LIGHT_GREY]),
    ]))
    body.append(kt)
    body.append(Spacer(1, 0.4*cm))

    # Résumé semaine
    if weekly_summary:
        body += _section("📅 RÉSUMÉ SEMAINE ÉCOULÉE", styles)
        w = weekly_summary
        body.append(Paragraph(
            f"Posts : {w.get('posts_this_week', 0)} | "
            f"Engagement : {w.get('avg_engagement', 0)}% ({w.get('engagement_change', 0):+.1f}%) | "
            f"Reach : {w.get('avg_reach', 0):,.0f} ({w.get('reach_change', 0):+.1f}%) | "
            f"Meilleur format : {w.get('best_post_type', 'N/A')}",
            styles["B"]
        ))
        body.append(Spacer(1, 0.3*cm))

    # ================================================================
    # TENDANCE ENGAGEMENT
    # ================================================================
    body += _section("📈 TENDANCE D'ENGAGEMENT", styles)
    body += _add_chart_b64(charts.get("trend"), width=16*cm, height=5*cm)

    # ================================================================
    # PRÉDICTIONS PROPHET
    # ================================================================
    body.append(PageBreak())
    body += _section("🔮 PRÉDICTIONS PROPHET — 30 PROCHAINS JOURS", styles)
    for metric, result in (prophet_results or {}).items():
        stats = result.get("stats", {})
        body.append(Paragraph(
            f"<b>{stats.get('metric_label', metric)} :</b> "
            f"Actuel : {stats.get('current_avg', 0)} → "
            f"Prédit dans 30j : <b>{stats.get('predicted_end', 0)}</b> "
            f"({stats.get('trend_direction', '')} {stats.get('growth_pct', 0):+.1f}%)",
            styles["B"]
        ))
    body += _add_chart_b64(charts.get("forecast"), width=16*cm, height=5.5*cm)

    # ================================================================
    # PERFORMANCE PAR TYPE
    # ================================================================
    body.append(PageBreak())
    body += _section("🎨 PERFORMANCE PAR TYPE DE CONTENU", styles)
    if perf_type:
        header  = ["Type", "Posts", "Engagement", "Reach moy.", "Likes moy."]
        pt_rows = [header] + [
            [row.get("content_type",""), str(int(row.get("nb_posts",0))),
             f"{row.get('avg_engagement',0):.1f}%",
             f"{row.get('avg_reach',0):,.0f}",
             str(row.get("avg_likes",""))]
            for row in perf_type
        ]
        ct = Table(pt_rows, colWidths=[4*cm, 2.5*cm, 3*cm, 3.5*cm, 4*cm])
        ct.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0), DARK_BLUE),
            ("TEXTCOLOR",(0,0),(-1,0), WHITE),
            ("FONTNAME",(0,0),(-1,0), "Helvetica-Bold"),
            ("FONTSIZE",(0,0),(-1,-1), 9),
            ("ALIGN",(1,0),(-1,-1), "CENTER"),
            ("GRID",(0,0),(-1,-1), 0.5, HexColor("#dee2e6")),
            ("ROWBACKGROUNDS",(0,1),(-1,-1), [WHITE, LIGHT_GREY]),
            ("TOPPADDING",(0,0),(-1,-1), 6), ("BOTTOMPADDING",(0,0),(-1,-1), 6),
        ]))
        body.append(ct)
        body.append(Spacer(1, 0.3*cm))
    body += _add_chart_b64(charts.get("content_type"), width=16*cm, height=5*cm)

    # ================================================================
    # HEATMAP
    # ================================================================
    body.append(PageBreak())
    body += _section("🕐 HEATMAP MEILLEURS CRÉNEAUX", styles)
    body += _add_chart_b64(charts.get("heatmap"), width=17*cm, height=6*cm)

    # ================================================================
    # IMPORTANCE DES FEATURES
    # ================================================================
    body += _section("🤖 FACTEURS D'INFLUENCE (Random Forest)", styles)
    body += _add_chart_b64(charts.get("importance"), width=14*cm, height=5*cm)
    if ml_result and "xgb_metrics" in ml_result:
        m = ml_result["xgb_metrics"]
        body.append(Paragraph(
            f"<b>XGBoost :</b> MAE = {m['mae']} | R² = {m['r2']} (entraîné sur {m['n_train']} posts)",
            styles["Li"]
        ))

    # ================================================================
    # TOP 5 MEILLEURS POSTS
    # ================================================================
    body.append(PageBreak())
    body += _section("🏆 TOP 5 MEILLEURS POSTS", styles, GREEN)
    if top_posts:
        header  = ["Date", "Type", "Plateforme", "Likes", "Comments", "Reach", "Engagement"]
        tp_rows = [header] + [
            [str(p.get("date",""))[:10], p.get("content_type",""), p.get("platform",""),
             str(int(p.get("likes",0))), str(int(p.get("comments",0))),
             f"{int(p.get('reach',0)):,}", f"{p.get('engagement_rate',0):.1f}%"]
            for p in top_posts
        ]
        tt2 = Table(tp_rows, colWidths=[2.5*cm, 2.5*cm, 3*cm, 2*cm, 2*cm, 2.5*cm, 2.5*cm])
        tt2.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0), HexColor("#1e8449")),
            ("TEXTCOLOR",(0,0),(-1,0), WHITE),
            ("FONTNAME",(0,0),(-1,0), "Helvetica-Bold"),
            ("FONTSIZE",(0,0),(-1,-1), 9),
            ("ALIGN",(3,0),(-1,-1), "CENTER"),
            ("GRID",(0,0),(-1,-1), 0.5, HexColor("#dee2e6")),
            ("ROWBACKGROUNDS",(0,1),(-1,-1), [WHITE, LIGHT_GREY]),
            ("TOPPADDING",(0,0),(-1,-1), 6), ("BOTTOMPADDING",(0,0),(-1,-1), 6),
        ]))
        body.append(tt2)

    # ================================================================
    # RECOMMANDATIONS
    # ================================================================
    body.append(Spacer(1, 0.4*cm))
    body += _section("💡 RECOMMANDATIONS AUTOMATIQUES", styles, ORANGE)
    recs = _generate_recommendations(kpis, perf_type, prophet_results)
    for rec in recs:
        body.append(Paragraph(f"• {rec}", styles["Li"]))

    doc.build(body)
    print(f"✅ Rapport PDF généré : {output_path}")
    return output_path


def generate_analytics_pdf_b64(client_name: str, kpis: dict, weekly_summary: dict,
                                  top_posts: list, prophet_results: dict, ml_result: dict | None,
                                  charts: dict, perf_type: dict | None, perf_platform: dict | None) -> str:
    """Génère le PDF et le retourne en base64 pour Laravel."""
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        path = tmp.name

    generate_analytics_pdf(client_name, kpis, weekly_summary, top_posts,
                             prophet_results, ml_result, charts, perf_type, perf_platform, path)

    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")
    os.unlink(path)
    return b64


def _generate_recommendations(kpis: dict, perf_type: list | None, prophet_results: dict) -> list:
    """Génère des recommandations automatiques depuis les données."""
    recs = []
    eng = kpis.get("avg_engagement_rate", 0)
    if eng < 2:
        recs.append("⚠️ Taux d'engagement sous 2% — Revoir la stratégie de contenu")
    elif eng >= 5:
        recs.append("✅ Excellent taux d'engagement — Capitaliser et augmenter la fréquence")

    trend = kpis.get("trend_engagement", 0)
    if trend < -10:
        recs.append(f"📉 Déclin de {trend}% — Analyser les changements algorithmiques")
    elif trend > 10:
        recs.append(f"📈 Croissance de +{trend}% — Accélérer la stratégie actuelle")

    if perf_type and len(perf_type) > 0:
        best = perf_type[0]
        recs.append(f"🏆 Format '{best.get('content_type', '')}' : meilleur engagement "
                    f"({best.get('avg_engagement', 0):.1f}%) — Augmenter sa fréquence")

    if prophet_results:
        for metric, result in prophet_results.items():
            stats = result.get("stats", {})
            if stats.get("growth_pct", 0) > 10:
                recs.append(f"🚀 {stats['metric_label']} prédit en hausse de +{stats['growth_pct']}%")
            elif stats.get("growth_pct", 0) < -10:
                recs.append(f"⚠️ {stats['metric_label']} prédit en baisse — Intervention recommandée")

    recs.append("📅 Publier aux heures identifiées dans la heatmap (pic 18h-21h)")
    recs.append("📊 Analyser les top 5 posts et répliquer leur format et ton")
    return recs