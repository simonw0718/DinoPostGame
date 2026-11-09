#!/usr/bin/env python3
"""恐龍果園「訂單木箱」概念圖（導演 2026-11-07：A＋C 太複雜看不出算數 → 訂單卡＋搖樹＋拖果子進木箱＋點箱數數）。

玩法：訂單卡畫出要幾顆（剪影）→ 搖樹掉果子 → 手指把果子拖進木箱（箱內自由堆疊）→ 點木箱逐顆亮＋唸數。
小恐龍只當觀眾（站旁邊看、歡呼），不計數、不擋果子。
遠古果子 5 種（原創、剪紙紙材＋白邊）：火焰 flame／星點 star／斑點 dot／尖刺 spike／雙色 duo。
木箱：手機版 crate_tilt＝真 3D 方箱透視（v6）；平板版 crate＝借 tray 正面木紋的舊正面箱。
來源唯讀：恐龍郵局製作庫 kidgame_orchard 零件、角色矩陣卡；共用 orchard_board／orchard_frames 函式。
執行：python3 tools/orchard_crate.py → art-source/orchard/crate_fruits.jpg、crate_phone.jpg、crate_tablet.jpg、board_crate.jpg
"""
import math, random
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops
import orchard_board as ob
import orchard_frames as of

OUT = ob.OUT
SS = 4                                       # 超取樣倍數（畫完縮小，邊緣平滑）
EDGE = (255, 253, 243, 255)
_g = None


def grain():
    global _g
    if _g is None: _g = of.grain((1200, 1200))
    return _g


# ---------- 遠古果子 ----------
FRUITS = {
    'flame':  dict(name='火焰果', body=(52, 118, 214), hi=(160, 214, 255)),
    'star':   dict(name='星點果', body=(122, 78, 178), hi=(255, 226, 96)),
    'dot':    dict(name='斑點果', body=(218, 58, 48), hi=(255, 226, 206)),
    'spike':  dict(name='尖刺果', body=(232, 82, 140), hi=(255, 196, 214)),
    'duo':    dict(name='雙色果', body=(84, 168, 84), hi=(255, 206, 70)),
}


def _star(cx, cy, r, n=5, k=.45, a0=-math.pi / 2):
    return [(cx + (r if i % 2 == 0 else r * k) * math.cos(a0 + i * math.pi / n), cy + (r if i % 2 == 0 else r * k) * math.sin(a0 + i * math.pi / n)) for i in range(2 * n)]


def _papered(mask, col, seed):
    """mask 範圍填紙色＋紙紋。"""
    W, H = mask.size; g = grain()
    ox, oy = random.Random(seed).randint(0, g.width - W), random.Random(seed + 1).randint(0, g.height - H)
    lift = g.crop((ox, oy, ox + W, oy + H)).point(lambda v: max(0, min(255, 128 + (v - 128) * 2)))
    tex = ImageChops.overlay(Image.new('RGB', (W, H), col[:3]), Image.merge('RGB', [lift] * 3)).convert('RGBA')
    out = Image.new('RGBA', (W, H)); out.paste(tex, (0, 0), mask)
    return out


