"""Revision 6: shared body surfaces, traced glazing and fitted lamp/fascia panels.

All output stays in this independent asset directory. --draft writes renders only.
Official photos are reference images, never embedded in exported model materials.
"""
import sys, math, json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import bpy, bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree
import refine_su7 as r

b, h = r.b, r.h
# The photo overlay shows the previous rear corners extending too far out.
# Preserve the wheelbase and maximum hip width, while rounding the tail return.
b.WIDTH=[(-2.4985,.84),(-2.30,.94)]+[point for point in b.WIDTH if point[0]>-2.30]
OUT = h.OUT
BODY = None
NORMAL_DONOR = None
HITS = {'front': 0, 'rear': 0, 'side': 0, 'misses': []}
TAU = math.tau
ORIGINAL_NOSE = b.nose


def fascia_profile(x,z,sign=1):
    if sign==1:return ORIGINAL_NOSE(x,z,sign)
    a=abs(x)/.96
    # Broad tailgate centre with a rounded return, without a central dimple.
    return -2.4985+.225*a*a+.058*b.smooth((.46-z)/.25)


def top(x, y):
    u = abs(x) / b.value(b.WIDTH, y)
    middle = b.waist(y) + .025 * (1-u*u)
    hood = b.value(b.HOOD, y)
    ridge = .079 * math.exp(-((y-1.52)/.72)**2) * math.exp(-((u-.78)/.23)**2)
    bonnet = hood + ridge - .020*u*u - .012*math.exp(-((u-.52)/.15)**2)*math.exp(-((y-1.55)/.9)**2)
    deck = b.value([(-2.4985,.885),(-2.38,.97),(-2.10,1.018),(-1.55,1.038)], y)
    if y > .56: z = r.blend(middle, bonnet, (y-.56)/.60)
    elif y < -1.53: z = r.blend(middle, deck, (-y-1.53)/.49)
    else: z = middle
    drop=.028+.050*b.smooth((y-.7)/.75)+.015*b.smooth((-y-1.55)/.65)
    return z - drop * b.smooth((u-.76)/.24)


def lower(y):
    return b.value([(-2.5,.195),(-2.12,.19),(-1.7,.18),(-1,.17),(.8,.17),(1.8,.185),(2.5,.217)],y)


def refresh_bvh(shell):
    global BODY
    bpy.context.view_layer.update()
    BODY = BVHTree.FromObject(shell,bpy.context.evaluated_depsgraph_get())


def surface_y(x,z,sign=1):
    hit, normal, index, distance = BODY.ray_cast(Vector((x,sign*3.3,z)),Vector((0,-sign,0)),6.6)
    if hit is None:
        HITS['misses'].append([round(x,4),round(z,4),sign])
        return b.nose(x,z,sign)
    HITS['front' if sign==1 else 'rear'] += 1
    return hit.y


def surface_x(y,z,side):
    hit, normal, index, distance = BODY.ray_cast(Vector((side*1.5,y,z)),Vector((-side,0,0)),3)
    if hit is None: return side*b.side_x(y,z)
    HITS['side'] += 1
    return hit.x


