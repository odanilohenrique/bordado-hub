import os
import random
from math import floor
from PIL import Image, ImageOps, ImageDraw, ImageFilter

def create_collage(image_folder, output_path, canvas_size=(3840, 2160), background_color=(255, 255, 255)):
    """
    Creates a collage of images from a folder with random sizes, rotations, and positions.
    """
    print(f"Searching for images in: {image_folder}")
    
    # Supported extensions
    valid_extensions = ('.jpg', '.jpeg', '.png', '.bmp', '.gif')
    image_files = [f for f in os.listdir(image_folder) if f.lower().endswith(valid_extensions)]
    
    if not image_files:
        print("No images found!")
        return

    print(f"Found {len(image_files)} images.")

    # Create canvas
    canvas = Image.new('RGB', canvas_size, background_color)
    
    # Parameters for "messy" look
    min_width = 400
    max_width = 800
    rotation_range = 25  # degrees +/-
    
    # Shuffle to randomize layering
    random.shuffle(image_files)

    for i, filename in enumerate(image_files):
        img_path = os.path.join(image_folder, filename)
        try:
            with Image.open(img_path) as img:
                # Convert to RGB if necessary
                if img.mode != 'RGB':
                    img = img.convert('RGB')

                # Calculate resize
                aspect_ratio = img.height / img.width
                new_width = random.randint(min_width, max_width)
                new_height = int(new_width * aspect_ratio)
                
                # Resize
                img_resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                
                # Add a border (polaroid style) or just shadow?
                # Let's add a white border and a simple drop shadow for depth
                border_width = 20
                img_with_border = ImageOps.expand(img_resized, border=border_width, fill='white')
                
                # Create rotation
                angle = random.uniform(-rotation_range, rotation_range)
                # Expand=True changes the size to fit the rotated image
                img_rotated = img_with_border.rotate(angle, expand=True, resample=Image.Resampling.BICUBIC, fillcolor=background_color)
                
                # Make transparent mask for rotation (remove black corners if any, though fillcolor helps)
                # Actually, putting a rotated rect onto the canvas:
                # We need an RGBA version to handle transparency of the rotated corners if we want them transparent
                # But our canvas is RGB white. `fillcolor` handles the corners matching background.
                # However, overlapping images might look weird if corners are opaque white.
                
                # Let's switch to RGBA for processing
                img_rgba = img_with_border.convert("RGBA")
                
                # Rotate with transparency
                img_rotated = img_rgba.rotate(angle, expand=True, resample=Image.Resampling.BICUBIC)
                
                # Random position
                # Allow some "overflow" off canvas for a seamless look, or keep strictly inside?
                # "Bagunçada" allows cutting off edges maybe? 
                # Let's keep centers within the canvas
                
                w, h = img_rotated.size
                max_x = canvas_size[0] - w // 2
                max_y = canvas_size[1] - h // 2
                
                x = random.randint(-w // 4, canvas_size[0] - w * 3 // 4)
                y = random.randint(-h // 4, canvas_size[1] - h * 3 // 4)
                
                # Paste
                # We need to paste with mask
                canvas.paste(img_rotated, (x, y), img_rotated)
                
                print(f"[{i+1}/{len(image_files)}] Processed {filename}")

        except Exception as e:
            print(f"Error processing {filename}: {e}")

    # Save
    print(f"Saving collage to {output_path}...")
    canvas.save(output_path, quality=95)
    print("Done!")

if __name__ == "__main__":
    SOURCE_FOLDER = r"C:\APPS\BordadoHUB\Colagem"
    OUTPUT_FILE = r"C:\APPS\BordadoHUB\Colagem\collage_output_highres.jpg"
    create_collage(SOURCE_FOLDER, OUTPUT_FILE)
