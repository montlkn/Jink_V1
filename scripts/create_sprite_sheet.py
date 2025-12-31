#!/usr/bin/env python3
"""
Sprite Sheet Generator for Nolli Smoke Animation
Creates a horizontal sprite sheet from individual PNG frames.
"""

import os
from PIL import Image
import math

def create_sprite_sheet(input_dir, output_path, frames_per_row=10):
    """
    Create a sprite sheet from PNG frames.
    
    Args:
        input_dir: Directory containing PNG frames
        output_path: Output path for the sprite sheet
        frames_per_row: Number of frames per row (default: 10)
    """
    # Get all PNG files sorted by name
    png_files = sorted([f for f in os.listdir(input_dir) if f.endswith('.png')])
    
    if not png_files:
        print(f"No PNG files found in {input_dir}")
        return
    
    print(f"Found {len(png_files)} frames")
    
    # Load first image to get dimensions
    first_img = Image.open(os.path.join(input_dir, png_files[0]))
    frame_width, frame_height = first_img.size
    print(f"Frame size: {frame_width}x{frame_height}")
    
    # Calculate sprite sheet dimensions
    total_frames = len(png_files)
    rows = math.ceil(total_frames / frames_per_row)
    cols = min(frames_per_row, total_frames)
    
    sheet_width = frame_width * cols
    sheet_height = frame_height * rows
    
    print(f"Creating sprite sheet: {sheet_width}x{sheet_height} ({cols}x{rows} frames)")
    
    # Create blank sprite sheet with transparency
    sprite_sheet = Image.new('RGBA', (sheet_width, sheet_height), (0, 0, 0, 0))
    
    # Paste each frame into the sprite sheet
    for idx, png_file in enumerate(png_files):
        img = Image.open(os.path.join(input_dir, png_file))
        
        # Convert to RGBA if needed
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # Calculate position
        row = idx // frames_per_row
        col = idx % frames_per_row
        x = col * frame_width
        y = row * frame_height
        
        # Paste frame
        sprite_sheet.paste(img, (x, y))
        
        if (idx + 1) % 10 == 0 or idx == total_frames - 1:
            print(f"Processed {idx + 1}/{total_frames} frames")
    
    # Save sprite sheet
    sprite_sheet.save(output_path, 'PNG', optimize=True)
    print(f"\nSprite sheet saved to: {output_path}")
    print(f"Total frames: {total_frames}")
    print(f"Frame size: {frame_width}x{frame_height}")
    print(f"Grid: {cols} columns x {rows} rows")
    
    # Generate metadata for React Native usage
    metadata = {
        "totalFrames": total_frames,
        "frameWidth": frame_width,
        "frameHeight": frame_height,
        "columns": cols,
        "rows": rows,
        "framesPerRow": frames_per_row
    }
    
    return metadata

if __name__ == "__main__":
    # Configuration
    INPUT_DIR = "/Users/lucienmount/Downloads/nolli_smoke/pngs"
    OUTPUT_PATH = "/Users/lucienmount/Arch_App_V2/architecture-app/assets/textures/nolli_smoke_spritesheet.png"
    FRAMES_PER_ROW = 12  # Adjust based on your needs
    
    print("=== Nolli Smoke Sprite Sheet Generator ===\n")
    
    # Create output directory if it doesn't exist
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    
    # Generate sprite sheet
    metadata = create_sprite_sheet(INPUT_DIR, OUTPUT_PATH, FRAMES_PER_ROW)
    
    if metadata:
        print(f"\n=== Metadata for React Native ===")
        print(f"const SMOKE_ANIMATION = {{")
        print(f"  totalFrames: {metadata['totalFrames']},")
        print(f"  frameWidth: {metadata['frameWidth']},")
        print(f"  frameHeight: {metadata['frameHeight']},")
        print(f"  columns: {metadata['columns']},")
        print(f"  rows: {metadata['rows']},")
        print(f"}};")
