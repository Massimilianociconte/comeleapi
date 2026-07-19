#!/usr/bin/env python3
"""Generate the official comeleapi essential-oils mini guide."""

from __future__ import annotations

import io
import shutil
from pathlib import Path
from xml.sax.saxutils import escape

from PIL import Image, ImageOps
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output/pdf/guida-oli-essenziali-come-le-api.pdf"
PUBLIC_OUTPUT = ROOT / "assets/pdf/guida-oli-essenziali-come-le-api.pdf"
ASSETS = ROOT / "assets"
OIL_IMAGES = ASSETS / "img/guide/oils"
LOGO = ASSETS / "img/logo-comeleapi.png"

PAGE_W, PAGE_H = A4
MARGIN = 42

BLUSH = HexColor("#FEEEEF")
BLUSH_SOFT = HexColor("#FFF7F6")
PAPER = HexColor("#FFFDFB")
SAND = HexColor("#F3E4E1")
ROSE = HexColor("#D7AAA2")
TERRA = HexColor("#B77D6D")
DEEP = HexColor("#5A302E")
INK = HexColor("#32171B")
INK_SOFT = HexColor("#6A5858")
SAGE = HexColor("#768579")
LINE = HexColor("#E8D6D3")
WHITE = HexColor("#FFFFFF")


def register_fonts() -> None:
    fonts = ASSETS / "fonts"
    pdfmetrics.registerFont(TTFont("Cormorant", fonts / "cormorant-garamond-500.ttf"))
    pdfmetrics.registerFont(TTFont("Cormorant-Semibold", fonts / "cormorant-garamond-600.ttf"))
    pdfmetrics.registerFont(TTFont("Cormorant-Bold", fonts / "cormorant-garamond-700.ttf"))
    pdfmetrics.registerFont(TTFont("Cormorant-Italic", fonts / "cormorant-garamond-italic-500.ttf"))
    pdfmetrics.registerFont(TTFont("Mulish", fonts / "mulish-400.ttf"))
    pdfmetrics.registerFont(TTFont("Mulish-Light", fonts / "mulish-300.ttf"))
    pdfmetrics.registerFont(TTFont("Mulish-Semibold", fonts / "mulish-600.ttf"))
    pdfmetrics.registerFont(TTFont("Mulish-Bold", fonts / "mulish-700.ttf"))


def style(
    name: str,
    font: str = "Mulish",
    size: float = 11,
    leading: float | None = None,
    color=INK,
    alignment: int = TA_LEFT,
    space_after: float = 0,
) -> ParagraphStyle:
    return ParagraphStyle(
        name,
        fontName=font,
        fontSize=size,
        leading=leading or size * 1.45,
        textColor=color,
        alignment=alignment,
        spaceAfter=space_after,
        splitLongWords=False,
        allowWidows=0,
        allowOrphans=0,
    )


BODY = style("body", size=10.8, leading=16.6, color=INK_SOFT)
BODY_SMALL = style("body-small", size=9.2, leading=13.6, color=INK_SOFT)
BODY_CENTER = style("body-center", size=10.5, leading=15.8, color=INK_SOFT, alignment=TA_CENTER)
INTRO = style("intro", font="Cormorant-Italic", size=17, leading=22, color=DEEP)
TITLE = style("title", font="Cormorant-Semibold", size=34, leading=36, color=INK)
SUBTITLE = style("subtitle", font="Cormorant-Italic", size=16, leading=21, color=DEEP)
CALLOUT = style("callout", font="Mulish-Semibold", size=11, leading=17, color=DEEP)


def draw_paragraph(c: canvas.Canvas, text: str, x: float, y_top: float, width: float, pstyle=BODY) -> float:
    paragraph = Paragraph(text, pstyle)
    _, height = paragraph.wrap(width, PAGE_H)
    paragraph.drawOn(c, x, y_top - height)
    return y_top - height


def fitted_reader(path: Path, width_px: int, height_px: int, quality: int = 88) -> ImageReader:
    with Image.open(path) as source:
        image = source.convert("RGB")
        image = ImageOps.fit(image, (width_px, height_px), method=Image.Resampling.LANCZOS)
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=quality, optimize=True, progressive=True)
    buffer.seek(0)
    return ImageReader(buffer)


