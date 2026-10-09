import bpy,bmesh,collections
from pathlib import Path
P=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(P/'models/bmw-m4/source/normalized.blend'))
for digits in [5,4,3]:
 allfaces=set();dups=0
 for o in bpy.context.scene.objects:
  if o.type!='MESH':continue
  co=[tuple(round(v,digits) for v in p.co) for p in o.data.vertices]
  for f in o.data.polygons:
   sig=tuple(sorted(co[i] for i in f.vertices))
   if sig in allfaces:dups+=1
   allfaces.add(sig)
 print('ROUND',digits,dups,flush=True)
for o in bpy.context.scene.objects:
 if o.type=='MESH' and o.data.materials[0].name=='body1':
  bm=bmesh.new();bm.from_mesh(o.data);before=len(bm.verts);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00015);print('BODY',o.name,before,len(bm.verts),'nonmanifold',sum(not e.is_manifold for e in bm.edges));bm.free()
