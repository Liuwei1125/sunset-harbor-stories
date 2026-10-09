"""Revision 7 cabin detailing and UV-mapped, independently addressable screens."""
import math
from pathlib import Path
import bpy
import bmesh
import atelier_parts as base
from atelier_parts import *

DISPLAYS={
    'cluster':{'partId':'display-cluster','mesh':'geometry:display-cluster','material':'40 Instrument dynamic display','textureSize':[1024,320],'units':{'speedKph':'km/h','motorRpm':'rpm','powerKw':'kW'}},
    'center':{'partId':'display-center','mesh':'geometry:display-center','material':'41 Center dynamic display','textureSize':[1280,720]},
}


def install(v):
    global V,h,b,r
    V=v;h=v.h;b=v.b;r=v.r;base.install(v)


def upholstery_materials():
    for key,args in {
        'perforation':('42 Upholstery perforation shadow','6A6860',0,.94),
        'cloth':('43 Roof microfibre','C6C3B9',0,.94),
        'satin':('44 Interior satin metal','929D9F',.76,.36),
    }.items():h.M[key]=h.material(*args)
    # Fine leather relief in the editable source; the GLB retains its base PBR.
    for key in ['leather','seat','cloth']:
        mat=h.M[key];nodes=mat.node_tree.nodes;links=mat.node_tree.links
        noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=720;noise.inputs['Detail'].default_value=2
        bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.16;bump.inputs['Distance'].default_value=.00018
        links.new(noise.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],nodes['Principled BSDF'].inputs['Normal'])


def section_loft(name,sections,mat):
    # Elliptic rings give a soft, continuous shell instead of stacked beveled boxes.
    vs=[];faces=[];count=64
    for z,x,y,width,front,back in sections:
        for i in range(count):
            a=math.tau*i/count;c=math.cos(a);s=math.sin(a)
            xx=math.copysign(abs(c)**.65,c);yy=math.copysign(abs(s)**.65,s)
            vs.append((x+width*xx,y+(front if yy>=0 else back)*yy,z))
    for k in range(len(sections)-1):
        for i in range(count):a=k*count+i;q=k*count+(i+1)%count;faces.append((a,q,q+count,a+count))
    faces.extend([tuple(reversed(range(count))),tuple((len(sections)-1)*count+i for i in range(count))])
    obj=h.mesh(name,vs,faces,mat)
    sub=obj.modifiers.new('Soft upholstery subdivision','SUBSURF');sub.levels=2;sub.render_levels=2
    return obj


