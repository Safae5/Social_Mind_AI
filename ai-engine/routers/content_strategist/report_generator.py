### `routers/content_strategist/report_generator.py`


# routers/content_strategist/report_generator.py
"""Génération du rapport PDF Stratégie de Contenu avec ReportLab."""

import os
import datetime
from reportlab.lib.pagesizes  import A4
from reportlab.lib.styles     import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units      import cm
from reportlab.lib.colors     import HexColor, white
from reportlab.platypus       import (
    SimpleDocTemplate, Paragraph, Spacer, Table,
    TableStyle, PageBreak,
)
from reportlab.lib.enums import TA_CENTER

DARK_BLUE  = HexColor("#1a1a2e")
ACCENT     = HexColor("#0f3460")
LIGHT_BLUE = HexColor("#d6e4f7")
LIGHT_GREY = HexColor("#f2f2f2")
GREEN      = HexColor("#27ae60")
TEXT       = HexColor("#2c3e50")
WHITE      = white


def st():
    s = getSampleStyleSheet()
    s.add(ParagraphStyle("H",  fontSize=22, fontName="Helvetica-Bold", textColor=WHITE, alignment=TA_CENTER))
    s.add(ParagraphStyle("SH", fontSize=12, fontName="Helvetica-Bold", textColor=WHITE))
    s.add(ParagraphStyle("B",  fontSize=10, fontName="Helvetica",      textColor=TEXT, leading=14))
    s.add(ParagraphStyle("Li", fontSize=9,  fontName="Helvetica",      textColor=TEXT, leftIndent=12, spaceAfter=3))
    return s


def section(title, styles, color=None):
    t = Table([[Paragraph(title, styles["SH"])]], colWidths=[17*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1), color or ACCENT),
        ("TOPPADDING",(0,0),(-1,-1), 8),
        ("BOTTOMPADDING",(0,0),(-1,-1), 8),
        ("LEFTPADDING",(0,0),(-1,-1), 12),
    ]))
    return [t, Spacer(1, 0.3*cm)]


