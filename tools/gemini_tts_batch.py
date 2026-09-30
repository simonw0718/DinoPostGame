"""Generate one DinoPost word-audio batch with Gemini TTS, then split it locally.

Usage: python3 tools/gemini_tts_batch.py 1|2|3
The key stays in ~/.config/dinopost/gemini-key-DINOZ. Never prints or saves it.
Already generated batches are never sent again by this script.
"""
import base64
import array
import math
import wave
import json
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VOICE = 'erinome'
MODEL = 'gemini-3.8-flash-lite-tts'
KEY_PATH = Path('/Users/simon/.config/dinopost/gemini-key-DINOZ')
PILOT = ROOT / 'audio-pilot/gemini-3.8-flash-lite-DINOZ-20'


def run(command):
    return subprocess.run(command, capture_output=True, text=True, check=True)


def speech_intervals(wav, expected):
    duration = float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                          '-of', 'default=nokey=1:noprint_wrappers=1', str(wav)]).stdout.strip())
    attempts = []
    for threshold in (-35, -32, -38, -40, -30):
        result = run(['ffmpeg', '-hide_banner', '-i', str(wav), '-af',
                      f'silencedetect=noise={threshold}dB:d=0.3', '-f', 'null', '-'])
        starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', result.stderr)]
        ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', result.stderr)]
        if len(starts) != len(ends):
            continue
        silences = []
        for start, end in zip(starts, ends):
            if silences and start <= silences[-1][1] + 0.01:
                silences[-1] = (silences[-1][0], max(silences[-1][1], end))
            else:
                silences.append((start, end))
        speech = []
        last = 0.0
        for start, end in silences:
            if start - last > 0.25:
                speech.append((last, start))
            last = end
        if duration - last > 0.25:
            speech.append((last, duration))
        attempts.append({'threshold_db': threshold, 'speech_count': len(speech)})
        if len(speech) == expected:
            return duration, speech, threshold
        # Some pause tags create a brief low-volume artifact between words.
        # Discard only if the extra interval is unmistakably quieter than real words.
        if len(speech) == expected + 1:
            with wave.open(str(wav)) as audio:
                assert audio.getnchannels() == 1 and audio.getsampwidth() == 2
                rate = audio.getframerate()
                levels = []
                for start, end in speech:
                    audio.setpos(int(start * rate))
                    samples = array.array('h')
                    samples.frombytes(audio.readframes(max(1, int((end - start) * rate))))
                    rms = math.sqrt(sum(sample * sample for sample in samples) / len(samples)) / 32768
                    levels.append(20 * math.log10(max(rms, 1e-9)))
            ranked = sorted(range(len(speech)), key=lambda i: levels[i])
            if levels[ranked[0]] < -27 and levels[ranked[1]] - levels[ranked[0]] > 4:
                removed = speech.pop(ranked[0])
                print(f'Ignored quiet pause artifact at {removed[0]:.2f}-{removed[1]:.2f}s ({levels[ranked[0]]:.1f} dB)', flush=True)
                return duration, speech, threshold
    raise RuntimeError(f'Expected {expected} speech intervals; counts: {[a["speech_count"] for a in attempts]}')


