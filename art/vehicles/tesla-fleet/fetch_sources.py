"""Fetch attributed, pinned model files only; no upstream application code is run."""
from pathlib import Path
from urllib.parse import quote, urljoin
import urllib.request, json, struct, hashlib, concurrent.futures

HERE=Path(__file__).resolve().parent
SOURCES={
 'model-y':dict(repo='Tina2088/tina-3d-tesla',revision='5f81eea9d6ed050389958b6aad82be8e589adcc9',path='public/models/model-y.glb',credit='public/models/LICENSE.txt',uid='c0a86cac582d4b33aba0fb1b1912d970'),
 'roadster':dict(repo='gwesseling/Tesla-app',revision='a03a55533adcf0f45a610b7bc4e1a9e03277c13c',path='assets/test4.glb',uid='1fbf29e297bd4a17ac39a00a378441d8'),
 'cybertruck':dict(repo='MigrantCaravan/Tesla-CyberTruck-Model3-Paint-Selector',revision='6616e4a5eb5b6944f13e4b4ebcfc3d9ec9cc74ed',path='public/tesla_cybertruck/scene.gltf',credit='public/tesla_cybertruck/license.txt',uid='1ab0c3f248fa47019c4311abce9731a0')
}
def read(url):
    with urllib.request.urlopen(url,timeout=90) as r:return r.read()
def run(item):
    key,s=item;dest=HERE/'models'/key/'source';dest.mkdir(parents=True,exist_ok=True)
    listing=json.loads(read('https://api.sketchfab.com/v3/models/'+s['uid']))
    assert listing['license']['slug']=='by',f'{key}: incompatible license'
    base='https://raw.githubusercontent.com/'+s['repo']+'/'+s['revision']+'/'
    url=base+quote(s['path']);suffix=Path(s['path']).suffix;target=dest/('asset'+suffix)
    data=target.read_bytes() if target.exists() else read(url);target.write_bytes(data)
    doc=json.loads(data[20:20+struct.unpack_from('<I',data,12)[0]]) if suffix=='.glb' else json.loads(data)
    files=[{'file':target.name,'url':url,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}]
    for part in doc.get('buffers',[])+doc.get('images',[]):
        name=part.get('uri')
        if not name or name.startswith('data:'):continue
        local=dest/name
        assert local.resolve().is_relative_to(dest.resolve()) and '://' not in name
        local.parent.mkdir(parents=True,exist_ok=True);resource=local.read_bytes() if local.exists() else read(urljoin(url,quote(name)));local.write_bytes(resource)
        files.append({'file':name,'url':urljoin(url,quote(name)),'bytes':len(resource),'sha256':hashlib.sha256(resource).hexdigest()})
    if s.get('credit'):(dest/'upstream-license.txt').write_bytes(read(base+quote(s['credit'])))
    provenance={'retrieved':'2026-09-18','source':s,'files':files,'embeddedAsset':doc.get('asset'),'listing':{k:listing.get(k) for k in ['uid','name','description','license','faceCount','isDownloadable']},'author':{k:listing['user'].get(k) for k in ['username','displayName','profileUrl']}}
    (dest/'provenance.json').write_text(json.dumps(provenance,indent=2,ensure_ascii=False)+'\n')
    return {'model':key,'files':len(files),'bytes':sum(f['bytes'] for f in files),'asset':doc.get('asset'),'meshes':len(doc.get('meshes',[])),'materials':[m.get('name') for m in doc.get('materials',[])]}
if __name__=='__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for result in pool.map(run,SOURCES.items()):print(json.dumps(result,ensure_ascii=False),flush=True)
