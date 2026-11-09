#!/usr/bin/env python3
"""小空果果店：三種獨立玩法概念（導演 2026-11-08：不被訂單木箱／十格果盤卡住，獨立設計）。

共同：小空、圓圓開扮家家酒果果店，客人泡泡＝大數字（＋果子圖），每加一顆自動唸數，結果做成一樣「東西」交給客人。
  A 果果串（滑）：橫向竹籤＝數線，點果子 → 滑上竹籤，第 5 格有大節（看 5）；客人拿到串串咬一口
  B 果果塔（疊）：杯子上疊果子，旁邊身高尺；客人的小旗插在要的高度；疊太高會搖晃（緊張感），剛好就插旗
  C 彩虹果汁（倒）：大玻璃杯，每顆果子＝一層顏色；兩種果子＝兩段顏色（看得見 3＋2）；杯上客人的吸管標線
紙材：orchard_crate._papered；角色矩陣卡。執行：python3 tools/fruit_shop_concepts.py → art-source/orchard/fshop_A|B|C.jpg、fshop_board.jpg
"""
import math
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import orchard_board as ob
import orchard_frames as of
import orchard_crate as oc

W, H = 1080, 2340
OUT = ob.OUT
FN = ImageFont.truetype(ob.FONT, 44)
FBIG = ImageFont.truetype(ob.FONT, 120)
EDGE = (255, 253, 243, 255)


def shape(base, draw_fn, col, seed=1, edge=10, shadow=True):
    """用遮罩畫一塊剪紙：draw_fn(ImageDraw) 畫白色形狀 → 紙紋上色＋白邊＋小影子。"""
    m = Image.new('L', base.size); dm = ImageDraw.Draw(m)

    class Fill:                                   # 預設填滿（ImageDraw 不給 fill 只畫外框）
        def __getattr__(self, k):
            f = getattr(dm, k); return lambda *a, **kw: f(*a, **{'fill': 255, **kw})
    draw_fn(Fill())
    box = m.getbbox()
    if not box: return
    pad = edge + 20; bx = (max(0, box[0] - pad), max(0, box[1] - pad), min(base.width, box[2] + pad), min(base.height, box[3] + pad))
    mc = m.crop(bx)
    if shadow:
        sh = Image.new('RGBA', mc.size, (20, 40, 30, 0)); sh.putalpha(mc.filter(ImageFilter.MaxFilter(edge * 2 + 1 if edge else 1)).point(lambda v: v * .3))
        base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(6)), (bx[0] + 6, bx[1] + 10))
    if edge:
        e = Image.new('RGBA', mc.size, EDGE); e.putalpha(mc.filter(ImageFilter.MaxFilter(edge * 2 + 1)))
        base.alpha_composite(e, bx[:2])
    base.alpha_composite(oc._papered(mc, col, seed), bx[:2])


def awning(base, y, h=170, n=8):
    """果果店遮雨棚：紅白條紋＋波浪下緣（扮家家酒紙板店）。"""
    w = W / n
    for i in range(n):
        col = (214, 64, 46) if i % 2 == 0 else (255, 240, 214)
        shape(base, lambda d, i=i: (d.rectangle((i * w, y, (i + 1) * w, y + h)), d.ellipse((i * w, y + h - w * .5, (i + 1) * w, y + h + w * .5))), col, seed=i, edge=0, shadow=i == 0)
    d = ImageDraw.Draw(base); d.line([(0, y), (W, y)], fill=(150, 90, 50), width=10)


def counter(base, y0, y1):
    shape(base, lambda d: d.rounded_rectangle((30, y0, W - 30, y1), radius=24), (214, 166, 104), seed=7)
    shape(base, lambda d: d.rounded_rectangle((10, y0 - 30, W - 10, y0 + 20), radius=14), (236, 196, 136), seed=8)
    d = ImageDraw.Draw(base)
    for k in range(1, 4): d.line([(40, y0 + (y1 - y0) * k / 4), (W - 40, y0 + (y1 - y0) * k / 4)], fill=(150, 104, 62), width=5)


