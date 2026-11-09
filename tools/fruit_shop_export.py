#!/usr/bin/env python3
"""小空果果店 v4 近景網頁素材（2026-11-09 可玩 sample；導演核准版面 art-source/orchard/fclose_board.jpg）。

把 fruit_closeup_layout.py 的草圖拆成網頁分層：
  sky_phone.webp／sky_tablet.webp        天空＋山丘（手機多遮雨棚）
  counter_phone.webp／counter_tablet.webp 櫃台（蓋住客人身體；layout.json 記 top）
  cust_<角色>_<反應>.webp                 客人近景（派洛／小雞阿暴／阿慢；happy／surprised／troubled／idle），layout.json cust 記頭部錨點
  xiaokong_<表情>.webp                    小空角落探頭（happy／surprised）
  basket_<種類>.webp、fruit_<種類>.webp   三個大果籃（dot 紅、star 紫、spike 粉）與單顆果子
  intro_back／intro_kong_<表情>_<嘴>／intro_front_<版>.webp  開場全景三層（導演 11-09：全景 → 小空開場白（表情＋說話嘴）→ 推近）
  xiaokong_<表情>_<嘴>.webp              角落小空說話用三種嘴
盒子、算式條、編號由網頁 CSS 畫（才能逐格動）。來源唯讀；輸出到 dist/assets/fruitshop/。
執行：python3 tools/fruit_shop_export.py
"""
import json
from PIL import Image
import orchard_board as ob
import orchard_frames as of
import orchard_crate as oc
import fruit_shop_concepts as fs
import fruit_basket_layout as fb
import fruit_closeup_layout as fc

OUT = ob.GAME / 'dist/assets/fruitshop'
KINDS = ('dot', 'star', 'spike')


def save(im, name, q=84):
    im.save(OUT / name, 'WEBP', quality=q, method=6)


def crop(im):
    box = im.getchannel('A').getbbox(); return im.crop(box), box


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    L = {'phone': {'W': 1080, 'H': 2340}, 'tablet': {'W': 2048, 'H': 1536}}

    # 背景與櫃台
    sky = of.backdrop(1080, 2340, 620, 760, 2000); fs.awning(sky, -60, h=150)
    save(sky.crop((0, 0, 1080, 980)).convert('RGB'), 'sky_phone.webp'); L['phone']['sky_h'] = 980
    sky = of.backdrop(2048, 1536, 380, 470, 1400)
    save(sky.crop((0, 0, 2048, 640)).convert('RGB'), 'sky_tablet.webp'); L['tablet']['sky_h'] = 640
    for k, (W, H, y0) in {'phone': (1080, 2340, 900), 'tablet': (2048, 1536, 560)}.items():
        c = Image.new('RGBA', (W, H), (0, 0, 0, 0)); fc.counter(c, y0)
        im, box = crop(c); save(im, f'counter_{k}.webp'); L[k]['counter'] = list(box)

    # 客人輪換（導演 11-09 ④）：頭佔 HEAD px、頭頂在 (CX, TOP)；記錄圖片相對錨點的位移（以頭高為單位）
    # 角色→{遊戲反應: (表情, 嘴型)}；矩陣缺的表情用最接近的代替（阿慢沒有 surprised／troubled → neutral；等太久 → sleepy）
    HEAD, CX, TOP = 420, 640, 150
    CAST = {
        'pairo': {'happy': ('happy', 'open'), 'surprised': ('surprised', 'open'), 'troubled': ('troubled', 'open')},
        'chick_abao': {'happy': ('happy', 'open'), 'surprised': ('surprised', 'open'), 'troubled': ('thinking', 'open')},
        'aman': {'happy': ('happy', 'open'), 'surprised': ('neutral', 'open'), 'troubled': ('neutral', 'closed'), 'idle': ('sleepy', 'closed')},
    }
    L['cust'] = {}
    for cid, roles in CAST.items():
        L['cust'][cid] = {}
        for role, (emo, mouth) in roles.items():
            c = Image.new('RGBA', (1400, 1800), (0, 0, 0, 0))
            ob.UNIT = HEAD * 2.6 / ob.SCALE[cid]
            ob.char(c, cid, 'stand', emo, CX, TOP + HEAD * 2.6, 1.0, mirror=True, mouth=mouth)
            im, box = crop(c); save(im, f'cust_{cid}_{role}.webp')
            L['cust'][cid][role] = [(box[0] - CX) / HEAD, (box[1] - TOP) / HEAD, im.width / HEAD]
    for old in OUT.glob('pairo_*.webp'): old.unlink()          # 11-09 前的舊檔名

    # 小空探頭：身高 SIZE、腳底在 (X, BY)
    SIZE, X, BY = 400, 300, 600
    L['xiaokong'] = {}
    for emo in ('happy', 'surprised'):                    # 每種表情三種嘴（說話輪替）；聯集框裁切，換嘴不跳；xiaokong_<表情>.webp＝open（舊名相容）
        ims = []
        for m in MOUTHS:
            c = Image.new('RGBA', (700, 700), (0, 0, 0, 0))
            ob.UNIT = SIZE / ob.SCALE['xiaokong']; ob.char(c, 'xiaokong', 'stand', emo, X, BY, 1.0, mouth=m); ims.append(c)
        ims, box = union_crop(ims)
        for m, im in zip(MOUTHS, ims): save(im, f'xiaokong_{emo}_{m}.webp')
        save(ims[1], f'xiaokong_{emo}.webp')
        L['xiaokong'][emo] = [(box[0] - X) / SIZE, (box[1] - BY) / SIZE, ims[0].width / SIZE]

    # 果籃（寬 BW、底在 by）與果子
    BW = 300; L['basket'] = {}
    for i, k in enumerate(KINDS):
        c = Image.new('RGBA', (500, 500), (0, 0, 0, 0)); fb.basket(c, 250, 460, BW, k, seed=i * 10)
        im, box = crop(c); save(im, f'basket_{k}.webp')
        L['basket'][k] = [(box[0] - 250) / BW, (box[1] - 460) / BW, im.width / BW]
        c = Image.new('RGBA', (300, 300), (0, 0, 0, 0)); oc.fruit(c, k, 150, 150, 220, seed=9)
        save(crop(c)[0], f'fruit_{k}.webp')

    # 開場全景（導演 11-09）：遮雨棚＋彩旗＋櫃台上三籃果子，小空站在攤位後；記錄推近焦點 focus（櫃台中央，畫布比例）
    for k, (W, H) in {'phone': (1080, 2340), 'tablet': (2048, 1536)}.items():
        L[k]['intro'] = intro(W, H, k)

    (OUT / 'layout.json').write_text(json.dumps(L, ensure_ascii=False, indent=1))
    print('ok', OUT)


