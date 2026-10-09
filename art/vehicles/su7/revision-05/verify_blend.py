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