def bubble(base, x, y, w, h, tail, n, kinds=()):
    sh = Image.new('RGBA', base.size); ImageDraw.Draw(sh).rounded_rectangle((x + 8, y + 12, x + w + 8, y + h + 12), radius=44, fill=(20, 40, 30, 70))
    base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(8)))
    d = ImageDraw.Draw(base); tx = min(max(tail[0], x + 60), x + w - 60)
    d.polygon([(tx - 40, y + h - 4), (tx + 40, y + h - 4), tail], fill=(255, 253, 243))
    d.rounded_rectangle((x, y, x + w, y + h), radius=44, fill=(255, 253, 243), outline=(232, 214, 176), width=5)
    cx = x + h * .55
    d.ellipse((cx - h * .38, y + h * .12, cx + h * .38, y + h * .88), fill=ob.RED + (255,))
    d.text((cx, y + h / 2 + 4), str(n), font=FBIG, fill='white', anchor='mm')
    for i, k in enumerate(kinds): oc.fruit(base, k, x + h * 1.15 + i * h * .62, y + h / 2, round(h * .62), seed=i)


def badge(base, x, y, n, col=ob.RED):
    d = ImageDraw.Draw(base)
    d.ellipse((x - 26, y - 26, x + 26, y + 26), fill=col + (255,), outline=(255, 255, 255, 255), width=4)
    d.text((x, y + 1), str(n), font=FN, fill='white', anchor='mm')


def bowl(base, cx, by, w, kind):
    """果子碗（點一下＝拿一顆）。"""
    for i, (dx, dy) in enumerate([(-.24, -.18), (0, -.26), (.24, -.18), (-.12, -.36), (.12, -.36)]):
        oc.fruit(base, kind, cx + dx * w, by - w * .2 + dy * w, round(w * .36), seed=i, rot=(i - 2) * 9)
    shape(base, lambda d: d.chord((cx - w / 2, by - w * .55, cx + w / 2, by), 0, 180), (90, 150, 200), seed=hash(kind) % 7)


def hand(d, x, y):
    d.ellipse((x - 34, y - 34, x + 34, y + 34), fill=(255, 255, 255, 210), outline=ob.RED + (255,), width=7)


def dash(base, pts):
    ov = Image.new('RGBA', base.size); ob.dashed(ImageDraw.Draw(ov), pts, w=8, dash=24, gap=16); base.alpha_composite(ov)


def scene(customer, cx_, by_, depth=1.0, mirror=True):
    img = of.backdrop(W, H, 1150, 1300, 1700); ob.UNIT = 430
    awning(img, 120)
    ob.char(img, customer, 'stand', 'happy', cx_, by_, depth, mirror=mirror)
    return img


# ---------- A 果果串 ----------
def layout_A():
    img = scene('iggy', 860, 1330)
    bubble(img, 420, 470, 440, 220, (760, 820), 6, ['spike'])
    ob.char(img, 'xiaokong', 'hold', 'happy', 150, 1400, .9)
    counter(img, 1600, 2340)
    # 竹籤（數線）：左握把 → 10 個位置，第 5、10 格有竹節
    y = 1470; x0, x1 = 30, 1010; step = (x1 - x0 - 40) / 10
    shape(img, lambda d: d.rounded_rectangle((x0, y - 13, x1, y + 13), radius=13), (226, 190, 120), seed=3)
    shape(img, lambda d: d.polygon([(x1, y - 13), (x1 + 50, y), (x1, y + 13)]), (226, 190, 120), seed=4, edge=6)
    d = ImageDraw.Draw(img)
    for k in range(1, 11):
        x = x0 + 20 + step * k
        if k in (5, 10): d.rounded_rectangle((x - 9, y - 22, x + 9, y + 22), radius=6, fill=(176, 130, 70))
        else: d.ellipse((x - 5, y - 5, x + 5, y + 5), fill=(176, 130, 70))
    for k in range(4):
        x = x0 + 20 + step * (k + .5); oc.fruit(img, 'spike', x, y, round(step * 1.45), seed=k)
        badge(img, x, y - step * .62, k + 1)
    oc.fruit(img, 'spike', x0 + 20 + step * 5.6, y - 120, round(step * 1.45), seed=9)      # 正在滑上去
    dash(img, [(320, 1980), (560, 1760), (x0 + 20 + step * 5.4, y - 90)])
    bowl(img, 230, 2160, 330, 'spike'); bowl(img, 540, 2160, 330, 'dot'); bowl(img, 850, 2160, 330, 'duo')
    hand(d, 320, 1980)
    return img