def draw_round_image(c: canvas.Canvas, path: Path, x: float, y: float, w: float, h: float, radius: float = 18) -> None:
    c.saveState()
    clip = c.beginPath()
    clip.roundRect(x, y, w, h, radius)
    c.clipPath(clip, stroke=0, fill=0)
    reader = fitted_reader(path, max(500, int(w * 2.7)), max(650, int(h * 2.7)))
    c.drawImage(reader, x, y, width=w, height=h, preserveAspectRatio=False, mask="auto")
    c.restoreState()
    c.setStrokeColor(LINE)
    c.setLineWidth(0.8)
    c.roundRect(x, y, w, h, radius, stroke=1, fill=0)


def draw_brand_mark(c: canvas.Canvas, x: float, y: float, compact: bool = True) -> None:
    size = 28 if compact else 54
    c.drawImage(str(LOGO), x, y, width=size, height=size, mask="auto")
    c.setFillColor(DEEP)
    c.setFont("Cormorant-Semibold", 13 if compact else 20)
    c.drawString(x + size + 7, y + (8 if compact else 19), "SB")
    c.setFillColor(TERRA)
    c.setFont("Mulish-Bold", 5.8 if compact else 7.2)
    c.drawString(x + size + (25 if compact else 35), y + (10 if compact else 22), "comeleapi")


def page_base(c: canvas.Canvas, page_no: int, section: str = "L'ESSENZIALE", color=BLUSH_SOFT) -> None:
    c.setFillColor(color)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    draw_brand_mark(c, MARGIN, PAGE_H - 64)
    c.setFillColor(TERRA)
    c.setFont("Mulish-Bold", 6.2)
    c.drawRightString(PAGE_W - MARGIN, PAGE_H - 50, section.upper())
    c.setStrokeColor(LINE)
    c.line(MARGIN, PAGE_H - 74, PAGE_W - MARGIN, PAGE_H - 74)
    c.setFillColor(TERRA)
    c.setFont("Mulish-Semibold", 7)
    c.drawRightString(PAGE_W - MARGIN, 27, f"{page_no:02d}")


def section_title(c: canvas.Canvas, number: str, heading: str, subheading: str | None = None) -> float:
    y = PAGE_H - 116
    c.setFillColor(TERRA)
    c.setFont("Mulish-Bold", 7.5)
    c.drawString(MARGIN, y, number)
    y -= 18
    y = draw_paragraph(c, escape(heading), MARGIN, y, PAGE_W - 2 * MARGIN, TITLE)
    c.setStrokeColor(TERRA)
    c.setLineWidth(2)
    c.line(MARGIN, y - 10, MARGIN + 42, y - 10)
    y -= 32
    if subheading:
        y = draw_paragraph(c, escape(subheading), MARGIN, y, PAGE_W - 2 * MARGIN, INTRO)
        y -= 18
    return y


def draw_card(c: canvas.Canvas, x: float, y: float, w: float, h: float, fill=PAPER, radius: float = 16) -> None:
    c.setFillColor(fill)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.75)
    c.roundRect(x, y, w, h, radius, stroke=1, fill=1)


def draw_bullet_list(c: canvas.Canvas, items: list[str], x: float, y_top: float, width: float, gap: float = 8) -> float:
    y = y_top
    for item in items:
        c.setFillColor(TERRA)
        c.circle(x + 4, y - 6, 2.2, stroke=0, fill=1)
        y = draw_paragraph(c, escape(item), x + 16, y, width - 16, BODY)
        y -= gap
    return y


