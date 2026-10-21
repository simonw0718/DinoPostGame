#!/usr/bin/env python3
"""Word audio entry point: fill missing English and Chinese MP3s for dist/data.json.

Usage:
  python3 tools/word_audio.py status                         which words lack English / Chinese audio
  python3 tools/word_audio.py en                             English for missing words (macOS say, offline)
  python3 tools/word_audio.py zh-plan [--voice F11]          lock a batch of words missing Chinese audio
  python3 tools/word_audio.py zh-generate BATCH --allow-model   one Gemini TTS request -> BATCH/<voice>/full.wav
  python3 tools/word_audio.py zh-cut BATCH --approved        after the director listened: cut, stage, then install

Chinese flow (vault/決策/中文音檔離線定位剪輯與入庫流程.md): one long WAV per batch, the director listens to the
whole file, then silence-based cutting. Only text of the batch's words goes to Gemini; the key file is read, never
printed. A batch stops after 2 failed requests (project rule); a new batch needs the director's go-ahead.
"""
import argparse
import datetime
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from cut_chinese_assigned import intervals  # noqa: E402  silence cut proven on the 359-word bank
import generate_chinese_five_voices as tts  # noqa: E402  single long-WAV request

DATA = ROOT / 'dist/data.json'
AUDIO = ROOT / 'dist/assets/audio'
ZH = AUDIO / 'zh'
# Voices and key files already verified for the word bank; new batches reuse them.
VOICES = ROOT / 'audio-pilot/chinese-five-voices-remaining/assignment.json'
BATCHES = ROOT / 'audio-pilot'
MAX_FAILURES = 2


def load():
    return json.loads(DATA.read_text())


def has_file(path, size):
    return path.is_file() and path.stat().st_size >= size


def missing(words):
    return ([w for w in words if not has_file(AUDIO / f"{w['id']}.mp3", 500)],
            [w for w in words if not has_file(ZH / f"{w['id']}.mp3", 1500)])


def cmd_status(args):  # noqa: ARG001
    en, zh = missing(load())
    print(f"缺英文音檔 {len(en)}：{' '.join(w['id'] for w in en) or '無'}")
    print(f"缺中文音檔 {len(zh)}：{' '.join(w['id'] for w in zh) or '無'}")


def cmd_en(args):  # noqa: ARG001
    en, _ = missing(load())
    for word in en:
        with tempfile.NamedTemporaryFile(suffix='.aiff') as temp:
            subprocess.run(['say', '-v', 'Samantha', '-r', '155', '-o', temp.name, word['en']], check=True, timeout=30)
            subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', temp.name,
                            '-codec:a', 'libmp3lame', '-qscale:a', '5', str(AUDIO / f"{word['id']}.mp3")], check=True)
        print('英文', word['id'])
    print(f'完成 {len(en)} 個英文音檔')


def voices():
    return {b['voice_label']: b for b in json.loads(VOICES.read_text())['batches']}


