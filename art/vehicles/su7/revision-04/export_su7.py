"""Reduce each component before merging, retaining its own source normal field.

Sampling a joined car's normals can hit adjacent badges, trim and lamp covers.
Keep that transfer local to the component, and build each LOD from source.
"""
import hashlib
import json
import bpy
from mathutils import Matrix, Vector


def export_game(h, version):
    source=list(h.MODEL.objects)
    original_visibility={o:(o.hide_get(),o.hide_render) for o in source}
    depsgraph=bpy.context.evaluated_depsgraph_get()
    temp=bpy.data.collections.new('EXPORT / component surface preservation')
    bpy.context.scene.collection.children.link(temp)
    prototypes=[]
    for o in source:
        if o.type not in {'MESH','CURVE','FONT'}:continue
        data=bpy.data.meshes.new_from_object(o.evaluated_get(depsgraph),preserve_all_data_layers=True,depsgraph=depsgraph)
        data.transform(o.matrix_world)
        donor=bpy.data.objects.new('NORMAL SOURCE / '+o.name,data)
        temp.objects.link(donor);donor.hide_render=True;donor.hide_set(True)
        prototypes.append((o,donor))
    for o in source:o.hide_set(True);o.hide_render=True
    files=[]
    for lod in ['high','low']:
        root=bpy.data.objects.new('xiaomi-su7-study',None);temp.objects.link(root)
        root['assetId']='xiaomi-su7-study';root['version']=version
        exported=[root];groups={}
        for source_object,donor in prototypes:
            dup=bpy.data.objects.new(source_object.name+' / '+lod,donor.data.copy());temp.objects.link(dup)
            ratio=.50 if lod=='high' else .14
            if 'continuous curvature body' in source_object.name:ratio=.85 if lod=='high' else .48
            elif any(word in source_object.name.lower() for word in ['glass','lamp','projector','window','fascia','diffuser']):
                ratio=.75 if lod=='high' else .40
            if len(dup.data.polygons)>32:
                density=dup.modifiers.new('Component LOD','DECIMATE');density.ratio=ratio;density.use_collapse_triangulate=True
                h.apply_modifier(dup,density)
                normals=dup.modifiers.new('Restore component surface normals','DATA_TRANSFER')
                normals.object=donor;normals.use_loop_data=True;normals.data_types_loops={'CUSTOM_NORMAL'}
                normals.loop_mapping='POLYINTERP_NEAREST'
                h.apply_modifier(dup,normals)
            groups.setdefault(source_object.get('partId','body'),[]).append(dup)
        for part,objects in groups.items():
            bpy.ops.object.select_all(action='DESELECT')
            for o in objects:o.select_set(True)
            bpy.context.view_layer.objects.active=objects[0]
            if len(objects)>1:bpy.ops.object.join()
            mesh=bpy.context.object;mesh.name='geometry:'+part
            pivot=h.JOINTS.get(part,{}).get('pivot',(0,0,0))
            mesh.data.transform(Matrix.Translation(-Vector(pivot)))
            joint=bpy.data.objects.new('joint:'+part,None);temp.objects.link(joint)
            joint.parent=root;joint.location=pivot;joint['partId']=part
            joint['motion']=h.JOINTS.get(part,{}).get('motion','static')
            mesh.parent=joint;mesh.location=(0,0,0)
            exported.extend([mesh,joint])
        bpy.ops.object.select_all(action='DESELECT')
        for o in exported:o.select_set(True)
        filename='xiaomi-su7.'+lod+'.glb'
        bpy.ops.export_scene.gltf(filepath=str(h.OUT/filename),export_format='GLB',use_selection=True,export_apply=True,export_extras=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False,export_materials='EXPORT')
        data=(h.OUT/filename).read_bytes()
        files.append({'lod':lod,'file':filename,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
        for o in exported:bpy.data.objects.remove(o,do_unlink=True)
    for o in list(temp.objects):bpy.data.objects.remove(o,do_unlink=True)
    bpy.data.collections.remove(temp)
    for o,(hidden,render_hidden) in original_visibility.items():o.hide_set(hidden);o.hide_render=render_hidden
    info={'assetId':'xiaomi-su7-study','version':version,'status':'Independent visual reference study; not integrated into the shipped racing game.',
          'coordinates':'meters; Y up; -Z forward in GLB',
          'nominalDimensionsMeters':{'length':4.997,'bodyWidth':1.963,'roofHeight':1.445,'wheelbase':3.0},
          'joints':{k:{'pivot':[v['pivot'][0],v['pivot'][2],-v['pivot'][1]],'motion':v['motion']} for k,v in h.JOINTS.items()},
          'cameraSockets':{'cockpit':[-.43,1.12,.36]},'files':files,'photoTexturesUsed':False,'officialReference':'https://www.xiaomiev.com/su7',
          'lodMethod':'Independent per-component reduction, source-normal transfer before articulation merge; higher surface budget for body and glazing.'}
    (h.OUT/'manifest.json').write_text(json.dumps(info,ensure_ascii=False,indent=2)+'\n')
    return info