def make_fruit(kind, size=140, seed=0):
    """回傳 RGBA 果子（外框約 size×size，含白邊與小影子）。"""
    S = size * SS; c = S / 2; r = S * .36
    spec = FRUITS[kind]; body, hi = spec['body'], spec['hi']
    m = Image.new('L', (S, S)); d = ImageDraw.Draw(m)
    if kind == 'flame':            # 水滴身＋頂端三道火舌
        d.ellipse((c - r, c - r * .75, c + r, c + r * 1.15), fill=255)
        for dx, h in ((-.42, .95), (0, 1.35), (.42, .95)):
            x = c + dx * r
            d.polygon([(x - r * .38, c - r * .2), (x + dx * r * .25, c - r * h), (x + r * .38, c - r * .2)], fill=255)
    elif kind == 'spike':          # 圓身＋一圈三角刺
        d.ellipse((c - r * .86, c - r * .86, c + r * .86, c + r * .86), fill=255)
        d.polygon(_star(c, c, r * 1.12, n=9, k=.72), fill=255)
    elif kind == 'dot':         # 橢圓（瓜形）
        d.ellipse((c - r * 1.08, c - r * .84, c + r * 1.08, c + r * .92), fill=255)
    else:                          # star／duo：圓
        d.ellipse((c - r, c - r * .92, c + r, c + r * 1.0), fill=255)
    m = m.filter(ImageFilter.GaussianBlur(SS * .6)).point(lambda v: 255 if v > 127 else 0)
    fill = _papered(m, body, seed)
    dd = ImageDraw.Draw(fill)
    clip = lambda layer: Image.composite(layer, Image.new('RGBA', (S, S)), m)
    deco = Image.new('RGBA', (S, S)); q = ImageDraw.Draw(deco)
    if kind == 'flame':            # 內焰
        q.ellipse((c - r * .5, c - r * .1, c + r * .5, c + r * .85), fill=hi + (255,))
        q.polygon([(c - r * .3, c + r * .1), (c, c - r * .75), (c + r * .3, c + r * .1)], fill=hi + (255,))
    elif kind == 'star':           # 黃色小星點
        rnd = random.Random(seed + 9)
        for i, (ax, ay, rr) in enumerate(((-.45, -.35, .2), (.38, -.42, .16), (.05, .1, .22), (-.4, .45, .15), (.48, .35, .17), (.1, -.7, .12))):
            q.polygon(_star(c + ax * r, c + ay * r, rr * r, a0=rnd.uniform(0, 1)), fill=hi + (255,))
    elif kind == 'dot':            # 淺色斑點（大小不一）
        for ax, ay, rr in ((-.5, -.3, .17), (.15, -.5, .13), (.55, -.15, .16), (-.15, .15, .2), (.45, .45, .13), (-.6, .4, .12), (.05, .62, .1)):
            q.ellipse((c + ax * r - rr * r, c + ay * r - rr * r, c + ax * r + rr * r, c + ay * r + rr * r), fill=hi + (255,))
    elif kind == 'spike':          # 粉色淡心＋小點
        q.ellipse((c - r * .5, c - r * .5, c + r * .5, c + r * .5), fill=hi + (255,))
        for a in range(6):
            q.ellipse((c + r * .27 * math.cos(a) - r * .07, c + r * .27 * math.sin(a) - r * .07, c + r * .27 * math.cos(a) + r * .07, c + r * .27 * math.sin(a) + r * .07), fill=body + (255,))
    elif kind == 'duo':            # 斜切一半黃
        q.polygon([(c + r * 1.4, c - r * 1.4), (c + r * 1.4, c + r * 1.4), (c - r * 1.4, c + r * 1.4)], fill=hi + (255,))
    fill.alpha_composite(clip(deco))
    # 高光點（同 kidgame 蘋果）＋短梗小葉（火焰／尖刺不加梗）
    hl = Image.new('RGBA', (S, S)); h = ImageDraw.Draw(hl)
    h.ellipse((c - r * .62, c - r * .5, c - r * .32, c - r * .2), fill=(255, 255, 255, 230))
    fill.alpha_composite(clip(hl))
    stem = Image.new('L', (S, S)); st = ImageDraw.Draw(stem)
    if kind in ('star', 'dot', 'duo'):
        top = c - (r * .84 if kind == 'dot' else r * .92)
        st.line([(c, top + r * .1), (c + r * .05, top - r * .32)], fill=255, width=round(r * .13))
        lf = [(c + r * .06, top - r * .22), (c + r * .5, top - r * .48), (c + r * .3, top - r * .12)]
        st.polygon(lf, fill=255)
    full = ImageChops.lighter(m, stem)
    edge = full.filter(ImageFilter.MaxFilter(2 * round(SS * 2.2) + 1))
    out = Image.new('RGBA', (S, S))
    sh = Image.new('RGBA', (S, S), (30, 40, 30, 90)); out.paste(sh, (round(SS * 3), round(SS * 4)), edge.filter(ImageFilter.GaussianBlur(SS * 2)))
    out.paste(Image.new('RGBA', (S, S), EDGE), (0, 0), edge)
    sp = Image.new('RGBA', (S, S)); ImageDraw.Draw(sp)
    if kind in ('star', 'dot', 'duo'):
        out.paste(Image.new('RGBA', (S, S), (110, 70, 34, 255)), (0, 0), stem)
        lfm = Image.new('L', (S, S)); ImageDraw.Draw(lfm).polygon(lf, fill=255)
        out.paste(Image.new('RGBA', (S, S), (60, 160, 90, 255)), (0, 0), lfm)
    out.alpha_composite(fill)
    return out.resize((size, size), Image.LANCZOS)


