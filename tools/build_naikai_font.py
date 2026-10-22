"""Subset 內海字型 (Naikai, OFL) to the characters the game uses -> dist/assets/fonts/naikai-subset.woff2.

Rerun after adding any new text (pages, scripts, data.json). Needs: pip install fonttools brotli
Source font lives in the workflow repo: ../恐龍郵局｜整體工作流處理/tools/card_stage/fonts/NaikaiFont-Regular.ttf
"""
import pathlib, shutil, sys
from fontTools import subset

ROOT = pathlib.Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
SRC = ROOT.parent / '恐龍郵局｜整體工作流處理/tools/card_stage/fonts/NaikaiFont-Regular.ttf'
OUT = DIST / 'assets/fonts/naikai-subset.woff2'

chars = set(chr(c) for c in range(0x20, 0x7f))                   # ASCII
chars |= set(chr(c) for c in range(0x3105, 0x3130)) | set('ˊˇˋ˙')  # 全部注音與聲調
chars |= set('，。、！？～：；「」『』（）…—・★☆✦✓')
for p in DIST.rglob('*'):
    if p.suffix in {'.html', '.js', '.css', '.json'} and 'vendor' not in p.parts:
        chars |= set(p.read_text(encoding='utf-8', errors='ignore'))
chars = {c for c in chars if c.isprintable()}

opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = ['*']
font = subset.load_font(str(SRC), opts); s = subset.Subsetter(opts)
s.populate(text=''.join(chars)); s.subset(font)
OUT.parent.mkdir(parents=True, exist_ok=True); subset.save_font(font, str(OUT), opts)
OUT.with_suffix('.chars.txt').write_text(''.join(sorted(chars)), encoding='utf-8')   # check_data.py 用來比對缺字
shutil.copy(SRC.with_name('OFL-Naikai.txt'), OUT.with_name('OFL-Naikai.txt'))
print(f'{OUT.relative_to(ROOT)}: {len(chars)} chars, {OUT.stat().st_size // 1024} KB', file=sys.stderr)