# ---------- B 果果塔 ----------
def layout_B():
    img = scene('chick_abao', 870, 1360, .95)
    bubble(img, 200, 470, 440, 220, (560, 860), 5, ['flame'])
    counter(img, 1560, 2340)
    ob.char(img, 'yuanyuan', 'hold', 'happy', 170, 1600, 1.0)
    # 杯＋疊果（微微歪，搖晃線）＋身高尺＋客人小旗
    cx, cy = 540, 1520
    shape(img, lambda d: d.polygon([(cx - 120, cy - 150), (cx + 120, cy - 150), (cx + 80, cy + 40), (cx - 80, cy + 40)]), (250, 210, 90), seed=5)
    fs = 150; tops = []
    for i in range(4):
        x, y = cx + i * i * 3, cy - 150 - fs * .38 - i * fs * .78
        oc.fruit(img, 'flame', x, y, fs, seed=i, rot=(-6, 5, -9, 7)[i]); tops.append((x, y))
    d = ImageDraw.Draw(img)
    for i, (x, y) in enumerate(tops): badge(img, x - 100, y, i + 1)
    of.wobble(d, tops[-1][0] + 60, tops[-1][1], 120, 1)
    # 身高尺（右側）：1–10 刻度，5 粗；客人旗子插在 5
    rx = 790; base_y = cy - 150
    d.line([(rx, base_y), (rx, base_y - fs * .78 * 8)], fill=(255, 255, 255, 230), width=8)
    for k in range(1, 9):
        yy = base_y - fs * .78 * k + fs * .2
        d.line([(rx - (30 if k % 5 == 0 else 16), yy), (rx, yy)], fill=(255, 255, 255, 230), width=8 if k % 5 == 0 else 5)
    fy = base_y - fs * .78 * 5 + fs * .2
    d.line([(rx, fy), (rx + 70, fy)], fill=(120, 80, 40), width=6)
    d.polygon([(rx + 70, fy - 60), (rx + 160, fy - 35), (rx + 70, fy - 10)], fill=(240, 196, 60))
    oc.fruit(img, 'flame', 400, 2000, 220, seed=8, rot=-10)
    dash(img, [(400, 2000), (480, 1500), (cx, tops[-1][1] - 170)])
    for i, k in enumerate(['flame', 'star', 'flame', 'dot', 'flame']):
        oc.fruit(img, k, 140 + i * 200, 2200, 190, seed=i)
    hand(d, 400, 2000)
    return img


# ---------- C 彩虹果汁 ----------
JUICE = {k: v['body'] for k, v in oc.FRUITS.items()}


