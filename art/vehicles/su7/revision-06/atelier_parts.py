"""Revision 6 component work: real gaps, layered optics and machined wheel faces."""
import math
import bpy,bmesh
from mathutils import Vector
TESSELLATION_CHECKS=[]


def install(v):
    global h,b,r,V
    V=v;h=v.h;b=v.b;r=v.r


def rounded(points,fraction=.15,steps=5):
    """Quadratic corner rounds stay inside the authored polygon's corner hull."""
    points=[Vector(p) for p in points];out=[]
    for i,p in enumerate(points):
        a=p.lerp(points[i-1],fraction);c=p.lerp(points[(i+1)%len(points)],fraction)
        for j in range(steps+1):
            t=j/steps;out.append(tuple(a*(1-t)**2+p*(2*t*(1-t))+c*t*t))
    return out


def panel_gaps(shell):
    for o in list(h.MODEL.objects):
        if not o.name.startswith(('Fitted door panel line','Fitted bonnet shut line','Fitted trunk shut line','Charging port fitted seam')):continue
        name=o.name
        # Millimetre-scale physical channel, with a shadow strip below the lip.
        for spline in o.data.splines:
            for point in spline.points:
                p=Vector(point.co[:3]);hit,n,idx,dist=V.BODY.find_nearest(p)
                if hit is not None:point.co=(*(hit+n*.0002),1)
        o.data.bevel_depth=.0024;o.data.bevel_resolution=2
        bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get()
        data=bpy.data.meshes.new_from_object(o.evaluated_get(dg),depsgraph=dg)
        cutter=bpy.data.objects.new('Panel gap die',data);h.MODEL.objects.link(cutter)
        h.subtract(shell,cutter)
        for spline in o.data.splines:
            for point in spline.points:
                p=Vector(point.co[:3]);hit,n,idx,dist=V.BODY.find_nearest(p)
                if hit is not None:point.co=(*(hit-n*.0008),1)
        o.data.bevel_depth=.00135;o.name=name+' / recessed shadow'


def rear_lights():
    r.remove_prefix('Continuous rear optical light guide')
    guide=[(-.882,.824),(-.811,.847),(-.631,.868),(-.475,.829),(.475,.829),(.631,.868),(.811,.847),(.882,.824),(.682,.808),(0,.806),(-.682,.808)]
    for shrink,width in [(1,.0055),(.975,.0020)]:
        loop=h.smooth_loop([(x*shrink,.835+(z-.835)*shrink,0) for x,z in guide],12)
        outer=[];inner=[]
        for i,(x,z,_) in enumerate(loop):
            previous=Vector(loop[i-1]);following=Vector(loop[(i+1)%len(loop)])
            tangent=(following-previous).normalized();normal=Vector((-tangent.y,tangent.x,0))
            for edge,sign in [(outer,1),(inner,-1)]:
                xx=x+sign*normal.x*width/2;zz=z+sign*normal.y*width/2
                edge.append((xx,V.surface_y(xx,zz,-1)-.003,zz))
        r.meshband('Flat red rear optical guide',outer,inner,'tail')
    # Thin internal horizontal fins remain visible through the smoked cover.
    for side in [-1,1]:
        for z in [.824,.839,.851]:
            points=[]
            for i in range(30):
                x=side*(.63+.20*i/29);zz=z-.015*(i/29)**2
                points.append((x,V.surface_y(x,zz,-1)+.007,zz))
            h.tube('Rear lamp internal optic fin',points,.0012,'graphite',res=1)


LAMP=[(.398,.642),(.433,.666),(.561,.714),(.729,.776),(.850,.799),(.892,.789),(.910,.759),(.901,.686),(.872,.642),(.788,.623),(.616,.621),(.474,.629)]


