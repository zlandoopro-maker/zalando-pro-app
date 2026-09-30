import os
import numpy as np
from PIL import Image

BADGES_DIR = r"c:\Users\om shanti\Documents\ZalandoPro_App\public\badges"

for f in ["starter", "trainee", "general", "senior", "regional", "reg_gen"]:
    p = os.path.join(BADGES_DIR, f"{f}_color.png")
    if os.path.exists(p):
        img = Image.open(p).convert("RGBA")
        arr = np.array(img)
        alpha = arr[:, :, 3]
        
        # Bounding box of emblem
        y_indices, x_indices = np.where(alpha > 0)
        min_y, max_y = y_indices.min(), y_indices.max()
        min_x, max_x = x_indices.min(), x_indices.max()
        
        emblem_w = max_x - min_x + 1
        emblem_h = max_y - min_y + 1
        
        # Edge alpha max
        edge_alpha = np.concatenate([alpha[0, :], alpha[-1, :], alpha[:, 0], alpha[:, -1]])
        max_edge_a = edge_alpha.max()
        
        print(f"[{f.upper()}] Badge Silhouette:")
        print(f"  Emblem Bounding Box: ({min_x}, {min_y}) -> ({max_x}, {max_y})")
        print(f"  Emblem Size: {emblem_w} x {emblem_h} (Centered in {img.width}x{img.height})")
        print(f"  Total Emblem Pixels: {len(y_indices)}")
        print(f"  Outer Image Border Max Alpha: {max_edge_a} (Must be 0)")
        print("-" * 50)