def layout_C():
    img = scene('pairo', 880, 1420, .9)
    bubble(img, 330, 450, 560, 220, (840, 820), 5, ['dot', 'star'])
    counter(img, 1640, 2340)
    ob.char(img, 'xiaokong', 'point', 'happy', 150, 1660, 1.0)
    # 大玻璃杯：10 層刻度；已倒 3 層紅（斑點果）＋1 層紫（星點果）
    gx0, gx1, gy0, gy1 = 380, 700, 980, 1640; lay = (gy1 - gy0 - 40) / 10
    d = ImageDraw.Draw(img)
    for i, k in enumerate(['dot', 'dot', 'dot', 'star']):
        y = gy1 - 20 - lay * (i + 1)
        shape(img, lambda dd, y=y: dd.rectangle((gx0 + 14, y, gx1 - 14, y + lay)), JUICE[k], seed=i, edge=0, shadow=False)
        badge(img, gx0 - 50, y + lay / 2, i + 1, ob.RED if k == 'dot' else (122, 78, 178))
        ImageDraw.Draw(img).line([(gx0 + 14, y), (gx1 - 14, y)], fill=(255, 255, 255, 200), width=4)
    d.rounded_rectangle((gx0, gy0, gx1, gy1), radius=30, outline=(255, 255, 255, 255), width=12)
    for k in range(1, 10):
        y = gy1 - 20 - lay * k; d.line([(gx1 - (60 if k == 5 else 34), y), (gx1 - 12, y)], fill=(255, 255, 255, 220), width=7 if k == 5 else 4)
    ty = gy1 - 20 - lay * 5
    d.line([(gx0 - 10, ty), (gx1 + 10, ty)], fill=(240, 196, 60), width=6)                 # 客人要到這裡（吸管標線）
    d.line([(gx1 - 60, gy0 - 120), (gx1 - 110, ty)], fill=(80, 170, 220), width=16)        # 吸管
    oc.fruit(img, 'star', 560, 880, 190, seed=3)
    dash(img, [(560, 2050), (520, 1300), (560, 940)])
    shape(img, lambda dd: dd.rounded_rectangle((60, 1960, 1020, 2290), radius=40), (232, 214, 176), seed=12)
    for i, k in enumerate(['dot', 'star', 'flame', 'duo']):
        oc.fruit(img, k, 190 + i * 235, 2120, 200, seed=i)
    hand(d, 425, 2120)
    return img


NOTES = {
    'A': ('A 果果串（滑）', ['竹籤＝數線，點碗裡的果子滑上去', '第 5、10 格有竹節：看 5 與 10', '客人咬一口串串', '延伸：兩種果子＝前段＋後段']),
    'B': ('B 果果塔（疊）', ['疊在杯子上，越疊越高', '旁邊身高尺，客人小旗插在要的高度', '太高會搖晃（緊張但不倒）', '剛好 → 插旗交給客人']),
    'C': ('C 彩虹果汁（倒）', ['一顆果子＝一層顏色', '兩種果子＝兩段顏色：3＋2', '杯上黃線＝客人要到這裡', '剛好 → 插吸管喝光']),
}


def board(imgs):
    s = .42; pw, ph = round(W * s), round(H * s)
    B = Image.new('RGB', (pw * 3 + 160, ph + 420), (246, 240, 226)); d = ImageDraw.Draw(B)
    ft = ImageFont.truetype(ob.FONT, 40); fs = ImageFont.truetype(ob.FONT, 27)
    d.text((40, 30), '小空果果店：三種獨立玩法（手機直式）', font=ft, fill=ob.INK)
    for i, (k, im) in enumerate(imgs.items()):
        x = 40 + i * (pw + 40); B.paste(im.convert('RGB').resize((pw, ph)), (x, 100))
        t, lines = NOTES[k]; d.text((x, 120 + ph), t, font=ft, fill=ob.RED)
        for j, l in enumerate(lines): d.text((x, 175 + ph + j * 40), l, font=fs, fill=ob.INK)
    return B


def main():
    imgs = {'A': layout_A(), 'B': layout_B(), 'C': layout_C()}
    for k, im in imgs.items(): im.convert('RGB').save(OUT / f'fshop_{k}.jpg', quality=86)
    board(imgs).save(OUT / 'fshop_board.jpg', quality=88); print('ok')


if __name__ == '__main__':
    main()
