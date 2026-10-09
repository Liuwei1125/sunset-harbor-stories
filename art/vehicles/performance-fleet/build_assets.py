"""Preserve attributed artist geometry; add isolated wheel rigs and optional racing displays."""
import bpy,bmesh,json,math,sys,struct,hashlib,importlib.util
from pathlib import Path
from mathutils import Matrix,Vector
import numpy as np
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('harbor_helpers',HERE/'mesh_helpers.py');H=importlib.util.module_from_spec(spec);spec.loader.exec_module(H);H.HERE=HERE
CONFIG={
 'amg-gt':dict(title='Mercedes-AMG GT',brand='Mercedes-AMG',edition='GT · Yan Carvalho',paint='5C9D91',paintMaterials=['Material.001'],tireMaterials=['Material.023'],steering=[-.36,-.09,.81],eye=[-.36,-.56,1.08],aim=[-.04,.40,.88],screen=[0,-.03,.95,.238,.145,.12],layout='landscape',cabin=True,notes='艺术家自建外形与简化座舱；新增独立赛车显示面。'),
 'bmw-m4':dict(title='BMW M4',brand='BMW M',edition='2015 · F82',paint='226FA3',paintMaterials=['body1'],tireMaterials=['Material5'],steering=[-.36,.42,.90],eye=[-.36,-.06,1.19],aim=[-.03,.78,.94],screen=[0,.45,1.035,.242,.143,.12],layout='landscape',cabin=True,notes='保留原作外观和座舱，清理重叠正反面并保留原作法线；赛车显示为新增部件。'),
 'porsche-911':dict(title='Porsche 911',brand='Porsche',edition='Carrera 4S · Lionsharp / Karol Miklas',paint='B9BEC2',paintMaterials=['paint','coat'],tireMaterials=['rubber'],steering=[-.36,.38,.88],eye=[-.36,-.06,1.1],aim=[0,.68,.88],screen=[0,.38,.92,.22,.135,.1],layout='landscape',cabin=False,notes='本资源以外观为主，没有完整可用座舱。模型及改编继续采用 CC BY-SA 4.0。'),
 'lamborghini-centenario':dict(title='Lamborghini Centenario',brand='Lamborghini',edition='LP 770 · SDC PERFORMANCE',paint='65717A',paintMaterials=['Carbon_R'],tireMaterials=['pneu.005'],steering=[-.35,.135,.71],eye=[-.35,-.23,1.02],aim=[-.035,.60,.75],screen=[0,.30,.765,.22,.145,.30],layout='landscape',cabin=True,notes='保留碳纤维、灯组和原作座舱；作者说明内饰与实车存在差异。'),
 'bugatti-veyron':dict(title='Bugatti Veyron',brand='Bugatti',edition='Veyron · David_Holiday',paint='6595B9',paintMaterials=[],tireMaterials=[],steering=[-.36,.3,.85],eye=[-.36,-.2,1.1],aim=[0,.55,.83],screen=[0,.3,.85,.22,.14,.1],layout='landscape',cabin=False,notes='选用免费署名外观网格；原作没有完整可用座舱，保留原始双色车身。'),
 'ferrari-458':dict(title='Ferrari 458',brand='Ferrari',edition='458 · 开顶展示网格',paint='B82127',paintMaterials=['Body_Color'],tireMaterials=['Tires'],steering=[-.345,.36,.80],eye=[-.38,-.02,1.05],aim=[-.17,.83,.91],screen=[-.345,.61,1.01,.235,.135,.08],layout='landscape',cabin=True,notes='采用 Three.js 示例维护的 vicent091036 模型，原作标题为 458 Italia，网格呈开顶状态。')
}
LABELS=['front-left','front-right','rear-left','rear-right']
def box(pts):return np.min(pts,axis=0),np.max(pts,axis=0)
def components(o):
    """Connect coincident vertex seams for classification; do not rewrite source UV topology."""
    mesh=o.data;n=len(mesh.vertices);parent=list(range(n));co=np.array([v.co[:] for v in mesh.vertices]);lookup={}
    def root(a):
        while parent[a]!=a:parent[a]=parent[parent[a]];a=parent[a]
        return a
    def union(a,b):
        a=root(a);b=root(b)
        if a!=b:parent[b]=a
    for i,p in enumerate(co):
        key=tuple(round(float(x),5) for x in p)
        if key in lookup:union(i,lookup[key])
        else:lookup[key]=i
    for e in mesh.edges:union(*e.vertices)
    groups={}
    for face in mesh.polygons:groups.setdefault(root(face.vertices[0]),[]).append(face)
    return co,groups.values()
