"""Build independently credited Tesla artist assets with a shared presentation rig."""
import bpy,bmesh,json,math,sys,struct,hashlib
from pathlib import Path
from mathutils import Vector,Matrix
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
CONFIG={
 'model-s':dict(title='Model S',edition='2016 风格 · 自建研究版',paint='253C60',wheelFront=1.556,wheelRear=-1.404,track=.84,radius=.355,steering=[-.38,.43,.94],eye=[-.38,.03,1.23],aim=[-.025,.79,.90],screen=[0,.65,.855,.242,.352,.16],layout='portrait',notes='按官方总体尺寸自建的近似外形与座舱；不冒充下载的精细模型或厂家 CAD。'),
 'model-y':dict(title='Model Y',edition='2021 · 初代造型',paint='DCE3E8',wheelFront=1.4655,wheelRear=-1.416,track=.773,radius=.369,steering=[-.3556,.370,1.030],eye=[-.355,.005,1.32],aim=[-.035,.78,1.12],screen=[0,.35,1.17,.350,.216,.12],layout='landscape',notes='基于 2021 艺术家网格；补建中控显示面，保留原始座椅及方向盘。'),
 'roadster':dict(title='Roadster',edition='第二代概念跑车 · 艺术家模型',paint='A82128',wheelFront=1.4574,wheelRear=-1.4476,track=.776,radius=.338,steering=[-.3303,.413,.685],eye=[-.34,-.04,.98],aim=[-.035,.61,.67],screen=[.016,.48,.566,.225,.350,.64],layout='portrait',notes='采用 metarex.4d 第二代概念车外形；拆分原方向盘并补建中控显示。展示尺寸为近似比例，非量产 CAD。'),
 'cybertruck':dict(title='Cybertruck',edition='2019 概念造型 · 座舱补建',paint='929FA7',wheelFront=2.053,wheelRear=-1.857,track=.965,radius=.435,steering=[-.46,.67,1.245],eye=[-.46,.15,1.64],aim=[-.025,1.15,1.25],screen=[0,.89,1.303,.427,.263,.12],layout='landscape',notes='基于 PolyDucky 早期概念网格；新增座椅、门板、仪表台与可动方向盘。比例和内饰为视觉近似。')
}
def color(s):
    def f(c):return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4
    return tuple(f(int(s[i:i+2],16)/255) for i in (0,2,4))+(1,)