def cover_page(c: canvas.Canvas) -> None:
    c.setFillColor(BLUSH)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    c.setFillColor(PAPER)
    c.roundRect(30, 28, PAGE_W - 60, PAGE_H - 56, 26, stroke=0, fill=1)

    draw_brand_mark(c, 66, PAGE_H - 122, compact=False)
    c.setFillColor(TERRA)
    c.setFont("Mulish-Bold", 7.5)
    c.drawString(66, PAGE_H - 160, "MINI GUIDA UFFICIALE")

    draw_paragraph(c, "L'Essenziale", 66, PAGE_H - 190, 400, style("cover-title", "Cormorant-Semibold", 54, 53, INK))
    draw_paragraph(
        c,
        "Oli essenziali, botaniche e piccoli rituali<br/>per ritrovare il tuo equilibrio naturale.",
        68,
        PAGE_H - 255,
        365,
        style("cover-sub", "Cormorant-Italic", 20, 25, DEEP),
    )

    c.setFillColor(SAND)
    c.roundRect(66, 452, 132, 34, 17, stroke=0, fill=1)
    c.setFillColor(DEEP)
    c.setFont("Mulish-Semibold", 8.5)
    c.drawCentredString(132, 464, "12 OLI DA CONOSCERE")

    card_y = 73
    card_h = 342
    card_w = 136
    paths = [OIL_IMAGES / "lavanda.png", OIL_IMAGES / "blue-relief.png", OIL_IMAGES / "thieves.png"]
    for index, path in enumerate(paths):
        draw_round_image(c, path, 66 + index * (card_w + 13), card_y, card_w, card_h, radius=18)

    c.setFillColor(PAPER)
    c.roundRect(205, 45, 185, 32, 16, stroke=0, fill=1)
    c.setFillColor(DEEP)
    c.setFont("Mulish-Bold", 7)
    c.drawCentredString(PAGE_W / 2, 57, "SARA BORDENGA  ·  comeleapi")
    c.showPage()


def introduction_page(c: canvas.Canvas, page_no: int) -> None:
    page_base(c, page_no, "Introduzione")
    y = section_title(c, "01", "Introduzione")
    y = draw_paragraph(c, "Il corpo umano ha un grande potere, quello dell'auto-guarigione.", MARGIN, y, 430, INTRO)
    y -= 28
    paragraphs = [
        "Se in equilibrio, ha tutti gli strumenti per autoregolarsi.",
        "Gli oli essenziali sono un mezzo naturale potentissimo con cui possiamo mantenere l'equilibrio, permettere al nostro corpo di auto-curarsi e alle nostre cellule di auto-rigenerarsi.",
    ]
    for text in paragraphs:
        y = draw_paragraph(c, escape(text), MARGIN, y, 430, BODY)
        y -= 14

    draw_card(c, MARGIN, y - 126, PAGE_W - 2 * MARGIN, 126, fill=PAPER)
    draw_paragraph(
        c,
        escape("Altamente biocompatibili con il nostro organismo, gli oli essenziali vengono riconosciuti e assorbiti al 100%, attivando e velocizzando il processo di guarigione."),
        MARGIN + 24,
        y - 28,
        PAGE_W - 2 * MARGIN - 48,
        CALLOUT,
    )
    c.showPage()


def what_are_page(c: canvas.Canvas, page_no: int) -> None:
    page_base(c, page_no, "Cosa sono")
    y = section_title(c, "02", "Cosa sono")
    y = draw_paragraph(c, "Gli oli essenziali sono composti volatili che evaporano facilmente.<br/>Prodotti dalle piante per:", MARGIN, y, 470, BODY)
    y -= 18
    y = draw_bullet_list(
        c,
        [
            "attrarre gli insetti impollinatori",
            "allontanare i parassiti",
            "difendersi dagli animali erbivori",
            "conservare la specie: penetrano nel terreno, impedendo a piante diverse di germogliare",
            "proteggersi da infezioni di batteri, funghi e muffe",
            "favorire la cicatrizzazione dei tessuti lesionati",
        ],
        MARGIN + 8,
        y,
        PAGE_W - 2 * MARGIN - 16,
        7,
    )
    y -= 15
    draw_card(c, MARGIN, y - 76, PAGE_W - 2 * MARGIN, 76, fill=SAND)
    draw_paragraph(
        c,
        "Allo stesso modo, se utilizzati, svolgono sul corpo umano le stesse funzioni.",
        MARGIN + 22,
        y - 22,
        PAGE_W - 2 * MARGIN - 44,
        CALLOUT,
    )
    c.showPage()


