"""Map two 6x5 generated grids to the 56 existing kidsapp image words.

The generated sheets stay intact for review. This deterministic cropper replaces
only data.json image references; the original kidsapp files remain for rollback.
"""

import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "dist/data.json"
OUTPUT = ROOT / "dist/assets/rebuilt"
MANIFEST = OUTPUT / "manifest.json"
SHEETS = ("dinosaurs-grid-6x5-v1.png", "mixed-grid-6x5-v1.png")
COLS, ROWS = 6, 5


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


words = json.loads(DATA.read_text())
by_id = {word["id"]: word for word in words}
if MANIFEST.exists():
    manifest = json.loads(MANIFEST.read_text())
else:
    originals = [word for word in words if word.get("image", "").startswith("assets/kidsapp/")]
    dinosaurs = sorted((word for word in originals if word["category"] == "dinosaur"),
                       key=lambda word: word["en"])
    others = sorted((word for word in originals if word["category"] != "dinosaur"),
                    key=lambda word: (word["category"], word["en"]))
    assert len(dinosaurs) == 35 and len(others) == 21, "Unexpected source inventory"
    groups = (dinosaurs[:30], dinosaurs[30:] + others)
    manifest = {
        "layout": {"columns": COLS, "rows": ROWS, "usedCells": [30, 26]},
        "sourceStyle": "Design Masters/Visual Style Master.png",
        "tool": "built-in imagegen; deterministic local Pillow crop",
        "sheets": [],
        "items": [],
    }
    for sheet_index, group in enumerate(groups):
        path = OUTPUT / SHEETS[sheet_index]
        manifest["sheets"].append({"file": SHEETS[sheet_index], "sha256": sha256(path)})
        for cell, word in enumerate(group):
            manifest["items"].append({
                "id": word["id"], "en": word["en"], "zh": word["zh"],
                "category": word["category"], "oldImage": word["image"],
                "sheet": sheet_index, "cell": cell,
                "newImage": f"assets/rebuilt/{word['id']}.png",
                "status": "generated-candidate",
            })

assert len(manifest["items"]) == 56
assert len({item["id"] for item in manifest["items"]}) == 56
for sheet_index, name in enumerate(SHEETS):
    image = Image.open(OUTPUT / name).convert("RGB")
    width, height = image.size
    assert width >= 1200 and height >= 800, f"Sheet too small: {name}"
    items = [item for item in manifest["items"] if item["sheet"] == sheet_index]
    for item in items:
        cell = item["cell"]
        column, row = cell % COLS, cell // COLS
        # 3px inset removes the grid stroke without scaling the illustration.
        bounds = (round(column * width / COLS) + 3,
                  round(row * height / ROWS) + 3,
                  round((column + 1) * width / COLS) - 3,
                  round((row + 1) * height / ROWS) - 3)
        cropped = image.crop(bounds)
        colored = sum(1 for r, g, b in cropped.get_flattened_data()
                      if max(r, g, b) - min(r, g, b) > 38)
        assert colored > cropped.width * cropped.height * .025, f"Possibly blank: {item['id']}"
        target = ROOT / "dist" / item["newImage"]
        cropped.save(target, optimize=True)
        item["sha256"] = sha256(target)
        assert item["id"] in by_id
        by_id[item["id"]]["image"] = item["newImage"]

for word in words:
    assert not word.get("image", "").startswith("assets/kidsapp/"), word["id"]
DATA.write_text(json.dumps(words, ensure_ascii=False, indent=2) + "\n")
MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
print(f"Replaced {len(manifest['items'])} image references from two 6x5 sheets")
