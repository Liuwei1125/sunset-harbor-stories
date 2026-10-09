"""Adapt the attributed Highland mesh for Blender and an independent web preview."""
import bpy, bmesh, json, math, sys, hashlib, struct
from pathlib import Path
from mathutils import Vector, Matrix

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
VERSION='1.0'
JOINTS={'wheel-front-left':(-.798,1.48197,.34512),'wheel-front-right':(.799,1.48194,.34510),
        'wheel-rear-left':(-.80657,-1.39125,.34510),'wheel-rear-right':(.80573,-1.39125,.34510),
        'steering':(-.375,.403,.858)}
ROLES={
 'Geocockpithrsub000332Mtl':'display:rear','Geocockpithrsub000921Mtl':'display:front',
 'Geocockpithrsub1031Mtl':'Seat belt latch','Geodoorl2intsub651Mtl':'Interior trim',
 'Geodoorl2sub11Mtl':'Ceramic upholstery','Geodoorl2sub31Mtl':'Side glazing L',
 'Geodoorlintsub400251Mtl':'Door fabric','Geodoorr2sub31Mtl':'Side glazing R',
 'Geoextwindow0021Mtl':'Panoramic glazing','Geohoodsub00021Mtl':'Body paint',
 'Geohoodsub00031Mtl':'Satin metal','Georimblurlfsub01Mtl':'Graphite trim',
 'Georimblurlfsub021Mtl':'Wheel alloy','Ln12Mtl':'Rear lamps','Ln1Mtl':'Amber lenses',
 'Ln7Mtl':'White lenses','Tire1Mtl':'Tire rubber'}

def linear(c):
    return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4

def color(hexcode):
    return tuple(linear(int(hexcode[i:i+2],16)/255) for i in (0,2,4))+(1,)

def set_input(mat,key,value):
    node=mat.node_tree.nodes.get('Principled BSDF')
    if not node:return
    socket=node.inputs[key]
    for link in list(socket.links):mat.node_tree.links.remove(link)
    socket.default_value=value

def materials():
    for m in list(bpy.data.materials):
        role=ROLES[m.name];m.name=role;m['role']=role
        if role.startswith('display:'):
            nt=m.node_tree;nt.nodes.clear();out=nt.nodes.new('ShaderNodeOutputMaterial');em=nt.nodes.new('ShaderNodeEmission');tex=nt.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(HERE/'textures'/f'{role.replace(":","-")}.png'));nt.links.new(tex.outputs['Color'],em.inputs['Color']);em.inputs['Strength'].default_value=.9;nt.links.new(em.outputs[0],out.inputs['Surface']);continue
        set_input(m,'Metallic',0.0);set_input(m,'Roughness',.48);set_input(m,'Emission Strength',0.0)
        if role=='Body paint':
            set_input(m,'Base Color',color('94252C'));set_input(m,'Metallic',.42);set_input(m,'Roughness',.26);set_input(m,'Coat Weight',.65);set_input(m,'Coat Roughness',.17)
        elif role=='Ceramic upholstery':set_input(m,'Base Color',color('C8C9C7'));set_input(m,'Roughness',.70)
        elif role=='Graphite trim':set_input(m,'Base Color',color('20262B'));set_input(m,'Roughness',.56)
        elif role=='Interior trim':set_input(m,'Base Color',color('BFC2C4'));set_input(m,'Roughness',.52)
        elif role=='Door fabric':set_input(m,'Base Color',color('484E53'));set_input(m,'Roughness',.88)
        elif role=='Tire rubber':set_input(m,'Base Color',color('25292D'));set_input(m,'Roughness',.83)
        elif role in ['Satin metal','Wheel alloy']:set_input(m,'Base Color',color('30383F' if role=='Satin metal' else '7B838F'));set_input(m,'Metallic',.55 if role=='Satin metal' else .83);set_input(m,'Roughness',.30)
        elif 'glazing' in role:
            set_input(m,'Base Color',color('253442'));set_input(m,'Alpha',.80 if role=='Panoramic glazing' else .70);set_input(m,'Roughness',.16);set_input(m,'Specular IOR Level',.28);m.surface_render_method='DITHERED';m.use_backface_culling=True
        elif role=='Rear lamps':set_input(m,'Base Color',color('8F1420'));set_input(m,'Emission Color',color('BD2533'));set_input(m,'Emission Strength',.8);set_input(m,'Roughness',.24)
        elif role=='White lenses':set_input(m,'Base Color',color('D2DCE3'));set_input(m,'Emission Color',color('C9DBF2'));set_input(m,'Emission Strength',.3);set_input(m,'Roughness',.25)
        elif role=='Amber lenses':set_input(m,'Base Color',color('713618'));set_input(m,'Roughness',.28)

