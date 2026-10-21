#!/usr/bin/env python3
"""Word-bank entry point: compute levels, add words, report coverage (plan B, director 2026-10-21).

Usage:
  python3 tools/word_bank.py levels [--write]        recompute metrics + level for every word
  python3 tools/word_bank.py add FILE.tsv [--write]  add words; rows: en<TAB>zh<TAB>topic<TAB>emoji[<TAB>zhuyin]
  python3 tools/word_bank.py report                  counts per topic / level / pack and gaps
Without --write nothing is saved. Rules (topics, scores, cuts) live in reference/topics.json;
grading lists come from tools/build_reference_lists.py. After --write run python3 tools/check_data.py.
"""
import argparse
import csv
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'dist/data.json'
REF = ROOT / 'reference'
TAXONOMY = json.loads((REF / 'topics.json').read_text())
TOPICS = TAXONOMY['topics']
HARD_SYMBOLS = set('ㄓㄔㄕㄖㄗㄘㄙㄦㄩ')
TONES = 'ˊˇˋ˙'
MIN_TOPIC, MIN_LEVEL = 4, 10
# Field order in data.json; any other existing keys keep their place after these.
ORDER = ('id', 'topic', 'pack', 'en', 'zh', 'zhuyin', 'emoji', 'level', 'metrics')


def read_tsv(name, key, value, cast=None):
    with open(REF / name) as handle:
        return {row[key]: cast(row[value]) if cast else row[value] for row in csv.DictReader(handle, delimiter='\t')}


YLE = read_tsv('yle_words.tsv', 'word', 'yle_level', int)
YLE_SQUASHED = {re.sub(r'[^a-z]', '', k): v for k, v in YLE.items()}
HANZI = read_tsv('tbcl_hanzi.tsv', 'char', 'tbcl_level', int)
WORD_LEVEL = read_tsv('tbcl_words.tsv', 'word', 'tbcl_level', int)
WORD_READING = read_tsv('tbcl_words.tsv', 'word', 'bopomofo')


def pack_of(topic):
    return TOPICS[topic].get('pack', 'general')


def yle_level(en):
    en = en.lower()
    for form in (en, en + 's', en + 'es'):
        if form in YLE:
            return YLE[form]
    return YLE_SQUASHED.get(re.sub(r'[^a-z]', '', en), 4)


def en_syllables(en):
    total = 0
    for part in en.lower().split():
        count = len(re.findall(r'[aeiouy]+', part))
        if part.endswith('e') and not part.endswith(('le', 'ee')) and count > 1:
            count -= 1
        total += max(1, count)
    return total


def band(score, cuts):
    return 1 if score <= cuts[0] else 2 if score <= cuts[1] else 3


def metrics(word):
    letters = len(re.sub(r'[^a-z]', '', word['en'].lower()))
    readings = word['zhuyin']
    return {
        'yle': yle_level(word['en']), 'letters': letters, 'enSyl': en_syllables(word['en']),
        'zhChars': len(readings),
        'zhSymbols': sum(len([c for c in r if c not in TONES]) for r in readings),
        # Neutral-tone syllables (˙ㄗ in 子) already score as 輕聲, so their symbols are not counted as hard again.
        'zhHard': sum(c in HARD_SYMBOLS for r in readings if '˙' not in r for c in r),
        'zhNeutral': sum('˙' in r for r in readings),
        'hanziTbcl': max(HANZI.get(c, 8) for c in word['zh']),
        'zhWordTbcl': WORD_LEVEL.get(word['zh']),
    }


def levels(m):
    en_score = 2 * (m['yle'] - 1) + (0 if m['letters'] <= 4 else 1 if m['letters'] <= 6 else 2 if m['letters'] <= 8 else 3) \
        + (0 if m['enSyl'] == 1 else 1 if m['enSyl'] == 2 else 2)
    zh_score = (0 if m['zhChars'] == 1 else 1 if m['zhChars'] == 2 else 2) \
        + (0 if m['zhSymbols'] <= 3 else 1 if m['zhSymbols'] <= 6 else 2) + min(2, m['zhHard']) + (1 if m['zhNeutral'] else 0)
    rules = TAXONOMY['levels']
    return {'en': band(en_score, rules['en']['cuts']), 'zhuyin': band(zh_score, rules['zhuyin']['cuts']),
            'hanzi': 1 if m['hanziTbcl'] <= 2 else 2 if m['hanziTbcl'] <= 4 else 3}


def ordered(word):
    return {**{k: word[k] for k in ORDER if k in word}, **{k: v for k, v in word.items() if k not in ORDER}}


def apply_levels(word):
    word['pack'] = pack_of(word['topic'])
    word['metrics'] = metrics(word)
    # Dinosaur pack is a special block without levels (director 2026-10-21).
    if word['pack'] == 'general':
        word['level'] = levels(word['metrics'])
    else:
        word.pop('level', None)
    return ordered(word)


def load():
    return json.loads(DATA.read_text())


def export_topics():
    # The parent word-bank page reads names from here; reference/topics.json stays the only place to edit them.
    names = {'groups': TAXONOMY['groups'], 'topics': {k: {'zh': v['zh']} for k, v in TOPICS.items()}}
    (ROOT / 'dist/topics.json').write_text(json.dumps(names, ensure_ascii=False, indent=1) + '\n')


