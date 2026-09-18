"""Derive runtime LODs without modifying any artist's source or Blender project."""
from pathlib import Path
import bpy, json, hashlib, shutil
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'club/circuit/assets'
for ident in ['bmw-m4','ferrari-458','su7']:
 source=ROOT/('art/vehicles/su7' if ident=='su7' else f'art/vehicles/performance-fleet/models/{ident}')
 stem='xiaomi-su7' if ident=='su7' else ident
 manifest=json.loads((source/'manifest.json').read_text())
 dest=OUT/ident;dest.mkdir(parents=True,exist_ok=True)
 outputs=[]
 for lod,budget in [('high',115000),('low',36000)]:
  bpy.ops.wm.read_factory_settings(use_empty=True)
  original=source/f"{stem}.{'high' if lod=='high' and ident!='su7' else 'low'}.glb"
  bpy.ops.import_scene.gltf(filepath=str(original))
  meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
  for o in meshes:o.data.calc_loop_triangles()
  total=sum(len(o.data.loop_triangles) for o in meshes);ratio=min(1,budget/total)
  for o in meshes:
   if len(o.data.loop_triangles)<200 or 'display' in o.name.lower():continue
   if ratio<.999:
    bpy.context.view_layer.objects.active=o
    mod=o.modifiers.new('Circuit runtime LOD','DECIMATE');mod.ratio=ratio
    bpy.ops.object.modifier_apply(modifier=mod.name)
  for o in meshes:o.data.calc_loop_triangles()
  path=dest/f'{ident}.{lod}.glb'
  bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_extras=True,export_cameras=False,export_lights=False)
  outputs.append({'sourceFile':str(original.relative_to(ROOT)),'sourceSha256':hashlib.sha256(original.read_bytes()).hexdigest(),'lod':lod,'file':path.name,'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'triangles':sum(len(o.data.loop_triangles) for o in meshes)})
 manifest['runtimeFiles']=outputs
 manifest['status']='Integrated Harbor Circuit runtime derivative; original source preserved.'
 manifest['runtimeSource']={'file':str(original.relative_to(ROOT)),'sha256':hashlib.sha256(original.read_bytes()).hexdigest(),'change':'Per-mesh simplification for racing LOD; hierarchy, articulation, UV and material attribution retained.'}
 (dest/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 print(ident,outputs,flush=True)
for name,source in [('performance-telemetry.js','performance-fleet/telemetry.js'),('su7-telemetry.js','su7/telemetry.js')]:
 shutil.copy2(ROOT/'art/vehicles'/source,OUT/name)
