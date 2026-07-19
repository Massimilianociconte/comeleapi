#!/usr/bin/env python3
"""Create the image-first, mobile-friendly comeleapi essential-oils guide."""

from __future__ import annotations

import io
import shutil
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
FONTS = ASSETS / "fonts"
OILS = ASSETS / "img/guide/oils-v2"
MACROS = ASSETS / "img/guide/macros-v1"
COVER_ART = ASSETS / "img/guide/cover-botanical-v3.png"
LOGO = ASSETS / "img/logo-comeleapi.png"

PAGES_DIR = ROOT / "output/guide-pages-v2"
PDF_OUTPUT = ROOT / "output/pdf/guida-oli-essenziali-come-le-api.pdf"
PUBLIC_PDF = ROOT / "assets/pdf/guida-oli-essenziali-come-le-api.pdf"

W, H = 1440, 1920
PDF_W, PDF_H = 720, 960
MARGIN = 96
RIGHT = W - MARGIN

IVORY = "#FFF9F4"
PAPER = "#FFFDF9"
BLUSH = "#FBE8E8"
ROSE = "#C7877C"
ROSE_LIGHT = "#E4BBB3"
DEEP = "#542B2E"
INK = "#32171B"
INK_SOFT = "#69585A"
SAGE = "#728173"
LINE = "#E6D1CE"
HONEY = "#C89247"


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    files = {
        "display": "cormorant-garamond-600.ttf",
        "display_bold": "cormorant-garamond-700.ttf",
        "display_italic": "cormorant-garamond-italic-500.ttf",
        "body": "mulish-400.ttf",
        "body_light": "mulish-300.ttf",
        "body_medium": "mulish-500.ttf",
        "body_semibold": "mulish-600.ttf",
        "body_bold": "mulish-700.ttf",
    }
    return ImageFont.truetype(str(FONTS / files[name]), size)


F_DISPLAY_140 = font("display", 140)
F_DISPLAY_112 = font("display", 112)
F_DISPLAY_92 = font("display", 92)
F_DISPLAY_72 = font("display", 72)
F_DISPLAY_56 = font("display", 56)
F_DISPLAY_ITALIC_54 = font("display_italic", 54)
F_DISPLAY_ITALIC_42 = font("display_italic", 42)
F_BODY_38 = font("body", 38)
F_BODY_34 = font("body", 34)
F_BODY_31 = font("body", 31)
F_BODY_28 = font("body", 28)
F_BODY_LIGHT_30 = font("body_light", 30)
F_BODY_MEDIUM_31 = font("body_medium", 31)
F_BODY_SEMI_30 = font("body_semibold", 30)
F_BODY_BOLD_26 = font("body_bold", 26)
F_BODY_BOLD_22 = font("body_bold", 22)
F_BODY_22 = font("body", 22)
F_BODY_19 = font("body", 19)


def hex_rgba(value: str, alpha: int = 255) -> tuple[int, int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4)) + (alpha,)


def paper_background(color: str = IVORY) -> Image.Image:
    page = Image.new("RGB", (W, H), color)
    noise = Image.effect_noise((W, H), 10).convert("L")
    texture = ImageOps.colorize(noise, "#E8DCD3", "#FFFFFF").convert("RGBA")
    texture.putalpha(22)
    page = Image.alpha_composite(page.convert("RGBA"), texture)
    return page


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask


def paste_cover(page: Image.Image, source_path: Path, box: tuple[int, int, int, int], radius: int = 0,
                opacity: int = 255, focus: tuple[float, float] = (.5, .5)) -> None:
    x, y, width, height = box
    with Image.open(source_path) as source:
        source = source.convert("RGBA")
        source = ImageOps.fit(source, (width, height), method=Image.Resampling.LANCZOS, centering=focus)
        if opacity < 255:
            source.putalpha(ImageEnhance.Brightness(source.getchannel("A")).enhance(opacity / 255))
        mask = rounded_mask((width, height), radius) if radius else source.getchannel("A")
        if opacity < 255:
            mask = ImageEnhance.Brightness(mask).enhance(opacity / 255)
        page.paste(source, (x, y), mask)