def absorption_page(c: canvas.Canvas, page_no: int) -> None:
    page_base(c, page_no, "Cosa sono")
    y = section_title(c, "02", "Una diffusione rapidissima")
    y = draw_paragraph(c, "Gli oli essenziali hanno una velocità di assorbimento altissima:", MARGIN, y, 460, INTRO)
    y -= 28

    timeline = [
        ("22", "secondi", "raggiunge il cervello"),
        ("2", "minuti", "entra nel flusso sanguigno"),
        ("20", "minuti", "è arrivato a tutte le cellule del nostro corpo"),
    ]
    card_w = 156
    for index, (number, unit, copy) in enumerate(timeline):
        x = MARGIN + index * (card_w + 11)
        draw_card(c, x, 455, card_w, 176, fill=PAPER)
        c.setFillColor(TERRA if index != 1 else SAGE)
        c.circle(x + card_w / 2, 575, 30, stroke=0, fill=1)
        c.setFillColor(WHITE)
        c.setFont("Cormorant-Bold", 25)
        c.drawCentredString(x + card_w / 2, 568, number)
        c.setFillColor(DEEP)
        c.setFont("Mulish-Bold", 7.3)
        c.drawCentredString(x + card_w / 2, 530, unit.upper())
        draw_paragraph(c, escape(copy), x + 17, 506, card_w - 34, BODY_CENTER)

    draw_card(c, MARGIN, 170, PAGE_W - 2 * MARGIN, 220, fill=SAND)
    draw_paragraph(
        c,
        escape("Oltre a tutti i benefici fisici legati al sistema immunitario ed endocrino, l'aromaterapia coinvolge l'emotività, la memoria, la sensibilità e tutte le aree cognitive correlate. Potentissimo è l'impiego degli oli essenziali per riequilibrare la sfera psichica ed emozionale."),
        MARGIN + 28,
        352,
        PAGE_W - 2 * MARGIN - 56,
        style("absorption-callout", "Cormorant-Italic", 16.5, 23, DEEP, TA_CENTER),
    )
    c.showPage()


def applications_page(c: canvas.Canvas, page_no: int) -> None:
    page_base(c, page_no, "Applicazioni")
    section_title(c, "03", "Applicazioni")
    cards = [
        (
            "01",
            "Inalazione",
            "diretta e immediata, in quanto le stimolazioni olfattive sono le sole a passare direttamente nella corteccia cerebrale senza essere filtrate preliminarmente dal talamo",
        ),
        (
            "02",
            "Uso topico",
            "le molecole degli oli essenziali hanno molta affinità con i tessuti del corpo umano, quindi riescono facilmente a penetrare nella cute, arrivano in profondità raggiungendo il sistema circolatorio per diffondersi in tutto l'organismo",
        ),
        (
            "03",
            "Assunzione orale",
            "a patto che si rispettino determinati requisiti, gli oli essenziali possono essere destinati ad uso interno",
        ),
    ]
    y = 612
    heights = [134, 164, 124]
    for index, (number, heading, text) in enumerate(cards):
        height = heights[index]
        draw_card(c, MARGIN, y - height, PAGE_W - 2 * MARGIN, height, fill=PAPER)
        c.setFillColor(TERRA)
        c.setFont("Cormorant-Bold", 24)
        c.drawString(MARGIN + 22, y - 46, number)
        c.setFillColor(INK)
        c.setFont("Cormorant-Semibold", 20)
        c.drawString(MARGIN + 82, y - 39, heading)
        draw_paragraph(c, escape(text), MARGIN + 82, y - 58, PAGE_W - 2 * MARGIN - 106, BODY_SMALL)
        y -= height + 14

    c.setFillColor(DEEP)
    c.roundRect(MARGIN, 66, PAGE_W - 2 * MARGIN, 54, 16, stroke=0, fill=1)
    c.setFillColor(WHITE)
    c.setFont("Mulish-Bold", 10.5)
    c.drawCentredString(PAGE_W / 2, 86, "Chiedi sempre prima il parere di un esperto!")
    c.showPage()


