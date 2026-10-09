"""Normalize safe mesh imports and write geometry evidence and inspection renders."""
import bpy, json, math, sys
from pathlib import Path
from mathutils import Matrix,Vector
HERE=Path(__file__).resolve().parent
LENGTHS={'model-y':4.751,'roadster':4.60,'cybertruck':5.885}
def bounds(obs):
    vs=[o.matrix_world@Vector(p) for o in obs for p in o.bound_box]
    return [[min(p[i] for p in vs) for i in range(3)],[max(p[i] for p in vs) for i in range(3)]]
def main(key):
    dest=HERE/'models'/key;(dest/'renders').mkdir(exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    src=next((dest/'source').glob('asset.gl*'));bpy.ops.import_scene.gltf(filepath=str(src));bpy.context.view_layer.update()
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];lo,hi=bounds(meshes)
    axis=max(range(2),key=lambda i:hi[i]-lo[i]);s=LENGTHS[key]/(hi[axis]-lo[axis])
    lights=[o for o in meshes if any(any(t in m.name.lower() for t in ['glass_front_lights','headlights_main','teslafrontlight']) for m in o.data.materials if m)]
    front=(sum(sum(bounds([o])[j][axis] for j in [0,1])/2 for o in lights)/len(lights)) if lights else hi[axis]
    positive=front>(lo[axis]+hi[axis])/2;angle=(math.pi/2 if axis==0 else 0)+(0 if positive else math.pi)
    t=Matrix.Rotation(angle,4,'Z')@Matrix.Scale(s,4)@Matrix.Translation(-Vector(((lo[0]+hi[0])/2,(lo[1]+hi[1])/2,lo[2])))
    for o in meshes:
        o.data=o.data.copy();o.data.transform(t@o.matrix_world);o.parent=None;o.matrix_world=Matrix.Identity(4);o.data.update()
    for o in list(bpy.context.scene.objects):
        if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True)
    bpy.context.view_layer.update()
    info={'key':key,'dimensions':bounds(meshes),'sourceAxis':axis,'positiveFront':positive,'meshes':[{'name':o.name,'materials':[m.name for m in o.data.materials if m],'bounds':bounds([o]),'faces':len(o.data.polygons)} for o in meshes]}
    (dest/'source/inspection.json').write_text(json.dumps(info,indent=2)+'\n')
    bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(dest/'source/normalized.blend'))
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True
    try:
        prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='METAL';prefs.get_devices()
        for d in prefs.devices:d.use=d.type=='METAL'
        scene.cycles.device='GPU'
    except Exception:pass
    scene.render.resolution_x=1200;scene.render.resolution_y=800;scene.render.resolution_percentage=100
    scene.world=bpy.data.worlds.new('Inspection world');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.55,.55,.55,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
    for pos,power,size in [((-3,4,7),1200,5),((3,-3,5),900,4)]:
        d=bpy.data.lights.new('Area','AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new('Area',d);scene.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,0,.7))-o.location).to_track_quat('-Z','Y').to_euler()
    for view,pos in [('front',(-5,7,3.3)),('rear',(5,-7,3.0))]:
        d=bpy.data.cameras.new(view);d.lens=45;o=bpy.data.objects.new(view,d);scene.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,0,.75))-o.location).to_track_quat('-Z','Y').to_euler();scene.camera=o;scene.render.filepath=str(dest/'renders'/('source-'+view+'.png'));bpy.ops.render.render(write_still=True)
    print('INSPECTED',key,'meshes',len(meshes),'bounds',info['dimensions'])
if __name__=='__main__':
    for key in sys.argv[sys.argv.index('--')+1:]:main(key)