def body():
    global NORMAL_DONOR
    b.ztop=top; b.lower=lower; b.nose=fascia_profile
    vs=[]; fs=[]; ny=200
    for j in range(ny+1):
        y=-2.4985+4.997*j/ny; w=b.value(b.WIDTH,y); bottom=lower(y)
        half=[(u*w,top(u*w,y)) for u in [0,.22,.45,.63,.77,.87,.94,1.0]]
        shoulder=top(w,y)
        # Convex belt shoulder and a softly concave lower door, sampled as quads.
        for k in range(1,17):
            t=k/16
            crown=.010*math.exp(-((t-.19)/.19)**2)
            waist=.032*math.exp(-((t-.63)/.24)**2)
            taper=.058*t*t
            half.append((w*(1+crown-waist-taper),shoulder*(1-t)+bottom*t))
        half += [(w*.7,bottom-.008),(w*.35,bottom-.014),(0,bottom-.014)]
        loop=half+[(-x,z) for x,z in reversed(half[1:-1])]
        samples=h.smooth_loop([(x,z,0) for x,z in loop],3); n=len(samples)
        for x,z,_ in samples: vs.append(b.point(x,y,z))
    for j in range(ny):
        for i in range(n):
            a=j*n+i; c=j*n+(i+1)%n; fs.append((a,c,c+n,a+n))
    # The end caps use the same longitudinal surface as the body loft.
    for row,sign in [(0,-1),(ny,1)]:
        edge=vs[row*n:(row+1)*n]; cz=(lower(sign*2.4985)+top(0,sign*2.4985))*.5
        ci=len(vs);vs.append((0,b.nose(0,cz,sign),cz));last=None
        for k in range(1,11):
            ring=[]
            if k==10:ring=list(range(row*n,(row+1)*n))
            else:
                for x,y,z in edge:
                    xx=x*k/10;zz=cz+(z-cz)*k/10;ring.append(len(vs));vs.append((xx,b.nose(xx,zz,sign),zz))
            for i in range(n):
                q=(i+1)%n;fs.append((ci,ring[i],ring[q]) if last is None else (last[i],ring[i],ring[q],last[q]))
            last=ring
    shell=h.mesh('SU7 continuous curvature body / revision 6',vs,fs,'paint')
    fair=shell.modifiers.new('Primary surface fairness / Catmull Clark','SUBSURF')
    fair.levels=1;fair.render_levels=1
    h.apply_modifier(shell,fair)
    NORMAL_DONOR=shell.copy();NORMAL_DONOR.data=shell.data.copy()
    NORMAL_DONOR.name='CONSTRUCTION / uninterrupted surface normals'
    bpy.context.scene.collection.objects.link(NORMAL_DONOR)
    NORMAL_DONOR.hide_render=True;NORMAL_DONOR.hide_set(True)
    for side in [-1,1]:
        for y in [1.55,-1.45]:
            die=h.cylinder('Wheel opening die',(side*1.035,y,.355),.389,.69,'black',segments=112)
            h.subtract(shell,die)
    h.subtract(shell,h.box('Cabin hollow die',(0,-.24,1.45),(1.57,2.47,2.00),'black',.10))
    refresh_bvh(shell)
    # Use the actual body mesh for the panel lines and trim, avoiding floating parts.
    for side in [-1,1]:
        for y in [1.55,-1.45]:
            points=[]
            for i in range(97):
                a=-.44+(math.pi+.88)*i/96;yy=y+.390*math.cos(a);z=.355+.390*math.sin(a)
                points.append((surface_x(yy,z,side)+side*.0015,yy,z))
            h.tube('Tightly rolled wheel opening edge',points,.0038,'paint',res=2)
        seams=[[(.94,.981),(.985,.87),(1.0,.58),(.965,.31),(.94,.23)],
               [(-.25,1.015),(-.20,.87),(-.19,.63),(-.20,.39),(-.24,.22)],
               [(-1.43,1.055),(-1.49,.97),(-1.44,.92),(-1.26,.69),(-1.07,.47),(-.83,.25)]]
        for knots in seams:
            pts=[(surface_x(y,z,side)+side*.0015,y,z) for y,z in b.catmull_open(knots,14)]
            h.tube('Fitted door panel line',pts,.00115,'black',res=1)
        for yy,zz in [(-.045,.817),(-1.05,.84)]:
            loop=h.smooth_loop([(yy-.105,zz-.018,0),(yy-.092,zz+.016,0),(yy+.089,zz+.016,0),(yy+.102,zz-.013,0)],8)
            edge=[(surface_x(y,z,side)+side*.002,y,z) for y,z,_ in loop]
            h.mesh('Flush door handle gap',edge,[tuple(range(len(edge)))],'black')
            inner=[(surface_x(y,z,side)+side*.003,yy+(y-yy)*.88,zz+(z-zz)*.70+.003) for y,z,_ in loop]
            h.mesh('Flush painted handle face',inner,[tuple(range(len(inner)))],'paint')
        coords=[(1.245,.79),(1.0,.794),(.995,.731),(1.17,.742)]
        edge=h.smooth_loop([(y,z,0) for y,z in coords],7)
        h.patch('Recessed fender repeater',[(surface_x(y,z,side)+side*.002,y,z) for y,z,_ in edge[::7]],'lens')
        h.tube('Fender repeater lower blade',[(surface_x(y,z,side)+side*.004,y,z) for y,z in [(1.18,.750),(1.09,.746),(1.015,.756)]],.0016,'alloy',res=1)
        def sill(u,v):
            y=-1.075+2.20*v; z=.157+.066*u+.008*math.sin(v*math.pi)
            return (surface_x(y,z,side)+side*(.002+.010*math.sin(u*math.pi)),y,z)
        h.grid('Sculpted flush rocker sill',sill,8,64,'black')
        h.tube('Sill fine upper highlight',[sill(.95,i/64) for i in range(65)],.0022,'graphite',res=1)
        if side==-1:
            edge=h.smooth_loop([(-1.73,.985,0),(-1.94,.977,0),(-1.94,.88,0),(-1.72,.881,0)],9)
            h.tube('Charging port fitted seam',[(surface_x(y,z,side)+side*.0016,y,z) for y,z,_ in edge],.0012,'black',True,1)
    bonnet=[(.697,.96),(.671,1.31),(.657,1.75),(.563,2.10),(.419,2.26),(.22,2.335),(0,2.352)]
    knots=b.catmull_open(bonnet,16)
    h.tube('Fitted bonnet shut line',[b.surf(-x,y,.0015) for x,y in knots]+[b.surf(x,y,.0015) for x,y in reversed(knots[:-1])],.0011,'black',res=1)
    h.box('Underfloor',(0,-.06,.23),(1.6,3.68,.10),'rubber',.04)
    return shell


WINDOW_PIXELS=[(770,383),(815,358),(872,331),(927,314),(977,306),(1010,306),
               (1070,309),(1140,318),(1200,332),(1255,346),(1275,352),(1267,361),
               (1225,369),(1160,375),(1080,380),(1000,382),(920,384),(835,385)]