def seats():
    r.remove_prefix('Front seat cushion','Seat textile cushion insert','Front seat back','Seat textile backrest insert','Headrest','Seat raised stitched bolster','Seat seam','Seat cushion stitch')
    h.PART='interior'
    for side in [-1,1]:
        x=side*.46
        h.box('Seat lower upholstered foundation',(x,-.30,.457),(.52,.55,.13),'leather',.056)
        def cushion(u,v):
            width=.225+.026*math.sin(v*math.pi)
            return (x+u*width,-.565+.545*v,.526+.018*math.sin(v*math.pi)+.037*abs(u)**5)
        def cushion_grid(u,v):return cushion(u*2-1,v)
        obj=h.grid('Contoured front seat cushion',cushion_grid,32,40,'leather')
        sol=obj.modifiers.new('Upholstery pad depth','SOLIDIFY');sol.thickness=.026
        sections=[]
        for z,width in [(.50,.18),(.54,.238),(.68,.253),(.89,.255),(1.015,.235),(1.09,.192),(1.105,.14)]:
            sections.append((z,x,-.62-(z-.5)*.12,width,.105,.09))
        section_loft('Sculpted front seat backrest',sections,'leather')
        section_loft('Separate padded head restraint',[(1.105,x,-.705,.09,.052,.05),(1.12,x,-.71,.148,.070,.057),(1.215,x,-.718,.153,.071,.06),(1.26,x,-.72,.124,.052,.047),(1.273,x,-.72,.07,.029,.029)],'leather')
        # Recessed central panel and rolled bolsters, following the reclined seat.
        for dx in [-.151,.151]:
            h.tube('Seat back inset double stitch',[(x+dx,-.508-(z-.5)*.12,z) for z in [.565+i*.0065 for i in range(68)]],.00075,'stitch',res=1)
        for u in [-.67,.67]:h.tube('Seat cushion tailored stitch',[cushion(u,v) for v in [.055+i*.014 for i in range(64)]],.0007,'stitch',res=1)
        # Flat micro-perforation marks: one mesh per seat, not thousands of objects.
        dots=[];faces=[]
        for i in range(23):
            for j in range(29):
                dx=-.137+i*.0124;v=.10+j*.027
                px,py,pz=cushion(dx/(.225+.026*math.sin(v*math.pi)),v)
                for a in range(6):dots.append((px+.00072*math.cos(a*math.tau/6),py+.00072*math.sin(a*math.tau/6),pz+.00025))
                faces.append(tuple(range(len(dots)-6,len(dots))))
        h.mesh('Seat cushion fine perforation pattern',dots,faces,'perforation',False)
        for dx in [-.18,.18]:
            h.box('Seat rail',(x+dx,-.32,.385),(.032,.48,.023),'black',.006)
        h.box('Seat side adjustment surround',(x+side*.256,-.23,.448),(.009,.17,.062),'graphite',.007)
        h.box('Seat electric adjustment rocker',(x+side*.263,-.23,.455),(.009,.067,.017),'satin',.006)
        h.box('Seat belt latch housing',(x-side*.291,-.46,.525),(.037,.046,.065),'black',.008)
        h.box('Seat belt release button',(x-side*.291,-.46,.560),(.028,.032,.005),'caliper',.003)


