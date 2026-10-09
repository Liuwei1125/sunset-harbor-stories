"""Require real generated Unity player files. Source code is never counted as a build."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
out=root/'unity-webgl'
assert (out/'index.html').is_file(), 'Unity WebGL HTML has not been built'
files=list((out/'Build').glob('*'))
for part in ['loader.js','framework.js','data','wasm']:
    assert any(part in p.name and p.stat().st_size>100 for p in files), f'Missing real Unity artifact: {part}'
status=json.loads((out/'build-status.json').read_text())
assert status['status']=='built'
print('Verified real Unity player:',status['engine'],len(files),'files',sum(p.stat().st_size for p in files),'bytes')