def headlights(shell):
    import reference_camera
    traced,photo_map=reference_camera.lamp_trace(V)
    # A single fitted view cannot determine the lamp's depth. Keep its wrap
    # inside the front wing, constrained by the side photograph and close-up.
    def map_point(x,z):
        tx,tz=photo_map(x,z)
        return (x+(tx-x)*.22,z+(tz-z)*.22)
    for side in [-1,1]:
        coords=[(side*map_point(x,z)[0],map_point(x,z)[1]) for x,z in LAMP]
        V.recess(shell,'Waterdrop lamp housing',coords,depth=.060,mat='black')
        def xy(x,z,depth):
            x,z=map_point(x,z)
            return (side*x,V.surface_y(side*x,z)+depth,z)
        def ribbon(name,knots,width,mat,depth=-.003):
            pts=b.catmull_open(knots,12);vs=[]
            for i,(x,z) in enumerate(pts):
                taper=.12+.88*min(1,i/8,(len(pts)-1-i)/8)
                for dz in [-width*taper/2,width*taper/2]:vs.append(xy(x,z+dz,depth))
            return h.mesh(name,vs,[(2*i,2*i+1,2*i+3,2*i+2) for i in range(len(pts)-1)],mat)
        # A molded surround gives the clear outer cover a dark, rounded edge.
        V.outline_patch('Smoked inner optical carrier',coords,'opticsmoke',offset=-.039)
        ribbon('Machined upper optical brow',[(.465,.651),(.567,.698),(.704,.754),(.803,.780),(.868,.778)],.009,'alloy',-.022)
        ribbon('Sculpted lower optical eyebrow',[(.538,.633),(.63,.633),(.75,.641),(.84,.660),(.871,.690)],.016,'alloy',-.018)
        ribbon('Upper outer C-shaped optical trim',[(.788,.781),(.850,.780),(.874,.768),(.882,.736)],.0028,'alloy',-.013)
        ribbon('Lower outer C-shaped optical trim',[(.810,.642),(.855,.659),(.872,.684),(.878,.704)],.0028,'alloy',-.013)
        # Four separate concave reflector bowls with convex refractive lenses.
        for x,z in [(.727,.742),(.834,.764),(.716,.650),(.822,.674)]:
            x,z=map_point(x,z)
            eps=.0005
            du=Vector((1,(V.surface_y(side*x+eps,z)-V.surface_y(side*x-eps,z))/(2*eps),0)).normalized()
            dv=Vector((0,(V.surface_y(side*x,z+eps)-V.surface_y(side*x,z-eps))/(2*eps),1))
            normal=dv.cross(du).normalized();up=du.cross(normal).normalized()
            center=Vector((side*x,V.surface_y(side*x,z)-.015,z))
            outline=rounded([(-.021,-.018),(.021,-.018),(.023,.018),(-.020,.020)],.28,6)
            rings=[];vs=[]
            for scale,depth in [(1,0),(.91,-.003),(.70,-.021),(.54,-.027)]:
                ring=[]
                for a,c in outline:ring.append(len(vs));vs.append(tuple(center+du*a*scale+up*c*scale+normal*depth))
                rings.append(ring)
            n=len(outline);faces=[]
            for j in range(3):
                for i in range(n):faces.append((rings[j][i],rings[j][(i+1)%n],rings[j+1][(i+1)%n],rings[j+1][i]))
            h.mesh('Deep silver projector reflector bowl',vs,faces,'opticsilver')
            h.mesh('Projector dark rear aperture',[vs[i] for i in rings[-1]],[tuple(range(n))],'black')
            # Rounded rectangle lens cap with 8 concentric rings and a rear face.
            lv=[tuple(center+normal*.003)];lf=[]
            for k in range(1,9):
                radius=k/8
                for a,c in outline:lv.append(tuple(center+du*a*.86*radius+up*c*.86*radius+normal*(.003-.006*radius*radius)))
            for i in range(n):lf.append((0,1+i,1+(i+1)%n))
            for k in range(7):
                for i in range(n):
                    a=1+k*n+i;q=1+k*n+(i+1)%n;lf.append((a,q,q+n,a+n))
            lens=h.mesh('Convex individual projector lens',lv,lf,'opticglass')
            mod=lens.modifiers.new('Optical lens thickness','SOLIDIFY');mod.thickness=.002
            h.tube('Projector polished lens rim',[tuple(center+du*a*.89+up*c*.89) for a,c in outline],.0009,'alloy',True,1)
            for t in [-.009,.009]:
                h.tube('Projector internal reflector rib',[tuple(center+du*t+up*zz+normal*-.013) for zz in [-.01,0,.01]],.0007,'opticsilver',res=1)
        drl=[(.430,.645),(.535,.662),(.670,.700),(.789,.730),(.875,.747)]
        ribbon('Daylight guide dark mounting channel',drl,.014,'black',-.002)
        ribbon('Continuous white daylight blade',drl,.009,'led',-.0005)
        for i in range(82):
            x=.445+.417*i/81
            z=b.value([(a,c) for a,c in drl],x)
            h.tube('Daylight diffuser micro prism',[xy(x,z-.003,-.0001),xy(x,z+.003,-.0001)],.00023,'white',res=0)
        cover=V.outline_patch('Curved clear headlamp cover',coords,'clearlens',offset=.003)
        bm=bmesh.new();bm.from_mesh(cover.data)
        for face in bm.faces:
            hit,n,index,distance=V.BODY.find_nearest(face.calc_center_median())
            if face.normal.dot(n)<0:face.normal_flip()
        bm.to_mesh(cover.data);bm.free();cover.data.update()
        solid=cover.modifiers.new('Polycarbonate cover thickness','SOLIDIFY');solid.thickness=.0010;solid.offset=-1
        edge=h.smooth_loop([(x,z,0) for x,z in coords],5)
        centre=Vector((sum(x for x,z in coords)/len(coords),sum(z for x,z in coords)/len(coords)))
        outer=[];inner=[]
        for x,z,_ in edge:
            direction=(centre-Vector((x,z))).normalized();xx=x+direction.x*.0045;zz=z+direction.y*.0045
            outer.append((x,V.surface_y(x,z)+.005,z));inner.append((xx,V.surface_y(xx,zz)+.005,zz))
        r.meshband('Molded dark headlamp perimeter frame',outer,inner,'black')
        x,z=.880,.730
        h.text('XIAOMI PIXEL',xy(x,z,-.001),.0030,'white',normal=(0,1,0))


