"""Build the licensed third-party car and weapons with Blender (offline).

Run with Blender --background --factory-startup --disable-autoexec --python.
Source files are data only. Originals are never saved over. glTF is uncompressed,
uses native engine loaders, and keeps UVs, PBR maps and named animation joints.
"""
from pathlib import Path
import bpy,bmesh,json,math,struct,hashlib,sys,tempfile,shutil
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'club/assets/source/third-party';OUT=ROOT/'club/assets/models'

def clear():bpy.ops.wm.read_factory_settings(use_empty=True)
def load_glb(path):
 clear();bpy.ops.import_scene.gltf(filepath=str(path))
def open_blend(path):bpy.ops.wm.open_mainfile(filepath=str(path),use_scripts=False)
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def gltf_vec(v):return [round(v[0],7),round(v[2],7),round(-v[1],7)]
def materials_pbr():
 for m in bpy.data.materials:
  if m.node_tree:
   for n in m.node_tree.nodes:
    if n.type=='BSDF_PRINCIPLED':
     if 'Transmission Weight' in n.inputs:n.inputs['Transmission Weight'].default_value=0
  if m.name=='Glass':
   n=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
   n.inputs['Alpha'].default_value=.16;n.inputs['Roughness'].default_value=.12
   n.inputs['Base Color'].default_value=(.18,.25,.28,1);n.inputs['Alpha'].default_value=.12
   m.surface_render_method='DITHERED';m.use_backface_culling=True
  if m.name.startswith('Paint 1'):
   m['role']='paint';n=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
   n.inputs['Metallic'].default_value=.58;n.inputs['Roughness'].default_value=.28;n.inputs['Coat Weight'].default_value=.7;n.inputs['Coat Roughness'].default_value=.16
   for node in m.node_tree.nodes:
    if node.type=='NORMAL_MAP':node.inputs['Strength'].default_value=.08
  if m.name=='Dashboard':m['role']='dashboard'

def flatten(objects,transform=Matrix.Identity(4)):
 """Bake static transforms without discarding UVs or material assignments."""
 matrices={o:transform@o.matrix_world for o in objects}
 for o in objects:
  o.data=o.data.copy();o.data.transform(matrices[o]);o.parent=None;o.matrix_world=Matrix.Identity(4);o.animation_data_clear();o.modifiers.clear()
 bpy.context.view_layer.update()

def components(obj):
 bm=bmesh.new();bm.from_mesh(obj.data);bm.verts.ensure_lookup_table();seen=set();out=[]
 for v in bm.verts:
  if v.index in seen:continue
  stack=[v];group=[];seen.add(v.index)
  while stack:
   q=stack.pop();group.append(q.index)
   for e in q.link_edges:
    p=e.other_vert(q)
    if p.index not in seen:seen.add(p.index);stack.append(p)
  out.append(group)
 bm.free();return out

def split_mesh(o,groups):
 result=[]
 for part,indices in groups.items():
  if not indices:continue
  mesh=o.data.copy();bm=bmesh.new();bm.from_mesh(mesh);bm.verts.ensure_lookup_table();keep=set(indices)
  bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.index not in keep],context='VERTS');bm.to_mesh(mesh);bm.free();mesh.update()
  obj=bpy.data.objects.new(part,mesh);bpy.context.scene.collection.objects.link(obj);obj['part']=part;result.append(obj)
 bpy.data.objects.remove(o,do_unlink=True);return result

def make_joint(part,objects,pivot=(0,0,0),motion=''):
 joint=bpy.data.objects.new('joint:'+part,None);bpy.context.scene.collection.objects.link(joint);joint.location=pivot;joint['partId']=part;joint['motion']=motion
 for o in objects:o.data.transform(Matrix.Translation(-Vector(pivot)));o.parent=joint;o.matrix_parent_inverse=Matrix.Identity(4);o.location=(0,0,0)
 return joint,{'pivot':gltf_vec(pivot),'motion':motion}

def merge(objects,name):
 if not objects:return None
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.hide_set(False);o.hide_viewport=False;o.hide_render=False;o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 if len(objects)>1:bpy.ops.object.join()
 o=bpy.context.view_layer.objects.active;o.name=name;return o

