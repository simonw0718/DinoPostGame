#!/usr/bin/env python3
"""37 注音符號筆順：抓教育部《國字標準字體筆順學習網》當參考，產生挖化石用的筆畫中線（導演 2026-10-29）。

Usage:
  python3 tools/zhuyin_strokes.py fetch    # 下載 37 頁到 reference/raw/moe_zhuyin/（不進 Git；網站授權 CC BY-NC-ND 3.0 TW）
  python3 tools/zhuyin_strokes.py build    # 產生 dist/data/zhuyin_strokes.json

只取「筆畫數、順序、方向、起訖與轉折位置」：每筆的運筆軌跡縮到 0–100 格、四捨五入成整數、
再用 Douglas–Peucker 簡化成幾個轉折點。不複製字形外框，畫面上的字框由遊戲自己用粗線畫。
體式依教育部《國語注音符號手冊》（民國 89 年）；explanation 是網站的書寫說明（例：ㄇ「末筆不鉤。」）。
"""
import hashlib
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'reference/raw/moe_zhuyin'
OUT = ROOT / 'dist/data/zhuyin_strokes.json'
PAGE = 'https://stroke-order.learningweb.moe.edu.tw/dictView.jsp?ID={}'
SYMBOLS = [chr(c) for c in range(0x3105, 0x312A)]   # ㄅ … ㄩ，37 個
BOX = 100          # 輸出座標格
MARGIN = 8         # 原圖 0–2048 → 縮放後四周留白（字放在 8–92）
EPS = 2.5          # 簡化容許誤差（格）


def fetch():
    RAW.mkdir(parents=True, exist_ok=True)
    for ch in SYMBOLS:
        path = RAW / f'{ord(ch)}.html'
        if path.exists():
            continue
        req = urllib.request.Request(PAGE.format(ord(ch)), headers={'User-Agent': 'Mozilla/5.0'})
        path.write_bytes(urllib.request.urlopen(req, timeout=20).read())
        print('下載', ch, path.name)


def word_xml(ch):
    html = (RAW / f'{ord(ch)}.html').read_text(encoding='utf-8')
    m = re.search(r'xml\[%d\]\s*=\s*("(?:[^"\\]|\\.)*")' % ord(ch), html, re.S)
    if not m:
        sys.exit(f'{ch}: 頁面裡找不到筆順資料')
    text = json.loads(m.group(1))   # 頁面裡是 JS 字串（\" \n 跳脫），JSON 規則相同
    return ET.fromstring(text), hashlib.sha256(html.encode()).hexdigest()


def simplify(pts, eps):
    if len(pts) < 3:
        return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    L = ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** .5 or 1
    far, idx = 0, 0
    for i, (x, y) in enumerate(pts[1:-1], 1):
        d = abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1) / L
        if d > far:
            far, idx = d, i
    if far <= eps:
        return [pts[0], pts[-1]]
    return simplify(pts[:idx + 1], eps)[:-1] + simplify(pts[idx:], eps)


def build():
    out, src = {}, {}
    for ch in SYMBOLS:
        word, sha = word_xml(ch)
        size = 2048.0   # 網站畫布固定 2048×2048（Word 的 x/y 屬性不是畫布大小）
        scale = (BOX - 2 * MARGIN) / size
        strokes = []
        for stroke in word.findall('Stroke'):
            track = [(float(p.get('x') or 0), float(p.get('y') or 0)) for p in stroke.find('Track') or []]
            pts = [[round(MARGIN + x * scale), round(MARGIN + y * scale)] for x, y in track]
            pts = [p for i, p in enumerate(pts) if i == 0 or p != pts[i - 1]]
            strokes.append(simplify(pts, EPS) if len(pts) > 1 else pts * 2)
        out[ch] = {'strokes': strokes}
        if word.get('explanation'):
            out[ch]['note'] = word.get('explanation')
        src[ch] = sha
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        'source': '教育部《國字標準字體筆順學習網》注音筆順（參考筆畫數、順序、方向；字形依《國語注音符號手冊》）',
        'url': 'https://stroke-order.learningweb.moe.edu.tw/phonetic.jsp',
        'box': BOX,
        'symbols': out,
    }, ensure_ascii=False, separators=(',', ':')).replace('},"', '},\n"'))
    (RAW / 'sha256.json').write_text(json.dumps(src, ensure_ascii=False, indent=1))
    print(f'寫入 {OUT.relative_to(ROOT)}：{len(out)} 個注音，共 {sum(len(v["strokes"]) for v in out.values())} 筆')


if __name__ == '__main__':
    {'fetch': fetch, 'build': build}.get(sys.argv[1] if len(sys.argv) > 1 else '', lambda: sys.exit(__doc__))()