def paste_complete(page: Image.Image, source_path: Path, box: tuple[int, int, int, int], radius: int = 0) -> None:
    """Frame a complete bottle over a quiet, matching botanical backdrop."""
    x, y, width, height = box
    with Image.open(source_path) as opened:
        source = opened.convert("RGBA")
        backdrop = ImageOps.fit(source, (width, height), method=Image.Resampling.LANCZOS, centering=(.5, .52))
        backdrop = backdrop.filter(ImageFilter.GaussianBlur(18))
        backdrop = ImageEnhance.Brightness(backdrop).enhance(1.08)
        veil = Image.new("RGBA", (width, height), hex_rgba(PAPER, 92))
        backdrop = Image.alpha_composite(backdrop, veil)

        foreground = ImageOps.contain(source, (int(width * .82), int(height * .96)), Image.Resampling.LANCZOS)
        framed = backdrop.copy()
        fx = (width - foreground.width) // 2
        fy = (height - foreground.height) // 2
        framed.alpha_composite(foreground, (fx, fy))
        mask = rounded_mask((width, height), radius) if radius else framed.getchannel("A")
        page.paste(framed, (x, y), mask)


def paste_macro(page: Image.Image, source_path: Path, box: tuple[int, int, int, int],
                crop: tuple[float, float, float, float], radius: int = 0, opacity: int = 255) -> None:
    """Place a crisp ingredient detail without including the product bottle."""
    x, y, width, height = box
    with Image.open(source_path) as opened:
        source = opened.convert("RGBA")
        left, top, right, bottom = crop
        detail = source.crop((
            int(source.width * left), int(source.height * top),
            int(source.width * right), int(source.height * bottom),
        ))
        detail = ImageOps.fit(detail, (width, height), Image.Resampling.LANCZOS)
        detail = ImageEnhance.Color(detail).enhance(1.04)
        mask = rounded_mask((width, height), radius) if radius else detail.getchannel("A")
        if opacity < 255:
            mask = ImageEnhance.Brightness(mask).enhance(opacity / 255)
        page.paste(detail, (x, y), mask)


