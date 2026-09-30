import os
from PIL import Image

def generate_icons():
    logo_path = 'public/logo.png'
    icons_dir = 'public/icons'
    
    if not os.path.exists(icons_dir):
        os.makedirs(icons_dir)
        
    img = Image.open(logo_path).convert("RGBA")
    
    sizes = [48, 72, 96, 128, 192, 256, 512]
    for size in sizes:
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        # The manifest says icon-{size}.webp but the type is image/png
        # Let's save as both or just replace the webp with png bytes
        resized.save(os.path.join(icons_dir, f'icon-{size}.webp'), format='WEBP')
        print(f"Generated icon-{size}.webp")

if __name__ == '__main__':
    generate_icons()