def get_wheels(objects,cfg,key):
    points={n:[] for n in LABELS}
    for o in objects:
        if not len(o.data.polygons):continue
        tire=o.data.materials[0].name in cfg['tireMaterials'] if o.data.materials else False
        if key=='bugatti-veyron':tire=o.name=='Object_4'
        if not tire:continue
        if key=='ferrari-458' and not o.name.startswith('tire'):continue
        if key=='bmw-m4' and len(o.data.polygons)!=1200:continue
        for v in o.data.vertices:
            x,y,z=v.co
            if abs(x)<.50 or abs(y)<.75 or z>.95:continue
            points[('front' if y>0 else 'rear')+'-'+('left' if x<0 else 'right')].append(v.co[:])
    if key=='bmw-m4':
        points['rear-right']=[[-x+.00065,y+.00676,z] for x,y,z in points['rear-left']]
    wheels={}
    for name,pts in points.items():
        assert pts,(key,name,'missing tire reference');lo,hi=box(np.array(pts));p=(lo+hi)/2;r=(hi[2]-lo[2])/2
        # Material5 also appears on small BMW trim parts; keep the actual axle's tire envelope.
        wheels[name]={'pivot':p.tolist(),'radius':float(r),'halfWidth':float((hi[0]-lo[0])/2),'points':pts}
    return wheels
def fixed_normals(o):
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000006);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();o.data.update()
    for p in o.data.polygons:p.use_smooth=True
    o.data.set_sharp_from_angle(angle=math.radians(48));o.data.normals_split_custom_set([(0,0,0)]*len(o.data.loops))
def deduplicate_bmw(objects):
    # This SketchUp-derived source contains coincident front/back triangles with
    # different materials. Prefer the intended front material before recalculating normals.
    priorities={'body1':100,'glass1':99,'leather1':98,'chrome1':96,'silver1':95,'plastic1':94,'Charcoal_1':93,'0136_Charcoal_2':92,'Calipers_1':91,'Material5':90,'black1':-10,'material_3':-9}
    seen=set();out=[];removed=0
    for o in sorted(objects,key=lambda o:priorities.get(o.data.materials[0].name,50),reverse=True):
        co=[tuple(round(v,4) for v in p.co) for p in o.data.vertices];keep=[]
        for f in o.data.polygons:
            sig=tuple(sorted(co[i] for i in f.vertices))
            if sig in seen:removed+=1
            else:seen.add(sig);keep.append(f)
        if len(keep)==len(o.data.polygons):out.append(o)
        else:
            if keep:out.append(H.subset(o,keep,o.name+' clean'))
            bpy.data.objects.remove(o,do_unlink=True)
    # Keep authored body normals; recalculate the deduplicated wheel/trim faces.
    for o in out:
        if o.data.materials[0].name!='body1':fixed_normals(o)
    print('BMW removed coincident triangles:',removed,flush=True)
    return out