_fc = {}


def fruit(base, kind, cx, cy, size, rot=0, seed=0, dim=False):
    k = (kind, size, seed)
    if k not in _fc: _fc[k] = make_fruit(kind, size, seed)
    im = _fc[k]
    if rot: im = im.rotate(rot, expand=True, resample=Image.BICUBIC)
    if dim:                         # 訂單卡上的剪影
        a = im.getchannel('A'); im = Image.new('RGBA', im.size, (90, 84, 76, 255)); im.putalpha(a.point(lambda v: v * .55))
    base.alpha_composite(im, (round(cx - im.width / 2), round(cy - im.height / 2)))


# ---------- 果樹：蘋果蓋成遠古果子 ----------
def tree(base, cx, by, s, kinds, seed=3):
    """畫 kidgame 果樹；樹冠上的紅蘋果用紅色偵測找中心，蓋上遠古果子（依 kinds 輪流）。"""
    ob.prop(base, 'tree', cx, by, s)
    im, box = ob.layer('kidgame_orchard', 'tree')
    px = im.crop(box).load(); W, H = box[2] - box[0], box[3] - box[1]
    seen = set(); blobs = []
    for y in range(0, H, 3):
        for x in range(0, W, 3):
            if (x, y) in seen: continue
            r, g, b, a = px[x, y]
            if a > 200 and r > 170 and g < 90 and b < 90:
                stack, pts = [(x, y)], []
                while stack:
                    p = stack.pop()
                    if p in seen or not (0 <= p[0] < W and 0 <= p[1] < H): continue
                    rr, gg, bb, aa = px[p]
                    if not (aa > 200 and rr > 170 and gg < 90 and bb < 90): continue
                    seen.add(p); pts.append(p)
                    stack += [(p[0] + 3, p[1]), (p[0] - 3, p[1]), (p[0], p[1] + 3), (p[0], p[1] - 3)]
                if len(pts) > 30:
                    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
                    blobs.append(((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, max(max(xs) - min(xs), max(ys) - min(ys))))
    ox, oy = cx - W * s / 2, by - H * s
    rnd = random.Random(seed)
    for i, (x, y, d) in enumerate(sorted(blobs, key=lambda b: (b[1], b[0]))):
        fruit(base, kinds[i % len(kinds)], ox + x * s, oy + (y + d * .05) * s, round(d * s * 1.75 * 1.5), rot=rnd.uniform(-15, 15), seed=i)
    return len(blobs)


# ---------- 木箱 ----------
def crate_parts():
    """從 tray 零件切出正面木紋（含白邊）；回傳 (front RGBA)。"""
    im, _ = ob.layer('kidgame_orchard', 'tray')
    return im.crop((928, 826, 1474, 1000))


def crate_back(base, cx, by, w, h_front, h_back):
    """後牆＋箱內暗底（畫在果子之前）。回傳箱內可放果子的範圍 (L, R, floor)。"""
    front = crate_parts()
    back = front.resize((round(w * .94), h_back), Image.LANCZOS)
    back = ImageChops.multiply(back, Image.new('RGBA', back.size, (150, 128, 108, 255)))
    back.putalpha(front.getchannel('A').resize(back.size))
    top = by - h_front                                   # 前牆上緣
    base.alpha_composite(back, (round(cx - back.width / 2), round(top + h_front * .15 - h_back)))
    return (cx - w * .44, cx + w * .44, top + h_front * .2)


def crate_front(base, cx, by, w, h_front):
    f = crate_parts().resize((w, h_front), Image.LANCZOS)
    base.alpha_composite(f, (round(cx - w / 2), round(by - h_front)))


def pile(n, L, R, floor, r, seed=1):
    """箱內自由堆疊：每顆從隨機 x 落下，在 ±r 範圍內滾到最低的可停位置（貪婪落圓）。回傳中心列表（落下順序）。"""
    rnd = random.Random(seed); out = []
    for _ in range(n):
        x0 = rnd.uniform(L + r, R - r); best = None
        for x in [x0 + dx for dx in range(-round(r * 1.2), round(r * 1.2) + 1, 3)]:
            if not (L + r <= x <= R - r): continue
            y = floor - r
            for (px, py) in out:
                dx = abs(x - px)
                if dx < 2 * r: y = min(y, py - math.sqrt((2 * r) ** 2 - dx * dx))
            if best is None or y > best[1] + .5: best = (x, y)
        out.append(best)
    return out


def crate(base, cx, by, w, contents, fsize, seed=1, counted=0, font=None):
    """完整木箱：後牆 → 果堆 → 前牆 → 數數亮圈（前 counted 顆）。contents＝種類列表。回傳果子中心。"""
    h_front, h_back = round(w * .3), round(w * .26)
    L, R, floor = crate_back(base, cx, by, w, h_front, h_back)
    pts = pile(len(contents), L, R, floor, fsize * .36, seed)
    rnd = random.Random(seed + 5)
    if counted:
        glow = Image.new('RGBA', base.size); gd = ImageDraw.Draw(glow)
        for (x, y) in pts[:counted]: gd.ellipse((x - fsize * .55, y - fsize * .55, x + fsize * .55, y + fsize * .55), fill=(255, 238, 120, 200))
        base.alpha_composite(glow.filter(ImageFilter.GaussianBlur(fsize * .12)))
    for k, (x, y) in zip(contents, pts): fruit(base, k, x, y, fsize, rot=rnd.uniform(-25, 25), seed=hash(k) % 5)
    crate_front(base, cx, by, w, h_front)
    return pts


def _wood(size, mul, seed=0):
    """把 tray 正面木紋拉成指定大小並調暗（multiply 色）。"""
    t = crate_parts().resize(size, Image.LANCZOS).convert('RGBA')
    return ImageChops.multiply(t, Image.new('RGBA', size, mul + (255,)))


def _poly_paste(base, tex, poly, ox, oy):
    m = Image.new('L', tex.size, 0); ImageDraw.Draw(m).polygon([(x - ox, y - oy) for x, y in poly], fill=255)
    tex = tex.copy(); tex.putalpha(m); base.alpha_composite(tex, (round(ox), round(oy)))


def scatter(n, poly_y0, poly_y1, half_w, cx, r, seed=1):
    """俯視箱底散放：在梯形箱底內隨機找不重疊位置（允許輕微相疊＝堆起來）；後排先畫。"""
    rnd = random.Random(seed); out = []
    (y0, w0), (y1, w1) = (poly_y0, half_w[0]), (poly_y1, half_w[1])
    for _ in range(n):
        best = None
        for _ in range(200):
            y = rnd.uniform(y0 + r * .9, y1 - r * .7)
            hw = w0 + (w1 - w0) * (y - y0) / (y1 - y0) - r * .9
            x = rnd.uniform(cx - hw, cx + hw)
            dmin = min([math.dist((x, y), q) for q in out] or [9e9])
            if best is None or dmin > best[0]: best = (dmin, (x, y))
            if dmin > r * 1.75: break
        out.append(best[1])
    return out


def _proj_box(yaw=0, pitch=56, dist=3.4):
    """回傳 3D→2D 投影函式（單位：箱寬=1；相機在前上方、略偏右，看得到右外牆）。"""
    cy_, sy_ = math.cos(math.radians(yaw)), math.sin(math.radians(yaw))
    cp, sp = math.cos(math.radians(pitch)), math.sin(math.radians(pitch))
    def P(x, y, z):
        x, z = x * cy_ + z * sy_, -x * sy_ + z * cy_           # 繞 y 軸
        y, z = y * cp - z * sp, y * sp + z * cp                # 繞 x 軸（往下看）
        k = dist / (dist - z)                                  # 透視
        return (x * k, -y * k, k)
    return P


def crate_tilt(base, cx, by, w, contents, fsize, seed=1, counted=0, font=None, depth=.5, yaw=0, layer='all', slots=None):
    """真透視方木箱（2026-11-07 v6）：正方形箱口、四面牆有厚度，3D 投影算出每一面；
    相機在前上方偏右 → 看得到箱底、內後牆、內左牆、外前牆、外右牆與四邊箱緣頂面。
    by＝箱子畫面最低點，w＝箱子畫面寬。回傳果子畫面中心（左→右＝數數順序）。
    layer：'back'＝只畫白邊＋箱內（果子層之下）、'front'＝只畫外牆＋箱緣（果子層之上）；網頁遊戲分層用（orchard_export.py）。
    slots：傳入 3D (x, z) 列表時，改把每格的畫面座標與縮放比寫進 slots_out（同列表順序）。"""
    Hb, t = .22, .05                                  # 箱高、牆厚（箱寬＝1；箱深＝depth，導演 11-07 v7：放正、橫向拉長）
    P = _proj_box(yaw=yaw)
    o, i = .5, .5 - t
    D = depth / 2; j = D - t                          # z 方向外／內半深
    corners = [(x, y, z) for x in (-o, o) for y in (0, Hb) for z in (-D, D)]
    pr = [P(*c) for c in corners]
    x0, x1 = min(q[0] for q in pr), max(q[0] for q in pr); ymax = max(q[1] for q in pr)
    S = w / (x1 - x0); ox = cx - (x0 + x1) / 2 * S; oy = by - ymax * S
    def V(x, y, z):
        q = P(x, y, z); return (ox + q[0] * S, oy + q[1] * S)
    lw = max(3, round(w * .005)); seam = (96, 62, 34, 210)
    def fill(poly, col, sd):
        xs, ys = [q[0] for q in poly], [q[1] for q in poly]
        bx, byy = math.floor(min(xs)), math.floor(min(ys))
        m = Image.new('L', (math.ceil(max(xs)) - bx + 1, math.ceil(max(ys)) - byy + 1), 0)
        ImageDraw.Draw(m).polygon([(x - bx, y - byy) for x, y in poly], fill=255)
        base.alpha_composite(_papered(m, col, sd), (bx, byy))
    def visible(poly):                                  # 畫面上順時針＝朝向相機
        a = sum(poly[k][0] * poly[(k + 1) % len(poly)][1] - poly[(k + 1) % len(poly)][0] * poly[k][1] for k in range(len(poly)))
        return a > 0
    def planks(c0, c1, c2, c3, n):                      # 面上木板縫：沿 c0→c3／c1→c2 等分
        d = ImageDraw.Draw(base)
        for k in range(1, n):
            f = k / n
            a = [c0[j] + (c3[j] - c0[j]) * f for j in range(3)]; b = [c1[j] + (c2[j] - c1[j]) * f for j in range(3)]
            d.line([V(*a), V(*b)], fill=seam, width=lw)
    crate_tilt.slots_out = [(*V(x, .13, z), P(x, .13, z)[2] / P(0, .13, 0)[2]) for x, z in (slots or [])]
    crate_tilt.inner = (.5 - t, depth / 2 - t)
    # 0) 白邊剪影（外輪廓凸包外擴）
    if layer != 'front':
        sil = [V(*c) for c in corners]
        cxm, cym = sum(q[0] for q in sil) / 8, sum(q[1] for q in sil) / 8
        sil.sort(key=lambda q: math.atan2(q[1] - cym, q[0] - cxm))
        hull = []
        for q in sorted(sil):
            while len(hull) >= 2 and (hull[-1][0]-hull[-2][0])*(q[1]-hull[-2][1])-(hull[-1][1]-hull[-2][1])*(q[0]-hull[-2][0]) <= 0: hull.pop()
            hull.append(q)
        lower = []
        for q in reversed(sorted(sil)):
            while len(lower) >= 2 and (lower[-1][0]-lower[-2][0])*(q[1]-lower[-2][1])-(lower[-1][1]-lower[-2][1])*(q[0]-lower[-2][0]) <= 0: lower.pop()
            lower.append(q)
        hull = hull[:-1] + lower[:-1]
        sh = Image.new('RGBA', base.size); sd_ = ImageDraw.Draw(sh)
        sd_.polygon([(x + w * .02, y + w * .03) for x, y in hull], fill=(20, 40, 30, 80))
        base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(w * .015)))
        ImageDraw.Draw(base).polygon(hull, fill=EDGE)
        ImageDraw.Draw(base).line(hull + [hull[0]], fill=EDGE, width=round(w * .022), joint='curve')
        # 1) 箱內：底板 → 內牆（只畫朝向相機的）
        fl = [(-i, 0, -j), (i, 0, -j), (i, 0, j), (-i, 0, j)]
        fill([V(*c) for c in fl], (128, 86, 50), seed + 3)
        planks((-i, 0, -j), (i, 0, -j), (i, 0, j), (-i, 0, j), 4)
        inner = {  # 內牆四角（底兩點→頂兩點），法向朝箱內
            'back':  [(-i, 0, -j), (i, 0, -j), (i, Hb, -j), (-i, Hb, -j)],
            'front': [(i, 0, j), (-i, 0, j), (-i, Hb, j), (i, Hb, j)],
            'left':  [(-i, 0, j), (-i, 0, -j), (-i, Hb, -j), (-i, Hb, j)],
            'right': [(i, 0, -j), (i, 0, j), (i, Hb, j), (i, Hb, -j)],
        }
        shade = {'back': (176, 126, 76), 'left': (150, 104, 62), 'right': (150, 104, 62), 'front': (140, 96, 58)}
        for k, q in inner.items():
            poly = [V(*c) for c in q]
            if not visible(poly[::-1]): continue
            fill(poly, shade[k], seed + 4 + len(k)); planks(q[0], q[1], q[2], q[3], 3)
    # 2) 果子：放在箱底（3D 散放），依深度遠→近畫
    rnd = random.Random(seed); r3 = .13; pts3 = []
    for _ in contents:
        best = None
        for _ in range(300):
            x, z = rnd.uniform(-i + r3, i - r3), rnd.uniform(-j + r3 * .8, j - r3 * .8)
            dm = min([math.hypot(x - a, z - b) for a, b in pts3] or [9])
            if best is None or dm > best[0]: best = (dm, (x, z))
            if dm > r3 * 2.1: break
        pts3.append(best[1])
    k0 = P(0, r3, 0)[2]
    items = sorted([(P(x, r3, z)[2], V(x, r3, z)) for x, z in pts3])          # 遠（k 小）先畫
    cnt = sorted([q for _, q in items], key=lambda q: q[0])[:counted]
    if counted:
        glow = Image.new('RGBA', base.size); gd = ImageDraw.Draw(glow)
        for (x, y) in cnt: gd.ellipse((x - fsize * .55, y - fsize * .55, x + fsize * .55, y + fsize * .55), fill=(255, 238, 120, 200))
        base.alpha_composite(glow.filter(ImageFilter.GaussianBlur(fsize * .12)))
    rr = random.Random(seed + 5)
    for (kk, (x, y)), kind in zip(items, contents):
        fruit(base, kind, x, y, round(fsize * kk / k0), rot=rr.uniform(-25, 25), seed=hash(kind) % 5)
    if layer != 'back':
        # 3) 外牆（朝向相機的）
        outer = {
            'front': [(-o, 0, D), (o, 0, D), (o, Hb, D), (-o, Hb, D)],
            'back':  [(o, 0, -D), (-o, 0, -D), (-o, Hb, -D), (o, Hb, -D)],
            'right': [(o, 0, D), (o, 0, -D), (o, Hb, -D), (o, Hb, D)],
            'left':  [(-o, 0, -D), (-o, 0, D), (-o, Hb, D), (-o, Hb, -D)],
        }
        oshade = {'front': (214, 166, 104), 'right': (178, 132, 80), 'left': (178, 132, 80), 'back': (190, 144, 90)}
        for k, q in outer.items():
            poly = [V(*c) for c in q]
            if not visible(poly[::-1]): continue
            fill(poly, oshade[k], seed + 10 + len(k)); planks(q[0], q[1], q[2], q[3], 3)
            ImageDraw.Draw(base).line(poly + [poly[0]], fill=seam, width=lw)
        # 4) 箱緣頂面（四條，最亮）
        rim = [
            [(-o, Hb, -D), (o, Hb, -D), (i, Hb, -j), (-i, Hb, -j)],
            [(o, Hb, -D), (o, Hb, D), (i, Hb, j), (i, Hb, -j)],
            [(o, Hb, D), (-o, Hb, D), (-i, Hb, j), (i, Hb, j)],
            [(-o, Hb, D), (-o, Hb, -D), (-i, Hb, -j), (-i, Hb, j)],
        ]
        for n, q in enumerate(rim):
            poly = [V(*c) for c in q]
            fill(poly, (236, 196, 136), seed + 20 + n); ImageDraw.Draw(base).line(poly + [poly[0]], fill=seam, width=lw)
    return [q for _, q in items]


