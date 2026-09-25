### `routers/competitive_intel/report_generator.py`


# routers/competitive_intel/report_generator.py
"""
Rapport PDF de veille concurrentielle avec ReportLab.

Structure :
  - Page de titre + résumé client
  - Résumé exécutif + score de menace
  - Analyse de sentiment par concurrent + graphique
  - Comparaison d'engagement + graphique
  - Clusters thématiques + graphique + tableau
  - Patterns de contenu viral + wordcloud + hashtags + types
  - Contre-stratégie Mistral 7B + calendrier 4 semaines
"""

import os, io, base64, datetime
from reportlab.lib.pagesizes  import A4   # type: ignore
from reportlab.lib.styles     import getSampleStyleSheet, ParagraphStyle   # type: ignore
from reportlab.lib.units      import cm   # type: ignore
from reportlab.lib.colors     import HexColor, white   # type: ignore
from reportlab.platypus       import (  # type: ignore
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image as RLImage
)
from reportlab.lib.enums import TA_CENTER   # type: ignore

DARK_BLUE  = HexColor("#1a1a2e");  ACCENT     = HexColor("#0f3460")
LIGHT_BLUE = HexColor("#d6e4f7");  LIGHT_GREY = HexColor("#f2f2f2")
GREEN      = HexColor("#27ae60");  RED        = HexColor("#e74c3c")
ORANGE     = HexColor("#e67e22");  TEXT       = HexColor("#2c3e50")
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
    if not b64_str:
        return []
    try:
        img_data = base64.b64decode(b64_str)
        return [RLImage(io.BytesIO(img_data), width=width, height=height), Spacer(1, 0.3*cm)]
    except Exception:
        return []