def main():
    batch_number = int(sys.argv[1])
    assert batch_number in (1, 2, 3)
    words = json.loads((ROOT / 'dist/data.json').read_text())
    target = [w for w in words if w.get('levelSource') != 'kidsapp' or w['category'] == 'dinosaur']
    pilot_ids = {w['id'] for w in json.loads((PILOT / 'manifest.json').read_text())}
    remaining = [w for w in target if w['id'] not in pilot_ids]
    assert len(remaining) == 123
    batch = remaining[(batch_number - 1) * 50:batch_number * 50]
    assert len(batch) == (23 if batch_number == 3 else 50)
    folder = ROOT / 'audio-pilot' / f'gemini-3.8-flash-lite-DINOZ-batch-{batch_number:02d}-{len(batch)}'
    folder.mkdir(parents=True, exist_ok=True)
    wav = folder / 'full.wav'
    manifest = [{'index': i + 1, 'id': w['id'], 'en': w['en'], 'source': w.get('levelSource')}
                for i, w in enumerate(batch)]
    (folder / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    transcript = ' <long pause> <long pause> '.join(w['en'].capitalize() + '.' for w in batch)
    request_body = {
        'model': MODEL,
        'input': [{'type': 'user_input', 'content': [{'type': 'text', 'text': transcript,
            'annotations': [{'type': 'speech_metadata',
                             'style': 'Neutral, natural, clearly articulated at a moderate pace.'}]}]}],
        'response_format': {'type': 'audio'},
        'generation_config': {'speech_config': [{'voice': VOICE}]},
    }
    (folder / 'request.json').write_text(json.dumps(request_body, ensure_ascii=False, indent=2) + '\n')
    if not wav.exists():
        key = KEY_PATH.read_text().strip()
        assert key, 'DINOZ key is empty'
        req = urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/interactions',
            data=json.dumps(request_body).encode(),
            headers={'Content-Type': 'application/json', 'x-goog-api-key': key}, method='POST')
        print(f'Batch {batch_number}: sending ONE TTS request for {len(batch)} words', flush=True)
        try:
            with urllib.request.urlopen(req, timeout=360) as response:
                result = json.load(response)
        except urllib.error.HTTPError as error:
            message = error.read().decode(errors='replace')
            (folder / 'request-error.txt').write_text(f'HTTP {error.code}\n{message[:5000]}\n')
            raise RuntimeError(f'Gemini HTTP {error.code}; see request-error.txt') from None
        blocks = [part for step in result.get('steps', []) if step.get('type') == 'model_output'
                  for part in step.get('content', []) if part.get('type') == 'audio' and part.get('data')]
        if not blocks and result.get('output_audio', {}).get('data'):
            blocks = [result['output_audio']]
        if not blocks:
            (folder / 'response-diagnostic.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)[:10000])
            raise RuntimeError('No audio response; see response-diagnostic.json')
        data = base64.b64decode(blocks[-1]['data'])
        assert data[:4] == b'RIFF', 'Expected WAV response'
        wav.write_bytes(data)
        (folder / 'response-summary.json').write_text(json.dumps({
            'interaction_id': result.get('id'), 'model': MODEL, 'voice': VOICE,
            'audio_bytes': len(data), 'audio_blocks': len(blocks)}, indent=2) + '\n')
    else:
        print(f'Batch {batch_number}: using saved WAV; no additional TTS request', flush=True)
    duration, speech, threshold = speech_intervals(wav, len(batch))
    clips = folder / 'clips'
    clips.mkdir(exist_ok=True)
    rows = []
    for item, (start, end) in zip(manifest, speech):
        a, b = max(0, start - 0.07), min(duration, end + 0.09)
        path = clips / (item['id'] + '.mp3')
        run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{a:.3f}', '-to', f'{b:.3f}', '-i',
             str(wav), '-ac', '1', '-ar', '24000', '-codec:a', 'libmp3lame', '-qscale:a', '4', str(path)])
        if path.stat().st_size < 1500:
            raise RuntimeError(f'Clip too small: {path}')
        run(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'null', '-'])
        rows.append({**item, 'start': round(a, 3), 'end': round(b, 3),
                     'duration': round(b - a, 3), 'file': 'clips/' + path.name,
                     'bytes': path.stat().st_size})
    (folder / 'clips-manifest.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n')
    # Replace only after the entire batch has been segmented and decoded successfully.
    for row in rows:
        shutil.copy2(clips / (row['id'] + '.mp3'), ROOT / 'dist/assets/audio' / (row['id'] + '.mp3'))
    (folder / 'README.md').write_text(
        f'# Gemini TTS batch {batch_number}\n\n'
        f'- {len(batch)} words; one request; model `{MODEL}`; voice `{VOICE}`.\n'
        f'- Original WAV: {duration:.2f} seconds.\n'
        f'- Local silence threshold: {threshold} dB; {len(rows)} MP3 clips.\n'
        f'- Existing game audio replaced after automated checks. Original files are in `../original-audio-backup/`.\n'
        f'- Human listening review is still recommended, especially for dinosaur names.\n')
    print(f'Batch {batch_number}: saved WAV {duration:.2f}s, cut and replaced {len(rows)} MP3; threshold {threshold}dB', flush=True)
    for row in rows:
        print(f"{row['index']:2d} {row['en']:19s} {row['duration']:.2f}s", flush=True)

if __name__ == '__main__':
    main()