def continuous_roof():
    """One shared quad surface: glazing and painted borders never overlap."""
    b.roofpoint=lambda y,u:(u*b.value(b.RW,y),y,b.roof(y)-.043*u*u)
    def cabin_x(y,z):
        low=b.waist(y);high=b.roof(y)-.043
        t=max(0,min(1,(z-low)/max(.02,high-low)))
        return b.value(b.WIDTH,y)*.988*(1-t)+b.value(b.RW,y)*t+.006*math.sin(t*math.pi)
    b.cabin_x=cabin_x
    across=sorted(set([-1+2*i/80 for i in range(81)]+[-.947,-.935,-.925,.925,.935,.947]))
    rows=sorted(set([-1.985+2.964*i/156 for i in range(157)]+[-1.95,-1.935,-1.085,-1.075,-1.065,.222,.23,.238,.950,.960]))
    vs=[b.roofpoint(y,u) for y in rows for u in across];fs=[];indices=[];n=len(across)
    for j in range(len(rows)-1):
        for i in range(n-1):
            a=j*n+i;fs.append((a,a+1,a+n+1,a+n))
            u=(across[i]+across[i+1])/2;y=(rows[j]+rows[j+1])/2
            if y< -1.075:
                end=max(0,min(1,(-1.84-y)/.11));limit=.935-.075*end*end
                mat=2 if abs(u)<limit and y> -1.935 else 0
                if abs(abs(u)-limit)<.012 or -1.95<y< -1.935:mat=4
            elif y<.23:mat=2 if abs(u)<.935 else 0
            else:mat=1 if abs(u)<.935 and y<.950 else 0
            if (.222<y<.238 or -1.085<y< -1.065) and abs(u)<.947:mat=4
            if .925<abs(u)<.947 and -1.84<y<.950:mat=4
            if .950<y<.960 and abs(u)<.947:mat=4
            indices.append(mat)
    obj=h.mesh('Continuous roof and windscreen glass / shared quad surface',vs,fs,'paint')
    for key in ['glass','roofglass','sideglass','black']:obj.data.materials.append(h.M[key])
    for face,index in zip(obj.data.polygons,indices):face.material_index=index
    solid=obj.modifiers.new('Laminated glazing thickness','SOLIDIFY');solid.thickness=.0032;solid.offset=-1
    obj['surfaceConstruction']='Single non-overlapping quad shell with shared glass/paint vertices'
    # Rear camera is tucked into the upper black ceramic mask.
    rear=b.roofpoint(-1.11,0)
    h.uv_sphere('Rear windshield camera pod',(rear[0],rear[1]-.006,rear[2]+.003),(.023,.036,.010),'black',segments=32,rings=16)
    for y in [-1.075,.23]:
        h.tube('Roof glazing assembly seal',[tuple(Vector(b.roofpoint(y,-.947+1.894*i/90))+Vector((0,0,.0007))) for i in range(91)],.0015,'black',res=1)
    return obj


def cabin():
    continuous_roof()
    b.cabin()
    r.remove_prefix('Continuous A / C pillar','Flush side glazing','Window rubber seal','Gloss window divider',
                    'Exterior mirror neck','Body color mirror cap','Mirror black lower shell','Mirror glass')
    r.remove_prefix('Curved rear windscreen','Swept front windscreen','Panoramic roof','Integrated painted roof edge')
    trace=[(b.py(x),b.pz(z),0) for x,z in WINDOW_PIXELS]
    edge=h.smooth_loop(trace,6)
    for side in [-1,1]:
        # A solid thin side skin is cut by one continuous traced outline.
        # No correspondence between unrelated outer/inner loops is required.
        def skin(u,v):
            y=-1.985+2.964*v;lo=top(.988*b.value(b.WIDTH,y),y)-.012;hi=max(lo+.001,b.roof(y)-.043)
            z=lo+(hi-lo)*u
            return (side*b.cabin_x(y,z),y,z)
        frame=h.grid('Continuous A pillar and rear sail',skin,18,110,'paint')
        mod=frame.modifiers.new('Window frame thickness','SOLIDIFY');mod.thickness=.012;mod.offset=-1
        h.apply_modifier(frame,mod)
        cutter=r.extruded_loop('Traced side window cutter',[(side*.50,y,z) for y,z,_ in edge],(side*.8,0,0),'black')
        h.subtract(frame,cutter)
        h.bevel(frame,.0015,2)
        # Recover the uninterrupted side skin's normals across the window cut.
        smooth=bpy.data.objects.new('CONSTRUCTION / pillar normal guide',frame.data.copy())
        bpy.context.scene.collection.objects.link(smooth);smooth.hide_render=True;smooth.hide_set(True)
        for polygon in smooth.data.polygons:polygon.use_smooth=True
        # Analytic normal field of cabin_x, independent of the Boolean edge flow.
        normals=[]
        for loop in frame.data.loops:
            vertex=frame.data.vertices[loop.vertex_index].co;y,z=vertex.y,vertex.z;eps=.0005
            dy=(b.cabin_x(y+eps,z)-b.cabin_x(y-eps,z))/(2*eps)
            dz=(b.cabin_x(y,z+eps)-b.cabin_x(y,z-eps))/(2*eps)
            normals.append(tuple(Vector((side,-dy,-dz)).normalized()))
        frame.data.normals_split_custom_set(normals)
        bpy.data.objects.remove(smooth,do_unlink=True)
        def project(p):
            _,y,z=p;return (side*(b.cabin_x(y,z)+.001),y,z)
        glazing=fitted_polygon('Traced curved side glazing',[(y,z) for y,z,_ in trace],'sideglass',lambda p:project((0,p[0],p[2])))
        solid=glazing.modifiers.new('Side window glass thickness','SOLIDIFY');solid.thickness=.003;solid.offset=-1
        h.tube('Fine continuous black window seal',[(side*(b.cabin_x(y,z)+.0025),y,z) for y,z,_ in edge],.0034,'black',True,2)
        for knots,width in [([(1010,380),(1023,345),(1036,305)],.015), ([(1205,370),(1203,350),(1200,333)],.0045)]:
            points=[(b.py(x),b.pz(z)) for x,z in knots]
            h.tube('Fitted gloss window division',[(side*(b.cabin_x(y,z)+.003),y,z) for y,z in b.catmull_open(points,18)],width,'black',res=2)
        h.tube('Black mirror pedestal',[(side*.90,.71,.981),(side*.978,.67,1.017),(side*1.027,.657,1.053)],.014,'black',res=3)
        h.uv_sphere('Gloss black exterior mirror cap',(side*1.056,.662,1.075),(.111,.084,.049),'mirrorblack',segments=40,rings=24)
        h.uv_sphere('Mirror lower molded shell',(side*1.056,.652,1.050),(.112,.083,.025),'black')
        h.uv_sphere('Exterior mirror reflective face',(side*1.057,.582,1.071),(.096,.006,.033),'mirror')
        h.tube('Mirror repeater lens',[(side*(.975+i*.135/20),.707-abs(i/20-.5)*.020,1.058) for i in range(21)],.0017,'led',res=1)


