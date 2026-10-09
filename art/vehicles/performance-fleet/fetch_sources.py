"""Download CC BY mesh assets from an openly redistributed archive, retaining evidence."""
from pathlib import Path
import urllib.request,json,gzip,hashlib,struct,subprocess,concurrent.futures,sys
HERE=Path(__file__).resolve().parent
SOURCES={
 'amg-gt':('661dcab94455463784651a3ebc63cfb9','Mercedes-AMG GT'),
 'bmw-m4':('18476c3a7697462f884d8dc8f124d7a0','BMW M4 (2015)'),
 'porsche-911':('d01b254483794de3819786d93e0e1ebf','Porsche 911 Carrera 4S'),
 'lamborghini-centenario':('d679af35b5694301a185c7454a700c73','Lamborghini Centenario'),
 'bugatti-veyron':('653d089ba9304657ab7f0e3552a8f87b','Bugatti Veyron'),
 'ferrari-458':('57bf6cc56931426e87494f554df1dab6','Ferrari 458 Italia')}
def get(url):return urllib.request.urlopen(url,timeout=35).read()
def run(item):
 key,(uid,title)=item;folder=HERE/'models'/key/'source';folder.mkdir(parents=True,exist_ok=True)
 evidence=HERE/'research'/(uid+'.json')
 raw=(HERE/'research/ferrari-archive.json').read_bytes() if key=='ferrari-458' else evidence.read_bytes() if evidence.exists() else get('https://api.sketchfab.com/v3/models/'+uid);d=json.loads(raw)
 if isinstance(d['license'],str):d['license']={'slug':d['license'],'label':'CC Attribution','url':'https://creativecommons.org/licenses/by/4.0/'}
 assert d['license']['slug'] in ['by','by-sa'],(key,d['license']);(folder/'listing.json').write_bytes(raw)
 paths=json.loads(gzip.decompress((HERE/'research/object-paths.json.gz').read_bytes()));path=paths[uid];target=folder/'asset.glb'
 url='https://huggingface.co/datasets/allenai/objaverse/resolve/main/'+path;mirror=url.replace('huggingface.co','hf-mirror.com')
 if not target.exists():
  tmp=target.with_suffix('.partial');subprocess.run(['curl','-fsSL','--connect-timeout','15','--max-time','240','--retry','1',mirror,'-o',str(tmp)],check=True);tmp.rename(target)
 b=target.read_bytes();assert b[:4]==b'glTF';n=struct.unpack_from('<I',b,12)[0];doc=json.loads(b[20:20+n])
 prov={'retrieved':'2026-09-18','uid':uid,'title':title,'sourcePage':d['viewerUrl'],'author':{k:d['user'][k] for k in ['username','displayName','profileUrl']},'license':d['license'],'description':d['description'],'listingStatus':'archived; original listing unavailable' if key=='ferrari-458' else 'live', 'archive':'allenai/objaverse','archiveUrl':url,'downloadUrl':mirror,'assetMetadata':doc['asset'],'file':{'name':'asset.glb','bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}}
 if key=='ferrari-458':
  commit='6eec560494b0492cb72b6120ea2405bf4e4fe9c7';src=folder/'threejs.glb';pinned='https://raw.githubusercontent.com/mrdoob/three.js/'+commit+'/examples/models/gltf/ferrari.glb'
  if not src.exists():src.write_bytes(get(pinned))
  content=src.read_bytes();digest=hashlib.sha256(content).hexdigest();assert digest=='cafe3f48da6797aa9bde75ca768bc5b57db366575fd233e90df186ae988a876e'
  prov['runtimeSource']={'file':'threejs.glb','url':pinned,'pinnedUrl':pinned,'commit':commit,'sha256':digest,'bytes':len(content),'attributionPage':'https://threejs.org/examples/webgl_materials_car.html'}
 (folder/'provenance.json').write_text(json.dumps(prov,ensure_ascii=False,indent=2)+'\n')
 return {'model':key,'size':len(b),'faces':d['faceCount'],'meshes':len(doc.get('meshes',[])),'materials':[m.get('name') for m in doc.get('materials',[])],'embedded':doc['asset']}
if __name__=='__main__':
 selected={k:v for k,v in SOURCES.items() if not sys.argv[1:] or k in sys.argv[1:]}
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
  for f in concurrent.futures.as_completed([pool.submit(run,i) for i in selected.items()]):
   try:print(json.dumps(f.result(),ensure_ascii=False),flush=True)
   except Exception as e:print('ERROR',repr(e),flush=True)