def quality_intro_page(c: canvas.Canvas, page_no: int) -> None:
    page_base(c, page_no, "Qualita")
    y = section_title(c, "04", "Qualità", "Creme, lozioni, trucchi, profumi, odori... Il corpo assorbe tutto.")
    paragraphs = [
        "Per questo è molto importante stare attenti alla qualità dei prodotti che si utilizzano.",
        "Puri e naturali al 100%, gli oli essenziali devono anche essere di alto grado terapeutico.",
        "Dalla semina, alla coltivazione, alla distillazione. La produzione richiede dei tempi e dei costi elevatissimi per riuscire a mantenere le caratteristiche chimiche della pianta e a conservare così tutta la potenza della natura.",
        "Fondamentale affidarsi ad un'azienda seria, capace e sicura nei propri mezzi economici. Un'azienda che garantisca trasparenza nella produzione e nel controllo qualità.",
    ]
    for index, text in enumerate(paragraphs):
        if index == 2:
            card_top = y
            draw_card(c, MARGIN, card_top - 144, PAGE_W - 2 * MARGIN, 144, fill=PAPER)
            draw_paragraph(c, escape(text), MARGIN + 25, card_top - 26, PAGE_W - 2 * MARGIN - 50, CALLOUT)
            y = card_top - 172
        else:
            y = draw_paragraph(c, escape(text), MARGIN, y, 480, BODY)
            y -= 15
    c.showPage()


def quality_grades_page(c: canvas.Canvas, page_no: int) -> None:
    page_base(c, page_no, "Qualita")
    section_title(c, "04", "I 4 gradi di purezza")
    grades = [
        ("D", "Cosmetica", "bassa qualità, riproducono sinteticamente l'odore, non contengono nulla della pianta (creme, lozioni, shampoo, ecc.)"),
        ("C", "Profumeria", "contengono prodotti chimici e solventi, fortemente contaminati"),
        ("B", "Grado alimentare", "organici, ma ancora contaminati chimicamente (dentifrici, gomme da masticare, aromi per dolci)"),
        ("A", "Grado terapeutico", "oli puri e non adulterati, sicuri per l'uso interno"),
    ]
    y = 650
    for index, (letter, heading, copy) in enumerate(grades):
        fill = PAPER if index < 3 else SAND
        draw_card(c, MARGIN, y - 100, PAGE_W - 2 * MARGIN, 100, fill=fill)
        c.setFillColor(TERRA if index < 3 else DEEP)
        c.circle(MARGIN + 38, y - 50, 24, stroke=0, fill=1)
        c.setFillColor(WHITE)
        c.setFont("Cormorant-Bold", 23)
        c.drawCentredString(MARGIN + 38, y - 58, letter)
        c.setFillColor(INK)
        c.setFont("Cormorant-Semibold", 17)
        c.drawString(MARGIN + 80, y - 36, heading)
        draw_paragraph(c, escape(copy), MARGIN + 80, y - 50, PAGE_W - 2 * MARGIN - 105, BODY_SMALL)
        y -= 112

    draw_card(c, MARGIN, 78, PAGE_W - 2 * MARGIN, 112, fill=DEEP)
    c.setFillColor(WHITE)
    c.setFont("Cormorant-Bold", 28)
    c.drawString(MARGIN + 24, 139, "5%")
    draw_paragraph(
        c,
        escape("Di questi solo il 5% della produzione mondiale rispetta i criteri necessari per mantenere tutti i principi attivi della pianta. Sono quindi pochissimi gli oli essenziali in commercio veramente efficaci, che contengano in sé tutta la potenza terapeutica della natura."),
        MARGIN + 95,
        158,
        PAGE_W - 2 * MARGIN - 120,
        style("grades-callout", "Mulish", 8.7, 13.2, WHITE),
    )
    c.showPage()


