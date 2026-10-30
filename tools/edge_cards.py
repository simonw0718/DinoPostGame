#!/usr/bin/env python3
"""Word pictures -> one look: background removed, fixed white edge, same canvas size (導演 2026-10-30).

Reuses the production project's tools instead of new code:
  cut-out  : 恐龍郵局 tools/card_stage/toonout_cutout.py (ToonOut + PyMatting, own venv)
  white edge: 恐龍郵局 tools/video/card_edge.py add_edge
Sources stay untouched; output dist/assets/cards-edge/<id>.webp and data.json `image` points there.
manifest.json keeps id -> original source (image path or sheet cell), so reruns read the originals.

  python3 tools/edge_cards.py run [--ids a,b] [--force]   # cut out + edge (only missing unless --force)
  python3 tools/edge_cards.py sheet OUT.png                # contact sheet for review
"""
import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / 'dist'
DATA = DIST / 'data.json'
OUT = DIST / 'assets/cards-edge'
MANIFEST = OUT / 'manifest.json'
PROD = Path.home() / 'Developer/恐龍郵局｜整體工作流處理'
sys.path.insert(0, str(PROD / 'tools/video'))
sys.path.insert(0, str(PROD / 'tools/card_stage'))
from card_edge import add_edge  # noqa: E402
import toonout_cutout as T  # noqa: E402  (pure helpers only; the model runs in its own venv)

CANVAS = 320      # every card is CANVAS x CANVAS
EDGE = 7          # white edge px at CANVAS size
MARGIN = 6        # transparent gap outside the edge
MIN_SRC = 512     # upscale small sources before cut-out so the matte edge is smooth
SHEET_COLS, SHEET_ROWS = 5, 2


def is_number(w):
    return w.get('topic') == 'number'


def source_of(w, manifest):
    if w['id'] in manifest:
        return manifest[w['id']]
    if w.get('image') and not w['image'].startswith('assets/cards-edge/'):
        return {'image': w['image']}
    if w.get('sheet') and isinstance(w.get('cell'), int):
        return {'sheet': w['sheet'], 'cell': w['cell']}
    return None


def load_source(src):
    if 'image' in src:
        im = Image.open(DIST / src['image'])
    else:
        sh = Image.open(DIST / f"assets/{src['sheet']}-grid-v1.jpg")
        cw, ch = sh.width // SHEET_COLS, sh.height // SHEET_ROWS
        c, r = src['cell'] % SHEET_COLS, src['cell'] // SHEET_COLS
        im = sh.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))
    if im.mode == 'RGBA':  # already transparent: flatten on the cream it was drawn for, cut out again
        bg = Image.new('RGBA', im.size, (254, 252, 245, 255)); bg.alpha_composite(im); im = bg
    im = im.convert('RGB')
    k = MIN_SRC / max(im.size)
    return im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS) if k > 1 else im


def finish(rgba):
    box = rgba.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    rgba = rgba.crop(box)
    inner = CANVAS - 2 * (EDGE + MARGIN)
    k = inner / max(rgba.size)
    rgba = rgba.resize((max(1, round(rgba.width * k)), max(1, round(rgba.height * k))), Image.LANCZOS)
    edged, _ = add_edge(rgba, EDGE)
    out = Image.new('RGBA', (CANVAS, CANVAS), (255, 255, 255, 0))
    out.alpha_composite(edged, ((CANVAS - edged.width) // 2, (CANVAS - edged.height) // 2))
    return out


def run(args):
    if T.env_missing():
        raise SystemExit(T.setup_hint())
    words = json.loads(DATA.read_text(encoding='utf-8'))
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8')) if MANIFEST.exists() else {}
    only = set(args.ids.split(',')) if args.ids else None
    todo = []
    for w in words:
        if is_number(w) or (only and w['id'] not in only):
            continue
        src = source_of(w, manifest)
        if not src:
            continue
        manifest[w['id']] = src
        if args.force or not (OUT / f"{w['id']}.webp").exists():
            todo.append(w['id'])
    OUT.mkdir(parents=True, exist_ok=True)
    print(f'{len(todo)} to cut out')
    with tempfile.TemporaryDirectory() as tmp:
        pairs = []
        for i in todo:
            load_source(manifest[i]).save(f'{tmp}/{i}.png')
            pairs += [f'{tmp}/{i}.png', f'{tmp}/{i}_cut.png']
        for k in range(0, len(pairs), 80):  # chunks keep one failure from losing everything
            r = subprocess.run([str(T.VENV_PY), str(PROD / 'tools/card_stage/toonout_cutout.py'), *pairs[k:k + 80]],
                               capture_output=True, text=True)
            if r.returncode:
                raise SystemExit('toonout failed:\n' + (r.stderr or r.stdout)[-2000:])
            print(f'cut {min(k + 80, len(pairs)) // 2}/{len(todo)}', flush=True)
        for i in todo:
            finish(Image.open(f'{tmp}/{i}_cut.png')).save(OUT / f'{i}.webp', quality=88, method=6)
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    for w in words:
        if w['id'] in manifest and (OUT / f"{w['id']}.webp").exists():
            w['image'] = f"assets/cards-edge/{w['id']}.webp"
    DATA.write_text(json.dumps(words, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('done', len(todo))


def sheet(args):
    ids = sorted(p.stem for p in OUT.glob('*.webp'))
    T_, cols = 128, 16
    rows = (len(ids) + cols - 1) // cols
    m = Image.new('RGB', (cols * T_, rows * (T_ + 14)), (96, 150, 205))
    from PIL import ImageDraw
    d = ImageDraw.Draw(m)
    for n, i in enumerate(ids):
        im = Image.open(OUT / f'{i}.webp').resize((T_, T_), Image.LANCZOS)
        x, y = (n % cols) * T_, (n // cols) * (T_ + 14)
        m.paste(im, (x, y), im)
        d.text((x + 2, y + T_), i[:20], fill=(255, 255, 255))
    m.save(args.out)
    print(args.out, len(ids))


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    sp = ap.add_subparsers(dest='cmd', required=True)
    a = sp.add_parser('run'); a.add_argument('--ids'); a.add_argument('--force', action='store_true')
    b = sp.add_parser('sheet'); b.add_argument('out')
    args = ap.parse_args()
    {'run': run, 'sheet': sheet}[args.cmd](args)
