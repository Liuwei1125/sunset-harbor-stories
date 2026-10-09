"""Dependency-free checks of delivered GLB structure, motion pivots and source evidence."""
from pathlib import Path
import json,struct,hashlib,math
HERE=Path(__file__).resolve().parent
checks=[]
def check(name,ok):
    checks.append({'name':name,'passed':bool(ok)})
    if not ok:raise AssertionError(name)
def glb(path):
    b=path.read_bytes();magic,version,size=struct.unpack_from('<4sII',b)
    check(path.name+': complete GLB v2',magic==b'glTF' and version==2 and size==len(b))
    n,t=struct.unpack_from('<II',b,12);assert t==0x4e4f534a
    d=json.loads(b[20:20+n]);offset=20+n;n,t=struct.unpack_from('<II',b,offset);assert t==0x004e4942
    return d,b[offset+8:offset+8+n]
def values(d,bin,index):
    a=d['accessors'][index];v=d['bufferViews'][a['bufferView']];fmt={5120:'b',5121:'B',5122:'h',5123:'H',5125:'I',5126:'f'}[a['componentType']];cols={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']];size=struct.calcsize('<'+fmt)*cols;stride=v.get('byteStride',size);base=v.get('byteOffset',0)+a.get('byteOffset',0)
    return [struct.unpack_from('<'+fmt*cols,bin,base+i*stride) for i in range(a['count'])]
for key in ['amg-gt','bmw-m4','porsche-911','bugatti-veyron','lamborghini-centenario','ferrari-458']:
    folder=HERE/'models'/key;cfg=json.loads((folder/'manifest.json').read_text());evidence=json.loads((folder/'source/provenance.json').read_text())
    check(key+': open license',evidence['license']['slug'] in ['by','by-sa'])
    check(key+': source hash',hashlib.sha256((folder/'source'/evidence['file']['name']).read_bytes()).hexdigest()==evidence['file']['sha256'])
    if evidence.get('runtimeSource'):
        r=evidence['runtimeSource'];check(key+': pinned runtime source',hashlib.sha256((folder/'source'/r['file']).read_bytes()).hexdigest()==r['sha256'] and bool(r.get('commit')))
    for file in cfg['files']:
        label=key+'/'+file['lod'];p=folder/file['file'];d,b=glb(p)
        check(label+': exact manifest SHA256',hashlib.sha256(p.read_bytes()).hexdigest()==file['sha256'])
        check(label+': embedded resources',all('uri' not in x for x in d['buffers']+d.get('images',[])))
        nodes={n['name']:n for n in d['nodes']};parents={c:n['name'] for n in d['nodes'] for c in n.get('children',[])};indices={n['name']:i for i,n in enumerate(d['nodes'])}
        check(label+': attributed root',nodes['vehicle:'+key]['extras']['license']==cfg['license'])
        for name,pivot in cfg['joints'].items():
            wheel='joint:wheel-'+name;yaw='joint:steer-'+name
            check(label+': '+name+' pivot and hierarchy',parents[indices[wheel]]==yaw and all(abs(a-b)<1e-5 for a,b in zip(nodes[yaw]['translation'],pivot)) and nodes[wheel].get('translation',[0,0,0])==[0,0,0])
            geometry='geometry:wheel-'+name
            check(label+': '+name+' wheel geometry rotates',geometry in nodes and parents[indices[geometry]]==wheel)
            brake='geometry:brake-'+name
            if brake in nodes:check(label+': '+name+' caliper does not spin',parents[indices[brake]]==yaw)
        if cfg['cabin']:check(label+': independent steering wheel',parents[indices['geometry:steering']]=='joint:steering')
        panels=[p for m in d['meshes'] for p in m['primitives'] if d['materials'][p['material']]['name']=='display:front']
        check(label+': optional UV display',len(panels)==int(cfg['cabin']) and all('TEXCOORD_0' in p['attributes'] for p in panels))
        if cfg['cabin']:
            uv=values(d,b,panels[0]['attributes']['TEXCOORD_0']);check(label+': complete display UV',set(tuple(round(v,5) for v in row) for row in uv)=={(0,0),(0,1),(1,0),(1,1)})
        count=0
        for m in d['meshes']:
            for primitive in m['primitives']:
                pos=values(d,b,primitive['attributes']['POSITION']);ids=values(d,b,primitive['indices']);count+=len(ids)//3
                assert len(ids)%3==0 and all(0<=i[0]<len(pos) for i in ids)
                assert all(math.isfinite(x) for row in pos for x in row)
                normal=values(d,b,primitive['attributes']['NORMAL']);assert all(abs(sum(x*x for x in n)-1)<.015 for n in normal)
        check(label+': finite geometry and valid indices/normals',True)
        check(label+': recorded triangles',count==file['triangles'])
    check(key+': meaningful LOD reduction',cfg['files'][1]['triangles']<cfg['files'][0]['triangles']*.6)
report={'passed':all(c['passed'] for c in checks),'count':len(checks),'checks':checks}
(HERE/'verification.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'passed':report['passed'],'count':len(checks)}))
