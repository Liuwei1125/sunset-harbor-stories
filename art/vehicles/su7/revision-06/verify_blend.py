"""Run with Blender --background xiaomi-su7.blend --python verify_blend.py."""
import bpy,json
from pathlib import Path
from mathutils import Vector

bpy.context.view_layer.update()
checks=[]
for side in [-1,1]:
    for y,position in [(1.55,'front'),(-1.45,'rear')]:
        part='wheel-'+position+('-left' if side<0 else '-right')
        joint=bpy.data.objects['RIG / '+part]
        tire=next(o for o in joint.children if o.name.startswith('Performance radial tire'))
        bounds=[tire.matrix_world@Vector(p) for p in tire.bound_box]
        center=(Vector(tuple(min(p[i] for p in bounds) for i in range(3)))+Vector(tuple(max(p[i] for p in bounds) for i in range(3))))/2
        expected=Vector((side*.841,y,.355))
        assert (center-expected).length<1e-5,(part,center[:],expected[:])
        checks.append({'part':part,'passed':True,'center':list(center)})
wheel=bpy.data.objects['Steering airbag']
assert (wheel.matrix_world.translation-Vector((-.43,.260,.802))).length<1e-5
checks.append({'part':'steering','passed':True})
assert len([o for o in bpy.data.objects if o.name.startswith('RIG / ')])==8
assert bpy.context.scene.camera is not None
assert bpy.context.scene.get('assetRevision')=='0.6'
roof=bpy.data.objects['Continuous roof and windscreen glass / shared quad surface']
assert any(m.type=='SOLIDIFY' and m.thickness>.002 for m in roof.modifiers)
assert all(p.normal.z>0 for p in roof.data.polygons)
assert not any(o.name.startswith(('Rear glass painted perimeter panel','Rounded rear windscreen','Swept front windscreen','Panoramic roof')) for o in bpy.data.objects)
checks.append({'part':'single outward roof surface with glazing thickness','passed':True})
from mathutils.bvhtree import BVHTree
console_object=bpy.data.objects['Center console']
console=BVHTree.FromObject(console_object,bpy.context.evaluated_depsgraph_get())
for x in [-.064,.064]:
    origin=console_object.matrix_world.inverted()@Vector((x,-.105,.65))
    direction=console_object.matrix_world.inverted().to_3x3()@Vector((0,0,-1))
    hit,normal,index,distance=console.ray_cast(origin,direction.normalized(),.2)
    world_hit=console_object.matrix_world@hit if hit is not None else None
    assert world_hit is not None and world_hit.z<.57,(x,world_hit)
checks.append({'part':'two cup wells have actual recessed geometry','passed':True})
images=[i for i in bpy.data.images if i.source=='FILE']
assert images and all(i.packed_file for i in images)
checks.append({'part':'reference and lighting images packed in source','passed':True})
groups=[o for o in bpy.data.objects if o.name.startswith('Batch /')]
assert len(groups)==9 and all(len(o.data.splines)==o['sourceCurveCount'] for o in groups)
checks.append({'part':'fine curves retained after editable grouping','passed':True,'groups':len(groups)})
reference=bpy.data.objects.get('REVIEW / reference-front')
if reference:
    from bpy_extras.object_utils import world_to_camera_view
    fit=json.loads((Path(bpy.data.filepath).parent/'reference-camera-fit.json').read_text())
    scene=bpy.context.scene;scene.render.resolution_x=2048;scene.render.resolution_y=1152
    errors=[]
    for mark in fit['landmarks']:
        projected=world_to_camera_view(scene,reference,Vector(mark['world']))
        actual=Vector((projected.x*2048,(1-projected.y)*1152))
        errors.append((actual-Vector(mark['projectedPixel'])).length)
    assert max(errors)<.1,errors
    checks.append({'part':'reference camera projection implementation','passed':True,'maxPixelDifference':max(errors)})
report={'passed':True,'checks':checks,'rigs':8,'blender':bpy.app.version_string}
path=Path(bpy.data.filepath).parent/'blender-verification.json'
path.write_text(json.dumps(report,indent=2)+'\n')
print('BLENDER_SOURCE_VERIFIED',json.dumps(report))
