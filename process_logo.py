import sys
from PIL import Image

def process_logo(input_path, output_path):
    # Open the image
    img = Image.open(input_path).convert("RGBA")
    
    # Get bounding box of non-white pixels to crop
    bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
    diff = Image.new("RGBA", img.size)
    
    # We will do a flood fill from the top-left corner (assuming it's white)
    # to find the transparent area
    # But wait, floodfill is in ImageDraw. Let's do it manually with a mask.
    
    # Simple bounding box:
    # Find all pixels that are not close to white
    pixels = img.load()
    width, height = img.size
    
    min_x, min_y, max_x, max_y = width, height, 0, 0
    
    # A pixel is "not white" if it's significantly different from 255,255,255
    threshold = 240
    
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if r < threshold or g < threshold or b < threshold:
                if x < min_x: min_x = x
                if y < min_y: min_y = y
                if x > max_x: max_x = x
                if y > max_y: max_y = y
                
    # Add a small padding (e.g., 5%)
    pad = int(max(max_x - min_x, max_y - min_y) * 0.05)
    min_x = max(0, min_x - pad)
    min_y = max(0, min_y - pad)
    max_x = min(width - 1, max_x + pad)
    max_y = min(height - 1, max_y + pad)
    
    cropped = img.crop((min_x, min_y, max_x, max_y))
    
    # Now let's try to make the exterior white pixels transparent using BFS
    c_width, c_height = cropped.size
    c_pixels = cropped.load()
    
    visited = set()
    queue = []
    
    # Add borders to queue
    for x in range(c_width):
        queue.append((x, 0))
        queue.append((x, c_height - 1))
    for y in range(c_height):
        queue.append((0, y))
        queue.append((c_width - 1, y))
        
    while queue:
        x, y = queue.pop(0)
        if (x, y) in visited:
            continue
            
        # Check bounds
        if x < 0 or x >= c_width or y < 0 or y >= c_height:
            continue
            
        visited.add((x, y))
        
        r, g, b, a = c_pixels[x, y]
        # If it's a white-ish pixel
        if r > threshold and g > threshold and b > threshold and a > 0:
            # Make it transparent
            c_pixels[x, y] = (255, 255, 255, 0)
            
            # Add neighbors
            queue.append((x+1, y))
            queue.append((x-1, y))
            queue.append((x, y+1))
            queue.append((x, y-1))

    # To fix anti-aliasing artifacts around the edges, we can do a pass to 
    # adjust alpha based on "whiteness" for boundary pixels.
    # But a simple flood fill might be enough for this flat design.
    
    # Make it a square to be safe for icons
    final_size = max(c_width, c_height)
    square_img = Image.new("RGBA", (final_size, final_size), (255, 255, 255, 0))
    offset = ((final_size - c_width) // 2, (final_size - c_height) // 2)
    square_img.paste(cropped, offset)
    
    square_img.save(output_path)
    print(f"Saved processed logo to {output_path} (size {final_size}x{final_size})")

if __name__ == "__main__":
    process_logo(sys.argv[1], sys.argv[2])