def wheels():
    r.wheels()
    r.remove_prefix('Concave cast Y spoke','Recessed graphite Y spoke face','Machined wheel center medallion','Black wheel center inset','Recessed lug pocket','Five lug machined fastener')
    for o in list(h.MODEL.objects):
        if o.type=='FONT' and o.get('partId','').startswith('wheel-') and o.data.body=='mi':bpy.data.objects.remove(o,do_unlink=True)
    for side in [-1,1]:
        for yy,which in [(1.55,'front'),(-1.45,'rear')]:
            h.PART='wheel-'+which+('-left' if side<0 else '-right')
            def wp(radius,t,a,off=0):
                # Slight dish and forged shoulder: centre and rim are not coplanar.
                depth=.976-.015*math.exp(-((radius-.145)/.080)**2)
                return (side*(depth+off),yy+math.sin(a)*radius+math.cos(a)*t,.355+math.cos(a)*radius-math.sin(a)*t)
            shape=[(.032,-.026),(.081,-.033),(.197,-.088),(.241,-.094),(.254,-.072),(.244,-.054),(.145,-.005),(.145,.005),(.244,.054),(.254,.072),(.241,.094),(.197,.088),(.081,.033),(.032,.026)]
            inset=[(.086,-.020),(.196,-.077),(.235,-.079),(.242,-.071),(.235,-.064),(.151,-.016),(.104,.004)]
            def patch(name,outline,a,mat,off,thickness):
                bm=bmesh.new();verts=[bm.verts.new((rad,t,0)) for rad,t in outline]
                face=bm.faces.new(verts);bm.normal_update();bmesh.ops.triangulate(bm,faces=[face])
                bmesh.ops.subdivide_edges(bm,edges=list(bm.edges),cuts=4,use_grid_fill=True)
                expected=abs(sum(outline[i][0]*outline[(i+1)%len(outline)][1]-outline[(i+1)%len(outline)][0]*outline[i][1] for i in range(len(outline)))*.5)
                area=sum(face.calc_area() for face in bm.faces)
                if abs(area-expected)>expected*.005:raise RuntimeError(name+' has overlapping planar tessellation')
                TESSELLATION_CHECKS.append({'component':name,'relativeAreaError':abs(area-expected)/expected})
                for vert in bm.verts:
                    rad,t,_=vert.co;vert.co=wp(rad,t,a,off)
                bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
                for face in bm.faces:
                    if face.normal.x*side<0:face.normal_flip()
                if thickness:
                    bm.verts.ensure_lookup_table();bm.verts.index_update()
                    front=[tuple(vert.co) for vert in bm.verts];faces=[tuple(vert.index for vert in face.verts) for face in bm.faces]
                    boundary=[(edge.verts[0].index,edge.verts[1].index) for edge in bm.edges if len(edge.link_faces)==1]
                    count=len(front);back=[(x-side*thickness,y,z) for x,y,z in front]
                    closed=faces+[tuple(i+count for i in reversed(face)) for face in faces]
                    closed += [(u,v,v+count,u+count) for u,v in boundary]
                    bm.free()
                    return h.mesh(name,front+back,closed,mat)
                data=bpy.data.meshes.new(name);bm.to_mesh(data);bm.free()
                obj=bpy.data.objects.new(name,data);h.MODEL.objects.link(obj);obj['partId']=h.PART;data.materials.append(h.M[mat])
                for face in data.polygons:face.use_smooth=True
                return obj
            for i in range(5):
                a=math.pi+i*math.tau/5
                spoke=patch('Wide forged plum blossom wheel spoke',rounded(shape,.11,4),a,'alloy',0,.023)
                h.bevel(spoke,.0012,3)
                for branch in [-1,1]:
                    outline=[(rad,t*branch) for rad,t in rounded(inset,.18,5)]
                    patch('Deep graphite spoke channel',outline,a,'graphite',.0012,0)
                aa=a+math.pi/5;cy=yy+math.sin(aa)*.047;cz=.355+math.cos(aa)*.047
                h.cylinder('Machined recessed bolt seat',(side*.975,cy,cz),.013,.011,'alloy',segments=40)
                h.cylinder('Dark lug recess',(side*.982,cy,cz),.010,.010,'black',segments=32)
                h.cylinder('Hex wheel bolt',(side*.985,cy,cz),.006,.011,'graphite',segments=6)
            h.cylinder('Brushed centre cap',(side*.981,yy,.355),.029,.008,'alloy',segments=64)
            h.cylinder('Centre cap dark trim',(side*.986,yy,.355),.021,.003,'black',segments=64)
            h.cylinder('Centre cap silver face',(side*.988,yy,.355),.018,.002,'alloy',segments=64)
            h.text('mi',(side*.990,yy,.348),.022,'black',normal=(side,0,0))
            # Fine turned rotor scoring and shoulder tread are actual geometry.
            for radius in [.146,.158,.170,.189,.201]:
                h.tube('Brake disc turned scoring',[(side*.947,yy+math.sin(k*math.tau/128)*radius,.355+math.cos(k*math.tau/128)*radius) for k in range(128)],.00028,'graphite',True,0)
            for i in range(84):
                a=i*math.tau/84
                for sign in [-1,1]:
                    path=[]
                    for k in range(4):
                        dx=sign*(.074+.046*k/3);rad=.355-.009*(k/3)**2;angle=a+.015*k/3
                        path.append((side*.841+dx,yy+math.sin(angle)*rad,.355+math.cos(angle)*rad))
                    h.tube('Shoulder tread transverse sipe',path,.00075,'black',res=0)
    h.PART='body'


