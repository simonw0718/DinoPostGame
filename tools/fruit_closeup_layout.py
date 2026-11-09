#!/usr/bin/env python3
"""小空果果店 v4 近景草圖（導演 2026-11-09）：鏡頭拉近，客人頭在後景看你放果子，盒子在畫面中央放大。

決定（導演 11-09 照建議）：
  - 客人只露頭肩在後景、表情跟著反應；小空在角落探頭，翅膀伸進來放果子（玩家＝小空）
  - 難度：① 十格不進位 ② 二十格進位（8＋5：第一盒滿 10 蓋蓋，剩 3 進第二盒）③ 蓋好盒縮小疊旁＋二十格
  - 算式條 [8]+[5]=[?]：第 ① 級自動填答，②③ 放完三選一；進位時多一行「8＋2＝10，再＋3＝13」
  - 手機直式：二十格上下疊；平板橫式：左右並排
執行：python3 tools/fruit_closeup_layout.py → art-source/orchard/fclose_phone.jpg、fclose_tablet.jpg、fclose_board.jpg
"""
import math
from PIL import Image, ImageDraw, ImageFont
import orchard_board as ob
import orchard_frames as of
import orchard_crate as oc
import fruit_shop_concepts as fs
import fruit_basket_layout as fb

OUT = ob.OUT
oc._g = of.grain((2400, 2400))                  # 平板寬 2048，預設 1200 紙紋不夠大


def counter(img, y0):
    W, H = img.size
    fs.shape(img, lambda d: d.rounded_rectangle((30, y0, W - 30, H + 40), radius=24), (214, 166, 104), seed=7)
    fs.shape(img, lambda d: d.rounded_rectangle((10, y0 - 30, W - 10, y0 + 20), radius=14), (236, 196, 136), seed=8)
PURPLE = (122, 78, 178)
F = lambda n: ImageFont.truetype(ob.FONT, n)


def wing(img, tx, ty, L=330, w=58):
    """小空的藍翅膀尖：從正下方斜伸上來、漸細，尖端三層羽毛夾著果子（玩家的手）。"""
    sx, sy = tx + 110, ty + L
    def draw(d):
        d.polygon([(sx - w, sy), (sx + w, sy + 20), (tx + w * .45, ty + 30), (tx - w * .45, ty + 20)])
        for k, (dx, dy) in enumerate([(-.9, .1), (0, -.35), (.9, .05)]):
            fx, fy = tx + dx * w * .7, ty + dy * w
            d.ellipse((fx - w * .38, fy - w * .7, fx + w * .38, fy + w * .7))
    fs.shape(img, draw, (52, 110, 190), seed=21, edge=8)
    d = ImageDraw.Draw(img)
    for k in range(3):                                            # 羽毛線
        y = ty + 90 + k * 70; d.line([(tx + (y - ty) / L * 110 - w * .5, y), (tx + (y - ty) / L * 110 + w * .5, y + 14)], fill=(30, 70, 140), width=5)


def equation(img, cx, y, a, b, ans='?', s=1.0, hint=None):
    d = ImageDraw.Draw(img); bw, bh, gap = 170 * s, 150 * s, 90 * s
    xs = [cx - bw * 1.5 - gap, cx - bw / 2, cx + bw / 2 + gap]
    for i, (x, v, col) in enumerate(zip(xs, (a, b, ans), (ob.RED, PURPLE, (150, 150, 150)))):
        d.rounded_rectangle((x, y, x + bw, y + bh), radius=26 * s, fill=(255, 253, 243), outline=col, width=round(8 * s))
        d.text((x + bw / 2, y + bh / 2 + 4), str(v), font=F(round(110 * s)), fill=col, anchor='mm')
    for x, t in ((xs[0] + bw + gap / 2, '+'), (xs[1] + bw + gap / 2, '=')):
        d.text((x, y + bh / 2), t, font=F(round(100 * s)), fill='white', anchor='mm', stroke_width=round(6 * s), stroke_fill=ob.INK)
    if hint:
        d.rounded_rectangle((cx - 330 * s, y + bh + 18 * s, cx + 330 * s, y + bh + 86 * s), radius=30 * s, fill=(255, 236, 150))
        d.text((cx, y + bh + 52 * s), hint, font=F(round(44 * s)), fill=ob.INK, anchor='mm')


def frame10(img, x, y, w, kinds, lid=False):
    """十格盒（不畫自動編號），紅果編 1..n、紫果另編 1..m；lid＝蓋子正在蓋上。"""
    cells = fb.box(img, x, y, w, kinds, counted=False)
    h = w * .46; cw = w * .92 / 5; nr = npu = 0
    for (cx, cy), k in zip(cells, kinds):
        if k == 'dot': nr += 1; fs.badge(img, cx + cw * .3, cy - cw * .3, nr, ob.RED)
        else: npu += 1; fs.badge(img, cx + cw * .3, cy - cw * .3, npu, PURPLE)
    if lid:
        fs.shape(img, lambda d: d.polygon([(x - 6, y - 150), (x + w + 6, y - 100), (x + w + 6, y - 40), (x - 6, y - 90)]), fb.LID, seed=6, edge=6)
        d = ImageDraw.Draw(img)
        d.ellipse((x + w / 2 - 50, y - 145, x + w / 2 + 50, y - 45), fill=(255, 253, 243), outline=ob.RED, width=6)
        d.text((x + w / 2, y - 93), '10', font=F(60), fill=ob.RED, anchor='mm')
    return cells


