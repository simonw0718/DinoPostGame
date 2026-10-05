#!/usr/bin/env python3
"""Re-crop word pictures from generated grid sheets using the drawn grid lines.

The first crops cut each sheet into equal cells, but generated grid lines are not evenly
spaced, so crops included grid lines and slivers of neighbouring pictures. This tool:
1. finds the tan grid lines in each sheet,
2. takes the area inside the lines of each cell,
3. drops edge-touching fragments that spill over from neighbours,
4. trims to the picture and pads it to a centred square on the sheet background.

Needs only ffmpeg (no Pillow/numpy). Usage:
  python3 tools/recrop_grid_sheets.py dist/assets/rebuilt/emoji-6x8-v1/manifest.json [--preview DIR]
The manifest needs sheetDir, layout.columns/rows, sheets[].file and per item: sheet index,
row/column (1-based) or cell (0-based, row-major), and image or newImage. Items cropped from a
separate replacementSheet are skipped (see crop_dinosaur_grid.py). Item sha256 values are rewritten.
"""
import argparse
import hashlib
import json
import subprocess
from collections import deque
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / 'dist'
LINE_COLOR = (229, 208, 173)
INSET = 4          # px kept clear of the grid line on each side
PAD = 0.07         # padding around the trimmed picture, as a share of its larger side
FG_DIST = 34       # colour distance from background that counts as picture
FRAGMENT_SHARE = 0.18


def read_rgb(path):
    out = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                         check=True, capture_output=True).stdout
    return out


def write_png(path, data, w, h):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{w}x{h}',
                    '-i', '-', '-frames:v', '1', str(path)], input=bytes(data), check=True)


def image_size(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
                          '-of', 'csv=p=0', str(path)], check=True, capture_output=True, text=True).stdout
    w, h = out.strip().split(',')
    return int(w), int(h)


def is_line(r, g, b):
    # Tan grid lines and the paler tan card outlines some sheets draw around each cell.
    return abs(r - LINE_COLOR[0]) < 26 and abs(g - LINE_COLOR[1]) < 30 and abs(b - LINE_COLOR[2]) < 45 and r - b > 18


def find_lines(data, w, h, axis, count):
    """Return count+1 boundaries (including outer edges) along x (axis='x') or y."""
    length, span = (w, h) if axis == 'x' else (h, w)
    score = []
    for i in range(length):
        hits = 0
        for j in range(0, span, 2):
            x, y = (i, j) if axis == 'x' else (j, i)
            k = (y * w + x) * 3
            if is_line(data[k], data[k + 1], data[k + 2]):
                hits += 1
        score.append(hits / (span / 2))
    peaks = [i for i in range(1, length - 1) if score[i] >= 0.06 and score[i] >= score[i - 1] and score[i] >= score[i + 1]]
    near = lambda lo, hi: [i for i in peaks if lo <= i <= hi]
    step = length / count
    edge = near(0, int(step * .15))
    bounds = [max(edge, key=lambda i: score[i]) if edge else 0]
    # Walk cell by cell: generated grids are uneven, so expect the next line one average gap later.
    for n in range(1, count + 1):
        gaps = [bounds[k + 1] - bounds[k] for k in range(len(bounds) - 1)]
        gap = sum(gaps) / len(gaps) if gaps else step
        lo, hi = bounds[-1] + int(gap * .7), bounds[-1] + int(gap * 1.4)
        cand = near(lo, min(hi, length - 1))
        if cand:
            best = max(cand, key=lambda i: score[i] - abs(i - bounds[-1] - gap) / gap * .2)
        elif n == count:
            best = length - 1
        else:
            raise SystemExit(f'grid line {n} not found on {axis} between {lo} and {hi}')
        if score[best] < 0.2 and n < count:
            print(f'  weak grid line {axis}={best} (score {score[best]:.2f}); check this row/column')
        bounds.append(best)
    return bounds


