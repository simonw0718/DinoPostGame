#!/usr/bin/env python3
"""Turn the downloaded official grading lists (reference/raw/) into small TSVs the word-bank tool reads.

Usage: python3 tools/build_reference_lists.py
Sources, URLs and SHA-256 are in reference/sources.json; raw files stay local (gitignored).
The Cambridge PDF is read with macOS PDFKit (swift); TBCL files are zip+XML read with the stdlib.
"""
import hashlib
import json
import re
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REF = ROOT / 'reference'
RAW = REF / 'raw'
SOURCES = json.loads((REF / 'sources.json').read_text())
ODS = '{urn:oasis:names:tc:opendocument:xmlns:table:1.0}'
XLSX = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
LEVEL = re.compile(r'第(\d)\*?級')  # 「*」標記仍屬該級


def check_sha(key):
    src = SOURCES[key]
    path = RAW / src['file']
    if not path.is_file():
        sys.exit(f'缺原始檔 {path}；下載網址見 reference/sources.json')
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != src['sha256']:
        sys.exit(f'{path.name} SHA 不符：{digest}（sources.json 記 {src["sha256"]}）')
    return path


def ods_rows(path):
    root = ET.fromstring(zipfile.ZipFile(path).read('content.xml'))
    for row in root.iter(ODS + 'table-row'):
        cells = []
        for cell in row.findall(ODS + 'table-cell'):
            repeat = min(int(cell.get(ODS + 'number-columns-repeated', '1')), 20)
            cells += [''.join(cell.itertext())] * repeat
        if any(cells):
            yield cells


def xlsx_rows(path):
    book = zipfile.ZipFile(path)
    shared = [''.join(si.itertext()) for si in ET.fromstring(book.read('xl/sharedStrings.xml')).iter(XLSX + 'si')]
    for row in ET.fromstring(book.read('xl/worksheets/sheet1.xml')).iter(XLSX + 'row'):
        out = []
        for cell in row.iter(XLSX + 'c'):
            value = cell.find(XLSX + 'v')
            text = '' if value is None else value.text or ''
            out.append(shared[int(text)] if cell.get('t') == 's' else text)
        yield out


def write_tsv(name, header, rows):
    (REF / name).write_text('\t'.join(header) + '\n' + ''.join('\t'.join(map(str, r)) + '\n' for r in rows))
    print(f'{name}: {len(rows)} 筆')


def tbcl_hanzi():
    rows = []
    for cells in ods_rows(check_sha('tbcl_hanzi')):
        match = LEVEL.search(cells[3]) if len(cells) > 3 else None
        if match:
            rows.append((cells[1], match.group(1), cells[4]))
    write_tsv('tbcl_hanzi.tsv', ('char', 'tbcl_level', 'written_per_million'), rows)


def tbcl_words():
    rows = []
    for cells in xlsx_rows(check_sha('tbcl_words')):
        match = LEVEL.search(cells[3]) if len(cells) > 8 else None
        if match:
            # One entry may list variants ("爸爸/爸"); keep each spelling.
            for word in re.split(r'[/／]', cells[1]):
                rows.append((word.strip(), match.group(1), cells[8]))
    write_tsv('tbcl_words.tsv', ('word', 'tbcl_level', 'bopomofo'), rows)


PDF_TEXT = 'import PDFKit\nlet d = PDFDocument(url: URL(fileURLWithPath: CommandLine.arguments[1]))!\n' \
           'for i in 0..<d.pageCount { print("=====PAGE \\(i+1)"); print(d.page(at: i)?.string ?? "") }\n'


POS = r'(?:n|v|adj|adv|det|pron|prep|conj|excl|dis|int|poss adj|title|ques|mod)\b'
YLE_LEVEL = {'S': 1, 'M': 2, 'F': 3}


def pdf_text(path):
    # swiftc is slow (minutes) the first time, so the compiled helper is cached next to the raw files.
    binary = RAW / '.pdftext'
    if not binary.exists():
        with tempfile.TemporaryDirectory() as tmp:
            script = Path(tmp) / 'pdftext.swift'
            script.write_text(PDF_TEXT)
            subprocess.run(['swiftc', '-O', str(script), '-o', str(binary)], check=True)
    return subprocess.run([str(binary), str(path)], check=True, capture_output=True, text=True).stdout


def yle_words():
    path = check_sha('cambridge_yle')
    first, last = SOURCES['cambridge_yle']['combined_list_pages']
    pages = pdf_text(path).split('=====PAGE ')
    levels = {}
    for page in pages[first:last + 1]:
        for line in page.splitlines():
            # Combined list lines: "<word> <part of speech> <S|M|F>", e.g. "bus stop n M", "mouse/mice n S".
            match = re.match(rf'^(.+?)\s+{POS}.*\s([SMF])$', line.strip())
            if not match:
                continue
            head = re.sub(r'\(.*?\)', '', match.group(1)).strip().lower()
            for word in head.split('/'):
                if re.fullmatch(r"[a-z][a-z' -]*", word.strip()):
                    levels.setdefault(word.strip(), YLE_LEVEL[match.group(2)])
    write_tsv('yle_words.tsv', ('word', 'yle_level'), sorted(levels.items()))


if __name__ == '__main__':
    tbcl_hanzi()
    tbcl_words()
    yle_words()
