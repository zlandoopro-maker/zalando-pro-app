import os

from pathlib import Path

search_paths = [
    str(Path(__file__).parent)
]

for base in search_paths:
    if os.path.exists(base):
        for root, dirs, files in os.walk(base):
            for f in files:
                if f in ["general.png", "senior.png", "regional.png", "reg_gen.png", "trainee.png", "starter.png"]:
                    full_p = os.path.join(root, f)
                    print(f"Found: {full_p}, size: {os.path.getsize(full_p)} bytes")