def cabin_trims():
    r.remove_prefix('Fitted interior A pillar trim','Cloth covered sun visor','Overhead control console','Overhead reading lamp','Overhead small switch')
    h.PART='interior'
    # Give the painted outer window frame its own inward-facing upholstery skin.
    # This also covers the raw blue return previously visible from the cockpit.
    bpy.context.view_layer.update();depsgraph=bpy.context.evaluated_depsgraph_get()
    for frame in [o for o in h.MODEL.objects if o.name.startswith('Continuous A pillar and rear sail')]:
        data=bpy.data.meshes.new_from_object(frame.evaluated_get(depsgraph),depsgraph=depsgraph)
        side=1 if sum(v.co.x for v in data.vertices)>0 else -1
        for vertex in data.vertices:vertex.co.x-=side*.020
        data.materials.clear();data.materials.append(h.M['cloth'])
        for face in data.polygons:face.material_index=0
        obj=bpy.data.objects.new('Upholstered inner window frame',data);h.MODEL.objects.link(obj);obj['partId']='interior'
    for side in [-1,1]:
        # Broad inward-facing strip hides the raw body edge along the windshield.
        path=[(side*.778,.88,.905),(side*.724,.64,1.065),(side*.658,.39,1.236),(side*.610,.17,1.345)]
        points=b.catmull_open(path,18)
        outer=[(x+side*.026,y-.010,z+.010) for x,y,z in points]
        inner=[(x-side*.023,y-.020,z-.018) for x,y,z in points]
        n=len(points)
        trim=h.mesh('Wrapped interior A pillar upholstery',outer+inner,[(i,i+1,i+1+n,i+n) for i in range(n-1)],'cloth')
        sol=trim.modifiers.new('Wrapped pillar thickness','SOLIDIFY');sol.thickness=.008
        h.tube('A pillar inner weather seal',inner,.0023,'black',res=1)
        h.tube('Interior window belt padded seal',[(side*.780,y,.848+.030*max(0,y-.5)) for y in [-1.05+i*.027 for i in range(71)]],.017,'dash',res=3)
        lower=sorted((b.py(x),b.pz(z)) for x,z in V.WINDOW_PIXELS[10:])
        def ledge(u,v):
            y=-1.05+1.90*v;edge_z=b.value(lower,y)-.012
            edge_x=b.cabin_x(y,edge_z)-.024
            return (side*(.781+(edge_x-.781)*u),y,.853+(edge_z-.853)*u)
        ledge_obj=h.grid('Sculpted inner window ledge',ledge,12,76,'dash')
        lining=ledge_obj.modifiers.new('Window ledge padded depth','SOLIDIFY');lining.thickness=.009
        # Door speaker basket and dense, single-mesh punched grille pattern.
        speaker=h.uv_sphere('Door speaker satin surround',(side*.772,.365,.505),(.014,.129,.114),'satin',40,24)
        h.uv_sphere('Door speaker fabric backing',(side*.761,.365,.505),(.009,.121,.106),'carpet',40,24)
        vs=[];faces=[]
        for i in range(-12,13):
            for j in range(-11,12):
                yy=i*.009;zz=j*.0085
                if (yy/.111)**2+(zz/.098)**2>.98:continue
                for k in range(6):vs.append((side*.750,.365+yy+.0017*math.cos(k*math.tau/6),.505+zz+.0017*math.sin(k*math.tau/6)))
                face=tuple(range(len(vs)-6,len(vs)));faces.append(face if side<0 else tuple(reversed(face)))
        h.mesh('Door speaker precision perforations',vs,faces,'satin',False)
        # The inside door pull has a separate recess and latch finger surface.
        h.box('Door handle recessed backing',(side*.774,.286,.685),(.013,.192,.068),'black',.017)
        h.tube('Door handle inner satin accent',[(side*.742,.154,.635),(side*.734,.265,.690),(side*.746,.382,.746)],.0032,'satin',res=2)
        h.box('Door storage pocket lining',(side*.753,-.34,.465),(.032,.46,.077),'carpet',.021)
        # Cloth visor, rear seam, and vanity cover below it.
        z=b.roof(.04)-.067
        visor=h.box('Tailored fabric sun visor',(side*.40,.06,z),(.42,.177,.024),'cloth',.020);visor.rotation_euler.x=-.13
        h.box('Visor vanity cover',(side*.40,.06,z-.017),(.177,.095,.003),'leather',.009)
        h.tube('Visor perimeter seam',[(side*.40+dx,.06+dy,z-.015) for dx,dy in [(-.18,-.063),(.18,-.063),(.18,.063),(-.18,.063)]],.00065,'stitch',True,1)
    # Front roof header, avoiding exposed painted metal in the driver view.
    def header(u,v):
        x=(u*2-1)*.625;y=.105+.122*v;return (x,y,b.roof(y)-.043*(x/.65)**2-.031)
    obj=h.grid('Continuous padded roof header',header,40,10,'cloth');solid=obj.modifiers.new('Header foam','SOLIDIFY');solid.thickness=.025
    z=b.roof(.04)-.055
    h.box('Rounded overhead switch console',(0,.025,z),(.207,.226,.038),'leather',.028)
    h.tube('Overhead halo accent',[(-.069,-.035,z-.022),(-.064,-.067,z-.022),(.064,-.067,z-.022),(.069,-.035,z-.022)],.0017,'ambient',res=2)
    for x in [-.070,.070]:h.box('Reading lamp inset',(x,.018,z-.023),(.029,.053,.002),'white',.009)
    for i in [-1,0,1]:h.box('Overhead tactile button',(i*.032,.070,z-.023),(.027,.024,.003),'graphite',.005)
    h.text('SOS',(.032,.070,z-.027),.006,'white',normal=(0,0,-1))
    # Glovebox, passenger trim and console lid seam.
    h.tube('Glovebox fitted shut line',[(x,.516,.692+.012*math.cos(x*5)) for x in [.18+i*.009 for i in range(63)]],.0009,'black',res=1)
    h.box('Glovebox satin release',(.47,.503,.704),(.057,.006,.009),'satin',.003)
    h.tube('Split armrest centre stitch',[(0,y,.652) for y in [-.53+i*.004 for i in range(65)]],.0008,'stitch',res=1)
    h.box('Armrest front latch',(0,-.224,.646),(.053,.012,.009),'satin',.004)
    # Vertical pedal faces and individual nonslip inserts.
    r.remove_prefix('Pedal')
    for x,width,z,height in [(-.49,.098,.424,.10),(-.30,.054,.416,.148)]:
        pedal=h.box('Sport pedal aluminium face',(x,.635,z),(width,.025,height),'satin',.011);pedal.rotation_euler.x=-.18
        for i in range(5):h.box('Pedal rubber traction rib',(x+(i-2)*width/6,.617,z),(width/14,.008,height*.76),'rubber',.002)
    h.box('Driver left foot rest',(-.68,.63,.43),(.08,.04,.17),'carpet',.012)


