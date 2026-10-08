import os
from pathlib import Path
import numpy as np
from PIL import Image

BADGES_DIR = str(Path(__file__).parent / "public" / "badges")

for filename in ["trainee.png", "general.png", "senior.png", "regional.png", "reg_gen.png"]:
    filepath = os.path.join(BADGES_DIR, filename)
    img = Image.open(filepath).convert("RGBA")
    arr = np.array(img)
    
    print(f"=== {filename} ===")
    print("Top-left pixel RGB A:", arr[0, 0])
    print("Top-right pixel RGB A:", arr[0, -1])
    print("Center pixel RGB A:", arr[52, 52])
    
    # Count how many non-transparent pixels exist and what their colors are near the corners
    corners = np.concatenate([arr[0:5, 0:5], arr[0:5, -5:], arr[-5:, 0:5], arr[-5:, -5:]])
    corners_flat = corners.reshape(-1, 4)
    print("Corner alphas max:", corners_flat[:, 3].max(), "min:", corners_flat[:, 3].min())
    print("Unique corner colors (RGB A):", np.unique(corners_flat, axis=0))