def outline_patch(name,coords,mat,sign=1,offset=.001):
    def project(p):return (p[0],surface_y(p[0],p[2],sign)+sign*offset,p[2])
    return fitted_polygon(name,coords,mat,project)


def fitted_polygon(name,coords,mat,project):
    """Triangulate concave panel boundaries before fitting the dense mesh to the body.

    A center-fan is invalid for U-shaped diffuser panels: it fills the notch and
    creates overlapping triangles. Blender's polygon tessellation preserves it.
    """
    edge=h.smooth_loop([(x,z,0) for x,z in coords],5)
    bm=bmesh.new();verts=[bm.verts.new(p) for p in edge]
    face=bm.faces.new(verts)
    bm.normal_update()
    bmesh.ops.triangulate(bm,faces=[face])
    bmesh.ops.subdivide_edges(bm,edges=list(bm.edges),cuts=7,use_grid_fill=True)
    bm.verts.ensure_lookup_table()
    for v in bm.verts:
        x,z,_=v.co;v.co=project((x,0,z))
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    for face in bm.faces:
        p=face.calc_center_median()
        if face.normal.dot(Vector((p.x,p.y,0)))<0:face.normal_flip()
    data=bpy.data.meshes.new(name);bm.to_mesh(data);bm.free()
    obj=bpy.data.objects.new(name,data);h.MODEL.objects.link(obj)
    obj['partId']=h.PART;data.materials.append(h.M[mat])
    for p in data.polygons:p.use_smooth=True
    return obj


def recess(shell,name,coords,sign=1,depth=.055,mat='black'):
    sampled=h.smooth_loop([(x,z,0) for x,z in coords],5)
    edge=[(x,surface_y(x,z,sign)+sign*.0005,z) for x,z,_ in sampled]
    far=min(sign*y for x,y,z in edge)-depth-.10
    die=r.extruded_loop(name+' planar boolean die',[(x,sign*3.2,z) for x,y,z in edge],(0,-sign*(3.2-far),0),'black')
    before=len(shell.data.polygons);h.subtract(shell,die)
    if len(shell.data.polygons)<before*.7:raise RuntimeError('Body damaged by '+name)
    back=[(x,y-sign*depth,z) for x,y,z in edge]
    r.meshband(name+' molded inner return',edge,back,mat)
    h.mesh(name+' recessed backing',back,[tuple(range(len(back)))],'lens',False)
    h.tube(name+' thin edge seal',edge,.0013,'black',True,1)
    return edge


LAMP=[(.413,.638),(.512,.678),(.690,.750),(.836,.788),(.899,.782),(.907,.737),(.882,.651),(.830,.627),(.63,.615),(.49,.617)]


def headlights(shell):
    for side in [-1,1]:
        coords=[(side*x,z) for x,z in LAMP]
        recess(shell,'Swept waterdrop headlamp',coords,depth=.028,mat='lens')
        # White blade and silver lower return have ribbon surfaces instead of tubes.
        def strip(name,knots,width,mat):
            pts=b.catmull_open(knots,12);vs=[]
            for i,(x,z) in enumerate(pts):
                taper=.24+.76*min(1,i/10,(len(pts)-1-i)/8)
                for dz in [-width*taper/2,width*taper/2]:
                    vs.append((side*x,surface_y(side*x,z+dz)+.0015,z+dz))
            return h.mesh(name,vs,[(2*i,2*i+1,2*i+3,2*i+2) for i in range(len(pts)-1)],mat)
        strip('Single horizontal headlamp DRL',[(.448,.635),(.57,.652),(.72,.693),(.861,.724),(.886,.729)],.010,'led')
        strip('Lower headlamp machined return',[(.565,.630),(.684,.636),(.805,.655),(.865,.677)],.008,'alloy')
        for x,z in [(.749,.733),(.842,.752),(.747,.655),(.827,.674)]:
            corners=[(x-.019,z-.016),(x+.019,z-.016),(x+.019,z+.016),(x-.019,z+.016)]
            outer=h.smooth_loop([(xx,zz,0) for xx,zz in corners],4)
            outer3=[(side*xx,surface_y(side*xx,zz)-.007,zz) for xx,zz,_ in outer]
            inner3=[(side*(x+(xx-x)*.86),surface_y(side*(x+(xx-x)*.86),z+(zz-z)*.86)-.007,z+(zz-z)*.86) for xx,zz,_ in outer]
            r.meshband('Deep individual projector chamber',outer3,[(xx,yy-.020,zz) for xx,yy,zz in outer3],'black')
            r.meshband('Square optical projector bezel',outer3,inner3,'alloy')
            h.mesh('Recessed optical projector glass',inner3,[tuple(range(len(inner3)))],'projector')
            def lens(u,v):
                xx=side*(x+(u-.5)*.030);zz=z+(v-.5)*.024
                return (xx,surface_y(xx,zz)-.006+.001*math.sin(math.pi*u)*math.sin(math.pi*v),zz)
            h.grid('Curved optical lens face',lens,8,8,'projector')
        strip('Headlamp upper internal reflector',[(.542,.671),(.661,.724),(.80,.765),(.866,.761)],.004,'graphite')
        outline_patch('Thin clear headlamp outer lens',coords,'clearlens',offset=.004)


