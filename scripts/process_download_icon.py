#!/usr/bin/env python3
import sys
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SRC_JPG = Path("/Users/massimilianociconte/.gemini/antigravity/brain/050458e8-bfe9-46bb-9cf6-a607485d7d08/icon_download_custom_1784292710939.jpg")
DEST_PNG = ROOT / "assets/img/icons/icon-download-custom.png"

def main() -> None:
    if not SRC_JPG.exists():
        print(f"Error: Source image {SRC_JPG} not found.")
        sys.exit(1)

    # Load high-res generated JPG
    img = Image.open(SRC_JPG).convert("RGBA")
    
    # 1. Convert to grayscale and invert to create the mask
    gray = img.convert("L")
    inverted = ImageOps.invert(gray)
    
    # Threshold background noise (original background is very bright ~230-245)
    mask = inverted.point(lambda p: 0 if p < 35 else min(255, int((p - 35) * 255 / (220 - 35))))
    
    # 2. Get symbol bounding box on the original high-res image
    bbox = mask.getbbox()
    if not bbox:
        print("Error: Bounding box not found.")
        sys.exit(1)
        
    print(f"High-res bounding box: {bbox}")
    
    # Crop the symbol and mask
    symbol_crop = img.crop(bbox)
    mask_crop = mask.crop(bbox)
    
    # 3. Calculate target dimensions for 512x512 canvas
    # We want the symbol width to be exactly 270px on the 512px canvas (matching the 271px width of the arrow icon)
    target_width = 270
    orig_w, orig_h = symbol_crop.size
    
    target_height = int(orig_h * (target_width / orig_w))
    print(f"Resizing symbol from {orig_w}x{orig_h} to {target_width}x{target_height}")
    
    # Resize symbol and mask
    symbol_resized = symbol_crop.resize((target_width, target_height), resample=Image.Resampling.LANCZOS)
    mask_resized = mask_crop.resize((target_width, target_height), resample=Image.Resampling.LANCZOS)
    
    # 4. Create 512x512 canvas with the EXACT color of the arrow icon's background: (253, 237, 238)
    bg_color = (253, 237, 238, 255)
    new_img = Image.new("RGBA", (512, 512), bg_color)
    
    # Calculate centering coordinates
    paste_x = (512 - target_width) // 2
    paste_y = (512 - target_height) // 2
    
    # Paste using mask
    new_img.paste(symbol_resized, (paste_x, paste_y), mask=mask_resized)
    
    # Convert and save as PNG
    final_img = new_img.convert("RGB")
    final_img.save(DEST_PNG, "PNG", optimize=True)
    
    print(f"Successfully processed icon saved at {DEST_PNG}")

if __name__ == "__main__":
    main()
