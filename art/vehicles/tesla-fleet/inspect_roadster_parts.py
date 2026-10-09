import bpy,bmesh,json
from pathlib import Path
HERE=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(HERE/'models/roadster/source/normalized.blend'))
o=bpy.data.objects['roadster.008_interior_0'];bm=bmesh.new();bm.from_mesh(o.data);remaining=set(bm.verts);parts=[]
while remaining:
 seed=remaining.pop();component={seed};stack=[seed]
 while stack:
  for e in stack.pop().link_edges:
   for v in e.verts:
    if v in remaining:remaining.remove(v);component.add(v);stack.append(v)
 lo=[min(v.co[i] for v in component) for i in range(3)];hi=[max(v.co[i] for v in component) for i in range(3)]
 if lo[0]<-.15 and hi[0]>-.6 and hi[1]>.15 and lo[1]<.65 and hi[2]>.45 and lo[2]<1.0:parts.append({'vertices':len(component),'lo':lo,'hi':hi})
print('PARTS',json.dumps(parts))
