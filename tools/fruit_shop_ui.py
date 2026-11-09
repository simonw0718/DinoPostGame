#!/usr/bin/env python3
"""小空果果店 UI 元件剪紙素材（導演 11-09：「用剪紙風格的素材重新製作元件」）。

用恐龍郵局剪紙劇場共用紙材層 tools/papercut/paper.py（palette.json 色票＋紙紋、剪刀邊、白邊、投影），
把網頁上原本 CSS 畫的元件剪成透明 webp；字與數字仍由網頁疊（才能逐格動、換題）。
尺寸＝設計畫布 px（手機 1080 寬；平板同尺寸元件），每張四周留 M 倍寬的邊給白邊與投影，CSS 以負 inset 對齊。
  box.webp            十格紙盒（瓦楞牛皮紙＋10 個凹槽；槽位與 orchard.css 格線同比例）
  lid.webp            俯視蓋子（點點紅陶紙＋兩片接縫＋黃紙膠帶）
  sticker_{red,dot,star}.webp  圓貼紙（蓋子 10、紅果／紫果編號）
  tile_{a,b,c,ok}.webp 算式卡（彩色底襯＋米白卡）
  tape.webp           黃紙膠帶（算式條）
  block_{phone,tablet}_{top,base}.webp  三選一積木：上片（米白）與下片（木色）分開，按下時上片壓到下片上
  bubble_{phone,tablet}.webp  點單泡泡（尾巴位置依版面）
輸出 dist/assets/fruitshop/ui/＋ui.json（每張的 M 邊距比例）。執行：python3 tools/fruit_shop_ui.py
"""
import json, sys
from pathlib import Path
from PIL import ImageDraw

GAME = Path(__file__).resolve().parents[1]
STUDIO = GAME.parent / '恐龍郵局｜整體工作流處理'
sys.path.insert(0, str(STUDIO / 'tools/papercut'))
import paper as PP  # noqa: E402

OUT = GAME / 'dist/assets/fruitshop/ui'
SS = PP.SS
PAPER = PP.Paper()
PAPER.pal['colors']['grape'] = '#7a4eb2'        # 紫果色（只在本素材用，不寫回剪紙劇場色票）
PAPER.pal['kind_of']['grape'] = 'felt'
REG = {}


def S(v):
    return v * SS


def rr(box, r):
    def f(d: ImageDraw.ImageDraw):
        d.rounded_rectangle([S(v) for v in box], radius=S(r), fill=255)
    return f


def ell(box):
    def f(d):
        d.ellipse([S(v) for v in box], fill=255)
    return f


def poly(pts):
    def f(d):
        d.polygon([(S(x), S(y)) for x, y in pts], fill=255)
    return f


def piece(name, w, h, cuts, m=.06, patterns=False, rough=2.2, seed=0):
    """w×h＝元件本體；四周留 m×w 邊。cuts: [(色, fn(ox,oy)→draw, edge, shadow)]。"""
    M = round(w * m)
    L = PP.Layer(PAPER, w + 2 * M, h + 2 * M, rough_amp=rough, patterns=patterns)
    L.seed = seed
    for col, fn, edge, sh in cuts:
        L.cut(col, fn(M, M), edge=edge, shadow=sh, shadow_a=.3 if sh else 0)
    OUT.mkdir(parents=True, exist_ok=True)
    L.rgba().save(OUT / f'{name}.webp', 'WEBP', quality=88, method=6)
    REG[name] = {'size': [w, h], 'm': round(M / w, 4)}


# ---------- 十格紙盒：比例跟 orchard.css .box 一樣（border 1.2%、padding 4%、gap 1.4%、高 .46w） ----------
def box():
    w = 860; h = round(w * .46)
    bd, pad, gap = w * .012, w * .04, w * .014
    ix, iy = bd + pad, bd + pad
    cw, ch = (w - 2 * ix - 4 * gap) / 5, (h - 2 * iy - gap) / 2
    cells = [(ix + c * (cw + gap), iy + r * (ch + gap)) for r in range(2) for c in range(5)]
    REG_cells = [[round(x / w, 4), round(y / h, 4)] for x, y in cells]
    cuts = [('kraft', lambda ox, oy: rr((ox, oy, ox + w, oy + h), 26), 8, (5, 10))]
    for x, y in cells:          # 凹槽：深色槽壁＋往下錯開的槽底 → 上緣一道陰影像凹進去
        cuts.append(('wood', lambda ox, oy, x=x, y=y: rr((ox + x, oy + y, ox + x + cw, oy + y + ch), 16), 0, None))
        cuts.append(('kraft_dark', lambda ox, oy, x=x, y=y: rr((ox + x + 3, oy + y + 9, ox + x + cw - 3, oy + y + ch - 2), 14), 0, None))
    piece('box', w, h, cuts, seed=11)
    REG['box']['cells'] = REG_cells


