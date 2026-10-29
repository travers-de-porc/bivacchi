#!/usr/bin/env python3
"""Lossless, deterministic XLSX-to-CSV extraction using only the Python standard library.

Cached formula results are retained. Formula expressions, attributes, hyperlink targets,
and comments are exported separately; no formulas, geocoding, or HTTP requests execute.
"""
import argparse
import csv
import json
import posixpath
import re
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
NS = {'m': MAIN}
ROOT = Path(__file__).resolve().parents[1]


def text(element):
    return ''.join(t.text or '' for t in element.iter(f'{{{MAIN}}}t')) if element is not None else ''


def relationships(archive, path):
    rel_path = posixpath.join(posixpath.dirname(path), '_rels', posixpath.basename(path) + '.rels')
    if rel_path not in archive.namelist():
        return {}
    return {r.attrib['Id']: dict(r.attrib) for r in ET.fromstring(archive.read(rel_path))}


def convert(source, target):
    records, headers, metadata, names = [], [], [], set()
    with ZipFile(source) as archive:
        shared = [text(item) for item in ET.fromstring(archive.read('xl/sharedStrings.xml'))] if 'xl/sharedStrings.xml' in archive.namelist() else []
        workbook = ET.fromstring(archive.read('xl/workbook.xml'))
        workbook_rels = relationships(archive, 'xl/workbook.xml')
        for sheet in workbook.findall('m:sheets/m:sheet', NS):
            relation = workbook_rels[sheet.attrib[f'{{{REL}}}id']]
            sheet_path = posixpath.normpath(posixpath.join('xl', relation['Target']))
            sheet_root = ET.fromstring(archive.read(sheet_path))
            rels = relationships(archive, sheet_path)
            links = {}
            for link in sheet_root.findall('m:hyperlinks/m:hyperlink', NS):
                relation = rels.get(link.attrib.get(f'{{{REL}}}id'), {})
                links[link.attrib['ref']] = relation.get('Target', link.attrib.get('location', ''))
            comments = {}
            for relation in rels.values():
                if relation['Type'].endswith('/comments'):
                    comments_path = posixpath.normpath(posixpath.join(posixpath.dirname(sheet_path), relation['Target']))
                    comment_root = ET.fromstring(archive.read(comments_path))
                    comments = {c.attrib['ref']: text(c) for c in comment_root.findall('m:commentList/m:comment', NS)}
            rows = sheet_root.findall('m:sheetData/m:row', NS)
            columns = {}
            for cell in rows[0]:
                value = cell.findtext('m:v', default='', namespaces=NS)
                columns[re.sub(r'\d', '', cell.attrib['r'])] = shared[int(value)] if cell.attrib.get('t') == 's' else value
            for value in columns.values():
                if value not in headers:
                    headers.append(value)
            count = 0
            for row in rows[1:]:
                record = {'Source': source.name, 'Feuille': sheet.attrib['name'], 'Ligne': row.attrib['r']}
                for cell in row:
                    address = cell.attrib['r']
                    header = columns.get(re.sub(r'\d', '', address))
                    if not header:
                        continue
                    value = cell.findtext('m:v', default='', namespaces=NS)
                    if cell.attrib.get('t') == 's':
                        value = shared[int(value)]
                    elif cell.attrib.get('t') == 'inlineStr':
                        value = text(cell)
                    record[header] = value
                    formula = cell.find('m:f', NS)
                    if formula is not None:
                        record[header + ' [formule]'] = json.dumps({'expression': formula.text or '', 'attributes': formula.attrib}, ensure_ascii=False, separators=(',', ':'))
                        url_match = re.search(r'(?:HYPERLINK|IMAGE)\("((?:[^\"]|\"\")*)"', formula.text or '', re.IGNORECASE)
                        if url_match:
                            record[header + ' [URL]'] = url_match.group(1).replace('""', '"')
                    if address in links:
                        record[header + ' [URL]'] = links[address]
                    if address in comments:
                        record[header + ' [commentaire]'] = comments[address]
                if not record.get('Cabane / lieu', '').strip():
                    continue
                names.add(record['Cabane / lieu'])
                records.append(record)
                count += 1
            metadata.append({'sheet': sheet.attrib['name'], 'rowCount': count, 'headers': list(columns.values()), 'comments': {columns.get(re.sub(r'\d', '', ref), ref): value for ref, value in comments.items()}, 'hiddenColumns': [dict(c.attrib) for c in sheet_root.findall('m:cols/m:col', NS) if c.attrib.get('hidden') == '1']})
        media = [name for name in archive.namelist() if name.startswith('xl/media/')]
        if media:
            media_dir = ROOT / 'public' / 'data' / 'workbook-media'
            media_dir.mkdir(parents=True, exist_ok=True)
            for name in media:
                (media_dir / Path(name).name).write_bytes(archive.read(name))
    extra_headers = sorted({key for record in records for key in record} - set(headers) - {'Source', 'Feuille', 'Ligne'})
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open('w', encoding='utf-8-sig', newline='') as out:
        writer = csv.DictWriter(out, fieldnames=['Source', 'Feuille', 'Ligne', *headers, *extra_headers])
        writer.writeheader()
        writer.writerows(records)
    (target.parent / 'workbook-metadata.json').write_text(json.dumps({'source': source.name, 'rows': len(records), 'uniqueNames': len(names), 'embeddedMedia': media, 'sheets': metadata}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{len(records)} rows, {len(names)} distinct places, {len(media)} embedded images → {target}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=ROOT / 'data' / 'Bivacco Backlog.xlsx')
    parser.add_argument('--output', type=Path, default=ROOT / 'data' / 'bivouacs.csv')
    args = parser.parse_args()
    convert(args.source, args.output)
