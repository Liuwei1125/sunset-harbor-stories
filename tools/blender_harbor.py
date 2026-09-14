"""Author and export the original Harbor Workshop model pack with Blender.

  Blender --background --python tools/blender_harbor.py
  Blender art/harbor-workshop.blend --background --python tools/blender_harbor.py -- --export-only

Game coordinates are meters, Y up, -Z forward. Blender uses (x, -z, y).
Mesh objects, materials, bevels, logical moving parts and editable scenes are kept
in the .blend. The runtime uses quantized indexed geometry, not image impostors.
"""
import bpy
import math
import json
import struct
import base64
import hashlib
import sys
from pathlib import Path
from collections import defaultdict
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'blender'
ART = ROOT / 'art'
OUT.mkdir(parents=True, exist_ok=True)
ART.mkdir(exist_ok=True)
PI = math.pi
CURRENT = None
PART = 'body'
DETAIL = False
PIVOTS = {}


def bv(p): return Vector((p[0], -p[2], p[1]))
def gv(p): return (p[0], p[2], -p[1])
def linear(x): return x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4
def srgb(x): return x * 12.92 if x <= .0031308 else 1.055 * max(x, 0) ** (1 / 2.4) - .055


def mat(name, hexcolor, rough=.5, metal=0, emission=False, role=''):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    rgb = [linear(int(hexcolor[i:i+2], 16) / 255) for i in (0, 2, 4)]
    m.diffuse_color = (*rgb, 1)
    n = m.node_tree.nodes.get('Principled BSDF')
    n.inputs['Base Color'].default_value = (*rgb, 1)
    n.inputs['Roughness'].default_value = rough
    n.inputs['Metallic'].default_value = metal
    if emission:
        n.inputs['Emission Color'].default_value = (*rgb, 1)
        n.inputs['Emission Strength'].default_value = 2
    m['role'] = role
    m['unlit'] = emission
    return m


def materials():
    global M
    M = {
        'paint': mat('01 • Saffron enamel', 'D79048', .28, .32, role='paint'),
        'ivory': mat('02 • Warm porcelain', 'ECE4CE', .34, .12),
        'teal': mat('03 • Harbor petrol', '32616A', .4, .38),
        'black': mat('04 • Recess / charcoal', '19262B', .73, .02),
        'rubber': mat('05 • Vulcanized rubber', '252B2E', .91, 0),
        'alloy': mat('06 • Brushed aluminum', 'AABFC1', .26, .8),
        'steel': mat('07 • Oxidized steel', '52666B', .58, .65),
        'glass': mat('08 • Smoke blue glass', '284958', .12, .25),
        'wood': mat('09 • Oiled oak', 'AA7B4F', .85, 0),
        'woodLight': mat('10 • End grain', 'C69B68', .88, 0),
        'rope': mat('11 • Coir rope', 'A89973', .95, 0),
        'light': mat('12 • Warm LED', 'FFF0BD', .23, .1, True),
        'red': mat('13 • Signal red', 'BE4E3C', .42, .1),
        'tail': mat('14 • Tail lamp', 'F05D42', .24, .1, True, 'brake'),
        'screen': mat('15 • Phosphor screen', '85D9BB', .18, .1, True, 'status'),
        'seat': mat('16 • Saddle upholstery', 'A36640', .87, 0),
    }


def asset(name, label):
    global CURRENT, PART, DETAIL, PIVOTS
    s = bpy.data.scenes.new(name)
    c = bpy.data.collections.new(name)
    c['asset_id'] = name
    c['label'] = label
    s.collection.children.link(c)
    bpy.context.window.scene = s
    CURRENT = c
    PART, DETAIL, PIVOTS = 'body', False, {}
    s.unit_settings.system = 'METRIC'
    return c


def joint(name='body', pivot=(0, 0, 0), motion=''):
    global PART
    PART = name
    PIVOTS[name] = {'pivot': list(pivot), 'motion': motion}


def finish_asset(): CURRENT['joints'] = json.dumps(PIVOTS)


def tag(o, material, smooth=False, bevel=0):
    for c in list(o.users_collection): c.objects.unlink(o)
    CURRENT.objects.link(o)
    o['part_id'] = PART
    o['detail'] = DETAIL
    o.data.materials.append(M[material])
    if smooth:
        for f in o.data.polygons: f.use_smooth = True
    if bevel:
        mod = o.modifiers.new('Light-catching edge radius', 'BEVEL')
        mod.width = bevel
        mod.segments = 2 if CURRENT.get('asset_id') in ('comet-sport','trail-jeep','osprey-heli','stingray-boat') else 1
        mod.limit_method = 'ANGLE'
        mod.harden_normals = True
        normal = o.modifiers.new('Weighted panel normals', 'WEIGHTED_NORMAL')
        normal.keep_sharp = True
        normal.weight = 40
    return o


def mesh(name, points, faces, material='paint', smooth=False, bevel=0):
    d = bpy.data.meshes.new(name)
    d.from_pydata([bv(p) for p in points], [], faces)
    d.update()
    o = bpy.data.objects.new(name, d)
    CURRENT.objects.link(o)
    return tag(o, material, smooth, bevel)


def box(name, p, size, material='paint', bevel=.025, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=bv(p))
    o = bpy.context.object
    o.name = name
    o.scale = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.rotation_euler = (rot[0], -rot[2], rot[1])
    return tag(o, material, bevel=bevel)


def cyl(name, p, r, depth, material='steel', axis=(0, 1, 0), n=20, bevel=.01):
    bpy.ops.mesh.primitive_cylinder_add(vertices=n, radius=r, depth=depth, location=bv(p))
    o = bpy.context.object
    o.name = name
    o.rotation_euler = bv(axis).to_track_quat('Z', 'Y').to_euler()
    return tag(o, material, True, bevel)


def beam(name, a, b, radius=.025, material='steel', n=10):
    d = Vector(b) - Vector(a)
    return cyl(name, (Vector(a) + Vector(b)) / 2, radius, d.length, material, d, n, 0)


def tube(name, points, radius=.025, material='steel', n=8):
    # Joined swept tube, including rounded bends, with a stable local frame.
    verts, faces = [], []
    for i, p in enumerate(points):
        tangent = (Vector(points[min(i+1, len(points)-1)]) - Vector(points[max(0, i-1)])).normalized()
        side = tangent.cross(Vector((0, 1, .001))).normalized()
        up = tangent.cross(side).normalized()
        for j in range(n): verts.append(Vector(p) + radius * (side * math.cos(j*2*PI/n) + up*math.sin(j*2*PI/n)))
    for i in range(len(points)-1):
        for j in range(n):
            a, b = i*n+j, i*n+(j+1)%n
            faces.append((a, b, b+n, a+n))
    faces += [tuple(reversed(range(n))), tuple(range((len(points)-1)*n, len(points)*n))]
    return mesh(name, verts, faces, material, True)


