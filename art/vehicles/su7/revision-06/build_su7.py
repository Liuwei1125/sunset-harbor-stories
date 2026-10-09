"""Author an editable SU7 reference study and independent game-ready GLBs.

Blender -b --factory-startup --python build_su7.py -- --render
Only writes inside this directory. Does not alter the shipped game or Site.
Coordinates: Blender +Y forward, +Z up, meters; exported glTF -Z forward.
"""
import bpy
import bmesh
import math
import json
import hashlib
import sys
from pathlib import Path
from mathutils import Vector

OUT = Path(__file__).resolve().parent
TAU = math.tau
M = {}
PART = 'body'
MODEL = None
JOINTS = {}


def linear(v):
    return v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4


def material(name, color, metal=0, rough=.4, emit=0, transmission=0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    rgb = tuple(linear(int(color[i:i+2], 16)/255) for i in (0, 2, 4))
    m.diffuse_color = (*rgb, 1)
    n = m.node_tree.nodes.get('Principled BSDF')
    n.inputs['Base Color'].default_value = (*rgb, 1)
    n.inputs['Metallic'].default_value = metal
    n.inputs['Roughness'].default_value = rough
    n.inputs['Coat Weight'].default_value = .55 if metal > .3 else .12
    n.inputs['Coat Roughness'].default_value = .14
    n.inputs['Transmission Weight'].default_value = transmission
    if emit:
        n.inputs['Emission Color'].default_value = (*rgb, 1)
        n.inputs['Emission Strength'].default_value = emit
    return m


def materials():
    specs = {
        'paint': ('01 Capri blue / clear coat', '0672BD', .32, .27),
        'black': ('02 Piano black', '101820', .3, .24),
        'rubber': ('03 Tire compound', '191C20', 0, .83),
        'tread': ('04 Tire shoulder detail', '262A2E', 0, .85),
        'alloy': ('05 Diamond cut alloy', 'CAD2D8', .9, .25),
        'graphite': ('06 Graphite wheel insert', '252D35', .72, .28),
        'disc': ('07 Brake steel', '69727A', .84, .48),
        'caliper': ('08 Red brake caliper', 'C82028', .2, .29),
        'leather': ('09 Ceramic leather', 'C8C4B9', 0, .66),
        'seat': ('10 Seat center textile', '9A9B96', 0, .9),
        'stitch': ('11 Light seam', 'E1DED4', 0, .78),
        'carpet': ('12 Cabin carpet', '171F28', 0, 1),
        'dash': ('13 Soft black dashboard', '2E3033', 0, .68),
        'glass': ('14 Smoked glazing', '273E4E', .0, .10, 0, .74),
        'roofglass': ('15 Panoramic roof', '152634', .15, .22),
        'lens': ('16 Smoked light housing', '0B1520', .42, .14),
        'led': ('17 Daylight signature', 'EAF5FF', .1, .2, 3),
        'tail': ('18 Rear halo', 'E7182A', .12, .25, .8),
        'ambient': ('19 Cabin ambient', '4C8DFE', .0, .38, 1.4),
        'screen': ('20 Screen', '102333', .15, .3, .18),
        'white': ('21 Lettering', 'E8ECEA', .1, .45),
    }
    for k, v in specs.items():
        M[k] = material(*v)
    M['paint']['role'] = 'paint'
    M['paint'].node_tree.nodes.get('Principled BSDF').inputs['Coat Weight'].default_value=.20
    glass=M['glass'];shader=glass.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Transmission Weight'].default_value=0
    shader.inputs['Alpha'].default_value=.32
    glass.diffuse_color=(*glass.diffuse_color[:3],.32)
    glass.surface_render_method='DITHERED';glass.use_backface_culling=True
    M['tail']['role'] = 'brake'
    M['screen']['role'] = 'dashboard'


def register(o, mat, smooth=True):
    for c in list(o.users_collection):
        c.objects.unlink(o)
    MODEL.objects.link(o)
    o['partId'] = PART
    if mat:
        o.data.materials.append(M[mat])
    if o.type == 'MESH':
        for f in o.data.polygons:
            f.use_smooth = smooth
    return o


def mesh(name, vertices, faces, mat, smooth=True):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    bm = bmesh.new()
    bm.from_mesh(data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(data)
    bm.free()
    o = bpy.data.objects.new(name, data)
    MODEL.objects.link(o)
    o['partId'] = PART
    data.materials.append(M[mat])
    for f in data.polygons:
        f.use_smooth = smooth
    return o


def bevel(o, width=.015, segments=3):
    mod = o.modifiers.new('Editable soft edge', 'BEVEL')
    mod.width = width
    mod.segments = segments
    mod.limit_method = 'ANGLE'
    return o


def box(name, loc, size, mat, radius=.012):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = register(bpy.context.object, mat)
    o.name = name
    o.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if radius:
        bevel(o, radius)
        n = o.modifiers.new('Weighted surface normals', 'WEIGHTED_NORMAL')
        n.keep_sharp = True
    return o


def uv_sphere(name, loc, size, mat, segments=32, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=1, location=loc)
    o = register(bpy.context.object, mat)
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return o


def cylinder(name, loc, radius, depth, mat, axis=(1, 0, 0), segments=48):
    bpy.ops.mesh.primitive_cylinder_add(vertices=segments, radius=radius, depth=depth, location=loc)
    o = register(bpy.context.object, mat)
    o.name = name
    o.rotation_euler = Vector(axis).to_track_quat('Z', 'Y').to_euler()
    bevel(o, .002, 2)
    return o


def tube(name, points, radius, mat, cyclic=False, res=3):
    data = bpy.data.curves.new(name, 'CURVE')
    data.dimensions = '3D'
    data.resolution_u = 12
    data.bevel_depth = radius
    data.bevel_resolution = res
    s = data.splines.new('POLY')
    s.points.add(len(points)-1)
    for p, v in zip(s.points, points):
        p.co = (*v, 1)
    s.use_cyclic_u = cyclic
    o = bpy.data.objects.new(name, data)
    MODEL.objects.link(o)
    o['partId'] = PART
    data.materials.append(M[mat])
    return o


def interp(points, x):
    """Shape-preserving cubic Hermite interpolation for authored profiles."""
    if x <= points[0][0]:
        return points[0][1]
    if x >= points[-1][0]:
        return points[-1][1]
    for i in range(len(points)-1):
        x0, a = points[i]
        x1, b = points[i+1]
        if x0 <= x <= x1:
            d = (b-a)/(x1-x0)
            prev = (a-points[i-1][1])/(x0-points[i-1][0]) if i else d
            nxt = (points[i+2][1]-b)/(points[i+2][0]-x1) if i+2 < len(points) else d
            m0 = 0 if prev*d <= 0 else 2*prev*d/(prev+d)
            m1 = 0 if nxt*d <= 0 else 2*nxt*d/(nxt+d)
            t = (x-x0)/(x1-x0)
            return (2*t**3-3*t*t+1)*a+(t**3-2*t*t+t)*m0*(x1-x0)+(-2*t**3+3*t*t)*b+(t**3-t*t)*m1*(x1-x0)


WIDTH = [(-2.4985,.76),(-2.40,.89),(-2.1,.948),(-1.45,.9815),(-.6,.949),(.45,.942),(1.55,.972),(2.1,.91),(2.35,.845),(2.4985,.70)]
TOP = [(-2.4985,.78),(-2.35,.91),(-1.8,.96),(-1.2,.91),(-.3,.88),(.70,.91),(1.0,.88),(1.55,.85),(1.95,.78),(2.3,.675),(2.4985,.60)]
ROOF = [(-1.92,.94),(-1.60,1.08),(-1.2,1.27),(-.75,1.41),(-.3,1.445),(.1,1.39),(.42,1.25),(.72,1.06),(1.0,.88)]
RW = [(-1.92,.84),(-1.6,.80),(-1.2,.736),(-.75,.70),(-.3,.681),(.1,.69),(.42,.72),(.72,.775),(1.0,.845)]


def top_surface(x, y):
    w = interp(WIDTH, y)
    u = min(1, abs(x)/w)
    fender = .048*sum(math.exp(-((y-q)/.50)**2) for q in (-1.45,1.55))
    return interp(TOP, y) - .066*u*u + fender*math.exp(-((u-.78)/.23)**2)


SIDE_PROFILE=[(0,1),(.13,1),(.27,.999),(.44,.982),(.62,.964),(.79,.972),(.94,.93),(1,.87)]


def side_x(y, z):
    w=interp(WIDTH,y)
    x=w
    for _ in range(5):
        t=max(0,min(1,(top_surface(x,y)-z)/max(.1,top_surface(x,y)-.16)))
        for j in range(len(SIDE_PROFILE)-1):
            a,u=SIDE_PROFILE[j];b,v=SIDE_PROFILE[j+1]
            if a<=t<=b:
                x=w*(u+(v-u)*(t-a)/(b-a));break
    return x


def apply_modifier(o, mod):
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier=mod.name)


def subtract(o, cutter):
    for mod in list(cutter.modifiers):
        apply_modifier(cutter, mod)
    mod = o.modifiers.new('Wheel well / cabin opening', 'BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.solver = 'EXACT'
    mod.object = cutter
    apply_modifier(o, mod)
    bpy.data.objects.remove(cutter, do_unlink=True)


def body():
    # Cross-section travels clockwise from roofward center across both sills.
    cross = [(i/20, 0) for i in range(21)]
    cross += [(u,t) for t,u in SIDE_PROFILE[1:]]
    cross += [(a,1) for a in [.65,.35,0,-.35,-.65,-.87]]
    cross += [(-u,t) for t,u in reversed(SIDE_PROFILE[1:-1])]
    cross += [(-i/20,0) for i in range(20,0,-1)]
    vs=[]; fs=[]; steps=160; n=len(cross)
    for j in range(steps+1):
        y=-2.4985+4.997*j/steps
        w=interp(WIDTH,y)
        for u,t in cross:
            x=u*w
            z=top_surface(x,y)*(1-t)+.16*t
            vs.append((x,y,z))
    for j in range(steps):
        for i in range(n):
            a=j*n+i;b=j*n+(i+1)%n
            fs.append((a,b,b+n,a+n))
    fs += [tuple(range(n-1,-1,-1)),tuple(steps*n+i for i in range(n))]
    o=mesh('Sculpted continuous body shell',vs,fs,'paint')
    for side in [-1,1]:
        for y in [1.55,-1.45]:
            cut=cylinder('Wheel arch cutter',(side*.985,y,.355),.391,.62,'black',segments=96)
            subtract(o,cut)
    cut=box('Hollow cabin cutter',(0,-.30,1.40),(1.58,2.45,1.97),'black',.16)
    subtract(o,cut)
    bevel(o,.006,2)
    # Wheel-arch rolled hems follow genuine cutouts, with recessed liners.
    for side in [-1,1]:
        for y in [1.55,-1.45]:
            pts=[]; liner=[]
            for i in range(65):
                a=-.43+(math.pi+.86)*i/64
                yy=y+.393*math.cos(a);z=.355+.393*math.sin(a)
                pts.append((side*(side_x(yy,z)+.002),yy,z))
                liner.append((side*.80,yy,z))
            tube('Rolled painted wheel arch',pts,.012,'paint')
            tube('Recessed wheel well liner',liner,.028,'rubber',res=2)
        pts=[(side*side_x(y,.21),y,.19+.018*math.cos(y)) for y in [-1.04+i*2.2/40 for i in range(41)]]
        tube('Aero sill lower blade',pts,.045,'black')
        tube('Sill satin highlight',[(x,y,z+.05) for x,y,z in pts],.006,'graphite')
    box('Battery floor',(0,-.10,.225),(1.62,3.70,.13),'carpet',.055)
    # Hood shut lines and pressed creases follow the surface in 3D.
    for side in [-1,1]:
        for inset,mat,r in [(0,'black',.0025)]:
            pts=[]
            for i in range(61):
                y=.91+(2.31-.91)*i/60
                x=side*(.68-.19*(y-.91)/1.40+inset)
                pts.append((x,y,top_surface(x,y)+.002))
            tube('Bonnet seam' if not inset else 'Bonnet soft crease',pts,r,mat,res=2)
        # Door seams traced over the side panels.
        for coords in [[(.94,.85),(.91,.68),(.88,.43),(.84,.23)], [(-.22,.89),(-.25,.73),(-.28,.48),(-.31,.24)], [(-1.34,.91),(-1.36,.80),(-1.26,.65),(-1.14,.48),(-.99,.24)]]:
            pts=[]
            for j in range(len(coords)-1):
                for k in range(10):
                    t=k/10;y=coords[j][0]*(1-t)+coords[j+1][0]*t;z=coords[j][1]*(1-t)+coords[j+1][1]*t
                    pts.append((side*(side_x(y,z)+.006),y,z))
            tube('Door panel gap',pts,.0028,'black',res=2)
        for y in [.01,-1.03]:
            x=side*(side_x(y,.758)+.012)
            box('Flush handle recess',(x,y,.758),(.015,.235,.042),'black',.016)
            box('Flush painted door handle',(x+side*.009,y+.004,.765),(.014,.204,.024),'paint',.01)
        # Side camera / fender vent and charging flap.
        x=side*(side_x(1.08,.73)+.009)
        box('Front fender camera trim',(x,1.08,.73),(.024,.29,.075),'black',.025)
        cylinder('Fender camera lens',(x+side*.02,1.16,.73),.015,.01,'lens')
        pts=[(side*(side_x(y,z)+.008),y,z) for y,z in [(-1.96,.87),(-1.73,.87),(-1.73,.76),(-1.96,.76)]]
        tube('Charge port shut line',pts,.0025,'black',True,2)


def grid(name, func, nu, nv, mat):
    vs=[func(i/nu,j/nv) for j in range(nv+1) for i in range(nu+1)]
    fs=[]
    for j in range(nv):
        for i in range(nu):
            a=j*(nu+1)+i;fs.append((a,a+1,a+nu+2,a+nu+1))
    return mesh(name,vs,fs,mat)


def roofpoint(y,u):
    return (u*interp(RW,y),y,interp(ROOF,y)-.063*u*u)


def cabin_glass():
    for name,y0,y1,mat in [('Windscreen',.16,1.00,'glass'),('Panoramic glass roof',-1.13,.16,'roofglass'),('Fastback rear glass',-1.92,-1.13,'roofglass')]:
        grid(name,lambda u,v:roofpoint(y0+(y1-y0)*v,(u*2-1)*.995),32,30,mat)
    for side in [-1,1]:
        # Side glazing bounded by the descending fastback roof.
        grid('Side window glazing',lambda u,v:(side*((1-u)*.891+u*interp(RW,-1.72+2.56*v)), -1.72+2.56*v, (1-u)*(.877+.01*v)+u*(interp(ROOF,-1.72+2.56*v)-.068)),18,64,'glass')
        pts=[roofpoint(-1.87+2.86*i/90,side) for i in range(91)]
        tube('Painted roof rail / A and C pillars',pts,.023,'paint')
        tube('Window belt seal',[(side*.899,-1.74+i*2.60/70,.887) for i in range(71)],.012,'black')
        tube('Gloss B pillar',[(side*.894,-.29,.89), (side*.791,-.28,1.10), (side*.685,-.26,1.375)],.032,'black')
        # A broad rear sail panel gives the fastback its body-colored C pillar.
        def sail(u,v):
            x,y,z=roofpoint(-1.92+.70*v,side*(.82+.18*u))
            return (x,y,z+.009)
        grid('Rear sail pillar',sail,6,22,'paint')
        tube('Rear quarter window division',[(side*.887,-1.43,.89),(side*.790,-1.37,1.15)],.009,'black')
        # Exterior mirrors with a stalk, glossy cap, metal mirror surface.
        tube('Mirror stalk',[(side*.86,.77,.92),(side*1.02,.67,.96)],.027,'black')
        uv_sphere('Mirror blue cap',(side*1.04,.64,1.015),(.14,.105,.059),'paint')
        uv_sphere('Mirror underside',(side*1.04,.631,.989),(.142,.108,.035),'black')
        mirror=uv_sphere('Mirror reflecting face',(side*1.044,.537,1.018),(.105,.011,.040),'alloy')
        tube('Mirror turn indicator',[(side*(.95+.18*i/18),.700,1.006) for i in range(19)],.003,'led',res=2)
    lidar_z=interp(ROOF,.24)
    box('Roof lidar foot',(0,.24,lidar_z+.009),(.22,.14,.018),'black',.010)
    uv_sphere('Roof lidar housing',(0,.245,lidar_z+.024),(.104,.067,.025),'black')
    box('Lidar front glass',(0,.306,lidar_z+.023),(.152,.008,.021),'lens',.008)
    for x in [-.29,.30]:
        tube('Windscreen wiper',[(x-.19,.941,.916),(x+.20,.918,.931)],.006,'black',res=2)


def smooth_loop(points, steps=6):
    out=[];n=len(points)
    for i in range(n):
        a,b,c,d=[Vector(points[k%n]) for k in (i-1,i,i+1,i+2)]
        for j in range(steps):
            t=j/steps
            p=.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t**3)
            out.append(tuple(p))
    return out


def patch(name,points,mat,bulge=(0,0,0),project=None):
    edge=smooth_loop(points)
    c=sum((Vector(v) for v in edge),Vector())/len(edge)
    if project:
        n=len(edge);vs=[project(tuple(c))];fs=[]
        for ring in range(1,9):
            for p in edge:vs.append(project(tuple(c.lerp(Vector(p),ring/8))))
        for i in range(n):fs.append((0,1+i,1+(i+1)%n))
        for j in range(7):
            for i in range(n):
                a=1+j*n+i;b=1+j*n+(i+1)%n
                fs.append((a,b,b+n,a+n))
        return mesh(name,vs,fs,mat)
    vs=[tuple(c+Vector(bulge))]+edge
    return mesh(name,vs,[(0,i+1,(i+1)%len(edge)+1) for i in range(len(edge))],mat)


def face_y(x,z,sign):
    lo,hi=1.70,2.4985
    for _ in range(18):
        q=(lo+hi)/2;y=sign*q
        if abs(x)<=side_x(y,z) and z<=top_surface(x,y):lo=q
        else:hi=q
    return sign*(lo+.013)


def front_y(x,z=.4):
    return face_y(x,z,1)


def rear_y(x,z=.7):
    return face_y(x,z,-1)


def lights_bumpers():
    for side in [-1,1]:
        def hp(p,offset=.01):return(p[0],p[1],top_surface(p[0],p[1])+offset)
        pts=[hp((side*x,y,z)) for x,y,z in [(.405,2.437,.661),(.51,2.403,.642),(.805,2.260,.676),(.881,2.091,.789),(.803,2.119,.815),(.63,2.291,.753)]]
        patch('Waterdrop lamp black recess',pts,'lens',project=hp)
        tube('Waterdrop lamp rim',[hp(p) for p in smooth_loop(pts)],.004,'graphite',True,2)
        # Blade-shaped daytime light and tiny individual projectors.
        tube('White daytime blade',[hp((side*x,y,z),.019) for x,y,z in [(.436,2.43,.674),(.51,2.399,.681),(.64,2.33,.708),(.78,2.235,.746),(.84,2.183,.773)]],.006,'led')
        tube('Lower lamp return',[hp((side*x,y,z),.019) for x,y,z in [(.44,2.432,.667),(.58,2.375,.661),(.76,2.29,.693),(.832,2.205,.727)]],.003,'led',res=2)
        for x,y,z in [(.745,2.212,.77),(.79,2.17,.788)]:
            o=box('Headlamp projector',hp((side*x,y,z),.020),(.033,.041,.011),'alloy',.004)
            o.rotation_euler.x=.36
        # Vertical air curtain on each bumper corner.
        pts=[(side*x,front_y(x,z),z) for x,z in [(.79,.57),(.88,.59),(.88,.48),(.825,.34),(.80,.39)]]
        patch('Front vertical air curtain',pts,'rubber',project=lambda p:(p[0],front_y(p[0],p[2]),p[2]))
    # Main black grille spans the sculpted bumper below the blank EV nose.
    pts=[(x,front_y(x,z),z) for x,z in [(-.82,.205),(-.68,.40),(-.34,.438),(.34,.438),(.68,.40),(.82,.205),(.45,.176),(-.45,.176)]]
    patch('Front lower intake',pts,'rubber',project=lambda p:(p[0],front_y(p[0],p[2]),p[2]))
    tube('Front lower splitter',[(x,front_y(x,.18)+.004,.18) for x in [-.87+i*1.74/60 for i in range(61)]],.012,'graphite')
    for side in [-1,1]:
        pts=[(side*x,0,z) for x,z in [(.35,.21),(.39,.40),(.57,.402),(.74,.234)]]
        tube('Painted front intake surround',[(x,front_y(x,z)+.004,z) for x,y,z in smooth_loop(pts)],.011,'paint',True,2)
    for x in [-.31,-.15,.15,.31]:
        box('Intake louver',(x,front_y(x)+.008,.295),(.014,.032,.185),'graphite',.003)
    box('Front radar',(0,2.514,.30),(.225,.012,.18),'lens',.005)
    box('Front registration plate',(0,2.515,.52),(.39,.018,.098),'white',.009)
    text('SU7', (0,2.528,.500),.062,'black',normal=(0,1,0))
    # An unbroken loop with upswept outer shoulders forms the rear light signature.
    pts=[(x,rear_y(x,z),z) for x,z in [(-.90,.786),(-.80,.838),(-.57,.871),(-.44,.832),(.44,.832),(.57,.871),(.80,.838),(.90,.786),(.69,.757),(0,.752),(-.69,.757)]]
    patch('Full width smoked rear light',pts,'lens',project=lambda p:(p[0],rear_y(p[0],p[2]),p[2]))
    loop=[(x,0,z) for x,z in [(-.843,.790),(-.73,.822),(-.565,.841),(-.44,.803),(.44,.803),(.565,.841),(.73,.822),(.843,.790),(.64,.778),(0,.775),(-.64,.778)]]
    loop=[(x,rear_y(x,z)-.007,z) for x,y,z in smooth_loop(loop)]
    tube('Continuous red halo',loop,.006,'tail',True)
    tube('Rear halo inner trace',[(x,rear_y(x,z+.014)-.007,z+.014) for x,y,z in loop],.0022,'tail',True,2)
    # Raised ducktail / stowed active spoiler on its own pivot.
    global PART
    PART='spoiler'
    JOINTS[PART]={'pivot':(0,-2.24,.951),'motion':'spoiler'}
    grid('Active rear spoiler',lambda u,v:((u*2-1)*.80,-2.27-.14*v,top_surface((u*2-1)*.80,-2.27-.14*v)+.017+.018*v),32,5,'paint')
    PART='body'
    for side in [-1,1]:
        pts=[(side*x,rear_y(x)-.012,z) for x,z in [(.79,.65),(.86,.62),(.90,.43),(.84,.42)]]
        patch('Rear side air channel',pts,'black',project=lambda p:(p[0],rear_y(p[0],p[2]),p[2]))
    pts=[(x,rear_y(x)-.005,z) for x,z in [(-.88,.28),(-.77,.45),(-.60,.47),(-.37,.45),(.37,.45),(.60,.47),(.77,.45),(.88,.28),(.76,.16),(-.76,.16)]]
    patch('Rear diffuser dark inset',pts,'rubber',project=lambda p:(p[0],rear_y(p[0],p[2]),p[2]))
    for side in [-1,1]:
        pts=[(side*x,rear_y(x)-.024,z) for x,z in [(.40,.20),(.40,.36),(.53,.404),(.75,.367),(.81,.235)]]
        tube('Rear diffuser body arch',[(x,rear_y(x,z)-.003,z) for x,y,z in smooth_loop(pts)],.013,'paint',False)
        tube('Rear bumper red reflector',[(side*x,rear_y(x,.288)-.007,.288) for x in [.49,.57,.68]],.006,'tail',res=2)
    for x in [-.37,-.19,0,.19,.37]:
        box('Diffuser fin',(x,-2.32,.19),(.018,.29,.083),'graphite',.005)
    box('Rear registration plate',(0,-2.52,.365),(.39,.018,.1),'white',.007)
    text('SU7',(0,-2.535,.343),.064,'black',normal=(0,-1,0))
    text('x i a o m i',(0,rear_y(0,.892)-.004,.892),.035,'alloy',normal=(0,-1,0))


def text(value,loc,size,mat,normal=(0,-1,0)):
    data=bpy.data.curves.new('Lettering '+value,'FONT')
    data.body=value;data.align_x='CENTER';data.size=size;data.extrude=.0003;data.resolution_u=4
    o=bpy.data.objects.new('Lettering '+value,data)
    MODEL.objects.link(o);o.location=loc;o.rotation_euler=Vector(normal).to_track_quat('Z','Y').to_euler();o['partId']=PART
    data.materials.append(M[mat])
    return o


def lathe_tire(name,x,y):
    profile=[(-.108,.265),(-.131,.28),(-.133,.312),(-.123,.339),(-.104,.351),(-.085,.355),(-.065,.355),(-.061,.349),(-.055,.349),(-.051,.355),(-.012,.355),(-.009,.349),(-.003,.349),(.001,.355),(.044,.355),(.048,.349),(.054,.349),(.058,.355),(.085,.355),(.104,.351),(.123,.339),(.133,.312),(.131,.28),(.108,.265)]
    vs=[];fs=[];n=96
    for dx,r in profile:
        for i in range(n):
            a=i*TAU/n;vs.append((x+dx,y+math.sin(a)*r,.355+math.cos(a)*r))
    for j in range(len(profile)):
        for i in range(n):
            a=j*n+i;b=j*n+(i+1)%n;c=((j+1)%len(profile))*n
            fs.append((a,b,c+(i+1)%n,c+i))
    return mesh(name,vs,fs,'rubber')


def wheels():
    global PART
    for side in [-1,1]:
        for y,which in [(1.55,'front'),(-1.45,'rear')]:
            x=side*.841
            PART='wheel-'+which+('-left' if side<0 else '-right')
            JOINTS[PART]={'pivot':(x,y,.355),'motion':'wheel'}
            lathe_tire('Performance radial tire',x,y)
            # Rim barrel, machined lip and five split sculpted spokes.
            vs=[];fs=[]
            for dx,r in [(-.10,.250),(-.10,.265),(.12,.265),(.12,.250)]:
                for i in range(64):
                    a=i*TAU/64;vs.append((x+dx,y+math.sin(a)*r,.355+math.cos(a)*r))
            for j in range(4):
                for i in range(64):
                    fs.append((j*64+i,j*64+(i+1)%64,((j+1)%4)*64+(i+1)%64,((j+1)%4)*64+i))
            mesh('Open alloy rim barrel',vs,fs,'graphite')
            outside=x+side*.137
            for r,thick,mat in [(.256,.006,'alloy'),(.269,.002,'tread'),(.311,.002,'tread')]:
                tube('Rim or sidewall bead',[(outside-side*.004,y+math.sin(i*TAU/96)*r,.355+math.cos(i*TAU/96)*r) for i in range(96)],thick,mat,True,2)
            # Steel rotor sits behind the cut-open rim face, with little drilled marks.
            cylinder('Brake rotor',(x+side*.09,y,.355),.210,.015,'disc')
            for i in range(24):
                a=i*TAU/24
                cylinder('Rotor drilled mark',(x+side*.103,y+math.sin(a)*.182,.355+math.cos(a)*.182),.004,.001,'black',segments=6)
            for i in range(5):
                a=i*TAU/5+.12
                shape=[(.043,-.021),(.115,-.026),(.225,-.079),(.249,-.049),(.149,0),(.249,.049),(.225,.079),(.115,.026),(.043,.021)]
                for mat,scale,depth in [('alloy',1,.002),('graphite',.55,.006)]:
                    pts=[]
                    for r,t in shape:
                        t*=scale
                        pts.append((outside+side*depth,y+math.sin(a)*r+math.cos(a)*t,.355+math.cos(a)*r-math.sin(a)*t))
                    o=mesh('Machined split spoke' if mat=='alloy' else 'Recessed spoke center',pts,[tuple(range(len(pts)))],mat,False)
                    sol=o.modifiers.new('Spoke thickness','SOLIDIFY');sol.thickness=.009
                    bevel(o,.002,2)
                cylinder('Wheel lug',(outside+side*.004,y+math.sin(a)*.044,.355+math.cos(a)*.044),.009,.01,'black',segments=10)
            cylinder('Center hub',(outside+side*.009,y,.355),.028,.012,'alloy')
            text('mi',(outside+side*.017,y,.346),.024,'black',normal=(side,0,0))
            # Small shoulder siping is geometry, with no photo texture dependency.
            for i in range(60):
                a=i*TAU/60
                tube('Tire shoulder sipe',[(x+side*dx,y+math.sin(a+.035*k)*r,.355+math.cos(a+.035*k)*r) for k,(dx,r) in enumerate([(.115,.344),(.094,.353)])],.0015,'black',res=0)
            PART='body'
            box('Fixed brake caliper',(x+side*.105,y-.143,.414),(.064,.085,.205),'caliper',.025)
    PART='body'


def interior():
    global PART
    PART='interior'
    JOINTS[PART]={'pivot':(0,0,0),'motion':'static'}
    box('Carpeted cabin',(0,-.28,.36),(1.55,2.45,.06),'carpet',.08)
    for side in [-1,1]:
        x=side*.46
        seat=box('Front seat cushion',(x,-.28,.46),(.55,.58,.16),'leather',.075)
        box('Seat textile cushion insert',(x,-.28,.549),(.34,.43,.018),'seat',.035)
        back=box('Front seat back',(x,-.61,.81),(.55,.19,.67),'leather',.085)
        back.rotation_euler.x=-.10
        insert=box('Seat textile backrest insert',(x,-.491,.81),(.34,.024,.43),'seat',.035);insert.rotation_euler.x=-.10
        box('Headrest',(x,-.64,1.18),(.33,.20,.22),'leather',.07)
        for dx in [-.225,.225]:
            tube('Seat raised stitched bolster',[(x+dx,-.02,.55),(x+dx,-.46,.58),(x+dx,-.47,.94)],.015,'leather')
        for dx in [-.14,.14]:
            tube('Seat seam',[(x+dx,-.475,.63),(x+dx,-.49,.96)],.0015,'stitch',res=1)
        for i in range(6):
            tube('Seat cushion stitch',[(x-.15,-.1-i*.056,.561),(x+.15,-.1-i*.056,.561)],.0012,'stitch',res=1)
        box('Rear seat cushion',(side*.44,-1.20,.48),(.65,.42,.14),'leather',.06)
        rear=box('Rear seat backrest',(side*.44,-1.45,.74),(.65,.17,.47),'leather',.06);rear.rotation_euler.x=-.15
        box('Rear headrest',(side*.46,-1.40,.967),(.29,.16,.16),'leather',.05)
        box('Door interior lower',(side*.813,-.18,.60),(.07,1.83,.45),'leather',.025)
        box('Door padded upper',(side*.824,-.18,.82),(.065,1.84,.105),'dash',.025)
        tube('Door ambient light',[(side*.785,y,.808) for y in [-1.05,-.65,-.1,.5,.74]],.003,'ambient',res=2)
        box('Door arm rest',(side*.772,-.05,.61),(.12,.48,.08),'leather',.025)
        tube('Door grab handle',[(side*.747,.14,.63),(side*.747,.39,.76)],.025,'leather')
        box('Door release',(side*.772,.42,.752),(.015,.09,.025),'alloy',.006)
    box('Sculpted upper dashboard',(0,.71,.79),(1.59,.36,.21),'dash',.077)
    box('Ceramic lower dashboard',(0,.65,.65),(1.50,.25,.15),'leather',.045)
    tube('Dashboard ambient light',[(x,.510,.826+.01*math.cos(x*2)) for x in [-.76+i*1.52/60 for i in range(61)]],.004,'ambient')
    tube('Dashboard metal trim',[(x,.503,.714) for x in [-.74+i*1.48/50 for i in range(51)]],.003,'alloy',res=2)
    for x in [-.67,.61]:
        box('Dashboard vent',(x,.510,.773),(.20,.025,.033),'black',.008)
        for i in range(4):
            box('Vent blade',(x-.075+i*.05,.492,.773),(.003,.012,.02),'alloy',.001)
    box('Center console',(0,-.05,.46),(.29,.98,.25),'leather',.045)
    box('Armrest',(0,-.40,.615),(.285,.32,.07),'leather',.035)
    box('Wireless phone pad',(0,.15,.59),(.24,.23,.025),'graphite',.025)
    for x in [-.073,.073]:
        cylinder('Cupholder',(x,-.10,.602),.058,.012,'black',axis=(0,0,1),segments=32)
        tube('Cupholder metal surround',[(x+.06*math.cos(i*TAU/40),-.10+.06*math.sin(i*TAU/40),.612) for i in range(40)],.003,'alloy',True,2)
    screen=box('Floating display bezel',(.07,.493,.929),(.407,.025,.247),'black',.009)
    box('Center display glass',(.07,.475,.929),(.387,.009,.225),'screen',.006)
    text('08:16',(-.04,.466,1.009),.021,'white')
    text('HARBOR DRIVE',(.07,.465,.848),.011,'white')
    # A small stylized map, authored as geometry rather than a third-party UI image.
    for i in range(6):
        x=-.10+i*.06
        tube('Display map street',[(x,.465,.878),(x+.03,.465,.99)],.0008,'graphite',res=0)
    for i in range(4):
        z=.89+i*.025
        tube('Display map avenue',[(-.09,.464,z),(.23,.464,z+.016)],.0008,'graphite',res=0)
    tube('Display blue route',[(-.06,.462,.883),(.03,.462,.923),(.13,.462,.923),(.18,.462,.985)],.002,'ambient',res=1)
    box('Driver instrument binnacle',(-.43,.53,.863),(.268,.09,.083),'black',.018)
    text('P   00',(-.43,.479,.858),.028,'white')
    cylinder('Steering column',(-.43,.405,.735),.045,.23,'dash',axis=(0,1,.25))
    PART='steering'
    pivot=(-.43,.286,.808)
    JOINTS[PART]={'pivot':pivot,'motion':'steering'}
    pts=[]
    for i in range(81):
        a=i*TAU/80;xx=.171*math.sin(a);zz=max(-.144,.171*math.cos(a))
        pts.append((pivot[0]+xx,pivot[1]+zz*.26,pivot[2]+zz))
    tube('Flat bottom leather steering rim',pts,.019,'leather',True)
    for side in [-1,1]:
        tube('Steering horizontal spoke',[(-.43+side*.045,.283,.80),(-.43+side*.149,.287,.804)],.025,'leather')
        box('Wheel switch pack',(-.43+side*.11,.261,.808),(.047,.022,.026),'graphite',.008)
        cylinder('Wheel function button',(-.43+side*.08,.251,.747),.016,.011,'alloy',axis=(0,-1,0),segments=24)
    tube('Lower steering spoke',[(-.43,.28,.784),(-.43,.250,.667)],.017,'alloy')
    uv_sphere('Steering airbag',(-.43,.260,.802),(.077,.039,.081),'leather')
    text('xiaomi',(-.43,.219,.803),.015,'alloy')
    PART='interior'
    for side in [-1,1]:
        tube('Interior A pillar',[(side*.824,.86,.90),(side*.72,.46,1.18),(side*.679,.15,1.335)],.024,'leather')
    # Pedals and rear-view mirror remain visible in cockpit / cutaway views.
    for x,w in [(-.48,.095),(-.30,.055)]:
        box('Pedal',(x,.53,.405),(w,.105,.015),'alloy',.008)
    box('Interior rear-view mirror',(0,.45,1.154),(.224,.053,.065),'black',.022)
    box('Interior mirror surface',(0,.417,1.154),(.195,.006,.043),'alloy',.015)
    PART='body'


def export_game(version='0.1', preserve_surface_normals=False):
    """Evaluate editable parts and consolidate meshes by articulation."""
    if preserve_surface_normals:
        import export_su7
        return export_su7.export_game(sys.modules[__name__], version)
    depsgraph=bpy.context.evaluated_depsgraph_get()
    export_collection=bpy.data.collections.new('EXPORT / optimized game mesh')
    bpy.context.scene.collection.children.link(export_collection)
    root=bpy.data.objects.new('xiaomi-su7-study',None)
    export_collection.objects.link(root)
    root['assetId']='xiaomi-su7-study'
    root['version']=version
    source_objects=list(MODEL.objects)
    groups={}
    for o in source_objects:
        if o.type not in {'MESH','CURVE','FONT'}:
            continue
        ev=o.evaluated_get(depsgraph)
        data=bpy.data.meshes.new_from_object(ev,preserve_all_data_layers=True,depsgraph=depsgraph)
        data.transform(o.matrix_world)
        dup=bpy.data.objects.new(o.name+' / game',data)
        export_collection.objects.link(dup)
        groups.setdefault(o.get('partId','body'),[]).append(dup)
    game=[]
    for part,objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        if len(objects)>1:bpy.ops.object.join()
        o=bpy.context.object;o.name='geometry:'+part
        pivot=JOINTS.get(part,{}).get('pivot',(0,0,0))
        from mathutils import Matrix
        o.data.transform(Matrix.Translation(-Vector(pivot)))
        joint=bpy.data.objects.new('joint:'+part,None)
        export_collection.objects.link(joint)
        joint.parent=root;joint.location=pivot;joint['partId']=part
        joint['motion']=JOINTS.get(part,{}).get('motion','static')
        o.parent=joint;o.location=(0,0,0)
        density=o.modifiers.new('Game tessellation budget','DECIMATE');density.ratio=.50
        density.use_collapse_triangulate=True
        game.append(o)
    for o in source_objects:o.hide_set(True);o.hide_render=True
    files=[]
    for lod in ['high','low']:
        if lod=='low':
            for o in game:
                mod=o.modifiers.new('LOD reduction','DECIMATE');mod.ratio=.28
                mod.use_collapse_triangulate=True
        bpy.ops.object.select_all(action='DESELECT')
        for o in export_collection.objects:o.select_set(True)
        filename='xiaomi-su7.'+lod+'.glb'
        bpy.ops.export_scene.gltf(filepath=str(OUT/filename),export_format='GLB',use_selection=True,export_apply=True,export_extras=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False,export_materials='EXPORT')
        files.append({'lod':lod,'file':filename,'bytes':(OUT/filename).stat().st_size,'sha256':hashlib.sha256((OUT/filename).read_bytes()).hexdigest()})
    for o in list(export_collection.objects):bpy.data.objects.remove(o,do_unlink=True)
    bpy.data.collections.remove(export_collection)
    for o in source_objects:o.hide_set(False);o.hide_render=False
    info={'assetId':'xiaomi-su7-study','version':'0.1','status':'Independent visual reference study; not integrated into the shipped racing game.','referenceModel':'2026 SU7 Max exterior / ceramic interior, visual approximation','coordinates':'meters; Y up; -Z forward in GLB','nominalDimensionsMeters':{'length':4.997,'bodyWidth':1.963,'roofHeight':1.445,'wheelbase':3.0},'joints':{k:{'pivot':[v['pivot'][0],v['pivot'][2],-v['pivot'][1]],'motion':v['motion']} for k,v in JOINTS.items()},'cameraSockets':{'cockpit':[-.43,1.12,.36]},'files':files,'photoTexturesUsed':False,'officialReference':'https://www.xiaomiev.com/su7'}
    info['version']=version
    (OUT/'manifest.json').write_text(json.dumps(info,ensure_ascii=False,indent=2)+'\n')
    return info


def studio():
    scene=bpy.context.scene
    scene.render.engine='CYCLES'
    scene.cycles.samples=40
    scene.cycles.use_denoising=True
    scene.cycles.max_bounces=8
    scene.cycles.transparent_max_bounces=8
    scene.render.resolution_x=1600;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    scene.view_settings.view_transform='AgX'
    scene.view_settings.exposure=-.7
    if scene.world is None:
        scene.world=bpy.data.worlds.new('STUDIO world')
    scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.20,.25,.32,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.45
    floor_mat=material('STUDIO warm pearl','B7B8B7',.05,.49)
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.015))
    floor=bpy.context.object;floor.name='STUDIO / seamless floor';floor.data.materials.append(floor_mat)
    def light(name,loc,power,color,size,size_y=None):
        data=bpy.data.lights.new(name,'AREA');data.energy=power;data.color=color;data.shape='RECTANGLE';data.size=size;data.size_y=size_y or size
        o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,.55))-o.location).to_track_quat('-Z','Y').to_euler()
    light('STUDIO / broad front softbox',(-4,4,6),1500,(.83,.92,1),5,3)
    light('STUDIO / roof ribbon',(1,-1,6),1800,(1,.97,.91),2,6)
    light('STUDIO / side strip',(4,1,3),1250,(.74,.87,1),2,5)
    light('STUDIO / rear edge',(-2,-4,3),1700,(1,.94,.83),4,2)
    data=bpy.data.cameras.new('STUDIO / camera');camera=bpy.data.objects.new('STUDIO / camera',data);scene.collection.objects.link(camera);scene.camera=camera
    data.lens=54;data.clip_start=.01;data.clip_end=300
    return camera


