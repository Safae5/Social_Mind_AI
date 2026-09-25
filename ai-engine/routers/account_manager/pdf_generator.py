### `routers/account_manager/pdf_generator.py`

# routers/account_manager/pdf_generator.py
"""
Génération du PDF stratégie marketing 30 jours avec ReportLab.

Structure du PDF (3 sections) :
  1. Page de titre + profil client (infos extraites par Mistral)
  2. Résumé exécutif + positionnement + KPIs 30 jours
  3. Plan 30 jours semaine par semaine (calendrier détaillé)
"""

from reportlab.lib.pagesizes  import A4   # type: ignore
from reportlab.lib.styles     import getSampleStyleSheet, ParagraphStyle  # type: ignore
from reportlab.lib.units      import cm   # type: ignore
from reportlab.lib.colors     import HexColor, white   # type: ignore
from reportlab.platypus       import (   # type: ignore
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable  
)
from reportlab.lib.enums      import TA_CENTER, TA_LEFT    # type: ignore
import datetime
import os

# Palette de couleurs Social Mind AI
COLOR_PRIMARY   = HexColor("#1a1a2e")
COLOR_SECONDARY = HexColor("#0f3460")
COLOR_ACCENT    = HexColor("#16213e")
COLOR_SUCCESS   = HexColor("#27ae60")
COLOR_WARNING   = HexColor("#f39c12")
COLOR_LIGHT_BG  = HexColor("#f8f9fa")
COLOR_TEXT      = HexColor("#2c3e50")


def generate_client_pdf(
    client_profile : dict,
    strategy       : dict,
    entities       : dict,
    transcription  : dict,
    output_path    : str = "strategie_client.pdf",
    agent_name     : str = "Social Mind AI",
) -> str:
    """
    Génère le PDF complet : profil client + stratégie 30 jours.

    Returns:
        Chemin vers le PDF généré
    """
    print(f"📄 Génération PDF stratégie client...")

    doc = SimpleDocTemplate(
        output_path,
        pagesize     = A4,
        leftMargin   = 2 * cm,
        rightMargin  = 2 * cm,
        topMargin    = 2 * cm,
        bottomMargin = 2 * cm,
        title        = f"Stratégie Marketing — {client_profile.get('business_name', 'Client')}",
    )

    styles  = _create_styles()
    content = []

    # ---- PAGE 1 : TITRE + PROFIL CLIENT ----
    content += _build_title_page(styles, client_profile, agent_name)
    content.append(PageBreak())

    # ---- PAGE 2 : RÉSUMÉ EXÉCUTIF + KPIs ----
    content += _build_executive_summary(styles, strategy, client_profile)
    content.append(PageBreak())

    # ---- PAGES 3-6 : PLAN 30 JOURS ----
    content += _build_30_day_plan(styles, strategy)

    # ---- DERNIÈRE PAGE : ENTITÉS + TRANSCRIPTION RÉSUMÉE ----
    content.append(PageBreak())
    content += _build_appendix(styles, entities, transcription)

    doc.build(content)
    print(f"   ✅ PDF généré : {output_path}")
    return output_path


def _create_styles() -> object:
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name='MainTitle', fontSize=24, fontName='Helvetica-Bold',
        textColor=white, alignment=TA_CENTER, spaceAfter=6
    ))
    styles.add(ParagraphStyle(
        name='SectionTitle', fontSize=13, fontName='Helvetica-Bold',
        textColor=white, spaceAfter=6
    ))
    styles.add(ParagraphStyle(
        name='BodyText2', fontSize=10, fontName='Helvetica',
        textColor=COLOR_TEXT, spaceAfter=4, leading=14
    ))
    styles.add(ParagraphStyle(
        name='SmallText', fontSize=8, fontName='Helvetica',
        textColor=COLOR_TEXT, spaceAfter=2
    ))
    return styles