def vertex_groups(mesh):
    # Classify whole connected pieces. Never slice triangles at a door or wheel box.
    parent=list(range(len(mesh.vertices)))
    def root(i):
        while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
        return i
    for edge in mesh.edges:
        a,b=map(root,edge.vertices)
        if a!=b:parent[b]=a
    components={}
    for v in mesh.vertices:components.setdefault(root(v.index),[]).append(v)
    roles={}
    for identifier,vs in components.items():
        part='body'
        lo=[min(v.co[i] for v in vs) for i in range(3)];hi=[max(v.co[i] for v in vs) for i in range(3)]
        if all(a>=b for a,b in zip(lo,[-.565,.320,.686])) and all(a<=b for a,b in zip(hi,[-.188,.490,1.032])):part='steering'
        elif lo[2]>=-.001 and hi[2]<.699:
            for key,(x,y,z) in JOINTS.items():
                if not key.startswith('wheel'):continue
                if lo[0]>=min(x-.132,x+.132) and hi[0]<=max(x-.132,x+.132) and all((v.co.y-y)**2+(v.co.z-z)**2<.352**2 for v in vs):part=key;break
        roles[identifier]=part
    return [roles[root(v.index)] for v in mesh.vertices]

def subset(source,polygons,name):
    old=source.data;indices=sorted({v for p in polygons for v in p.vertices});mapping={v:i for i,v in enumerate(indices)}
    data=bpy.data.meshes.new(name);data.from_pydata([old.vertices[i].co for i in indices],[],[tuple(mapping[v] for v in p.vertices) for p in polygons]);data.materials.append(old.materials[0]);data.update()
    if old.uv_layers.active:
        uv=data.uv_layers.new(name='UVMap');old_uv=old.uv_layers.active.data
        for newp,p in zip(data.polygons,polygons):
            for newloop,loop in zip(newp.loop_indices,p.loop_indices):uv.data[newloop].uv=old_uv[loop].uv
    normals=[]
    for newp,p in zip(data.polygons,polygons):
        newp.use_smooth=p.use_smooth
        normals.extend(tuple(old.corner_normals[i].vector) for i in p.loop_indices)
    data.normals_split_custom_set(normals)
    obj=bpy.data.objects.new(name,data);bpy.context.scene.collection.objects.link(obj)
    return obj