def bumpers(shell):
    recess(shell,'Central front intake',[(-.335,.248),(-.328,.432),(.328,.432),(.335,.248)],depth=.082)
    for side in [-1,1]:
        recess(shell,'Front outer intake',[(side*x,z) for x,z in [(.377,.252),(.397,.421),(.455,.454),(.557,.434),(.745,.264),(.707,.246)]],depth=.073)
        recess(shell,'Front vertical air curtain',[(side*x,z) for x,z in [(.777,.586),(.901,.609),(.881,.528),(.824,.372),(.784,.402)]],depth=.047)
        for z in [.286,.347]:
            h.tube('Front intake horizontal vane',[(side*x,surface_y(side*x,z)-.025,z) for x in [.419,.49,.59]],.004,'black',res=1)
        outline_patch('Painted front intake structural bridge',[(side*x,z) for x,z in [(.334,.249),(.374,.423),(.417,.445),(.393,.353),(.372,.251)]],'paint',offset=.004)
    for x in [-.255,-.17,.17,.255]:h.box('Front central grille guide',(x,surface_y(x,.329)-.025,.329),(.007,.032,.151),'black',.002)
    for z in [.28,.34,.4]:h.box('Active grille shutter',(0,surface_y(0,z)-.061,z),(.61,.022,.016),'graphite',.003)
    h.box('Front radar cover',(0,surface_y(0,.328)-.002,.328),(.187,.012,.16),'black',.009)
    for sign,z in [(1,.532),(-1,.360)]:
        yy=sign*(max(sign*surface_y(x,zz,sign) for x in [-.22,0,.22] for zz in [z-.055,z,z+.055])+.006)
        h.box('Fitted registration bracket',(0,yy-sign*.009,z),(.455,.014,.119),'black',.005)
        h.box('Fitted registration plate',(0,yy,z),(.43,.006,.102),'white',.004)
        h.text('xiaomi  SU7',(0,yy+sign*.004,z-.020),.037,'black',normal=(0,sign,0))
    pts=[(x,surface_y(x,.23)+.003,.23) for x in [-.85+i*1.7/100 for i in range(101)]]
    h.tube('Integrated black front lip',pts,.007,'black',res=2)
    badge=h.box('Inset bonnet badge',b.surf(0,2.12,.002),(.058,.066,.002),'alloy',.005)
    tangent=Vector(b.surf(0,2.13))-Vector(b.surf(0,2.11));normal=Vector((1,0,0)).cross(tangent).normalized()
    badge.rotation_euler=normal.to_track_quat('Z','Y').to_euler()
    h.text('mi',b.surf(0,2.12,.004),.025,'graphite',normal=normal)
    tail=[(-.919,.822),(-.847,.858),(-.622,.886),(-.477,.851),(.477,.851),(.622,.886),(.847,.858),(.919,.822),(.72,.790),(0,.787),(-.72,.790)]
    recess(shell,'Integrated rear lamp housing',tail,-1,.020,'lens')
    guide=[(-.882,.824),(-.811,.847),(-.631,.868),(-.475,.829),(.475,.829),(.631,.868),(.811,.847),(.882,.824),(.682,.808),(0,.806),(-.682,.808)]
    for shrink,width in [(1,.0029),(.974,.0012)]:
        edge=h.smooth_loop([(x*shrink,.832+(z-.832)*shrink,0) for x,z in guide],8)
        h.tube('Continuous rear optical light guide',[(x,surface_y(x,z,-1)-.001,z) for x,z,_ in edge],width,'tail',True,2)
    outline_patch('Rear lamp transparent outer cover',tail,'clearlens',-1,.002)
    parts.rear_outlets(shell)
    # A broad moulded lower fascia follows the body instead of hanging off its end.
    diffuser=[(-.837,.242),(-.830,.380),(-.704,.488),(-.512,.506),(-.322,.466),(0,.456),(.322,.466),(.512,.506),(.704,.488),(.830,.380),(.837,.242),(.68,.226),(-.68,.226)]
    recess(shell,'Recessed lower rear fascia aperture',diffuser,-1,.016,'black')
    fascia=outline_patch('Flush black rear diffuser fascia',diffuser,'black',-1,-.011)
    solid=fascia.modifiers.new('Molded rear fascia thickness','SOLIDIFY');solid.thickness=.007
    for side in [-1,1]:
        cap=[(.349,.227),(.345,.351),(.402,.412),(.552,.442),(.711,.410),(.796,.347),(.820,.240),(.76,.230),(.735,.298),(.67,.321),(.483,.314),(.40,.283),(.394,.225)]
        def cap_project(p):
            x,_,z=p
            bulge=.007+.013*math.exp(-((z-.345)/.09)**2)
            return (x,surface_y(x,z,-1)-bulge,z)
        insert=fitted_polygon('Broad sculpted rear diffuser insert',[(side*x,z) for x,z in cap],'paint',cap_project)
        solid=insert.modifiers.new('Rear diffuser insert molded return','SOLIDIFY');solid.thickness=.008;solid.offset=-1
        outline_patch('Recessed rear reflector surround',[(side*x,z) for x,z in [(.433,.247),(.445,.288),(.655,.297),(.73,.279),(.723,.245)]],'lens',-1,.008)
        h.tube('Rear bumper reflector',[(side*x,surface_y(side*x,z,-1)-.009,z) for x,z in [(.454,.265),(.53,.269),(.632,.270),(.704,.26)]],.003,'tail',res=2)
    # Keep all lettering outside the curved tailgate, including its end letters.
    word_y=min(surface_y(x,.914,-1) for x in [-.15,0,.15])-.0035
    h.text('x i a o m i',(0,word_y,.902),.032,'alloy',normal=(0,-1,0))
    for value,x,z,size,mat in [('SU7',.58,.708,.022,'alloy'),('Max',.674,.708,.017,'tail')]:
        yy=min(surface_y(xx,z,-1) for xx in [x-.035,x,x+.035])-.0035
        h.text(value,(x,yy,z),size,mat,normal=(0,-1,0))
    for side in [-1,1]:
        path=b.catmull_open([(.671,.955),(.687,.866),(.646,.72),(.555,.677),(0,.677)],14)
        h.tube('Fitted trunk shut line',[(side*x,surface_y(side*x,z,-1)-.0015,z) for x,z in path],.00115,'black',res=1)
    h.PART='spoiler';h.JOINTS['spoiler']={'pivot':(0,-2.27,.994),'motion':'spoiler'}
    h.grid('Flush active deck spoiler',lambda u,v:b.surf((2*u-1)*.79,-2.20-.18*v,.0015+.003*v),64,12,'paint')
    h.PART='body'
    parts.rear_lights()