# ---------- 訂單卡 ----------
def order_card(base, x, y, w, need, have, fsize, font):
    """紙卡：每格一顆要的果子；已放進箱的格亮彩色＋打勾感白圈，其餘灰剪影。need＝種類列表，have＝已完成數（依序）。"""
    n = len(need); pad = fsize * .25; h = round(fsize * 1.35)
    card = Image.new('RGBA', base.size); cd = ImageDraw.Draw(card)
    cd.rounded_rectangle((x + 8, y + 10, x + w + 8, y + h + 10), radius=24, fill=(20, 40, 30, 70))
    base.alpha_composite(card.filter(ImageFilter.GaussianBlur(6)))
    m = Image.new('L', base.size); ImageDraw.Draw(m).rounded_rectangle((x, y, x + w, y + h), radius=24, fill=255)
    base.paste(Image.new('RGBA', base.size, EDGE), (0, 0), m.filter(ImageFilter.MaxFilter(11)))
    base.paste(of.paper(base.size, (250, 236, 200), of.grain(base.size)), (0, 0), m)
    d = ImageDraw.Draw(base)
    d.rounded_rectangle((x, y, x + w, y + 14), radius=7, fill=ob.RED)             # 郵局紅色封條
    step = (w - 2 * pad) / n
    for i, k in enumerate(need):
        cx, cy = x + pad + step * (i + .5), y + h / 2 + 6
        d.ellipse((cx - fsize * .44, cy - fsize * .44, cx + fsize * .44, cy + fsize * .44), outline=(196, 170, 130), width=4)
        fruit(base, k, cx, cy, round(fsize * .82), seed=hash(k) % 5, dim=i >= have)
    return (x, y, x + w, y + h)


