import os
import numpy as np
from PIL import Image

BADGES_DIR = r"c:\Users\om shanti\Documents\ZalandoPro_App\public\badges"

for f in ["starter.png", "trainee.png", "general.png", "senior.png", "regional.png", "reg_gen.png", 
          "starter_color.png", "trainee_color.png", "general_color.png", "senior_color.png", "regional_color.png", "reg_gen_color.png"]:
    p = os.path.join(BADGES_DIR, f)
    if os.path.exists(p):
        img = Image.open(p).convert("RGBA")
        arr = np.array(img)
        h, w, c = arr.shape
        # Set outer 2-pixel margin alpha to 0 if it's light/bg or edge
        arr[0:2, :, 3] = 0
        arr[-2:, :, 3] = 0
        arr[:, 0:2, 3] = 0
        arr[:, -2:, 3] = 0
        
        # Also trim any isolated floating low alpha edge artifacts
        alpha = arr[:, :, 3]
        low_alpha_mask = (alpha > 0) & (alpha < 35)
        arr[low_alpha_mask, 3] = 0
        
        Image.fromarray(arr).save(p, "PNG")
        print(f"Trimmed border margin on {f}")