def materials():
    r.materials()
    p=h.M['paint'].node_tree.nodes.get('Principled BSDF')
    p.inputs['Metallic'].default_value=.46;p.inputs['Roughness'].default_value=.23
    p.inputs['Coat Weight'].default_value=.42;p.inputs['Coat Roughness'].default_value=.12
    for key,alpha,rough in [('glass',.67,.105),('sideglass',.94,.13),('roofglass',1,.14)]:
        m=h.M[key];p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Alpha'].default_value=alpha
        p.inputs['Metallic'].default_value=.02;p.inputs['Roughness'].default_value=rough
        p.inputs['Specular IOR Level'].default_value=.32;p.inputs['IOR'].default_value=1.45
        m.diffuse_color=(*m.diffuse_color[:3],alpha);m.surface_render_method='DITHERED'
    p=h.M['clearlens'].node_tree.nodes.get('Principled BSDF');p.inputs['Alpha'].default_value=.075
    p.inputs['Roughness'].default_value=.10
    p=h.M['projector'].node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(.008,.018,.026,1)
    p.inputs['Metallic'].default_value=.1;p.inputs['Roughness'].default_value=.13
    p=h.M['sideglass'].node_tree.nodes.get('Principled BSDF')
    p.inputs['Specular IOR Level'].default_value=.16;p.inputs['Roughness'].default_value=.18
    p=h.M['black'].node_tree.nodes.get('Principled BSDF');p.inputs['Metallic'].default_value=0


def finish_surface_normals(shell):
    """Preserve smooth exterior reflections across boolean-created long polygons."""
    bpy.context.view_layer.update()
    donor=BVHTree.FromObject(NORMAL_DONOR,bpy.context.evaluated_depsgraph_get())
    shell.data.materials.append(h.M['black'])
    inside_index=len(shell.data.materials)-1
    for polygon in shell.data.polygons:
        hit,normal,index,distance=donor.find_nearest(polygon.center)
        if distance>.006 or (polygon.center.y< -1.9 and polygon.center.z<.238):polygon.material_index=inside_index
    group=shell.vertex_groups.new(name='Uninterrupted exterior normal field')
    for vertex in shell.data.vertices:
        hit,normal,index,distance=donor.find_nearest(vertex.co)
        if distance<.003:group.add([vertex.index],1.0,'REPLACE')
    mod=shell.modifiers.new('Transfer uncut exterior surface normals','DATA_TRANSFER')
    mod.object=NORMAL_DONOR;mod.use_loop_data=True;mod.data_types_loops={'CUSTOM_NORMAL'}
    mod.loop_mapping='POLYINTERP_NEAREST';mod.vertex_group=group.name
    h.apply_modifier(shell,mod)


def wheels():
    r.wheels()
    for obj in h.MODEL.objects:
        if obj.type=='MESH' and obj.name.startswith('Recessed graphite Y spoke face'):
            center=sum((v.co for v in obj.data.vertices),Vector())/len(obj.data.vertices)
            for v in obj.data.vertices:
                v.co.y=center.y+(v.co.y-center.y)*.82
                v.co.z=center.z+(v.co.z-center.z)*.82


VIEWS={
    'front':{'eye':(-9.0,7.4,2.28),'target':(0,0,.74),'lens':62},
    'rear':{'eye':(8.5,-7.7,2.2),'target':(0,0,.72),'lens':62},
    'side':{'eye':(-10,0,.74),'target':(0,0,.74),'lens':60,'ortho':6.1},
    'front-flat':{'eye':(0,10,.74),'target':(0,0,.74),'lens':62,'ortho':3.15},
    'rear-flat':{'eye':(0,-10,.74),'target':(0,0,.74),'lens':62,'ortho':3.15},
    'headlight':{'eye':(-2.60,4.00,1.35),'target':(-.70,2.19,.72),'lens':78},
    'wheel':r.VIEWS['wheel'], 'cockpit':r.VIEWS['cockpit'],
    'cabin-wide':{'eye':(0,-1.06,1.19),'target':(0,.57,.72),'lens':18},
}


def reference_cameras():
    collection=bpy.data.collections.new('REFERENCE / fixed review cameras')
    bpy.context.scene.collection.children.link(collection)
    for name,view in VIEWS.items():
        data=bpy.data.cameras.new('REVIEW / '+name)
        camera=bpy.data.objects.new('REVIEW / '+name,data);collection.objects.link(camera)
        h.position_camera(camera,view);data.clip_start=.01;data.clip_end=100
        data.shift_x,data.shift_y=view.get('shift',[0,0]);data.sensor_fit='HORIZONTAL'
        if name=='reference-front':
            data.show_background_images=True;background=data.background_images.new()
            background.image=bpy.data.images.load(str(OUT/'references/6-1.png'),check_existing=True)
            background.image.filepath=str(OUT/'references/6-1.png');background.alpha=.45;background.display_depth='FRONT'
            camera['referenceRenderResolution']=[2048,1152]
    collection.hide_render=True