def drag(base, pts, line=8, hand=True):
    ov = Image.new('RGBA', base.size); o = ImageDraw.Draw(ov)
    ob.dashed(o, pts, w=line, dash=line * 3, gap=line * 2)
    base.alpha_composite(ov)
    if hand:
        d = ImageDraw.Draw(base); x, y = pts[0]
        d.ellipse((x - 34, y - 34, x + 34, y + 34), fill=(255, 255, 255, 200), outline=ob.RED + (255,), width=7)


def cheer_sign(d, x, y, s):
    """觀眾歡呼小標示（放射短線，不放字）。"""
    for a in (-2.4, -1.57, -.7):
        d.line([(x + s * .6 * math.cos(a), y + s * .6 * math.sin(a)), (x + s * math.cos(a), y + s * math.sin(a))], fill=(255, 255, 255, 240), width=max(5, round(s * .1)))


# ---------- 畫面 ----------
def phone():
    """手機直式 1080×2340｜等級 2：訂單要 5 顆火焰果，木箱已有 3 顆 → 點木箱數 1、2、3，還差 2。"""
    W, H = 1080, 2340
    img = of.backdrop(W, H, 1250, 1430, 1700)
    fb = ImageFont.truetype(ob.FONT, 40); fn = ImageFont.truetype(ob.FONT, 42)
    order_card(img, 150, 150, 780, ['flame'] * 5, 3, 140, fb)
    tree(img, 540, 1520, 1.12, ['flame', 'flame', 'star', 'flame', 'dot'])
    # 掉在地上、等著拖的果子
    ob.UNIT = 470
    ob.char(img, 'xiaokong', 'stand', 'happy', 140, 1720, 1.0, mirror=False)
    ob.char(img, 'iggy', 'stand', 'surprised', 950, 1740, 1.0, mirror=True)
    fruit(img, 'flame', 340, 1560, 225, rot=-15, seed=1); fruit(img, 'flame', 640, 1600, 225, rot=20, seed=2)
    fruit(img, 'star', 760, 1430, 225, rot=8, seed=3)
    crate_tilt(img, 540, 2270, 900, ['flame'] * 3, 200, seed=4, counted=3, font=fb)
    drag(img, [(640, 1600), (600, 1780), (560, 1960)])
    d = ImageDraw.Draw(img); ob.sway(d, 540, 360 + 250, 170)
    cheer_sign(d, 140, 1330, 80); cheer_sign(d, 950, 1230, 80)
    for n, (x, y) in enumerate([(110, 200), (110, 600), (790, 1610), (90, 2010)], 1): ob.num(d, n, x, y, fn)
    return img


