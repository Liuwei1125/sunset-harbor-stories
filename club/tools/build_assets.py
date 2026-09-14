"""Non-destructive GLB pipeline. High: original GLB; low: authored LOD source.

Flatten static object transforms and merge by joint/material. Write standard
glTF 2.0 only; both runtime adapters use their native glTF loaders. No decoder,
runtime quantized-pack reader, Blender regeneration or paid asset is involved.
"""
from pathlib import Path
import json,struct,math,base64,hashlib

ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'club/assets/models'
PACKS=[('blender','harbor-pack.js'),('armory','armory-pack.js'),('arcade','arcade-pack.js')]
WANTED={'comet-sport','trail-jeep','quay-container','quay-barrier','quay-lamp','oak-crate','dock-pallet','fuel-drum','sidearm-pistol','ar7-rifle','longwatch-sniper','club-cockpit','club-arrow','club-recurve','club-dart','club-dartboard','club-archery-target','club-shooting-target','club-race-gate','club-canopy-tree','club-meadow'}
IDENTITY=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]
def digest(data):return hashlib.sha256(data).hexdigest()
def mm(a,b):return [sum(a[r*4+k]*b[k*4+c] for k in range(4)) for r in range(4) for c in range(4)]
def local_matrix(n):
    if 'matrix' in n:return [n['matrix'][c*4+r] for r in range(4) for c in range(4)]
    x,y,z,w=n.get('rotation',[0,0,0,1]);s=n.get('scale',[1,1,1]);t=n.get('translation',[0,0,0])
    a=[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w),t[0],2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w),t[1],2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y),t[2],0,0,0,1]
    for r in range(3):
        for c in range(3):a[r*4+c]*=s[c]
    return a
def point(m,p):return [sum(m[r*4+c]*p[c] for c in range(3))+m[r*4+3] for r in range(3)]
def cross(a,b):return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
def normal(m,n):
    cols=[[m[r*4+c] for r in range(3)] for c in range(3)]
    inv=[cross(cols[1],cols[2]),cross(cols[2],cols[0]),cross(cols[0],cols[1])]
    det=sum(cols[0][i]*inv[0][i] for i in range(3))
    q=[sum(inv[c][r]*n[c] for c in range(3))/(det or 1) for r in range(3)]
    l=math.sqrt(sum(x*x for x in q)) or 1
    return [x/l for x in q]
def load_glb(path):
    data=path.read_bytes();assert data[:4]==b'glTF';size,kind=struct.unpack_from('<II',data,12)
    doc=json.loads(data[20:20+size]);off=20+size;binary=data[off+8:]
    return doc,binary
def accessor(doc,binary,index):
    a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']]
    kind={5120:'b',5121:'B',5122:'h',5123:'H',5125:'I',5126:'f'}[a['componentType']]
    width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']];fmt='<'+kind*width
    stride=v.get('byteStride',struct.calcsize(fmt));offset=v.get('byteOffset',0)+a.get('byteOffset',0)
    return [struct.unpack_from(fmt,binary,offset+i*stride) for i in range(a['count'])]
def high_groups(doc,binary,joints):
    groups={}
    def visit(index,parent):
        n=doc['nodes'][index];m=mm(parent,local_matrix(n));part=n.get('extras',{}).get('part_id','body');pivot=joints.get(part,{}).get('pivot',[0,0,0])
        if 'mesh' in n:
            for primitive in doc['meshes'][n['mesh']]['primitives']:
                assert primitive.get('mode',4)==4
                key=(part,primitive.get('material',0));g=groups.setdefault(key,{'positions':[],'normals':[],'indices':[]})
                a=primitive['attributes'];positions=accessor(doc,binary,a['POSITION']);normals=accessor(doc,binary,a['NORMAL']);indices=accessor(doc,binary,primitive['indices'])
                first=len(g['positions'])//3
                for p,norm in zip(positions,normals):
                    q=point(m,p);g['positions'] += [q[i]-pivot[i] for i in range(3)];g['normals']+=normal(m,norm)
                g['indices'] += [i[0]+first for i in indices]
        for child in n.get('children',[]):visit(child,m)
    for n in doc['scenes'][doc.get('scene',0)]['nodes']:visit(n,IDENTITY)
    return groups,doc.get('materials',[])
