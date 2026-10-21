#!/usr/bin/env python3
"""Validate dist/data.json and its assets without Node. Python port of validate-data.mjs plus extra checks.

Usage: python3 tools/check_data.py   (exit 1 on errors; warnings do not fail)
"""
import hashlib
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


TOPICS = json.loads((DIST.parent / 'reference/topics.json').read_text(encoding='utf-8'))['topics']
SKILLS = ('en', 'zhuyin', 'hanzi')


def is_dino(w):
    return w['pack'] == 'dino'


def visual_group(w):
    if w['topic'] == 'number':
        return 'number-emoji'
    if w.get('sheet'):
        return f"sheet:{w['sheet']}"
    if w.get('image'):
        return 'dinosaur-image' if is_dino(w) else 'regular-image'
    return 'emoji'


def file_ok(rel, min_size):
    p = DIST / rel
    return p.is_file() and p.stat().st_size >= min_size


def main():
    words = json.loads((DIST / 'data.json').read_text(encoding='utf-8'))
    errors, warnings = [], []
    ids, english = set(), set()

    for w in words:
        wid = w.get('id')
        if not all(w.get(k) for k in ('id', 'topic', 'pack', 'en', 'zh', 'emoji', 'metrics')) or wid in ids:
            errors.append(f'缺欄位或 id 重複: {wid}')
            continue
        key = re.sub(r'[^a-z0-9]', '', w['en'].lower())
        if key in english:
            errors.append(f'英文重複: {w["en"]}')
        if w['topic'] not in TOPICS:
            errors.append(f'topic 不在 reference/topics.json: {wid} {w["topic"]}')
            continue
        if w['pack'] != TOPICS[w['topic']].get('pack', 'general'):
            errors.append(f'pack 與 topic 不符: {wid}')
        if is_dino(w) != ('level' not in w) or (not is_dino(w) and any(w['level'].get(k) not in (1, 2, 3) for k in SKILLS)):
            errors.append(f'level 錯誤（一般詞需 en/zhuyin/hanzi 1–3，恐龍包不分級）: {wid}')
        if w['topic'] == 'number' and w['emoji'] != NUMBER_EMOJI.get(w['en']):
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

    if errors:
        print('\n'.join('✗ ' + e for e in errors)); sys.exit(1)
    exported = DIST / 'topics.json'
    if not exported.is_file() or set(json.loads(exported.read_text(encoding='utf-8'))['topics']) != set(TOPICS):
        errors.append('dist/topics.json 與 reference/topics.json 不一致；跑 python3 tools/word_bank.py levels')
    topic_counts = {t: sum(w['topic'] == t for w in words) for t in TOPICS}
    small = [f'{t}({n})' for t, n in topic_counts.items() if 0 < n < 4]
    if small:
        warnings.append(f'小類不足 4 詞（干擾選項會往大類找）: {", ".join(small)}')
    # 找圖片 filters on level.en, 注音送信 on level.zhuyin; hanzi is stored for the future 國字 section.
    pools = {
        'all': [w for w in words if not is_dino(w)],
        **{f'{skill}{lv}': [w for w in words if not is_dino(w) and w['level'][skill] == lv]
           for skill in ('en', 'zhuyin') for lv in (1, 2, 3)},
        'dinosaur': [w for w in words if is_dino(w)],
    }
    for mode, pool in pools.items():
        if len(pool) < 10:
            errors.append(f'模式題數少於 10: {mode}')
        for t in pool:
            same = [w for w in pool if w['id'] != t['id'] and visual_group(w) == visual_group(t)]
            fallback = [w for w in words if w['id'] != t['id'] and visual_group(w) == visual_group(t)
                        and is_dino(w) == is_dino(t)]
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

    cards_path = DIST / 'assets/cards/manifest.json'
    if cards_path.is_file():
        cards = json.loads(cards_path.read_text(encoding='utf-8'))['items']
        need = len(words) // 10
        if len(cards) < need:
            errors.append(f'角色郵票圖只有 {len(cards)} 張，需要 {need} 張')
        for c in cards:
            f = DIST / c['image']
            if not f.is_file():
                errors.append(f'缺角色郵票圖: {c["image"]}')
            elif hashlib.sha256(f.read_bytes()).hexdigest() != c['sha256']:
                errors.append(f'角色郵票圖與 manifest 的 sha256 不符: {c["image"]}')
        approved = sum(1 for c in cards if c.get('status') == 'approved')
        print(f'角色郵票：{len(cards)} 張（已核准 {approved}／候選 {len(cards) - approved}）')

    # 介面規則：注音只用 shared.js 的 Dino.kidText（不得手寫 <ruby>）；全站字型內海，字型子集要涵蓋頁面用到的字
    for f in sorted(DIST.glob('*.html')) + sorted(DIST.glob('*.js')) + sorted(DIST.glob('*.css')):
        text = f.read_text(encoding='utf-8')
        if '<ruby' in text or '<rt>' in text:
            errors.append(f'{f.name} 手寫 <ruby> 注音；改用 Dino.kidText')
        if f.suffix == '.html' and 'fonts.css' not in text:
            errors.append(f'{f.name} 沒載入 fonts.css（內海字型）')
        for stack in re.findall(r'font(?:-family)?:[^;}]*', text) if f.suffix in ('.css', '.html') else []:
            if 'Naikai' not in stack and 'Emoji' not in stack and 'inherit' not in stack:
                errors.append(f'{f.name} 字型未用內海: {stack[:60]}')
    font = DIST / 'assets/fonts/naikai-subset.woff2'
    if not font.is_file():
        errors.append('缺 assets/fonts/naikai-subset.woff2；跑 tools/build_naikai_font.py')
    else:
        have = set((DIST / 'assets/fonts/naikai-subset.chars.txt').read_text(encoding='utf-8'))
        used = set()
        for g in DIST.glob('*.*'):
            if g.suffix in ('.html', '.js', '.css', '.json'):
                used |= {c for c in g.read_text(encoding='utf-8') if ord(c) > 0x2e7f and c.isprintable()}
        missing = ''.join(sorted(used - have))
        if missing:
            warnings.append(f'內海字型子集缺 {len(missing)} 字（{missing[:20]}）；跑 tools/build_naikai_font.py')

    for line in warnings:
        print('WARN', line)
    for line in errors:
        print('ERROR', line)
    art = {k: sum(1 for w in words if w.get('artStatus') == k) for k in ART_STATUS}
    print(f'美術狀態：已審核 {art["approved"]}／候選 {art["candidate"]}／emoji {art["emoji"]}')
    print(f'{len(words)} 詞；' + '／'.join(f'{k} {len(v)}' for k, v in pools.items()) + f'；錯誤 {len(errors)}，警告 {len(warnings)}')
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
