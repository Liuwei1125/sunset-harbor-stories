"""Fetch the pinned CC BY 4.0 Highland asset; never execute downloaded code."""
from pathlib import Path
import hashlib
import json
import struct
import urllib.request

ROOT = Path(__file__).resolve().parent
COMMIT = 'af4bef33ca371b24c1f043486f09a13571f4919b'
BASE = f'https://raw.githubusercontent.com/erictfree/Carbon-Footprint-AI-Visualizer/{COMMIT}/models/tesla-model-3-2024/'
EXPECTED = '6ef6933d93ee0812d4049446a38e9b46273cab03b21be1e2ef1d502eccdb684b'

def main():
    folder = ROOT / 'source'
    folder.mkdir(parents=True, exist_ok=True)
    data = urllib.request.urlopen(BASE + 'source/2024_tesla_model_3.glb', timeout=60).read()
    digest = hashlib.sha256(data).hexdigest()
    if digest != EXPECTED:
        raise ValueError('Source hash changed; inspect provenance before continuing')
    length = struct.unpack_from('<I', data, 12)[0]
    gltf = json.loads(data[20:20+length])
    metadata = urllib.request.urlopen('https://api.sketchfab.com/v3/models/36c52f3f89f6439c90310f14e8ff33f2', timeout=30).read()
    listing = json.loads(metadata)
    if listing['license']['slug'] != 'by':
        raise ValueError('Download-page license is no longer CC BY; review required')
    (folder / 'highland.original.glb').write_bytes(data)
    (folder / 'upstream-credits.md').write_bytes(urllib.request.urlopen(BASE+'CREDITS.md', timeout=30).read())
    record = {'retrieved':'2026-09-18','download':BASE+'source/2024_tesla_model_3.glb',
              'sha256':digest,'bytes':len(data),'embeddedCredit':gltf['asset'].get('extras',{}),
              'listing':{key:listing.get(key) for key in ['uid','name','description','license','isDownloadable','faceCount','vertexCount']},
              'uploader':listing['user']['username'],
              'originalSourceStatus':'Embedded original Sketchfab URL returns 404; public re-upload license independently checked through Sketchfab API.'}
    (folder / 'provenance.json').write_text(json.dumps(record,indent=2,ensure_ascii=False)+'\n')
    print(json.dumps({'bytes':len(data),'sha256':digest,'asset':gltf['asset'],'meshes':len(gltf['meshes']),
                      'materials':[x.get('name') for x in gltf['materials']],'extensions':gltf.get('extensionsUsed')},indent=2))

if __name__ == '__main__':
    main()
