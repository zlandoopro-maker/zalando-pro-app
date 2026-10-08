"""
Final fix: Hard-threshold alpha on colored badge PNGs so there are
ZERO semi-transparent edge pixels that can bleed color outward.
Any pixel with alpha < 180 becomes alpha=0 (fully transparent).
Any pixel with alpha >= 180 keeps its original alpha.
This gives a clean, sharp emblem boundary with no colored fringe.
"""
import os
from pathlib import Path
import numpy as np
from PIL import Image

BADGES_DIR = str(Path(__file__).parent / "public" / "badges")
ALPHA_THRESHOLD = 180  # Pixels below this alpha are fully transparent

color_files = [
    "trainee_color.png",
    "general_color.png",
    "senior_color.png",
    "regional_color.png",
    "reg_gen_color.png",
    "starter_color.png",
]

for fname in color_files:
    fpath = os.path.join(BADGES_DIR, fname)
    if not os.path.exists(fpath):
        continue

    img = Image.open(fpath).convert("RGBA")
    arr = np.array(img)

    alpha = arr[:, :, 3].copy()

    # Hard threshold: < threshold → 0 (fully transparent), else keep
    arr[:, :, 3] = np.where(alpha < ALPHA_THRESHOLD, 0, alpha)

    result = Image.fromarray(arr, mode="RGBA")
    result.save(fpath, "PNG")

    # Verify
    final = np.array(result)[:, :, 3]
    border = np.concatenate([final[0, :], final[-1, :], final[:, 0], final[:, -1]])
    print(f"[{fname}] Border max alpha: {border.max()} | Emblem pixels: {np.count_nonzero(final)}")

print("Done — all colored badge edges are now sharp and clean.")