def prepare_geometry(meshes):
    # Exterior flush handles share the source's pale cabin material as well.
    for o in list(meshes):
        if o.data.materials[0].name!='Ceramic upholstery':continue
        handles=[];rest=[]
        for p in o.data.polygons:
            c=p.center
            (handles if abs(c.x)>.85 and .76<c.z<.95 and (-.15<c.y<.10 or -1.16<c.y<-.83) else rest).append(p)
        if handles and rest:
            handle=subset(o,handles,'Black flush handles');handle.data.materials[0]=bpy.data.materials['Graphite trim']
            cabin=subset(o,rest,'Pale cabin surfaces');meshes.remove(o);meshes.extend([handle,cabin]);bpy.data.objects.remove(o,do_unlink=True)
    # The artist reused a white material for both lamps and the seats. Separate
    # its cabin geometry before adding light emission or upholstery controls.
    for o in list(meshes):
        if o.data.materials[0].name!='White lenses':continue
        inside=[];outside=[]
        for p in o.data.polygons:
            c=p.center
            (inside if abs(c.x)<.79 and -1.96<c.y<.56 and .25<c.z<1.34 else outside).append(p)
        if inside and outside:
            seats=subset(o,inside,'Cabin upholstery');seats.data.materials[0]=bpy.data.materials['Ceramic upholstery']
            lamps=subset(o,outside,'Exterior lenses');meshes.remove(o);meshes.extend([seats,lamps]);bpy.data.objects.remove(o,do_unlink=True)
    # The source upholstery has split vertices and flat normals at UV seams.
    # Weld the uniform-colour surface and recompute normals, retaining hard trim edges.
    for o in meshes:
        if o.data.materials[0].name!='Ceramic upholstery':continue
        bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001)
        bm.to_mesh(o.data);bm.free();o.data.update()
        for p in o.data.polygons:p.use_smooth=True
        o.data.set_sharp_from_angle(angle=math.radians(55))
        o.data.normals_split_custom_set([(0,0,0)]*len(o.data.loops))
    root=bpy.data.objects.new('tesla-model-3-highland',None);bpy.context.scene.collection.objects.link(root)
    root['version']=VERSION;root['license']='CC BY 4.0';root['credit']='2024 Tesla Model 3 by RBLXSupercars; public upload by brandonleong28. Modified for Harbor. See CREDITS.md.'
    joints={}
    for key,pivot in JOINTS.items():
        o=bpy.data.objects.new('joint:'+key,None);bpy.context.scene.collection.objects.link(o);o.parent=root;o.location=pivot;joints[key]=o
    output=[root,*joints.values()];groups={};source_faces=sum(len(o.data.polygons) for o in meshes)
    for o in meshes:
        role=o.data.materials[0].name
        if role.startswith('display:'):
            key=role.split(':')[1];o.name='geometry:display-'+key;o.parent=root
            lo,hi=bounds([o]);uv=o.data.uv_layers.active
            for p in o.data.polygons:
                for li in p.loop_indices:
                    co=o.data.vertices[o.data.loops[li].vertex_index].co;uv.data[li].uv=((co.x-lo[0])/(hi[0]-lo[0]),(co.z-lo[2])/(hi[2]-lo[2]))
            o['partId']='display-'+key;output.append(o);continue
        vg=vertex_groups(o.data);pieces={}
        for p in o.data.polygons:
            part=vg[p.vertices[0]]
            if role not in ['Tire rubber','Satin metal','Wheel alloy','Graphite trim','White lenses'] and part.startswith('wheel'):part='body'
            pieces.setdefault(part,[]).append(p)
        for part,polys in pieces.items():
            obj=subset(o,polys,part+' / '+role);obj['partId']=part
            if part in joints:obj.data.transform(Matrix.Translation(-Vector(JOINTS[part])));obj.parent=joints[part]
            else:obj.parent=root
            groups.setdefault(part,[]).append(obj);output.append(obj)
        bpy.data.objects.remove(o,do_unlink=True)
    # Consolidate each motion group into a compact mesh while retaining material slots.
    for part,objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        if len(objects)>1:bpy.ops.object.join()
        objects[0].name='geometry:'+part
        if part=='body':
            body=objects[0];trim=bpy.data.materials['Satin metal'].copy();trim.name='Black anodized trim'
            set_input(trim,'Base Color',color('293039'));set_input(trim,'Roughness',.35)
            slot=len(body.data.materials);body.data.materials.append(trim)
            for p in body.data.polygons:
                if body.data.materials[p.material_index].name=='Satin metal' and abs(p.center.x)>.75 and .67<p.center.z<1.36 and -1.6<p.center.y<.8:p.material_index=slot
    output=[root,*root.children_recursive]
    bpy.context.view_layer.update()
    total=sum(len(o.data.polygons) for o in output if o.type=='MESH')
    assert total==source_faces,(source_faces,total)
    for part in JOINTS:assert len(joints[part].children)>0,'Missing geometry: '+part
    return output,root

