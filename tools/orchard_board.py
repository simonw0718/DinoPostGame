#!/usr/bin/env python3
"""恐龍果園 概念板合成（導演 2026-11-07：半 2.5D 收集果子；這輪只出純圖，不寫遊戲程式）。

來源皆唯讀：恐龍郵局製作庫的剪紙場景（bg／fg 圖層）、kidgame_orchard 零件（果樹／十格果盤／蹺蹺板／果子）、角色矩陣卡。
每張板＝上方 1920×1080 場景（側視＋前中後三層，近大遠小）＋下方說明帶（編號＝畫面上的物理互動點）。
執行：python3 tools/orchard_board.py [A B C]   → art-source/orchard/board_<X>.jpg
"""
import json, math, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

GAME = Path(__file__).resolve().parents[1]
STUDIO = GAME.parent / '恐龍郵局｜整體工作流處理'
SC = STUDIO / 'media_library/visual/papercut/scenes'
MX = STUDIO / 'media_library/visual/cards/matrix'
OUT = GAME / 'art-source/orchard'
UNIT = 300                                   # 主路（y≈985）上伊奇身高；verge（y≈860）約 0.85 倍
SCALE = {k: v['height'] for k, v in json.loads((STUDIO / 'media_library/visual/cards/character_scale.json').read_text())['characters'].items()}
FONT = '/System/Library/Fonts/STHeiti Medium.ttc'
RED, INK, CREAM, GOLD = (214, 64, 46), (36, 99, 74), (255, 253, 243), (242, 193, 78)
_cache = {}


def layer(scene, name):
    k = (scene, name)
    if k not in _cache:
        im = Image.open(SC / scene / 'build' / f'{name}.png').convert('RGBA')
        _cache[k] = (im, im.getchannel('A').getbbox())
    return _cache[k]


def prop(base, name, cx, by, s=1.0, rot=0):
    """零件依 alpha 外框裁切，底邊中心貼 (cx, by)。"""
    im, box = layer('kidgame_orchard', name); im = im.crop(box)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    if rot: im = im.rotate(rot, expand=True, resample=Image.BICUBIC)
    base.alpha_composite(im, (round(cx - im.width / 2), round(by - im.height)))
    return (cx - im.width / 2, by - im.height, cx + im.width / 2, by)


def fruit(base, cx, cy, s=0.42, rot=0):
    im, box = layer('kidgame_orchard', 'fruit'); im = im.crop(box)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    if rot: im = im.rotate(rot, expand=True, resample=Image.BICUBIC)
    base.alpha_composite(im, (round(cx - im.width / 2), round(cy - im.height / 2)))


def tray(base, cx, by, s, n):
    """十格果盤＋前 n 個果窩放果子（下排先放、左→右，再上排；位置換算自 kidgame_orchard tray 零件座標）。"""
    prop(base, 'tray', cx, by, s)
    _, box = layer('kidgame_orchard', 'tray'); ox = (box[0] + box[2]) / 2
    cups = [(1200 + (c - 2) * 106, 792) for c in range(5)] + [(1200 + (c - 2) * 106 * .86, 735) for c in range(5)]
    for i in range(n)[::-1]:
        x, y = cups[i]; fruit(base, cx + (x - ox) * s, by - (box[3] - y) * s - 14 * s, .36 * s / .62)


