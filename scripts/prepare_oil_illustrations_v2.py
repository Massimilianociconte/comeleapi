#!/usr/bin/env python3
"""Create the vivid, precisely labelled oil illustrations used by guide v3."""

from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/img/guide/oils"
OUTPUT = ROOT / "assets/img/guide/oils-v2"
FONTS = ROOT / "assets/fonts"

OILS = {
    "arancio.png": "Arancio",
    "blue-relief.png": "Blue Relief",
    "copaiba.png": "Copaiba",
    "digize.png": "DiGize",
    "frankincense.png": "Frankincense",
    "lavanda.png": "Lavanda",
    "limone.png": "Limone",
    "menta-piperita.png": "Menta Piperita",
    "purification.png": "Purification",
    "rc.png": "R.C.",
    "stress-away.png": "Stress Away",
    "thieves.png": "Thieves",
}

INK = "#4F292C"
ROSE = "#B97870"


def fitted_font(path: Path, text: str, max_width: int, start_size: int, minimum: int) -> ImageFont.FreeTypeFont:
    size = start_size
    while size >= minimum:
        candidate = ImageFont.truetype(str(path), size)
        if candidate.getlength(text) <= max_width:
            return candidate
        size -= 1
    return ImageFont.truetype(str(path), minimum)


def split_name(name: str) -> list[str]:
    if name == "Menta Piperita":
        return ["Menta", "Piperita"]
    if name == "Blue Relief":
        return ["Blue Relief"]
    if name == "Stress Away":
        return ["Stress Away"]
    return [name]


def enhance(source: Image.Image) -> Image.Image:
    image = source.convert("RGB")
    image = ImageEnhance.Color(image).enhance(1.22)
    image = ImageEnhance.Contrast(image).enhance(1.045)
    image = ImageEnhance.Brightness(image).enhance(1.015)
    image = ImageEnhance.Sharpness(image).enhance(1.08)
    return image.filter(ImageFilter.UnsharpMask(radius=1.2, percent=48, threshold=3))


def add_label(image: Image.Image, name: str) -> None:
    draw = ImageDraw.Draw(image)
    center_x = image.width // 2
    label_width = 190
    brand_font = ImageFont.truetype(str(FONTS / "mulish-700.ttf"), 16)
    descriptor_font = ImageFont.truetype(str(FONTS / "mulish-600.ttf"), 13)
    display_path = FONTS / "cormorant-garamond-700.ttf"

    draw.text((center_x, 884), "comeleapi", font=brand_font, fill=ROSE, anchor="mm")
    draw.line((center_x - 48, 906, center_x + 48, 906), fill=ROSE, width=2)

    lines = split_name(name)
    if len(lines) == 1:
        name_font = fitted_font(display_path, lines[0], label_width, 34, 21)
        draw.text((center_x, 958), lines[0], font=name_font, fill=INK, anchor="mm")
    else:
        name_font = fitted_font(display_path, max(lines, key=len), label_width, 31, 22)
        draw.text((center_x, 942), lines[0], font=name_font, fill=INK, anchor="mm")
        draw.text((center_x, 976), lines[1], font=name_font, fill=INK, anchor="mm")

    draw.line((center_x - 34, 1003, center_x + 34, 1003), fill=ROSE, width=2)
    draw.text((center_x, 1028), "OLIO ESSENZIALE", font=descriptor_font, fill=INK, anchor="mm")


def main() -> None:
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    OUTPUT.mkdir(parents=True, exist_ok=True)

    for filename, name in OILS.items():
        with Image.open(SOURCE / filename) as source:
            image = enhance(source)
        add_label(image, name)
        image.save(OUTPUT / filename, "PNG", optimize=True)
        print(f"Prepared {name}: {OUTPUT / filename}")


if __name__ == "__main__":
    main()
