import os
from pathlib import Path
import numpy as np
from PIL import Image

BADGES_DIR = str(Path(__file__).parent / "public" / "badges")

for f in ["starter.png", "trainee.png", "general.png", "senior.png", "regional.png", "reg_gen.png"]:
    p = os.path.join(BADGES_DIR, f)
    if not os.path.exists(p):
        continue
    img = Image.open(p).convert("RGBA")
    arr = np.array(img)
    h, w, c = arr.shape
    
    # Check pixels in the outer margin (e.g. within 20px of the edge)
    # The emblem itself is centered in the box (e.g. radius from center (52, 52))
    center_y, center_x = h // 2, w // 2
    
    print(f"\n=== {f} (size {w}x{h}) ===")
    # Print max non-transparent distance from center for emblem vs outer splashes
    distances = []
    for y in range(h):
        for x in range(w):
            if arr[y, x, 3] > 0:
                dist = np.sqrt((y - center_y)**2 + (x - center_x)**2)
                distances.append((dist, y, x, arr[y, x]))
                
    distances.sort(key=lambda item: item[0], reverse=True)
    print("Farthest 15 non-transparent pixels from center:")
    for dist, y, x, val in distances[:15]:
        print(f"  dist={dist:.1f} at ({x}, {y}): RGB={val[:3]}, A={val[3]}")
