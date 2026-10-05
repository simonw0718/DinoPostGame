"""Extract the eight approved word-card candidates from the Design Master grid.

The source is an opaque cream 4x2 presentation image. Each dinosaur extends
past its nominal column, so the bounds and overlap exclusions are deliberate.
Bottom-row subjects are mirrored to face right before saving.
"""

from pathlib import Path
from collections import deque

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art-source/rebuilt/dinosaurs-8-design-master-grid-v2.png"
TARGET = ROOT / "dist/assets/rebuilt"
SIZE = 512
BACKGROUND = np.array([254.0, 251.0, 241.0], dtype=np.float32)

# name, source rectangle, overlap exclusion (local x threshold, local y split), mirror
SPECS = [
    ("deinonychus", (10, 110, 535, 440), (490, 120, "keep_lower_left"), False),
    ("iguanodon", (465, 110, 940, 440), (65, 120, "keep_upper_right"), False),
    ("therizinosaurus", (925, 45, 1370, 440), (425, 150, "keep_lower_left"), False),
    ("troodon", (1340, 150, 1765, 440), (30, 50, "keep_upper_right"), False),
    ("edmontosaurus", (10, 530, 590, 830), (490, 100, "keep_lower_left"), True),
    ("mamenchisaurus", (495, 440, 980, 830), (90, 190, "keep_upper_right"), True),
    ("allosaurus", (870, 505, 1410, 830), (475, 145, "keep_lower_left"), True),
    ("corythosaurus", (1340, 505, 1765, 830), (65, 145, "keep_upper_right"), True),
]


def keep_largest_subject(alpha: np.ndarray) -> np.ndarray:
    """Discard disconnected pieces of neighboring dinosaurs inside wide crops."""
    active = alpha > 0.12
    visited = np.zeros(active.shape, dtype=bool)
    height, width = active.shape
    largest: list[tuple[int, int]] = []
    for row, column in zip(*np.nonzero(active & ~visited)):
        row, column = int(row), int(column)
        if visited[row, column]:
            continue
        queue = deque([(row, column)])
        visited[row, column] = True
        component = []
        while queue:
            y, x = queue.popleft()
            component.append((y, x))
            for ny in (y - 1, y, y + 1):
                for nx in (x - 1, x, x + 1):
                    if 0 <= ny < height and 0 <= nx < width and active[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        queue.append((ny, nx))
        if len(component) > len(largest):
            largest = component
    subject = np.zeros(active.shape, dtype=bool)
    if largest:
        rows, columns = zip(*largest)
        subject[rows, columns] = True
    return subject


def extract(source: Image.Image, name: str, box: tuple, exclusion: tuple, mirror: bool) -> Image.Image:
    rgb = np.asarray(source.crop(box).convert("RGB"), dtype=np.float32)
    distance = np.linalg.norm(rgb - BACKGROUND, axis=2)
    alpha = np.clip((distance - 5.0) / 17.0, 0.0, 1.0)

    x_split, y_split, rule = exclusion
    yy, xx = np.indices(alpha.shape)
    if rule == "keep_lower_left":
        alpha[(xx >= x_split) & (yy < y_split)] = 0
    else:
        alpha[(xx < x_split) & (yy >= y_split)] = 0
    alpha[~keep_largest_subject(alpha)] = 0

    # Undo the cream matte at anti-aliased edges to avoid pale halos on cards.
    safe_alpha = np.maximum(alpha, 0.1)
    foreground = BACKGROUND + (rgb - BACKGROUND) / safe_alpha[..., None]
    rgba = np.dstack((np.clip(foreground, 0, 255), alpha * 255)).astype("uint8")
    cutout = Image.fromarray(rgba, "RGBA")
    bounds = cutout.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError(f"No visible pixels extracted for {name}")
    cutout = cutout.crop(bounds)
    if mirror:
        cutout = cutout.transpose(Image.Transpose.FLIP_LEFT_RIGHT)

    scale = min((SIZE - 32) / cutout.width, (SIZE - 32) / cutout.height)
    fitted = cutout.resize((round(cutout.width * scale), round(cutout.height * scale)), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (SIZE, SIZE))
    canvas.alpha_composite(fitted, ((SIZE - fitted.width) // 2, (SIZE - fitted.height) // 2))
    return canvas


def main() -> None:
    source = Image.open(SOURCE)
    if source.size != (1774, 887):
        raise ValueError(f"Unexpected grid size: {source.size}")
    for name, box, exclusion, mirror in SPECS:
        output = TARGET / f"kidapp-{name}.png"
        extract(source, name, box, exclusion, mirror).save(output, optimize=True)
        print(output.relative_to(ROOT))


if __name__ == "__main__":
    main()
