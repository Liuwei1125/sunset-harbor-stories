"""Render the saved, editable Blender files and verify their essential rig data."""
import bpy,json,sys
from pathlib import Path
HERE=Path(__file__).resolve().parent
def render(key):
    p=HERE/'models'/key;bpy.ops.wm.open_mainfile(filepath=str(p/(key+'.blend')));scene=bpy.context.scene;cfg=json.loads((p/'manifest.json').read_text())
    try:
        prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='METAL';prefs.get_devices()
        for d in prefs.devices:d.use=d.type=='METAL'
        scene.cycles.device='GPU'
    except Exception:scene.cycles.device='CPU'
    checks={'packedImages':all(i.packed_file for i in bpy.data.images if i.users and i.source=='FILE'),'cameras':all(bpy.data.objects.get('VIEW / '+v) for v in ['front','rear','cockpit','screen']),'displayUV':not cfg['cabin'] or bpy.data.objects['geometry:display-front'].data.uv_layers.active is not None,'wheelJoints':all(bpy.data.objects.get('joint:wheel-'+n) for n in ['front-left','front-right','rear-left','rear-right'])}
    (p/'blender-verification.json').write_text(json.dumps({'passed':all(checks.values()),'checks':{k:bool(v) for k,v in checks.items()}},indent=2)+'\n');assert all(checks.values()),checks
    for view in (['front','rear','cockpit','screen'] if cfg['cabin'] else ['front','rear']):
        scene.camera=bpy.data.objects['VIEW / '+view];scene.render.filepath=str(p/'renders'/(view+'.png'));bpy.ops.render.render(write_still=True)
    print('RENDERED',key,flush=True)
if __name__=='__main__':
    for key in sys.argv[sys.argv.index('--')+1:]:render(key)
