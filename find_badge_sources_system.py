import os

search_paths = [
    r"c:\Users\om shanti\Documents\ZalandoPro_App",
    r"c:\Users\om shanti\.gemini",
    r"c:\Users\om shanti\Downloads",
    r"c:\Users\om shanti\Desktop"
]

for base in search_paths:
    if os.path.exists(base):
        for root, dirs, files in os.walk(base):
            for f in files:
                if f in ["general.png", "senior.png", "regional.png", "reg_gen.png", "trainee.png", "starter.png"]:
                    full_p = os.path.join(root, f)
                    print(f"Found: {full_p}, size: {os.path.getsize(full_p)} bytes")