def paste_transparent(page: Image.Image, source_path: Path, box: tuple[int, int, int, int],
                      opacity: int = 255) -> None:
    x, y, width, height = box
    with Image.open(source_path) as opened:
        source = opened.convert("RGBA")
        source = ImageOps.contain(source, (width, height), Image.Resampling.LANCZOS)
        if opacity < 255:
            source.putalpha(ImageEnhance.Brightness(source.getchannel("A")).enhance(opacity / 255))
        page.alpha_composite(source, (x + (width - source.width) // 2, y + (height - source.height) // 2))


def paste_bottle_vignette(page: Image.Image, source_path: Path, center: tuple[int, int], max_size: tuple[int, int]) -> None:
    """Extract the central bottle with a feathered, paper-like transparency."""
    with Image.open(source_path) as opened:
        source = opened.convert("RGB")
    crop = source.crop((int(source.width * .28), int(source.height * .24),
                        int(source.width * .72), int(source.height * .94)))
    keep = Image.new("L", crop.size, 0)
    keep_draw = ImageDraw.Draw(keep)
    cap_top = .22 if source_path.stem == "rc" else .18
    keep_draw.rounded_rectangle((int(crop.width * .31), int(crop.height * cap_top),
                                 int(crop.width * .69), int(crop.height * .40)), radius=32, fill=255)
    keep_draw.rounded_rectangle((int(crop.width * .29), int(crop.height * .37),
                                 int(crop.width * .71), int(crop.height * .46)), radius=18, fill=255)
    keep_draw.polygon([
        (int(crop.width * .27), int(crop.height * .47)),
        (int(crop.width * .30), int(crop.height * .42)),
        (int(crop.width * .70), int(crop.height * .42)),
        (int(crop.width * .73), int(crop.height * .47)),
        (int(crop.width * .73), int(crop.height * .89)),
        (int(crop.width * .27), int(crop.height * .89)),
    ], fill=255)
    keep_draw.rounded_rectangle((int(crop.width * .27), int(crop.height * .45),
                                 int(crop.width * .73), int(crop.height * .91)), radius=24, fill=255)
    alpha = keep.filter(ImageFilter.GaussianBlur(1.4))
    bottle = crop.convert("RGBA")
    bottle.putalpha(alpha)
    bottle = ImageOps.contain(bottle, max_size, Image.Resampling.LANCZOS)
    page.alpha_composite(bottle, (center[0] - bottle.width // 2, center[1] - bottle.height // 2))


def paste_atlas_diptych(page: Image.Image, source_path: Path, box: tuple[int, int, int, int],
                        macro_crop: tuple[float, float, float, float], radius: int = 0) -> None:
    """Combine a complete bottle plate with a sharp botanical macro."""
    x, y, width, height = box
    left_width = int(width * .58)
    right_width = width - left_width
    composition = Image.new("RGBA", (width, height), hex_rgba(PAPER))
    with Image.open(source_path) as opened:
        source = opened.convert("RGBA")
        bottle = ImageOps.contain(source, (left_width - 18, height - 12), Image.Resampling.LANCZOS)
        composition.alpha_composite(bottle, ((left_width - bottle.width) // 2, (height - bottle.height) // 2))

        l, t, r, b = macro_crop
        detail = source.crop((int(source.width * l), int(source.height * t),
                              int(source.width * r), int(source.height * b)))
        detail = ImageOps.fit(detail, (right_width, height), Image.Resampling.LANCZOS)
        composition.alpha_composite(detail, (left_width, 0))
    ImageDraw.Draw(composition).line((left_width, 22, left_width, height - 22), fill=LINE, width=2)
    mask = rounded_mask((width, height), radius) if radius else composition.getchannel("A")
    page.paste(composition, (x, y), mask)


def wrap_lines(draw: ImageDraw.ImageDraw, text: str, text_font: ImageFont.FreeTypeFont,
               max_width: int) -> list[str]:
    lines: list[str] = []
    for paragraph in text.split("\n"):
        if not paragraph:
            lines.append("")
            continue
        words = paragraph.split()
        current = words[0]
        for word in words[1:]:
            candidate = f"{current} {word}"
            if draw.textlength(candidate, font=text_font) <= max_width:
                current = candidate
            else:
                lines.append(current)
                current = word
        lines.append(current)
    return lines


def draw_text(draw: ImageDraw.ImageDraw, text: str, xy: tuple[int, int], max_width: int,
              text_font: ImageFont.FreeTypeFont, fill: str = INK_SOFT, line_height: int | None = None,
              paragraph_gap: int = 18) -> int:
    x, y = xy
    line_height = line_height or int(text_font.size * 1.45)
    for line in wrap_lines(draw, text, text_font, max_width):
        if line:
            draw.text((x, y), line, font=text_font, fill=fill)
            y += line_height
        else:
            y += paragraph_gap
    return y


def draw_centered_box_text(draw: ImageDraw.ImageDraw, text: str, box: tuple[int, int, int, int],
                           max_width: int, text_font: ImageFont.FreeTypeFont, fill: str = PAPER,
                           line_height: int | None = None) -> None:
    """Center wrapped copy on both axes with identical visual padding."""
    x1, y1, x2, y2 = box
    line_height = line_height or int(text_font.size * 1.45)
    lines = wrap_lines(draw, text, text_font, max_width)
    content_height = len(lines) * line_height
    y = y1 + ((y2 - y1) - content_height) / 2
    center_x = (x1 + x2) / 2
    for line in lines:
        draw.text((center_x, y), line, font=text_font, fill=fill, anchor="ma")
        y += line_height


def draw_rule(draw: ImageDraw.ImageDraw, y: int, x1: int = 96, x2: int = W - 96, color: str = LINE,
              width: int = 2) -> None:
    draw.line((x1, y, x2, y), fill=color, width=width)


def draw_brand_header(page: Image.Image, page_no: int, section: str) -> ImageDraw.ImageDraw:
    draw = ImageDraw.Draw(page)
    with Image.open(LOGO) as logo:
        logo = logo.convert("RGBA").resize((66, 66), Image.Resampling.LANCZOS)
        page.paste(logo, (MARGIN, 62), logo)
    draw.text((MARGIN + 82, 72), "comeleapi", font=F_DISPLAY_56, fill=DEEP)
    draw.text((RIGHT, 87), section.upper(), font=F_BODY_BOLD_22, fill=ROSE, anchor="ra")
    draw_rule(draw, 150)
    draw.text((RIGHT, H - 70), f"{page_no:02d}", font=F_BODY_BOLD_22, fill=ROSE, anchor="ra")
    return draw


def section_title(draw: ImageDraw.ImageDraw, number: str, title: str, y: int = 220) -> int:
    draw.text((MARGIN, y), number, font=F_BODY_BOLD_22, fill=ROSE)
    draw.text((MARGIN, y + 42), title, font=F_DISPLAY_92, fill=INK)
    draw.line((MARGIN, y + 162, MARGIN + 94, y + 162), fill=ROSE, width=5)
    return y + 210


def save_page(page: Image.Image, page_no: int, slug: str) -> Path:
    path = PAGES_DIR / f"page-{page_no:02d}-{slug}.png"
    page.convert("RGB").save(path, "PNG", optimize=True)
    return path


def cover_page() -> Path:
    page = paper_background()
    image_top = 740
    paste_cover(page, COVER_ART, (0, image_top, W, H - image_top), focus=(.5, .72))
    ImageDraw.Draw(page).line((0, image_top, W, image_top), fill=LINE, width=2)
    draw = ImageDraw.Draw(page)

    with Image.open(LOGO) as logo:
        logo = logo.convert("RGBA").resize((86, 86), Image.Resampling.LANCZOS)
        page.paste(logo, (MARGIN, 82), logo)
    draw.text((MARGIN + 105, 98), "comeleapi", font=F_DISPLAY_72, fill=DEEP)
    draw.text((MARGIN, 254), "MINI GUIDA AGLI OLI ESSENZIALI", font=F_BODY_BOLD_22, fill=ROSE)
    draw.text((MARGIN, 326), "L'Essenziale", font=F_DISPLAY_140, fill=INK)
    draw_text(
        draw,
        "La natura incontra il corpo.\nUn piccolo atlante per ascoltarsi, ogni giorno.",
        (MARGIN + 8, 500),
        820,
        F_DISPLAY_ITALIC_54,
        DEEP,
        66,
        16,
    )
    draw.text((MARGIN + 8, H - 96), "SARA BORDENGA  ·  comeleapi", font=F_BODY_BOLD_22, fill=DEEP)
    return save_page(page, 1, "copertina")


def introduction_page() -> Path:
    page = paper_background(BLUSH)
    draw = draw_brand_header(page, 2, "Introduzione")
    y = section_title(draw, "01", "Il corpo sa")

    paste_cover(page, OILS / "lavanda.png", (824, 360, 520, 1370), radius=46, focus=(.5, .54))
    overlay = Image.new("RGBA", (620, 1370), hex_rgba(PAPER, 38))
    page.alpha_composite(overlay, (760, 360))

    y = draw_text(
        draw,
        "Il corpo umano ha un grande potere, quello dell’auto-guarigione.",
        (MARGIN, y),
        660,
        F_DISPLAY_ITALIC_54,
        DEEP,
        66,
    ) + 34
    y = draw_text(
        draw,
        "Se in equilibrio, ha tutti gli strumenti per autoregolarsi.\n\nGli oli essenziali sono un mezzo naturale potentissimo con cui possiamo mantenere l’equilibrio, permettere al nostro corpo di auto-curarsi e alle nostre cellule di auto-rigenerarsi.",
        (MARGIN, y),
        650,
        F_BODY_34,
        INK_SOFT,
        52,
        22,
    ) + 42

    box = (MARGIN, y, 746, y + 290)
    draw.rounded_rectangle(box, radius=34, fill=hex_rgba(DEEP), outline=None)
    draw_centered_box_text(
        draw,
        "Altamente biocompatibili con il nostro organismo, gli oli essenziali vengono riconosciuti e assorbiti al 100%, attivando e velocizzando il processo di guarigione.",
        box,
        580,
        F_BODY_MEDIUM_31,
        PAPER,
        48,
    )
    paste_transparent(page, MACROS / "lavanda.png", (MARGIN, 1400, 650, 340))
    return save_page(page, 2, "introduzione")


def plant_intelligence_page() -> Path:
    page = paper_background()
    draw = draw_brand_header(page, 3, "Cosa sono")
    y = section_title(draw, "02", "L'intelligenza delle piante")
    y = draw_text(
        draw,
        "Gli oli essenziali sono composti volatili che evaporano facilmente.\nProdotti dalle piante per:",
        (MARGIN, y),
        760,
        F_BODY_34,
        INK_SOFT,
        52,
    ) + 28

    items = [
        "attrarre gli insetti impollinatori",
        "allontanare i parassiti",
        "difendersi dagli animali erbivori",
        "conservare la specie: penetrano nel terreno, impedendo a piante diverse di germogliare",
        "proteggersi da infezioni di batteri, funghi e muffe",
        "favorire la cicatrizzazione dei tessuti lesionati",
    ]
    for item in items:
        draw.ellipse((MARGIN + 4, y + 13, MARGIN + 20, y + 29), fill=ROSE)
        y = draw_text(draw, item, (MARGIN + 42, y), 690, F_BODY_31, INK_SOFT, 47) + 19

    paste_cover(page, OILS / "thieves.png", (884, 400, 460, 1030), radius=230, focus=(.5, .52))
    draw.rounded_rectangle((884, 1420, RIGHT, 1718), radius=34, fill=hex_rgba(BLUSH, 246))
    draw_text(
        draw,
        "Allo stesso modo, se utilizzati, svolgono sul corpo umano le stesse funzioni.",
        (924, 1480),
        380,
        F_DISPLAY_ITALIC_42,
        DEEP,
        53,
    )
    paste_transparent(page, MACROS / "thieves.png", (MARGIN, 1285, 680, 350))
    return save_page(page, 3, "cosa-sono")


def absorption_page() -> Path:
    page = paper_background("#F5EEE8")
    draw = draw_brand_header(page, 4, "Assorbimento")
    y = section_title(draw, "03", "Dal profumo alle cellule")
    draw_text(
        draw,
        "Gli oli essenziali hanno una velocità di assorbimento altissima:",
        (MARGIN, y),
        850,
        F_BODY_34,
        INK_SOFT,
        52,
    )

    metrics = [
        ("22", "secondi", "raggiunge il cervello"),
        ("2", "minuti", "entra nel flusso sanguigno"),
        ("20", "minuti", "è arrivato a tutte le cellule del nostro corpo"),
    ]
    metric_y = 640
    for value, unit, caption in metrics:
        draw.text((MARGIN, metric_y), value, font=F_DISPLAY_140, fill=ROSE)
        draw.text((290, metric_y + 40), unit.upper(), font=F_BODY_BOLD_22, fill=DEEP)
        draw_text(draw, caption, (290, metric_y + 85), 440, F_BODY_31, INK_SOFT, 46)
        draw.line((MARGIN, metric_y + 185, 704, metric_y + 185), fill=LINE, width=2)
        metric_y += 230

    paste_cover(page, OILS / "menta-piperita.png", (804, 470, 540, 850), radius=270, focus=(.5, .53))
    box = (804, 1325, RIGHT, 1775)
    draw.rounded_rectangle(box, radius=42, fill=hex_rgba(DEEP))
    draw_centered_box_text(
        draw,
        "Oltre a tutti i benefici fisici legati al sistema immunitario ed endocrino, l'aromaterapia coinvolge l'emotività, la memoria, la sensibilità e tutte le aree cognitive correlate. Potentissimo è l’impiego degli oli essenziali per riequilibrare la sfera psichica ed emozionale.",
        box,
        460,
        font("body", 24),
        PAPER,
        39,
    )
    paste_transparent(page, MACROS / "menta-piperita.png", (MARGIN, 1435, 580, 290))
    return save_page(page, 4, "assorbimento")


def applications_page() -> Path:
    page = paper_background(BLUSH)
    draw = draw_brand_header(page, 5, "Applicazioni")
    section_title(draw, "04", "Tre modi di incontrarli")

    sections = [
        ("01", "INALAZIONE", "diretta e immediata, in quanto le stimolazioni olfattive sono le sole a passare direttamente nella corteccia cerebrale senza essere filtrate preliminarmente dal talamo"),
        ("02", "USO TOPICO", "le molecole degli oli essenziali hanno molta affinità con i tessuti del corpo umano, quindi riescono facilmente a penetrare nella cute, arrivano in profondità raggiungendo il sistema circolatorio per diffondersi in tutto l’organismo"),
        ("03", "ASSUNZIONE ORALE", "a patto che si rispettino determinati requisiti, gli oli essenziali possono essere destinati ad uso interno"),
    ]
    y = 540
    for index, heading, body in sections:
        draw.text((MARGIN, y), index, font=F_DISPLAY_72, fill=ROSE)
        draw.text((246, y + 10), heading, font=F_BODY_BOLD_26, fill=DEEP)
        draw_text(draw, body, (246, y + 62), 1098, F_BODY_31, INK_SOFT, 47)
        draw.line((246, y + 320, RIGHT, y + 320), fill=LINE, width=2)
        y += 365

    box = (MARGIN, 1660, RIGHT, 1805)
    draw.rounded_rectangle(box, radius=72, fill=hex_rgba(DEEP))
    draw_centered_box_text(draw, "Chiedi sempre prima il parere di un esperto!", box, 1100, F_DISPLAY_ITALIC_42)
    return save_page(page, 5, "applicazioni")


def quality_page() -> Path:
    page = paper_background()
    draw = draw_brand_header(page, 6, "Qualità")
    y = section_title(draw, "05", "La qualità è parte della cura")

    paste_cover(page, OILS / "frankincense.png", (824, 430, 520, 1260), radius=44, focus=(.5, .55))
    draw_text(
        draw,
        "Creme, lozioni, trucchi, profumi, odori...\nIl corpo assorbe tutto.",
        (MARGIN, y),
        650,
        F_DISPLAY_ITALIC_54,
        DEEP,
        66,
    )
    y += 190
    body = (
        "Per questo è molto importante stare attenti alla qualità dei prodotti che si utilizzano.\n\n"
        "Puri e naturali al 100%, gli oli essenziali devono anche essere di alto grado terapeutico.\n\n"
        "Dalla semina, alla coltivazione, alla distillazione. La produzione richiede dei tempi e dei costi elevatissimi per riuscire a mantenere le caratteristiche chimiche della pianta e a conservare così tutta la potenza della natura.\n\n"
        "Fondamentale affidarsi ad un’azienda seria, capace e sicura nei propri mezzi economici. Un’azienda che garantisca trasparenza nella produzione e nel controllo qualità."
    )
    draw_text(draw, body, (MARGIN, y), 650, F_BODY_31, INK_SOFT, 47, 22)
    paste_transparent(page, MACROS / "frankincense.png", (MARGIN, 1490, 650, 285))
    return save_page(page, 6, "qualita")


def purity_page() -> Path:
    page = paper_background("#F6EFEA")
    draw = draw_brand_header(page, 7, "Qualità")
    section_title(draw, "06", "Quattro gradi di purezza")
    draw.text((MARGIN, 430), "Ci sono 4 gradi di purezza degli oli:", font=F_BODY_31, fill=INK_SOFT)

    grades = [
        ("D", "COSMETICA", "bassa qualità, riproducono sinteticamente l’odore, non contengono nulla della pianta (creme, lozioni, shampoo, ecc.)"),
        ("C", "PROFUMERIA", "contengono prodotti chimici e solventi, fortemente contaminati"),
        ("B", "GRADO ALIMENTARE", "organici, ma ancora contaminati chimicamente (dentifrici, gomme da masticare, aromi per dolci)"),
        ("A", "GRADO TERAPEUTICO", "oli puri e non adulterati, sicuri per l’uso interno"),
    ]
    y = 520
    for letter, heading, body in grades:
        draw.text((MARGIN, y - 14), letter, font=F_DISPLAY_112, fill=ROSE)
        draw.text((246, y + 10), heading, font=F_BODY_BOLD_26, fill=DEEP)
        draw_text(draw, body, (246, y + 62), 1050, F_BODY_31, INK_SOFT, 47)
        draw.line((246, y + 245, RIGHT, y + 245), fill=LINE, width=2)
        y += 270

    box = (MARGIN, 1570, RIGHT, 1820)
    draw.rounded_rectangle(box, radius=38, fill=hex_rgba(DEEP))
    draw_centered_box_text(
        draw,
        "Di questi solo il 5% della produzione mondiale rispetta i criteri necessari per mantenere tutti i principi attivi della pianta. Sono quindi pochissimi gli oli essenziali in commercio veramente efficaci, che contengano in sé tutta la potenza terapeutica della natura.",
        box,
        1180,
        F_BODY_28,
        PAPER,
        42,
    )
    return save_page(page, 7, "gradi-purezza")


def gallery_page(page_no: int, title: str, oils: list[tuple[str, str]], slug: str, closing: bool = False) -> Path:
    page = paper_background(BLUSH if page_no % 2 == 0 else IVORY)
    draw = draw_brand_header(page, page_no, "Atlante botanico")
    draw.text((96, 230), title, font=F_DISPLAY_92, fill=INK)
    draw.text((98, 350), "Dodici essenze, dodici identità botaniche.", font=F_DISPLAY_ITALIC_42, fill=DEEP)

    card_w, card_h = 592, 380
    xs = [MARGIN, MARGIN + card_w + 64]
    ys = [450, 865, 1280]
    for index, (name, filename) in enumerate(oils):
        x = xs[index % 2]
        y = ys[index // 2]
        column = index % 2
        macro_x = x + (150 if column == 0 else 44)
        bottle_x = x + (235 if column == 0 else 357)
        paste_transparent(page, MACROS / filename, (macro_x, y + 4, 398, 270))
        paste_bottle_vignette(page, OILS / filename, (bottle_x, y + 145), (240, 300))
        draw.text((x + card_w // 2, y + 304), name, font=F_DISPLAY_56, fill=INK, anchor="ma")

    if closing:
        footer = (MARGIN, 1685, RIGHT, 1810)
        draw.rounded_rectangle(footer, radius=35, fill=hex_rgba(DEEP))
        draw.text((720, 1718), "sara.bordenga@gmail.com  ·  388 163 9306", font=F_BODY_SEMI_30, fill=PAPER, anchor="ma")
        draw.text((720, 1766), "Guida informativa: chiedi sempre il parere di un professionista qualificato.", font=F_BODY_19, fill=PAPER, anchor="ma")
    return save_page(page, page_no, slug)


def build_pdf(page_paths: list[Path]) -> None:
    PDF_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(PDF_OUTPUT), pagesize=(PDF_W, PDF_H), pageCompression=1)
    c.setTitle("L'Essenziale - Guida agli oli essenziali")
    c.setAuthor("Sara Bordenga - comeleapi")
    c.setSubject("Mini guida illustrata agli oli essenziali")
    for page_path in page_paths:
        with Image.open(page_path) as image:
            rgb = image.convert("RGB")
            buffer = io.BytesIO()
            rgb.save(buffer, "JPEG", quality=92, optimize=True, progressive=True)
            buffer.seek(0)
            c.drawImage(ImageReader(buffer), 0, 0, PDF_W, PDF_H, preserveAspectRatio=False)
        c.showPage()
    c.save()
    PUBLIC_PDF.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(PDF_OUTPUT, PUBLIC_PDF)


def main() -> None:
    if PAGES_DIR.exists():
        shutil.rmtree(PAGES_DIR)
    PAGES_DIR.mkdir(parents=True, exist_ok=True)

    pages = [
        cover_page(),
        introduction_page(),
        plant_intelligence_page(),
        absorption_page(),
        applications_page(),
        quality_page(),
        purity_page(),
        gallery_page(8, "Un piccolo atlante", [
            ("Limone", "limone.png"),
            ("Lavanda", "lavanda.png"),
            ("Menta Piperita", "menta-piperita.png"),
            ("Arancio", "arancio.png"),
            ("DiGize", "digize.png"),
            ("Thieves", "thieves.png"),
        ], "atlante-uno"),
        gallery_page(9, "L'atlante continua", [
            ("Purification", "purification.png"),
            ("R.C.", "rc.png"),
            ("Blue Relief", "blue-relief.png"),
            ("Copaiba", "copaiba.png"),
            ("Stress Away", "stress-away.png"),
            ("Frankincense", "frankincense.png"),
        ], "atlante-due", closing=True),
    ]
    build_pdf(pages)
    print(f"Generated {len(pages)} page images in {PAGES_DIR}")
    print(f"Generated PDF: {PDF_OUTPUT}")
    print(f"Public PDF: {PUBLIC_PDF}")


if __name__ == "__main__":
    main()