MOUTHS = ('closed', 'open', 'wide')


def union_crop(ims):
    """同一組圖（只差表情／嘴）用聯集框裁切，網頁換圖時位置不跳。"""
    boxes = [im.getchannel('A').getbbox() for im in ims]
    box = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
    return [im.crop(box) for im in ims], box


def intro(W, H, k):
    """開場全景分三層（導演 11-09：小空要有表情變化＋影片流程的說話嘴）：
    intro_back（天空雨棚）→ intro_kong_<表情>_<嘴>（小空，說話時 closed/open/wide 輪替）→ intro_front（櫃台＋果籃，遮住小空下半身）。"""
    phone = k == 'phone'
    hill, grass, path = (1180, 1320, 1900) if phone else (560, 680, 1180)
    img = of.backdrop(W, H, hill, grass, path)
    fs.W, ow = W, fs.W                                     # 遮雨棚函式用模組寬度
    try: fs.awning(img, int(H * (.14 if phone else .08)), h=170, n=8 if phone else 12)
    finally: fs.W = ow
    save(img.convert('RGB'), f'intro_back_{k}.webp', q=82)
    ctop = int(H * .64)                                    # 櫃台上緣
    size = (W * .92) if phone else (H * .62)               # 小空身高：上半身露出櫃台
    ob.UNIT = size / ob.SCALE['xiaokong']
    names, ims = [], []
    for emo in ('happy', 'smug'):
        for m in MOUTHS:
            c = Image.new('RGBA', (W, H), (0, 0, 0, 0))
            ob.char(c, 'xiaokong', 'stand', emo, int(W / 2 - size * .14), ctop + int(size * .38), 1.0, mouth=m)
            names.append(f'{emo}_{m}'); ims.append(c)
    ims, box = union_crop(ims)
    for n, im in zip(names, ims): save(im, f'intro_kong_{n}_{k}.webp')
    front = Image.new('RGBA', (W, H), (0, 0, 0, 0)); fc.counter(front, ctop)   # 櫃台到底，遮住腳
    bw = W * (.27 if phone else .13)
    for i, kind in enumerate(KINDS):                      # 果籃排在櫃台前緣，中間那籃在小空胸前
        fb.basket(front, int(W / 2 + (i - 1) * bw * (1.18 if phone else 1.6)), ctop + int(bw * .55), int(bw), kind, seed=i * 10)
    fim, fbox = crop(front); save(fim, f'intro_front_{k}.webp')
    for old in OUT.glob(f'intro_{k}.webp'): old.unlink()   # 11-09 單張版
    return {'focus': [.5, (ctop + bw * .1) / H], 'kong': [box[0], box[1], box[2] - box[0]], 'front': [fbox[0], fbox[1], fbox[2] - fbox[0]]}


if __name__ == '__main__':
    main()
