#!/usr/bin/env python3
"""Split Imagen botanical sheets into softly transparent guide assets."""

from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SHEETS = ROOT / "assets/img/guide/macro-sheets"
OUTPUT = ROOT / "assets/img/guide/macros-v1"

SHEET_CONTENT = {
    "atlante-uno.png": [
        "limone", "lavanda", "menta-piperita", "arancio", "digize", "thieves",
    ],
    "atlante-due.png": [
        "purification", "rc", "blue-relief", "copaiba", "stress-away", "frankincense",
    ],
}


def transparent_paper(image: Image.Image) -> Image.Image:
    rgb = image.convert("RGB")
    samples = [rgb.getpixel((8, 8)), rgb.getpixel((rgb.width - 9, 8)),
               rgb.getpixel((8, rgb.height - 9)), rgb.getpixel((rgb.width - 9, rgb.height - 9))]
    paper = tuple(sum(pixel[channel] for pixel in samples) // len(samples) for channel in range(3))
    background = Image.new("RGB", rgb.size, paper)
    difference = ImageChops.difference(rgb, background).convert("L")
    alpha = difference.point(lambda value: 0 if value < 8 else 255 if value > 34 else int((value - 8) * 255 / 26))
    alpha = alpha.filter(ImageFilter.GaussianBlur(2.2))

    feather = Image.new("L", rgb.size, 255)
    border = 26
    feather = Image.new("L", rgb.size, 0)
    feather_draw = ImageDraw.Draw(feather)
    for inset in range(border):
        value = int(255 * inset / border)
        feather_draw.rectangle((inset, inset, rgb.width - 1 - inset, rgb.height - 1 - inset), fill=value)
    alpha = ImageChops.multiply(alpha, feather.filter(ImageFilter.GaussianBlur(5)))
    result = rgb.convert("RGBA")
    result.putalpha(alpha)
    return result


def main() -> None:
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    OUTPUT.mkdir(parents=True, exist_ok=True)

    for sheet_name, names in SHEET_CONTENT.items():
        with Image.open(SHEETS / sheet_name) as opened:
            sheet = opened.convert("RGB")
        cell_width = sheet.width // 2
        cell_height = sheet.height // 3
        for index, name in enumerate(names):
            column = index % 2
            row = index // 2
            pad_x, pad_y = 20, 18
            crop = sheet.crop((
                column * cell_width + pad_x,
                row * cell_height + pad_y,
                (column + 1) * cell_width - pad_x,
                (row + 1) * cell_height - pad_y,
            ))
            asset = transparent_paper(crop)
            asset.save(OUTPUT / f"{name}.png", "PNG", optimize=True)
            print(f"Prepared macro: {name}")


if __name__ == "__main__":
    main()
