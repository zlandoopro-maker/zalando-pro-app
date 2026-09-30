import sys
from PIL import Image

def swap_colors(img_path, out_path):
    img = Image.open(img_path).convert("RGBA")
    data = img.getdata()
    
    new_data = []
    
    # Find the "pure blue" color by finding the darkest opaque pixel
    min_sum = 255 * 3
    min_r, min_g, min_b = 255, 255, 255
    
    for r, g, b, a in data:
        if a > 240:
            current_sum = r + g + b
            if current_sum < min_sum:
                min_sum = current_sum
                min_r, min_g, min_b = r, g, b
                
    print(f"Detected base blue color as rgb({min_r}, {min_g}, {min_b})")
    
    for r, g, b, a in data:
        if a == 0:
            new_data.append((r, g, b, a))
        else:
            # Formula: P' = Blue + White - P
            r_new = int(min(255, max(0, min_r + 255 - r)))
            g_new = int(min(255, max(0, min_g + 255 - g)))
            b_new = int(min(255, max(0, min_b + 255 - b)))
            new_data.append((r_new, g_new, b_new, a))
            
    img.putdata(new_data)
    img.save(out_path)

if __name__ == "__main__":
    swap_colors(sys.argv[1], sys.argv[2])