def crop_cell(data, w, x0, y0, x1, y1):
    cw, ch = x1 - x0, y1 - y0
    px = lambda x, y: data[((y0 + y) * w + x0 + x) * 3:((y0 + y) * w + x0 + x) * 3 + 3]
    corners = [px(1, 1), px(cw - 2, 1), px(1, ch - 2), px(cw - 2, ch - 2)]
    bg = tuple(sorted(c[i] for c in corners)[1] for i in range(3))
    fg = bytearray(cw * ch)
    for y in range(ch):
        for x in range(cw):
            r, g, b = px(x, y)
            if is_line(r, g, b) and r > 225:
                continue  # leftover grid line or card outline, not part of the picture
            if abs(r - bg[0]) + abs(g - bg[1]) + abs(b - bg[2]) > FG_DIST:
                fg[y * cw + x] = 1
    # Card outlines sit in a band along the cell edge; there, keep only picture pixels.
    band = 18
    seen = bytearray(cw * ch)
    comps = []
    for start in range(cw * ch):
        if not fg[start] or seen[start]:
            continue
        q = deque([start]); seen[start] = 1
        area, edge, bx0, by0, bx1, by1 = 0, False, cw, ch, 0, 0
        while q:
            p = q.popleft(); x, y = p % cw, p // cw
            area += 1
            edge |= x == 0 or y == 0 or x == cw - 1 or y == ch - 1
            bx0, by0, bx1, by1 = min(bx0, x), min(by0, y), max(bx1, x), max(by1, y)
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < cw and 0 <= ny < ch:
                    n = ny * cw + nx
                    if fg[n] and not seen[n]:
                        seen[n] = 1; q.append(n)
        comps.append((area, edge, bx0, by0, bx1, by1))
    total = sum(c[0] for c in comps) or 1
    keep = [c for c in comps if not (c[1] and c[0] < total * FRAGMENT_SHARE) and c[0] > 3]
    dropped = len(comps) - len(keep)
    bx0 = min(c[2] for c in keep); by0 = min(c[3] for c in keep)
    bx1 = max(c[4] for c in keep); by1 = max(c[5] for c in keep)
    dropped_boxes = [c for c in comps if c not in keep and c[0] > 3]
    side = round(max(bx1 - bx0 + 1, by1 - by0 + 1) * (1 + 2 * PAD))
    cx, cy = (bx0 + bx1) / 2, (by0 + by1) / 2
    ox, oy = round(cx - side / 2), round(cy - side / 2)
    out = bytearray(side * side * 3)
    for y in range(side):
        sy = oy + y
        for x in range(side):
            sx = ox + x
            k = (y * side + x) * 3
            inside_frag = any(c[2] <= sx <= c[4] and c[3] <= sy <= c[5] for c in dropped_boxes) and \
                0 <= sx < cw and 0 <= sy < ch and fg[sy * cw + sx]
            in_band = 0 <= sx < cw and 0 <= sy < ch and (sx < band or sy < band or sx >= cw - band or sy >= ch - band)
            on_outline = in_band and not fg[sy * cw + sx]
            if 0 <= sx < cw and 0 <= sy < ch and not inside_frag and not on_outline:
                out[k:k + 3] = px(sx, sy)
            else:
                out[k:k + 3] = bytes(bg)
    return out, side, dropped


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('manifest')
    ap.add_argument('--preview', help='write crops here instead of overwriting dist images')
    args = ap.parse_args()
    mpath = Path(args.manifest)
    m = json.loads(mpath.read_text(encoding='utf-8'))
    cols, rows = m['layout']['columns'], m['layout']['rows']
    report = []
    base = min(i['sheet'] for i in m['items'])
    for si, sheet in enumerate(m['sheets'], start=base):
        src = ROOT / m['sheetDir'] / sheet['file']
        w, h = image_size(src)
        data = read_rgb(src)
        xs = find_lines(data, w, h, 'x', cols)
        ys = find_lines(data, w, h, 'y', rows)
        print(sheet['file'], 'x', xs, 'y', ys)
        for item in (i for i in m['items'] if i['sheet'] == si and not i.get('replacementSheet')):
            if 'row' in item:
                c, r = item['column'] - 1, item['row'] - 1
            else:
                c, r = item['cell'] % cols, item['cell'] // cols
            image = item.get('image') or item['newImage']
            pixels, side, dropped = crop_cell(data, w, xs[c] + INSET, ys[r] + INSET, xs[c + 1] - INSET, ys[r + 1] - INSET)
            target = Path(args.preview) / Path(image).name if args.preview else DIST / image
            write_png(target, pixels, side, side)
            if not args.preview:
                item['sha256'] = hashlib.sha256(target.read_bytes()).hexdigest()
            report.append((item['id'], side, dropped))
    if not args.preview:
        m['crop'] = {'tool': 'tools/recrop_grid_sheets.py', 'method': 'grid-line cells, edge fragments removed, trimmed square'}
        mpath.write_text(json.dumps(m, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{len(report)} crops; fragments removed in {sum(1 for r in report if r[2])}')


if __name__ == '__main__':
    main()
