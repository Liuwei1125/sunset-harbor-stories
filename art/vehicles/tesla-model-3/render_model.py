"""Add editable inspection cameras and render the built Blender asset."""
import bpy, json, sys, math
from pathlib import Path
from mathutils import Vector

HERE=Path(__file__).resolve().parent
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=1600;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
try:
    prefs=bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type='METAL';prefs.get_devices()
    gpu=False
    for device in prefs.devices:
        device.use=device.type=='METAL';gpu|=device.use
    if gpu:scene.cycles.device='GPU'
except Exception:
    scene.cycles.device='CPU'

views={'front':((-5,7,2.8),(0,0,.70),50),
       'rear':((5,-7,2.7),(0,0,.70),50),
       'cockpit':((-.36,.03,1.12),(-.04,.74,.85),19),
       'screen':((-.22,-.03,1.04),(-.02,.55,.858),28)}
cameras={}
for name,(pos,target,lens) in views.items():
    existing=bpy.data.objects.get('VIEW / '+name)
    if existing:bpy.data.objects.remove(existing,do_unlink=True)
    data=bpy.data.cameras.new('VIEW / '+name);data.lens=lens;data.clip_start=.008
    camera=bpy.data.objects.new('VIEW / '+name,data);scene.collection.objects.link(camera)
    camera.location=pos;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();cameras[name]=camera
scene.camera=cameras['front']
bpy.ops.object.select_all(action='DESELECT')
root=bpy.data.objects['tesla-model-3-highland'];root.select_set(True);bpy.context.view_layer.objects.active=root
bpy.context.preferences.filepaths.save_version=0
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'tesla-model-3.blend'))
checks={'packedImages':all(i.packed_file is not None for i in bpy.data.images if i.source=='FILE' and i.users),'cameraCount':len(cameras),'displayUVs':all(bpy.data.objects['geometry:display-'+n].data.uv_layers.active is not None for n in ['front','rear']),'movingParts':all(bpy.data.objects.get('joint:'+n) for n in ['wheel-front-left','wheel-front-right','wheel-rear-left','wheel-rear-right','steering'])}
(HERE/'blender-verification.json').write_text(json.dumps({'passed':all(checks.values()),'checks':checks},indent=2)+'\n')
assert all(checks.values()),checks
if '--check-only' not in sys.argv:
    for name,camera in cameras.items():
        scene.camera=camera;scene.render.filepath=str(HERE/'renders'/f'{name}.png');bpy.ops.render.render(write_still=True)
print('BLENDER_CHECKS',json.dumps(checks))
