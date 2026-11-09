#!/usr/bin/env python3
"""恐龍果園 A＋C 混合版：手機直式／平板橫式兩種構圖（導演 2026-11-07：物件醒目、減少不必要背景）。

玩法＝A 大樹下搶接（搖樹、果子彈跳、砸頭）＋C 頭頂疊疊樂（頭上疊果、搖晃掉落、倒進果盤）。
背景只留「紙紋天空＋一道淡丘＋草帶＋土路」，不放其他樹、房子、蕨叢；角色、果樹、果子、果盤放大。
共用 orchard_board.py 的零件／角色／虛線函式；來源唯讀。
執行：python3 tools/orchard_frames.py   → art-source/orchard/AC_phone.jpg、AC_tablet.jpg、board_AC.jpg
"""
import random
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops
import orchard_board as ob

OUT = ob.OUT
SKY, HILL, GRASS, PATH = (128, 196, 232), (178, 214, 170), (118, 178, 96), (226, 196, 140)


def grain(size, seed=7):
    """紙紋：取 forest_path 天空乾淨區的明暗起伏，平鋪成灰階顆粒（保留剪紙紙材感）。"""
    bg, _ = ob.layer('forest_path', 'bg')
    tile = bg.crop((1560, 0, 1900, 120)).convert('L')
    tile = ImageChops.subtract(tile, tile.filter(ImageFilter.GaussianBlur(10)), 1, 128)
    out = Image.new('L', size, 128)
    for y in range(0, size[1], tile.height):
        for x in range(0, size[0], tile.width):
            t = tile.transpose(Image.FLIP_LEFT_RIGHT) if (x // tile.width) % 2 else tile
            out.paste(t.transpose(Image.FLIP_TOP_BOTTOM) if (y // tile.height) % 2 else t, (x, y))
    return out


def paper(size, col, g):
    """純色紙＋紙紋。"""
    base = Image.new('RGB', size, col)
    lift = g.crop((0, 0) + size).point(lambda v: max(0, min(255, 128 + (v - 128) * 2)))
    return ImageChops.overlay(base, Image.merge('RGB', [lift] * 3)).convert('RGBA')


def band(img, g, col, top_fn, seed, edge=True):
    """畫一條從 top_fn(x) 到底部的紙片色帶（上緣不規則手撕感＋白色紙邊）。"""
    W, H = img.size; rnd = random.Random(seed)
    pts = [(x, top_fn(x) + rnd.uniform(-4, 4)) for x in range(-20, W + 40, 24)]
    mask = Image.new('L', (W, H)); ImageDraw.Draw(mask).polygon(pts + [(W + 40, H), (-20, H)], fill=255)
    if edge:
        ed = Image.new('L', (W, H)); ImageDraw.Draw(ed).line(pts, fill=255, width=7)
        img.paste(Image.new('RGBA', (W, H), (255, 253, 243, 255)), (0, 4), ed)
    img.paste(paper((W, H), col, g), (0, 0), mask)


def backdrop(W, H, hill_y, grass_y, path_y):
    import math
    g = grain((W, H))
    img = paper((W, H), SKY, g)
    band(img, g, HILL, lambda x: hill_y - 70 * math.sin(x / W * math.pi * 1.3 + .4), 1)
    band(img, g, GRASS, lambda x: grass_y + 10 * math.sin(x / 90), 2)
    band(img, g, PATH, lambda x: path_y + 6 * math.sin(x / 140), 3)
    return img


def wobble(d, x, y, h, side=1):
    """疊果搖晃線：兩條小弧。"""
    for i, r in enumerate((26, 44)):
        cx = x + side * (30 + i * 16)
        d.arc((cx - r, y - h / 2, cx + r, y + h / 2), -50 if side > 0 else 130, 50 if side > 0 else 230, fill=(255, 255, 255, 240), width=7)


def stack(img, hx, hy, n, s, tilt=0):
    """頭頂疊果：由下往上，tilt＝每顆往右偏移（搖晃中）。回傳最上面那顆的中心。"""
    step = 120 * s
    for i in range(n):
        cx, cy = hx + tilt * i * i, hy - step * .45 - i * step * .82
        ob.fruit(img, cx, cy, s, rot=(-8, 6, -14, 10)[i % 4] + tilt * i)
    return cx, cy


def frame(W, H, L):
    """依版面參數 L 合成一張場景。"""
    img = backdrop(W, H, L['hill'], L['grass'], L['path'])
    tx, tby, ts = L['tree']
    ob.prop(img, 'tree', tx, tby, ts, rot=-4)
    U, ov = L['unit'], Image.new('RGBA', img.size); o = ImageDraw.Draw(ov)
    for path in L['trails']: ob.dashed(o, path, w=L['line'], dash=L['line'] * 3, gap=L['line'] * 2)
    img.alpha_composite(ov)
    for x, y, r in L['falling']: ob.fruit(img, x, y, L['fs'], rot=r)
    ob.UNIT = U
    # 後排（較小）：圓圓衝過來接
    yx, yb = L['yuan']; ob.char(img, 'yuanyuan', 'run_air', 'surprised', yx, yb, .88, mirror=L.get('yuan_m', False))
    # 前排：伊奇被砸頭（A）、小恐頭頂疊三顆在晃（C）
    ix, ib = L['iggy']; h = ob.char(img, 'iggy', 'crouch', 'scared', ix, ib, 1.0, mouth='wide')
    ob.fruit(img, h[0] + 8, h[1] - L['fs'] * 60, L['fs'], rot=-10)
    kx, kb = L['kong']; hk = ob.char(img, 'xiaokong', 'stand', 'happy', kx, kb, 1.0, mirror=True)
    top = stack(img, hk[0] - 6, hk[1] + 10, 3, L['fs'], tilt=L['fs'] * 14)
    # 最上一顆被晃掉（減法）
    ov = Image.new('RGBA', img.size); o = ImageDraw.Draw(ov)
    drop = L['drop']; ob.dashed(o, [top] + drop, w=L['line'], dash=L['line'] * 3, gap=L['line'] * 2)
    img.alpha_composite(ov); ob.fruit(img, *drop[-1], L['fs'], rot=40)
    cx, cb, cs, n = L['tray']; ob.tray(img, cx, cb, cs, n)
    d = ImageDraw.Draw(img)
    ob.burst(d, h[0] + L['fs'] * 150, h[1] - L['fs'] * 40, L['fs'] * 95)
    wobble(d, top[0] + L['fs'] * 20, top[1] + L['fs'] * 90, L['fs'] * 220)
    sx, sy, sr = L['sway']; ob.sway(d, sx, sy, sr)
    f = ImageFont.truetype(ob.FONT, 42)
    for n, (x, y) in enumerate(L['nums'], 1): ob.num(d, n, x, y, f)
    return img


PHONE = dict(  # 1080×2340（iPhone 19.5:9 直式）；上 120 狀態列、下 90 Home 條不放互動
    hill=1300, grass=1450, path=1600, unit=480, line=8, fs=.52,
    tree=(560, 1560, 1.3), sway=(560, 370, 190),
    trails=[[(400, 990), (330, 1140), (300, 1250)], [(760, 1010), (840, 1180), (880, 1280)]],
    falling=[(300, 1280, -20), (880, 1310, 30)],
    yuan=(560, 1800), yuan_m=False,
    iggy=(250, 2030), kong=(840, 2030),
    drop=[(1000, 1560), (980, 1980)],
    tray=(560, 2250, .78, 4),
    nums=[(160, 260), (160, 1320), (690, 1290), (250, 2200)],
)
TABLET = dict(  # 2048×1536（iPad 4:3 橫式）
    hill=820, grass=930, path=1040, unit=470, line=8, fs=.5,
    tree=(560, 1080, 1.1), sway=(560, 240, 200),
    trails=[[(360, 700), (310, 860), (290, 960)], [(820, 720), (930, 860), (990, 960)]],
    falling=[(290, 990, -20), (990, 990, 30)],
    yuan=(250, 1260), yuan_m=False,
    iggy=(800, 1440), kong=(1300, 1440),
    drop=[(1500, 880), (1560, 1300)],
    tray=(1740, 1500, .76, 4),
    nums=[(330, 170), (130, 780), (1180, 900), (1740, 1150)],
)
NOTES = [
    (1, '搖樹（A）', '手指左右搖樹冠；搖越大掉越多（1–3 顆），果子落地會彈會滾'),
    (2, '砸頭／搶接（A）', '果子砸伊奇頭「咚」；圓圓衝過來搶；拖小恐龍左右跑去接'),
    (3, '頭頂疊疊樂（C）', '接到就疊在頭上＝數數、加法；疊太高會晃，掉 1 顆＝減法'),
    (4, '倒進十格果盤（C）', '點小恐龍低頭，把頭上的果子倒進果窩；湊十就收成'),
]


def board(phone, tablet):
    """說明板：左手機、右平板，同高並排＋下方編號說明。"""
    Hh = 1500
    p = phone.resize((round(phone.width * Hh / phone.height), Hh), Image.LANCZOS)
    tw = round(tablet.width * Hh * .66 / tablet.height); t = tablet.resize((tw, round(Hh * .66)), Image.LANCZOS)
    W = p.width + t.width + 3 * 70
    top = Image.new('RGB', (W, Hh + 140), (22, 77, 57)); d = ImageDraw.Draw(top)
    fl = ImageFont.truetype(ob.FONT, 40)
    top.paste(p.convert('RGB'), (70, 110)); top.paste(t.convert('RGB'), (140 + p.width, 110))
    d.text((70, 40), '手機直式 1080×2340', font=fl, fill=ob.GOLD)
    d.text((140 + p.width, 40), '平板橫式 2048×1536', font=fl, fill=ob.GOLD)
    fn = ImageFont.truetype(ob.FONT, 32)
    tips = ['• 物件放大：伊奇身高≈畫面高 21%（手機）／31%（平板）',
            '• 背景只留天空、淡丘、草帶、土路；不放其他樹與房子',
            '• 互動點離邊緣≥90px；手機上下避開狀態列與 Home 條',
            '• 手機：樹在上、角色在中、果盤在拇指區（下方）',
            '• 平板：樹在左、角色在中、果盤在右下（右手拇指）']
    for i, s in enumerate(tips): d.text((140 + p.width, 110 + t.height + 50 + i * 62), s, font=fn, fill=(198, 226, 206))
    return ob.panel(top, 'A＋C｜大樹下搶接 × 頭頂疊疊樂', '搖樹掉果子、小恐龍跑去用頭接、疊高高會晃掉，最後倒進十格果盤', NOTES)


if __name__ == '__main__':
    ph, tb = frame(1080, 2340, PHONE), frame(2048, 1536, TABLET)
    ph.convert('RGB').save(OUT / 'AC_phone.jpg', quality=88); tb.convert('RGB').save(OUT / 'AC_tablet.jpg', quality=88)
    board(ph, tb).save(OUT / 'board_AC.jpg', quality=86)
    print(OUT / 'board_AC.jpg')