def build(key):
    cfg=dict(CONFIG[key]);folder=HERE/'models'/key;prov=json.loads((folder/'source/provenance.json').read_text());bpy.ops.wm.open_mainfile(filepath=str(folder/'source/normalized.blend'));bpy.context.preferences.filepaths.save_version=0
    source=[o for o in bpy.context.scene.objects if o.type=='MESH'];objects=[]
    for o in source:
        if not len(o.data.polygons):bpy.data.objects.remove(o,do_unlink=True);continue
        objects.append(o)
    wheels=get_wheels(objects,cfg,key)
    if key=='bmw-m4':objects=deduplicate_bmw(objects)
    groups={n:[] for n in ['body','steering']+[p+n for n in LABELS for p in ['wheel-','brake-']]}
    mats={'trim':H.mat('Race display bezel','171F25',.60),'metal':H.mat('Race wheel alloy','73818D',.30,.8),'paint':H.mat('Body paint',cfg['paint'],.27,.58)}
    pnode=mats['paint'].node_tree.nodes.get('Principled BSDF');pnode.inputs['Coat Weight'].default_value=.4
    if key=='lamborghini-centenario':
        source_mat=bpy.data.materials.get('Carbon_R');mats['paint']=source_mat.copy();mats['paint'].name='Body paint';pnode=mats['paint'].node_tree.nodes.get('Principled BSDF');pnode.inputs['Roughness'].default_value=.36
    if key=='bmw-m4':pnode.inputs['Roughness'].default_value=.38;pnode.inputs['Metallic'].default_value=.35
    if key=='ferrari-458':
        node=bpy.data.materials['Glass_Gray'].node_tree.nodes.get('Principled BSDF');node.inputs['Alpha'].default_value=.22;node.inputs['Base Color'].default_value=H.color('82969E')
        node=bpy.data.materials['Leather'].node_tree.nodes.get('Principled BSDF');node.inputs['Base Color'].default_value=H.color('24272B');node.inputs['Metallic'].default_value=0
    for m in list(bpy.data.materials):
        if not m.use_nodes:continue
        n=m.node_tree.nodes.get('Principled BSDF')
        if key in ['bmw-m4','bugatti-veyron']:m.use_backface_culling=False
        if n and n.inputs['Alpha'].default_value<1:
            m.use_backface_culling=True;m.surface_render_method='DITHERED';n.inputs['Metallic'].default_value=.05;n.inputs['Roughness'].default_value=.17
    if key=='amg-gt':
        for name,hex,rough,metal in [('Material.004','292C30',.68,0),('Material.032','34383D',.78,0)]:
            old=bpy.data.materials.get(name)
            if old:
                node=old.node_tree.nodes.get('Principled BSDF');node.inputs['Base Color'].default_value=H.color(hex);node.inputs['Roughness'].default_value=rough;node.inputs['Metallic'].default_value=metal
    if key=='bugatti-veyron':
        m=bpy.data.materials.get('material_9');n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Metallic'].default_value=.18;n.inputs['Roughness'].default_value=.37
        tire=H.mat('Veyron tire rubber','161A1E',.82)
        bpy.data.objects['Object_4'].data.materials[0]=tire
    for o in objects:
        name=o.data.materials[0].name if o.data.materials else '';o['sourceObject']=o.name;o['sourceMaterial']=name
        if name in cfg['paintMaterials']:
            o.data.materials[0]=mats['paint']
        co,islands=components(o);assignments={}
        for faces in islands:
            idx=list({v for f in faces for v in f.vertices});pts=co[idx];lo,hi=box(pts);center=(lo+hi)/2;group='body'
            for label,w in wheels.items():
                p=np.array(w['pivot']);r=w['radius'];ext=hi-lo
                if abs(center[0]-p[0])<.30 and abs(center[1]-p[1])<r+.03 and lo[2]>=p[2]-r-.02 and hi[2]<=p[2]+r+.025 and ext[1]<2*r+.07 and ext[0]<.72 and np.max(np.linalg.norm(pts[:,1:]-p[1:],axis=1))<r*1.045:
                    brake='caliper' in name.lower() or key=='amg-gt' and name=='Material.012' or key=='porsche-911' and name=='Material.001' or key=='ferrari-458' and o.name=='brakes';group=('brake-' if brake else 'wheel-')+label;break
            if key=='ferrari-458' and o.name.startswith('steering_') and o.name!='steering_column':group='steering'
            elif key!='ferrari-458' and cfg['cabin'] and group=='body':
                p=np.array(cfg['steering']);ext=hi-lo
                if max(abs(center[0]-p[0]),abs(center[2]-p[2]))<.18 and abs(center[1]-p[1])<.14 and ext[0]<.43 and ext[1]<.38 and ext[2]<.43:group='steering'
            assignments.setdefault(group,[]).extend(faces)
        if len(assignments)==1:groups[next(iter(assignments))].append(o)
        else:
            for group,faces in assignments.items():groups[group].append(H.subset(o,faces,o.name+' / '+group))
            bpy.data.objects.remove(o,do_unlink=True)
    assert all(groups['wheel-'+n] for n in LABELS),(key,'empty wheel')
    print('GROUPS',key,{n:len(v) for n,v in groups.items()},'WHEELS',{n:{k:v for k,v in w.items() if k!='points'} for n,w in wheels.items()},flush=True)
    root=bpy.data.objects.new('vehicle:'+key,None);bpy.context.scene.collection.objects.link(root);license_name='CC BY-SA 4.0' if prov['license']['slug']=='by-sa' else 'CC BY 4.0';root['license']=license_name;root['author']=prov['author']['displayName'];root['source']=prov['sourcePage'];root['credit']='CREDITS.md';root['edition']=cfg['edition']
    joints={}
    for label,w in wheels.items():
        yaw=bpy.data.objects.new('joint:steer-'+label,None);bpy.context.scene.collection.objects.link(yaw);yaw.parent=root;yaw.location=w['pivot'];joints['steer-'+label]=yaw
        spin=bpy.data.objects.new('joint:wheel-'+label,None);bpy.context.scene.collection.objects.link(spin);spin.parent=yaw;joints['wheel-'+label]=spin
    steering=bpy.data.objects.new('joint:steering',None);bpy.context.scene.collection.objects.link(steering);steering.parent=root;steering.location=cfg['steering'];joints['steering']=steering
    for group,items in groups.items():
        if not items:continue
        o=H.join(items,'geometry:'+group);o.data.transform(o.matrix_world);o.matrix_world=Matrix.Identity(4)
        if group=='body':o.parent=root;continue
        label=group.split('-',1)[1] if '-' in group else None;p=Vector(cfg['steering'] if group=='steering' else wheels[label]['pivot']);o.data.transform(Matrix.Translation(-p))
        # Imported source wheels may be displayed steered. Align their axle to X for a neutral rig.
        if label:
            pts=np.array(wheels[label]['points']);_,vec=np.linalg.eigh(np.cov(pts.T));axis=vec[:,0]
            if axis[0]<0:axis=-axis
            angle=math.atan2(axis[1],axis[0]);o.data.transform(Matrix.Rotation(-angle,4,'Z'))
        o.parent=joints['steering'] if group=='steering' else joints[('steer-' if group.startswith('brake-') else 'wheel-')+label]
    if cfg['cabin']:
        screen,bezel=H.display(cfg,mats,folder);screen.parent=root;bezel.parent=root
    bpy.context.view_layer.update();asset_objects=[root,*root.children_recursive];bb=H.bounds([o for o in asset_objects if o.type=='MESH']);exports=[]
    for lod,budget in [('high',240000),('low',85000)]:
        total=sum(len(o.data.polygons) for o in asset_objects if o.type=='MESH');ratio=min(.5 if lod=='low' else 1,budget/max(total,1));mods=[]
        for o in asset_objects:
            if o.type=='MESH' and len(o.data.polygons)>1500 and ratio<1:
                m=o.modifiers.new('Runtime LOD','DECIMATE');m.ratio=ratio;m.use_collapse_triangulate=True;mods.append((o,m))
        bpy.ops.object.select_all(action='DESELECT')
        for o in asset_objects:o.select_set(True)
        target=folder/f'{key}.{lod}.glb';bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',use_selection=True,export_apply=True,export_extras=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False)
        for o,m in mods:o.modifiers.remove(m)
        b=target.read_bytes();d=json.loads(b[20:20+struct.unpack_from('<I',b,12)[0]]);triangles=sum(d['accessors'][p['indices']]['count']//3 for m in d['meshes'] for p in m['primitives']);exports.append(dict(lod=lod,file=target.name,bytes=len(b),triangles=triangles,sha256=hashlib.sha256(b).hexdigest()))
    g=lambda p:[p[0],p[2],-p[1]]
    cfg.update(id=key,license=license_name,source=prov['sourcePage'],author=prov['author']['displayName'],coordinates='metres; glTF Y up; -Z forward',paintable=bool(cfg['paintMaterials']),dimensions={n:bb[1][i]-bb[0][i] for n,i in [('width',0),('length',1),('height',2)]},wheelFront=sum(wheels[n]['pivot'][1] for n in LABELS[:2])/2,wheelRear=sum(wheels[n]['pivot'][1] for n in LABELS[2:])/2,track=sum(abs(w['pivot'][0]) for w in wheels.values())/4,radius=sum(w['radius'] for w in wheels.values())/4,joints={n:g(w['pivot']) for n,w in wheels.items()},steeringPivot=g(cfg['steering']),views={'cockpit':{'eye':g(cfg['eye']),'target':g(cfg['aim'])},'screen':{'eye':g([cfg['screen'][0]-.08,cfg['screen'][1]-.44,cfg['screen'][2]+.15]),'target':g(cfg['screen'][:3])}} if cfg['cabin'] else {},display={'material':'display:front','layout':'landscape','size':[1536,960],'enabled':cfg['cabin']},files=exports)
    (folder/'manifest.json').write_text(json.dumps(cfg,ensure_ascii=False,indent=2)+'\n');H.studio(folder,cfg,root);bpy.context.scene.cycles.samples=20;bpy.context.scene.render.resolution_x=1440;bpy.context.scene.render.resolution_y=960;bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(folder/f'{key}.blend'));print('BUILT',key,json.dumps(exports),flush=True)
if __name__=='__main__':
 for key in sys.argv[sys.argv.index('--')+1:]:build(key)
