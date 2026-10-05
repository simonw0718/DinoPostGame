# coding: utf-8
"""Finish the reviewed Mandarin bank entirely offline, staging before JSON updates."""
import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from cut_chinese_assigned import intervals
BASE=ROOT/'audio-pilot/chinese-five-voices-remaining'
PILOT=ROOT/'audio-pilot/chinese-feifei-R22-DINOC-50'
STAGE=BASE/'staged-clips'
DEST=ROOT/'dist/assets/audio/zh'
DATA=ROOT/'dist/data.json'
LABELS=('R13','R14','R01')
REJECT={'kidapp-avocado','kidapp-parasaurolophus'}


def run(command):
    return subprocess.run(command,capture_output=True,text=True,check=True)


def decode(path):
    if path.stat().st_size<1500: raise RuntimeError(f'Audio too small: {path.name}')
    run(['ffmpeg','-v','error','-i',str(path),'-f','null','-'])
    probe=json.loads(run(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_name,sample_rate,channels','-of','json',str(path)]).stdout)
    stream=probe['streams'][0]
    if stream['codec_name']!='mp3' or stream['channels']!=1 or int(stream['sample_rate'])!=24000:
        raise RuntimeError(f'Unexpected audio format: {path.name}')
    if float(probe['format']['duration'])<.14: raise RuntimeError(f'Audio too short: {path.name}')
    return round(float(probe['format']['duration']),3)


def main():
    assignment=json.loads((BASE/'assignment.json').read_text(encoding='utf-8'))
    data=json.loads(DATA.read_text(encoding='utf-8'))
    ids={word['id'] for word in data}
    current={word['id'] for word in data if word.get('zhAudio')}
    if len(data)!=359 or len(current)!=125:
        raise RuntimeError(f'Unexpected bank state: words={len(data)} Chinese audio={len(current)}')
    pending=ids-current
    STAGE.mkdir(parents=True,exist_ok=True)
    records=[]
    for batch in assignment['batches']:
        label=batch['voice_label']
        if label not in LABELS: continue
        expected=len(batch['words'])
        recognized=(BASE/label/'whisper.txt').read_text(encoding='utf-8').splitlines()
        if len(recognized)!=expected:raise RuntimeError(f'{label} Whisper lines {len(recognized)} != {expected}')
        wav=BASE/label/'full.wav'
        duration,bounds=intervals(wav,expected)
        rows=[]
        for index,(word,(start,end),heard) in enumerate(zip(batch['words'],bounds,recognized),1):
            a=max(0,start-.08);b=min(duration,end+.1)
            target=STAGE/(word['id']+'.mp3')
            run(['ffmpeg','-v','error','-y','-ss',f'{a:.3f}','-to',f'{b:.3f}','-i',str(wav),
                 '-ac','1','-ar','24000','-codec:a','libmp3lame','-qscale:a','4',str(target)])
            clip_duration=decode(target)
            row={'id':word['id'],'zh':word['zh'],'voice':label,'source':'full.wav',
                 'index':index,'start':round(a,3),'end':round(b,3),'duration':clip_duration,
                 'whisper_text':heard,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
            rows.append(row);records.append(row)
        (BASE/label/'clips-manifest.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print(label,'staged',len(rows),flush=True)
    pilot_words=json.loads((PILOT/'manifest.json').read_text(encoding='utf-8'))
    for word in pilot_words:
        if word['id'] in REJECT:continue
        source=PILOT/'clips-aligned'/(word['id']+'.mp3')
        target=STAGE/source.name
        shutil.copy2(source,target)
        clip_duration=decode(target)
        records.append({'id':word['id'],'zh':word['zh'],'voice':'R22','source':'clips-aligned',
                        'index':word['index'],'duration':clip_duration,
                        'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
    new_ids=[row['id'] for row in records]
    if len(records)!=234 or len(set(new_ids))!=234 or set(new_ids)!=pending:
        raise RuntimeError(f'Coverage mismatch: records={len(records)} unique={len(set(new_ids))} missing={len(pending-set(new_ids))} extra={len(set(new_ids)-pending)}')
    # No live database mutation until every staged clip has passed validation.
    DEST.mkdir(parents=True,exist_ok=True)
    for row in records:
        name=row['id']+'.mp3'
        target=DEST/name
        if target.exists(): raise RuntimeError(f'Unexpected existing destination: {name}')
        temporary=DEST/(name+'.tmp')
        shutil.copy2(STAGE/name,temporary)
        temporary.replace(target)
    for word in data:
        if word['id'] in pending: word['zhAudio']='assets/audio/zh/'+word['id']+'.mp3'
    backup=BASE/'data-before-completion.json'
    if not backup.exists(): shutil.copy2(DATA,backup)
    temp=DATA.with_suffix('.json.tmp')
    temp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    temp.replace(DATA)
    (BASE/'completed-clips-manifest.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('committed_to_local_bank',len(records),'total',len(data),flush=True)


if __name__=='__main__':main()
