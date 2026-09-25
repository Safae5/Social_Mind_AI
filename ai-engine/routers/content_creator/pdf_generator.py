### `routers/content_creator/pdf_generator.py`


# routers/content_creator/pdf_generator.py
"""
Génération du PDF "Pack de Contenu" avec ReportLab.

Le PDF est le livrable principal remis au client de l'agence.
Il contient :
  - En-tête avec logo Social Mind AI + infos client
  - Section légende : texte complet + hashtags + CTA + stats
  - Section visuel  : image générée intégrée dans le PDF
  - Section script  : 5 sections du script vidéo structuré
  - Pied de page    : statut d'approbation + date de génération

Ce PDF est généré AVANT publication, pour approbation du client.
"""

import os
import io
import datetime
import base64
from reportlab.lib.pagesizes  import A4
from reportlab.lib.styles     import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units      import cm
from reportlab.lib.colors     import HexColor, white
from reportlab.platypus       import (
    SimpleDocTemplate, Paragraph, Spacer, Table,
    TableStyle, PageBreak, Image as RLImage,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT

# Palette de couleurs Social Mind AI
DARK_BLUE  = HexColor("#1a1a2e")
ACCENT     = HexColor("#0f3460")
INDIGO     = HexColor("#4f46e5")
LIGHT_BLUE = HexColor("#d6e4f7")
LIGHT_GREY = HexColor("#f2f2f2")
GREEN      = HexColor("#27ae60")
ORANGE     = HexColor("#f39c12")
TEXT       = HexColor("#2c3e50")
WHITE      = white

SECTION_COLORS = {
    "HOOK"      : HexColor("#e74c3c"),
    "PROBLÈME"  : HexColor("#e67e22"),
    "SOLUTION"  : HexColor("#27ae60"),
    "PREUVE"    : HexColor("#2980b9"),
    "CTA"       : HexColor("#8e44ad"),
}


def _build_styles():
    """Crée les styles ReportLab personnalisés."""
    s = getSampleStyleSheet()
    s.add(ParagraphStyle(
        "H",  fontSize=22, fontName="Helvetica-Bold",
        textColor=WHITE, alignment=TA_CENTER, spaceAfter=4,
    ))
    s.add(ParagraphStyle(
        "SH", fontSize=12, fontName="Helvetica-Bold",
        textColor=WHITE, spaceBefore=0, spaceAfter=0,
    ))
    s.add(ParagraphStyle(
        "B",  fontSize=10, fontName="Helvetica",
        textColor=TEXT, leading=14, spaceAfter=4,
    ))
    s.add(ParagraphStyle(
        "Li", fontSize=9, fontName="Helvetica",
        textColor=TEXT, leftIndent=12, spaceAfter=3,
    ))
    s.add(ParagraphStyle(
        "Caption", fontSize=11, fontName="Helvetica",
        textColor=TEXT, leading=16, spaceAfter=6,
    ))
    s.add(ParagraphStyle(
        "Script", fontSize=10, fontName="Helvetica",
        textColor=TEXT, leading=14, leftIndent=8, spaceAfter=4,
    ))
    return s


def _section_header(title: str, styles, color=None) -> list:
    """Crée un bloc titre de section coloré."""
    color = color or ACCENT
    t = Table([[Paragraph(title, styles["SH"])]], colWidths=[17 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), color),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING",   (0, 0), (-1, -1), 12),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 12),
    ]))
    return [t, Spacer(1, 0.3 * cm)]