def rig_editable_source():
    """The saved .blend exposes the same meaningful pivots as the GLBs."""
    from mathutils import Matrix
    objects=list(MODEL.objects)
    for part,description in JOINTS.items():
        joint=bpy.data.objects.new('RIG / '+part,None)
        MODEL.objects.link(joint);joint.location=description['pivot'];joint.empty_display_size=.10
        joint['partId']=part;joint['motion']=description['motion']
        for o in objects:
            if o.get('partId')==part:
                matrix=o.matrix_world.copy();o.parent=joint
                o.matrix_parent_inverse=Matrix.Translation(-Vector(description['pivot']))
                o.matrix_basis=matrix


VIEWS={
    'front':{'eye':(-6.9,8.4,3.65),'target':(0,.06,.70),'lens':57},
    'rear':{'eye':(6.8,-8.2,3.35),'target':(0,-.08,.75),'lens':57},
    'side':{'eye':(-9,0,1.15),'target':(0,0,.73),'lens':55,'ortho':6.25},
    'cockpit':{'eye':(-.38,-.46,1.125),'target':(-.04,.78,.83),'lens':18},
}


def position_camera(camera,view):
    camera.location=view['eye']
    camera.rotation_euler=(Vector(view['target'])-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.lens=view['lens']
    if view.get('ortho'):
        camera.data.type='ORTHO';camera.data.ortho_scale=view['ortho']
    else:camera.data.type='PERSP'


def main():
    global MODEL,JOINTS
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system='METRIC'
    MODEL=bpy.data.collections.new('SU7 / editable components')
    bpy.context.scene.collection.children.link(MODEL)
    JOINTS={'body':{'pivot':(0,0,0),'motion':'static'}}
    materials();body();cabin_glass();lights_bumpers();wheels();interior()
    print('AUTHORING COMPLETE',len(MODEL.objects),flush=True)
    export_game();rig_editable_source()
    camera=studio();position_camera(camera,VIEWS['front'])
    # Open the .blend in a composed material-preview camera view.
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':
                area.spaces.active.region_3d.view_perspective='CAMERA'
                area.spaces.active.shading.type='MATERIAL'
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'xiaomi-su7.blend'))
    if '--render' in sys.argv:
        (OUT/'renders').mkdir(exist_ok=True)
        requested=sys.argv[sys.argv.index('--views')+1].split(',') if '--views' in sys.argv else list(VIEWS)
        for name in requested:
            position_camera(camera,VIEWS[name])
            bpy.context.scene.render.filepath=str(OUT/'renders'/(name+'.png'))
            print('RENDER',name,flush=True)
            bpy.ops.render.render(write_still=True)
    print('SU7 BUILD COMPLETE',flush=True)


if __name__=='__main__':main()
