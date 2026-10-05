#!/usr/bin/env python3
"""Validate dist/data.json and its assets without Node. Python port of validate-data.mjs plus extra checks.

Usage: python3 tools/check_data.py   (exit 1 on errors; warnings do not fail)
"""
import json
import re
import sys
from pathlib import Path

DIST = Path(__file__).resolve().parent.parent / 'dist'
NUMBER_EMOJI = {'one': '1️⃣', 'two': '2️⃣', 'three': '3️⃣', 'four': '4️⃣', 'five': '5️⃣',
                'six': '6️⃣', 'seven': '7️⃣', 'eight': '8️⃣', 'nine': '9️⃣', 'ten': '🔟'}
ZHUYIN_OK = re.compile(r'^[ㄅ-ㄩˊˇˋ˙]+$')
ART_STATUS = ('emoji', 'candidate', 'approved')
IMAGE_PATH = re.compile(r'^assets/(kidsapp|rebuilt)/[^/]+(/[^/]+)*\.(png|svg)$')


def visual_group(w):
    if w['category'] == 'number':
        return 'number-emoji'
    if w.get('sheet'):
        return f"sheet:{w['sheet']}"
    if w.get('image'):
        return 'dinosaur-image' if w['category'] == 'dinosaur' else 'regular-image'
    return 'emoji'


def file_ok(rel, min_size):
    p = DIST / rel
    return p.is_file() and p.stat().st_size >= min_size


def main():
    words = json.loads((DIST / 'data.json').read_text(encoding='utf-8'))
    errors, warnings = [], []
    ids, english = set(), set()
    counts = {1: 0, 2: 0, 3: 0, 'dinosaur': 0}

    for w in words:
        wid = w.get('id')
        if not all(w.get(k) for k in ('id', 'category', 'en', 'zh', 'emoji')) or wid in ids:
            errors.append(f'缺欄位或 id 重複: {wid}')
            continue
        key = re.sub(r'[^a-z0-9]', '', w['en'].lower())
        if key in english:
            errors.append(f'英文重複: {w["en"]}')
        if w.get('difficulty') not in (1, 2, 3):
            errors.append(f'難度錯誤: {wid}')
        if w['category'] == 'number' and w['emoji'] != NUMBER_EMOJI.get(w['en']):
            errors.append(f'數字 emoji 錯誤: {wid}')
        zy = w.get('zhuyin')
        if not isinstance(zy, list) or len(zy) != len(w['zh']) or any(
                not r or not re.search('[ㄅ-ㄩ]', r) or not ZHUYIN_OK.match(r) for r in zy):
            errors.append(f'注音錯誤: {wid}')
        if 'sheet' in w or 'cell' in w:
            if w.get('sheet') not in ('animals', 'food', 'objects') or not isinstance(w.get('cell'), int) or not 0 <= w['cell'] <= 9:
                errors.append(f'圖組格位錯誤: {wid}')
        if w.get('image'):
            if not IMAGE_PATH.match(w['image']) or '..' in w['image']:
                errors.append(f'圖片路徑錯誤: {wid}')
            elif not file_ok(w['image'], 1000):
                errors.append(f'缺圖片: {wid}')
        if w.get('zhAudio'):
            if w['zhAudio'] != f'assets/audio/zh/{wid}.mp3':
                errors.append(f'中文音檔路徑錯誤: {wid}')
            elif not file_ok(w['zhAudio'], 1500):
                errors.append(f'缺中文音檔: {wid}')
        else:
            warnings.append(f'沒有中文音檔: {wid}')
        if w.get('artStatus') not in ART_STATUS:
            errors.append(f'artStatus 錯誤（須為 {"/".join(ART_STATUS)}）: {wid}')
        if not file_ok(f'assets/audio/{wid}.mp3', 500):
            errors.append(f'缺英文音檔: {wid}')
        ids.add(wid)
        english.add(key)
        counts['dinosaur' if w['category'] == 'dinosaur' else w['difficulty']] += 1

    pools = {
        'all': [w for w in words if w['category'] != 'dinosaur'],
        **{lv: [w for w in words if w['category'] != 'dinosaur' and w.get('difficulty') == lv] for lv in (1, 2, 3)},
        'dinosaur': [w for w in words if w['category'] == 'dinosaur'],
    }
    for mode, pool in pools.items():
        if len(pool) < 10:
            errors.append(f'模式題數少於 10: {mode}')
        for t in pool:
            same = [w for w in pool if w['id'] != t['id'] and visual_group(w) == visual_group(t)]
            fallback = [w for w in words if w['id'] != t['id'] and visual_group(w) == visual_group(t)
                        and (w['category'] == 'dinosaur') == (t['category'] == 'dinosaur')]
            if len(same) < 3 and len(fallback) < 3:
                errors.append(f'找圖片：同風格干擾選項不足: {t["id"]} ({mode})')
            # Mail game (zhuyin-sort.js distractorPools) needs 2 other meanings in the same visual group,
            # taken from the mode pool or any level with the same dinosaur/non-dinosaur side.
            meanings = {w['zh'] for w in same + fallback} - {t['zh']}
            if len(meanings) < 2:
                warnings.append(f'送信：此詞在 {mode} 模式不會出題（同風格中文意思不足 2 個）: {t["id"]}')

    audio_dir = DIST / 'assets' / 'audio'
    for kind, folder in (('英文', audio_dir), ('中文', audio_dir / 'zh')):
        orphans = sorted(p.stem for p in folder.glob('*.mp3') if p.stem not in ids)
        if orphans:
            warnings.append(f'題庫沒有用到的{kind}音檔: {", ".join(orphans)}')

    shared = (DIST / 'shared.js').read_text(encoding='utf-8')
    for asset in re.findall(r"asset: '([^']+)'", shared):
        if not file_ok(f'assets/{asset}', 1000):
            errors.append(f'缺角色圖: {asset}')

    for line in warnings:
        print('WARN', line)
    for line in errors:
        print('ERROR', line)
    art = {k: sum(1 for w in words if w.get('artStatus') == k) for k in ART_STATUS}
    print(f'美術狀態：已審核 {art["approved"]}／候選 {art["candidate"]}／emoji {art["emoji"]}')
    print(f'{len(words)} 詞；{counts}；錯誤 {len(errors)}，警告 {len(warnings)}')
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
