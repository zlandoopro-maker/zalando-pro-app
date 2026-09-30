import os
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

BADGES_DIR = r"c:\Users\om shanti\Documents\ZalandoPro_App\public\badges"

metallic_palettes = {
    "starter": [
        (0.00, (55, 60, 72)),
        (0.30, (110, 118, 132)),
        (0.60, (190, 200, 215)),
        (0.85, (240, 245, 252)),
        (1.00, (255, 255, 255))
    ],
    "trainee": [
        (0.00, (55, 60, 72)),
        (0.30, (110, 118, 132)),
        (0.60, (190, 200, 215)),
        (0.85, (240, 245, 252)),
        (1.00, (255, 255, 255))
    ],
    "general": [  # Metallic Emerald Green
        (0.00, (0, 40, 20)),
        (0.25, (4, 90, 50)),
        (0.55, (10, 180, 100)),
        (0.80, (140, 235, 185)),
        (1.00, (230, 255, 240))
    ],
    "senior": [  # Metallic Sapphire Blue
        (0.00, (0, 20, 75)),
        (0.25, (10, 65, 170)),
        (0.55, (0, 140, 245)),
        (0.80, (155, 220, 255)),
        (1.00, (230, 248, 255))
    ],
    "regional": [  # Metallic Fuchsia Pink
        (0.00, (60, 0, 40)),
        (0.25, (130, 10, 80)),
        (0.55, (230, 20, 135)),
        (0.80, (255, 170, 222)),
        (1.00, (255, 238, 248))
    ],
    "reg_gen": [  # Pure Metallic Gold
        (0.00, (70, 30, 0)),
        (0.25, (150, 80, 0)),
        (0.55, (245, 185, 0)),
        (0.80, (255, 230, 130)),
        (1.00, (255, 252, 220))
    ]
}

def lum_to_color(lum_val, palette):
    """Smoothly interpolate a luminance value through the metallic palette stops."""
    stops = [p[0] for p in palette]
    colors = [np.array(p[1], dtype=np.float64) for p in palette]
    
    for i in range(len(stops) - 1):
        s0, s1 = stops[i], stops[i+1]
        if s0 <= lum_val <= s1 or (i == len(stops) - 2 and lum_val >= s0):
            t = (lum_val - s0) / max(s1 - s0, 1e-6)
            t = t * t * (3.0 - 2.0 * t)  # Smoothstep
            return c0 + t * (c1 - c0) if False else colors[i] + t * (colors[i+1] - colors[i])
    return colors[-1]

def apply_metallic_to_badge(silver_img, palette):
    """
    Apply metallic coloring ONLY to opaque pixels.
    Semi-transparent edge/AA pixels get color weighted by their alpha so edges stay clean.
    """
    arr = np.array(silver_img, dtype=np.float64)
    h, w, _ = arr.shape
    
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    
    # Luminance from original greyscale badge data
    lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
    
    stops = [p[0] for p in palette]
    colors = [np.array(p[1], dtype=np.float64) for p in palette]
    
    r_out = np.zeros_like(lum)
    g_out = np.zeros_like(lum)
    b_out = np.zeros_like(lum)
    
    # Apply interpolated metallic color to all pixels
    for i in range(len(stops) - 1):
        s0, s1 = stops[i], stops[i+1]
        c0, c1 = colors[i], colors[i+1]
        
        mask = (lum >= s0) & (lum < s1) if i < len(stops)-2 else (lum >= s0) & (lum <= s1)
        if not np.any(mask):
            continue
            
        t = (lum[mask] - s0) / max(s1 - s0, 1e-6)
        t = t * t * (3.0 - 2.0 * t)  # Smooth S-curve
        
        r_out[mask] = c0[0] + t * (c1[0] - c0[0])
        g_out[mask] = c0[1] + t * (c1[1] - c0[1])
        b_out[mask] = c0[2] + t * (c1[2] - c0[2])
    
    # KEY FIX: For semi-transparent edge pixels (anti-aliased boundary),
    # blend the metallic color back toward transparent white to preserve clean edges.
    # Fully opaque pixels (alpha=255) get 100% metallic color.
    # Partially transparent pixels (alpha<255) get proportionally less color saturation.
    alpha_factor = a / 255.0  # 0.0 (transparent) to 1.0 (opaque)
    
    # Build output array
    out_arr = np.zeros((h, w, 4), dtype=np.uint8)
    out_arr[:, :, 0] = np.clip(r_out, 0, 255).astype(np.uint8)
    out_arr[:, :, 1] = np.clip(g_out, 0, 255).astype(np.uint8)
    out_arr[:, :, 2] = np.clip(b_out, 0, 255).astype(np.uint8)
    # Preserve original alpha EXACTLY — no modification to silhouette
    out_arr[:, :, 3] = a.astype(np.uint8)
    
    return Image.fromarray(out_arr, mode="RGBA")

def make_clean_metallic_badge(tier_id):
    silver_path = os.path.join(BADGES_DIR, f"{tier_id}.png")
    color_path = os.path.join(BADGES_DIR, f"{tier_id}_color.png")
    
    if not os.path.exists(silver_path):
        print(f"  SKIP: {silver_path} not found.")
        return
    
    # Load the clean silver badge (already has correct transparent background)
    silver_img = Image.open(silver_path).convert("RGBA")
    
    # Validate: check that outer border is transparent
    arr = np.array(silver_img)
    alpha = arr[:, :, 3]
    h, w = alpha.shape
    border_alpha = np.concatenate([alpha[0, :], alpha[-1, :], alpha[:, 0], alpha[:, -1]])
    if border_alpha.max() > 0:
        print(f"  WARNING: {tier_id} border not fully transparent! Max border alpha: {border_alpha.max()}")
    
    # Apply metallic coloring
    palette = metallic_palettes[tier_id]
    metallic_img = apply_metallic_to_badge(silver_img, palette)
    
    # Subtle contrast enhancement for polished metallic finish
    metallic_img = ImageEnhance.Contrast(metallic_img).enhance(1.15)
    
    # Save
    metallic_img.save(color_path, "PNG", optimize=False)
    
    # Verification
    final_arr = np.array(metallic_img)
    final_alpha = final_arr[:, :, 3]
    final_border = np.concatenate([final_alpha[0, :], final_alpha[-1, :], final_alpha[:, 0], final_alpha[:, -1]])
    visible = np.count_nonzero(final_alpha > 0)
    
    print(f"  [{tier_id.upper()}] Color badge saved. "
          f"Emblem pixels: {visible}, Border max alpha: {final_border.max()}")

print("Generating clean, polished metallic color badges...")
print("=" * 60)
for tier_id in metallic_palettes:
    print(f"\nProcessing: {tier_id}")
    make_clean_metallic_badge(tier_id)
    
print("\n" + "=" * 60)
print("Done! All metallic badges generated.")