def tablet():
    """平板橫式 2048×1536｜等級 3：訂單 2 火焰＋1 星點，木箱已有 2 火焰 → 正在拖星點果。"""
    W, H = 2048, 1536
    img = of.backdrop(W, H, 760, 900, 1200)
    fb = ImageFont.truetype(ob.FONT, 40); fn = ImageFont.truetype(ob.FONT, 42)
    tree(img, 520, 1260, 1.08, ['star', 'flame', 'dot', 'flame', 'duo'])
    fruit(img, 'star', 860, 1290, 225, rot=10, seed=1); fruit(img, 'dot', 250, 1340, 225, rot=-20, seed=2)
    fruit(img, 'flame', 600, 1380, 225, rot=25, seed=3)
    order_card(img, 1220, 110, 620, ['flame', 'flame', 'star'], 2, 150, fb)
    ob.UNIT = 470
    ob.char(img, 'yuanyuan', 'stand', 'happy', 1010, 1200, 1.0, mirror=True)
    ob.char(img, 'xiaokong', 'stand', 'surprised', 1935, 1080, 1.0, mirror=True)
    crate_tilt(img, 1480, 1500, 860, ['flame', 'flame'], 200, seed=2)
    drag(img, [(860, 1290), (1050, 930), (1450, 1050)])
    fruit(img, 'star', 1300, 900, 225, rot=-6, seed=1)
    d = ImageDraw.Draw(img); ob.sway(d, 520, 240, 180)
    for n, (x, y) in enumerate([(1180, 150), (140, 160), (720, 1240), (1120, 1250)], 1): ob.num(d, n, x, y, fn)
    return img