OILS = [
    {
        "name": "Limone",
        "label": ["LIMONE"],
        "latin": "Citrus limon",
        "ingredients": "Frutto, scorza, foglie e fiori di limone",
        "description": "Purificante e tonificante. Diffuso, dona freschezza agli ambienti; è tradizionalmente usato per sostenere la digestione e come detergente naturale.",
        "image": "limone.png",
        "accent": "#D6B654",
    },
    {
        "name": "Lavanda",
        "label": ["LAVANDA"],
        "latin": "Lavandula angustifolia",
        "ingredients": "Spighe, fiori e foglie di lavanda",
        "description": "Il più versatile e \"calmante\" tra gli oli. Favorisce il relax, il buon riposo notturno e viene spesso usato per lenire la pelle.",
        "image": "lavanda.png",
        "accent": "#8E789B",
    },
    {
        "name": "Menta piperita",
        "label": ["MENTA", "PIPERITA"],
        "latin": "Mentha piperita",
        "ingredients": "Foglie e infiorescenze di menta piperita",
        "description": "Energizzante e rinfrescante. Sostiene la lucidità mentale, dona sollievo dopo i pasti abbondanti e rinfresca l'alito.",
        "image": "menta-piperita.png",
        "accent": "#789280",
    },
    {
        "name": "Arancio",
        "label": ["ARANCIO"],
        "latin": "Citrus sinensis",
        "ingredients": "Frutto, scorza, foglie e fiori d'arancio",
        "description": "Dolce e gioioso. Diffuso in casa crea un'atmosfera allegra e distensiva, ottimo per contrastare i momenti \"no\".",
        "image": "arancio.png",
        "accent": "#D98B3D",
    },
    {
        "name": "DiGize",
        "label": ["DIGIZE"],
        "latin": "Blend",
        "ingredients": "Tarragone, zenzero, menta, ginepro, finocchio, citronella, anice, patchouli",
        "description": "La miscela pensata per il comfort digestivo. Ideale massaggiata sull'addome dopo i pasti.",
        "image": "digize.png",
        "accent": "#506C60",
        "blend": True,
    },
    {
        "name": "Thieves",
        "label": ["THIEVES"],
        "latin": "Blend",
        "ingredients": "Chiodi di garofano, limone, cannella, eucalipto radiata, rosmarino",
        "description": "Blend storico nato per proteggere e purificare. Perfetto per l'igiene degli ambienti e come alleato di stagione.",
        "image": "thieves.png",
        "accent": "#7D3E42",
        "blend": True,
    },
    {
        "name": "Purification",
        "label": ["PURIFICATION"],
        "latin": "Blend",
        "ingredients": "Citronella, lavandino, citronella di Giava, mirto, rosmarino, tea tree",
        "description": "Purifica e rinfresca l'aria di casa, neutralizzando gli odori. Utile anche sulla pelle dopo punture di insetti.",
        "image": "purification.png",
        "accent": "#80A29A",
        "blend": True,
    },
    {
        "name": "RC",
        "label": ["R.C."],
        "latin": "Blend",
        "ingredients": "Eucalipti, mirto, pino, abete, lavanda, menta, cipresso",
        "description": "Un blend \"respiro profondo\": si usa in diffusione o sul petto per un'esperienza rinfrescante e liberatoria.",
        "image": "rc.png",
        "accent": "#4F8589",
        "blend": True,
    },
    {
        "name": "Blue Relief",
        "label": ["BLUE", "RELIEF"],
        "latin": "Blend",
        "ingredients": "Wintergreen, elicriso, tanaceto blu, abete di Idaho",
        "description": "Pensato per il comfort muscolare e articolare dopo sforzi fisici o giornate intense. Uso topico, ottimo dopo lo sport.",
        "image": "blue-relief.png",
        "accent": "#2C5D9E",
        "blend": True,
    },
    {
        "name": "Copaiba",
        "label": ["COPAIBA"],
        "latin": "Copaifera reticulata",
        "ingredients": "Foglie, corteccia e resina di copaiba",
        "description": "Resinoso e avvolgente. Amplifica l'azione degli altri oli con cui viene abbinato ed è lenitivo per la pelle.",
        "image": "copaiba.png",
        "accent": "#6E704A",
    },
    {
        "name": "StressAway",
        "label": ["STRESS", "AWAY"],
        "latin": "Blend",
        "ingredients": "Lime, cedro, vaniglia, ocotea, lavanda",
        "description": "Il profumo del relax. Un aroma dolce e agrumato pensato per accompagnare i momenti di decompressione dallo stress quotidiano.",
        "image": "stress-away.png",
        "accent": "#63A0A3",
        "blend": True,
    },
    {
        "name": "Frankincense",
        "label": ["FRANKINCENSE"],
        "latin": "Boswellia carterii",
        "ingredients": "Foglie, corteccia e resina d'incenso",
        "description": "L'olio della centratura per eccellenza. Usato da millenni in meditazione, è anche un prezioso alleato di bellezza per la pelle.",
        "image": "frankincense.png",
        "accent": "#9C817B",
    },
]