def linear(x):return x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4
def low_groups(pack,asset):
    groups={};materials=[]
    for part in asset['lods']['low']:
        mesh=pack['meshes'][part['mesh']];v=base64.b64decode(mesh['v']);ind=base64.b64decode(mesh['i'])
        rows=list(struct.iter_unpack('<hhhhhh',v));base=[linear(c) for c in part['color']]
        mat={'name':f"{part['part']}:{part.get('role','') or 'surface'}:{len(materials)}",'doubleSided':True,'pbrMetallicRoughness':{'baseColorFactor':base+[1],'metallicFactor':part['metallic'],'roughnessFactor':part['roughness']},'extras':{'role':part.get('role',''),'unlit':part.get('unlit',False)}}
        if part.get('unlit'):mat.update(emissiveFactor=base,extensions={'KHR_materials_emissive_strength':{'emissiveStrength':2}})
        index=len(materials);materials.append(mat)
        groups[(part['part'],index)]={'positions':[value*.001 for row in rows for value in row[:3]],'normals':[value/32767 for row in rows for value in row[3:]],'indices':[v[0] for v in struct.iter_unpack('<H',ind)]}
    return groups,materials
def write_glb(path,asset_id,asset,groups,materials,lod):
    doc={'asset':{'version':'2.0','generator':'Harbor Club standard GLB optimizer 1'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'name':asset_id,'children':[],'extras':{'assetId':asset_id,'lod':lod}}],'meshes':[],'materials':materials,'buffers':[{'byteLength':0}],'bufferViews':[],'accessors':[]}
    if any('KHR_materials_emissive_strength' in m.get('extensions',{}) for m in materials):doc['extensionsUsed']=['KHR_materials_emissive_strength']
    data=bytearray();bounds=[];triangles=0;parts={}
    def add_acc(values,kind,width,target):
        while len(data)%4:data.append(0)
        offset=len(data);fmt='f' if kind==5126 else 'I';data.extend(struct.pack('<'+fmt*len(values),*values))
        vi=len(doc['bufferViews']);doc['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(values)*4,'target':target})
        a={'bufferView':vi,'componentType':kind,'count':len(values)//width,'type':{1:'SCALAR',2:'VEC2',3:'VEC3'}[width]}
        if target==34962 and width==3:a.update(min=[min(values[c::3]) for c in range(3)],max=[max(values[c::3]) for c in range(3)])
        ix=len(doc['accessors']);doc['accessors'].append(a);return ix
    for (part,mi),g in groups.items():
        joint=asset['joints'].get(part,{'pivot':[0,0,0],'motion':''});pivot=joint['pivot']
        if part not in parts:
            node=len(doc['nodes']);parts[part]=node;doc['nodes'][0]['children'].append(node)
            doc['nodes'].append({'name':'joint:'+part,'translation':pivot,'children':[],'extras':{'partId':part,**joint}})
        pos=g['positions'];norms=g['normals'];inds=g['indices']
        assert len(pos)==len(norms) and len(inds)%3==0 and all(math.isfinite(x) for x in pos+norms)
        assert max(inds)<len(pos)//3
        for i in range(0,len(pos),3):bounds.append([pos[i+c]+pivot[c] for c in range(3)])
        uv=[]
        for i in range(0,len(pos),3):
            n=norms[i:i+3];axis=max(range(3),key=lambda j:abs(n[j]));axes=[j for j in range(3) if j!=axis];uv.extend([pos[i+axes[0]],pos[i+axes[1]]])
        primitive={'attributes':{'POSITION':add_acc(pos,5126,3,34962),'NORMAL':add_acc(norms,5126,3,34962),'TEXCOORD_0':add_acc(uv,5126,2,34962)},'indices':add_acc(inds,5125,1,34963),'material':mi}
        mesh_id=len(doc['meshes']);doc['meshes'].append({'name':f'{asset_id}:{part}:{mi}','primitives':[primitive]})
        child=len(doc['nodes']);doc['nodes'][parts[part]]['children'].append(child);doc['nodes'].append({'name':f'geometry:{part}:{mi}','mesh':mesh_id,'extras':{'partId':part,'role':materials[mi].get('extras',{}).get('role','')}})
        triangles+=len(inds)//3
    # Socket-only joints remain in the native node hierarchy.
    for part,joint in asset['joints'].items():
        if part not in parts:
            doc['nodes'][0]['children'].append(len(doc['nodes']));doc['nodes'].append({'name':'joint:'+part,'translation':joint['pivot'],'extras':{'partId':part,**joint}})
    doc['buffers'][0]['byteLength']=len(data);text=json.dumps(doc,separators=(',',':')).encode();text+=b' '*((-len(text))%4);data.extend(b'\0'*((-len(data))%4))
    glb=struct.pack('<III',0x46546C67,2,28+len(text)+len(data))+struct.pack('<II',len(text),0x4E4F534A)+text+struct.pack('<II',len(data),0x004E4942)+data
    path.write_bytes(glb)
    return {'file':'models/'+path.name,'bytes':len(glb),'sha256':digest(glb),'triangles':triangles,'drawGroups':len(groups),'bounds':[[min(p[k] for p in bounds) for k in range(3)],[max(p[k] for p in bounds) for k in range(3)]]}

def main():
    OUT.mkdir(parents=True,exist_ok=True);manifest={'version':1,'coordinates':'right-handed; meters; Y up; -Z forward','pipeline':'glTF 2.0 / GLB, uncompressed, native engine loaders; no runtime geometry decoder','assets':{},'textures':{},'licenses':[{'id':'harbor-originals','license':'Original project assets','sources':['art/harbor-workshop.blend','art/harbor-armory.blend','art/harbor-arcade.blend']}]}
    for folder,filename in PACKS:
        source=ROOT/'assets'/folder/filename;raw=source.read_text();pack=json.loads(raw[raw.index('{'):raw.rindex('}')+1])
        for name,asset in pack['assets'].items():
            if name not in WANTED:continue
            path=source.parent/(name+'.glb');before=digest(path.read_bytes());doc,binary=load_glb(path)
            groups,materials=high_groups(doc,binary,asset['joints']);high=write_glb(OUT/(name+'.high.glb'),name,asset,groups,materials,'high')
            groups,materials=low_groups(pack,asset);low=write_glb(OUT/(name+'.low.glb'),name,asset,groups,materials,'low')
            entry={'id':name,'label':asset['label'],'source':{'file':str(path.relative_to(ROOT)),'sha256':before,'lowSource':str(source.relative_to(ROOT)),'lowSourceSha256':digest(source.read_bytes())},'lods':{'high':high,'low':low},'joints':asset['joints'],'bounds':high['bounds'],'collision':{'type':'box','bounds':high['bounds']},'license':'harbor-originals'}
            if name=='club-cockpit':entry['camera']={'driver':[-.37,1.12,.80],'fovDegrees':75}
            manifest['assets'][name]=entry;assert digest(path.read_bytes())==before
            print(name,high['triangles'],low['triangles'],'triangles;',high['drawGroups'],'merged groups',flush=True)
    for p in (ROOT/'club/assets/textures').glob('*.png'):manifest['textures'][p.name]={'file':'textures/'+p.name,'bytes':p.stat().st_size,'sha256':digest(p.read_bytes()),'source':'Original racing-comparison/shared/textures/'+p.name}
    assert set(manifest['assets'])==WANTED
    external=ROOT/'club/assets/external-manifest.json'
    if external.exists():
        extra=json.loads(external.read_text());manifest['assets'].update(extra['assets']);manifest['licenses']+=extra['licenses']
    (ROOT/'club/assets/manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__':main()
