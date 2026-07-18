#!/usr/bin/env python3
"""Generate a custom high-resolution download icon matching the style of other custom icons."""

from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "assets/img/icons/icon-download-custom.png"

def main() -> None:
    # We draw at 4x resolution (2048x2048) and downscale to 512x512 for perfect anti-aliasing
    scale = 4
    size = 512 * scale
    center = size // 2

    # Brand Colors
    bg_color = (253, 236, 237)      # #FDEDED
    stroke_color = (50, 23, 27)     # #32171B (brand ink)

    # Create high-res canvas
    img = Image.new("RGB", (size, size), bg_color)
    draw = ImageDraw.Draw(img)

    # Dimensions for 2048x2048 canvas
    shaft_width = 80 * scale        # 320px
    shaft_height = 140 * scale      # 560px
    head_width = 300 * scale        # 1200px
    head_height = 110 * scale       # 440px
    tray_width = 320 * scale        # 1280px
    tray_height = 40 * scale        # 160px
    tray_ear_height = 100 * scale   # 400px

    # Vertical offsets to center the group
    # Total height = shaft_height + head_height + tray_gap + tray_height = 560 + 440 + 80 + 160 = 1240px
    # Start Y to center vertically: (2048 - 1240) // 2 = 404
    start_y = 400

    # 1. Draw Arrow Shaft
    shaft_left = center - (shaft_width // 2)
    shaft_right = center + (shaft_width // 2)
    shaft_top = start_y
    shaft_bottom = start_y + shaft_height
    draw.rectangle([shaft_left, shaft_top, shaft_right, shaft_bottom], fill=stroke_color)

    # 2. Draw Arrow Head (pointing down)
    head_left = center - (head_width // 2)
    head_right = center + (head_width // 2)
    head_top = shaft_bottom
    head_bottom = head_top + head_height
    draw.polygon([
        (head_left, head_top),
        (head_right, head_top),
        (center, head_bottom)
    ], fill=stroke_color)

    # 3. Draw Bottom Bracket (Tray)
    tray_gap = 20 * scale  # 80px space between arrowhead tip and tray bottom bar
    tray_top = head_bottom + tray_gap
    tray_bottom = tray_top + tray_height
    tray_left = center - (tray_width // 2)
    tray_right = center + (tray_width // 2)

    # Horizontal bottom bar
    draw.rectangle([tray_left, tray_top, tray_right, tray_bottom], fill=stroke_color)

    # Left and Right vertical lips (ears) of the bracket
    ear_width = tray_height  # same thickness
    draw.rectangle([tray_left, tray_top - tray_ear_height + tray_height, tray_left + ear_width, tray_top], fill=stroke_color)
    draw.rectangle([tray_right - ear_width, tray_top - tray_ear_height + tray_height, tray_right, tray_top], fill=stroke_color)

    # Downsample to 512x512 using Lanczos interpolation for smooth edges
    final_img = img.resize((512, 512), resample=Image.Resampling.LANCZOS)
    
    # Save the custom icon
    final_img.save(OUTPUT_PATH, "PNG", optimize=True)
    print(f"Custom download icon generated and saved at {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
