import os
from pathlib import Path
import numpy as np
from PIL import Image

BADGES_DIR = str(Path(__file__).parent / "public" / "badges")

for tier in ["trainee", "general", "senior", "regional", "reg_gen"]:
    silver_path = os.path.join(BADGES_DIR, f"{tier}.png")
    color_path = os.path.join(BADGES_DIR, f"{tier}_color.png")
    
    for name, p in [("Silver", silver_path), ("Color", color_path)]:
        if os.path.exists(p):
            img = Image.open(p).convert("RGBA")
            arr = np.array(img)
            h, w, _ = arr.shape
            
            # Check edge alpha
            edge_alpha = np.concatenate([arr[0, :, 3], arr[-1, :, 3], arr[:, 0, 3], arr[:, -1, 3]])
            max_edge_a = edge_alpha.max()
            
            # Non-transparent alpha mask
            mask = arr[:, :, 3] > 0
            visible_rgb = arr[mask, :3]
            
            mean_r = visible_rgb[:, 0].mean()
            mean_g = visible_rgb[:, 1].mean()
            mean_b = visible_rgb[:, 2].mean()
            
            print(f"[{tier.upper()}] {name} Badge:")
            print(f"  Outer edge max alpha: {max_edge_a} (Must be 0)")
            print(f"  Visible emblem pixel count: {np.count_nonzero(mask)}")
            print(f"  Average Emblem RGB: R={mean_r:.1f}, G={mean_g:.1f}, B={mean_b:.1f}")
            print("-" * 50)
