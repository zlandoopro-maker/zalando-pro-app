import os
import numpy as np
from PIL import Image
from scipy.ndimage import label, binary_fill_holes, binary_dilation

BADGES_DIR = r"c:\Users\om shanti\Documents\ZalandoPro_App\public\badges"

for filename in ["starter.png", "trainee.png", "general.png", "senior.png", "regional.png", "reg_gen.png"]:
    filepath = os.path.join(BADGES_DIR, filename)
    if not os.path.exists(filepath):
        continue
        
    img = Image.open(filepath).convert("RGBA")
    arr = np.array(img)
    alpha = arr[:, :, 3]
    binary_mask = alpha > 20
    
    # Label connected components
    labeled, num_features = label(binary_mask)
    print(f"=== {filename} ===")
    print(f"Found {num_features} connected components.")
    
    # Find sizes of components
    sizes = [np.sum(labeled == i) for i in range(1, num_features + 1)]
    print(f"Component sizes: {sizes}")
    
    # Print components that are NOT the main component
    main_component_id = np.argmax(sizes) + 1
    print(f"Main emblem component ID: {main_component_id} with size {sizes[main_component_id - 1]}")
