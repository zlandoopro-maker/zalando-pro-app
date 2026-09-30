import os

workspace = r"c:\Users\om shanti\Documents\ZalandoPro_App"

for root, dirs, files in os.walk(workspace):
    if "node_modules" in root or ".git" in root:
        continue
    for f in files:
        if f.endswith(".png") or f.endswith(".jpg"):
            print(os.path.join(root, f))