def generate_competitive_report(
    client_name      : str,
    client_brand     : str,
    client_niche     : str,
    metadata         : dict,
    sentiment_by_comp: object,
    cluster_result   : dict | None,
    viral_patterns   : dict,
    strategy         : dict,
    charts           : dict,
    output_path      : str = "rapport_veille.pdf",
) -> str:
    """Génère le rapport PDF de veille concurrentielle."""
    print(f"📄 Génération rapport de veille pour {client_brand}...")
    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)

    doc    = SimpleDocTemplate(output_path, pagesize=A4,
                                leftMargin=2*cm, rightMargin=2*cm,
                                topMargin=2*cm, bottomMargin=2*cm)
    styles = _styles()
    body   = []
    date_s = datetime.datetime.now().strftime("%d/%m/%Y à %H:%M")

    # ---- Titre ----
    tt = Table([[Paragraph(
        f"🔍 RAPPORT DE VEILLE CONCURRENTIELLE<br/>"
        f"<font size=11>{client_brand} — {client_niche}</font>", styles["H"]
    )]], colWidths=[17*cm])
    tt.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1), DARK_BLUE),
        ("TOPPADDING",(0,0),(-1,-1), 25), ("BOTTOMPADDING",(0,0),(-1,-1), 20),
    ]))
    body.append(tt)
    body.append(Spacer(1, 0.5*cm))

    info = [
        ["Client",              client_name],
        ["Marque analysée",     client_brand],
        ["Niche",               client_niche],
        ["Concurrents suivis",  str(metadata.get("n_competitors", 0))],
        ["Posts analysés",      str(metadata.get("total_posts", 0))],
        ["Posts viraux",        str(metadata.get("viral_posts", 0))],
        ["Source données",      "Meta Graph API v21 + Playwright"],
        ["Période",             f"{metadata.get('date_start','N/A')} → {metadata.get('date_end','N/A')}"],
        ["Généré le",           date_s],
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

    # ---- Résumé exécutif ----
    body += _section("📋 RÉSUMÉ EXÉCUTIF", styles)
    score = strategy.get("score_menace_concurrentielle", 50)
    score_color = "#e74c3c" if score > 70 else "#e67e22" if score > 40 else "#27ae60"
    body.append(Paragraph(
        f"<b>Score de menace concurrentielle :</b> "
        f"<font color='{score_color}'><b>{score}/100</b></font>",
        styles["B"]
    ))
    body.append(Paragraph(strategy.get("resume_executif", ""), styles["B"]))
    body.append(Spacer(1, 0.4*cm))

    # ---- Sentiment ----
    body += _section("💬 ANALYSE DE SENTIMENT PAR CONCURRENT (VADER + TextBlob)", styles)
    body += _add_chart_b64(charts.get("sentiment"), height=5*cm)

    if sentiment_by_comp is not None and not sentiment_by_comp.empty:
        sh = ["Concurrent", "Posts", "Positif%", "Compound", "Subjectivité", "Stratégie Tonale"]
        sr = [sh] + [
            [str(r["competitor"])[:14], str(int(r["total_posts"])),
             f"{r['positive_pct']:.0f}%", f"{r['avg_compound']:.3f}",
             f"{r['avg_subjectivity']:.2f}", str(r["tone_strategy"])[:20]]
            for _, r in sentiment_by_comp.iterrows()
        ]
        st = Table(sr, colWidths=[3.5*cm, 1.5*cm, 2.5*cm, 2.5*cm, 2.5*cm, 4.5*cm])
        st.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0), DARK_BLUE), ("TEXTCOLOR",(0,0),(-1,0), WHITE),
            ("FONTNAME",(0,0),(-1,0), "Helvetica-Bold"), ("FONTSIZE",(0,0),(-1,-1), 9),
            ("GRID",(0,0),(-1,-1), 0.5, HexColor("#dee2e6")),
            ("ROWBACKGROUNDS",(0,1),(-1,-1), [WHITE, LIGHT_GREY]),
            ("TOPPADDING",(0,0),(-1,-1), 6), ("BOTTOMPADDING",(0,0),(-1,-1), 6),
        ]))
        body.append(st)

    # ---- Engagement ----
    body.append(PageBreak())
    body += _section("📊 COMPARAISON D'ENGAGEMENT", styles)
    body += _add_chart_b64(charts.get("engagement"), height=5*cm)

    # ---- Clusters ----
    body += _section("🗺️ CLUSTERS THÉMATIQUES (K-Means + DBSCAN)", styles)
    body += _add_chart_b64(charts.get("clusters"), height=6*cm)

    if cluster_result and "cluster_stats" in cluster_result:
        cs = cluster_result["cluster_stats"]
        ch = ["Cluster", "Posts", "Engagement moy.", "Posts viraux", "Concurrent dominant"]
        cr = [ch] + [
            [str(r.get("cluster_name",""))[:18], str(int(r.get("n_posts",0))),
             f"{r.get('avg_engagement',0):.0f}", str(int(r.get("viral_posts",0))),
             str(r.get("top_competitor",""))[:14]]
            for _, r in cs.iterrows()
        ]
        cst = Table(cr, colWidths=[4.5*cm, 2*cm, 3.5*cm, 3*cm, 4*cm])
        cst.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0), ACCENT), ("TEXTCOLOR",(0,0),(-1,0), WHITE),
            ("FONTNAME",(0,0),(-1,0), "Helvetica-Bold"), ("FONTSIZE",(0,0),(-1,-1), 9),
            ("GRID",(0,0),(-1,-1), 0.5, HexColor("#dee2e6")),
            ("ROWBACKGROUNDS",(0,1),(-1,-1), [WHITE, LIGHT_GREY]),
            ("TOPPADDING",(0,0),(-1,-1), 6), ("BOTTOMPADDING",(0,0),(-1,-1), 6),
        ]))
        body.append(cst)

    # ---- Patterns viraux ----
    body.append(PageBreak())
    body += _section("🔥 PATTERNS DE CONTENU VIRAL (TF-IDF)", styles, GREEN)
    body.append(Paragraph(
        f"<b>Multiplicateur d'engagement viral :</b> {viral_patterns.get('viral_multiplier',0)}x | "
        f"<b>Taux de viralité :</b> {viral_patterns.get('viral_rate',0)}%",
        styles["B"]
    ))
    body += _add_chart_b64(charts.get("wordcloud"), height=4*cm)
    body += _add_chart_b64(charts.get("hashtags"),  height=5*cm)
    body += _add_chart_b64(charts.get("types"),     height=5*cm)

    # ---- Contre-stratégie ----
    body.append(PageBreak())
    body += _section("💡 CONTRE-STRATÉGIE (Mistral 7B — HuggingFace)", styles, ORANGE)

    body.append(Paragraph(strategy.get("analyse_paysage", ""), styles["B"]))
    body.append(Spacer(1, 0.3*cm))

    cs_dict = strategy.get("contre_strategie", {})
    body.append(Paragraph(f"<b>Positionnement :</b> {cs_dict.get('positionnement','')}", styles["B"]))
    body.append(Paragraph(f"<b>Ton recommandé :</b> {cs_dict.get('ton_recommande','')}", styles["B"]))
    body.append(Spacer(1, 0.2*cm))

    for opp in strategy.get("opportunites_differentiation", [])[:4]:
        body.append(Paragraph(
            f"<b>[{opp.get('priorite','Moyenne')}]</b> {opp.get('opportunite','')} — "
            f"💡 {opp.get('action_concrete','')} ({opp.get('canal','')})",
            styles["Li"]
        ))

    body.append(Spacer(1, 0.3*cm))
    body.append(Paragraph("<b>📅 Plan d'action 4 semaines :</b>", styles["B"]))
    for week in strategy.get("calendrier_actions", []):
        body.append(Paragraph(
            f"• Semaine {week.get('semaine','')} : {week.get('action','')}",
            styles["Li"]
        ))

    body.append(Spacer(1, 0.3*cm))
    kpis = strategy.get("kpis_a_surveiller", [])
    if kpis:
        body.append(Paragraph(f"<b>📌 KPIs à surveiller :</b> {', '.join(kpis)}", styles["B"]))

    doc.build(body)
    print(f"✅ Rapport de veille PDF généré : {output_path}")
    return output_path


def generate_report_b64(
    client_name: str, client_brand: str, client_niche: str,
    metadata: dict, sentiment_by_comp, cluster_result: dict | None,
    viral_patterns: dict, strategy: dict, charts: dict,
) -> str:
    """Génère le PDF et le retourne en base64 pour Laravel."""
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        path = tmp.name
    generate_competitive_report(
        client_name, client_brand, client_niche, metadata,
        sentiment_by_comp, cluster_result, viral_patterns, strategy, charts, path
    )
    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")
    os.unlink(path)
    return b64