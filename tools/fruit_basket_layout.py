#!/usr/bin/env python3
"""小空果果店 v3 版面草圖：三大果籃 → 客人小盒（導演 2026-11-09：改名果籃、不用果樹、要到雙位數）。

設計（AI 草案，待導演核准）：
  - 櫃台下方（拇指區）三個大果籃，各一種果子；點果籃 → 一顆果子飛進客人的小盒
  - 小盒＝十格（2×5）；放滿 10 格自動蓋蓋子，盒上貼「10」
  - 雙位數＝幾盒＋幾顆：23＝2 個蓋好的盒子＋1 個開著的盒子裡 3 顆
  - 客人泡泡＝大數字＋果子圖；每放一顆自動唸數（盒上小數字）
畫面：L1 單位數 7（一盒）、L2 兩種湊 3＋2、L3 雙位數 23
紙材與角色沿用 fruit_shop_concepts.py。執行：python3 tools/fruit_basket_layout.py → art-source/orchard/fbasket_L1|L2|L3.jpg、fbasket_board.jpg
"""
from PIL import Image, ImageDraw, ImageFont
import orchard_board as ob
import orchard_crate as oc
import fruit_shop_concepts as fs

W, H = fs.W, fs.H
OUT = ob.OUT
FLID = ImageFont.truetype(ob.FONT, 90)
KRAFT, WELL, LID = (222, 186, 132), (190, 148, 96), (236, 120, 86)


def basket(img, cx, by, w, kind, seed=0):
    """大果籃：滿滿一種果子＋編織籃身＋把手。"""
    d = ImageDraw.Draw(img)
    d.arc((cx - w * .42, by - w * 1.05, cx + w * .42, by - w * .25), 180, 360, fill=(150, 98, 52), width=16)
    for i, (dx, dy) in enumerate([(-.3, -.42), (-.1, -.5), (.1, -.5), (.3, -.42), (-.2, -.62), (0, -.66), (.2, -.62)]):
        oc.fruit(img, kind, cx + dx * w, by + dy * w, round(w * .34), seed=seed + i, rot=(i - 3) * 8)
    top, h = by - w * .45, w * .45
    fs.shape(img, lambda dd: dd.polygon([(cx - w / 2, top), (cx + w / 2, top), (cx + w * .4, by), (cx - w * .4, by)]), (196, 140, 76), seed=seed)
    d = ImageDraw.Draw(img)
    for k in range(1, 4):
        y = top + h * k / 4; d.line([(cx - w * (.5 - .1 * k / 4), y), (cx + w * (.5 - .1 * k / 4), y)], fill=(150, 98, 52), width=5)
    for k in range(-3, 4):
        d.line([(cx + w * .12 * k, top), (cx + w * .1 * k, by)], fill=(150, 98, 52), width=4)
    fs.shape(img, lambda dd: dd.rounded_rectangle((cx - w * .53, top - 18, cx + w * .53, top + 14), radius=14), (220, 166, 96), seed=seed + 3, edge=6)


def box(img, x, y, w, fill=(), closed=False, counted=True):
    """客人小盒：十格 2×5；fill＝依序放入的果子種類；closed＝蓋好貼 10。回傳 (cell 中心列表)。"""
    h = w * .46; pad = w * .04; cw = (w - pad * 2) / 5; ch = (h - pad * 2) / 2
    if closed:
        fs.shape(img, lambda d: d.rounded_rectangle((x, y, x + w, y + h), radius=22), KRAFT, seed=5)
        fs.shape(img, lambda d: d.rounded_rectangle((x - 10, y - 22, x + w + 10, y + h * .42), radius=20), LID, seed=6, edge=6)
        d = ImageDraw.Draw(img)
        d.rectangle((x + w / 2 - 14, y - 22, x + w / 2 + 14, y + h), fill=(255, 236, 150))
        d.ellipse((x + w / 2 - 70, y + h * .52 - 70, x + w / 2 + 70, y + h * .52 + 70), fill=(255, 253, 243), outline=ob.RED, width=8)
        d.text((x + w / 2, y + h * .52 + 4), '10', font=FLID if w > 300 else fs.FN, fill=ob.RED, anchor='mm')
        return []
    fs.shape(img, lambda d: d.rounded_rectangle((x, y, x + w, y + h), radius=22), KRAFT, seed=4)
    d = ImageDraw.Draw(img); cells = []
    for r in range(2):
        for c in range(5):
            cx, cy = x + pad + cw * (c + .5), y + pad + ch * (r + .5); cells.append((cx, cy))
            d.rounded_rectangle((cx - cw * .44, cy - ch * .44, cx + cw * .44, cy + ch * .44), radius=14, fill=WELL)
    d.line([(x + pad + cw * 5 / 2 * 2, y + pad), (x + pad + cw * 5, y + pad)], fill=WELL, width=1)
    for i, k in enumerate(fill):
        cx, cy = cells[i]; oc.fruit(img, k, cx, cy, round(min(cw, ch) * .9), seed=i)
        if counted: fs.badge(img, cx + cw * .32, cy - ch * .34, i + 1, ob.RED if k == fill[0] else (122, 78, 178))
    return cells