def lid():
    w = 860; h = round(w * .46)
    cuts = [
        ('terracotta', lambda ox, oy: rr((ox, oy, ox + w, oy + h / 2 + 2), 26), 8, (6, 14)),          # 上片
        ('terracotta', lambda ox, oy: rr((ox, oy + h / 2 - 2, ox + w, oy + h), 26), 8, (0, 6)),       # 下片（接縫）
        ('yellow', lambda ox, oy: poly([(ox - 14, oy + h / 2 - 34), (ox + w + 14, oy + h / 2 - 30),
                                        (ox + w + 10, oy + h / 2 + 34), (ox - 10, oy + h / 2 + 30)]), 0, (0, 4)),
    ]
    piece('lid', w, h, cuts, patterns=True, seed=21)


def sticker(name, ring, d=200):
    cuts = [(ring, lambda ox, oy: ell((ox, oy, ox + d, oy + d)), 8, (3, 6))]
    if name == 'sticker_red':
        cuts.append(('cream', lambda ox, oy: ell((ox + d * .12, oy + d * .12, ox + d * .88, oy + d * .88)), 0, None))
    piece(name, d, d, cuts, m=.1, rough=1.4, seed=31 + len(name))


def tile(name, back, h=170):
    w = round(h * 1.13)
    cuts = [(back, lambda ox, oy: rr((ox - 6, oy, ox + w + 6, oy + h + 12), 30), 8, (4, 10)),
            ('cream', lambda ox, oy: rr((ox + 6, oy + 4, ox + w - 6, oy + h - 8), 24), 0, (0, 4))]
    piece(name, w, h, cuts, m=.1, seed=41 + len(name))


def tape():
    w, h = 1040, 100
    teeth = lambda x0, s: [(x0 + s * (6 if i % 2 else 0), i * h / 8) for i in range(9)]
    pts = teeth(0, 1) + [(w - p[0], h - p[1]) for p in teeth(0, 1)]
    cuts = [('yellow', lambda ox, oy: poly([(ox + x, oy + y) for x, y in pts]), 0, (3, 6))]
    piece('tape', w, h, cuts, m=.02, rough=1.2, seed=51)


def block(lay, w, h):
    d = round(h * .16)         # 積木厚度：下片往下露出 d
    piece(f'block_{lay}_base', w, h, [('wood_dark', lambda ox, oy: rr((ox, oy + d, ox + w, oy + h + d), 34), 8, (4, 12))], m=.2, seed=61)
    piece(f'block_{lay}_top', w, h, [('floor', lambda ox, oy: rr((ox, oy, ox + w, oy + h), 34), 8, None),
                                     ('cream', lambda ox, oy: rr((ox + 12, oy + 10, ox + w - 12, oy + h - 14), 26), 0, None)],
          m=.2, seed=62)
    REG[f'block_{lay}_top']['depth'] = round(d / h, 4)


def bubble(lay, w, h, tail):
    cuts = [('cream', lambda ox, oy: rr((ox, oy, ox + w, oy + h), 40), 8, (5, 10)),
            ('cream', lambda ox, oy: poly([(ox + tail - 40, oy + h - 10), (ox + tail + 40, oy + h - 10), (ox + tail, oy + h + 62)]), 8, None),
            ('cream', lambda ox, oy: rr((ox + 4, oy + 4, ox + w - 4, oy + h - 4), 36), 0, None)]   # 蓋掉尾巴接縫的白邊
    piece(f'bubble_{lay}', w, h, cuts, m=.16, seed=71)


def main():
    box(); lid()
    sticker('sticker_red', 'red'); sticker('sticker_dot', 'red', 120); sticker('sticker_star', 'grape', 120)
    tile('tile_a', 'red'); tile('tile_b', 'grape'); tile('tile_c', 'stone'); tile('tile_ok', 'green_light')
    tape()
    block('phone', 186, 150); block('tablet', 236, 140)
    bubble('phone', 440, 150, 370); bubble('tablet', 470, 150, 60)
    (OUT / 'ui.json').write_text(json.dumps({'by': 'tools/fruit_shop_ui.py（不手改）', 'pieces': REG}, ensure_ascii=False, indent=1) + '\n')
    print('ok', len(REG), '張 →', OUT.relative_to(GAME))


if __name__ == '__main__':
    main()