def fruit_sheet():
    """遠古果子設計稿：5 種並排＋名稱。"""
    W, H = 1600, 520
    img = of.paper((W, H), (245, 236, 210), of.grain((W, H)))
    d = ImageDraw.Draw(img); f = ImageFont.truetype(ob.FONT, 46); fs = ImageFont.truetype(ob.FONT, 30)
    d.text((60, 40), '遠古果子 5 種（原創、紙材白邊；只用顏色＋形狀分辨，不靠字）', font=f, fill=ob.INK)
    tips = {'flame': '藍身＋三道火舌', 'star': '紫身＋黃星點', 'dot': '紅色瓜形＋淺色斑點', 'spike': '桃紅＋一圈尖刺', 'duo': '綠黃斜切雙色'}
    for i, k in enumerate(FRUITS):
        x = 180 + i * 310
        fruit(img, k, x, 270, 220, seed=0)
        d.text((x, 420), FRUITS[k]['name'], font=f, fill=ob.INK, anchor='mm')
        d.text((x, 470), tips[k], font=fs, fill=(110, 96, 70), anchor='mm')
    return img


NOTES = [
    (1, '訂單卡', '灰剪影＝要幾顆；放進箱就亮一格，看得到還差幾顆'),
    (2, '搖樹', '左右搖樹冠，一次掉 1–2 顆；有好幾種，要挑對的'),
    (3, '拖進木箱', '把地上的果子拖進箱；箱內自由堆疊、滾到低處'),
    (4, '點木箱數數', '逐顆亮起＋唸數；和訂單比，答錯不打叉、陪著重數'),
]


