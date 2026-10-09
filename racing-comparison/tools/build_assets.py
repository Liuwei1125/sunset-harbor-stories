"""Make original repeatable PBR textures; extract existing authored car meshes.
Run with Blender --background --factory-startup --python this_file.py.
Only writes inside racing-comparison. No third-party game assets are used.
"""
from pathlib import Path
import json, base64, struct, math, shutil, hashlib
import bpy
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT.parent
OUT=ROOT/'shared'
rng=np.random.default_rng(731)

def save(name,a):
    a=np.asarray(a,dtype=np.float32)
    if a.shape[2]==3: a=np.concatenate([a,np.ones((*a.shape[:2],1),dtype=np.float32)],axis=2)
    h,w,_=a.shape
    im=bpy.data.images.new(name,width=w,height=h,alpha=True)
    im.pixels.foreach_set(np.clip(a,0,1).ravel())
    im.filepath_raw=str(OUT/'textures'/name);im.file_format='PNG';im.save()
    bpy.data.images.remove(im)

def noise(h,w,cells,seed):
    r=np.random.default_rng(seed).random((cells+1,cells+1))
    x=np.arange(w)/w*cells;y=np.arange(h)/h*cells
    ix=x.astype(int);iy=y.astype(int);fx=x-ix;fy=y-iy
    fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy)
    r[-1,:]=r[0,:];r[:,-1]=r[:,0]
    return (r[iy[:,None],ix]*(1-fx)+r[iy[:,None],ix+1]*fx)*(1-fy[:,None])+(r[iy[:,None]+1,ix]*(1-fx)+r[iy[:,None]+1,ix+1]*fx)*fy[:,None]

h=w=512
y,x=np.mgrid[0:h,0:w];u=x/w;v=y/h
grain=rng.normal(0,.028,(h,w))
asphalt=.205+grain+.055*noise(h,w,12,1)+.022*noise(h,w,50,2)
worldx=(u-.5)*15.4
for lane in [-5.4,-1.8,1.8,5.4]:
    for offset in [-.7,.7]:asphalt-=.018*np.exp(-((worldx-lane-offset)/.25)**2)
rgb=np.stack([asphalt*.94,asphalt*.99,asphalt*1.02],axis=-1)
paint=np.zeros((h,w),bool)
for edge in [-7.3,7.3]:paint|=abs(worldx-edge)<.075
for lane in [-3.6,0,3.6]:paint|=(abs(worldx-lane)<.065)&(v<.39)
wear=np.clip(.75+grain*2,0,1)
rgb[paint]=np.stack([wear*.96,wear*.955,wear*.90],axis=-1)[paint]
save('road.png',rgb)
dx,dy=np.gradient(asphalt)
save('road-normal.png',np.stack([.5-dy*2,.5-dx*2,np.ones((h,w))],axis=-1))
grass=.6*noise(h,w,18,17)+.3*noise(h,w,80,3)+.1*rng.random((h,w))
save('grass.png',np.stack([.20+grass*.17,.24+grass*.20,.105+grass*.12],axis=-1))
rock=.52*noise(h,w,6,5)+.35*noise(h,w,32,6)+.13*noise(h,w,180,7)
save('rock.png',np.stack([.28+rock*.37,.27+rock*.33,.22+rock*.27],axis=-1))
# Sky panorama and six cube faces share one cloud field, for reflections in both engines.
def sky(d):
    xx,yy,zz=d[...,0],d[...,1],d[...,2]
    t=np.clip(yy,0,1)[...,None]
    color=np.array([.71,.80,.84])*(1-t**.45)+np.array([.16,.38,.61])*t**.45
    a=np.arctan2(zz,xx);e=np.arcsin(np.clip(yy,-1,1))
    clouds=np.zeros_like(xx)
    for k in range(1,6):
        clouds+=(np.sin(a*(k*3+2)+np.sin(e*8+k))*np.cos(e*(k*9+3)+np.cos(a*5)))/k
    c=np.clip((clouds-.10)*.48,0,.83)*np.clip(yy*5,0,1)*np.clip((.9-yy)*4,0,1)
    color=color*(1-c[...,None])+np.array([.94,.94,.91])*c[...,None]
    sun=np.array([-.54,.48,.69]);sun/=np.linalg.norm(sun)
    dot=np.clip(xx*sun[0]+yy*sun[1]+zz*sun[2],0,1)
    glow=(dot**36*.13+dot**1800*.85)[...,None]
    color+=glow*np.array([1,.76,.44])
    return np.clip(color,0,1)
