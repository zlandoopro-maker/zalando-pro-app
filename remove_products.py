import cv2
import numpy as np

# Load the background image
img_path = "public/app_screenshot_no_products.png"
img = cv2.imread(img_path)

if img is None:
    print("Could not load image.")
    exit()

print(f"Image shape: {img.shape}")

# The slots are at:
# left: 12.24%, top: 49.09%, width: 23.37%, height: 9.88%
# left: 38.53%, top: 49.09%, width: 23.23%, height: 9.88%
# left: 64.67%, top: 49.09%, width: 23.09%, height: 9.88%

h, w = img.shape[:2]
slots = [
    {"left": 0.1224, "top": 0.4909, "width": 0.2337, "height": 0.0988},
    {"left": 0.3853, "top": 0.4909, "width": 0.2323, "height": 0.0988},
    {"left": 0.6467, "top": 0.4909, "width": 0.2309, "height": 0.0988}
]

# Create a clean version
out_img = img.copy()

# The yellow boxes have a gradient. Let's find a clean yellow patch in the box 
# and use it to overwrite the product. Or just use cv2.inpaint.
# Let's see if we can find the yellow color.
# Actually, the yellow boxes might have a very simple gradient.
# Let's grab the top part of the yellow box which might be clean.
for i, slot in enumerate(slots):
    x = int(slot['left'] * w)
    y = int(slot['top'] * h)
    sw = int(slot['width'] * w)
    sh = int(slot['height'] * h)
    
    print(f"Slot {i+1}: x={x}, y={y}, w={sw}, h={sh}")
    
    # Let's create a mask for the product
    # The product is mostly not yellow. We can create a mask of non-yellow pixels
    # in the slot region and inpaint them.
    roi = out_img[y:y+sh, x:x+sw]
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    
    # Yellow range in HSV
    lower_yellow = np.array([15, 100, 100])
    upper_yellow = np.array([45, 255, 255])
    yellow_mask = cv2.inRange(hsv, lower_yellow, upper_yellow)
    
    # The product is the non-yellow part
    product_mask = cv2.bitwise_not(yellow_mask)
    
    # Dilate the product mask a bit to cover edges
    kernel = np.ones((5,5), np.uint8)
    product_mask = cv2.dilate(product_mask, kernel, iterations=2)
    
    # Inpaint
    cleaned_roi = cv2.inpaint(roi, product_mask, 3, cv2.INPAINT_TELEA)
    out_img[y:y+sh, x:x+sw] = cleaned_roi

cv2.imwrite("public/app_screenshot_no_products_clean.png", out_img)
print("Saved cleaned image to public/app_screenshot_no_products_clean.png")