def board(ph, tb, fs):
    Hh = 1500
    p = ph.resize((round(ph.width * Hh / ph.height), Hh), Image.LANCZOS)
    tw = round(tb.width * Hh * .62 / tb.height); t = tb.resize((tw, round(Hh * .62)), Image.LANCZOS)
    W = p.width + t.width + 3 * 70
    top = Image.new('RGB', (W, Hh + 140), (22, 77, 57)); d = ImageDraw.Draw(top)
    fl = ImageFont.truetype(ob.FONT, 40)
    top.paste(p.convert('RGB'), (70, 110)); top.paste(t.convert('RGB'), (140 + p.width, 110))
    d.text((70, 40), '手機直式｜等級 2：要 5 有 3', font=fl, fill=ob.GOLD)
    d.text((140 + p.width, 40), '平板橫式｜等級 3：2 火焰＋1 星點', font=fl, fill=ob.GOLD)
    fsr = fs.resize((t.width, round(fs.height * t.width / fs.width)), Image.LANCZOS)
    top.paste(fsr.convert('RGB'), (140 + p.width, 110 + t.height + 40))
    return ob.panel(top, '訂單木箱｜照單收果子', '看訂單 → 搖樹 → 拖進木箱 → 點箱數數；小恐龍只當觀眾', NOTES)


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    fs, ph, tb = fruit_sheet(), phone(), tablet()
    for name, im in (('crate_fruits', fs), ('crate_phone', ph), ('crate_tablet', tb), ('board_crate', board(ph, tb, fs))):
        p = OUT / f'{name}.jpg'; im.convert('RGB').save(p, quality=88); print(p)
