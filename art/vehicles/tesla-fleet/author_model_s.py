"""Original approximate Model S study; no downloaded Model S mesh is used."""
import bpy,math,json,sys
from pathlib import Path
from mathutils import Vector,Matrix
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
from build_fleet import cube,curve,mat,CONFIG

def mesh(name,verts,faces,material):
    m=bpy.data.meshes.new(name);m.from_pydata(verts,[],faces);m.update();o=bpy.data.objects.new(name,m);bpy.context.scene.collection.objects.link(o);m.materials.append(material);return o
def interp(table,y):
    for (a,av),(b,bv) in zip(table,table[1:]):
        if a<=y<=b:return av+(bv-av)*(y-a)/(b-a)
    return table[0][1] if y<table[0][0] else table[-1][1]
def main():
    folder=HERE/'models/model-s';(folder/'source').mkdir(parents=True,exist_ok=True);(folder/'renders').mkdir(exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats={k:mat(k,v) for k,v in {'paint':'253C60','trim':'20262C','seat':'B7BEC3','glass':'20333F','metal':'76838F','rubber':'181D22','red':'B32632','white':'DFEDF5','amber':'C77D24','brake':'B93431','disc':'59636C','dash':'7D756A','stitch':'687681'}.items()}
    widths=[(-2.485,.60),(-2.35,.84),(-2.05,.94),(-1.45,.982),(-.8,.96),(.15,.93),(.9,.945),(1.55,.968),(2.10,.89),(2.40,.76),(2.485,.59)]
    tops=[(-2.485,.67),(-2.2,.84),(-1.6,.94),(-1.1,.935),(.50,.90),(1.05,.965),(1.55,.915),(2.05,.80),(2.40,.67),(2.485,.60)]
    verts=[];faces=[];N=184
    for j in range(N+1):
        y=-2.485+4.97*j/N;w=interp(widths,y);z=interp(tops,y);bottom=.22
        for axle in [1.556,-1.404]:
            dy=y-axle
            if abs(dy)<.413:bottom=max(bottom,.355+math.sqrt(.413**2-dy**2))
        profile=[(-1,bottom),(-1,.5*(bottom+z-.075)),(-.965,z-.075),(-.82,z-.013),(-.5,z+.012),(0,z+.02),(.5,z+.012),(.82,z-.013),(.965,z-.075),(1,.5*(bottom+z-.075)),(1,bottom)]
        verts.extend([(x*w,y,zz) for x,zz in profile])
    M=11
    for j in range(N):
        y=-2.485+4.97*(j+.5)/N
        for k in range(M-1):
            # Open the cabin volume; retain the beltline and outer shoulders.
            if -1.55<y<.97 and 3<=k<=6:continue
            faces.append((j*M+k,j*M+k+1,(j+1)*M+k+1,(j+1)*M+k))
    faces.extend([tuple(range(M-1,-1,-1)),tuple(N*M+k for k in range(M))]);body=mesh('S:authored body loft',verts,faces,mats['paint'])
    for p in body.data.polygons:p.use_smooth=True
    # Roof, screen and side-window surfaces follow a separately authored fastback profile.
    roof=[(-1.66,.77,.95),(-1.24,.745,1.19),(-.84,.71,1.37),(-.36,.695,1.445),(.16,.70,1.425),(.46,.72,1.34),(1.01,.785,.965)]
    rv=[];rf=[]
    for y,w,z in roof:
        rv.extend([(w*x,y,z+.018*(1-x*x)) for x in [-1,-.75,-.5,-.25,0,.25,.5,.75,1]])
    for j in range(len(roof)-1):
        for k in range(8):rf.append((j*9+k,(j+1)*9+k,(j+1)*9+k+1,j*9+k+1))
    glazing=mesh('S:fastback panoramic glazing',rv,rf,mats['glass'])
    for p in glazing.data.polygons:p.use_smooth=True
    for sign in [-1,1]:
        contour=[(sign*w,y,z) for y,w,z in roof];curve('S:roof rail',contour,mats['paint'],.025)
        v=[(sign*.79,1.015,.946),(sign*.728,.45,1.326),(sign*.704,.15,1.407),(sign*.714,-.82,1.351),(sign*.763,-1.60,.953),(sign*.902,-1.35,.905),(sign*.895,.85,.893)]
        mesh('S:side glass',v,[tuple(range(7))] if sign<0 else [tuple(range(6,-1,-1))],mats['glass']);curve('S:window chrome surround',v,mats['metal'],.008,True)
        curve('S:B pillar',[(sign*.894,-.34,.91),(sign*.704,-.34,1.422)],mats['trim'],.026)
        curve('S:rear quarter pillar',[(sign*.886,-1.1,.913),(sign*.738,-1.08,1.266)],mats['trim'],.015)
        for y in [.08,-1.08]:cube('S:flush handle',(sign*.951,y,.824),(.014,.19,.026),mats['metal'],.005)
        for y in [.88,-.35,-1.48]:curve('S:door seam',[(sign*interp(widths,y),y,.82),(sign*(interp(widths,y)+.002),y,.37)],mats['trim'],.002)
        curve('S:sill',[(sign*.942,-1.12,.245),(sign*.932,.98,.245)],mats['trim'],.027)
        cube('S:mirror stalk',(sign*.914,.86,1.014),(.16,.052,.048),mats['trim'],.019)
        cube('S:mirror housing',(sign*1.02,.84,1.054),(.15,.18,.082),mats['paint'],.036)
        cube('S:mirror glass',(sign*1.02,.749,1.054),(.124,.009,.054),mats['metal'],.014)
        # Swept lamps and thin running-light signatures.
        lamp=[(sign*.43,2.392,.680),(sign*.80,2.220,.731),(sign*.891,1.981,.772),(sign*.752,2.214,.638),(sign*.52,2.354,.635)]
        mesh('S:headlamp lens',lamp,[tuple(range(5))] if sign>0 else [tuple(range(4,-1,-1))],mats['trim']);curve('S:LED signature',lamp[:3],mats['white'],.010)
        tail=[(sign*.37,-2.414,.744),(sign*.70,-2.359,.744),(sign*.87,-2.216,.779)];curve('S:rear LED',tail,mats['red'],.025)
    cube('S:front lower intake',(0,2.427,.31),(1.30,.035,.10),mats['trim'],.033)
    cube('S:front nose opening',(0,2.474,.515),(.62,.018,.037),mats['trim'],.014)
    curve('S:front brightwork',[(-.26,2.479,.570),(0,2.495,.561),(.26,2.479,.570)],mats['metal'],.006)
    curve('S:trunk trim',[(-.55,-2.441,.793),(0,-2.465,.808),(.55,-2.441,.793)],mats['metal'],.006)
    cube('S:rear diffuser',(0,-2.375,.255),(1.35,.115,.13),mats['trim'],.035)
    cube('S:rear registration plate',(0,-2.483,.535),(.39,.012,.095),mats['trim'],.009)
    # Four independent wheel assemblies. Their named source material roles survive export.
    for y in [1.556,-1.404]:
        for sign in [-1,1]:
            x=sign*.84
            bpy.ops.mesh.primitive_torus_add(major_segments=72,minor_segments=16,major_radius=.277,minor_radius=.078,location=(x,y,.355),rotation=(0,math.pi/2,0));o=bpy.context.object;o.name='S:tire';o.scale.z=1.45;o.data.materials.append(mats['rubber']);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
            for face in o.data.polygons:face.use_smooth=True
            for role,r,depth,dx in [('metal',.238,.022,.105),('disc',.186,.015,.060)]:
                bpy.ops.mesh.primitive_cylinder_add(vertices=72,radius=r,depth=depth,location=(x+sign*dx,y,.355),rotation=(0,math.pi/2,0));o=bpy.context.object;o.name='S:'+role;o.data.materials.append(mats[role])
            # A dark inset emphasizes split-spoke metal geometry.
            bpy.ops.mesh.primitive_cylinder_add(vertices=72,radius=.218,depth=.004,location=(x+sign*.121,y,.355),rotation=(0,math.pi/2,0));o=bpy.context.object;o.name='S:rim inset';o.data.materials.append(mats['trim'])
            for k in range(10):
                a=math.tau*k/10;spoke=cube('S:alloy spoke',(x+sign*.129,y+math.sin(a)*.142,.355+math.cos(a)*.142),(.017,.030,.175),mats['metal'],.006);spoke.rotation_euler.x=-a
            cube('S:caliper',(x+sign*.028,y-.155,.355),(.055,.078,.20),mats['brake'],.023)
            bpy.ops.mesh.primitive_cylinder_add(vertices=40,radius=.049,depth=.025,location=(x+sign*.135,y,.355),rotation=(0,math.pi/2,0));o=bpy.context.object;o.name='S:wheel hub';o.data.materials.append(mats['metal'])
    cube('S:floor',(0,-.05,.325),(1.55,2.30,.05),mats['trim'],.01)
    cube('S:dashboard',(0,.89,.917),(1.52,.38,.145),mats['trim'],.060)
    cube('S:dashboard accent',(0,.683,.925),(1.43,.030,.064),mats['dash'],.012)
    cube('S:center tunnel',(0,.10,.51),(.25,.98,.24),mats['trim'],.044)
    for sign in [-1,1]:
        for y in [-.15,-1.0]:
            x=sign*.39;cube('S:seat cushion',(x,y,.49),(.43,.46,.13),mats['seat'],.058);back=cube('S:seat back',(x,y-.23,.78),(.43,.14,.51),mats['seat'],.065);back.rotation_euler.x=-.12;cube('S:headrest',(x,y-.27,1.09),(.26,.13,.17),mats['seat'],.043)
            for dx in [-.18,.18]:cube('S:seat bolster',(x+dx,y,.57),(.066,.39,.12),mats['seat'],.024)
        cube('S:inner door',(sign*.84,-.12,.69),(.06,1.55,.46),mats['trim'],.035)
        cube('S:armrest',(sign*.795,-.10,.76),(.13,.55,.07),mats['seat'],.024)
    # Bake all authored transforms to the common normalized source contract.
    bpy.context.view_layer.update()
    for o in [o for o in bpy.context.scene.objects if o.type=='MESH']:
        o.data.transform(o.matrix_world);o.matrix_world=Matrix.Identity(4);o.data.update()
    bpy.context.view_layer.update();bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(folder/'source/normalized.blend'))
    (folder/'source/provenance.json').write_text(json.dumps({'type':'project-authored','date':'2026-09-18','thirdPartyMesh':False,'reference':'https://www.tesla.com/ownersmanual/2012_2020_models/en_us/GUID-5FB8FC1E-0B1D-4ECC-99D6-4EEE2B8FB725.html','limitations':'Approximate 2016-style visual study; not a verified surface reconstruction. Downloadable licensed replacement still requires user sign-in.'},indent=2)+'\n')
if __name__=='__main__':main()