def torus(name, p, radius, tube_radius, material='rubber', axis=(0,1,0), major=28, minor=8):
    bpy.ops.mesh.primitive_torus_add(major_radius=radius, minor_radius=tube_radius, major_segments=major, minor_segments=minor, location=bv(p))
    o = bpy.context.object
    o.name = name
    o.rotation_euler = bv(axis).to_track_quat('Z', 'Y').to_euler()
    return tag(o, material, True)


def poly_panel(name, pts, material='paint', thick=.02, bevel=.012):
    v = [Vector(p) for p in pts]
    normal = (v[1]-v[0]).cross(v[2]-v[0]).normalized()
    # Front surfaces must face away from the model, including in the CPU renderer.
    # Blender's two-sided studio rendering otherwise conceals reversed panels.
    if normal.dot(sum(v,Vector())/len(v)) < 0:
        v.reverse();normal.negate()
    n = len(v)
    faces = [tuple(range(n)), tuple(reversed(range(n, n*2)))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return mesh(name, v + [p-normal*thick for p in v], faces, material, False, bevel)


def loft(name, sections, material='paint', n=24, smooth=True):
    # Cross sections: z, half width, half height, center height.
    v, faces = [], []
    for z,w,h,y in sections:
        for j in range(n):
            a = j*2*PI/n
            v.append((math.sin(a)*w, y+math.cos(a)*h, z))
    for i in range(len(sections)-1):
        for j in range(n):
            a,b = i*n+j, i*n+(j+1)%n
            faces.append((a,a+n,b+n,b))
    faces += [tuple(range(n)), tuple(reversed(range((len(sections)-1)*n,len(sections)*n)))]
    return mesh(name,v,faces,material,smooth)


def text_mesh(text, p, size=.18, material='ivory', facing='front'):
    bpy.ops.object.text_add(location=bv(p))
    o = bpy.context.object
    o.name = 'Stencil ' + text
    o.data.body = text
    o.data.size = size
    o.data.extrude = .0004
    o.data.align_x = 'CENTER'
    # Local text +X right, +Y up; plane points toward game +Z by default.
    o.rotation_euler = (PI/2, 0, PI if facing=='front' else 0)
    if facing=='side': o.rotation_euler = (PI/2,0,PI/2)
    bpy.ops.object.convert(target='MESH')
    return tag(bpy.context.object, material)


def wheel(p, radius=.40, width=.27, offroad=False):
    global DETAIL
    x,y,z = p
    # Radial profile creates a rounded tire shoulder instead of a cylinder.
    v, faces = [], []
    profile = [(-width*.5,.69),(-width*.56,.82),(-width*.45,.95),(-width*.30,1),(width*.30,1),(width*.45,.95),(width*.56,.82),(width*.5,.69)]
    n=32 if not offroad else 24
    for px,r in profile:
        for j in range(n):
            a=j*2*PI/n
            v.append((x+px,y+math.cos(a)*r*radius,z+math.sin(a)*r*radius))
    for i in range(len(profile)-1):
        for j in range(n):
            a,b=i*n+j,i*n+(j+1)%n
            faces.append((a,b,b+n,a+n))
    mesh('Rounded tire carcass',v,faces,'rubber',True)
    cyl('Alloy barrel',p,radius*.72,width*.99,'alloy',(1,0,0),24)
    for side in (-1,1):
        xx=x+side*width*.52
        cyl('Brake recess',(xx,y,z),radius*.58,.016,'black',(1,0,0),24,0)
        torus('Machined rim lip',(xx,y,z),radius*.65,.014,'alloy',(1,0,0),24,5)
        for j in range(6):
            a=j*2*PI/6
            beam('Cast spoke',(xx+side*.016,y+math.cos(a)*radius*.13,z+math.sin(a)*radius*.13),(xx+side*.016,y+math.cos(a+.12)*radius*.60,z+math.sin(a+.12)*radius*.60),.030 if not offroad else .042,'alloy',6)
        cyl('Center lock',(xx+side*.02,y,z),radius*.17,.028,'steel',(1,0,0),12)
    DETAIL=True
    for j in range(24):
        a=j*2*PI/24
        if offroad:
            box('Raised all terrain tread',(x,y+math.cos(a)*radius,z+math.sin(a)*radius),(.31,.038,.105),'rubber',.008,rot=(a,0,0))
        elif j%2==0:
            beam('Tread siping',(x-.06,y+math.cos(a)*radius*1.002,z+math.sin(a)*radius*1.002),(x+.06,y+math.cos(a+.04)*radius*1.002,z+math.sin(a+.04)*radius*1.002),.006,'black',4)
    DETAIL=False


def car(offroad=False):
    global DETAIL
    asset('trail-jeep' if offroad else 'comet-sport','TRAIL / UTILITY 04' if offroad else 'COMET / GT 02')
    joint()
    if offroad:
        box('Ladder chassis',(0,.54,0),(1.95,.27,4.18),'black',.09)
        box('Body shell',(0,1.01,0),(2.02,.76,4.10),'paint',.14)
        box('Short sculpted hood',(0,1.43,-1.46),(1.80,.25,1.25),'paint',.1)
        box('Cabin',(0,1.68,.42),(1.83,1.07,2.27),'black',.12)
        box('Hardtop',(0,2.21,.40),(1.97,.17,2.58),'teal',.07)
        poly_panel('Windshield',[(-.83,1.52,-.79),(.83,1.52,-.79),(.77,2.10,-.63),(-.77,2.10,-.63)],'glass')
        box('Rear glass',(0,1.81,1.568),(1.51,.51,.035),'glass',.025)
        for s in (-1,1):
            poly_panel('Rear quarter glass',[(s*.928,1.54,.64),(s*.928,1.54,1.39),(s*.86,2.08,1.39),(s*.86,2.08,.64)],'glass')
            beam('Roof rail',(s*.66,2.37,-.74),(s*.66,2.37,1.38),.043,'steel')
            for z in (-1.37,1.37):
                # Squared wheel arches and flared lips.
                tube('Fender flare',[(s*1.03,.7,z-.6),(s*1.08,1.14,z-.55),(s*1.08,1.31,z-.34),(s*1.08,1.31,z+.34),(s*1.08,1.14,z+.55),(s*1.03,.7,z+.6)],.09,'black',6)
            box('Running board',(s*1.07,.47,.08),(.22,.14,1.75),'steel',.045)
            box('Door sill',(s*1.02,.72,.10),(.11,.10,1.75),'teal',.025)
        box('Front bull bumper',(0,.66,-2.15),(2.12,.3,.36),'black',.065)
        box('Rear utility bumper',(0,.65,2.16),(2.10,.3,.31),'black',.065)
        box('Grille inset',(0,1.15,-2.09),(.97,.49,.05),'black')
        for i in range(7): box('Seven grille slots',((i-3)*.13,1.15,-2.132),(.045,.36,.026),'alloy',.012)
        for s in (-1,1):
            cyl('Round headlamp bezel',(s*.69,1.28,-2.08),.20,.10,'steel',(0,0,1),24)
            cyl('Round LED',(s*.69,1.28,-2.145),.153,.015,'light',(0,0,1),24,0)
            box('Tail lens',(s*.8,1.23,2.085),(.22,.36,.075),'tail',.045)
            beam('Tow hook',(s*.60,.61,-2.35),(s*.6,.74,-2.35),.048,'red')
        cyl('Spare tire',(0,1.34,2.20),.44,.29,'rubber',(0,0,1),24,.03)
        cyl('Spare alloy',(0,1.34,2.36),.29,.025,'alloy',(0,0,1),20)
        for z in (-.65,0,.65,1.30): box('Roof rack slat',(0,2.34,z),(1.55,.065,.07),'steel')
        radius,wy,wx=.48,.49,1.035
    else:
        # Carefully shaped shoulder and belt line; lower silhouette than the old box chassis.
        rings=[(-2.23,.87,.50,.76),(-2.08,1.01,.40,.90),(-1.52,1.07,.36,1.0),(-.83,1.02,.35,1.00),(.72,1.03,.35,1.02),(1.5,1.08,.38,1.02),(2.08,1.01,.46,.90),(2.24,.91,.52,.84)]
        pts=[]
        for z,w,lo,hi in rings:
            pts += [(-w*.88,lo,z),(-w,lo+.14,z),(-w,hi-.12,z),(-w*.88,hi,z),(w*.88,hi,z),(w,hi-.12,z),(w,lo+.14,z),(w*.88,lo,z)]
        faces=[]
        for i in range(len(rings)-1):
            for j in range(8): faces.append((i*8+j,i*8+(j+1)%8,(i+1)*8+(j+1)%8,(i+1)*8+j))
        faces += [tuple(reversed(range(8))),tuple(range(56,64))]
        mesh('Sculpted monocoque',pts,[tuple(reversed(f)) for f in faces],'paint',False,.048)
        box('Flat undertray',(0,.37,0),(1.90,.12,4.05),'black',.055)
        poly_panel('Hood inset',[(-.80,1.015,-1.99),(.80,1.015,-1.99),(.77,1.045,-.88),(-.77,1.045,-.88)],'paint',.025,.015)
        poly_panel('Windshield gasket',[(-.88,1.035,-.92),(.88,1.035,-.92),(.70,1.48,-.32),(-.70,1.48,-.32)],'black',.025)
        poly_panel('Swept windshield',[(-.81,1.070,-.894),(.81,1.070,-.894),(.655,1.46,-.366),(-.655,1.46,-.366)],'glass',.012)
        poly_panel('Fastback gasket',[(-.70,1.49,.53),(.70,1.49,.53),(.88,1.07,1.41),(-.88,1.07,1.41)],'black')
        poly_panel('Fastback glass',[(-.64,1.472,.59),(.64,1.472,.59),(.81,1.092,1.34),(-.81,1.092,1.34)],'glass')
        box('Floating roof',(0,1.496,.13),(1.44,.08,.9),'teal',.045)
        for s in (-1,1):
            beam('A pillar',(s*.86,1.05,-.9),(s*.70,1.47,-.32),.034,'paint')
            beam('C pillar',(s*.71,1.47,.55),(s*.90,1.06,1.42),.056,'paint')
            box('Side sill',(s*1.02,.42,.04),(.13,.13,2.0),'teal',.028)
            box('Rear intake',(s*1.058,.77,.88),(.022,.22,.37),'black',.025)
            for z in (-1.36,1.40):
                points=[]
                for j in range(17):
                    a=PI*j/16
                    points.append((s*1.081,.405+math.sin(a)*.44,z-math.cos(a)*.46))
                tube('Rolled wheel arch',points,.035,'teal',6)
            box('Headlamp pocket',(s*.67,.79,-2.169),(.55,.12,.13),'black',.036)
            box('LED blade',(s*.67,.819,-2.24),(.48,.029,.016),'light',.011)
            box('Tail bar',(s*.54,.826,2.229),(.77,.042,.02),'tail',.015)
            cyl('Exhaust sleeve',(s*.67,.48,2.22),.095,.20,'alloy',(0,0,1),16)
            cyl('Exhaust opening',(s*.67,.48,2.33),.068,.011,'black',(0,0,1),16,0)
            box('Spoiler support',(s*.62,1.10,1.93),(.07,.27,.09),'black',.02)
        box('Front intake',(0,.61,-2.197),(1.23,.18,.09),'black',.045)
        for i in range(-5,6): box('Grille fins',(i*.107,.61,-2.251),(.018,.10,.01),'steel',0)
        box('Front splitter',(0,.45,-2.11),(2.03,.075,.33),'teal',.045)
        box('Rear diffuser',(0,.485,2.09),(1.83,.13,.30),'black',.03)
        for x in (-.65,-.32,0,.32,.65): box('Diffuser strake',(x,.445,2.16),(.025,.12,.28),'teal',.008)
        box('Rear aerofoil',(0,1.25,1.93),(1.95,.058,.30),'teal',.03)
        for i in range(6): box('Engine cover louvers',(0,1.057,1.43+i*.067),(1.14,.02,.025),'teal',.006)
        box('Hood stripe',(0,1.05,-1.42),(.14,.008,.96),'ivory',.008)
        radius,wy,wx=.40,.41,1.035
    # Doors are genuine articulated mesh groups. Right door follows entry/exit state.
    for s in (-1,1):
        pivot=(s*.97,1,-.78)
        joint('door-right' if s>0 else 'door-left',pivot,'door' if s>0 else '')
        if offroad:
            box('Door skin',(s*1.017,1.1,-.04),(.055,.67,1.45),'paint',.03)
            poly_panel('Door window',[(s*.935,1.53,-.66),(s*.935,1.53,.50),(s*.865,2.07,.50),(s*.865,2.07,-.56)],'glass')
            beam('Window divider',(s*.94,1.50,.54),(s*.87,2.11,.54),.04,'paint')
            box('Door handle',(s*1.061,1.36,.47),(.045,.07,.19),'black',.02)
        else:
            box('Inset door skin',(s*1.036,.758,-.05),(.033,.43,1.46),'paint',.024)
            poly_panel('Door window',[(s*.882,1.075,-.78),(s*.88,1.075,.64),(s*.72,1.452,.49),(s*.72,1.452,-.26)],'glass',.016)
            beam('Window upper trim',(s*.724,1.46,-.27),(s*.724,1.46,.50),.022,'alloy')
            box('Flush handle',(s*1.052,.918,.44),(.018,.037,.19),'alloy',.009)
        beam('Mirror stalk',(s*.90,1.16,-.71),(s*1.14,1.25,-.74),.024,'black')
        box('Mirror housing',(s*1.16,1.265,-.74),(.25,.13,.20),'teal',.05)
        box('Mirror lens',(s*1.16,1.266,-.628),(.17,.07,.01),'alloy',.012)
    joint()
    DETAIL=True
    text_mesh('TRAIL 04' if offroad else 'COMET', (0,.67 if offroad else .66,2.255), .085, facing='back')
    DETAIL=False
    for x in (-wx,wx):
        for z in (-1.36,1.40):
            joint(('front' if z<0 else 'rear')+('-left' if x<0 else '-right'),(x,wy,z),'wheel-front' if z<0 else 'wheel')
            wheel((x,wy,z),radius,.32 if offroad else .27,offroad)
    finish_asset()


def helicopter():
    global DETAIL
    asset('osprey-heli','OSPREY / RESCUE H4'); joint()
    cabin=loft('Aerodynamic cabin',[(-2.70,.035,.07,1.45),(-2.45,.48,.49,1.53),(-1.82,.83,.77,1.64),(-.80,1.0,.89,1.72),(.55,.92,.88,1.76),(1.40,.53,.56,1.85),(1.92,.20,.27,1.90)],'paint',32)
    cabin.data.materials.append(M['glass'])
    for f in cabin.data.polygons:
        section,j=divmod(f.index,32)
        if (section==1 and (1<=j<=7 or 24<=j<=30)) or (section==2 and (3<=j<=8 or 23<=j<=28)) or (section==3 and (5<=j<=9 or 22<=j<=26)):
            f.material_index=1
    loft('Lower belly',[(-2.38,.12,.05,1.04),(-1.66,.67,.22,1.03),(.65,.69,.24,1.12),(1.5,.16,.08,1.48)],'teal',24)
    # Cockpit panels lie on a fitted, rounded section of the fuselage.
    for s in (-1,1):
        def window_edge(z,w,h,y,j):
            a=j*PI/16
            return (s*math.sin(a)*(w+.018),y+math.cos(a)*(h+.018),z)
        outline=[window_edge(-.8,1,.89,1.72,j) for j in range(5,11)]
        outline += [window_edge(.55,.92,.88,1.76,j) for j in range(10,4,-1)]
        outline.append(outline[0])
        tube('Flush cabin window seal',outline,.016,'steel',6)
        beam('Rescue side stripe',(s*.90,1.32,-.62),(s*.85,1.36,.40),.037,'ivory',8)
        beam('Door grip',(s*.948,1.48,.16),(s*.931,1.49,.37),.021,'alloy',8)
        for z in (-1.10,1.0): beam('Skid brace',(s*.65,1.06,z),(s*1.17,.31,z),.057,'steel',12)
        tube('Swept landing skid',[(s*1.19,.44,-2.2),(s*1.19,.30,-2.02),(s*1.19,.20,-1.76),(s*1.19,.20,1.71),(s*1.19,.26,1.98)],.068,'steel',12)
        box('Skid step',(s*1.23,.23,-.28),(.18,.07,.90),'black',.022)
        cyl('Turbine exhaust',(s*.49,2.45,.96),.18,.48,'steel',(0,.25,1),20)
        cyl('Exhaust dark interior',(s*.49,2.50,1.20),.128,.014,'black',(0,.25,1),20,0)
    loft('Turbine cowling',[(-.87,.23,.08,2.37),(-.54,.56,.28,2.48),(.65,.52,.29,2.45),(1.12,.28,.13,2.33)],'teal',20)
    loft('Tapered tail boom',[(1.23,.38,.37,1.86),(2.55,.25,.27,2.06),(4.76,.105,.16,2.21),(5.21,.05,.11,2.25)],'paint',16)
    poly_panel('Tail fin',[(0,2.02,4.43),(0,3.54,4.76),(0,3.42,5.28),(0,1.85,5.12)],'teal',.09,.03)
    box('Horizontal stabilizer',(0,2.05,3.91),(2.30,.075,.48),'ivory',.03)
    cyl('Main rotor mast',(0,2.91,0),.10,.76,'alloy',n=16)
    cyl('Swashplate',(0,2.81,0),.28,.1,'steel',n=16)
    joint('main-rotor',(0,3.28,0),'rotor')
    cyl('Rotor hub',(0,3.28,0),.28,.16,'steel',n=16)
    for j in range(4):
        a=j*PI/2
        def turn(p):
            x,y,z=p
            return (x*math.cos(a)+z*math.sin(a),y,-x*math.sin(a)+z*math.cos(a))
        poly_panel('Composite rotor blade',[turn(p) for p in [(.20,3.3,-.10),(4.7,3.27,-.24),(5.10,3.24,.0),(5.10,3.24,.18),(.2,3.3,.11)]],'black',.045,.014)
        poly_panel('Rotor safety tip',[turn(p) for p in [(4.70,3.277,-.23),(5.10,3.247,.0),(5.10,3.247,.18),(4.70,3.277,.175)]],'paint',.008,.005)
    joint('tail-rotor',(.19,2.30,4.94),'tail-rotor')
    cyl('Tail hub',(.19,2.30,4.94),.12,.20,'alloy',(1,0,0),12)
    for a in (0,PI/2): box('Tail blade',(.30,2.30,4.94),(.055,1.50,.13),'black',.025,rot=(a,0,0))
    joint(); DETAIL=True
    for s in (-1,1):
        for i in range(7): box('Intake cooling slot',(s*.5,2.56,-.4+i*.12),(.06,.14,.035),'black',.007)
        cyl('Navigation light',(s*1.015,1.65,.4),.045,.025,'tail' if s<0 else 'screen',(1,0,0),10)
    DETAIL=False; finish_asset()


def boat():
    global DETAIL
    asset('stingray-boat','STINGRAY / COASTAL 08'); joint()
    # Open V hull: a continuous gunwale, chine, keel and stern, not an ellipsoid.
    sec=[(-3.96,.035,.79),(-3.35,.52,.75),(-2.20,1.0,.68),(-.65,1.15,.61),(1.7,1.13,.57),(2.9,1.0,.55)]
    verts=[]
    for z,w,h in sec:
        verts += [(-w,h,z),(-w*.94,.16,z),(-w*.46,-.13,z),(0,-.36 if z>-3 else .1,z),(w*.46,-.13,z),(w*.94,.16,z),(w,h,z)]
    faces=[]
    for i in range(len(sec)-1):
        for j in range(6): faces.append((i*7+j,i*7+j+1,(i+1)*7+j+1,(i+1)*7+j))
    faces.append(tuple(range(35,42)))
    mesh('Deep V hull',verts,faces,'ivory',False,.035)
    for s in (-1,1):
        tube('Continuous rub rail',[(s*w,h+.025,z) for z,w,h in sec],.036,'teal',8)
        poly_panel('Hull color flash',[(s*1.01,.26,-2.12),(s*1.137,.23,-.5),(s*1.015,.22,2.78),(s*1.015,.34,2.78),(s*1.14,.37,-.5),(s*1.01,.39,-2.12)],'teal',.012,.005)
        box('Cockpit padded coaming',(s*1.008,.63,1.04),(.15,.22,3.42),'ivory',.06)
    poly_panel('Forward deck',[(-.04,.80,-3.90),(-.52,.77,-3.33),(-1.01,.70,-2.20),(-1.15,.64,-.9),(1.15,.64,-.9),(1.01,.70,-2.20),(.52,.77,-3.33),(.04,.80,-3.90)],'ivory',.045,.025)
    box('Cockpit sole',(0,.32,1.00),(1.90,.12,3.61),'wood',.02)
    DETAIL=True
    for x in range(-8,9): box('Teak deck seam',(x*.104,.385,1.00),(.009,.008,3.4),'black',0)
    DETAIL=False
    box('Bow sun pad',(0,.748,-2.0),(1.10,.13,1.27),'seat',.07)
    for x in (-.48,.48):
        box('Bucket seat cushion',(x,.69,.97),(.66,.20,.77),'ivory',.075)
        box('Seat back',(x,.99,1.27),(.69,.65,.19),'ivory',.075,rot=(-.10,0,0))
        box('Seat inset',(x,1.04,1.158),(.47,.35,.021),'seat',.025,rot=(-.10,0,0))
        cyl('Seat pedestal',(x,.49,1.0),.11,.3,'steel',n=12)
    box('Stern bench',(0,.68,2.20),(1.79,.24,.69),'seat',.09)
    box('Stern bench back',(0,.86,2.50),(1.8,.50,.16),'ivory',.075)
    box('Dashboard',(0,.88,-.45),(1.85,.20,.45),'teal',.055)
    poly_panel('Wraparound windscreen',[(-1.0,.88,-.71),(1.0,.88,-.71),(.83,1.36,-.28),(-.83,1.36,-.28)],'glass',.015)
    for s in (-1,1):
        beam('Windscreen frame',(s*1.0,.88,-.71),(s*.83,1.36,-.28),.024,'alloy')
        tube('Bow handrail',[(s*.48,.96,-3.23),(s*.84,1.04,-2.75),(s*1.02,1.02,-2.13),(s*1.09,.92,-1.34)],.023,'alloy')
        for z,w in ((-3.23,.48),(-2.13,1.02),(-1.34,1.09)):
            beam('Rail stanchion',(s*w,.70,z),(s*w,.97,z),.018,'alloy')
        for z in (-2.5,2.62):
            box('Cleat base',(s*.87,.72,z),(.13,.055,.19),'steel',.015)
            beam('Mooring cleat',(s*.87,.8,z-.15),(s*.87,.8,z+.15),.027,'alloy')
    beam('Windscreen top rail',(-.83,1.365,-.28),(.83,1.365,-.28),.025,'alloy')
    torus('Steering wheel',(.49,1.02,-.14),.175,.022,'black',(0,.4,1),24,6)
    cyl('Steering boss',(.49,1.02,-.14),.057,.06,'alloy',(0,.4,1),12)
    for j in range(3):
        a=j*2*PI/3
        beam('Steering spoke',(.49,1.02,-.14),(.49+math.cos(a)*.15,1.02+math.sin(a)*.15,-.14),.014,'alloy',6)
    box('Navigation display',(-.32,1.01,-.32),(.25,.11,.028),'screen',.018)
    joint('outboard',(0,.35,2.89),'rudder')
    box('Outboard cowling',(0,.77,3.15),(.67,.94,.69),'teal',.14)
    box('Engine accent',(0,.83,3.508),(.53,.12,.01),'ivory',.012)
    box('Outboard leg',(0,-.06,3.19),(.19,.9,.23),'steel',.045)
    cyl('Propeller hub',(0,-.43,3.40),.085,.31,'steel',(0,0,1),12)
    for j in range(3):
        a=j*2*PI/3
        box('Prop blade',(math.cos(a)*.13,-.43+math.sin(a)*.13,3.55),(.13,.32,.024),'alloy',.03,rot=(0,0,a-PI/2))
    joint(); finish_asset()


def props():
    global DETAIL
    asset('quay-container','NORTH QUAY / FREIGHT 17'); joint()
    box('Corrugated shell',(0,1.36,0),(4.80,2.59,10.70),'paint',.055)
    for s in (-1,1):
        for y in (.08,2.64): box('Box section frame',(s*2.395,y,0),(.10,.15,10.8),'steel',.025)
        for i in range(30):
            box('Pressed corrugation',(s*2.427,1.35,-5.13+i*.354),(.065,2.37,.112),'paint',.02)
        for z in (-5.32,5.32): box('Corner post',(s*2.36,1.36,z),(.18,2.72,.17),'steel',.023)
        box('Rear door',(s*1.17,1.37,5.379),(2.26,2.39,.068),'paint',.025)
        for x in (.51,1.67):
            beam('Door locking rod',(s*x,.22,5.444),(s*x,2.49,5.444),.033,'alloy',10)
            for y in (.40,1.38,2.23): box('Lock rod bracket',(s*x,y,5.46),(.16,.075,.08),'steel',.014)
            box('Cam latch',(s*x-.1,1.05,5.50),(.25,.06,.07),'alloy',.01)
        for z in (-5.25,5.25):
            for y in (.10,2.60):
                box('Cast corner fitting',(s*2.36,y,z),(.21,.22,.26),'alloy',.045)
                box('Twistlock socket',(s*2.36,y+.116,z),(.095,.008,.125),'black',.025)
    for i in range(13): box('Roof channel',(0,2.682,-4.8+i*.79),(4.47,.035,.04),'steel',.008)
    DETAIL=True
    text_mesh('NORTH QUAY', (2.477,1.65,.15), .33, facing='side')
    text_mesh('NQ  017  /  24T', (0,1.89,5.433), .19, facing='back')
    for s in (-1,1):
        box('Hazard placard',(s*1.58,.62,5.444),(.36,.34,.009),'ivory',.01)
        for x in range(4): box('Safety stripe',(s*2.472,.23,-3.8+x*2.4),(.015,.09,.44),'ivory',.002)
    DETAIL=False; finish_asset()

    asset('oak-crate','OAK / TRANSIT CRATE'); joint()
    box('Crate inner',(0,.54,0),(1.38,.89,1.38),'wood',.016)
    for s in (-1,1):
        for i in range(5):
            box('Face board',(s*.72,.20+i*.175,0),(.06,.15,1.4),'woodLight' if i%3==0 else 'wood',.008)
            box('Face board',(0,.20+i*.175,s*.72),(1.4,.15,.06),'woodLight' if i%3==0 else 'wood',.008)
        for x in (-.5,.5):
            box('Vertical reinforcing batten',(x,.54,s*.765),(.12,.92,.05),'woodLight',.012)
            box('Side batten',(s*.765,.54,x),(.05,.92,.12),'woodLight',.012)
        box('Pallet runner',(s*.50,.065,0),(.22,.13,1.5),'wood',.013)
        box('Steel shipping strap',(s*.37,1.014,0),(.045,.022,1.48),'steel',.004)
    for i in range(7): box('Lid board',(-.63+i*.21,.995,0),(.193,.067,1.4),'woodLight' if i%2 else 'wood',.01)
    box('Handling label',(0,.66,.785),(.42,.25,.009),'ivory',.01)
    DETAIL=True
    for s in (-1,1):
        for x in (-.5,.5):
            for y in (.18,.88): cyl('Steel nail',(x,y,s*.797),.013,.009,'black',(0,0,1),6,0)
    text_mesh('UP', (0,.63,.794), .12, facing='back')
    DETAIL=False; finish_asset()

    asset('dock-pallet','EURO / TIMBER PALLET'); joint()
    for x in (-.48,0,.48):
        for z in (-.4,0,.4): box('Spacer block',(x,.12,z),(.19,.17,.18),'wood',.008)
        box('Bottom runner',(x,.032,0),(.20,.065,1.00),'wood',.008)
    for i in range(7): box('Deck board',(-.53+i*.177,.235,0),(.155,.055,1.05),'woodLight' if i%3 else 'wood',.008)
    finish_asset()

    asset('fuel-drum','FUEL / STEEL DRUM'); joint()
    cyl('Pressed steel drum',(0,.47,0),.32,.90,'paint',n=28,bevel=.04)
    for y in (.06,.30,.66,.88): torus('Rolled seam',(0,y,0),.315,.018,'steel',major=28,minor=6)
    cyl('Top recess',(0,.929,0),.268,.013,'steel',n=28,bevel=.008)
    for x,r in ((-.14,.041),(.15,.065)):
        cyl('Bung collar',(x,.943,.09),r,.022,'alloy',n=12,bevel=.006)
        cyl('Bung plug',(x,.959,.09),r*.58,.014,'black',n=6,bevel=.005)
    box('Drum label',(0,.53,.320),(.29,.26,.012),'ivory',.012)
    DETAIL=True; text_mesh('FUEL',(0,.50,.33),.067,facing='back'); DETAIL=False
    finish_asset()

    asset('mooring-bollard','QUAY / MOORING 06'); joint()
    box('Base plate',(0,.055,0),(.73,.11,.54),'steel',.045)
    cyl('Cast bollard',(0,.31,0),.17,.47,'teal',n=20,bevel=.06)
    cyl('Cross head',(0,.54,0),.11,.67,'teal',(1,0,0),20,.055)
    for x in (-.25,.25):
        for z in (-.16,.16): cyl('Anchor bolt',(x,.13,z),.035,.055,'alloy',n=6,bevel=.006)
    for y in (.23,.29,.35): torus('Coiled dock line',(0,y,0),.20,.024,'rope',major=24,minor=6)
    tube('Loose line',[(.18,.27,0),(.30,.2,.18),(.5,.05,.24),(.65,.04,.19),(.78,.04,.31)],.023,'rope',6)
    finish_asset()

    asset('quay-lamp','QUAY / TASK LIGHT'); joint()
    box('Pole footing',(0,.1,0),(.48,.20,.48),'steel',.03)
    cyl('Tapered pole',(0,3.41,0),.08,6.56,'teal',n=16,bevel=.008)
    cyl('Base collar',(0,.48,0),.12,.66,'steel',n=16,bevel=.01)
    tube('Curved cantilever',[(0,6.55,0),(.06,6.85,0),(.31,7.0,0),(1.75,7.0,0)],.07,'teal',12)
    box('Luminaire housing',(1.57,6.91,0),(1.02,.19,.51),'teal',.065)
    box('LED diffuser',(1.57,6.807,0),(.87,.023,.37),'light',.03)
    for i in range(6): box('Cooling fin',(1.20+i*.15,7.025,0),(.025,.07,.39),'steel',.008)
    box('Service panel',(0,.88,.089),(.11,.36,.025),'steel',.015)
    finish_asset()

    asset('relay-terminal','RELAY / PORT CONTROL'); joint()
    box('Relay pedestal',(0,.17,0),(.70,.34,.49),'teal',.04)
    box('Electronics cabinet',(0,.92,0),(.67,1.19,.48),'teal',.045)
    box('Inset faceplate',(0,1.08,.249),(.58,.76,.025),'black',.022)
    box('Screen surround',(0,1.28,.274),(.48,.34,.035),'steel',.025)
    box('Status display',(0,1.28,.296),(.415,.267,.012),'screen',.018)
    for i in range(4): box('Telemetry trace',(-.075,1.34-i*.043,.307),(.21-i*.028,.013,.005),'teal',.002)
    box('Keyboard shelf',(0,.84,.35),(.54,.075,.29),'steel',.025,rot=(-.1,0,0))
    for x in range(5):
        for z in range(3): box('Keycap',(-.16+x*.077,.882,.27+z*.073),(.051,.014,.046),'black',.005)
    cyl('Emergency stop',(.21,.63,.273),.048,.027,'red',(0,0,1),16)
    beam('Antenna',(-.25,1.5,-.1),(-.25,1.98,-.1),.017,'alloy',8)
    for y in (.34,.42,.50): box('Vent slot',(0,y,.247),(.35,.026,.016),'black',.006)
    finish_asset()

    asset('mission-case','OPS / SECURE CARGO'); joint()
    box('Ribbed equipment case',(0,.39,0),(1.15,.70,.73),'paint',.075)
    box('Lid',(0,.783,0),(1.16,.13,.74),'paint',.045)
    box('Lid gasket',(0,.709,0),(1.145,.025,.726),'black',.012)
    for s in (-1,1):
        for z in (-.31,.31): box('Armored corner',(s*.52,.43,z),(.115,.68,.115),'teal',.035)
        box('Recess handle',(s*.582,.46,0),(.022,.18,.30),'black',.025)
        beam('Carry handle',(s*.614,.49,-.10),(s*.614,.49,.10),.026,'alloy')
        box('Cam latch',(s*.33,.67,.387),(.10,.19,.055),'alloy',.018)
    for x in (-.3,0,.3): box('Lid rib',(x,.858,0),(.07,.043,.52),'teal',.016)
    box('Status inset',(0,.44,.378),(.36,.23,.02),'black',.025)
    box('Status screen',(0,.45,.393),(.27,.13,.012),'screen',.015)
    finish_asset()

    asset('quay-barrier','QUAY / CONCRETE BARRIER'); joint()
    # Tapered Jersey profile, sized for the existing waist-high cover collision.
    profile=[(-.48,0),(-.48,.17),(-.23,.46),(-.14,.95),(.14,.95),(.23,.46),(.48,.17),(.48,0)]
    verts=[(x,y,z) for z in (-2,2) for x,y in profile]
    faces=[tuple(reversed(range(8))),tuple(range(8,16))]+[(i,(i+1)%8,(i+1)%8+8,i+8) for i in range(8)]
    mesh('Cast concrete profile',verts,faces,'ivory',False,.028)
    for s in (-1,1):
        for z in (-1.65,-.95,-.25,.45,1.15): box('Warning paint',(s*.15,.74,z),(.027,.21,.32),'paint',.008)
    for z in (-1.4,1.4): torus('Lifting eye',(0,.96,z),.06,.017,'steel',(1,0,0),16,6)
    finish_asset()

    asset('dock-forklift','QUAY / ELECTRIC LIFT'); joint()
    box('Counterweight',(0,.72,1.00),(1.63,1.2,1.3),'paint',.22)
    box('Chassis',(0,.38,.22),(1.69,.40,2.45),'teal',.07)
    box('Driver deck',(0,.57,-.19),(1.46,.07,1.12),'steel',.03)
    for x in (-.72,.72):
        for z in (-.68,.99): wheel((x,.32,z),.31,.23)
        for z in (-.55,.88): beam('Overhead guard',(x,.65,z),(x,2.5,z),.046,'teal')
        box('Guard top',(x,2.50,.16),(.09,.09,1.75),'teal',.025)
    for z in (-.62,-.25,.15,.55,.95): box('Overhead crossmember',(0,2.52,z),(1.56,.075,.065),'teal',.015)
    box('Operator seat',(0,.88,.31),(.69,.17,.62),'black',.07)
    box('Seat back',(0,1.16,.62),(.70,.61,.15),'black',.07,rot=(-.09,0,0))
    beam('Steering column',(-.3,.60,-.65),(-.3,1.18,-.38),.04,'steel')
    torus('Steering wheel',(-.3,1.2,-.38),.20,.022,'black',(0,.75,.5),20,6)
    for s in (-1,1):
        box('Mast rail',(s*.53,1.56,-1.13),(.14,3.1,.18),'teal',.025)
        cyl('Hydraulic ram',(s*.32,1.26,-1.08),.045,1.90,'alloy',n=12)
        box('Carriage',(s*.44,.60,-1.30),(.16,.82,.10),'steel',.025)
        box('Forged fork',(s*.44,.16,-1.94),(.15,.08,1.48),'steel',.022)
        box('Fork heel',(s*.44,.45,-1.24),(.15,.63,.13),'steel',.025)
    for y in (.68,1.03,2.78): box('Mast crossmember',(0,y,-1.14),(1.18,.12,.16),'teal',.022)
    cyl('Amber beacon',(0,2.66,.83),.092,.19,'light',n=16)
    finish_asset()


def clean_glb(path):
    """Remove collapsed bevel faces from the portable export as well as runtime.

    Keep the native Blender scene graph, material data and binary layout. Accessors
    may use a prefix of their buffer view, so unused index bytes need not move.
    """
    raw=path.read_bytes();doc=None;data=None;offset=12
    while offset<len(raw):
        size,kind=struct.unpack_from('<II',raw,offset);chunk=raw[offset+8:offset+8+size];offset+=8+size
        if kind==0x4e4f534a: doc=json.loads(chunk)
        elif kind==0x004e4942: data=bytearray(chunk)
    def accessor(i):
        a=doc['accessors'][i];v=doc['bufferViews'][a['bufferView']]
        fmt={5121:'B',5123:'H',5125:'I',5126:'f'}[a['componentType']]
        width={'SCALAR':1,'VEC3':3,'VEC4':4,'VEC2':2}[a['type']]
        stride=v.get('byteStride',struct.calcsize('<'+fmt)*width)
        return a,v.get('byteOffset',0)+a.get('byteOffset',0),stride,'<'+fmt*width
    def read(i):
        a,off,stride,fmt=accessor(i)
        return [struct.unpack_from(fmt,data,off+j*stride) for j in range(a['count'])]
    for m in doc['meshes']:
        for p in m['primitives']:
            positions=[Vector(x) for x in read(p['attributes']['POSITION'])]
            indices=[x[0] for x in read(p['indices'])]
            keep=[];fallback={}
            for i in range(0,len(indices),3):
                a,b,c=indices[i:i+3];n=(positions[b]-positions[a]).cross(positions[c]-positions[a])
                if n.length_squared<1e-16: continue
                keep.extend((a,b,c));n.normalize()
                for vi in (a,b,c): fallback.setdefault(vi,n)
            if not keep: continue
            acc,off,stride,fmt=accessor(p['indices'])
            for j,value in enumerate(keep): struct.pack_into(fmt,data,off+j*stride,value)
            acc['count']=len(keep)
            if 'min' in acc: acc['min']=[min(keep)]
            if 'max' in acc: acc['max']=[max(keep)]
            ni=p['attributes'].get('NORMAL')
            if ni is not None:
                acc,off,stride,fmt=accessor(ni)
                for j,v in enumerate(read(ni)):
                    n=Vector(v)
                    if n.length_squared<.5: n=fallback.get(j,Vector((0,0,1)))
                    else: n.normalize()
                    struct.pack_into(fmt,data,off+j*stride,*n)
    doc.setdefault('extras',{})['cleanup']='Collapsed bevel triangles removed; normals normalized.'
    body=json.dumps(doc,separators=(',',':')).encode();body+=b' '*((-len(body))%4)
    path.write_bytes(struct.pack('<III',0x46546c67,2,28+len(body)+len(data))+struct.pack('<II',len(body),0x4e4f534a)+body+struct.pack('<II',len(data),0x004e4942)+data)


def export_pack():
    pack={'version':1,'generator':'Blender '+bpy.app.version_string,'positionScale':.001,'meshes':{},'assets':{}}
    manifest={'format':'Harbor Workshop 1 / GLB + offline indexed mesh pack','generator':pack['generator'],'units':'meters; runtime Y up, -Z forward','assets':[]}
    for collection in [c for c in bpy.data.collections if c.get('asset_id')]:
        name=collection['asset_id']
        bpy.context.window.scene=bpy.data.scenes[name]
        joints=json.loads(collection.get('joints','{}'))
        result={'label':collection['label'],'lods':{},'joints':joints}
        counts={}
        bounds=[[1e9]*3,[-1e9]*3]
        object_bounds={}
        for lod in ('high','low'):
            groups=defaultdict(lambda: {'vertices':[],'indices':[],'lookup':{}})
            temporary=[]
            for obj in list(collection.objects):
                if obj.type!='MESH' or (lod=='low' and obj.get('detail')): continue
                source=obj
                if lod=='low':
                    source=obj.copy();source.data=obj.data.copy();collection.objects.link(source)
                    temporary.append(source)
                    for mod in source.modifiers:
                        if mod.type=='BEVEL': mod.segments=1
                    dec=source.modifiers.new('Runtime LOD reduction','DECIMATE')
                    dec.ratio=.27
                    dec.use_collapse_triangulate=True
                deps=bpy.context.evaluated_depsgraph_get()
                ev=source.evaluated_get(deps)
                me=ev.to_mesh();me.calc_loop_triangles()
                if lod=='high':
                    corners=[gv(ev.matrix_world @ Vector(c)) for c in ev.bound_box]
                    object_bounds[obj.name]=[[min(c[k] for c in corners) for k in range(3)],[max(c[k] for c in corners) for k in range(3)]]
                part=obj.get('part_id','body')
                pivot=joints.get(part,{}).get('pivot',[0,0,0])
                for tri in me.loop_triangles:
                    # Bevels and tiny font counters can collapse to zero-area faces.
                    # They have no visible surface and must not produce zero normals.
                    points=[ev.matrix_world @ me.vertices[vi].co for vi in tri.vertices]
                    face_normal=(points[1]-points[0]).cross(points[2]-points[0])
                    if face_normal.length_squared < 1e-16: continue
                    face_normal.normalize()
                    material=me.materials[tri.material_index]
                    g=groups[(part,material.name)]
                    for vi,li in zip(tri.vertices,tri.loops):
                        p=gv(ev.matrix_world @ me.vertices[vi].co)
                        if lod=='low':
                            ob=object_bounds[obj.name]
                            p=tuple(max(ob[0][k],min(ob[1][k],p[k])) for k in range(3))
                        if lod=='high':
                            for k in range(3):
                                bounds[0][k]=min(bounds[0][k],p[k]);bounds[1][k]=max(bounds[1][k],p[k])
                        normal=(ev.matrix_world.to_3x3().inverted().transposed() @ me.corner_normals[li].vector).normalized()
                        if normal.length_squared < .5: normal=face_normal
                        n=gv(normal)
                        key=tuple(round((p[k]-pivot[k])*1000) for k in range(3))+tuple(round(n[k]*32767) for k in range(3))
                        if key not in g['lookup']:
                            g['lookup'][key]=len(g['vertices']);g['vertices'].append(key)
                        g['indices'].append(g['lookup'][key])
                ev.to_mesh_clear()
            for obj in temporary:
                data=obj.data;bpy.data.objects.remove(obj,do_unlink=True);bpy.data.meshes.remove(data)
            parts=[];count=0
            for (part,matname),g in groups.items():
                assert len(g['vertices'])<65536
                vertex_bytes=b''.join(struct.pack('<6h',*v) for v in g['vertices'])
                index_bytes=struct.pack('<'+'H'*len(g['indices']),*g['indices'])
                mesh_id=hashlib.sha256(vertex_bytes+index_bytes).hexdigest()[:16]
                pack['meshes'][mesh_id]={'v':base64.b64encode(vertex_bytes).decode(),'i':base64.b64encode(index_bytes).decode()}
                m=bpy.data.materials[matname];node=m.node_tree.nodes.get('Principled BSDF')
                parts.append({'mesh':mesh_id,'part':part,'color':[round(srgb(x),4) for x in node.inputs['Base Color'].default_value[:3]],'roughness':round(node.inputs['Roughness'].default_value,3),'metallic':round(node.inputs['Metallic'].default_value,3),'unlit':bool(m.get('unlit')),'role':m.get('role','')})
                count+=len(g['indices'])//3
            result['lods'][lod]=parts;counts[lod]=count
        result['bounds']=[[round(x,4) for x in row] for row in bounds]
        pack['assets'][name]=result
        bpy.ops.object.select_all(action='DESELECT')
        for obj in collection.objects: obj.select_set(True)
        bpy.context.view_layer.objects.active=next(iter(collection.objects))
        glb=OUT/(name+'.glb')
        bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,use_active_scene=True,export_apply=True,export_yup=True,export_animations=False,export_extras=True,export_cameras=False,export_lights=False,export_texcoords=False,export_materials='EXPORT')
        clean_glb(glb)
        manifest['assets'].append({'id':name,'label':result['label'],'glb':glb.name,'bytes':glb.stat().st_size,'triangles':counts,'bounds':result['bounds'],'parts':list(joints)})
        print('HARBOR_ASSET',name,counts,flush=True)
    (OUT/'harbor-pack.js').write_text('// Generated by tools/blender_harbor.py. Edit the Blender source, then re-export.\nconst HARBOR_ASSET_PACK7='+json.dumps(pack,separators=(',',':'))+';\n')
    manifest['runtimeBytes']=(OUT/'harbor-pack.js').stat().st_size
    manifest['uniqueMeshes']=len(pack['meshes'])
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    return manifest


