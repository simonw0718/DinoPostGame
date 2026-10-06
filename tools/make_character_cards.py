#!/usr/bin/env python3
"""Build the 35 character-stamp pictures for the game from the EP01 video character cards.

Zero model calls: local Real-ESRGAN (ncnn, from the main project's .tools/) upscales each transparent card
4x, ffmpeg fits it on a soft per-character background with a ground shadow.
Needs: ffmpeg, <project root>/.tools/realesrgan/ (binary + models), media_library/visual/cards/characters/.
Usage (from anywhere): python3 tools/make_character_cards.py
Output: dist/assets/cards/NN.png (400x480) and dist/assets/cards/manifest.json (status: candidate until approved).
The selection below is the single place to edit; card numbers follow the order of CARDS.
"""
import hashlib
import json
import subprocess
import tempfile
from pathlib import Path

GAME = Path(__file__).resolve().parent.parent
PROJECT = GAME.parent
ESRGAN = PROJECT / '.tools/realesrgan/realesrgan-ncnn-vulkan'
MODELS = PROJECT / '.tools/realesrgan/models'
SRC = PROJECT / 'media_library/visual/cards/characters'
OUT = GAME / 'dist/assets/cards'
W, H = 400, 480
BOX_W, BOX_H, FLOOR = 346, 376, 428   # picture fits this box; its bottom sits on FLOOR

# character folder -> (display name, background colour)
CHARACTERS = {
    'iggy': ('伊奇', (198, 226, 184)),
    'feifei': ('飛飛', (250, 214, 170)),
    'chick_abao': ('小雞阿暴', (250, 232, 150)),
    'xiaokong': ('小空', (176, 214, 242)),
    'pairo': ('派羅叔叔', (206, 224, 168)),
    'rex_abao': ('暴龍阿暴', (246, 190, 176)),
}
# Card number = position in this list (1-based). Round-robin by character so neighbours differ.
CARDS = [
    'iggy__front__wave__game01', 'feifei__front__wings_open__g01', 'chick_abao__front__wave_left_wing__g02',
    'xiaokong__front__neutral__c01', 'pairo__front__neutral__c01', 'rex_abao__front__neutral__c01',
    'iggy__front__cheer__g01', 'feifei__front__wave_inner_a__g02', 'chick_abao__front__neutral__c01',
    'xiaokong__left_3q__point__g01', 'pairo__right_3q__wave__g01', 'iggy__right_3q__point__g01',
    'iggy__front__surprised__g01', 'feifei__left_3q__stand__g01', 'chick_abao__front__point_finger__g01',
    'xiaokong__front__stand_dup__g01', 'pairo__left_3q__receive_parcel__g01', 'rex_abao__left__look_down__g02',
    'iggy__left_3q__point__g01', 'feifei__left__hurry__g01', 'chick_abao__front__letter__game01',
    'xiaokong__left_3q__neutral__c01', 'pairo__left_3q__rub_snout__g01', 'rex_abao__left_3q__neutral__c01',
    'iggy__left_3q__wave__g01', 'chick_abao__front__sort_letter__g01', 'xiaokong__left__run__g01',
    'pairo__left_3q__stand_dup__g01', 'iggy__left_3q__puzzled_parcel__g01', 'chick_abao__left_3q__stern__g01',
    'pairo__right_3q__hand_chin__g01', 'iggy__right_3q__give_parcel__g01', 'pairo__right__walk__g01',
    'iggy__right__run__g01', 'iggy__right__walk__g02',
]
assert len(CARDS) == 35 and len(set(CARDS)) == 35


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def build(card_id, number, tmp):
    folder = card_id.split('__')[0]
    src = SRC / folder / f'{card_id}.png'
    big = tmp / f'{card_id}.x4.png'
    subprocess.run([str(ESRGAN), '-i', str(src), '-o', str(big), '-n', 'realesrgan-x4plus-anime', '-s', '4', '-m', str(MODELS)],
                   check=True, capture_output=True)
    target = OUT / f'{number:02d}.png'
    edge = CHARACTERS[folder][1]
    # Soft radial background: lighter around the character, the character's colour toward the edges.
    d = "clip(hypot((X-W/2)/(W*0.75),(Y-H*0.45)/(H*0.75)),0,1)"
    chan = lambda v: f"{v}+(255-{v})*0.6*(1-{d})"
    bggeq = f"geq=r='{chan(edge[0])}':g='{chan(edge[1])}':b='{chan(edge[2])}'"
    shadow = "format=rgba,geq=r=0:g=0:b=0:a='46*clip(1-(pow((X-W/2)/(W*0.25),2)+pow((Y-H/2)/(H*0.04),2)),0,1)'"
    graph = (
        f"color=c=white:s={W}x{H},{bggeq},format=rgba[bg];"
        f"color=c=black@0:s={W}x{H},{shadow}[sh];"
        f"[2:v]scale={BOX_W}:{BOX_H}:force_original_aspect_ratio=decrease:flags=lanczos,format=rgba[ch];"
        f"[bg][sh]overlay=0:{FLOOR - H // 2 + 2}:format=auto[b1];"
        f"[b1][ch]overlay=(W-w)/2:{FLOOR}-h:format=auto,format=rgb24"
    )
    # Input 0/1 are placeholders for the lavfi sources (unused names keep the graph readable); the picture is input 2.
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc', '-f', 'lavfi', '-i', 'anullsrc', '-i', str(big),
                    '-filter_complex', graph, '-frames:v', '1', str(target)], check=True)
    return src, target


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    items = []
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        for number, card_id in enumerate(CARDS, start=1):
            src, target = build(card_id, number, tmp)
            folder = card_id.split('__')[0]
            items.append({
                'n': number, 'character': folder, 'name': CHARACTERS[folder][0], 'card_id': card_id,
                'pose': card_id.split('__', 1)[1], 'image': f'assets/cards/{number:02d}.png',
                'source': str(src.relative_to(PROJECT)), 'source_sha256': sha(src), 'sha256': sha(target),
                'status': 'candidate',
            })
            print(number, card_id)
    manifest = {
        'schema_version': 1, 'size': [W, H],
        'method': 'Real-ESRGAN x4plus-anime (local ncnn) + ffmpeg fit on per-character background; source cards are EP01 video candidates',
        'tool': 'tools/make_character_cards.py', 'items': items,
    }
    (OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{len(items)} cards -> {OUT}')


if __name__ == '__main__':
    main()
