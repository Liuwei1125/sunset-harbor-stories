"""Inspect source geometry without executing embedded asset scripts."""
import bpy
import json
from mathutils import Vector
from pathlib import Path

HERE=Path(__file__).resolve().parent
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(HERE/'source/highland.original.glb'))
report=[]
for o in bpy.context.scene.objects:
    if o.type!='MESH':continue
    corners=[o.matrix_world@Vector(v) for v in o.bound_box]
    bounds=[[min(v[i] for v in corners),max(v[i] for v in corners)] for i in range(3)]
    report.append({'name':o.name,'bounds':bounds,'vertices':len(o.data.vertices),'faces':len(o.data.polygons),'materials':[m.name if m else None for m in o.data.materials]})
(HERE/'source/inspection.json').write_text(json.dumps(report,indent=2))
print('SOURCE_INSPECTION',json.dumps(report))
print('MATERIALS',json.dumps([{ 'name':m.name,'nodes':[{'name':n.name,'type':n.type,'image':n.image.name if n.type=='TEX_IMAGE' and n.image else None} for n in m.node_tree.nodes]} for m in bpy.data.materials]))
