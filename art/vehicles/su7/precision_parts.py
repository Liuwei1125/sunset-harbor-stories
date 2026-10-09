"""Revision 5 component work: real gaps, layered optics and machined wheel faces."""
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
                if hit is not None:point.co=(*(hit-n*.0014),1)
        o.data.bevel_depth=.0014;o.name=name+' / recessed shadow'


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