def export_models(objects,root):
    files=[]
    for lod in ['high','low']:
        clones=[]
        for o in objects:
            if o.type!='MESH' or o.name.startswith('geometry:display-'):continue
            if lod=='low':
                mod=o.modifiers.new('Distance geometry reduction','DECIMATE');mod.ratio=.40 if o.name=='geometry:body' else .48;mod.use_collapse_triangulate=True;clones.append((o,mod))
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        path=HERE/f'tesla-model-3.{lod}.glb'
        bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_apply=True,export_extras=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False)
        for o,mod in clones:o.modifiers.remove(mod)
        data=path.read_bytes();n=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+n]);triangles=sum(doc['accessors'][p['indices']]['count']//3 for m in doc['meshes'] for p in m['primitives'])
        files.append({'lod':lod,'file':path.name,'bytes':len(data),'triangles':triangles,'drawPrimitives':sum(len(m['primitives']) for m in doc['meshes']),'sha256':hashlib.sha256(data).hexdigest()})
    lo,hi=bounds([o for o in objects if o.type=='MESH'])
    manifest={'assetId':'tesla-model-3-highland','version':VERSION,'license':'CC BY 4.0','attribution':'CREDITS.md','sourceSha256':json.loads((HERE/'source/provenance.json').read_text())['sha256'],'coordinates':'meters; Y up; -Z forward in glTF',
        'dimensionsMeters':{'length':hi[1]-lo[1],'widthWithMirrors':hi[0]-lo[0],'height':hi[2]-lo[2],'wheelbase':JOINTS['wheel-front-left'][1]-JOINTS['wheel-rear-left'][1]},
        'joints':{k:{'pivot':[p[0],p[2],-p[1]]} for k,p in JOINTS.items()},'steeringAxis':[0,.309,.951],
        'dynamicDisplays':{'front':{'mesh':'geometry:display-front','material':'display:front','size':[1536,960]},'rear':{'mesh':'geometry:display-rear','material':'display:rear','size':[1024,600]}},
        'files':files,'status':'Independent licensed artist-model adaptation; synthetic telemetry preview; no factory CAD or vehicle physics.'}
    (HERE/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
    return manifest

def bounds(objects):
    pts=[o.matrix_world@Vector(v) for o in objects for v in o.bound_box]
    return [min(p[i] for p in pts) for i in range(3)],[max(p[i] for p in pts) for i in range(3)]

def normalize():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(HERE/'source/highland.original.glb'))
    bpy.context.view_layer.update()
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    lo,hi=bounds(meshes);s=4.720/(hi[0]-lo[0]);center=Vector(((lo[0]+hi[0])/2,(lo[1]+hi[1])/2,lo[2]))
    transform=Matrix.Rotation(math.pi/2,4,'Z')@Matrix.Scale(s,4)@Matrix.Translation(-center)
    for o in meshes:
        o.data.transform(transform@o.matrix_world);o.parent=None;o.matrix_world=Matrix.Identity(4)
        o.name='source:'+o.data.materials[0].name
        o.data.update()
    for o in list(bpy.context.scene.objects):
        if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True)
    bpy.context.view_layer.update()
    return meshes

def studio():
    scene=bpy.context.scene
    scene.render.engine='CYCLES';scene.cycles.samples=32
    scene.cycles.use_denoising=True
    scene.cycles.max_bounces=6;scene.cycles.transparent_max_bounces=8
    scene.render.resolution_x=1600;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
    scene.world=bpy.data.worlds.new('Studio environment');scene.world.use_nodes=True
    nt=scene.world.node_tree;bg=nt.nodes.get('Background');bg.inputs['Strength'].default_value=.45
    env=nt.nodes.new('ShaderNodeTexEnvironment');env.image=bpy.data.images.load(str(ROOT/'assets/showroom/studio.hdr'));nt.links.new(env.outputs['Color'],bg.inputs['Color'])
    for name,pos,power,size in [('Key',(-4,4,7),1600,5),('Rim',(3,-3,5),1300,4),('Front',(0,5,3),450,3)]:
        data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size
        obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=pos;obj.rotation_euler=(Vector((0,0,.7))-obj.location).to_track_quat('-Z','Y').to_euler()
    mat=bpy.data.materials.new('Studio floor');mat.diffuse_color=(.43,.47,.49,1);mat.use_nodes=True;mat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.75
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.01));floor=bpy.context.object;floor.name='STUDIO floor';floor.data.materials.append(mat)
    scene.view_settings.view_transform='AgX';scene.view_settings.exposure=-.5
    return scene

def render_view(name,pos,target,lens=50):
    scene=bpy.context.scene
    data=bpy.data.cameras.new(name);data.lens=lens;data.clip_start=.01
    camera=bpy.data.objects.new(name,data);scene.collection.objects.link(camera);camera.location=pos;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();scene.camera=camera
    scene.render.filepath=str(HERE/'renders'/f'{name}.png');bpy.ops.render.render(write_still=True)

def main():
    (HERE/'renders').mkdir(exist_ok=True)
    meshes=normalize()
    (HERE/'source/normalized-inspection.json').write_text(json.dumps([{'name':o.name,'bounds':bounds([o]),'polygons':len(o.data.polygons)} for o in meshes],indent=2))
    materials();objects,root=prepare_geometry(meshes);info=export_models(objects,root)
    studio()
    # Seat-back clearance checked in the live viewer before final renders.
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'tesla-model-3.blend'))
    print('ASSET_BUILT',json.dumps(info))
    if '--render' in sys.argv:
        render_view('front',(-5,7,2.8),(0,0,.70))
        render_view('rear',(5,-7,2.7),(0,0,.70))
        render_view('cockpit',(-.36,.02,1.11),(-.05,.73,.83),19)

if __name__=='__main__':main()
