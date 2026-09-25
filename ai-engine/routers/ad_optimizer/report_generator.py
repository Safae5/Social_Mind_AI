### `routers/ad_optimizer/report_generator.py`


# routers/ad_optimizer/report_generator.py
"""
Rapport ROI PDF hebdomadaire avec ReportLab.

Structure :
  - Page de titre + résumé client
  - KPIs globaux (CTR, CPC, ROAS, CPA, conversions)
  - ROAS par campagne + graphique
  - Recommandations SciPy allocation budgétaire + graphique
  - Publicités sous-performantes à signaler + scatter plot
  - Stratégie Q-Learning enchères + graphique convergence
  - Segmentation audience + top segments
  - Heatmap CTR Âge × Genre
"""

import os, io, base64, datetime
from reportlab.lib.pagesizes  import A4   # type: ignore
from reportlab.lib.styles     import getSampleStyleSheet, ParagraphStyle  # type: ignore
from reportlab.lib.units      import cm  # type: ignore
from reportlab.lib.colors     import HexColor, white   # type: ignore
from reportlab.platypus       import (   # type: ignore
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image as RLImage
)
from reportlab.lib.enums import TA_CENTER   # type: ignore

DARK_BLUE  = HexColor("#1a1a2e");  ACCENT    = HexColor("#0f3460")
LIGHT_BLUE = HexColor("#d6e4f7");  LIGHT_GREY= HexColor("#f2f2f2")
GREEN      = HexColor("#27ae60");  RED       = HexColor("#e74c3c")
ORANGE     = HexColor("#e67e22");  TEXT      = HexColor("#2c3e50")
WHITE      = white


def _styles():
    s = getSampleStyleSheet()
    s.add(ParagraphStyle("H",  fontSize=22, fontName="Helvetica-Bold", textColor=WHITE, alignment=TA_CENTER))
    s.add(ParagraphStyle("SH", fontSize=12, fontName="Helvetica-Bold", textColor=WHITE))
    s.add(ParagraphStyle("B",  fontSize=10, fontName="Helvetica",      textColor=TEXT,  leading=14))
    s.add(ParagraphStyle("Li", fontSize=9,  fontName="Helvetica",      textColor=TEXT,  leftIndent=12, spaceAfter=3))
    return s


def _section(title, styles, color=None):
    t = Table([[Paragraph(title, styles["SH"])]], colWidths=[17*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1), color or ACCENT),
        ("TOPPADDING",(0,0),(-1,-1), 8), ("BOTTOMPADDING",(0,0),(-1,-1), 8),
        ("LEFTPADDING",(0,0),(-1,-1), 12),
    ]))
    return [t, Spacer(1, 0.3*cm)]


def _add_chart_b64(b64_str, width=16*cm, height=6*cm):
    """Ajoute un graphique base64 au PDF."""
    if not b64_str:
        return []
    try:
        img_data = base64.b64decode(b64_str)
        return [RLImage(io.BytesIO(img_data), width=width, height=height), Spacer(1, 0.3*cm)]
    except Exception:
        return []


