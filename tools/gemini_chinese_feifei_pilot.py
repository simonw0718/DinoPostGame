# coding: utf-8

"""One-request, 50-word Mandarin pilot with Feifei R22; key never saved or printed."""
import base64
import hashlib
import json
import random
import re
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from gemini_tts_batch import speech_intervals  # Reuse local silence segmentation.

OUT = ROOT / 'audio-pilot/chinese-feifei-R22-DINOC-50'
KEY_PATH = Path('/Users/simon/.config/dinopost/gemini-key-DINOC')
MODEL = 'gemini-3.8-flash-tts'
VOICE = 'voice_86owyuv7gsxr'
QUOTAS = [('animals', (4, 3, 3)), ('food', (4, 3, 3)),
          ('objects', (5, 5, 5)), ('nature', (4, 3, 3)), ('dinosaur', (0, 0, 5))]


def selection():
    words = json.loads((ROOT / 'dist/data.json').read_text())
    rng = random.Random(1002)
    chosen, used = [], set()
    for category, quotas in QUOTAS:
        for level, quota in enumerate(quotas, 1):
            pool = [word for word in words if word['category'] == category and word['difficulty'] == level]
            rng.shuffle(pool)
            for word in pool:
                if not quota:
                    break
                reading = ''.join(word['zhuyin'])
                if word['zh'] in used or reading in used:
                    continue
                chosen.append(word)
                used.update((word['zh'], reading))
                quota -= 1
            if quota:
                raise ValueError(f'Insufficient unique words: {category} {level}')
    assert len(chosen) == 50
    return chosen


def audio_data(result):
    blocks = [part for step in result.get('steps', []) if step.get('type') == 'model_output'
              for part in step.get('content', []) if part.get('type') == 'audio' and part.get('data')]
    if not blocks and result.get('output_audio', {}).get('data'):
        blocks = [result['output_audio']]
    if not blocks:
        raise RuntimeError('Gemini returned no audio blocks')
    audio = base64.b64decode(blocks[-1]['data'])
    if audio[:4] != b'RIFF':
        raise RuntimeError('Expected a WAV response')
    return audio


def run(command):
    return subprocess.run(command, check=True, capture_output=True, text=True)


def make_review(rows, summary):
    from html import escape
    cards = ''.join(f'''<article><span class="number">{row['index']:02d}</span><strong>{escape(row['zh'])}</strong><span>{escape(row['en'])}</span><small>{escape(' '.join(row['zhuyin']))}</small><audio controls preload="none" src="clips/{escape(row['id'])}.mp3"></audio></article>''' for row in rows)
    (OUT / 'review.html').write_text(f'''<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>飛飛中文發音 50 詞試聽</title><style>body{{font-family:system-ui,"Noto Sans TC",sans-serif;background:#edf4e8;color:#234d3b;margin:0;padding:20px}}main{{max-width:850px;margin:auto}}h1{{font-size:26px}}p{{line-height:1.6}}.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}}article{{display:grid;grid-template-columns:auto 1fr;gap:3px 10px;align-items:center;background:#fffdf3;border:2px solid #d3e3c9;border-radius:16px;padding:12px}}article strong{{font-size:26px}}article span:not(.number){{grid-column:2;color:#5f8065}}article small{{grid-column:2;color:#7c8063}}audio{{grid-column:1/-1;width:100%;margin-top:6px}}.number{{border-radius:99px;background:#f9d580;padding:5px 8px;font-weight:900}}</style><main><h1>飛飛 R22・中文發音 50 詞試聽</h1><p>Gemini 3.8 Flash TTS，DINOC 飛飛 KEY；一次請求生成，已於本機裁切。尚未放入遊戲，請核對每詞讀音、聲線與切點。</p><p>原始長音檔：<a href="full.wav">播放／下載 WAV</a>。音檔長度 {summary['duration_s']:.1f} 秒；裁切門檻 {summary['threshold_db']} dB。</p><div class="grid">{cards}</div></main></html>''')