def displays():
    r.remove_prefix('Center display glass','Driver instrument binnacle','Display map street','Display map avenue','Display blue route')
    for obj in list(h.MODEL.objects):
        if obj.type=='FONT' and obj.data.body in ['08:16','HARBOR DRIVE','P   00']:bpy.data.objects.remove(obj,do_unlink=True)
    h.PART='interior'
    h.box('Thin instrument binnacle housing',(-.43,.53,.878),(.258,.077,.087),'black',.014)
    h.box('Instrument satin edge',(-.43,.489,.878),(.245,.009,.078),'satin',.008)
    for key,center,size in [('cluster',(-.43,.482,.878),(.234,.073125)),('center',(.07,.464,.929),(.383,.2154375))]:
        definition=DISPLAYS[key];part=definition['partId'];h.PART=part;h.JOINTS[part]={'pivot':(0,0,0),'motion':'dynamic-display'}
        mat=h.material(definition['material'],'FFFFFF',0,.33)
        mat['role']='telemetry';mat['displayId']=key
        image=bpy.data.images.load(str(V.OUT/'textures'/f'{key}-parked.png'),check_existing=True)
        node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=image;shader=mat.node_tree.nodes.get('Principled BSDF')
        mat.node_tree.links.new(node.outputs['Color'],shader.inputs['Base Color']);mat.node_tree.links.new(node.outputs['Color'],shader.inputs['Emission Color'])
        shader.inputs['Emission Strength'].default_value=.55;shader.inputs['Specular IOR Level'].default_value=.15
        h.M['display-'+key]=mat
        x,y,z=center;w,height=size
        vs=[(x-w/2,y,z-height/2),(x+w/2,y,z-height/2),(x+w/2,y,z+height/2),(x-w/2,y,z+height/2)]
        obj=h.mesh('Live display surface / '+key,vs,[(0,1,2,3)],'display-'+key,False)
        # A single open face has no enclosed volume for recalc_face_normals to
        # infer its outside. Explicitly face the driver, at negative Blender Y.
        bm=bmesh.new();bm.from_mesh(obj.data);bm.normal_update()
        for face in bm.faces:
            if face.normal.y>0:face.normal_flip()
        bm.to_mesh(obj.data);bm.free();obj.data.update()
        layer=obj.data.uv_layers.new(name='Display UV');coords=[(0,0),(1,0),(1,1),(0,1)]
        for face in obj.data.polygons:
            for loop in face.loop_indices:layer.data[loop].uv=coords[obj.data.loops[loop].vertex_index]
        obj['displayId']=key;obj['telemetrySchema']=1
    h.PART='body'


def cabin_details():
    base.cabin_details();upholstery_materials();seats();cabin_trims();displays()