def oils_divider_page(c: canvas.Canvas, page_no: int) -> None:
    c.setFillColor(DEEP)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    draw_brand_mark(c, MARGIN, PAGE_H - 70)
    c.setFillColor(ROSE)
    c.setFont("Mulish-Bold", 7.5)
    c.drawString(MARGIN, PAGE_H - 130, "05  ·  BOTANICHE E RITUALI")
    draw_paragraph(c, "12 oli essenziali<br/>da conoscere", MARGIN, PAGE_H - 175, 430, style("divider", "Cormorant-Semibold", 48, 48, WHITE))
    draw_paragraph(
        c,
        "Una piccola selezione, tra singoli e blend, per iniziare a esplorare il mondo degli oli essenziali di grado terapeutico.",
        MARGIN,
        PAGE_H - 300,
        430,
        style("divider-copy", "Cormorant-Italic", 18, 25, ROSE),
    )
    draw_round_image(c, OIL_IMAGES / "blue-relief.png", PAGE_W - 255, 80, 200, 250, radius=26)
    c.setFillColor(ROSE)
    c.setFont("Mulish-Semibold", 7)
    c.drawRightString(PAGE_W - MARGIN, 28, f"{page_no:02d}")
    c.showPage()


def fit_label_font(text: str, max_width: float, start: float = 10) -> float:
    size = start
    while size > 5.5 and pdfmetrics.stringWidth(text, "Cormorant-Bold", size) > max_width:
        size -= 0.25
    return size


def draw_bottle_label(c: canvas.Canvas, image_x: float, image_y: float, image_w: float, image_h: float, oil: dict) -> None:
    center_x = image_x + image_w * 0.5
    center_y = image_y + image_h * 0.315
    label_width = image_w * 0.19
    c.setFillColor(DEEP)
    c.setFont("Mulish-Bold", 4.5)
    c.drawCentredString(center_x, center_y + 17, "YOUNG LIVING")
    lines = oil["label"]
    if len(lines) == 1:
        font_size = fit_label_font(lines[0], label_width, 9.2)
        c.setFont("Cormorant-Bold", font_size)
        c.drawCentredString(center_x, center_y - 1, lines[0])
    else:
        font_size = min(fit_label_font(line, label_width, 9) for line in lines)
        c.setFont("Cormorant-Bold", font_size)
        c.drawCentredString(center_x, center_y + 3, lines[0])
        c.drawCentredString(center_x, center_y - 7, lines[1])
    c.setFont("Mulish-Semibold", 3.8)
    c.drawCentredString(center_x, center_y - 19, "ESSENTIAL OIL")


def oil_page(c: canvas.Canvas, page_no: int, index: int, oil: dict) -> None:
    page_base(c, page_no, "12 oli da conoscere", color=BLUSH_SOFT if index % 2 == 0 else BLUSH)
    accent = HexColor(oil["accent"])
    text_x = MARGIN
    text_w = 178
    image_x = 245
    image_y = 108
    image_w = PAGE_W - image_x - 30
    image_h = 454

    c.setFillColor(accent)
    c.roundRect(text_x, PAGE_H - 138, 74, 24, 12, stroke=0, fill=1)
    c.setFillColor(WHITE)
    c.setFont("Mulish-Bold", 7)
    c.drawCentredString(text_x + 37, PAGE_H - 130, f"OLIO {index:02d} / 12")
    if oil.get("blend"):
        c.setFillColor(SAND)
        c.roundRect(text_x + 82, PAGE_H - 138, 52, 24, 12, stroke=0, fill=1)
        c.setFillColor(DEEP)
        c.drawCentredString(text_x + 108, PAGE_H - 130, "BLEND")

    y = PAGE_H - 172
    y = draw_paragraph(c, escape(oil["name"]), text_x, y, text_w, style(f"oil-title-{index}", "Cormorant-Semibold", 31, 32, INK))
    y -= 7
    y = draw_paragraph(c, escape(oil["latin"]), text_x, y, text_w, style(f"oil-latin-{index}", "Cormorant-Italic", 12.5, 16, TERRA))
    y -= 23

    c.setFillColor(accent)
    c.roundRect(text_x, y - 72, text_w, 72, 15, stroke=0, fill=1)
    c.setFillColor(WHITE)
    c.setFont("Mulish-Bold", 6.5)
    c.drawString(text_x + 15, y - 21, "BOTANICHE")
    draw_paragraph(c, escape(oil["ingredients"]), text_x + 15, y - 30, text_w - 30, style(f"oil-ingredients-{index}", "Mulish", 7.8, 10.8, WHITE))
    y -= 104
    y = draw_paragraph(c, escape(oil["description"]), text_x, y, text_w, style(f"oil-copy-{index}", "Mulish", 10, 15.5, INK_SOFT))
    y -= 28
    c.setStrokeColor(accent)
    c.setLineWidth(1.2)
    c.line(text_x, y, text_x + 54, y)
    y -= 24
    draw_paragraph(c, "Un profumo, una pressione,<br/>un respiro alla volta.", text_x, y, text_w, style(f"oil-quote-{index}", "Cormorant-Italic", 15.5, 19, DEEP))

    draw_round_image(c, OIL_IMAGES / oil["image"], image_x, image_y, image_w, image_h, radius=24)
    draw_bottle_label(c, image_x, image_y, image_w, image_h, oil)
    c.showPage()


