"""Add the reviewed 100-word expansion with derived art and US English audio.

Run with the bundled Python runtime that includes Pillow. Input images are kept
intact; crops and audio are reproducible outputs under dist/assets.
"""

from collections import defaultdict
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
DATA = DIST / "data.json"
CATALOG = ROOT / "tools/new_words_100.tsv"
ART = DIST / "assets/rebuilt/new100"
SHEETS = [ART / f"words-{i:02d}-grid-6x5-v1.png" for i in range(1, 5)]
READINGS = {
    "驢":"ㄌㄩˊ","駱":"ㄌㄨㄛˋ","駝":"ㄊㄨㄛˊ","豹":"ㄅㄠˋ",
    "蚯":"ㄑㄧㄡ","蚓":"ㄧㄣˇ","豆":"ㄉㄡˋ","油":"ㄧㄡˊ",
    "醬":"ㄐㄧㄤˋ","汁":"ㄓ","萵":"ㄨㄛ","苣":"ㄐㄩˋ",
    "李":"ㄌㄧˇ","梳":"ㄕㄨ","枕":"ㄓㄣˇ","毯":"ㄊㄢˇ",
    "盒":"ㄏㄜˊ","瓶":"ㄆㄧㄥˊ","籃":"ㄌㄢˊ","天":"ㄊㄧㄢ",
    "空":"ㄎㄨㄥ","池":"ㄔˊ","塘":"ㄊㄤˊ","六":"ㄌㄧㄡˋ",
    "七":"ㄑㄧ","八":"ㄅㄚ","浣":"ㄏㄨㄢˇ","獺":"ㄊㄚˇ",
    "鸚":"ㄧㄥ","鵡":"ㄨˇ","優":"ㄧㄡ","格":"ㄍㄜˊ",
    "麥":"ㄇㄞˋ","片":"ㄆㄧㄢˋ","鬆":"ㄙㄨㄥ","腸":"ㄔㄤˊ",
    "蝦":"ㄒㄧㄚ","菠":"ㄅㄛ","高":"ㄍㄠ","麗":"ㄌㄧˋ",
    "箱":"ㄒㄧㄤ","錢":"ㄑㄧㄢˊ","拉":"ㄌㄚ","鍊":"ㄌㄧㄢˋ",
    "梯":"ㄊㄧ","桶":"ㄊㄨㄥˇ","鏟":"ㄔㄢˇ","掃":"ㄙㄠˋ",
    "把":"ㄅㄚ˙","拖":"ㄊㄨㄛ","毛":"ㄇㄠˊ","巾":"ㄐㄧㄣ",
    "浴":"ㄩˋ","缸":"ㄍㄤ","壺":"ㄏㄨˊ","烤":"ㄎㄠˇ",
    "島":"ㄉㄠˇ","漠":"ㄇㄛˋ","洞":"ㄉㄨㄥˋ","穴":"ㄒㄩㄝˋ",
    "瀑":"ㄆㄨˋ","布":"ㄅㄨˋ","湖":"ㄏㄨˊ","泊":"ㄆㄛˊ",
    "九":"ㄐㄧㄡˇ","十":"ㄕˊ","吉":"ㄐㄧˊ","他":"ㄊㄚ",
    "號":"ㄏㄠˋ","笛":"ㄉㄧˊ","變":"ㄅㄧㄢˋ",
    "犰":"ㄑㄧㄡˊ","狳":"ㄩˊ","豪":"ㄏㄠˊ","獨":"ㄉㄨˊ",
    "蘆":"ㄌㄨˊ","筍":"ㄙㄨㄣˇ","榴":"ㄌㄧㄡˊ","餃":"ㄐㄧㄠˇ",
    "筒":"ㄊㄨㄥˇ","溫":"ㄨㄣ","度":"ㄉㄨˋ","訂":"ㄉㄧㄥˋ",
    "滑":"ㄏㄨㄚˊ","板":"ㄅㄢˇ","吸":"ㄒㄧ","塵":"ㄔㄣˊ",
    "信":"ㄒㄧㄣˋ","輪":"ㄌㄨㄣˊ","投":"ㄊㄡˊ","影":"ㄧㄥˇ",
    "間":"ㄐㄧㄢ","歇":"ㄒㄧㄝ","泉":"ㄑㄩㄢˊ","峽":"ㄒㄧㄚˊ",
    "谷":"ㄍㄨˇ","懸":"ㄒㄩㄢˊ","崖":"ㄧㄞˊ","沼":"ㄓㄠˇ",
    "澤":"ㄗㄜˊ","城":"ㄔㄥˊ","博":"ㄅㄛˊ","館":"ㄍㄨㄢˇ",
    "圖":"ㄊㄨˊ","店":"ㄉㄧㄢˋ","場":"ㄔㄤˇ",
}
WORD_READINGS = {
    "pillow": ["ㄓㄣˇ", "ㄊㄡ˙"],
    "broom": ["ㄙㄠˋ", "ㄅㄚ˙"],
    "mop": ["ㄊㄨㄛ", "ㄅㄚ˙"],
    "waffle": ["ㄍㄜˊ", "ㄗ˙", "ㄙㄨㄥ", "ㄅㄧㄥˇ"],
}

