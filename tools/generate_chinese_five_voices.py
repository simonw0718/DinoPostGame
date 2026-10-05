# coding: utf-8
"""Create one reviewable long WAV per assigned voice; no per-word review cards."""
import base64
import hashlib
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSIGNMENT = ROOT / 'audio-pilot/chinese-five-voices-remaining/assignment.json'
MODEL = 'gemini-3.8-flash-tts'


def audio_data(result):
    blocks = [part for step in result.get('steps', []) if step.get('type') == 'model_output'
              for part in step.get('content', []) if part.get('type') == 'audio' and part.get('data')]
    if not blocks and result.get('output_audio', {}).get('data'):
        blocks = [result['output_audio']]
    if not blocks:
        raise RuntimeError('Gemini returned no audio blocks')
    audio = base64.b64decode(blocks[-1]['data'])
    if audio[:4] != b'RIFF':
        raise RuntimeError('Expected WAV audio')
    return audio


def main(label):
    manifest = json.loads(ASSIGNMENT.read_text(encoding='utf-8'))
    batch = next((x for x in manifest['batches'] if x['voice_label'] == label), None)
    if batch is None:
        raise ValueError('Unknown voice label')
    out = ASSIGNMENT.parent / label
    out.mkdir(parents=True, exist_ok=True)
    wav = out / 'full.wav'
    if wav.exists():
        print(f'{label}: full.wav exists; no API request.')
        return
    transcript = ' <long pause> '.join(x['tts_text'] + '。' for x in batch['words'])
    body = {'model': MODEL, 'input': [{'type': 'user_input', 'content': [{
        'type': 'text', 'text': transcript,
        'annotations': [{'type': 'speech_metadata', 'style':
            'Natural Taiwan Mandarin. Read each vocabulary item once, clearly and gently at a calm medium pace. Use the assigned voice consistently. Do not read any explanations or item numbers.'}]
    }]}], 'response_format': {'type': 'audio'},
        'generation_config': {'speech_config': [{'voice': batch['voice_id']}]}}
    (out / 'transcript.txt').write_text(transcript + '\n', encoding='utf-8')
    (out / 'request.json').write_text(json.dumps(body, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    key = Path(batch['key_file']).read_text(encoding='utf-8').strip()
    if not key:
        raise RuntimeError('Key file is empty')
    request = urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/interactions',
        data=json.dumps(body, ensure_ascii=False).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'x-goog-api-key': key}, method='POST')
    print(f'{label}: sending 1 TTS request for {len(batch["words"])} words', flush=True)
    try:
        with urllib.request.urlopen(request, timeout=480) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        message = error.read().decode(errors='replace')
        (out / 'request-error.txt').write_text(f'HTTP {error.code}\n{message[:3000]}\n', encoding='utf-8')
        raise RuntimeError(f'HTTP {error.code}; see request-error.txt') from None
    audio = audio_data(result)
    wav.write_bytes(audio)
    summary = {'voice_label':label,'voice_id':batch['voice_id'],'model':MODEL,
               'word_count':len(batch['words']),'wav_bytes':len(audio),
               'sha256':hashlib.sha256(audio).hexdigest(),'interaction_id':result.get('id'),
               'usage':result.get('usage',{})}
    (out / 'response-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{label}: saved {len(audio)} WAV bytes', flush=True)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('Usage: python3 tools/generate_chinese_five_voices.py LABEL')
    main(sys.argv[1])
