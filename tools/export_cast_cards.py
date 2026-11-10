#!/usr/bin/env python3
"""把影片製作的核准角色卡匯出成首頁舞台用的小圖與 cast.json。

來源一律走恐龍郵局 `tools/media_catalog.py resolve`（帶白邊的 use_path 優先）；
新小恐龍走角色矩陣 `tools/card_stage/char_matrix.py resolve`（MATRIX_CAST），
身高用 `character_scale.json`，姿勢係數用 `card_meta.json`；本檔不改任何來源。
要換卡或加卡：只改下面 CAST 清單，再執行：
    python3 tools/export_cast_cards.py
"""
import json, subprocess, sys
from PIL import Image
from pathlib import Path

GAME = Path(__file__).resolve().parents[1]
STUDIO = GAME.parent / '恐龍郵局｜整體工作流處理'      # sibling production folder (split 2026-10-22)
OUT = GAME / 'dist/assets/cast'
MAX_H = 480                                           # 輸出圖高（px），webp 約 20–40KB

# 角色 → {用途: 卡片 id}。用途給首頁腳本挑動作：walk_r/walk_l 走路、run_r/run_l 跑、fly_r/fly_l 飛、
# 其餘是停下來做的事（busy_*）或對鏡頭的動作（hello、cheer）。缺某方向時首頁會鏡像另一方向。
# *_kg1 是 2026-10-20 開的補圖任務（gemini_plans/kidgame），入庫前會列為「缺」，首頁暫用鏡像。
# 小空 left__run_sprint__mirror01 實際朝右，不用；改由首頁鏡像 run_r。
CAST = {
  'iggy': {'walk_r':'iggy__right__walk_hold_parcel__e2n01', 'walk_l':'iggy__left__walk__kg1', 'run_r':'iggy__right__run_hold_parcel__n1',
           'busy_read':'iggy__left_3q__read_parcel__i2', 'busy_place':'iggy__right_3q__crouch_place__e2n15',
           'busy_write':'iggy__left_3q__crouch_write_note__e2n02', 'busy_look':'iggy__left_3q__squint_far__e2n22',
           'hello':'iggy__front__wave_happy__n6', 'cheer':'iggy__right_3q__stand_laugh__n11', 'point':'iggy__right_3q__point__g01'},
  'feifei': {'walk_r':'feifei__right__walk__n4', 'walk_parcel_r':'feifei__right__walk_hold_parcel__e2n06', 'run_r':'feifei__right__run__n4b',
             'fly_r':'fly_right', 'fly_l':'fly_left', 'busy_study':'feifei__right_3q__study__ff2', 'busy_talk':'feifei__left_3q__talk__cf1',
             'hello':'feifei__front__wave_inner_a__g02', 'cheer':'feifei__front__happy__e2', 'point':'feifei__left_3q__point_happy__n3'},
  'chick_abao': {'walk_l':'chick_abao__left_side__neutral__c01', 'walk_r':'chick_abao__right__walk__kg1', 'busy_sort':'chick_abao__front__sort_letter__g01',
                 'busy_letter':'chick_abao__front__letter__game01', 'busy_talk':'chick_abao__right_3q__talk__n1',
                 'hello':'chick_abao__front__wave_right_wing__g02', 'cheer':'chick_abao__front__chest_out_proud__n1', 'point':'chick_abao__front__point_finger__g01'},
  'xiaokong': {'run_r':'xiaokong__right__run_sprint__k2', 'leap_r':'xiaokong__right__run_leap__k2',
               'busy_look':'xiaokong__left_3q__point_attentive__cf1', 'hello':'xiaokong__front__happy__e1', 'cheer':'xiaokong__front__surprised__e1',
               'point':'xiaokong__right_3q__point__mirror01'},
}
# 2026-11-10 導演：人物只留伊奇、飛飛、小雞阿暴＋小恐龍（派洛等大人拿掉）。
# 新加入的小恐龍直接取角色矩陣格：角色 → {用途: (姿勢, 表情, 嘴)}；同角色各用途共用一個裁切框（換圖不跳），
# pose_factor＝框高÷站姿身高，所以畫面上的身高仍照 character_scale。
_KID = {'stand': ('stand', 'happy', 'closed'), 'walk_r': ('walk_a', 'happy', 'closed'),
        'hello': ('wave', 'happy', 'open'), 'cheer': ('cheer', 'happy', 'open')}
MATRIX_CAST = {c: dict(_KID) for c in ('yuanyuan', 'painuo', 'shanshan', 'shuoshuo', 'xiaokai', 'tailuo')}
REMOVED = ('pairo',)                                  # 舊匯出檔一併刪除

def resolve(char, key):
    if key.startswith('file:'):                     # 原檔遺失、改用素材庫裡現成衍生檔（例：飛飛飛行卡的 hd2x）
        path = key[5:]
        return ({'id': f'file:{path}', 'path': path}, None) if (STUDIO / path).exists() else (None, {'error': 'file_missing'})
    out = subprocess.run([sys.executable, 'tools/media_catalog.py', 'resolve', '--id', f'card:{char}/{key}'],
                         cwd=STUDIO, capture_output=True, text=True)
    try: data = json.loads(out.stdout)
    except ValueError: return None, {'error': (out.stderr or 'no output').strip()[-120:]}
    if data.get('error') or not data.get('path'): return None, data
    return data, None