def closing_page(c: canvas.Canvas, page_no: int) -> None:
    c.setFillColor(DEEP)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    draw_brand_mark(c, MARGIN, PAGE_H - 78, compact=False)
    draw_paragraph(c, "Grazie per aver letto", MARGIN, PAGE_H - 175, PAGE_W - 2 * MARGIN, style("closing-title", "Cormorant-Semibold", 39, 42, WHITE, TA_CENTER))
    draw_paragraph(
        c,
        escape("Questa guida ha scopo puramente informativo e divulgativo e non sostituisce in alcun modo il parere di un medico, farmacista o professionista qualificato. Le informazioni riportate non intendono diagnosticare, trattare, curare o prevenire alcuna malattia. Prima di utilizzare gli oli essenziali, specialmente per via orale o su bambini, donne in gravidanza o persone con patologie in corso, richiedi sempre il parere di un esperto."),
        85,
        PAGE_H - 255,
        PAGE_W - 170,
        style("disclaimer", "Mulish", 10.2, 16.3, HexColor("#F3E4E1"), TA_CENTER),
    )
    c.setStrokeColor(ROSE)
    c.line(150, 380, PAGE_W - 150, 380)
    draw_paragraph(c, "Sara", 100, 335, PAGE_W - 200, style("closing-signature", "Cormorant-Italic", 36, 38, ROSE, TA_CENTER))
    c.setFillColor(WHITE)
    c.setFont("Mulish-Bold", 8.2)
    c.drawCentredString(PAGE_W / 2, 272, "SARA BORDENGA  ·  comeleapi")
    c.setFont("Mulish", 8.2)
    c.drawCentredString(PAGE_W / 2, 244, "sara.bordenga@gmail.com  ·  388 163 9306")
    c.drawCentredString(PAGE_W / 2, 222, "Instagram  @come_le_api")
    c.setFillColor(ROSE)
    c.setFont("Mulish-Semibold", 7)
    c.drawCentredString(PAGE_W / 2, 75, "IN ARMONIA CON LA NATURA")
    c.drawRightString(PAGE_W - MARGIN, 28, f"{page_no:02d}")
    c.showPage()


def build_pdf(destination: Path) -> None:
    register_fonts()
    destination.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(destination), pagesize=A4, pageCompression=1)
    c.setTitle("L'Essenziale - Guida ufficiale agli oli essenziali")
    c.setAuthor("Sara Bordenga - comeleapi")
    c.setSubject("Mini guida agli oli essenziali per il benessere quotidiano")
    c.setCreator("comeleapi")

    cover_page(c)
    page_no = 1
    introduction_page(c, page_no)
    page_no += 1
    what_are_page(c, page_no)
    page_no += 1
    absorption_page(c, page_no)
    page_no += 1
    applications_page(c, page_no)
    page_no += 1
    quality_intro_page(c, page_no)
    page_no += 1
    quality_grades_page(c, page_no)
    page_no += 1
    oils_divider_page(c, page_no)
    page_no += 1
    for index, oil in enumerate(OILS, start=1):
        oil_page(c, page_no, index, oil)
        page_no += 1
    closing_page(c, page_no)
    c.save()


def main() -> None:
    build_pdf(OUTPUT)
    PUBLIC_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(OUTPUT, PUBLIC_OUTPUT)
    print(f"Generated {OUTPUT}")
    print(f"Published {PUBLIC_OUTPUT}")


if __name__ == "__main__":
    main()