def shrink_images(size,cache):
 for im in list(bpy.data.images):
  limit=min(size,512) if any(k in im.name for k in ['Normal','AmbientOcclusion','Roughness','Metallic']) else size
  if im.size[0] and max(im.size)>limit:
   scale=limit/max(im.size);im.scale(max(1,round(im.size[0]*scale)),max(1,round(im.size[1]*scale)));im.pack()
  if 'BaseColor' in im.name and im.size[0]:
   # Opaque albedo can use JPEG; normals and data maps remain lossless PNG.
   jpg=cache/(im.name+'.jpg');im.filepath_raw=str(jpg);im.file_format='JPEG';im.save()
   replacement=bpy.data.images.load(str(jpg),check_existing=False);replacement.colorspace_settings.name=im.colorspace_settings.name
   for material in bpy.data.materials:
    if material.node_tree:
     for node in material.node_tree.nodes:
      if node.type=='TEX_IMAGE'and node.image==im:node.image=replacement

def write_model(name,lod,joints,max_image):
 cache=Path(tempfile.mkdtemp(prefix='harbor-asset-textures-'));shrink_images(max_image,cache)
 # Save only the prepared hierarchy; do not carry cameras, lights or source rigs.
 bpy.ops.object.select_all(action='DESELECT')
 for o in bpy.context.scene.objects:
  if o.type in ('MESH','EMPTY'):o.hide_set(False);o.hide_render=False;o.select_set(True)
 if hasattr(bpy.data.scenes[0],'gltf2_KHR_materials_variants_variants'):bpy.data.scenes[0].gltf2_KHR_materials_variants_variants.clear()
 path=OUT/(name+'.'+lod+'.glb')
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_skins=False,export_morph=False,export_extras=True,export_cameras=False,export_lights=False,export_yup=True,export_image_format='AUTO',export_draco_mesh_compression_enable=False)
 shutil.rmtree(cache)
 data=path.read_bytes();length=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+length]);triangles=sum(doc['accessors'][p['indices']]['count']//3 for m in doc['meshes']for p in m['primitives']);groups=sum(len(m['primitives'])for m in doc['meshes'])
 # The importer places extras on materials; both adapters use role=paint.
 points=[o.matrix_world@v.co for o in bpy.context.scene.objects if o.type=='MESH'for v in o.data.vertices]
 p=[gltf_vec(v)for v in points];bounds=[[min(v[k]for v in p)for k in range(3)],[max(v[k]for v in p)for k in range(3)]]
 print('BUILT',name,lod,triangles,groups,len(data),flush=True)
 return {'file':'models/'+path.name,'bytes':len(data),'sha256':sha(path),'triangles':triangles,'drawGroups':groups,'bounds':bounds}

def simplify(objects,ratio):
 for o in objects:
  if len(o.data.polygons)<80:continue
  bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Web LOD','DECIMATE');mod.ratio=ratio;mod.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=mod.name)

def car(lod):
 path=BASE/'car-concept/CarConcept.glb';load_glb(path)
 # Source fronts point +Z in glTF. The club uses -Z. Normalize the source's
 # display steering pose before baking; our simulation owns wheel steering.
 for name in ['WheelFrontL','WheelFrontR']:
  o=bpy.data.objects.get(name)
  if o:
   world=o.matrix_world.copy();axis=world.to_3x3()@Vector((1,0,0));pivot=world.translation.copy()
   unsteer=Matrix.Translation(pivot)@Matrix.Rotation(-math.atan2(axis.y,axis.x),4,'Z')@Matrix.Translation(-pivot)
   o.matrix_world=unsteer@world
 bpy.context.view_layer.update()
 removed={'License Plate','InteriorSteeringEmblem','BodyWindshieldWipers'}
 objects=[o for o in bpy.data.objects if o.type=='MESH'and o.name not in removed]
 transform=Matrix.Rotation(math.pi,4,'Z')@Matrix.Scale(.9,4)
 groups={};pivots={}
 for o in objects:
  cursor=o;part='body'
  while cursor:
   if cursor.name in ['WheelFrontL','WheelFrontR','WheelRearL','WheelRearR']:
    part={'WheelFrontL':'wheel-fl','WheelFrontR':'wheel-fr','WheelRearL':'wheel-rl','WheelRearR':'wheel-rr'}[cursor.name];pivots[part]=transform@cursor.matrix_world.translation;break
   if cursor.name.startswith('InteriorSteeringWheel'):
    part='steering';pivots[part]=transform@Vector((.001,-.929,.642));break
   cursor=cursor.parent
  groups.setdefault(part,[]).append(o)
 flatten(objects,transform)
 for o in list(bpy.data.objects):
  if o not in objects:bpy.data.objects.remove(o,do_unlink=True)
 # Keep only the primary paint variant. Remove transmission/refraction passes
 # for predictable mobile cost; retain thin transparent window glass.
 materials_pbr();joints={}
 for part,members in groups.items():
  o=merge(members,'geometry:'+part);simplify([o],.22 if lod=='high' else .075)
  pivot=pivots.get(part,Vector());motion='wheel-front'if part in ['wheel-fl','wheel-fr']else'wheel'if part.startswith('wheel-')else'steering'if part=='steering'else''
  _,joints[part]=make_joint(part,[o],pivot,motion)
 return write_model('touring-gt',lod,joints,1024 if lod=='high'else 512),joints

def akm(lod):
 open_blend(BASE/'oga-akm/akm54.blend');o=bpy.data.objects['AKM'];flatten([o]);groups={'body':[],'magazine':[],'bolt':[]}
 for group in components(o):
  p=[o.data.vertices[i].co for i in group];low=[min(v[k]for v in p)for k in range(3)];high=[max(v[k]for v in p)for k in range(3)]
  part='magazine'if low[2]<-.20 and low[1]>-.10 else'bolt'if high[0]>.035 else'body';groups[part]+=group
 objects=split_mesh(o,groups)
 for other in list(bpy.data.objects):
  if other not in objects:bpy.data.objects.remove(other,do_unlink=True)
 joints={}
 for o in objects:
  if lod=='low':simplify([o],.55)
  part=o['part'];_,joints[part]=make_joint(part,[o],(0,0,0),part if part!='body'else'')
 return write_model('field-akm',lod,joints,1024 if lod=='high'else 512),joints

def main():
 OUT.mkdir(parents=True,exist_ok=True)
 assets={};specs=[('touring-gt','GT 概念跑车','car-concept/CarConcept.glb','car-concept',car),('field-akm','AKM / 木饰步枪','oga-akm/akm54.blend','oga-akm',akm)]
 for name,label,source,license_id,build in specs:
  lods={};joints={}
  for lod in ['high','low']:lods[lod],joints=build(lod)
  assets[name]={'id':name,'label':label,'source':{'file':str((BASE/source).relative_to(ROOT)),'sha256':sha(BASE/source)},'lods':lods,'joints':joints,'bounds':lods['high']['bounds'],'collision':{'type':'visual-only','note':'Authoritative club vehicle/weapon rules remain in the simulation.'},'license':license_id}
 manifest={'version':1,'assets':assets,'licenses':[{'id':'car-concept','license':'CC-BY-4.0','author':'Eric Chadwick / Darmstadt Graphics Group GmbH, 2024','url':'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept','changes':'Normalized orientation and scale, removed logo meshes and wipers, decimated LODs, resized textures, merged by joint, simplified glass.'},{'id':'oga-akm','license':'CC0-1.0','author':'LonesomeDucky','url':'https://opengameart.org/content/weathered-akm-rifle','changes':'Resized PBR textures, separated magazine and bolt for game animation, lower LOD.'}]}
 (ROOT/'club/assets/external-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 path=ROOT/'club/assets/manifest.json';main=json.loads(path.read_text());main['assets'].update(assets);main['licenses']=[v for v in main['licenses']if v['id']not in {v['id']for v in manifest['licenses']}]+manifest['licenses'];path.write_text(json.dumps(main,ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__':main()