def exterior_details():
    # Sensors are shallow flush disks, aligned to the actual curved fascia.
    for sign in [-1,1]:
        outer_z=.573 if sign==1 else .636
        for x,z in [(-.58,.465),(.58,.465),(-.937,outer_z),(.937,outer_z)]:
            hit=Vector((x,V.surface_y(x,z,sign),z));near=V.BODY.find_nearest(hit)
            normal=near[1] if near[1] else Vector((0,sign,0))
            center=hit+normal*.001
            h.cylinder('Flush ultrasonic parking sensor',center,.009,.0018,'paint',axis=normal,segments=40)
            h.cylinder('Parking sensor perimeter',hit+normal*.0002,.0101,.001,'black',axis=normal,segments=40)
    r.remove_prefix('Lidar aerodynamic casing','Lidar roof base')
    z=b.roof(.32)
    h.box('Lidar molded plinth',(0,.32,z+.008),(.213,.146,.019),'black',.009)
    cap=h.box('Lidar sculpted black cap',(0,.314,z+.027),(.210,.146,.042),'mirrorblack',.018)
    cap.rotation_euler.x=.06
    h.box('Lidar smoked scanning window',(0,.387,z+.025),(.164,.003,.020),'glassdark',.006)


def cabin_details():
    """Refine the visible cabin assemblies against the official cockpit photo."""
    r.remove_prefix('Sculpted upper dashboard','Dashboard vent','Vent blade',
                    'Wireless phone pad','Cupholder','Lower steering spoke')
    h.PART='interior'
    # The dashboard is a continuous padded contour, rather than a rectangular box.
    section=h.smooth_loop([(.500,.735,0),(.492,.802,0),(.519,.860,0),(.635,.881,0),(.82,.865,0),(.86,.789,0),(.74,.735,0)],7)
    vs=[];fs=[];n=len(section)
    for i in range(65):
        x=-.79+1.58*i/64;edge=(abs(x)/.79)**2
        for y,z,_ in section:vs.append((x,y+.065*edge,z-.025*edge))
    for i in range(64):
        for j in range(n):
            a=i*n+j;q=i*n+(j+1)%n;fs.append((a,q,q+n,a+n))
    fs.extend([tuple(range(n-1,-1,-1)),tuple(64*n+i for i in range(n))])
    h.mesh('Flowing upholstered dashboard',vs,fs,'dash')
    for x,width in [(-.65,.20),(.49,.40)]:
        h.box('Slim dashboard air slot',(x,.491,.752),(width,.013,.011),'black',.004)
        h.box('Air vent lower metal blade',(x,.485,.747),(width*.94,.004,.002),'alloy',.0008)
    h.tube('Dashboard saddle stitch',[(x,.504+.065*(abs(x)/.79)**2,.851-.025*(abs(x)/.79)**2) for x in [-.77+1.54*i/96 for i in range(97)]],.0007,'stitch',res=0)
    # Phone charging tray, split into two pads with a retaining lip.
    h.box('Wireless tray surround',(0,.145,.594),(.258,.25,.022),'leather',.018)
    for side in [-1,1]:
        h.box('Individual wireless charging pad',(side*.061,.145,.607),(.108,.215,.009),'graphite',.012)
        h.box('Phone support foot',(side*.061,.042,.615),(.092,.014,.012),'alloy',.003)
        for i in range(4):
            h.tube('Wireless mat fine groove',[(side*.061-.044,.080+i*.038,.612),(side*.061+.044,.080+i*.038,.612)],.00045,'black',res=0)
    h.box('Phone divider ridge',(0,.145,.614),(.006,.185,.011),'alloy',.002)
    # Real cup wells with lips, inner walls, and spring tabs.
    console=bpy.data.objects.get('Center console')
    for modifier in list(console.modifiers):h.apply_modifier(console,modifier)
    for x in [-.064,.064]:
        cutter=h.cylinder('Cup well cutter',(x,-.105,.591),.049,.085,'black',axis=(0,0,1),segments=48)
        h.subtract(console,cutter)
        h.cylinder('Cup well dark bottom',(x,-.105,.551),.048,.003,'black',axis=(0,0,1),segments=48)
        vs=[];faces=[]
        for z in [.553,.604]:
            for i in range(65):
                a=i*math.tau/64;vs.append((x+.0485*math.cos(a),-.105+.0485*math.sin(a),z))
        for i in range(64):faces.append((i,i+1,i+66,i+65))
        h.mesh('Cup well inner lining',vs,faces,'black')
        h.tube('Cup well satin lip',[(x+.051*math.cos(i*math.tau/64),-.105+.051*math.sin(i*math.tau/64),.604) for i in range(64)],.0014,'alloy',True,1)
        for a in [0,math.pi]:
            h.box('Cupholder sprung tab',(x+.042*math.cos(a),-.105,.588),(.008,.027,.020),'graphite',.003)
    # Physical switches beneath the centre display.
    for i in range(5):
        x=.07+(i-2)*.047
        h.box('Console physical switch',(x,.469,.775),(.039,.025,.014),'alloy',.003)
        h.box('Console switch indicator',(x,.455,.779),(.009,.002,.0015),'white',.0003)
    for side in [-1,1]:
        for offset in [0,.012]:
            h.tube('Door upper double stitch',[(side*.784,y,.761-offset+.012*math.sin((y+.1)*2)) for y in [-.91+1.55*i/70 for i in range(71)]],.00065,'stitch',res=0)
        h.box('Door window switch bezel',(side*.735,.075,.654),(.070,.137,.009),'graphite',.008)
        for j in range(2):h.box('Door window rocker',(side*.735,.032+j*.055,.661),(.049,.031,.008),'alloy',.004)
        # Inner A-pillar trim follows the exterior, inset toward the cabin.
        def pillar(u,v):
            y=.92-.72*v;z=b.roof(y)-.054-.086*u
            return (side*(b.cabin_x(y,z)-.020),y,z)
        h.grid('Fitted interior A pillar trim',pillar,8,52,'leather')
        z=b.roof(.08)-.075
        visor=h.box('Cloth covered sun visor',(side*.40,.075,z),(.43,.185,.019),'leather',.014)
        visor.rotation_euler.x=-.13
        h.box('Sun visor hinge',(side*.20,.156,z+.01),(.032,.027,.027),'graphite',.008)
    roof_z=b.roof(.04)-.049
    h.box('Overhead control console',(0,.04,roof_z),(.205,.215,.032),'leather',.025)
    for x in [-.062,.062]:h.box('Overhead reading lamp',(x,-.01,roof_z-.019),(.036,.060,.002),'white',.008)
    for i in range(3):h.box('Overhead small switch',((i-1)*.035,.089,roof_z-.02),(.027,.022,.003),'graphite',.005)
    h.PART='steering'
    for side in [-1,1]:
        shape=[(-.43+side*.033,.270,.781),(-.43+side*.018,.250,.677),(-.43+side*.051,.257,.693),(-.43+side*.067,.273,.776)]
        spoke=r.extruded_loop('Split lower steering spoke',shape,(0,.015,0),'alloy');h.bevel(spoke,.003,3)
        h.cylinder('Steering roller knurl',(-.43+side*.11,.247,.810),.005,.017,'alloy',axis=(1,0,0),segments=24)
    h.PART='body'


