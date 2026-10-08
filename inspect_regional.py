from pathlib import Path
import numpy as np
from PIL import Image

p = str(Path(__file__).parent / "public" / "badges" / "regional.png")
img = Image.open(p).convert("RGBA")
arr = np.array(img)

h, w, _ = arr.shape
alpha = arr[:, :, 3]

print(f"Regional.png size: {w}x{h}")
print("ASCII Representation of Non-transparent pixels ('#' = alpha>100, '.' = alpha>0, ' ' = transparent):")

for y in range(0, h, 2):
    line = ""
    for x in range(0, w, 2):
        a = alpha[y, x]
        if a > 100:
            line += "#"
        elif a > 0:
            line += "."
        else:
            line += " "
    print(f"{y:03d}: {line}")