def mat(name,hex='242A30',rough=.5,metal=0,alpha=1,emission=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=color(hex);n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=color(hex);n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=rough;n.inputs['Alpha'].default_value=alpha
    if emission:n.inputs['Emission Color'].default_value=color(hex);n.inputs['Emission Strength'].default_value=emission
    if alpha<1:m.surface_render_method='DITHERED';m.use_backface_culling=True;n.inputs['Specular IOR Level'].default_value=.28
    return m
def bounds(objects):
    pts=[o.matrix_world@Vector(p) for o in objects for p in o.bound_box]
    return [[min(p[i] for p in pts) for i in range(3)],[max(p[i] for p in pts) for i in range(3)]]
def cube(name,center,size,material,bevel=.01):
    bpy.ops.mesh.primitive_cube_add(size=1,location=center);o=bpy.context.object;o.name=name;o.scale=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
    if bevel:
        b=o.modifiers.new('Soft manufactured edges','BEVEL');b.width=bevel;b.segments=3;bpy.ops.object.modifier_apply(modifier=b.name)
        for p in o.data.polygons:p.use_smooth=True
        n=o.modifiers.new('Surface normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=n.name)
    return o
def curve(name,points,material,r=.008,cyclic=False):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=12;c.bevel_depth=r;c.bevel_resolution=3;s=c.splines.new('POLY');s.points.add(len(points)-1)
    for p,co in zip(s.points,points):p.co=(*co,1)
    s.use_cyclic_u=cyclic;o=bpy.data.objects.new(name,c);bpy.context.scene.collection.objects.link(o);o.data.materials.append(material);bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');return bpy.context.object
def display(cfg,mats,folder):
    x,y,z,w,h,slope=cfg['screen'];verts=[(x+dx,y+slope*dz,z+dz) for dx,dz in [(-w/2,-h/2),(w/2,-h/2),(w/2,h/2),(-w/2,h/2)]]
    back=cube('display:front bezel',(x,y+.018,z),(w+.021,.026,h+.021),mats['trim'],.010);back.rotation_euler.x=-math.atan(slope)
    mesh=bpy.data.meshes.new('display surface');mesh.from_pydata(verts,[],[(0,1,2,3)]);mesh.update();uv=mesh.uv_layers.new(name='UVMap')
    for i,co in enumerate([(0,0),(1,0),(1,1),(0,1)]):uv.data[i].uv=co
    o=bpy.data.objects.new('geometry:display-front',mesh);bpy.context.scene.collection.objects.link(o)
    m=bpy.data.materials.new('display:front');m.use_nodes=True;nt=m.node_tree;nt.nodes.clear();out=nt.nodes.new('ShaderNodeOutputMaterial');em=nt.nodes.new('ShaderNodeEmission');tex=nt.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(HERE/'textures'/('display-'+cfg['layout']+'.png')));nt.links.new(tex.outputs['Color'],em.inputs['Color']);em.inputs['Strength'].default_value=.8;nt.links.new(em.outputs[0],out.inputs['Surface']);mesh.materials.append(m)
    return o,back
def steering(cfg,mats):
    # Original presentation yoke; the source cars lack usable separate steering meshes.
    x,y,z=cfg['steering'];points=[]
    for i in range(80):
        a=math.tau*i/80;px=math.cos(a)*.177;pz=math.sin(a)*(.177 if cfg['title']=='Model S' else .115)
        points.append((x+px,y+.18*pz,z+pz))
    ring=curve('steering:leather rim',points,mats['trim'],.019,True)
    hub=cube('steering:airbag',(x,y+.010,z-.008),(.145,.071,.088),mats['trim'],.024)
    parts=[ring,hub]
    for sign in [-1,1]:
        parts.append(cube('steering:spoke',(x+sign*.105,y,z-.013),(.075,.040,.028),mats['metal'],.012))
        parts.append(cube('steering:control',(x+sign*.092,y-.025,z+.003),(.040,.014,.027),mats['trim'],.006))
    return parts
def make_cabin(cfg,mats):
    parts=[cube('cabin:floor',(0,-.05,.55),(1.70,2.42,.07),mats['trim']),cube('cabin:dashboard',(0,1.24,1.245),(1.70,.54,.16),mats['trim'],.045),cube('cabin:dashboard fascia',(0,.966,1.25),(1.66,.028,.09),mats['dash']),cube('cabin:center console',(0,.03,.73),(.27,1.05,.29),mats['trim'],.035)]
    for sign in [-1,1]:
        parts.extend([cube('cabin:door panel',(sign*.862,.14,.96),(.055,1.65,.54),mats['trim'],.02),cube('cabin:door armrest',(sign*.82,.13,1.01),(.11,.65,.058),mats['seat'],.018)])
        for row in [0,-.77]:
            x=sign*.46
            parts.append(cube('cabin:seat cushion',(x,row,.72),(.43,.46,.13),mats['seat'],.055))
            back=cube('cabin:seat back',(x,row-.22,1.00),(.43,.13,.50),mats['seat'],.060);back.rotation_euler.x=math.radians(-9);parts.append(back)
            parts.append(cube('cabin:headrest',(x,row-.255,1.31),(.265,.12,.18),mats['seat'],.045))
            for side in [-1,1]:parts.append(cube('cabin:seat bolster',(x+side*.18,row-.01,.79),(.065,.39,.11),mats['seat'],.028))
            for offset in [-.12,.12]:parts.append(curve('cabin:seat stitch',[(x+offset,row+.15,.789),(x+offset,row-.14,.789)],mats['stitch'],.0012))
    return parts
def subset(o,polys,name):
    old=o.data;ids=sorted({v for p in polys for v in p.vertices});idx={v:i for i,v in enumerate(ids)};m=bpy.data.meshes.new(name);m.from_pydata([old.vertices[i].co for i in ids],[],[tuple(idx[v] for v in p.vertices) for p in polys]);m.materials.append(old.materials[0]);m.update()
    if old.uv_layers.active:
        uv=m.uv_layers.new(name='UVMap')
        for a,b in zip(m.polygons,polys):
            for i,j in zip(a.loop_indices,b.loop_indices):uv.data[i].uv=old.uv_layers.active.data[j].uv
    normals=[]
    for a,b in zip(m.polygons,polys):a.use_smooth=b.use_smooth;normals.extend(tuple(old.corner_normals[i].vector) for i in b.loop_indices)
    m.normals_split_custom_set(normals);n=bpy.data.objects.new(name,m);bpy.context.scene.collection.objects.link(n);return n
def join(objects,name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    if len(objects)>1:bpy.ops.object.join()
    objects[0].name=name;return objects[0]
def smooth(o):
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000007);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();o.data.update()
    for p in o.data.polygons:p.use_smooth=True
    o.data.set_sharp_from_angle(angle=math.radians(48));o.data.normals_split_custom_set([(0,0,0)]*len(o.data.loops))
def build(key):
    cfg=CONFIG[key];folder=HERE/'models'/key;bpy.ops.wm.open_mainfile(filepath=str(folder/'source/normalized.blend'));bpy.context.preferences.filepaths.save_version=0
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];bpy.context.view_layer.update();lo,hi=bounds(meshes)
    if abs(lo[2])>.00001:
        for o in meshes:o.data.transform(Matrix.Translation((0,0,-lo[2])))
    mats={'paint':mat('Body paint',cfg['paint'],.24,.58),'trim':mat('Graphite trim','20262C',.62),'seat':mat('Upholstery','B7BEC3',.8),'glass':mat('Cabin glazing','20333F',.17,.08,.65),'metal':mat('Wheel alloy','76838F',.26,.82),'rubber':mat('Tire rubber','181D22',.85),'red':mat('Rear lights','B32632',.22,0,1,.5),'white':mat('Headlights','DFEDF5',.2,0,1,.7),'amber':mat('Amber light','C77D24',.25,0,1,.3),'brake':mat('Brake caliper','B93431',.5,.35),'disc':mat('Brake disc','59636C',.44,.8),'dash':mat('Dashboard accent','7D756A',.72),'stitch':mat('Seat stitching','687681',.75)}
    n=mats['paint'].node_tree.nodes['Principled BSDF'];n.inputs['Coat Weight'].default_value=.45;n.inputs['Coat Roughness'].default_value=.18
    maps={
      'model-s':{k:k for k in mats},
      'model-y':{'body':'paint','glass_body':'glass','interior':'trim','tires':'rubber','wheels':'metal','metal':'metal','alum':'metal','calipers':'brake','calipers2':'brake','brakedsk':'disc','chrome_rear_lights':'red','chrome_rear_2':'red','glass_lights':'red','glass_front_lights':'white','chrome':'metal','chrome_dark':'trim','fenders':'trim','black':'trim','black2':'trim'},
      'roadster':{'car_main_paint':'paint','interior':'trim','seats':'seat','Sidewall':'rubber','Thread':'rubber','Rims':'metal','Brake_Disc':'disc','calipers':'brake','Glass_mid_tint':'glass','Glass_Tint_max':'glass','Glass_Clear':'glass','mirror':'metal','non_lustrous_metal':'metal','chrome':'metal','carbon_fibre':'trim','Glass_Amber':'amber','indicator_left':'amber','indicator_right':'amber','headlights_AHO':'white','headlights_main':'white','licence_plate_light':'white','Glass_rear_lights_main':'red','Glass_rear_lights_DHO':'red','ior_1':'metal'},
      'cybertruck':{'Base':'paint','TeslaBlack':'trim','TeslaFrontLight':'white','TeslaRearLight':'red','Material.004':'glass','Material.001':'amber'}}[key]
    steering_objects=[]
    for o in meshes:
        source=o.data.materials[0].name;o['sourceMaterial']=source;role=maps.get(source,'trim')
        if key=='model-y':
            ident=int(o.name.split('-')[-1])
            if ident in [132,141,142,143,144,316]:role='glass'
            if 156<=ident<=194:role='seat'
            if 151<=ident<=155:steering_objects.append(o)
            if 195<=ident<=198:role='trim'
            if role=='red' and sum(bounds([o])[i][1] for i in [0,1])>0:role='white'
        if key=='roadster' and o.name=='roadster.014_Metal - Black rough_0':steering_objects.append(o)
        if key=='roadster' and source=='interior':
            # Recess the plain source console behind the new display surface.
            for vertex in o.data.vertices:
                x,y,z=vertex.co
                if abs(x-.016)<.145 and .30<z<.82 and 0<y<.75:vertex.co.y=max(y,.55+.64*(z-.566))
            o.data.update()
        o.data.materials.clear();o.data.materials.append(mats[role])
        if key!='cybertruck' and role in ['paint','seat','trim','metal']:smooth(o)
    if key=='cybertruck':
        # Each original axle contains both wheels. Separate intact left/right islands.
        for name in ['Object_11','Object_13']:
            o=bpy.data.objects[name]
            for sign in [-1,1]:
                polys=[p for p in o.data.polygons if (p.center.x<0)==(sign<0)];part=subset(o,polys,name+(' left' if sign<0 else ' right'));part.data.materials[0]=mats['rubber'];meshes.append(part)
            meshes.remove(o);bpy.data.objects.remove(o,do_unlink=True)
        meshes.extend(make_cabin(cfg,mats));mats['paint'].node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.36
    if key in ['cybertruck','model-s']:steering_objects=steering(cfg,mats);meshes.extend(steering_objects)
    screen,bezel=display(cfg,mats,folder);meshes.extend([screen,bezel])
    bpy.context.view_layer.update()
    license_name='Project-authored geometry' if key=='model-s' else 'CC BY 4.0'
    root=bpy.data.objects.new('vehicle:'+key,None);bpy.context.scene.collection.objects.link(root);root['license']=license_name;root['credit']='See CREDITS.md and source/provenance.json';root['edition']=cfg['edition']
    groups={'body':[],'steering':[]};joints={};pivots={}
    for end,y in [('front',cfg['wheelFront']),('rear',cfg['wheelRear'])]:
        for side,sign in [('left',-1),('right',1)]:
            label=end+'-'+side;piv=Vector((cfg['track']*sign,y,cfg['radius']));pivots[label]=list(piv);parent=root
            yaw=bpy.data.objects.new('joint:steer-'+label,None);bpy.context.scene.collection.objects.link(yaw);yaw.parent=root;yaw.location=piv;joints['steer-'+label]=yaw
            spin=bpy.data.objects.new('joint:wheel-'+label,None);bpy.context.scene.collection.objects.link(spin);spin.parent=yaw;joints['wheel-'+label]=spin;groups['wheel-'+label]=[];groups['brake-'+label]=[]
    st=bpy.data.objects.new('joint:steering',None);bpy.context.scene.collection.objects.link(st);st.parent=root;st.location=cfg['steering'];joints['steering']=st
    for o in meshes:
        if o==screen:o.parent=root;continue
        if o in steering_objects:groups['steering'].append(o);continue
        lo,hi=bounds([o]);cx=(lo[0]+hi[0])/2;cy=(lo[1]+hi[1])/2;label=('front' if cy>0 else 'rear')+'-'+('left' if cx<0 else 'right');p=pivots[label];r=cfg['radius']
        inside=abs(cx)>.55 and hi[2]<r*2+.045 and abs(cy-p[1])<r+.04 and hi[1]-lo[1]<r*2+.1 and hi[0]-lo[0]<.4
        if key=='cybertruck' and o.name.startswith(('Object_11','Object_13')):inside=True
        if inside:
            group=('brake-' if o.data.materials[0]==mats['brake'] else 'wheel-')+label;groups[group].append(o)
        else:groups['body'].append(o)
    print('GROUPS',key,{label:len(items) for label,items in groups.items()},flush=True)
    for label,objects in groups.items():
        if not objects:continue
        o=join(objects,'geometry:'+label)
        if label=='body':o.parent=root
        else:
            p=cfg['steering'] if label=='steering' else pivots[label.split('-',1)[1]];o.data.transform(o.matrix_world);o.data.transform(Matrix.Translation(-Vector(p)));o.matrix_world=Matrix.Identity(4)
            o.parent=joints['steering'] if label=='steering' else joints[('steer-' if label.startswith('brake') else 'wheel-')+label.split('-',1)[1]]
    # Bake the body's active-object transform to keep all exported mesh transforms consistent.
    body=bpy.data.objects['geometry:body'];body.data.transform(body.matrix_world);body.matrix_world=Matrix.Identity(4)
    bpy.context.view_layer.update();objects=[root,*root.children_recursive]
    assert all(groups['wheel-'+l] for l in pivots),'Missing wheel geometry'
    model_bounds=bounds([o for o in objects if o.type=='MESH']);files=[]
    for lod,ratio in [('high',.52 if key=='model-y' else .65 if key=='roadster' else 1),('low',.20 if key!='cybertruck' else .50)]:
        mods=[]
        for o in objects:
            if o.type!='MESH' or o==screen or len(o.data.polygons)<500 or ratio==1:continue
            m=o.modifiers.new('Runtime polygon budget','DECIMATE');m.ratio=ratio;m.use_collapse_triangulate=True;mods.append((o,m))
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        path=folder/f'{key}.{lod}.glb';bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_apply=True,export_extras=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False)
        for o,m in mods:o.modifiers.remove(m)
        data=path.read_bytes();n=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+n]);tris=sum(doc['accessors'][p['indices']]['count']//3 for m in doc['meshes'] for p in m['primitives']);files.append(dict(lod=lod,file=path.name,bytes=len(data),triangles=tris,sha256=hashlib.sha256(data).hexdigest()))
    g=lambda p:[p[0],p[2],-p[1]]
    manifest={'id':key,**cfg,'license':license_name,'coordinates':'metres; glTF Y up, -Z forward','bounds':model_bounds,'dimensions':{k:model_bounds[1][i]-model_bounds[0][i] for k,i in [('width',0),('length',1),('height',2)]},'joints':{k:g(p) for k,p in pivots.items()},'steeringPivot':g(cfg['steering']),'views':{'cockpit':{'eye':g(cfg['eye']),'target':g(cfg['aim'])},'screen':{'eye':g([-.14,cfg['screen'][1]-.44,cfg['screen'][2]+.18]),'target':g(cfg['screen'][:3])}},'display':{'material':'display:front','layout':cfg['layout'],'size':[1536,960] if cfg['layout']=='landscape' else [960,1536]},'files':files}
    (folder/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
    studio(folder,cfg,root)
    bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(folder/(key+'.blend')))
    print('BUILT',key,json.dumps(files),flush=True)
def studio(folder,cfg,root):
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.cycles.transparent_max_bounces=12;scene.render.resolution_x=1440;scene.render.resolution_y=960;scene.render.resolution_percentage=100
    scene.world=bpy.data.worlds.new('Studio');scene.world.use_nodes=True;nt=scene.world.node_tree;env=nt.nodes.new('ShaderNodeTexEnvironment');env.image=bpy.data.images.load(str(ROOT/'assets/showroom/studio.hdr'));nt.links.new(env.outputs['Color'],nt.nodes['Background'].inputs['Color']);nt.nodes['Background'].inputs['Strength'].default_value=.28
    for pos,power,size in [((-4,4,7),950,5),((4,-3,5),1100,4),((0,5,3),300,3)]:
        d=bpy.data.lights.new('Softbox','AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new('Softbox',d);scene.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,0,.7))-o.location).to_track_quat('-Z','Y').to_euler()
    floor=mat('Studio floor','8D979E',.85);cube('STUDIO floor',(0,0,-.10),(200,200,.15),floor,0)
    views={'front':((-5,7,3.0),(0,0,.8),48),'rear':((5,-7,2.8),(0,0,.8),48),'cockpit':(cfg['eye'],cfg['aim'],20),'screen':((-.14,cfg['screen'][1]-.44,cfg['screen'][2]+.18),cfg['screen'][:3],30)}
    for name,(pos,target,lens) in views.items():
        d=bpy.data.cameras.new('VIEW / '+name);d.lens=lens;d.clip_start=.008;o=bpy.data.objects.new('VIEW / '+name,d);scene.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
        if name=='front':scene.camera=o
    scene.view_settings.view_transform='AgX';scene.view_settings.exposure=-.2
    bpy.ops.object.select_all(action='DESELECT');root.select_set(True);bpy.context.view_layer.objects.active=root
if __name__=='__main__':
    for key in sys.argv[sys.argv.index('--')+1:]:build(key)
