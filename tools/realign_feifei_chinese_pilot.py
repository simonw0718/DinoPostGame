# coding: utf-8
"""Re-cut the saved Feifei 50-word WAV using verified ASR word timestamps."""
import json
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'audio-pilot/chinese-feifei-R22-DINOC-50'
WAV = OUT / 'full.wav'
MANIFEST = json.loads((OUT / 'manifest.json').read_text())
ASR = json.loads((OUT / 'asr-response.json').read_text())
WORDS = ASR['candidates'][0]['content']['parts'][0]['audioTranscription']['words']


def seconds(value):
    return float(value.removesuffix('s'))


def run(command):
    return subprocess.run(command, check=True, capture_output=True, text=True)


def main():
    expected_chars = sum(len(item['zh']) for item in MANIFEST)
    if len(MANIFEST) != 50 or len(WORDS) != expected_chars:
        raise RuntimeError(f'Need exactly 50 items and {expected_chars} ASR characters; got {len(WORDS)}')
    duration = float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                          '-of', 'default=nokey=1:noprint_wrappers=1', str(WAV)]).stdout.strip())
    folder = OUT / 'clips-aligned'
    folder.mkdir(exist_ok=True)
    rows = []
    cursor = 0
    for item in MANIFEST:
        tokens = WORDS[cursor:cursor + len(item['zh'])]
        cursor += len(tokens)
        start = seconds(tokens[0]['startOffset'])
        end = seconds(tokens[-1]['endOffset'])
        if end <= start or end - start > 3 or (rows and start <= rows[-1]['asr_end']):
            raise RuntimeError(f'Invalid or overlapping timestamp: {item["index"]} {item["zh"]}')
        begin, finish = max(0, start - .18), min(duration, end + .18)
        clip = folder / (item['id'] + '.mp3')
        run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{begin:.3f}', '-to', f'{finish:.3f}',
             '-i', str(WAV), '-ac', '1', '-ar', '24000', '-codec:a', 'libmp3lame',
             '-qscale:a', '4', str(clip)])
        run(['ffmpeg', '-v', 'error', '-i', str(clip), '-f', 'null', '-'])
        if clip.stat().st_size < 1500:
            raise RuntimeError(f'Clip too small: {item["index"]}')
        rows.append({**item, 'recognized': ''.join(token['word'] for token in tokens),
                     'asr_start': start, 'asr_end': end,
                     'start': round(begin, 3), 'end': round(finish, 3),
                     'duration': round(finish - begin, 3),
                     'file': 'clips-aligned/' + clip.name, 'bytes': clip.stat().st_size,
                     'alignment': 'Gemini 3.5 Transcribe word timestamps checked against 50-word manifest'})
    if cursor != len(WORDS):
        raise RuntimeError('Not all ASR characters assigned')
    (OUT / 'clips-manifest.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n')
    # Remove the wrong mapping from the regular clips path so it cannot be reused by mistake.
    old = OUT / 'clips'
    if old.exists():
        archive = OUT / 'clips-before-alignment'
        if archive.exists():
            shutil.rmtree(archive)
        old.rename(archive)
    shutil.copytree(folder, old)
    html = (OUT / 'review.html').read_text()
    html = re.sub(r'<title>.*?</title>', '<title>飛飛中文發音 50 詞・校正版</title>', html)
    html = html.replace('飛飛 R22・中文發音 50 詞試聽', '飛飛 R22・中文發音 50 詞（校正版）')
    html = html.replace('尚未放入遊戲，請核對每詞讀音、聲線與切點。',
                        '第 11 詞「蛋」曾被舊版靜音偵測漏掉，現已依逐詞時間戳重新對齊全部 50 詞。請核對讀音、聲線與切點。')
    html = re.sub(r'src="clips/([^"/]+\.mp3)"', r'src="clips-aligned/\1?v=aligned-2"', html)
    (OUT / 'review.html').write_text(html)
    (OUT / 'review-corrected.html').write_text(html)
    (OUT / 'segmentation-note.txt').write_text('Previous silence-only segmentation missed item 11 蛋 at 33.1s; superseded by ASR timestamp alignment.\n')
    (OUT / 'README.md').write_text('# 飛飛中文發音 50 詞試作（校正版）\n\n'
        '- 第 11 詞「蛋」於原始 WAV 約 33.1 秒存在，舊版靜音偵測漏掉後造成後續標籤錯位。\n'
        '- 已依 Gemini 3.5 Transcribe 的逐詞時間戳重切 50 詞，輸出於 `clips-aligned/`；舊片段保存在 `clips-before-alignment/`。\n'
        '- `review-corrected.html` 使用新路徑與快取版本，供人耳審聽。\n'
        '- 生成來源仍為一次 Gemini 3.8 Flash TTS 請求、飛飛 R22／DINOC，未重新生成長音檔。\n'
        '- 音檔尚未加入遊戲。\n')
    print('Aligned 50 clips. Egg:', rows[10]['start'], rows[10]['end'],
          'Bread:', rows[11]['start'], rows[11]['end'])


if __name__ == '__main__':
    main()