def cmd_zh_plan(args):
    _, zh = missing(load())
    if not zh:
        print('所有單字都有中文音檔'); return
    voice = voices().get(args.voice)
    if not voice:
        sys.exit(f'沒有聲線 {args.voice}；可用：{", ".join(voices())}')
    batch_dir = BATCHES / f"zh-new-{datetime.date.today():%Y%m%d}-{args.voice}"
    if batch_dir.exists():
        sys.exit(f'{batch_dir.relative_to(ROOT)} 已存在；先處理完它')
    batch = {k: voice[k] for k in ('voice_label', 'voice_id', 'key_file')}
    batch['words'] = [{'id': w['id'], 'zh': w['zh'], 'tts_text': w['zh'], 'zhuyin': w['zhuyin']} for w in zh]
    manifest = {'schema_version': 1, 'date': f'{datetime.date.today()}', 'purpose': 'word_audio.py zh batch',
                'data_sha256': hashlib.sha256(DATA.read_bytes()).hexdigest(), 'batches': [batch]}
    batch_dir.mkdir(parents=True)
    (batch_dir / 'assignment.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + '\n')
    print(f"已鎖定 {len(zh)} 詞 → {(batch_dir / 'assignment.json').relative_to(ROOT)}")
    print('多音字或易念錯的詞，生成前可在 assignment.json 改 tts_text（例：浣熊 → 緩熊）；題庫文字不變。')


def batch_paths(batch_dir):
    assignment = Path(batch_dir).resolve() / 'assignment.json'
    if not assignment.is_file():
        sys.exit(f'找不到 {assignment}')
    batch = json.loads(assignment.read_text())['batches'][0]
    return assignment, batch, assignment.parent / batch['voice_label']


def cmd_zh_generate(args):
    if not args.allow_model:
        sys.exit('會呼叫 Gemini TTS；確認後加 --allow-model')
    assignment, batch, out = batch_paths(args.batch)
    log = assignment.parent / 'attempts.json'
    attempts = json.loads(log.read_text()) if log.exists() else []
    if sum(not a['ok'] for a in attempts) >= MAX_FAILURES:
        sys.exit(f'此批已失敗 {MAX_FAILURES} 次，停止；交導演決定（紀錄 {log.relative_to(ROOT)}）')
    try:
        tts.main(batch['voice_label'], assignment)
        attempts.append({'at': datetime.datetime.now().isoformat(timespec='seconds'), 'ok': True})
    except Exception as error:  # record every failed request toward the 2-failure limit
        attempts.append({'at': datetime.datetime.now().isoformat(timespec='seconds'), 'ok': False, 'error': str(error)[:300]})
        raise
    finally:
        log.write_text(json.dumps(attempts, ensure_ascii=False, indent=1) + '\n')
    print(f"請導演聽完整檔：{(out / 'full.wav').relative_to(ROOT)}（{len(batch['words'])} 詞，順序見 transcript.txt）")


def cmd_zh_cut(args):
    if not args.approved:
        sys.exit('導演聽過 full.wav 並同意後才加 --approved')
    _, batch, out = batch_paths(args.batch)
    wav = out / 'full.wav'
    duration, bounds = intervals(wav, len(batch['words']))
    stage = out / 'staged'
    shutil.rmtree(stage, ignore_errors=True)
    stage.mkdir()
    rows = []
    for item, (start, end) in zip(batch['words'], bounds):
        a, b = max(0, start - .08), min(duration, end + .1)
        target = stage / f"{item['id']}.mp3"
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{a:.3f}', '-to', f'{b:.3f}', '-i', str(wav),
                        '-ac', '1', '-ar', '24000', '-codec:a', 'libmp3lame', '-qscale:a', '4', str(target)], check=True)
        subprocess.run(['ffmpeg', '-v', 'error', '-i', str(target), '-f', 'null', '-'], check=True)
        if target.stat().st_size < 1500:
            sys.exit(f'片段太小，整批不入庫：{item["id"]}')
        rows.append({'id': item['id'], 'zh': item['zh'], 'start': round(a, 3), 'end': round(b, 3), 'bytes': target.stat().st_size})
    # Whole batch passed: install files, then point zhAudio at them in one write.
    words = load()
    by_id = {w['id']: w for w in words}
    for row in rows:
        shutil.move(str(stage / f"{row['id']}.mp3"), ZH / f"{row['id']}.mp3")
        by_id[row['id']]['zhAudio'] = f"assets/audio/zh/{row['id']}.mp3"
    DATA.write_text(json.dumps(words, ensure_ascii=False, indent=2) + '\n')
    (out / 'clips-manifest.json').write_text(json.dumps(rows, ensure_ascii=False, indent=1) + '\n')
    print(f'入庫 {len(rows)} 個中文音檔；接著跑 python3 tools/check_data.py，並在遊戲裡抽聽幾個')


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest='cmd', required=True)
    sub.add_parser('status').set_defaults(fn=cmd_status)
    sub.add_parser('en').set_defaults(fn=cmd_en)
    p = sub.add_parser('zh-plan'); p.add_argument('--voice', default='F11'); p.set_defaults(fn=cmd_zh_plan)
    p = sub.add_parser('zh-generate'); p.add_argument('batch'); p.add_argument('--allow-model', action='store_true'); p.set_defaults(fn=cmd_zh_generate)
    p = sub.add_parser('zh-cut'); p.add_argument('batch'); p.add_argument('--approved', action='store_true'); p.set_defaults(fn=cmd_zh_cut)
    args = parser.parse_args()
    args.fn(args)


if __name__ == '__main__':
    main()