def rear_outlets(shell):
    # The side photograph constrains this opening in longitudinal/height space.
    # A rear-facing projection alone stretched it horizontally around the corner.
    contour=[(-2.17,.645),(-2.24,.610),(-2.23,.438),(-2.13,.467),(-2.11,.534)]
    points=rounded(contour,.24,7)
    for side in [-1,1]:
        edge=[(V.surface_x(y,z,side)+side*.0005,y,z) for y,z in points]
        die=r.extruded_loop('Rear side air outlet die',[(side*1.35,y,z) for y,z in points],(-side*.70,0,0),'black')
        h.subtract(shell,die)
        back=[(x-side*.034,y,z) for x,y,z in edge]
        r.meshband('Rear outlet molded inner wall',edge,back,'black')
        h.mesh('Rear outlet shadow backing',back,[tuple(range(len(back)))],'lens')
        h.tube('Rear outlet fine edge seal',edge,.0013,'black',True,1)


def group_repeated_curves():
    """Keep repeated fine curves editable in one object per physical component."""
    prefixes=['Shoulder tread transverse sipe','Tire shoulder sipe','Daylight diffuser micro prism']
    groups={}
    for obj in h.MODEL.objects:
        prefix=next((p for p in prefixes if obj.name.startswith(p)),None)
        if prefix and obj.type=='CURVE':groups.setdefault((obj.get('partId','body'),prefix),[]).append(obj)
    for (part,prefix),objects in groups.items():
        if len(objects)<2:continue
        count=sum(len(obj.data.splines) for obj in objects)
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:obj.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        bpy.ops.object.join();merged=bpy.context.object
        merged.name='Batch / '+prefix+' / '+part
        merged['partId']=part;merged['sourceCurveCount']=count
        assert len(merged.data.splines)==count
