import os
from pathlib import Path
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

BADGES_DIR = str(Path(__file__).parent / "public" / "badges")

# Multi-stop Metallic Palette definitions
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

def clean_and_perfect_badge(tier_id):
    silver_path = os.path.join(BADGES_DIR, f"{tier_id}.png")
    color_path = os.path.join(BADGES_DIR, f"{tier_id}_color.png")
    
    if not os.path.exists(silver_path):
        return

    img = Image.open(silver_path).convert("RGBA")
    arr = np.array(img)
    h, w, c = arr.shape

    # 1. Precise background flood fill starting ONLY from the outer image borders
    visited = np.zeros((h, w), dtype=bool)
    bg_mask = np.zeros((h, w), dtype=bool)
    
    # Corner reference colors
    corner_colors = [arr[0, 0, :3], arr[0, w-1, :3], arr[h-1, 0, :3], arr[h-1, w-1, :3]]

    queue = []
    for x in range(w):
        queue.append((0, x))
        queue.append((h-1, x))
    for y in range(h):
        queue.append((y, 0))
        queue.append((y, w-1))

    while queue:
        y, x = queue.pop(0)
        if visited[y, x]:
            continue
        visited[y, x] = True

        r, g, b, a = arr[y, x]
        
        # Check if background: alpha is zero OR color is close to corner background color
        is_bg = False
        if a < 15:
            is_bg = True
        else:
            # Color distance to corner background
            for cc in corner_colors:
                dist = np.sqrt(np.sum((arr[y, x, :3].astype(float) - cc.astype(float))**2))
                if dist < 28: # Strict threshold so we NEVER touch emblem edges
                    is_bg = True
                    break
            if not is_bg and r > 215 and g > 215 and b > 215:
                # High brightness off-white background
                if (max(r, g, b) - min(r, g, b)) < 20:
                    is_bg = True

        if is_bg:
            bg_mask[y, x] = True
            for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
                    queue.append((ny, nx))

    # Clean array: set background to completely transparent (0,0,0,0)
    cleaned_arr = arr.copy()
    cleaned_arr[bg_mask] = [0, 0, 0, 0]
    
    # Preserve full unbroken emblem mask
    cleaned_img = Image.fromarray(cleaned_arr, mode="RGBA")
    cleaned_img.save(silver_path, "PNG")
    print(f"Saved neat & clean silver badge: {silver_path}")

    # 2. Build colored metallic variant on intact emblem
    f_arr = np.array(cleaned_img, dtype=np.float32)
    r, g, b, a = f_arr[:, :, 0], f_arr[:, :, 1], f_arr[:, :, 2], f_arr[:, :, 3]

    lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0

    palette = metallic_palettes[tier_id]
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

    out_arr = np.zeros_like(f_arr, dtype=np.uint8)
    out_arr[:, :, 0] = np.clip(r_out, 0, 255).astype(np.uint8)
    out_arr[:, :, 1] = np.clip(g_out, 0, 255).astype(np.uint8)
    out_arr[:, :, 2] = np.clip(b_out, 0, 255).astype(np.uint8)
    out_arr[:, :, 3] = a.astype(np.uint8)

    color_img = Image.fromarray(out_arr, mode="RGBA")
    color_img = ImageEnhance.Contrast(color_img).enhance(1.20)
    color_img = ImageEnhance.Color(color_img).enhance(1.15)
    color_img.save(color_path, "PNG")
    print(f"Saved neat & clean metallic color badge: {color_path}")

for tier_id in metallic_palettes:
    clean_and_perfect_badge(tier_id)
