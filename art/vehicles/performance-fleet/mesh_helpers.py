"""Local mesh, material and studio helpers for performance assets."""
import bpy,bmesh,math
from pathlib import Path
from mathutils import Vector,Matrix
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
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

def subset(o,polys,name):
    old=o.data;ids=sorted({v for p in polys for v in p.vertices});idx={v:i for i,v in enumerate(ids)};m=bpy.data.meshes.new(name);m.from_pydata([old.vertices[i].co for i in ids],[],[tuple(idx[v] for v in p.vertices) for p in polys]);m.materials.append(old.materials[0]);m.update()
    if old.uv_layers.active:
        uv=m.uv_layers.new(name='UVMap')
        for a,b in zip(m.polygons,polys):
            for i,j in zip(a.loop_indices,b.loop_indices):uv.data[i].uv=old.uv_layers.active.data[j].uv
    for attr in old.color_attributes:
        layer=m.color_attributes.new(name=attr.name,type=attr.data_type,domain=attr.domain)
        if attr.domain=="POINT":
            for i,j in enumerate(ids):layer.data[i].color=attr.data[j].color
        elif attr.domain=="CORNER":
            for a,b in zip(m.polygons,polys):
                for i,j in zip(a.loop_indices,b.loop_indices):layer.data[i].color=attr.data[j].color
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