def generate_roi_report(
    client_name     : str,
    metadata        : dict,
    campaign_metrics: object,      # pd.DataFrame
    opt_result      : dict | None,
    underperforming : object,      # pd.DataFrame
    ctr_metrics     : dict | None,
    segment_result  : dict | None,
    q_result        : dict | None,
    charts          : dict,
    output_path     : str = "rapport_roi.pdf",
) -> str:
    """Génère le rapport ROI PDF hebdomadaire complet."""
    print(f"📄 Génération rapport ROI pour {client_name}...")
    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)

    doc    = SimpleDocTemplate(output_path, pagesize=A4,
                                leftMargin=2*cm, rightMargin=2*cm,
                                topMargin=2*cm, bottomMargin=2*cm)
    styles = _styles()
    body   = []
    date_s = datetime.datetime.now().strftime("%d/%m/%Y à %H:%M")

    # ---- Titre ----
    tt = Table([[Paragraph(
        f"💰 RAPPORT ROI PUBLICITAIRE<br/><font size=11>{client_name}</font>", styles["H"]
    )]], colWidths=[17*cm])
    tt.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1), DARK_BLUE),
        ("TOPPADDING",(0,0),(-1,-1), 25), ("BOTTOMPADDING",(0,0),(-1,-1), 20),
    ]))
    body.append(tt)
    body.append(Spacer(1, 0.5*cm))

    info = [
        ["Client",          client_name],
        ["Période",         f"{metadata.get('date_start','N/A')} → {metadata.get('date_end','N/A')}"],
        ["Source données",  "Meta Ads API v21 + Google Ads API + Playwright"],
        ["Campagnes",       str(metadata.get("total_campaigns", 0))],
        ["Budget total",    f"{metadata.get('total_spend', 0):.2f} €"],
        ["Revenus totaux",  f"{metadata.get('total_revenue', 0):.2f} €"],
        ["ROAS global",     f"{metadata.get('overall_roas', 0):.2f}x"],
        ["Généré le",       date_s],
    ]
    it = Table(info, colWidths=[5*cm, 12*cm])
    it.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(0,-1), LIGHT_BLUE), ("FONTNAME",(0,0),(0,-1), "Helvetica-Bold"),
        ("FONTSIZE",(0,0),(-1,-1), 10), ("GRID",(0,0),(-1,-1), 0.5, HexColor("#dee2e6")),
        ("TOPPADDING",(0,0),(-1,-1), 7), ("BOTTOMPADDING",(0,0),(-1,-1), 7),
        ("LEFTPADDING",(0,0),(-1,-1), 10),
        ("ROWBACKGROUNDS",(0,0),(-1,-1), [WHITE, LIGHT_GREY]),
    ]))
    body.append(it)
    body.append(PageBreak())

    # ---- KPIs ----
    body += _section("📊 KPIs GLOBAUX DE LA PÉRIODE", styles)
    kpi_data = [
        ["💰 Budget total",      f"{metadata.get('total_spend',0):.2f} €",
         "💵 Revenus totaux",    f"{metadata.get('total_revenue',0):.2f} €"],
        ["📊 ROAS global",       f"{metadata.get('overall_roas',0):.2f}x",
         "🖱️ CTR moyen",        f"{metadata.get('avg_ctr',0):.3f}%"],
        ["💲 CPC moyen",         f"{metadata.get('avg_cpc',0):.3f} €",
         "🎯 CPA moyen",        f"{metadata.get('avg_cpa',0):.2f} €"],
        ["👆 Clics totaux",      f"{metadata.get('total_clicks',0):,}",
         "✅ Conversions",       f"{metadata.get('total_conversions',0):,}"],
        ["🔥 Top performers",    str(metadata.get("top_performers",0)),
         "⚠️ Sous-performants", str(metadata.get("underperforming",0))],
    ]
    kt = Table(kpi_data, colWidths=[4.5*cm, 4*cm, 4.5*cm, 4*cm])
    kt.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(0,-1), LIGHT_BLUE), ("BACKGROUND",(2,0),(2,-1), LIGHT_BLUE),
        ("FONTNAME",(0,0),(0,-1), "Helvetica-Bold"), ("FONTNAME",(2,0),(2,-1), "Helvetica-Bold"),
        ("FONTSIZE",(0,0),(-1,-1), 10), ("GRID",(0,0),(-1,-1), 0.5, HexColor("#dee2e6")),
        ("TOPPADDING",(0,0),(-1,-1), 7), ("BOTTOMPADDING",(0,0),(-1,-1), 7),
        ("LEFTPADDING",(0,0),(-1,-1), 8),
        ("ROWBACKGROUNDS",(0,0),(-1,-1), [WHITE, LIGHT_GREY]),
    ]))
    body.append(kt)
    body.append(Spacer(1, 0.4*cm))

    # ---- ROAS campagnes ----
    body += _section("💰 ROAS PAR CAMPAGNE", styles)
    body += _add_chart_b64(charts.get("roas"), height=5*cm)

    if campaign_metrics is not None and not campaign_metrics.empty:
        h = ["Campagne", "Budget (€)", "Revenus (€)", "ROAS", "CTR %", "CPA €"]
        rows = [h] + [
            [str(r.get("campaign_name",""))[:18], f"{r.get('total_spend',0):.2f}",
             f"{r.get('total_revenue',0):.2f}", f"{r.get('actual_roas',0):.2f}x",
             f"{r.get('avg_ctr',0):.3f}%", f"{r.get('avg_cpa',0):.2f}"]
            for _, r in campaign_metrics.iterrows()
        ]
        cmt = Table(rows, colWidths=[4*cm, 2.5*cm, 2.5*cm, 2.5*cm, 2.5*cm, 3*cm])
        cmt.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0), DARK_BLUE), ("TEXTCOLOR",(0,0),(-1,0), WHITE),
            ("FONTNAME",(0,0),(-1,0), "Helvetica-Bold"), ("FONTSIZE",(0,0),(-1,-1), 9),
            ("ALIGN",(1,0),(-1,-1), "CENTER"), ("GRID",(0,0),(-1,-1), 0.5, HexColor("#dee2e6")),
            ("ROWBACKGROUNDS",(0,1),(-1,-1), [WHITE, LIGHT_GREY]),
            ("TOPPADDING",(0,0),(-1,-1), 6), ("BOTTOMPADDING",(0,0),(-1,-1), 6),
        ]))
        body.append(cmt)

    # ---- Optimisation budget ----
    body.append(PageBreak())
    body += _section("💡 RECOMMANDATIONS ALLOCATION BUDGÉTAIRE (SciPy linprog)", styles, GREEN)
    if opt_result:
        body.append(Paragraph(
            f"<b>ROAS avant :</b> {opt_result['roas_before']:.2f}x → "
            f"<b>ROAS après :</b> {opt_result['roas_after']:.2f}x "
            f"(<font color='green'>+{opt_result['improvement_pct']:.1f}%</font>)",
            styles["B"]
        ))
        body.append(Spacer(1, 0.3*cm))
        body += _add_chart_b64(charts.get("budget"), height=5*cm)

        ah = ["Campagne","Budget actuel","Budget optimal","Variation","Action"]
        ar = [ah] + [
            [str(r["campaign_name"])[:16], f"{r['budget_actuel_eur']:.2f} €",
             f"{r['budget_optimal_eur']:.2f} €", f"{r['variation_eur']:+.2f} €", str(r["action"])]
            for _, r in opt_result["allocation_df"].iterrows()
        ]
        at = Table(ar, colWidths=[4*cm, 3*cm, 3*cm, 3*cm, 4*cm])
        at.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0), DARK_BLUE), ("TEXTCOLOR",(0,0),(-1,0), WHITE),
            ("FONTNAME",(0,0),(-1,0), "Helvetica-Bold"), ("FONTSIZE",(0,0),(-1,-1), 9),
            ("ALIGN",(1,0),(-1,-1), "CENTER"), ("GRID",(0,0),(-1,-1), 0.5, HexColor("#dee2e6")),
            ("ROWBACKGROUNDS",(0,1),(-1,-1), [WHITE, LIGHT_GREY]),
            ("TOPPADDING",(0,0),(-1,-1), 6), ("BOTTOMPADDING",(0,0),(-1,-1), 6),
        ]))
        body.append(at)

    # ---- Sous-performants ----
    body.append(PageBreak())
    body += _section("⚠️ PUBLICITÉS SOUS-PERFORMANTES À SIGNALER", styles, RED)
    body += _add_chart_b64(charts.get("scatter"), height=5*cm)

    if underperforming is not None and not underperforming.empty:
        uh = ["Campagne","Plateforme","CTR%","ROAS","Priorité","Suggestion"]
        ur = [uh] + [
            [str(r.get("campaign_name",""))[:14], str(r.get("platform","")),
             f"{r.get('ctr',0):.3f}%", f"{r.get('roas',0):.2f}x",
             str(r.get("priorite","")), str(r.get("suggestion",""))[:32]]
            for _, r in underperforming.head(8).iterrows()
        ]
        ut = Table(ur, colWidths=[3*cm, 2.5*cm, 2*cm, 2*cm, 2.5*cm, 5*cm])
        ut.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0), HexColor("#c0392b")), ("TEXTCOLOR",(0,0),(-1,0), WHITE),
            ("FONTNAME",(0,0),(-1,0), "Helvetica-Bold"), ("FONTSIZE",(0,0),(-1,-1), 8),
            ("GRID",(0,0),(-1,-1), 0.5, HexColor("#dee2e6")),
            ("ROWBACKGROUNDS",(0,1),(-1,-1), [WHITE, HexColor("#fde8e8")]),
            ("TOPPADDING",(0,0),(-1,-1), 5), ("BOTTOMPADDING",(0,0),(-1,-1), 5),
        ]))
        body.append(ut)
    else:
        body.append(Paragraph("✅ Aucune publicité sous-performante détectée !", styles["B"]))

    # ---- Q-Learning ----
    body.append(PageBreak())
    body += _section("🎮 STRATÉGIE D'ENCHÈRES Q-LEARNING", styles, HexColor("#6a1b9a"))
    if q_result:
        body.append(Paragraph(
            f"Agent Q-Learning entraîné sur <b>{q_result['n_episodes']} épisodes</b>. "
            f"Récompense moyenne : <b>{q_result['avg_reward']:.2f}</b> | "
            f"α={q_result['alpha']} | γ={q_result['gamma']}",
            styles["B"]
        ))
        body.append(Spacer(1, 0.3*cm))
        body += _add_chart_b64(charts.get("qlearning"), height=5.5*cm)

    # ---- Segments + Heatmap ----
    body += _section("🎯 SEGMENTATION AUDIENCE + HEATMAP CTR", styles)
    if segment_result:
        body.append(Paragraph(
            f"<b>{segment_result.get('best_name','RF')} :</b> "
            f"Accuracy = {segment_result.get('accuracy',0):.3f} | "
            f"RF = {segment_result.get('rf_accuracy',0):.3f} | "
            f"GB = {segment_result.get('gb_accuracy',0):.3f}",
            styles["B"]
        ))

    if ctr_metrics:
        body.append(Paragraph(
            f"<b>XGBoost CTR Predictor :</b> MAE = {ctr_metrics.get('mae',0):.4f}% | "
            f"R² = {ctr_metrics.get('r2',0):.3f}",
            styles["B"]
        ))

    body += _add_chart_b64(charts.get("heatmap_ctr"), height=5*cm)

    doc.build(body)
    print(f"✅ Rapport ROI PDF généré : {output_path}")
    return output_path


def generate_roi_pdf_b64(client_name: str, metadata: dict, campaign_metrics,
                           opt_result: dict | None, underperforming,
                           ctr_metrics: dict | None, segment_result: dict | None,
                           q_result: dict | None, charts: dict) -> str:
    """Génère le PDF et le retourne en base64 pour Laravel."""
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        path = tmp.name
    generate_roi_report(
        client_name, metadata, campaign_metrics, opt_result, underperforming,
        ctr_metrics, segment_result, q_result, charts, path
    )
    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")
    os.unlink(path)
    return b64