y,x=np.mgrid[0:512,0:1024];a=x/1024*2*np.pi;e=(y/512-.5)*np.pi
d=np.stack([np.cos(e)*np.cos(a),np.sin(e),np.cos(e)*np.sin(a)],axis=-1)
save('sky.png',sky(d))
y,x=np.mgrid[0:256,0:256];a=x/255*2-1;b=y/255*2-1;o=np.ones_like(a)
faces={'px':(o,b,-a),'nx':(-o,b,a),'py':(a,o,-b),'ny':(a,-o,b),'pz':(a,b,o),'nz':(-a,b,-o)}
for name,f in faces.items():
    d=np.stack(f,axis=-1);d/=np.linalg.norm(d,axis=-1)[...,None];save('sky-'+name+'.png',sky(d))

# Quantized meshes preserve the same authoring data across Babylon and Unity.
models=[]
for filename,ids in [('assets/blender/harbor-pack.js',['comet-sport','trail-jeep']),('assets/arcade/arcade-pack.js',['club-cockpit'])]:
    txt=(SOURCE/filename).read_text();pack=json.loads(txt[txt.index('=')+1:].strip().rstrip(';'))
    for asset_id in ids:
        asset=pack['assets'][asset_id];pieces=[]
        for p in asset['lods']['high' if asset_id=='club-cockpit' else 'low']:
            pivot=asset['joints'].get(p['part'],{}).get('pivot',[0,0,0])
            geo=pack['meshes'][p['mesh']]
            pieces.append(dict(part=p['part'],pivot=pivot,vertices=geo['v'],indices=geo['i'],color=p['color'],roughness=p['roughness'],metallic=p['metallic'],emissive=p['unlit'],paint=p['role']=='paint'))
        if asset_id!='club-cockpit':
            grouped={}
            for p in pieces:
                key=json.dumps([p['color'],p['roughness'],p['metallic'],p['emissive'],p['paint']])
                if key not in grouped: grouped[key]=dict(p,part='body',pivot=[0,0,0],verts=[],tris=[])
                g=grouped[key];offset=len(g['verts'])//6
                raw=base64.b64decode(p['vertices']);values=list(struct.unpack('<'+'h'*(len(raw)//2),raw))
                for i in range(0,len(values),6):
                    for j in range(3): values[i+j]+=round(p['pivot'][j]*1000)
                rawi=base64.b64decode(p['indices']);inds=struct.unpack('<'+'H'*(len(rawi)//2),rawi)
                g['verts'].extend(values);g['tris'].extend(i+offset for i in inds)
            pieces=[]
            for g in grouped.values():
                vals=g.pop('verts');inds=g.pop('tris');g['vertices']=base64.b64encode(struct.pack('<'+'h'*len(vals),*vals)).decode();g['indices']=base64.b64encode(struct.pack('<'+'H'*len(inds),*inds)).decode();pieces.append(g)
        models.append(dict(name=asset_id,parts=pieces))
(OUT/'models.json').write_text(json.dumps(dict(models=models),separators=(',',':')))
spec=dict(seed=731,duration=90,roadWidth=15.4,laneWidth=3.6,lanes=[-5.4,-1.8,1.8,5.4],fixedStep=1/120,roadLength=8000,maxSpeed=64,boostSpeed=77,acceleration=9.5,braking=24,drag=.0022,steerResponse=6,lateralDamping=4.8,lateralAcceleration=26,collisionHalfWidth=1.75,collisionHalfLength=4.6,nearMissWidth=2.85,collisionDamage=27,difficulties=[dict(name='巡航',traffic=18,target=3000,speed=1),dict(name='疾驰',traffic=25,target=3700,speed=1.08),dict(name='极限',traffic=32,target=4300,speed=1.16)])
(OUT/'rules.json').write_text(json.dumps(spec,ensure_ascii=False,indent=2)+'\n')
dest=ROOT/'unity/Assets/Resources/Racer'
for p in OUT.rglob('*'):
    if p.is_file() and (p.suffix=='.png' or p.name in ['models.json','world.json','rules.json']):
        q=dest/p.relative_to(OUT);q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q)
manifest={str(p.relative_to(OUT)):dict(bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in OUT.rglob('*') if p.is_file() and (p.suffix=='.png' or p.name in ['models.json','world.json','rules.json'])}
(ROOT/'shared/manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('SHARED ASSETS',len(manifest),'files',sum(v['bytes'] for v in manifest.values()),'bytes')