def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

words = json.loads(DATA.read_text())
original_ids = {item["id"] for item in words}
by_character = defaultdict(set)
for item in words:
    for char, reading in zip(item["zh"], item["zhuyin"]):
        by_character[char].add(reading)

entries = []
for line in CATALOG.read_text().splitlines():
    if not line.strip():
        continue
    en, zh, category, level, emoji = line.split("|")
    item_id = f"new-{en}"
    if item_id in original_ids:
        raise ValueError(f"Already imported: {item_id}")
    readings = WORD_READINGS.get(en)
    if readings is None:
        readings = []
        for char in zh:
            if char == "子":
                reading = "ㄗ˙"
            elif char in READINGS:
                reading = READINGS[char]
            elif len(by_character[char]) == 1:
                reading = next(iter(by_character[char]))
            else:
                raise ValueError(f"Ambiguous or missing Zhuyin: {en} {char} {by_character[char]}")
            readings.append(reading)
    if len(readings) != len(zh):
        raise ValueError(f"Zhuyin length: {en}")
    entries.append({
        "id": item_id, "category": category, "en": en, "zh": zh,
        "zhuyin": readings, "emoji": emoji, "difficulty": int(level),
        "levelSource": "curated-2026-09-30",
        "image": f"assets/rebuilt/new100/{item_id}.png",
    })

assert len(entries) == 100
assert [sum(item["difficulty"] == level for item in entries) for level in (1, 2, 3)] == [30, 40, 30]
ART.mkdir(parents=True, exist_ok=True)
manifest = {
    "layout": {"columns": 6, "rows": 5, "usedCells": [30, 30, 30, 10]},
    "sourceStyle": "Design Masters/Visual Style Master.png",
    "tool": "built-in imagegen; deterministic local Pillow crop",
    "sheets": [], "items": [],
}
for sheet_index, sheet_path in enumerate(SHEETS):
    image = Image.open(sheet_path).convert("RGB")
    width, height = image.size
    if width < 1200 or height < 800:
        raise ValueError(f"Sheet too small: {sheet_path}")
    manifest["sheets"].append({"file": sheet_path.name, "sha256": sha256(sheet_path)})
    for cell, item in enumerate(entries[sheet_index * 30:(sheet_index + 1) * 30]):
        column, row = cell % 6, cell // 6
        inset = 5
        bounds = (
            round(column * width / 6) + inset,
            round(row * height / 5) + inset,
            round((column + 1) * width / 6) - inset,
            round((row + 1) * height / 5) - inset,
        )
        target = DIST / item["image"]
        image.crop(bounds).save(target, optimize=True)
        manifest["items"].append({
            "id": item["id"], "en": item["en"], "sheet": sheet_index + 1,
            "cell": cell, "image": item["image"], "sha256": sha256(target),
            "status": "generated-candidate",
        })

with tempfile.TemporaryDirectory() as temp_dir:
    for item in entries:
        output = DIST / "assets/audio" / f"{item['id']}.mp3"
        source = Path(temp_dir) / "voice.aiff"
        subprocess.run(["say", "-v", "Samantha", "-o", str(source), item["en"]], check=True)
        subprocess.run([
            "ffmpeg", "-v", "error", "-y", "-i", str(source),
            "-codec:a", "libmp3lame", "-qscale:a", "5", str(output)
        ], check=True)

DATA.write_text(json.dumps(words + entries, ensure_ascii=False, indent=2) + "\n")
(ART / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
print(f"Added {len(entries)} words: {len(words)} → {len(words) + len(entries)}")