def generate_content_pack_pdf(
    client_profile : dict,
    caption_data   : dict,
    script_data    : dict,
    image_bytes    : bytes | None,
    platform       : str,
    subject        : str,
    output_path    : str = "content_pack.pdf",
) -> str:
    """
    Génère le PDF du pack de contenu complet.

    Sections :
      1. En-tête : infos client + paramètres de génération
      2. Légende : texte + hashtags + CTA + stats
      3. Visuel  : image SDXL-Turbo intégrée
      4. Script  : 5 sections structurées (hook → CTA)
      5. Pied    : statut "En attente d'approbation"

    Args:
        client_profile : dict profil client
        caption_data   : dict retourné par caption_generator
        script_data    : dict retourné par script_generator
        image_bytes    : bytes PNG de l'image (ou None)
        platform       : plateforme cible
        subject        : sujet du contenu
        output_path    : chemin de sortie du PDF

    Returns:
        Chemin absolu du PDF généré
    """
    print("📄 Génération PDF Pack de Contenu...")

    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)

    doc    = SimpleDocTemplate(
        output_path, pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm,
        topMargin=2 * cm, bottomMargin=2 * cm
    )
    styles  = _build_styles()
    content = []
    date_str= datetime.datetime.now().strftime("%d/%m/%Y à %H:%M")

    # ============================================================
    # 1. PAGE DE TITRE
    # ============================================================
    title_table = Table([[Paragraph(
        f"📦 PACK DE CONTENU IA<br/>"
        f"<font size=12>Client : {client_profile.get('name', 'N/A')}</font>",
        styles["H"]
    )]], colWidths=[17 * cm])
    title_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), DARK_BLUE),
        ("TOPPADDING",    (0, 0), (-1, -1), 25),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 20),
    ]))
    content.append(title_table)
    content.append(Spacer(1, 0.5 * cm))

    # Infos client
    info_data = [
        ["Client",       client_profile.get("name",     "N/A")],
        ["Niche",        client_profile.get("niche",    "N/A")],
        ["Audience",     client_profile.get("audience", "N/A")],
        ["Plateforme",   platform.capitalize()],
        ["Sujet",        subject],
        ["Ton",          caption_data.get("tone", "N/A") if "tone" in caption_data else "N/A"],
        ["Généré le",    date_str],
        ["Statut",       "⏳ En attente d'approbation"],
    ]
    info_table = Table(info_data, colWidths=[5 * cm, 12 * cm])
    info_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (0, -1), LIGHT_BLUE),
        ("FONTNAME",      (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 10),
        ("GRID",          (0, 0), (-1, -1), 0.5, HexColor("#dee2e6")),
        ("TOPPADDING",    (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("ROWBACKGROUNDS",(0, 0), (-1, -1), [WHITE, LIGHT_GREY]),
    ]))
    content.append(info_table)
    content.append(Spacer(1, 0.5 * cm))

    # ============================================================
    # 2. LÉGENDE
    # ============================================================
    content += _section_header("✍️ LÉGENDE GÉNÉRÉE (Mistral 7B)", styles)

    # Texte de la légende
    caption_text = caption_data.get("caption", "N/A")
    content.append(Paragraph("<b>Texte complet :</b>", styles["B"]))
    content.append(Paragraph(caption_text, styles["Caption"]))
    content.append(Spacer(1, 0.2 * cm))

    # CTA
    content.append(Paragraph(f"<b>Call-to-Action :</b> {caption_data.get('cta', '')}", styles["B"]))
    content.append(Spacer(1, 0.15 * cm))

    # Hashtags
    hashtags = caption_data.get("hashtags", [])
    if hashtags:
        tags_str = "  ".join(hashtags[:15])
        content.append(Paragraph(f"<b>Hashtags :</b>", styles["B"]))
        content.append(Paragraph(tags_str, styles["Li"]))

    # Stats
    stats_data = [
        ["Caractères", str(caption_data.get("char_count", len(caption_text)))],
        ["Emojis",     str(caption_data.get("emoji_count", "N/A"))],
        ["Hashtags",   str(len(hashtags))],
    ]
    st = Table(stats_data, colWidths=[5 * cm, 3 * cm])
    st.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (0, -1), LIGHT_BLUE),
        ("FONTNAME",      (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("GRID",          (0, 0), (-1, -1), 0.5, HexColor("#dee2e6")),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS",(0, 0), (-1, -1), [WHITE, LIGHT_GREY]),
    ]))
    content.append(Spacer(1, 0.2 * cm))
    content.append(st)
    content.append(Spacer(1, 0.5 * cm))

    # ============================================================
    # 3. VISUEL GÉNÉRÉ
    # ============================================================
    content += _section_header("🎨 VISUEL CRÉATIF (SDXL-Turbo)", styles)

    if image_bytes:
        # Intégrer l'image dans le PDF
        img_buf = io.BytesIO(image_bytes)
        rl_img  = RLImage(img_buf, width=10 * cm, height=10 * cm)
        rl_img.hAlign = "CENTER"
        content.append(rl_img)
        content.append(Paragraph(
            f"Concept : {caption_data.get('image_concept', 'N/A')}",
            styles["Li"]
        ))
    else:
        content.append(Paragraph("⚠️ Image non disponible — régénérer si nécessaire.", styles["B"]))

    content.append(Spacer(1, 0.4 * cm))

    # ============================================================
    # 4. SCRIPT VIDÉO (page séparée)
    # ============================================================
    content.append(PageBreak())
    content += _section_header("🎬 SCRIPT VIDÉO (Mistral 7B)", styles)

    content.append(Paragraph(
        f"<b>Titre :</b> {script_data.get('title', 'N/A')}  |  "
        f"<b>Durée :</b> {script_data.get('total_duration', 'N/A')}",
        styles["B"]
    ))
    content.append(Spacer(1, 0.3 * cm))

    for section in script_data.get("sections", []):
        section_name  = section.get("name", "")
        section_color = SECTION_COLORS.get(section_name, ACCENT)

        # Titre de section coloré
        sec_header = Table(
            [[Paragraph(
                f"{section_name}  <font size=9 color='#ffffff'>({section.get('timing', '')})</font>",
                styles["SH"]
            )]],
            colWidths=[17 * cm]
        )
        sec_header.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), section_color),
            ("TOPPADDING",    (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ]))
        content.append(sec_header)

        # Voix
        content.append(Paragraph(
            f"<b>🎙️ Voix :</b> {section.get('voiceover', '')}",
            styles["Script"]
        ))
        # Visuel
        content.append(Paragraph(
            f"<b>📸 Visuel :</b> {section.get('visual', '')}",
            styles["Script"]
        ))
        content.append(Spacer(1, 0.2 * cm))

    # Notes de production
    if script_data.get("production_notes"):
        content += _section_header("📋 NOTES DE PRODUCTION", styles, ORANGE)
        content.append(Paragraph(script_data["production_notes"], styles["B"]))

    content.append(Spacer(1, 0.5 * cm))

    # ============================================================
    # 5. STATUT & SIGNATURE
    # ============================================================
    status_table = Table([[Paragraph(
        "⏳ STATUT : EN ATTENTE D'APPROBATION DU CLIENT<br/>"
        f"<font size=9>Ce pack de contenu a été généré par Social Mind AI le {date_str}.<br/>"
        "Toutes les sorties nécessitent une approbation avant publication.</font>",
        styles["SH"]
    )]], colWidths=[17 * cm])
    status_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), ORANGE),
        ("TOPPADDING",    (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("LEFTPADDING",   (0, 0), (-1, -1), 15),
    ]))
    content.append(status_table)

    doc.build(content)
    print(f"✅ PDF généré : {output_path}")
    return output_path