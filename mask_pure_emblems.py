import os
from pathlib import Path
import numpy as np
from PIL import Image

BADGES_DIR = str(Path(__file__).parent / "public" / "badges")

for f in ["starter", "trainee", "general", "senior", "regional", "reg_gen"]:
    silver_p = os.path.join(BADGES_DIR, f"{f}.png")
    color_p = os.path.join(BADGES_DIR, f"{f}_color.png")
    
    for p in [silver_p, color_p]:
        if not os.path.exists(p):
            continue
        img = Image.open(p).convert("RGBA")
        arr = np.array(img)
        h, w, c = arr.shape
        cy, cx = h // 2, w // 2
        
        # Create distance map from center
        y_indices, x_indices = np.ogrid[:h, :w]
        dist_from_center = np.sqrt((y_indices - cy)**2 + (x_indices - cx)**2)
        
        # For emblem geometry, the maximum emblem radius is ~44.5 pixels from center (105x105 image)
        # Any pixel beyond radius 44.5 is background flare/splash/noise
        outer_mask = dist_from_center > 44.5
        arr[outer_mask, 3] = 0
        
        # Also clean any light/low-saturation background fringe pixels within radius 40-45
        fringe_mask = (dist_from_center > 40.0) & (dist_from_center <= 44.5)
        # In fringe area, if alpha is low or color is light background, set alpha to 0
        for y in range(h):
            for x in range(w):
                if fringe_mask[y, x] and arr[y, x, 3] > 0:
                    r, g, b, a = arr[y, x]
                    # If it's a light background fringe pixel or low contrast edge
                    if a < 150 or (r > 190 and g > 190 and b > 190):
                        arr[y, x, 3] = 0
                        
        Image.fromarray(arr).save(p, "PNG")
        print(f"Cleaned pure emblem mask on {p}")