def studio():
    scene=bpy.data.scenes.new('00 • HARBOR WORKSHOP')
    bpy.context.window.scene=scene
    scene.render.engine='CYCLES'
    scene.cycles.samples=32
    scene.cycles.use_denoising=True
    scene.render.resolution_x=1800;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
    scene.world=bpy.data.worlds.new('Warm studio')
    scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.24,.30,.34,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.45
    placements=[('comet-sport',(-5,-3,0),1),('trail-jeep',(0,-3,0),1),('stingray-boat',(5,-3,0),.80),('osprey-heli',(-4,4,0),.86),('quay-container',(4,4,0),.50),('dock-forklift',(7,2,0),.85),('oak-crate',(1,2,0),1),('fuel-drum',(2,1,0),1),('mission-case',(1,-.2,0),1),('mooring-bollard',(-1,-.5,0),1),('dock-pallet',(.8,3,0),1),('relay-terminal',(3,1,0),1),('quay-barrier',(-1,1.3,0),.55),('quay-lamp',(7,5,0),.65)]
    for name,p,s in placements:
        o=bpy.data.objects.new(name,None);o.instance_type='COLLECTION';o.instance_collection=bpy.data.collections[name]
        scene.collection.objects.link(o);o.location=p;o.scale=(s,s,s)
    bpy.ops.mesh.primitive_plane_add(size=200)
    floor=bpy.context.object;floor.name='Studio floor';floor.location.z=-.03
    m=mat('Studio parchment','CED2C9',.85);floor.data.materials.append(m)
    for name,p,power,size,col in [('Key',(-8,-4,14),2400,10,(1,.85,.67)),('Fill',(8,-1,9),1900,9,(.66,.84,1)),('Rim',(1,11,13),2900,8,(1,.92,.75))]:
        bpy.ops.object.light_add(type='AREA',location=p)
        o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.data.color=col
        o.rotation_euler=(Vector((0,1,0))-o.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add(location=(19,-27,24))
    cam=bpy.context.object;cam.rotation_euler=(Vector((0,1,.6))-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='ORTHO';cam.data.ortho_scale=21;scene.camera=cam
    scene.view_settings.view_transform='AgX'
    scene.render.filepath=str(ROOT/'previews'/'blender-workshop.png')
    # Make the source file useful on first open.
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':
                area.spaces.active.region_3d.view_perspective='CAMERA'
                area.spaces.active.shading.color_type='MATERIAL'
    return scene


if __name__=='__main__':
    if '--export-only' not in sys.argv:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        materials();car();car(True);helicopter();boat();props()
        studio()
    manifest=export_pack()
    if '--export-only' not in sys.argv:
        bpy.context.window.scene=bpy.data.scenes['00 • HARBOR WORKSHOP']
        bpy.ops.wm.save_as_mainfile(filepath=str(ART/'harbor-workshop.blend'),compress=True)
    if '--render' in sys.argv:
        bpy.context.window.scene=bpy.data.scenes['00 • HARBOR WORKSHOP']
        bpy.ops.render.render(write_still=True)
    print('HARBOR_PACK_COMPLETE',json.dumps({'models':len(manifest['assets']),'bytes':manifest['runtimeBytes']}),flush=True)