def main():
    words = selection()
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = [{'index': i + 1, 'id': word['id'], 'zh': word['zh'], 'en': word['en'],
                 'zhuyin': word['zhuyin'], 'difficulty': word['difficulty']}
                for i, word in enumerate(words)]
    (OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    transcript = ' <long pause> <long pause> '.join(word['zh'] + '。' for word in words)
    request_body = {'model': MODEL, 'input': [{'type': 'user_input', 'content': [{
        'type': 'text', 'text': transcript,
        'annotations': [{'type': 'speech_metadata', 'style':
            'Natural Taiwan Mandarin. Feifei character voice, warm and clear. Read each vocabulary word at a calm medium pace without an explanatory phrase.'}]
    }]}], 'response_format': {'type': 'audio'},
        'generation_config': {'speech_config': [{'voice': VOICE}]}}
    (OUT / 'request.json').write_text(json.dumps(request_body, ensure_ascii=False, indent=2) + '\n')
    wav = OUT / 'full.wav'
    if not wav.exists():
        key = KEY_PATH.read_text().strip()
        if not key:
            raise RuntimeError('DINOC key file is empty')
        req = urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/interactions',
            data=json.dumps(request_body).encode('utf-8'),
            headers={'Content-Type': 'application/json', 'x-goog-api-key': key}, method='POST')
        print('Sending exactly one Gemini TTS request for 50 Chinese words with Feifei R22.', flush=True)
        try:
            with urllib.request.urlopen(req, timeout=420) as response:
                result = json.load(response)
        except urllib.error.HTTPError as error:
            message = error.read().decode(errors='replace')
            (OUT / 'request-error.txt').write_text(f'HTTP {error.code}\n{message[:5000]}\n')
            raise RuntimeError(f'Gemini HTTP {error.code}; see request-error.txt') from None
        audio = audio_data(result)
        wav.write_bytes(audio)
        (OUT / 'response-summary.json').write_text(json.dumps({
            'interaction_id': result.get('id'), 'model': MODEL, 'voice': VOICE,
            'key_file': str(KEY_PATH), 'audio_bytes': len(audio),
            'sha256': hashlib.sha256(audio).hexdigest(), 'usage': result.get('usage', {})
        }, ensure_ascii=False, indent=2) + '\n')
        print(f'Original WAV saved: {len(audio)} bytes.', flush=True)
    else:
        print('Using saved WAV; no new API request.', flush=True)
    try:
        duration, intervals, threshold = speech_intervals(wav, len(words))
        repair_note = ''
    except RuntimeError:
        # One long low-level room-tone interval hid the pause between items 48/49.
        duration, intervals, threshold = speech_intervals(wav, len(words) - 1)
        index = max(range(len(intervals)), key=lambda i: intervals[i][1] - intervals[i][0])
        start, end = intervals[index]
        probe = run(['ffmpeg', '-hide_banner', '-i', str(wav), '-af',
                     'silencedetect=noise=-30dB:d=0.25', '-f', 'null', '-']).stderr
        starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', probe)]
        ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', probe)]
        gaps = [(a, b) for a, b in zip(starts, ends) if start + .3 < a < b < end - .3 and b - a > .5]
        if len(intervals) != len(words) - 1 or len(gaps) != 1 or end - start < 4:
            raise RuntimeError(f'Cannot safely repair {len(intervals)} intervals; longest={start:.2f}-{end:.2f}; gaps={gaps}')
        gap_start, gap_end = gaps[0]
        intervals[index:index + 1] = [(start, gap_start), (gap_end, end)]
        repair_note = f'Item {index+1}/{index+2} split at {gap_start:.3f}-{gap_end:.3f}s via -30 dB pause.'
        (OUT / 'segmentation-note.txt').write_text(repair_note + '\n')
        print(repair_note, flush=True)
    assert len(intervals) == len(words)
    clips = OUT / 'clips'
    clips.mkdir(exist_ok=True)
    rows = []
    for item, (start, end) in zip(manifest, intervals):
        begin, finish = max(0, start - .07), min(duration, end + .09)
        path = clips / (item['id'] + '.mp3')
        run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{begin:.3f}', '-to', f'{finish:.3f}',
             '-i', str(wav), '-ac', '1', '-ar', '24000', '-codec:a', 'libmp3lame',
             '-qscale:a', '4', str(path)])
        run(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'null', '-'])
        rows.append({**item, 'start': round(begin, 3), 'end': round(finish, 3),
                     'duration': round(finish - begin, 3), 'file': 'clips/' + path.name,
                     'bytes': path.stat().st_size})
    (OUT / 'clips-manifest.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n')
    summary = {'words': len(words), 'duration_s': duration, 'threshold_db': threshold,
               'source': 'Feifei R22 / DINOC', 'model': MODEL,
               'status': 'review_only_not_in_game'}
    (OUT / 'README.md').write_text('# 飛飛中文發音 50 詞試作\n\n' +
        f'- 50 詞；一次 Gemini 3.8 Flash TTS 請求；飛飛 R22／DINOC。\n'
        f'- 原始 WAV：{duration:.2f} 秒。裁切為 50 個 MP3，門檻 {threshold} dB。\n'
        '- 音檔尚未加入遊戲，先用 `review.html` 人工核對發音與切點。\n'
        + (f'- {repair_note}\n' if repair_note else '')
        + '- 金鑰只從使用者設定檔讀取，未輸出到此資料夾。\n')
    make_review(rows, summary)
    print(f'Clips ready: {len(rows)}; duration {duration:.2f}s; threshold {threshold} dB.', flush=True)


if __name__ == '__main__':
    main()