def save(words):
    DATA.write_text(json.dumps(words, ensure_ascii=False, indent=2) + '\n')
    export_topics()
    print(f'已寫入 {DATA.relative_to(ROOT)}（{len(words)} 詞）；接著跑 python3 tools/check_data.py')


def cmd_levels(args):
    words = load()
    changed = []
    for i, word in enumerate(words):
        before = (word.get('level'), word.get('metrics'), word.get('pack'))
        words[i] = apply_levels(dict(word))
        if before != (words[i].get('level'), words[i].get('metrics'), words[i].get('pack')):
            changed.append(f"{word['id']}: {before[0]} → {words[i].get('level')}")
    export_topics()
    print(f'{len(changed)} 詞的級別或指標有變動')
    for line in changed[:20]:
        print('  ' + line)
    if args.write and changed:
        save(words)


def zhuyin_for(zh, given, known):
    if given:
        return given.split()
    # TBCL lists variants as "ㄊㄨˋ ˙ㄗ/ㄊㄨˋ ㄗˇ"; the first one is the standard reading.
    for variant in WORD_READING.get(zh, '').split('/'):
        if len(variant.split()) == len(zh):
            return variant.split()
    if all(len(known.get(c, ())) == 1 for c in zh):
        return [next(iter(known[c])) for c in zh]
    return None


def cmd_add(args):
    words = load()
    known = defaultdict(set)
    for word in words:
        for char, reading in zip(word['zh'], word['zhuyin']):
            known[char].add(reading)
    ids, english = {w['id'] for w in words}, {w['en'].lower() for w in words}
    errors, added = [], []
    with open(args.file) as handle:
        for n, line in enumerate(handle, 1):
            cells = [c.strip() for c in line.rstrip('\n').split('\t')]
            if not cells[0] or cells[0].startswith('#'):
                continue
            if len(cells) < 4:
                errors.append(f'第 {n} 行：需要 en、zh、topic、emoji 四欄'); continue
            en, zh, topic, emoji = cells[:4]
            word_id = f"{topic.split('.')[0]}-{re.sub(r'[^a-z0-9]+', '-', en.lower()).strip('-')}"
            if topic not in TOPICS:
                errors.append(f'第 {n} 行 {en}：topic「{topic}」不在 reference/topics.json；可用：{", ".join(TOPICS)}'); continue
            if en.lower() in english or word_id in ids:
                errors.append(f'第 {n} 行 {en}：已在題庫'); continue
            reading = zhuyin_for(zh, cells[4] if len(cells) > 4 else '', known)
            if not reading or len(reading) != len(zh):
                errors.append(f'第 {n} 行 {en}/{zh}：找不到唯一注音，請在第 5 欄填（空白分隔，例：ㄊㄨˋ ˙ㄗ）'); continue
            # zhAudio is set by tools/word_audio.py zh-cut once the clip exists.
            word = apply_levels({'id': word_id, 'topic': topic, 'en': en, 'zh': zh, 'zhuyin': reading, 'emoji': emoji,
                                 'artStatus': 'emoji'})
            ids.add(word_id); english.add(en.lower()); added.append(word)
    for word in added:
        print(f"+ {word['id']} {word['zh']} {' '.join(word['zhuyin'])} {word['pack']} level={word.get('level')}")
    for error in errors:
        print('✗ ' + error)
    if errors:
        sys.exit(1)
    if args.write and added:
        save(words + added)
        print('下一步：python3 tools/word_audio.py en，再 zh-plan → zh-generate → 導演聽 → zh-cut；有圖後填 image 並把 artStatus 改 candidate')


def cmd_report(args):  # noqa: ARG001 (argparse passes args to every command)
    words = load()
    print('小類詞數（* 不足 4，干擾選項會往大類找）：')
    for topic, count in sorted(Counter(w['topic'] for w in words).items()):
        print(f"  {topic:16} {TOPICS[topic]['zh']:10} {count}{' *' if count < MIN_TOPIC else ''}")
    general = [w for w in words if w['pack'] == 'general']
    for skill in ('en', 'zhuyin', 'hanzi'):
        counts = Counter(w['level'][skill] for w in general)
        low = [lv for lv in (1, 2, 3) if counts[lv] < MIN_LEVEL]
        print(f"{skill:7} 1級 {counts[1]}／2級 {counts[2]}／3級 {counts[3]}{'  ✗ 少於 10：' + str(low) if low else ''}")
    print(f"恐龍包（不分級）{sum(w['pack'] == 'dino' for w in words)} 詞；一般 {len(general)} 詞")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest='cmd', required=True)
    p = sub.add_parser('levels'); p.add_argument('--write', action='store_true'); p.set_defaults(fn=cmd_levels)
    p = sub.add_parser('add'); p.add_argument('file'); p.add_argument('--write', action='store_true'); p.set_defaults(fn=cmd_add)
    p = sub.add_parser('report'); p.set_defaults(fn=cmd_report)
    args = parser.parse_args()
    args.fn(args)


if __name__ == '__main__':
    main()