def char(base, cid, pose, emo, x, by, depth=1.0, mirror=False, rot=0, mouth='open'):
    """角色身高＝character_scale×UNIT×depth；以同角色 stand 卡外框高為尺規（姿勢卡共用畫布比例）。回傳頭頂點。"""
    ref = Image.open(MX / cid / 'stand__neutral__closed.png').getchannel('A').getbbox()
    im = Image.open(MX / cid / f'{pose}__{emo}__{mouth}.png').convert('RGBA'); box = im.getchannel('A').getbbox()
    k = SCALE[cid] * UNIT * depth / (ref[3] - ref[1])
    im = im.crop(box).resize((round((box[2] - box[0]) * k), round((box[3] - box[1]) * k)), Image.LANCZOS)
    if mirror: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    if rot: im = im.rotate(rot, expand=True, resample=Image.BICUBIC)
    sh = Image.new('RGBA', base.size, (0, 0, 0, 0))     # 地面影子（紙片落地感）
    ImageDraw.Draw(sh).ellipse((x - im.width * .38, by - 12 * depth, x + im.width * .38, by + 12 * depth), fill=(30, 50, 40, 70))
    base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(5)))
    base.alpha_composite(im, (round(x - im.width / 2), round(by - im.height)))
    return (x, by - im.height)


