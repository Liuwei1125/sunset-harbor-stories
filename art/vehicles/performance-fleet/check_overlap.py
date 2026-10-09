import bpy,sys,collections
from pathlib import Path
P=Path(__file__).resolve().parent
for key in ['bmw-m4','amg-gt']:
 bpy.ops.wm.open_mainfile(filepath=str(P/'models'/key/'source/normalized.blend'));faces={};dups=collections.Counter();total=0
 for o in bpy.context.scene.objects:
  if o.type!='MESH':continue
  co=[tuple(round(v,5) for v in p.co) for p in o.data.vertices];mat=o.data.materials[0].name if o.data.materials else ''
  for f in o.data.polygons:
   k=tuple(sorted(co[i] for i in f.vertices))
   if k in faces:dups[(faces[k],mat)]+=1
   else:faces[k]=mat
   total+=1
 print('OVERLAP',key,total,sum(dups.values()),dups.most_common(15),flush=True)