def render(camera,names):
    scene=bpy.context.scene
    paint=h.M['paint'].node_tree.nodes.get('Principled BSDF')
    keys=['Base Color','Metallic','Roughness','Coat Weight']
    saved={key:tuple(paint.inputs[key].default_value) if key=='Base Color' else paint.inputs[key].default_value for key in keys}
    rough_links=[(link.from_socket,link.to_socket) for link in paint.inputs['Roughness'].links]
    for name in names:
        clay=name.startswith('clay-');view=name.removeprefix('clay-').removeprefix('reflection-')
        for link in list(paint.inputs['Roughness'].links):h.M['paint'].node_tree.links.remove(link)
        if not clay and not name.startswith('reflection-'):
            for source,target in rough_links:h.M['paint'].node_tree.links.new(source,target)
        for key,val in saved.items():paint.inputs[key].default_value=val
        if clay:
            paint.inputs['Base Color'].default_value=(.26,.27,.28,1);paint.inputs['Metallic'].default_value=0
            paint.inputs['Roughness'].default_value=.56;paint.inputs['Coat Weight'].default_value=0
        if name.startswith('reflection-'):
            paint.inputs['Base Color'].default_value=(.11,.12,.13,1);paint.inputs['Roughness'].default_value=.16
            bpy.data.lights['STUDIO / roof ribbon'].size=.25
            bpy.data.lights['STUDIO / side strip'].size=.35
        else:
            bpy.data.lights['STUDIO / roof ribbon'].size=.85
            bpy.data.lights['STUDIO / side strip'].size=1.25
        h.position_camera(camera,VIEWS[view])
        camera.data.shift_x,camera.data.shift_y=VIEWS[view].get('shift',[0,0])
        camera.data.sensor_fit='HORIZONTAL'
        scale=.70 if '--draft' in sys.argv else 1
        size=VIEWS[view].get('resolution',[1600,1000])
        scene.render.resolution_x=round(size[0]*scale);scene.render.resolution_y=round(size[1]*scale)
        transparent=view=='reference-front'
        bpy.data.lights['STUDIO / cabin bounce'].energy=7 if view in ['cockpit','cabin-wide'] else .35
        scene.render.film_transparent=transparent;scene.render.image_settings.color_mode='RGBA' if transparent else 'RGB'
        bpy.data.objects['STUDIO / seamless floor'].hide_render=transparent
        scene.render.filepath=str(OUT/'renders'/('v6-'+name+'.png'))
        print('RENDER',name,flush=True);bpy.ops.render.render(write_still=True)
    for key,val in saved.items():paint.inputs[key].default_value=val
    for link in list(paint.inputs['Roughness'].links):h.M['paint'].node_tree.links.remove(link)
    for source,target in rough_links:h.M['paint'].node_tree.links.new(source,target)


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.scene.unit_settings.system='METRIC'
    h.MODEL=bpy.data.collections.new('SU7 / curvature and silhouette revision 6');bpy.context.scene.collection.children.link(h.MODEL)
    h.PART='body';h.JOINTS={'body':{'pivot':(0,0,0),'motion':'static'}}
    import reference_camera
    VIEWS['reference-front']=reference_camera.fit(sys.modules[__name__])
    materials();shell=body();cabin();headlights(shell);bumpers(shell);panel_gaps(shell);finish_surface_normals(shell);wheels();h.interior();parts.cabin_details();exterior_details()
    # The old interior pillar tubes protruded through the new exterior A pillar.
    r.remove_prefix('Interior A pillar')
    parts.group_repeated_curves()
    bpy.context.view_layer.update()
    print('REVISION 6 GEOMETRY',len(h.MODEL.objects),'BODY FACES',len(shell.data.polygons),'SURFACE FIT',json.dumps(HITS),flush=True)
    draft='--draft' in sys.argv
    camera=studio();scene=bpy.context.scene
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.20,.25,.30,1)
    scene.view_settings.exposure=0
    scene.cycles.samples=32 if draft else 128
    if draft:scene.render.resolution_x=1280;scene.render.resolution_y=800
    if not draft:
        info=h.export_game(version='0.6',preserve_surface_normals=True)
        info.update(authoring='Continuous non-overlapping glazing with real thickness; recessed rear fascia; corrected door and trunk gaps; flat rear optical guides; detailed cockpit fittings and editable grouped microgeometry.',
                    accuracy='Official-photo approximation with fixed orthographic and perspective views; no CAD or numerical likeness claim.',
                    referenceModel='2026 SU7 Max, Capri blue, 20-inch plum-blossom wheel; ceramic interior reference study')
        (OUT/'manifest.json').write_text(json.dumps(info,ensure_ascii=False,indent=2)+'\n')
        (OUT/'surface-fit.json').write_text(json.dumps({'version':'0.6','surfaceProjection':HITS,'componentTessellation':parts.TESSELLATION_CHECKS,'sideWindowReferencePixels':WINDOW_PIXELS,'cameras':VIEWS,'note':'Projection counts and tessellation areas check geometry construction; they are not a photo-likeness score.'},indent=2)+'\n')
        h.rig_editable_source();h.position_camera(camera,VIEWS['front'])
        reference_cameras()
        bpy.context.scene['assetRevision']='0.6'
        bpy.ops.file.pack_all()
        bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'xiaomi-su7.blend'))
    if '--render' in sys.argv:
        names=sys.argv[sys.argv.index('--views')+1].split(',') if '--views' in sys.argv else ['front','side','rear','front-flat','rear-flat','headlight','wheel','clay-front','clay-side','reflection-rear']
        render(camera,names)
    print('REVISION 6 COMPLETE',flush=True)


