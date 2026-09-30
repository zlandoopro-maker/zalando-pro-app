import os
import numpy as np
from PIL import Image

BADGES_DIR = r"c:\Users\om shanti\Documents\ZalandoPro_App\public\badges"

for f in ["trainee.png", "general.png", "senior.png", "regional.png", "reg_gen.png", "starter.png"]:
    path = os.path.join(BADGES_DIR, f)
    if os.path.exists(path):
        img = Image.open(path)
        arr = np.array(img)
        print(f"File: {f}, Size: {img.size}, Mode: {img.mode}, Shape: {arr.shape}")
        if arr.shape[2] == 4:
            alpha = arr[:, :, 3]
            print(f"  Alpha min: {alpha.min()}, max: {alpha.max()}, non-zero count: {np.count_nonzero(alpha)}")
            # Check edge alpha values (top row, bottom row, left col, right col)
            edge_alpha = np.concatenate([alpha[0, :], alpha[-1, :], alpha[:, 0], alpha[:, -1]])
            print(f"  Edge alpha max: {edge_alpha.max()}, non-zero edge alpha: {np.count_nonzero(edge_alpha)}")
