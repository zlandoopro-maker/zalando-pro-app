import os
from pathlib import Path
import numpy as np
from PIL import Image

BADGES_DIR = str(Path(__file__).parent / "public" / "badges")

for filename in ["trainee.png", "general.png", "senior.png", "regional.png", "reg_gen.png", "starter.png"]:
    filepath = os.path.join(BADGES_DIR, filename)
    if os.path.exists(filepath):
        img = Image.open(filepath).convert("RGBA")
        arr = np.array(img)
        print(f"=== {filename} ===")
        # Print non-zero alpha regions and colors
        alpha = arr[:, :, 3]
        mask = alpha > 0
        print(f"Shape: {arr.shape}, Total non-transparent pixels: {np.count_nonzero(mask)}")
        # Check luminance histogram of non-transparent pixels
        r, g, b = arr[mask, 0], arr[mask, 1], arr[mask, 2]
        lum = 0.299 * r + 0.587 * g + 0.114 * b
        print(f"Luminance min: {lum.min():.1f}, max: {lum.max():.1f}, mean: {lum.mean():.1f}")
        # Check saturation of non-transparent pixels
        max_c = np.maximum(r, np.maximum(g, b))
        min_c = np.minimum(r, np.minimum(g, b))
        sat = max_c - min_c
        print(f"Saturation min: {sat.min()}, max: {sat.max()}, mean: {sat.mean():.1f}")