def dashed(d, pts, col=(255, 255, 255, 235), w=7, dash=22, gap=16, arrow=True):
    """虛線軌跡（掉落／彈跳／滾動路線）；pts 先用 catmull 平滑。"""
    sm = []
    for i in range(len(pts) - 1):
        p0, p1, p2, p3 = pts[max(i - 1, 0)], pts[i], pts[i + 1], pts[min(i + 2, len(pts) - 1)]
        for t in [j / 12 for j in range(12)]:
            t2, t3 = t * t, t * t * t
            sm.append(tuple(.5 * (2 * p1[a] + (-p0[a] + p2[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t2 + (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * t3) for a in (0, 1)))
    sm.append(pts[-1])
    acc, on = 0, True
    for a, b in zip(sm, sm[1:]):
        L = math.dist(a, b)
        if on: d.line([a, b], fill=col, width=w)
        acc += L
        if acc > (dash if on else gap): acc, on = 0, not on
    if arrow:
        a, b = sm[-3], sm[-1]; ang = math.atan2(b[1] - a[1], b[0] - a[0])
        tip = [b, (b[0] - 30 * math.cos(ang - .5), b[1] - 30 * math.sin(ang - .5)), (b[0] - 30 * math.cos(ang + .5), b[1] - 30 * math.sin(ang + .5))]
        d.polygon(tip, fill=col)


def burst(d, x, y, r=46, col=(255, 236, 120, 255)):
    """撞擊星（不放字）。"""
    pts = [(x + (r if i % 2 == 0 else r * .45) * math.cos(i * math.pi / 8), y + (r if i % 2 == 0 else r * .45) * math.sin(i * math.pi / 8)) for i in range(16)]
    d.polygon(pts, fill=col, outline=(255, 255, 255, 255), width=4)


def sway(d, cx, cy, r=120):
    """搖樹手勢：雙向弧形箭頭＋手指圓點。"""
    d.arc((cx - r, cy - r * .5, cx + r, cy + r * .5), 200, 340, fill=(255, 255, 255, 240), width=9)
    for sx in (-1, 1):
        ex, ey = cx + sx * r * .94, cy - r * .17
        d.polygon([(ex + sx * 14, ey + 10), (ex - sx * 18, ey - 12), (ex - sx * 6, ey + 22)], fill=(255, 255, 255, 240))
    d.ellipse((cx - 26, cy - 26 - r * .5, cx + 26, cy + 26 - r * .5), fill=(255, 255, 255, 220), outline=RED + (255,), width=6)


def num(d, n, x, y, f):
    d.ellipse((x - 34, y - 34, x + 34, y + 34), fill=RED + (255,), outline=(255, 255, 255, 255), width=6)
    d.text((x, y + 2), str(n), font=f, fill=(255, 255, 255, 255), anchor='mm')


def panel(img, title, sub, notes):
    W = img.width; H = 430
    out = Image.new('RGB', (W, img.height + H), (22, 77, 57))
    out.paste(img.convert('RGB'), (0, 0))
    d = ImageDraw.Draw(out)
    ft, fs, fn, fb = ImageFont.truetype(FONT, 58), ImageFont.truetype(FONT, 34), ImageFont.truetype(FONT, 32), ImageFont.truetype(FONT, 40)
    y0 = img.height + 30
    d.text((60, y0), title, font=ft, fill=CREAM)
    d.text((60, y0 + 82), sub, font=fs, fill=GOLD)
    cols = 2; cw = (W - 120) // cols
    for i, (n, head, body) in enumerate(notes):
        x = 60 + (i % cols) * cw; y = y0 + 150 + (i // cols) * 118
        d.ellipse((x, y, x + 56, y + 56), fill=RED); d.text((x + 28, y + 30), str(n), font=fb, fill='white', anchor='mm')
        d.text((x + 76, y + 2), head, font=fb, fill=CREAM)
        d.text((x + 76, y + 54), body, font=fn, fill=(198, 226, 206))
    return out


def scene_base(scene):
    bg = Image.open(SC / scene / 'build/bg.png').convert('RGBA')
    fg = Image.open(SC / scene / 'build/fg.png').convert('RGBA') if (SC / scene / 'build/fg.png').exists() else None
    return bg, fg


def board_A():
    img, fg = scene_base('forest_path'); d = ImageDraw.Draw(img)
    prop(img, 'tree', 1060, 872, .8, rot=-5)
    fruit(img, 880, 560, rot=-20); fruit(img, 1220, 470, rot=30); fruit(img, 1140, 610, rot=60)
    ov = Image.new('RGBA', img.size); o = ImageDraw.Draw(ov)
    dashed(o, [(940, 430), (900, 520), (880, 560)], arrow=False)
    dashed(o, [(1140, 610), (1200, 760), (1260, 930), (1330, 850), (1400, 940)])
    img.alpha_composite(ov)
    char(img, 'yuanyuan', 'run_air', 'surprised', 470, 870, .85, mirror=False)
    fruit(img, 1400, 930, rot=15)
    char(img, 'xiaokong', 'run_mid', 'happy', 1180, 990, 1.0, mirror=True)
    h = char(img, 'iggy', 'crouch', 'scared', 900, 1000, 1.0, mirror=False, mouth='wide')
    fruit(img, h[0] + 6, h[1] - 30, rot=-10)
    o = ImageDraw.Draw(img); burst(o, h[0] + 70, h[1] - 10, 40)
    tray(img, 1660, 1068, .62, 4)
    if fg: img.alpha_composite(fg)
    o = ImageDraw.Draw(img); sway(o, 1060, 330, 150)
    f = ImageFont.truetype(FONT, 42)
    for n, x, y in ((1, 840, 210), (2, 1440, 800), (3, 1010, 600), (4, 1660, 820)): num(o, n, x, y, f)
    return panel(img, 'A｜大樹下搶接', '一棵大果樹＋三隻小恐龍在前中後景跑位；手指搖樹，果子掉下來大家搶著接', [
        (1, '搖樹', '手指左右搖：樹冠彈簧回擺，搖越大掉越多（1–3 顆）'),
        (2, '果子會彈會滾', '落地彈兩下、往低處滾；每次落點不一樣'),
        (3, '小恐龍互撞', '果子砸到伊奇頭「咚」、小恐和圓圓搶同一顆撞在一起'),
        (4, '十格果盤', '接到的果子跳進果窩：數數、加 1／加 2、湊十')])


def board_B():
    img, fg = scene_base('grass_slope'); d = ImageDraw.Draw(img)
    prop(img, 'tree', 1420, 560, .5, rot=-6)
    ov = Image.new('RGBA', img.size); o = ImageDraw.Draw(ov)
    route = [(1330, 520), (1250, 620), (1180, 700), (1100, 760), (980, 830), (860, 880)]
    dashed(o, route, arrow=False)
    dashed(o, [(640, 900), (560, 720), (470, 660), (400, 760), (350, 870)])
    img.alpha_composite(ov)
    for (x, y), r in zip(route[1:5:1], (40, 110, 200, 290)): fruit(img, x, y - 20, .4, rot=r)
    prop(img, 'seesaw', 780, 985, .9)
    char(img, 'xiaokong', 'run_air', 'happy', 900, 880, .95, mirror=True)
    fruit(img, 640, 905, .4, rot=-10); fruit(img, 480, 650, .4, rot=-30)
    char(img, 'yuanyuan', 'brake', 'surprised', 1180, 870, .85, mirror=True)
    tray(img, 330, 1062, .62, 6)
    char(img, 'feifei', 'hover_up', 'happy', 1560, 780, .8, mirror=True)
    if fg: img.alpha_composite(fg)
    o = ImageDraw.Draw(img); sway(o, 1420, 290, 110)
    f = ImageFont.truetype(FONT, 42)
    for n, x, y in ((1, 1620, 260), (2, 1060, 650), (3, 760, 820), (4, 330, 800)): num(o, n, x, y, f)
    return panel(img, 'B｜坡頂滾果', '果樹在青草坡頂；果子沿坡滾下，經過樹根、蕨叢、蹺蹺板，最後彈進果盤', [
        (1, '坡頂搖樹', '搖一下掉果子；飛飛在旁邊拍翅幫忙扇風'),
        (2, '滾動路線', '撞到樹根會跳、卡在蕨叢會停；圓圓煞車擋住一顆'),
        (3, '蹺蹺板彈射', '小恐跳到低的一端，果子被彈飛到果盤（點小恐觸發）'),
        (4, '十格果盤', '飛進果窩＝加法；彈出去掉地上＝減法的故事')])


def board_C():
    img, fg = scene_base('village_path'); d = ImageDraw.Draw(img)
    prop(img, 'tree', 420, 870, .8, rot=4)
    ov = Image.new('RGBA', img.size); o = ImageDraw.Draw(ov)
    dashed(o, [(560, 420), (700, 380), (840, 470), (900, 640)])
    dashed(o, [(1420, 520), (1540, 470), (1640, 600), (1700, 900)])
    img.alpha_composite(ov)
    hx, hy = char(img, 'xiaokong', 'stand', 'happy', 940, 990, 1.0, mirror=True)
    for i in range(3): fruit(img, hx + (i % 2) * 10 - 6, hy + 4 - i * 56, .38, rot=(-8, 6, -14)[i])
    fruit(img, 900, 660, .38, rot=20)
    hx2, hy2 = char(img, 'yuanyuan', 'crouch', 'thinking', 1400, 990, 1.0, mirror=True)
    for i in range(2): fruit(img, hx2 + 40, hy2 + 10 - i * 58, .38, rot=(10, -20)[i])
    fruit(img, 1600, 520, .38, rot=60)
    char(img, 'iggy', 'reach_point', 'surprised', 1700, 990, 1.0, mirror=True)
    tray(img, 1160, 1075, .55, 3)
    if fg: img.alpha_composite(fg)
    o = ImageDraw.Draw(img); sway(o, 420, 260, 140)
    burst(o, 1480, 470, 34)
    f = ImageFont.truetype(FONT, 42)
    for n, x, y in ((1, 230, 200), (2, 1060, 560), (3, 1500, 640), (4, 1160, 800)): num(o, n, x, y, f)
    return panel(img, 'C｜頭頂疊疊樂', '小恐龍用頭和背接果子、一顆疊一顆；疊太高會搖晃倒下，大家一起笑', [
        (1, '搖樹', '果子掉向小恐龍；手指拖小恐龍左右跑去接'),
        (2, '疊高高', '頭上疊 3 顆＝數 3；再接 1 顆＝3＋1'),
        (3, '搖晃倒下', '疊太高會晃，掉 1 顆＝減法；伊奇趕快伸手撿'),
        (4, '倒進果盤', '小恐龍低頭把頭上的果子倒進果盤，湊十')])


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for k in (sys.argv[1:] or ['A', 'B', 'C']):
        im = globals()[f'board_{k}']()
        p = OUT / f'board_{k}.jpg'; im.save(p, quality=86); print(p)