_base_materials=materials


def materials():
    _base_materials()
    for key,args in {
        'opticsilver':('29 Optical vacuum metal reflector','BDC6D0',.94,.16),
        'opticglass':('30 Optical glass lens','EBF1F5',0,.05),
        'opticsmoke':('31 Smoked lamp backing','111C27',.10,.24),
    }.items():h.M[key]=h.material(*args)
    for key in ['opticglass','clearlens']:
        m=h.M[key];p=m.node_tree.nodes.get('Principled BSDF')
        p.inputs['Base Color'].default_value=(.92,.96,1,1)
        p.inputs['Alpha'].default_value=1;p.inputs['Metallic'].default_value=0
        p.inputs['Transmission Weight'].default_value=1;p.inputs['IOR'].default_value=1.49
        p.inputs['Roughness'].default_value=.045 if key=='opticglass' else .095
        p.inputs['Specular IOR Level'].default_value=.5 if key=='opticglass' else .22
        m.diffuse_color=(.92,.96,1,1)
    p=h.M['paint'].node_tree.nodes.get('Principled BSDF')
    p.inputs['Metallic'].default_value=.56;p.inputs['Roughness'].default_value=.20
    p.inputs['Coat Weight'].default_value=.60;p.inputs['Coat Roughness'].default_value=.10
    # Very fine factory-paint roughness variation; no visible dirt or scratches.
    nodes=h.M['paint'].node_tree.nodes;links=h.M['paint'].node_tree.links
    noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=4200;noise.inputs['Detail'].default_value=2
    noise.name='Microscopic metallic finish'
    ramp=nodes.new('ShaderNodeMapRange');ramp.inputs['From Min'].default_value=0;ramp.inputs['From Max'].default_value=1
    ramp.inputs['To Min'].default_value=.18;ramp.inputs['To Max'].default_value=.23
    links.new(noise.outputs['Fac'],ramp.inputs['Value']);links.new(ramp.outputs[0],p.inputs['Roughness'])
    for key,rough in [('alloy',.22),('graphite',.24),('rubber',.71),('tirelabel',.74)]:
        h.M[key].node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=rough
    black=h.M['black'].node_tree.nodes.get('Principled BSDF')
    black.inputs['Specular IOR Level'].default_value=.28;black.inputs['Roughness'].default_value=.38
    # Physical transmission keeps the windshield usable from the driver's seat.
    for key,color in [('glass',(.84,.9,.94,1)),('sideglass',(.49,.60,.68,1)),('roofglass',(.16,.23,.29,1))]:
        m=h.M[key];shader=m.node_tree.nodes.get('Principled BSDF')
        shader.inputs['Base Color'].default_value=color;shader.inputs['Alpha'].default_value=1
        shader.inputs['Transmission Weight'].default_value=.96
        shader.inputs['Metallic'].default_value=0;shader.inputs['IOR'].default_value=1.46
        shader.inputs['Roughness'].default_value=.075;shader.inputs['Specular IOR Level'].default_value=.38
        m.diffuse_color=color;m.use_backface_culling=False


def studio():
    camera=r.studio();scene=bpy.context.scene
    key=bpy.data.lights['STUDIO / broad front softbox']
    key.energy=520
    if hasattr(key,'specular_factor'):key.specular_factor=.22
    roof=bpy.data.lights['STUDIO / roof ribbon'];roof.size=.85;roof.size_y=6;roof.energy=350
    side=bpy.data.objects['STUDIO / side strip'];side.location=(-4,-.4,3.0)
    side.rotation_euler=(Vector((0,0,.65))-side.location).to_track_quat('-Z','Y').to_euler()
    side.data.size=1.25;side.data.size_y=5.5;side.data.energy=410
    world=scene.world;nodes=world.node_tree.nodes;links=world.node_tree.links
    hdr=nodes.new('ShaderNodeTexEnvironment')
    hdr.image=bpy.data.images.load(str(OUT.parents[2]/'assets/showroom/studio.hdr'),check_existing=True)
    background=nodes.get('Background');links.new(hdr.outputs['Color'],background.inputs['Color'])
    background.inputs['Strength'].default_value=.035
    # Keep a neutral camera backdrop while using actual studio reflections.
    camera_bg=nodes.new('ShaderNodeBackground');camera_bg.inputs['Color'].default_value=(.18,.22,.25,1)
    camera_bg.inputs['Strength'].default_value=.45
    path=nodes.new('ShaderNodeLightPath');mix=nodes.new('ShaderNodeMixShader')
    links.new(path.outputs['Is Camera Ray'],mix.inputs[0]);links.new(background.outputs[0],mix.inputs[1]);links.new(camera_bg.outputs[0],mix.inputs[2]);links.new(mix.outputs[0],nodes.get('World Output').inputs['Surface'])
    scene.cycles.max_bounces=12;scene.cycles.transmission_bounces=8;scene.cycles.transparent_max_bounces=12
    data=bpy.data.lights.new('STUDIO / cabin bounce','AREA');data.energy=.35;data.shape='RECTANGLE';data.size=.9;data.size_y=.55
    fill=bpy.data.objects.new('STUDIO / cabin bounce',data);scene.collection.objects.link(fill)
    fill.location=(0,-.35,1.29);fill.rotation_euler=(Vector((0,.45,.65))-fill.location).to_track_quat('-Z','Y').to_euler()
    return camera


import atelier_parts as parts
parts.install(sys.modules[__name__])
headlights=parts.headlights
wheels=parts.wheels
panel_gaps=parts.panel_gaps
exterior_details=parts.exterior_details


if __name__=='__main__':main()
