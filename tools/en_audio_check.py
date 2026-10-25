#!/usr/bin/env python3
"""Check every English word MP3 with local whisper.cpp; list clips whose transcript does not match the word.

Usage:
  python3 tools/en_audio_check.py [--ids food-pineapple ...]
    -> audio-pilot/en-check-<date>/report.tsv (all words) + review.html (mismatches only, with players)

Mismatches are retried slowed 10% then 15% (temp copy only). Local only: no model API call, no audio changed. whisper.cpp and the small model come from the
恐龍郵局 production project (override with DINO_WHISPER_CLI / DINO_WHISPER_MODEL).
"""
import argparse
import datetime
import difflib
import html
import json
import os
import re
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROD = Path.home() / 'Developer/恐龍郵局｜整體工作流處理/.tools/whisper.cpp'
CLI = Path(os.environ.get('DINO_WHISPER_CLI', PROD / 'build/bin/whisper-cli'))
MODEL = Path(os.environ.get('DINO_WHISPER_MODEL', PROD / 'models/ggml-small.bin'))
AUDIO = ROOT / 'dist/assets/audio'


def norm(text):
    return re.sub(r'[^a-z0-9]', '', text.lower())


def transcribe(mp3, tmp):
    # 1 s of silence on both sides: whisper misses very short clips without it
    wav = Path(tmp) / 'clip.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-t', '1', '-i', 'anullsrc=r=16000:cl=mono',
                    '-i', str(mp3), '-f', 'lavfi', '-t', '1', '-i', 'anullsrc=r=16000:cl=mono', '-filter_complex',
                    '[1]aresample=16000,aformat=channel_layouts=mono[a];[0][a][2]concat=n=3:v=0:a=1',
                    '-c:a', 'pcm_s16le', str(wav)], check=True)
    run = subprocess.run([str(CLI), '-m', str(MODEL), '-l', 'en', '-ng', '-nt', '-np', '-f', str(wav)],
                         capture_output=True, text=True, check=True)
    return ' '.join(run.stdout.split())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ids', nargs='*')
    args = ap.parse_args()
    words = json.loads((ROOT / 'dist/data.json').read_text())
    if args.ids:
        words = [w for w in words if w['id'] in set(args.ids)]
    out = ROOT / 'audio-pilot' / f"en-check-{datetime.date.today():%Y%m%d}"
    out.mkdir(parents=True, exist_ok=True)
    rows = []
    with tempfile.TemporaryDirectory() as tmp:
        for i, w in enumerate(words, 1):
            mp3 = AUDIO / f"{w['id']}.mp3"
            heard = transcribe(mp3, tmp) if mp3.is_file() else '(無檔)'
            # Short words: whisper often mishears at normal speed; retry slowed 10% / 15% on a temp copy
            for factor in (0.9, 0.85):
                if norm(w['en']) == norm(heard) or not mp3.is_file():
                    break
                slow = Path(tmp) / 'slow.mp3'
                subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(mp3), '-filter:a', f'atempo={factor}',
                                str(slow)], check=True)
                if norm(w['en']) == norm(retry := transcribe(slow, tmp)):
                    heard = f'{retry} (放慢 {round((1 - factor) * 100)}%)'
                    break
            score = difflib.SequenceMatcher(None, norm(w['en']), norm(heard)).ratio()
            status = 'ok' if norm(w['en']) == norm(heard.split(' (')[0]) else 'check'
            rows.append((w['id'], w['en'], heard, f'{score:.2f}', status))
            print(f"{i}/{len(words)} {status} {w['en']} -> {heard}", flush=True)
    (out / 'report.tsv').write_text('id\tword\theard\tsimilarity\tstatus\n'
                                    + ''.join('\t'.join(r) + '\n' for r in rows))
    bad = sorted((r for r in rows if r[4] != 'ok'), key=lambda r: float(r[3]))
    items = ''.join(
        f"<tr><td>{html.escape(r[1])}</td><td>{html.escape(r[2])}</td><td>{r[3]}</td>"
        f"<td><audio controls preload=none src='../../dist/assets/audio/{r[0]}.mp3'></audio></td></tr>" for r in bad)
    (out / 'review.html').write_text(
        "<!doctype html><meta charset=utf-8><title>英文音檔檢查</title>"
        "<style>body{font:16px system-ui;margin:16px}td{padding:6px 10px;border-bottom:1px solid #ddd}</style>"
        f"<h1>英文音檔：{len(bad)} 個要聽（共 {len(rows)} 個）</h1><p>相似度低的排前面；來源 report.tsv</p>"
        f"<table><tr><th>單字</th><th>辨識到</th><th>相似度</th><th>試聽</th></tr>{items}</table>")
    print(f"完成：{len(bad)}/{len(rows)} 要聽 → {(out / 'review.html').relative_to(ROOT)}")


if __name__ == '__main__':
    main()
