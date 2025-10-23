from PIL import Image, ImageDraw, ImageFilter
import random

SIZE = 2048
ROWS = 8
COLS = 8
FRAMES = ROWS * COLS
FRAME_SIZE = SIZE // COLS


def create_frame(seed: int) -> Image.Image:
    random.seed(seed)
    img = Image.new("L", (FRAME_SIZE, FRAME_SIZE), 0)
    draw = ImageDraw.Draw(img)

    blob_count = random.randint(5, 9)
    for _ in range(blob_count):
        radius = FRAME_SIZE * random.uniform(0.18, 0.55)
        jitter = FRAME_SIZE * 0.18
        cx = FRAME_SIZE / 2 + random.uniform(-jitter, jitter)
        cy = FRAME_SIZE / 2 + random.uniform(-jitter, jitter)
        alpha = int(random.uniform(120, 255))
        draw.ellipse(
            [
                cx - radius,
                cy - radius,
                cx + radius,
                cy + radius,
            ],
            fill=alpha,
        )

    # Add a few wispy strokes
    for _ in range(random.randint(2, 4)):
        radius = FRAME_SIZE * random.uniform(0.25, 0.5)
        cx = FRAME_SIZE / 2 + random.uniform(-FRAME_SIZE * 0.1, FRAME_SIZE * 0.1)
        cy = FRAME_SIZE / 2 + random.uniform(-FRAME_SIZE * 0.1, FRAME_SIZE * 0.1)
        alpha = int(random.uniform(80, 150))
        draw.ellipse(
            [
                cx - radius * random.uniform(0.6, 1.2),
                cy - radius * random.uniform(0.4, 1.0),
                cx + radius * random.uniform(0.6, 1.2),
                cy + radius * random.uniform(0.4, 1.0),
            ],
            fill=alpha,
        )

    img = img.filter(ImageFilter.GaussianBlur(radius=FRAME_SIZE * 0.28))

    # Feather edges further with radial gradient
    gradient = Image.new("L", (FRAME_SIZE, FRAME_SIZE), 0)
    g_draw = ImageDraw.Draw(gradient)
    g_draw.ellipse(
        [
            FRAME_SIZE * 0.05,
            FRAME_SIZE * 0.05,
            FRAME_SIZE * 0.95,
            FRAME_SIZE * 0.95,
        ],
        fill=255,
    )
    gradient = gradient.filter(ImageFilter.GaussianBlur(radius=FRAME_SIZE * 0.2))
    img = Image.composite(img, Image.new("L", (FRAME_SIZE, FRAME_SIZE), 0), gradient)

    return img


def main():
    atlas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))

    for index in range(FRAMES):
        row = index // COLS
        col = index % COLS
        frame = create_frame(index)
        frame_rgba = Image.merge("RGBA", (frame, frame, frame, frame))
        atlas.paste(frame_rgba, (col * FRAME_SIZE, row * FRAME_SIZE), frame_rgba)

    atlas.save("assets/textures/smoke_atlas.png", optimize=True)
    print("Generated atlas", atlas.size)


if __name__ == "__main__":
    main()
