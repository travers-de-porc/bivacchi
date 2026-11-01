#!/usr/bin/env python3
"""Verify bundled photographs; optionally restore their exact audited bytes (stdlib only)."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
from urllib.parse import urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
MAX_BYTES = 6 * 1024 * 1024
LOCAL_PATH = re.compile(r"/images/bivouacs/[a-z0-9][a-z0-9._-]*\.(?:jpg|jpeg|webp|png|avif|gif)")


def valid_bytes(data, photo):
    return len(data) == photo['bytes'] and hashlib.sha256(data).hexdigest() == photo['sha256']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--restore', action='store_true', help='Download missing or damaged files; never accept changed remote content.')
    args = parser.parse_args()
    catalogue = json.loads((ROOT / 'data/photos.json').read_text(encoding='utf-8'))
    gallery = json.loads((ROOT / 'data/photo-gallery.json').read_text(encoding='utf-8'))
    if catalogue['version'] != 1 or gallery['version'] != 1:
        raise ValueError('Version du catalogue photo inconnue.')
    errors = []
    paths = set()
    photos = catalogue['photos'] + gallery['photos']
    for photo in photos:
        try:
            if not LOCAL_PATH.fullmatch(photo['localPath']) or photo['localPath'] in paths:
                raise ValueError('Chemin local invalide ou en double.')
            paths.add(photo['localPath'])
            if not 0 < photo['bytes'] <= MAX_BYTES:
                raise ValueError('Taille hors de la limite du cache PWA.')
            target = ROOT / 'public' / photo['localPath'].lstrip('/')
            if target.is_file() and valid_bytes(target.read_bytes(), photo):
                continue
            if not args.restore:
                raise ValueError('Fichier absent ou empreinte SHA-256 différente ; utiliser --restore pour le récupérer.')
            if urlparse(photo['url']).scheme != 'https':
                raise ValueError('La restauration exige une URL HTTPS publique.')
            request = Request(photo['url'], headers={'User-Agent': 'Bivacco-Explorer-photo-verification/1.0'})
            with urlopen(request, timeout=30) as response:
                data = response.read(MAX_BYTES + 1)
            if not valid_bytes(data, photo):
                raise ValueError('La source a changé : fichier local conservé. Vérifier la nouvelle photo avant de modifier le catalogue.')
            target.parent.mkdir(parents=True, exist_ok=True)
            temporary = target.with_suffix(target.suffix + '.tmp')
            temporary.write_bytes(data)
            temporary.replace(target)
        except (OSError, ValueError) as error:
            label = photo['name'] + (f" ({photo['view']})" if 'view' in photo else '')
            errors.append(f"{label} : {error}")
    if errors:
        print('\n'.join(errors), file=sys.stderr)
        return 1
    total = sum(photo['bytes'] for photo in photos)
    print(f"{len(paths)} photos vérifiées, dont {len(gallery['photos'])} de galerie — {total:,} octets — empreintes SHA-256 conformes.")
    return 0


if __name__ == '__main__':
    sys.exit(main())