def base(customer, mirror=True):
    img = fs.scene(customer, 860, 1330, mirror=mirror)
    fs.counter(img, 1600, 2340)
    ob.char(img, 'xiaokong', 'hold', 'happy', 150, 1420, .9)
    return img


def baskets(img, kinds=('dot', 'star', 'spike'), active=0):
    for i, k in enumerate(kinds):
        basket(img, 190 + i * 350, 2300, 270, k, seed=i * 10)
    fs.hand(ImageDraw.Draw(img), 190 + active * 350, 2120)


def layout_L1():
    img = base('iggy')
    fs.bubble(img, 400, 470, 440, 220, (760, 820), 7, ['dot'])
    cells = box(img, 200, 1650, 680, ['dot'] * 6)
    oc.fruit(img, 'dot', 640, 1560, 120, seed=9)                                       # 第 7 顆飛進去
    fs.dash(img, [(190, 2120), (420, 1520), cells[6]])
    baskets(img, active=0)
    return img


def layout_L2():
    img = base('chick_abao')
    fs.bubble(img, 330, 450, 560, 220, (800, 820), 5, ['dot', 'star'])
    cells = box(img, 200, 1650, 680, ['dot', 'dot', 'dot', 'star'])
    oc.fruit(img, 'star', 700, 1560, 120, seed=9)
    fs.dash(img, [(540, 2120), (620, 1560), cells[4]])
    baskets(img, active=1)
    return img


def layout_L3():
    img = base('pairo')
    fs.bubble(img, 400, 470, 440, 220, (760, 820), 23, ['dot'])
    bw = 330; y = 1680
    box(img, 20, y, bw, closed=True); box(img, 375, y, bw, closed=True)
    cells = box(img, 730, y, bw, ['dot'] * 2, counted=False)
    for i, (cx, cy) in enumerate(cells[:3]): fs.badge(img, cx, y + bw * .46 + 40, 21 + i, ob.RED if i < 2 else (150, 150, 150))   # 接著數 21、22、(23)
    oc.fruit(img, 'dot', 880, 1590, 110, seed=9)
    fs.dash(img, [(190, 2120), (600, 1560), cells[2]])
    baskets(img, active=0)
    return img


NOTES = {
    'L1': ('① 1–10：裝一盒', ['點果籃 → 果子飛進十格盒', '每放一顆唸數（盒上小數字）', '上排 5、下排 5：看得到 5', '剛好 → 客人抱走盒子']),
    'L2': ('② 兩種湊：3＋2', ['兩種果子分兩種顏色數字', '客人泡泡畫兩種果子', '先放 3 紅、再放 2 紫', '太多：點盒裡果子退回籃']),
    'L3': ('③ 雙位數：23', ['放滿 10 格自動蓋蓋子貼「10」', '23＝2 盒＋3 顆', '開盒接著數 21、22、23', '之後到 50：多盒＋散顆']),
}


def main():
    imgs = {'L1': layout_L1(), 'L2': layout_L2(), 'L3': layout_L3()}
    for k, im in imgs.items(): im.convert('RGB').save(OUT / f'fbasket_{k}.jpg', quality=86)
    fs.NOTES.clear(); fs.NOTES.update(NOTES)
    b = fs.board(imgs); d = ImageDraw.Draw(b)
    d.rectangle((0, 0, b.width, 90), fill=(246, 240, 226))
    d.text((40, 30), '小空果果店 v3：三大果籃 → 客人十格小盒（手機直式草圖）', font=ImageFont.truetype(ob.FONT, 40), fill=ob.INK)
    b.save(OUT / 'fbasket_board.jpg', quality=88); print('ok')


if __name__ == '__main__':
    main()