def matrix_cell(char, pose, emo, mouth):
    out = subprocess.run([sys.executable, 'tools/card_stage/char_matrix.py', 'resolve', char, pose, emo, mouth],
                         cwd=STUDIO, capture_output=True, text=True)
    try: data = json.loads(out.stdout)
    except ValueError: return None, (out.stderr or out.stdout or 'no output').strip()[-120:]
    if data.get('error') or not data.get('path'): return None, data.get('error') or 'no path'
    return data, None


def export_matrix(char, uses, height, missing):
    """矩陣卡畫布留白大：以腳底 ground_y 對齊後取各用途的聯集外框裁切，加白邊（同舊卡 use_path 的規格），再縮到 MAX_H。"""
    sys.path.insert(0, str(STUDIO / 'tools/video'))
    from card_edge import add_edge, edge_px
    cells = {}
    for use, (pose, emo, mouth) in uses.items():
        rec, err = matrix_cell(char, pose, emo, mouth)
        if not rec: missing.append(f'{char}/{pose}__{emo}__{mouth}: {err}'); continue
        im = Image.open(STUDIO / rec['path']).convert('RGBA')
        if rec.get('mirror'): im = im.transpose(Image.FLIP_LEFT_RIGHT)
        cells[use] = (rec, im, im.getchannel('A').getbbox())
    if 'stand' not in cells: missing.append(f'{char}: 沒有站姿，無法定身高'); return {}
    g0 = cells['stand'][0]['ground_y']
    sb = cells['stand'][2]; stand_h = g0 - sb[1]
    # 各圖以腳底線對齊到 stand 的座標（dy＝該圖要下移多少）
    boxes = {u: (b[0], b[1] + g0 - r['ground_y'], b[2], b[3] + g0 - r['ground_y']) for u, (r, _, b) in cells.items()}
    x0, y0 = min(b[0] for b in boxes.values()), min(b[1] for b in boxes.values())
    x1, y1 = max(b[2] for b in boxes.values()), max(max(b[3] for b in boxes.values()), g0)
    px = edge_px(stand_h / height); poses = {}
    for use, (rec, im, _) in cells.items():
        dy = g0 - rec['ground_y']
        cut = Image.new('RGBA', (x1 - x0, y1 - y0), (0, 0, 0, 0)); cut.alpha_composite(im, (-x0, dy - y0)) if dy - y0 <= 0 and x0 >= 0 else cut.paste(im, (-x0, dy - y0))
        cut, pad = add_edge(cut, px)
        dst = OUT / f'{char}__{use}.webp'
        out = cut.resize((round(cut.width * MAX_H / cut.height), MAX_H), Image.LANCZOS)
        out.save(dst, 'WEBP', quality=84, method=6)
        poses[use] = {'src': f'assets/cast/{dst.name}', 'ratio': round(out.width / out.height, 4),
                      'pose_factor': round(cut.height / stand_h, 4), 'card': rec['id'], 'sha256': rec.get('sha256')}
    return poses


def main():
    scale = json.load(open(STUDIO / 'media_library/visual/cards/character_scale.json'))['characters']
    meta = json.load(open(STUDIO / 'media_library/visual/cards/card_meta.json'))
    OUT.mkdir(parents=True, exist_ok=True)
    manifest, missing, kept = {}, [], 0
    prev = json.loads((OUT / 'cast.json').read_text()) if (OUT / 'cast.json').exists() else {}
    for char, poses in CAST.items():
        entry = manifest[char] = {'height': scale[char]['height'], 'poses': {}}
        for use, key in poses.items():
            rec, err = resolve(char, key)
            if not rec:                                 # 原卡已退役（改由矩陣取代）：已匯出的圖還在就沿用，不清掉
                old = prev.get(char, {}).get('poses', {}).get(use)
                if old and old.get('card', '').endswith(key) and (GAME / 'dist' / old['src']).exists(): entry['poses'][use] = old; kept += 1
                else: missing.append(f'{char}/{key}: {str(err.get("error"))[:60]}')
                continue
            src = rec.get('use_path') or rec['path']
            factor = (meta.get(rec['path']) or {}).get('pose_factor', 1.0)
            dst = OUT / f'{char}__{use}.webp'
            im = Image.open(STUDIO / src).convert('RGBA')
            im = im.resize((round(im.width * MAX_H / im.height), MAX_H), Image.LANCZOS)
            im.save(dst, 'WEBP', quality=84, method=6)
            w, h = im.size
            entry['poses'][use] = {'src': f'assets/cast/{dst.name}', 'ratio': round(w / h, 4), 'pose_factor': factor,
                                   'card': rec['id'], 'sha256': rec.get('use_sha256') or rec.get('sha256')}
    for char, uses in MATRIX_CAST.items():
        manifest[char] = {'height': scale[char]['height'], 'poses': export_matrix(char, uses, scale[char]['height'], missing)}
    for char in REMOVED:
        for old in OUT.glob(f'{char}__*.webp'): old.unlink()
    (OUT / 'cast.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=1))
    print(f'寫出 {sum(len(v["poses"]) for v in manifest.values())} 張（其中沿用舊匯出 {kept} 張）；缺 {len(missing)} 張')
    for m in missing: print('  缺：', m)

if __name__ == '__main__':
    main()