def customer(img, cid, cx, top, head_h, mirror=True):
    """客人近景：把整張卡放大到頭佔 head_h，頭頂對 top；身體由前景櫃台蓋住。"""
    ob.UNIT = head_h * 2.6 / ob.SCALE[cid]
    ob.char(img, cid, 'stand', 'happy', cx, top + head_h * 2.6 * 1.0, 1.0, mirror=mirror)


def order_bubble(img, x, y, w, h, tail):
    d = ImageDraw.Draw(img)
    d.polygon([(tail[0] - 40, y + h - 4), (tail[0] + 40, y + h - 4), tail], fill=(255, 253, 243))
    d.rounded_rectangle((x, y, x + w, y + h), radius=40, fill=(255, 253, 243), outline=(232, 214, 176), width=5)
    for i, (n, k, col) in enumerate(((8, 'dot', ob.RED), (5, 'star', PURPLE))):
        bx = x + 30 + i * w * .5
        oc.fruit(img, k, bx + h * .32, y + h / 2, round(h * .55), seed=i)
        d.text((bx + h * .62, y + h / 2), f'×{n}', font=F(round(h * .42)), fill=col, anchor='lm')


def xiaokong_peek(img, x, by, size):
    ob.UNIT = size / ob.SCALE['xiaokong']
    ob.char(img, 'xiaokong', 'stand', 'happy', x, by, 1.0)


def phone():
    W, H = 1080, 2340
    img = of.backdrop(W, H, 620, 760, 2000)
    fs.awning(img, -60, h=150)
    customer(img, 'pairo', 640, 150, 420)
    order_bubble(img, 30, 250, 440, 150, (400, 500))
    counter(img, 900)
    equation(img, W / 2, 940, 8, 5, hint='8＋2＝10，再＋3＝13')
    frame10(img, 110, 1320, 860, ['dot'] * 8 + ['star'] * 2, lid=True)
    c2 = frame10(img, 110, 1745, 860, ['star'] * 2)
    for i, k in enumerate(['dot', 'star', 'spike']): fb.basket(img, 500 + i * 225, H - 10, 200, k, seed=i * 10)
    xiaokong_peek(img, 150, H + 120, 400)
    wing(img, c2[2][0], c2[2][1] + 40)
    oc.fruit(img, 'star', c2[2][0], c2[2][1] - 10, 140, seed=9)
    return img


def tablet():
    W, H = 2048, 1536
    img = of.backdrop(W, H, 380, 470, 1400)
    pass
    customer(img, 'pairo', 820, 60, 330)
    order_bubble(img, 1080, 140, 470, 150, (1100, 360))
    counter(img, 560)
    equation(img, W / 2, 590, 8, 5, s=.8, hint='8＋2＝10，再＋3＝13')
    frame10(img, 150, 900, 830, ['dot'] * 8 + ['star'] * 2, lid=True)
    c2 = frame10(img, 1068, 900, 830, ['star'] * 2)
    for i, k in enumerate(['dot', 'star', 'spike']): fb.basket(img, 1280 + i * 270, H - 10, 230, k, seed=i * 10)
    xiaokong_peek(img, 190, H + 120, 420)
    wing(img, c2[2][0], c2[2][1] + 40)
    oc.fruit(img, 'star', c2[2][0], c2[2][1] - 10, 130, seed=9)
    return img


def board(p, t):
    s = .5; pw, ph = round(p.width * s), round(p.height * s); tw = round(t.width * ph * .62 / t.height); th = round(ph * .62)
    B = Image.new('RGB', (pw + tw + 120, ph + 150), (246, 240, 226)); d = ImageDraw.Draw(B)
    d.text((40, 25), '小空果果店 v4 近景：8＋5＝13（進位關，左手機／右平板）', font=F(40), fill=ob.INK)
    B.paste(p.convert('RGB').resize((pw, ph)), (40, 100)); B.paste(t.convert('RGB').resize((tw, th)), (pw + 80, 100))
    notes = ['客人頭肩在後景，看著你放果子', '小空在左下探頭，翅膀伸進來放果子', '算式條 [8]+[5]=[?]：紅果編 1–8、紫果編 1–5',
             '第一盒滿 10 → 蓋蓋子；剩下的進第二盒', '黃條提示：8＋2＝10，再＋3＝13', '放完後 ? 變三選一（②③級）']
    for i, n in enumerate(notes): d.text((pw + 80, 140 + th + i * 52), '- ' + n, font=F(34), fill=ob.INK)
    return B


def main():
    p, t = phone(), tablet()
    p.convert('RGB').save(OUT / 'fclose_phone.jpg', quality=86); t.convert('RGB').save(OUT / 'fclose_tablet.jpg', quality=86)
    board(p, t).save(OUT / 'fclose_board.jpg', quality=88); print('ok')


if __name__ == '__main__':
    main()
