import cv2
import numpy as np

img = cv2.imread('public/daily_task_ref_empty.png')
if img is not None:
    # Just grab a patch from the top of the first yellow box
    # Slot 1: left 12.24%, top 49.09%
    h, w = img.shape[:2]
    x = int(0.1224 * w)
    y = int(0.4909 * h)
    
    # Grab a small 10x10 patch slightly inside to avoid borders
    patch = img[y+5:y+15, x+5:x+15]
    avg_color_per_row = np.average(patch, axis=0)
    avg_color = np.average(avg_color_per_row, axis=0)
    
    # BGR to RGB
    r, g, b = int(avg_color[2]), int(avg_color[1]), int(avg_color[0])
    hex_color = "#{:02x}{:02x}{:02x}".format(r, g, b)
    print(f"Color for daily_task_ref_empty: {hex_color}")

img2 = cv2.imread('public/app_screenshot_no_products.png.bak')
if img2 is not None:
    h, w = img2.shape[:2]
    x = int(0.1224 * w)
    y = int(0.4909 * h)
    
    patch = img2[y+5:y+15, x+5:x+15]
    avg_color_per_row = np.average(patch, axis=0)
    avg_color = np.average(avg_color_per_row, axis=0)
    r, g, b = int(avg_color[2]), int(avg_color[1]), int(avg_color[0])
    hex_color = "#{:02x}{:02x}{:02x}".format(r, g, b)
    print(f"Color for backup: {hex_color}")
