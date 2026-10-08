import os
from pathlib import Path
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

BADGES_DIR = str(Path(__file__).parent / "public" / "badges")

tiers_config = {
    "starter": {
        "palette": [
            (0.00, (35, 42, 55)),
            (0.30, (90, 105, 125)),
            (0.60, (190, 205, 220)),
            (0.85, (240, 245, 252)),
            (1.00, (255, 255, 255))
        ]
    },
    "trainee": {
        "palette": [
            (0.00, (40, 48, 62)),
            (0.30, (100, 118, 138)),
            (0.60, (200, 215, 232)),
            (0.85, (245, 250, 255)),
            (1.00, (255, 255, 255))
        ]
    },
    "general": { # Metallic Green (Emerald)
        "palette": [
            (0.00, (2, 45, 25)),
            (0.25, (5, 95, 55)),
            (0.55, (16, 195, 115)),
            (0.82, (160, 250, 205)),
            (1.00, (245, 255, 250))
        ]
    },
    "senior": { # Metallic Blue (Sapphire)
        "palette": [
            (0.00, (5, 30, 85)),
            (0.25, (15, 80, 190)),
            (0.55, (0, 150, 255)),
            (0.82, (170, 230, 255)),
            (1.00, (245, 252, 255))
        ]
    },
    "regional": { # Metallic Fuchsia Pink
        "palette": [
            (0.00, (65, 5, 45)),
            (0.25, (140, 15, 90)),
            (0.55, (245, 30, 145)),
            (0.82, (255, 185, 230)),
            (1.00, (255, 245, 252))
        ]
    },
    "reg_gen": { # Pure Metallic Gold
        "palette": [
            (0.00, (75, 35, 0)),
            (0.25, (160, 90, 0)),
            (0.55, (255, 195, 0)),
            (0.80, (255, 235, 140)),
            (1.00, (255, 255, 230))
        ]
    }
}

def remove_background(img_rgba):
    """
    Remove background box/haze by flood-filling from outer borders.
    """
    arr = np.array(img_rgba)
    h, w, c = arr.shape
    
    # Create mask of background pixels
    # BFS flood fill from all border pixels
    visited = np.zeros((h, w), dtype=bool)
    bg_mask = np.zeros((h, w), dtype=bool)
    
    # We define background reference color from 4 corners
    corner_colors = [arr[0, 0, :3], arr[0, w-1, :3], arr[h-1, 0, :3], arr[h-1, w-1, :3]]
    
    # Queue for BFS
    queue = []
    # Add border pixels to queue
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
        
        # Check if this pixel is background
        # If alpha is 0 or pixel color is close to light off-white background
        # Or close to any corner color
        is_bg = False
        if a < 20:
            is_bg = True
        else:
            # Distance to corner colors
            for cc in corner_colors:
                dist = np.sqrt(np.sum((arr[y, x, :3].astype(float) - cc.astype(float))**2))
                if dist < 45: # color distance threshold for background
                    is_bg = True
                    break
            # Also light background check (high brightness, low saturation)
            if not is_bg and r > 180 and g > 180 and b > 180:
                max_c = max(r, g, b)
                min_c = min(r, g, b)
                if (max_c - min_c) < 30: # low saturation off-white/grey bg
                    is_bg = True
                    
        if is_bg:
            bg_mask[y, x] = True
            # Add 4-connected neighbors
            for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
                    queue.append((ny, nx))

    # Set all flood-filled background pixels to completely transparent (0, 0, 0, 0)
    cleaned_arr = arr.copy()
    cleaned_arr[bg_mask] = [0, 0, 0, 0]
    
    # Erode border alpha slightly to eliminate anti-aliasing edge halos
    cleaned_img = Image.fromarray(cleaned_arr, mode="RGBA")
    return cleaned_img

def apply_metallic_color(cleaned_img, palette):
    arr = np.array(cleaned_img, dtype=np.float32)
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    
    # Lum calculation for badge interior
    lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
    
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
            
    out_arr = np.zeros_like(arr, dtype=np.uint8)
    out_arr[:, :, 0] = np.clip(r_out, 0, 255).astype(np.uint8)
    out_arr[:, :, 1] = np.clip(g_out, 0, 255).astype(np.uint8)
    out_arr[:, :, 2] = np.clip(b_out, 0, 255).astype(np.uint8)
    # Strictly preserve alpha mask — ZERO color outside actual emblem geometry!
    out_arr[:, :, 3] = a.astype(np.uint8)
    
    result_img = Image.fromarray(out_arr, mode="RGBA")
    result_img = ImageEnhance.Contrast(result_img).enhance(1.20)
    result_img = ImageEnhance.Color(result_img).enhance(1.15)
    return result_img

for tier_id, cfg in tiers_config.items():
    inp_path = os.path.join(BADGES_DIR, f"{tier_id}.png")
    silver_out_path = os.path.join(BADGES_DIR, f"{tier_id}.png")
    color_out_path = os.path.join(BADGES_DIR, f"{tier_id}_color.png")
    
    if os.path.exists(inp_path):
        img = Image.open(inp_path).convert("RGBA")
        cleaned_silver = remove_background(img)
        
        # Save cleaned silver badge with transparent background
        cleaned_silver.save(silver_out_path, "PNG")
        print(f"Cleaned silver badge: {tier_id} -> {silver_out_path}")
        
        # Apply metallic color to cleaned badge
        cleaned_color = apply_metallic_color(cleaned_silver, cfg["palette"])
        cleaned_color.save(color_out_path, "PNG")
        print(f"Cleaned metallic color badge: {tier_id} -> {color_out_path}")
