import os
import numpy as np
from PIL import Image, ImageEnhance

BADGES_DIR = r"c:\Users\om shanti\Documents\ZalandoPro_App\public\badges"

metallic_palettes = {
    "starter": [
        (0.00, (35, 42, 55)),
        (0.30, (90, 105, 125)),
        (0.60, (190, 205, 220)),
        (0.85, (240, 245, 252)),
        (1.00, (255, 255, 255))
    ],
    "trainee": [
        (0.00, (40, 48, 62)),
        (0.30, (100, 118, 138)),
        (0.60, (200, 215, 232)),
        (0.85, (245, 250, 255)),
        (1.00, (255, 255, 255))
    ],
    "general": [ # Metallic Green (Emerald)
        (0.00, (2, 45, 25)),
        (0.25, (5, 95, 55)),
        (0.55, (16, 195, 115)),
        (0.82, (160, 250, 205)),
        (1.00, (245, 255, 250))
    ],
    "senior": [ # Metallic Blue (Sapphire)
        (0.00, (5, 30, 85)),
        (0.25, (15, 80, 190)),
        (0.55, (0, 150, 255)),
        (0.82, (170, 230, 255)),
        (1.00, (245, 252, 255))
    ],
    "regional": [ # Metallic Fuchsia Pink
        (0.00, (65, 5, 45)),
        (0.25, (140, 15, 90)),
        (0.55, (245, 30, 145)),
        (0.82, (255, 185, 230)),
        (1.00, (255, 245, 252))
    ],
    "reg_gen": [ # Pure Metallic Gold
        (0.00, (75, 35, 0)),
        (0.25, (160, 90, 0)),
        (0.55, (255, 195, 0)),
        (0.80, (255, 235, 140)),
        (1.00, (255, 255, 230))
    ]
}

def interpolate_palette(lum, palette):
    stops = [p[0] for p in palette]
    colors = [np.array(p[1], dtype=np.float32) for p in palette]
    
    r_out = np.zeros_like(lum)
    g_out = np.zeros_like(lum)
    b_out = np.zeros_like(lum)
    
    for i in range(len(stops) - 1):
        s0, s1 = stops[i], stops[i+1]
        c0, c1 = colors[i], colors[i+1]
        
        mask = (lum >= s0) & (lum <= s1) if i == len(stops)-2 else (lum >= s0) & (lum < s1)
        if not np.any(mask):
            continue
            
        t = (lum[mask] - s0) / (s1 - s0 + 1e-6)
        t_smooth = t * t * (3.0 - 2.0 * t)
        
        for c_idx, out in enumerate([r_out, g_out, b_out]):
            channel_val = c0[c_idx] + t_smooth * (c1[c_idx] - c0[c_idx])
            out[mask] = channel_val
            
    return r_out, g_out, b_out

def build_badge(tier_id):
    silver_path = os.path.join(BADGES_DIR, f"{tier_id}.png")
    color_path = os.path.join(BADGES_DIR, f"{tier_id}_color.png")
    
    if not os.path.exists(silver_path):
        return
        
    img = Image.open(silver_path).convert("RGBA")
    arr = np.array(img, dtype=np.float32)
    
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    
    # Calculate luminance
    lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
    
    palette = metallic_palettes[tier_id]
    r_out, g_out, b_out = interpolate_palette(lum, palette)
    
    out_arr = np.zeros_like(arr, dtype=np.uint8)
    out_arr[:, :, 0] = np.clip(r_out, 0, 255).astype(np.uint8)
    out_arr[:, :, 1] = np.clip(g_out, 0, 255).astype(np.uint8)
    out_arr[:, :, 2] = np.clip(b_out, 0, 255).astype(np.uint8)
    
    # PRESERVE CLEAN SILHOUETTE MASK EXACTLY — ZERO COLOR OUTSIDE EMBLEM
    out_arr[:, :, 3] = a.astype(np.uint8)
    
    result_img = Image.fromarray(out_arr, mode="RGBA")
    result_img = ImageEnhance.Contrast(result_img).enhance(1.20)
    result_img = ImageEnhance.Color(result_img).enhance(1.15)
    
    result_img.save(color_path, "PNG")
    print(f"Generated clean metallic badge: {tier_id}_color.png")

for tier_id in metallic_palettes:
    build_badge(tier_id)
