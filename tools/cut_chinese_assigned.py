# coding: utf-8
"""Offline cut for a reviewed long voice file; preserve short, loud words."""
import array
import json
import math
import re
import subprocess
import sys
import wave
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BATCH_ROOT=ROOT/'audio-pilot/chinese-five-voices-remaining'
OUTPUT=ROOT/'dist/assets/audio/zh'


def run(cmd):
    return subprocess.run(cmd,capture_output=True,text=True,check=True)


def intervals(wav,expected):
    report=run(['ffmpeg','-hide_banner','-i',str(wav),'-af','silencedetect=noise=-35dB:d=0.3','-f','null','-']).stderr
    starts=[float(x) for x in re.findall(r'silence_start: ([\d.]+)',report)]
    ends=[float(x) for x in re.findall(r'silence_end: ([\d.]+)',report)]
    if len(starts)!=len(ends): raise RuntimeError('Unmatched silence boundaries')
    with wave.open(str(wav)) as source:
        if source.getnchannels()!=1 or source.getsampwidth()!=2: raise RuntimeError('Expected mono PCM16')
        rate=source.getframerate(); duration=source.getnframes()/rate
        boundaries=[]; previous=0.0
        for start,end in zip(starts,ends):
            if start>previous+0.12: boundaries.append((previous,start))
            previous=end
        if duration>previous+0.12: boundaries.append((previous,duration))
        if len(boundaries)!=expected: raise RuntimeError(f'Found {len(boundaries)} segments, expected {expected}')
        for start,end in boundaries:
            source.setpos(min(source.getnframes()-1,int(start*rate)))
            samples=array.array('h');samples.frombytes(source.readframes(max(1,int((end-start)*rate))))
            rms=math.sqrt(sum(v*v for v in samples)/len(samples))/32768
            db=20*math.log10(max(rms,1e-9))
            if db<-28: raise RuntimeError(f'Quiet suspected artifact at {start:.2f}-{end:.2f}: {db:.1f} dB')
    return duration,boundaries


def main(label):
    assignment=json.loads((BATCH_ROOT/'assignment.json').read_text(encoding='utf-8'))
    batch=next(x for x in assignment['batches'] if x['voice_label']==label)
    wav=BATCH_ROOT/label/'full.wav'
    duration,bounds=intervals(wav,len(batch['words']))
    OUTPUT.mkdir(parents=True,exist_ok=True)
    rows=[]
    for index,(item,(start,end)) in enumerate(zip(batch['words'],bounds),1):
        a=max(0,start-.08);b=min(duration,end+.1)
        target=OUTPUT/(item['id']+'.mp3')
        run(['ffmpeg','-v','error','-y','-ss',f'{a:.3f}','-to',f'{b:.3f}',
             '-i',str(wav),'-ac','1','-ar','24000','-codec:a','libmp3lame','-qscale:a','4',str(target)])
        if target.stat().st_size<1500: raise RuntimeError(f'Too small: {target}')
        run(['ffmpeg','-v','error','-i',str(target),'-f','null','-'])
        rows.append({'index':index,'id':item['id'],'zh':item['zh'],'start':round(a,3),'end':round(b,3),'file':'assets/audio/zh/'+target.name,'bytes':target.stat().st_size})
    (BATCH_ROOT/label/'clips-manifest.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(label,'cut',len(rows),'of',len(batch['words']),'duration',round(duration,2))


if __name__=='__main__':
    if len(sys.argv)!=2 or sys.argv[1] not in ('F11','F04'):
        raise SystemExit('Usage: python3 tools/cut_chinese_assigned.py F11|F04')
    main(sys.argv[1])