def _section_header(title: str, styles) -> list:
    data   = [[Paragraph(title, styles['SectionTitle'])]]
    table  = Table(data, colWidths=[17 * cm])
    table.setStyle(TableStyle([
        ('BACKGROUND',   (0, 0), (-1, -1), COLOR_SECONDARY),
        ('TOPPADDING',   (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING',(0, 0), (-1, -1), 8),
        ('LEFTPADDING',  (0, 0), (-1, -1), 12),
    ]))
    return [table, Spacer(1, 0.3 * cm)]


def _build_title_page(styles, profile: dict, agent_name: str) -> list:
    elements = []
    business = profile.get("business_name", "Client")
    niche    = profile.get("niche", "N/A")
    date_str = datetime.datetime.now().strftime("%d/%m/%Y")

    # Bannière titre
    banner_data = [[Paragraph(f"🎯 STRATÉGIE MARKETING 30 JOURS", styles['MainTitle'])]]
    banner      = Table(banner_data, colWidths=[17 * cm])
    banner.setStyle(TableStyle([
        ('BACKGROUND',   (0, 0), (-1, -1), COLOR_PRIMARY),
        ('TOPPADDING',   (0, 0), (-1, -1), 25),
        ('BOTTOMPADDING',(0, 0), (-1, -1), 15),
    ]))
    elements.append(banner)
    elements.append(Spacer(1, 0.5 * cm))

    # Infos client
    info_data = [
        ["Client",        business],
        ["Niche/Secteur", niche],
        ["Générée le",    date_str],
        ["Par",           agent_name],
    ]
    info_table = Table(info_data, colWidths=[5 * cm, 12 * cm])
    info_table.setStyle(TableStyle([
        ('FONTNAME',    (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE',    (0, 0), (-1, -1), 11),
        ('TEXTCOLOR',   (0, 0), (0, -1), COLOR_SECONDARY),
        ('TEXTCOLOR',   (1, 0), (1, -1), COLOR_TEXT),
        ('TOPPADDING',  (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING',(0, 0),(-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('GRID',        (0, 0), (-1, -1), 0.5, HexColor("#dee2e6")),
        ('ROWBACKGROUNDS',(0, 0), (-1, -1), [white, COLOR_LIGHT_BG]),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 0.5 * cm))

    # Profil client détaillé
    elements += _section_header("👤 PROFIL CLIENT", styles)
    audience = profile.get("audience_cible", {})
    profile_data = [
        ["Plateforme(s)",   ", ".join(profile.get("plateformes", []))],
        ["Audience",        f"{audience.get('age_range','N/A')} · {audience.get('genre','N/A')} · {audience.get('localisation','N/A')}"],
        ["Objectifs",       " | ".join(profile.get("objectifs", []))],
        ["Ton comm.",       profile.get("ton_communication", "N/A")],
        ["Budget estimé",   profile.get("budget_mensuel") or "Non précisé"],
        ["Langue contenu",  profile.get("langue_contenu", "français")],
        ["Concurrents",     ", ".join(profile.get("concurrents", [])) or "Non identifiés"],
    ]
    p_table = Table(profile_data, colWidths=[4 * cm, 13 * cm])
    p_table.setStyle(TableStyle([
        ('FONTNAME',    (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE',    (0, 0), (-1, -1), 10),
        ('TEXTCOLOR',   (0, 0), (0, -1), COLOR_SECONDARY),
        ('TOPPADDING',  (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING',(0, 0),(-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('GRID',        (0, 0), (-1, -1), 0.5, HexColor("#dee2e6")),
        ('ROWBACKGROUNDS',(0, 0), (-1, -1), [white, COLOR_LIGHT_BG]),
    ]))
    elements.append(p_table)

    return elements


def _build_executive_summary(styles, strategy: dict, profile: dict) -> list:
    elements = []
    resume   = strategy.get("resume_executif", {})
    kpis     = strategy.get("kpis_30_jours", {})
    budget   = strategy.get("budget_recommande", {})
    outils   = strategy.get("outils_recommandes", [])

    elements += _section_header("📊 RÉSUMÉ EXÉCUTIF", styles)

    summary_data = [
        ["Positionnement", resume.get("positionnement", "N/A")],
        ["USP",            resume.get("usp", "N/A")],
        ["Approche",       resume.get("strategie_globale", "N/A")],
    ]
    s_table = Table(summary_data, colWidths=[4 * cm, 13 * cm])
    s_table.setStyle(TableStyle([
        ('FONTNAME',    (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE',    (0, 0), (-1, -1), 10),
        ('TEXTCOLOR',   (0, 0), (0, -1), COLOR_SECONDARY),
        ('TOPPADDING',  (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING',(0, 0),(-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('GRID',        (0, 0), (-1, -1), 0.5, HexColor("#dee2e6")),
    ]))
    elements.append(s_table)
    elements.append(Spacer(1, 0.4 * cm))

    # KPIs 30 jours
    elements += _section_header("🎯 KPIs VISÉS SUR 30 JOURS", styles)
    kpis_data = [
        ["KPI", "Objectif"],
        ["Abonnés visés",     kpis.get("followers_vises", "N/A")],
        ["Engagement visé",   kpis.get("engagement_vise", "N/A")],
        ["Portée estimée",    kpis.get("portee_estimee", "N/A")],
        ["Publications total",kpis.get("publications_total", "N/A")],
    ]
    k_table = Table(kpis_data, colWidths=[8 * cm, 9 * cm])
    k_table.setStyle(TableStyle([
        ('BACKGROUND',  (0, 0), (-1, 0), COLOR_SECONDARY),
        ('TEXTCOLOR',   (0, 0), (-1, 0), white),
        ('FONTNAME',    (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE',    (0, 0), (-1, -1), 10),
        ('ALIGN',       (1, 0), (1, -1), 'CENTER'),
        ('TOPPADDING',  (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING',(0, 0),(-1, -1), 7),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('GRID',        (0, 0), (-1, -1), 0.5, HexColor("#dee2e6")),
        ('ROWBACKGROUNDS',(0, 1), (-1, -1), [white, COLOR_LIGHT_BG]),
    ]))
    elements.append(k_table)
    elements.append(Spacer(1, 0.4 * cm))

    # Budget
    elements += _section_header("💰 BUDGET RECOMMANDÉ", styles)
    b_data = [
        ["Production contenu", budget.get("contenu", "N/A")],
        ["Publicité payante",  budget.get("pub_payante") or "Non recommandé au départ"],
        ["Total mensuel",      budget.get("total", "N/A")],
    ]
    b_table = Table(b_data, colWidths=[6 * cm, 11 * cm])
    b_table.setStyle(TableStyle([
        ('FONTNAME',    (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE',    (0, 0), (-1, -1), 10),
        ('TEXTCOLOR',   (0, 0), (0, -1), COLOR_SUCCESS),
        ('TOPPADDING',  (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING',(0, 0),(-1, -1), 7),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('GRID',        (0, 0), (-1, -1), 0.5, HexColor("#dee2e6")),
        ('ROWBACKGROUNDS',(0, 0), (-1, -1), [white, COLOR_LIGHT_BG]),
    ]))
    elements.append(b_table)

    if outils:
        elements.append(Spacer(1, 0.3 * cm))
        elements.append(Paragraph(
            f"<b>🛠️ Outils recommandés :</b> {' · '.join(outils)}",
            styles['BodyText2']
        ))

    return elements


def _build_30_day_plan(styles, strategy: dict) -> list:
    elements = []
    semaines = strategy.get("semaines", [])

    WEEK_COLORS = [
        HexColor("#1565C0"),
        HexColor("#6A1B9A"),
        HexColor("#2E7D32"),
        HexColor("#E65100"),
    ]

    for week in semaines:
        week_num   = week.get("numero", 1)
        theme      = week.get("theme", f"Semaine {week_num}")
        objectif   = week.get("objectif", "")
        actions    = week.get("actions", [])
        week_color = WEEK_COLORS[(week_num - 1) % len(WEEK_COLORS)]

        # En-tête semaine coloré
        header_data = [[Paragraph(f"📅 SEMAINE {week_num} — {theme}", styles['SectionTitle'])]]
        header_table = Table(header_data, colWidths=[17 * cm])
        header_table.setStyle(TableStyle([
            ('BACKGROUND',   (0, 0), (-1, -1), week_color),
            ('TOPPADDING',   (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING',(0, 0), (-1, -1), 8),
            ('LEFTPADDING',  (0, 0), (-1, -1), 12),
        ]))
        elements.append(header_table)

        if objectif:
            elements.append(Paragraph(f"🎯 {objectif}", styles['BodyText2']))
        elements.append(Spacer(1, 0.2 * cm))

        # Tableau des actions
        action_data = [["Jour", "Plateforme", "Type", "Sujet", "Heure"]]
        for action in actions:
            hashtags = " ".join(action.get("hashtags", [])[:3])
            action_data.append([
                str(action.get("jour", "")),
                action.get("plateforme", "").capitalize(),
                action.get("type", ""),
                (action.get("sujet", ""))[:55] + ("..." if len(action.get("sujet", "")) > 55 else ""),
                action.get("heure", ""),
            ])

        a_table = Table(action_data, colWidths=[1.5*cm, 3*cm, 3*cm, 7.5*cm, 2*cm])
        a_table.setStyle(TableStyle([
            ('BACKGROUND',  (0, 0), (-1, 0), COLOR_PRIMARY),
            ('TEXTCOLOR',   (0, 0), (-1, 0), white),
            ('FONTNAME',    (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE',    (0, 0), (-1, -1), 8),
            ('ALIGN',       (0, 0), (-1, -1), 'CENTER'),
            ('ALIGN',       (3, 0), (3, -1), 'LEFT'),
            ('TOPPADDING',  (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING',(0, 0),(-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('GRID',        (0, 0), (-1, -1), 0.3, HexColor("#dee2e6")),
            ('ROWBACKGROUNDS',(0, 1), (-1, -1), [white, COLOR_LIGHT_BG]),
        ]))
        elements.append(a_table)
        elements.append(Spacer(1, 0.5 * cm))

    return elements


def _build_appendix(styles, entities: dict, transcription: dict) -> list:
    elements = []
    elements += _section_header("🏷️ ENTITÉS CLÉS DÉTECTÉES (spaCy NER)", styles)

    ent_data = [["Type", "Entités détectées"]]
    labels   = {"ORG": "🏢 Marques/Org.", "PER": "👤 Personnes", "LOC": "📍 Lieux", "MISC": "🔖 Divers"}
    for key, label in labels.items():
        ents = entities.get(key, [])
        if ents:
            ent_data.append([label, ", ".join(ents[:10])])

    if len(ent_data) > 1:
        e_table = Table(ent_data, colWidths=[4 * cm, 13 * cm])
        e_table.setStyle(TableStyle([
            ('BACKGROUND',  (0, 0), (-1, 0), COLOR_SECONDARY),
            ('TEXTCOLOR',   (0, 0), (-1, 0), white),
            ('FONTNAME',    (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE',    (0, 0), (-1, -1), 9),
            ('TOPPADDING',  (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING',(0, 0),(-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('GRID',        (0, 0), (-1, -1), 0.5, HexColor("#dee2e6")),
            ('ROWBACKGROUNDS',(0, 1), (-1, -1), [white, COLOR_LIGHT_BG]),
        ]))
        elements.append(e_table)

    # Extrait transcription
    elements.append(Spacer(1, 0.5 * cm))
    elements += _section_header("📝 EXTRAIT DE LA TRANSCRIPTION", styles)
    text_sample = transcription.get("text", "")[:800] + ("..." if len(transcription.get("text","")) > 800 else "")
    elements.append(Paragraph(text_sample, styles['SmallText']))
    elements.append(Spacer(1, 0.3 * cm))
    duration = transcription.get("duration", 0)
    elements.append(Paragraph(
        f"<b>Durée :</b> {int(duration//60)} min {int(duration%60)} sec · "
        f"<b>Mots :</b> {transcription.get('word_count', 0)}",
        styles['BodyText2']
    ))

    return elements