def generate_strategy_pdf(profile: dict, pillars: list[dict],
                            strategy: dict, hashtag_result: dict,
                            client_name: str = "Client",
                            output_path: str = "strategie_contenu.pdf") -> str:
    """
    Génère le rapport PDF complet de stratégie de contenu.

    Sections :
      - Page de titre + infos client
      - Stratégie éditoriale + fréquence
      - Piliers de contenu (BERTopic + LDA)
      - Hashtags recommandés par pilier (TF-IDF + KMeans)
      - Calendrier 7 jours (tableau)
      - Recommandations clés (Mistral 7B)
    """
    print("📄 Génération du rapport PDF Stratégie de Contenu...")
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

    doc     = SimpleDocTemplate(output_path, pagesize=A4,
                                 leftMargin=2*cm, rightMargin=2*cm,
                                 topMargin=2*cm, bottomMargin=2*cm)
    styles  = st()
    content = []
    date_str= datetime.datetime.now().strftime("%d/%m/%Y")

    # ---- Titre ----
    tt = Table([[Paragraph(
        f"✍️ STRATÉGIE DE CONTENU<br/><font size=11>{client_name}</font>",
        styles["H"]
    )]], colWidths=[17*cm])
    tt.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1), DARK_BLUE),
        ("TOPPADDING",(0,0),(-1,-1), 25),
        ("BOTTOMPADDING",(0,0),(-1,-1), 15),
    ]))
    content.append(tt)
    content.append(Spacer(1, 0.5*cm))

    info_rows = [
        ["Client",       client_name],
        ["Niche",        profile.get("niche", "N/A")],
        ["Audience",     profile.get("audience", "N/A")],
        ["Plateformes",  ", ".join(profile.get("plateformes", []))],
        ["Source données","Meta Graph API v21 + Playwright"],
        ["Date",         date_str],
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
    content.append(it)
    content.append(Spacer(1, 0.4*cm))

    # ---- Stratégie éditoriale ----
    content += section("🧭 STRATÉGIE ÉDITORIALE (Mistral 7B)", styles)
    content.append(Paragraph(strategy.get("strategie_editoriale", ""), styles["B"]))
    content.append(Spacer(1, 0.2*cm))
    content.append(Paragraph(f"<b>Ton de voix :</b> {strategy.get('tone_of_voice', '')}", styles["B"]))
    content.append(Spacer(1, 0.3*cm))

    freq = strategy.get("frequence_publication", {})
    if freq:
        freq_data = [["Plateforme", "Fréquence recommandée"]] + [[k, v] for k, v in freq.items()]
        ft = Table(freq_data, colWidths=[8.5*cm, 8.5*cm])
        ft.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0), ACCENT),
            ("TEXTCOLOR",(0,0),(-1,0), WHITE),
            ("FONTNAME",(0,0),(-1,0), "Helvetica-Bold"),
            ("FONTSIZE",(0,0),(-1,-1), 10),
            ("ALIGN",(1,0),(1,-1), "CENTER"),
            ("GRID",(0,0),(-1,-1), 0.5, HexColor("#dee2e6")),
            ("ROWBACKGROUNDS",(0,1),(-1,-1), [WHITE, LIGHT_GREY]),
            ("TOPPADDING",(0,0),(-1,-1), 6),
            ("BOTTOMPADDING",(0,0),(-1,-1), 6),
        ]))
        content.append(ft)
    content.append(Spacer(1, 0.4*cm))

    # ---- Piliers de contenu ----
    content += section("🏛️ PILIERS DE CONTENU (BERTopic + LDA)", styles)
    pillar_data = [["#", "Pilier", "Mots-clés principaux", "Source IA"]]
    for p in pillars:
        pillar_data.append([
            str(p["id"]), p["nom"],
            ", ".join(p["mots_cles"][:5]),
            p.get("source", "IA"),
        ])
    pt = Table(pillar_data, colWidths=[1*cm, 4.5*cm, 8.5*cm, 3*cm])
    pt.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0), DARK_BLUE),
        ("TEXTCOLOR",(0,0),(-1,0), WHITE),
        ("FONTNAME",(0,0),(-1,0), "Helvetica-Bold"),
        ("FONTSIZE",(0,0),(-1,-1), 9),
        ("ALIGN",(0,0),(0,-1), "CENTER"),
        ("GRID",(0,0),(-1,-1), 0.5, HexColor("#dee2e6")),
        ("ROWBACKGROUNDS",(0,1),(-1,-1), [WHITE, LIGHT_GREY]),
        ("TOPPADDING",(0,0),(-1,-1), 6),
        ("BOTTOMPADDING",(0,0),(-1,-1), 6),
        ("LEFTPADDING",(0,0),(-1,-1), 6),
    ]))
    content.append(pt)
    content.append(Spacer(1, 0.4*cm))

    # ---- Hashtags ----
    content += section("🏷️ HASHTAGS PAR PILIER (TF-IDF + KMeans)", styles)
    pillar_sets = hashtag_result.get("pillar_sets", {})
    for pilier_nom, tags in list(pillar_sets.items())[:5]:
        tags_str = "  ".join(tags[:10]) or "Aucun extrait"
        content.append(Paragraph(f"<b>{pilier_nom} :</b>", styles["B"]))
        content.append(Paragraph(tags_str, styles["Li"]))
        content.append(Spacer(1, 0.15*cm))
    content.append(Spacer(1, 0.3*cm))

    # ---- Calendrier 7 jours ----
    content.append(PageBreak())
    content += section("🗓️ CALENDRIER HEBDOMADAIRE DE CONTENU", styles)
    calendar = strategy.get("calendrier_7_jours", [])
    if calendar:
        cal_data = [["Jour", "Pilier", "Type", "Sujet", "Plateforme"]]
        for day in calendar:
            sujet = day.get("sujet", "")
            cal_data.append([
                day.get("jour", ""),
                day.get("pilier", "")[:20],
                day.get("type_contenu", ""),
                sujet[:50] + ("..." if len(sujet) > 50 else ""),
                day.get("plateforme", ""),
            ])
        ct = Table(cal_data, colWidths=[2*cm, 3.5*cm, 2.5*cm, 6.5*cm, 2.5*cm])
        ct.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0), DARK_BLUE),
            ("TEXTCOLOR",(0,0),(-1,0), WHITE),
            ("FONTNAME",(0,0),(-1,0), "Helvetica-Bold"),
            ("FONTSIZE",(0,0),(-1,-1), 8),
            ("GRID",(0,0),(-1,-1), 0.5, HexColor("#dee2e6")),
            ("ROWBACKGROUNDS",(0,1),(-1,-1), [WHITE, LIGHT_GREY]),
            ("TOPPADDING",(0,0),(-1,-1), 5),
            ("BOTTOMPADDING",(0,0),(-1,-1), 5),
            ("LEFTPADDING",(0,0),(-1,-1), 5),
            ("VALIGN",(0,0),(-1,-1), "MIDDLE"),
        ]))
        content.append(ct)
    content.append(Spacer(1, 0.4*cm))

    # ---- Recommandations ----
    content += section("💡 RECOMMANDATIONS CLÉS", styles, GREEN)
    for rec in strategy.get("recommandations_cles", []):
        content.append(Paragraph(f"• {rec}", styles["Li"]))

    doc.build(content)
    print(f"✅ Rapport PDF généré : {output_path}")
    return output_path