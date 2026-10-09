"""Revision 2: traced silhouette, continuous greenhouse, fitted recessed lamps.

Run with Blender --background --factory-startup --python rebuild_su7.py -- --render
The reference landmarks are interpreted, not a claim of manufacturer CAD accuracy.
"""
import sys, math, json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import build_su7 as h
import bpy
from mathutils import Vector

OUT=h.OUT
PI=math.pi

# Landmarks read from references/3-1.png. Piecewise horizontal calibration aligns
# both wheel centers and both overhangs, avoiding perspective-induced scale drift.
def py(px):
    if px<615:return 1.55+(615-px)*(.9485/196)
    if px>1280:return -1.45-(px-1280)*(1.0485/211)
    return 1.55-(px-615)*3/665


def pz(px):return (600-px)*(1.445/312)


def trace(points):return sorted((py(x),pz(z)) for x,z in points)


ROOF=trace([(742,389),(790,362),(850,328),(915,302),(975,291),(1030,288),(1090,293),(1150,305),(1210,324),(1270,345),(1330,366),(1390,383)])
BELT=trace([(742,392),(850,389),(1000,384),(1130,381),(1260,380),(1370,389)])
HOOD=trace([(419,470),(450,450),(480,433),(530,418),(600,410),(670,404),(710,401),(755,394)])
WIDTH=[(-2.4985,.908),(-2.30,.953),(-1.75,.9815),(-1.45,.976),(-.65,.95),(.40,.943),(1.0,.958),(1.55,.974),(1.92,.960),(2.25,.936),(2.4985,.891)]
RW=[(-2.00,.83),(-1.75,.80),(-1.4,.745),(-1.0,.69),(-.6,.663),(-.2,.664),(.15,.67),(.45,.71),(.70,.77),(1.0,.862)]
SIDE=[(0,1),(.08,1.007),(.20,1.007),(.35,.998),(.52,.982),(.67,.948),(.80,.934),(.93,.947),(1,.902)]


def value(curve,y):return h.interp(curve,y)
def smooth(t):t=max(0,min(1,t));return t*t*(3-2*t)
def waist(y):return value(BELT,y)
def roof(y):return value(ROOF,y)


def ztop(x,y):
    w=value(WIDTH,y);u=min(1.1,abs(x)/w)
    if y>.80:
        hood=value(HOOD,y)
        # Rounded fenders stand proud of a subtly concave bonnet channel.
        bulge=.110*math.exp(-((y-1.52)/.67)**2)*math.exp(-((u-.83)/.20)**2)
        drop=.075*u*u*smooth((y-.78)/.50)
        return hood+bulge-drop
    if y<-1.78:
        center=value([(-2.4985,.856),(-2.40,.939),(-2.23,.997),(-2.0,1.015),(-1.78,1.032)],y)
        return center-.035*u*u
    return waist(y)+.012*(1-u*u)+.008*math.exp(-((u-.85)/.14)**2)


def lower(y):
    return value([(-2.5,.25),(-2.15,.20),(-1.7,.18),(-1,.17),(.8,.17),(1.8,.20),(2.5,.24)],y)


def side_x(y,z):
    w=value(WIDTH,y);edge=ztop(w,y)
    t=max(0,min(1,(edge-z)/(edge-lower(y))))
    return w*value(SIDE,t)


def nose(x,z,sign=1):
    a=abs(x)/.96
    if sign==1:
        # Round the bonnet-to-bumper rollover vertically as well as laterally.
        crown=.065*smooth((z-.44)/.19)+.023*smooth((.32-z)/.09)
        return 2.4985-.22*a*a-crown
    return -2.4985+.18*a*a+.013*math.exp(-((z-.64)/.16)**2)


def point(x,y,z):
    if y>1.98:
        y+=(nose(x,z,1)-2.4985)*smooth((y-1.98)/.5185)
    if y<-1.9:
        y+=(nose(x,z,-1)+2.4985)*smooth((-y-1.9)/.5985)
    return (x,y,z)


def surf(x,y,off=0):return point(x,y,ztop(x,y)+off)


def ribbon(name,center,width,mat='paint'):
    return h.tube(name,center,width,mat,res=2)


def body():
    # Dense loft with curved front/rear caps instead of planar end faces.
    section=[(i/32,0) for i in range(33)]
    section += [(value(SIDE,t),t) for t in [i/32 for i in range(1,33)]]
    section += [(v,1) for v in [.65,.35,0,-.35,-.65,-.902]]
    section += [(-value(SIDE,t),t) for t in [i/32 for i in range(31,0,-1)]]
    section += [(-i/32,0) for i in range(32,0,-1)]
    vs=[];fs=[];n=len(section);ny=190
    for j in range(ny+1):
        y=-2.4985+4.997*j/ny;w=value(WIDTH,y)
        for u,t in section:
            x=u*w;z=ztop(x,y)*(1-t)+lower(y)*t
            vs.append(point(x,y,z))
    for j in range(ny):
        for i in range(n):
            a=j*n+i;b=j*n+(i+1)%n;fs.append((a,b,b+n,a+n))
    # Radially sampled caps retain the nose's lateral crown all the way across.
    for end,sign in [(0,-1),(ny,1)]:
        edge=vs[end*n:(end+1)*n];cz=.5*(lower(sign*2.4985)+ztop(0,sign*2.4985))
        center=(0,nose(0,cz,sign),cz);c=len(vs);vs.append(center);last=None
        for k in range(1,9):
            ring=[]
            if k==8:ring=list(range(end*n,(end+1)*n))
            else:
                for x,y,z in edge:
                    xx=x*k/8;zz=cz+(z-cz)*k/8;ring.append(len(vs));vs.append((xx,nose(xx,zz,sign),zz))
            for i in range(n):
                b=(i+1)%n
                fs.append((c,ring[i],ring[b]) if last is None else (last[i],ring[i],ring[b],last[b]))
            last=ring
    shell=h.mesh('SU7 continuous sculpted exterior',vs,fs,'paint')
    for side in [-1,1]:
        for y in [1.55,-1.45]:
            cut=h.cylinder('Arch die',(side*1.03,y,.355),.388,.69,'black',segments=128)
            h.subtract(shell,cut)
    cut=h.box('Cabin hollow',(0,-.24,1.45),(1.57,2.47,2.00),'black',.10)
    h.subtract(shell,cut)
    # Headlamp pockets are cut into the bonnet/wing junction.
    for side in [-1,1]:
        edge=lamp_outline(side)
        top=[(x,y,z+.12) for x,y,z in edge];bottom=[(x,y,z-.10) for x,y,z in edge];n1=len(edge)
        faces=[tuple(range(n1-1,-1,-1)),tuple(n1+i for i in range(n1))]
        faces += [(i,(i+1)%n1,(i+1)%n1+n1,i+n1) for i in range(n1)]
        cut=h.mesh('Headlamp recess die',top+bottom,faces,'black')
        h.subtract(shell,cut)
    h.bevel(shell,.004,2)
    # Curved wheel lips, smooth side sills, thin correctly fitted panel lines.
    for side in [-1,1]:
        for y in [1.55,-1.45]:
            pts=[]
            for i in range(91):
                a=-.40+(PI+.8)*i/90;yy=y+.389*math.cos(a);z=.355+.389*math.sin(a)
                pts.append((side*(side_x(yy,z)+.002),yy,z))
            ribbon('Integrated rolled fender',pts,.007)
        pts=[]
        for i in range(61):
            y=-1.03+i*2.16/60;z=.185+.008*math.cos(y)
            pts.append((side*side_x(y,z),y,z))
        ribbon('Sill black aerodynamic skirt',pts,.029,'rubber')
        ribbon('Sill body crease',[(x,y,z+.035) for x,y,z in pts],.012)
        # Door split lines follow the actual front and rear door outlines.
        for knots in [[(.91,.985),(.955,.86),(.97,.55),(.94,.24),(.81,.205)], [(-.22,1.007),(-.23,.89),(-.29,.61),(-.30,.22)], [(-1.22,1.055),(-1.26,.95),(-1.28,.84),(-1.1,.60),(-.91,.24)]]:
            coords=catmull_open(knots,14)
            pts=[(side*(side_x(y,z)+.0028),y,z) for y,z in coords]
            ribbon('Fine door shut line',pts,.0015,'black')
        for yy,zz in [(-.035,.795),(-1.055,.82)]:
            # A single elongated flush handle, with a slim dark undershadow.
            x=side*(side_x(yy,zz)+.006)
            h.box('Flush handle gasket',(x,yy,zz),(.011,.225,.032),'black',.012)
            h.box('Flush body color handle',(x+side*.004,yy+.005,zz+.006),(.012,.206,.024),'paint',.01)
        vent=[(1.225,.806),(1.0,.804),(.975,.742),(1.18,.75)]
        pts=[(side*(side_x(y,z)+.006),y,z) for y,z in vent]
        h.patch('Slim front wing camera trim',pts,'lens')
        h.cylinder('Side camera lens',(side*(side_x(1.06,.781)+.012),1.06,.781),.011,.009,'black',segments=20)
        port=[(-1.90,.998),(-1.73,.99),(-1.73,.895),(-1.94,.895)]
        pts=[]
        for y,z,_ in h.smooth_loop([(y,z,0) for y,z in port],6):pts.append((side*(side_x(y,z)+.003),y,z))
        h.tube('Charging door seam',pts,.0015,'black',True,1)
    h.box('Underfloor',(0,-.06,.23),(1.6,3.68,.10),'rubber',.04)
    for side in [-1,1]:
        pts=[]
        for i in range(81):
            y=.94+1.39*i/80;x=side*(.695-.21*i/80)
            pts.append(surf(x,y,.0017))
        ribbon('Bonnet shut line',pts,.0015,'black')
    return shell


def catmull_open(points,steps=8):
    if len(points)<2:return points
    padded=[points[0]]+points+[points[-1]];result=[]
    for i in range(1,len(padded)-2):
        a,b,c,d=[Vector(padded[k]) for k in [i-1,i,i+1,i+2]]
        for j in range(steps):
            t=j/steps;result.append(tuple(.5*(2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)))
    result.append(points[-1]);return result


def lamp_outline(side):
    # In plan view, the outside rear corner is broad, the inboard front end tapered.
    xy=[(.435,2.44),(.54,2.443),(.79,2.347),(.883,2.205),(.868,2.064),(.78,2.074),(.59,2.297)]
    return [surf(side*x,y,-.002) for x,y,_ in h.smooth_loop([(x,y,0) for x,y in xy],8)]


def cabin_x(y,z):
    low=waist(y);high=roof(y)-.024
    t=max(0,min(1,(z-low)/max(.02,high-low)))
    return value(WIDTH,y)*.988*(1-t)+value(RW,y)*t+.008*math.sin(t*PI)


def roofpoint(y,u):
    return (u*value(RW,y),y,roof(y)-.024*u*u)


def cabin():
    # Roof skin and glazing share their edges; there is no painted shell behind glass.
    for name,y0,y1,glass in [('Swept front windscreen',.23,.979,'glass'),('Panoramic roof',-1.05,.23,'roofglass'),('Curved rear windscreen',-1.985,-1.05,'roofglass')]:
        h.grid(name,lambda u,v:roofpoint(y0+(y1-y0)*v,(2*u-1)*.94),48,48,glass)
        for side in [-1,1]:
            h.grid('Integrated painted roof edge',lambda u,v:roofpoint(y0+(y1-y0)*v,side*(.94+.06*u)),5,48,'paint')
    for side in [-1,1]:
        topys=[.979,.72,.40,.02,-.36,-.80,-1.23,-1.62]
        outer=[(y,roof(y)-.024) for y in topys]+[(-1.985,waist(-1.985)),(-1.18,waist(-1.18)),(-.25,waist(-.25)),(.55,waist(.55))]
        inner=[(.845,1.010),(.63,1.093),(.32,1.251),(-.02,1.360),(-.39,1.382),(-.78,1.333),(-1.15,1.220),(-1.40,1.118),(-1.45,1.058),(-1.15,1.032),(-.25,1.024),(.53,1.013)]
        out=h.smooth_loop([(y,z,0) for y,z in outer],8);ins=h.smooth_loop([(y,z,0) for y,z in inner],8)
        verts=[];faces=[];n=len(out)
        for i in range(7):
            t=i/6
            for a,b in zip(out,ins):
                y=a[0]*(1-t)+b[0]*t;z=a[1]*(1-t)+b[1]*t
                verts.append((side*cabin_x(y,z),y,z))
        for j in range(6):
            for i in range(n):
                a=j*n+i;b=j*n+(i+1)%n;faces.append((a,b,b+n,a+n))
        h.mesh('Continuous A / C pillar and window frame',verts,faces,'paint')
        # A tessellated dark glazing patch perfectly fits the inner frame loop.
        cy=sum(v[0] for v in ins)/n;cz=sum(v[1] for v in ins)/n;vs=[(side*cabin_x(cy,cz),cy,cz)];fs=[]
        for r in range(1,13):
            t=r/12
            for y,z,_ in ins:
                yy=cy+(y-cy)*t;zz=cz+(z-cz)*t;vs.append((side*(cabin_x(yy,zz)+.001),yy,zz))
        for i in range(n):fs.append((0,i+1,(i+1)%n+1))
        for j in range(11):
            for i in range(n):
                a=1+j*n+i;b=1+j*n+(i+1)%n;fs.append((a,b,b+n,a+n))
        h.mesh('Flush side glazing',vs,fs,'sideglass')
        trim=[(side*(cabin_x(y,z)+.003),y,z) for y,z,_ in ins]
        h.tube('Window rubber seal',trim,.004,'black',True,2)
        for pts,width in [([(-.23,1.024),(-.29,1.20),(-.37,1.380)],.019),([(-1.12,1.035),(-1.18,1.210)],.007)]:
            coords=catmull_open(pts,12)
            ribbon('Gloss window divider',[(side*(cabin_x(y,z)+.004),y,z) for y,z in coords],width,'black')
        # Narrow stalks and black lower shells; caps are painted, not chrome.
        ribbon('Exterior mirror neck',[(side*.89,.69,.999),(side*1.025,.64,1.037)],.018,'black')
        h.uv_sphere('Body color mirror cap',(side*1.05,.655,1.081),(.111,.083,.049),'paint')
        h.uv_sphere('Mirror black lower shell',(side*1.05,.649,1.054),(.113,.086,.024),'black')
        h.uv_sphere('Mirror glass',(side*1.055,.573,1.080),(.095,.009,.033),'mirror')
    z=roof(.32)
    h.box('Lidar roof base',(0,.32,z+.006),(.20,.135,.014),'black',.012)
    h.uv_sphere('Lidar aerodynamic casing',(0,.326,z+.022),(.093,.071,.024),'black')
    for x in [-.28,.27]:
        ribbon('Stowed windscreen wiper',[roofpoint(.965,x),roofpoint(.941,x+.35)],.004,'black')


def frontpatch(name,coords,mat,offset=.002,sign=1):
    points=[(x,nose(x,z,sign)+offset*sign,z) for x,z in coords]
    return h.patch(name,points,mat,project=lambda p:(p[0],nose(p[0],p[2],sign)+offset*sign,p[2]))


def lights():
    for side in [-1,1]:
        edge=lamp_outline(side)
        center=sum((Vector(p) for p in edge),Vector())/len(edge)
        # Solid, softly curved dark reflector bowl sits 8 mm below the painted rim.
        n=len(edge);vs=[tuple(center-Vector((0,0,.014)))];fs=[]
        for j in range(1,9):
            t=j/8
            for p in edge:
                q=center.lerp(Vector(p),t);q.z-=.012*(1-t*t);vs.append(tuple(q))
        for i in range(n):fs.append((0,1+i,1+(i+1)%n))
        for j in range(7):
            for i in range(n):
                a=1+j*n+i;b=1+j*n+(i+1)%n;fs.append((a,b,b+n,a+n))
        h.mesh('Recessed waterdrop headlamp bowl',vs,fs,'lens')
        h.tube('Black headlamp perimeter',edge,.003,'black',True,2)
        # Single tapered horizontal blade; restrained lower return and projectors.
        path=[(.459,2.424),(.58,2.375),(.69,2.300),(.79,2.214),(.844,2.147)]
        ribbon('Waterdrop upper DRL',[surf(side*x,y,.004) for x,y in catmull_open(path,8)],.005,'led')
        path=[(.46,2.422),(.58,2.410),(.73,2.35),(.83,2.242)]
        ribbon('Waterdrop lower DRL',[surf(side*x,y,.003) for x,y in catmull_open(path,8)],.0025,'led')
        for x,y in [(.79,2.128),(.832,2.099)]:
            o=h.box('Compact LED projector',surf(side*x,y,.005),(.026,.038,.011),'alloy',.003)
            o.rotation_euler.x=.28
        frontpatch('Narrow vertical air curtain',[(side*x,z) for x,z in [(.825,.615),(.888,.642),(.884,.575),(.83,.382),(.812,.415)]],'rubber')
    # Front opening is one trapezoid, with two body-colored internal bridges.
    frontpatch('Recessed lower intake',[(-.80,.262),(-.64,.433),(-.43,.438),(-.34,.405),(.34,.405),(.43,.438),(.64,.433),(.80,.262),(.56,.238),(-.56,.238)],'rubber')
    for side in [-1,1]:
        coords=[(.335,.254),(.39,.431),(.445,.438),(.405,.26)]
        frontpatch('Front intake structural bridge',[(side*x,z) for x,z in coords],'paint',.008)
        for z in [.295,.345]:
            ribbon('Intake horizontal slat',[(side*x,nose(x,z)+.009,z) for x in [.44,.54,.66]],.004,'graphite')
    ribbon('Front lower lip',[(x,nose(x,.236)+.012,.236) for x in [-.79+i*1.58/80 for i in range(81)]],.007,'black')
    h.box('Front radar panel',(0,nose(0,.33)+.008,.328),(.21,.012,.15),'black',.008)
    h.box('Front plate',(0,nose(0,.539)+.009,.539),(.43,.014,.102),'white',.006)
    h.text('xiaomi SU7',(0,nose(0,.539)+.019,.520),.040,'black',normal=(0,1,0))
    # A small bonnet badge is useful at this camera distance, without oversized type.
    h.box('Bonnet badge',surf(0,2.12,.003),(.060,.070,.003),'alloy',.008)
    # Slim smoked, wraparound rear housing; a continuous red loop inside it.
    outline=[(-.936,.832),(-.845,.871),(-.63,.902),(-.48,.859),(.48,.859),(.63,.902),(.845,.871),(.936,.832),(.72,.803),(0,.790),(-.72,.803)]
    frontpatch('Wraparound smoked taillight',outline,'lens',.004,-1)
    loop=[(-.889,.835),(-.80,.864),(-.635,.881),(-.48,.832),(.48,.832),(.635,.881),(.80,.864),(.889,.835),(.69,.823),(0,.815),(-.69,.823)]
    points=[(x,nose(x,z,-1)-.010,z) for x,z,_ in h.smooth_loop([(x,z,0) for x,z in loop],8)]
    h.tube('Continuous rear halo',points,.0042,'tail',True,2)
    for side in [-1,1]:
        frontpatch('Rear triangular air curtain',[(side*x,z) for x,z in [(.861,.67),(.918,.48),(.878,.46),(.827,.60)]],'rubber',.005,-1)
    frontpatch('Rear lower diffuser',[(-.9,.275),(-.83,.438),(-.62,.514),(-.41,.499),(0,.473),(.41,.499),(.62,.514),(.83,.438),(.9,.275),(.7,.227),(-.7,.227)],'rubber',.006,-1)
    for side in [-1,1]:
        coords=[(.42,.255),(.40,.402),(.52,.443),(.72,.418),(.79,.285)]
        # A broad painted blade follows the fascia instead of a round tubular bar.
        outer=h.smooth_loop([(side*x,z,0) for x,z in coords],10);vs=[];fs=[]
        for i,(x,z,_) in enumerate(outer):
            vs += [(x,nose(x,z,-1)-.012,z),(x,nose(x,z+.036,-1)-.014,z+.036)]
        for i in range(len(outer)):j=(i+1)%len(outer);fs.append((i*2,i*2+1,j*2+1,j*2))
        h.mesh('Rear painted diffuser blade',vs,fs,'paint')
        ribbon('Rear bumper reflector',[(side*x,nose(x,.297,-1)-.015,.297) for x in [.50,.59,.70]],.005,'tail')
    h.box('Rear plate',(0,nose(0,.355,-1)-.014,.355),(.43,.012,.102),'white',.006)
    h.text('xiaomi SU7',(0,nose(0,.355,-1)-.025,.334),.040,'black',normal=(0,-1,0))
    # Raised deck crease, stowed spoiler, and a subtle liftgate seam.
    h.PART='spoiler';h.JOINTS['spoiler']={'pivot':(0,-2.27,.994),'motion':'spoiler'}
    h.grid('Stowed integrated deck spoiler',lambda u,v:surf((u*2-1)*.80,-2.23-.18*v,.006+.020*v),48,8,'paint')
    h.PART='body'
    for side in [-1,1]:
        points=[(side*x,nose(x,z,-1)-.004,z) for x,z in [(.67,.954),(.69,.877),(.65,.723),(.57,.678),(.03,.678)]]
        ribbon('Liftgate seam',catmull_open(points,10),.0014,'black')


def wheels():
    h.wheels()
    for o in list(h.MODEL.objects):
        if o.name.startswith(('Machined split spoke','Recessed spoke center')):bpy.data.objects.remove(o,do_unlink=True)
    for side in [-1,1]:
        for yy,position in [(1.55,'front'),(-1.45,'rear')]:
            h.PART='wheel-'+position+('-left' if side<0 else '-right')
            outside=side*(.841+.138)
            for i in range(5):
                a=i*math.tau/5+.02
                shape=[(.036,-.021),(.13,-.029),(.242,-.050),(.253,-.019),(.231,.036),(.117,.029),(.036,.021)]
                for mat,scale,dx in [('alloy',1,0),('graphite',.57,.005)]:
                    pts=[]
                    for r,t in shape:
                        t*=scale;pts.append((outside+side*dx,yy+math.sin(a)*r+math.cos(a)*t,.355+math.cos(a)*r-math.sin(a)*t))
                    o=h.mesh('Broad sculpted five-spoke face',pts,[tuple(range(len(pts)))],mat,False)
                    solid=o.modifiers.new('Cast wheel face thickness','SOLIDIFY');solid.thickness=.003;solid.offset=0
                    h.bevel(o,.002,2)
    h.PART='body'


def material_revision():
    h.materials()
    side=h.material('22 Dark side glazing','152630',.12,.19)
    h.M['sideglass']=side
    h.M['mirror']=h.material('23 Mirror reflection','A4B9C4',.92,.06)
    paint=h.M['paint'].node_tree.nodes.get('Principled BSDF')
    paint.inputs['Base Color'].default_value=tuple(h.linear(v/255) for v in (5,105,183))+(1,)
    paint.inputs['Metallic'].default_value=.64
    paint.inputs['Roughness'].default_value=.29
    paint.inputs['Coat Weight'].default_value=.30
    glass=h.M['glass'];shader=glass.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Alpha'].default_value=.79;glass.diffuse_color=(*glass.diffuse_color[:3],.79)
    shader.inputs['Roughness'].default_value=.17
    for key in ['roofglass','sideglass','lens']:
        n=h.M[key].node_tree.nodes.get('Principled BSDF')
        n.inputs['Metallic'].default_value=.12;n.inputs['Coat Weight'].default_value=.16
    for key in ['sideglass','lens']:
        n=h.M[key].node_tree.nodes.get('Principled BSDF')
        n.inputs['Metallic'].default_value=0
        n.inputs['IOR'].default_value=1.15
        n.inputs['Specular IOR Level'].default_value=.05
        n.inputs['Coat Weight'].default_value=0
        n.inputs['Roughness'].default_value=.3
    n=h.M['black'].node_tree.nodes.get('Principled BSDF');n.inputs['Metallic'].default_value=.05;n.inputs['Roughness'].default_value=.47
    n=h.M['graphite'].node_tree.nodes.get('Principled BSDF');n.inputs['Metallic'].default_value=.05;n.inputs['Roughness'].default_value=.4;n.inputs['Base Color'].default_value=(.006,.008,.01,1)
    n=h.M['disc'].node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(.055,.064,.071,1);n.inputs['Roughness'].default_value=.58
    n=h.M['led'].node_tree.nodes.get('Principled BSDF');n.inputs['Emission Strength'].default_value=.65
    n=h.M['tail'].node_tree.nodes.get('Principled BSDF');n.inputs['Emission Strength'].default_value=.45


def studio():
    cam=h.studio();s=bpy.context.scene
    s.render.resolution_x=1600;s.render.resolution_y=1000;s.cycles.samples=32
    s.view_settings.exposure=0
    s.world.node_tree.nodes['Background'].inputs[0].default_value=(.12,.17,.24,1)
    s.world.node_tree.nodes['Background'].inputs[1].default_value=.28
    powers={'STUDIO / broad front softbox':700,'STUDIO / roof ribbon':420,'STUDIO / side strip':720,'STUDIO / rear edge':850}
    for name,power in powers.items():bpy.data.lights[name].energy=power
    bpy.data.lights['STUDIO / roof ribbon'].size=.8
    bpy.data.lights['STUDIO / broad front softbox'].size_y=2
    return cam


VIEWS={
 'front':{'eye':(-7.6,8.8,2.65),'target':(0,0,.74),'lens':61},
 'rear':{'eye':(7.5,-9.0,2.70),'target':(0,0,.74),'lens':61},
 'side':{'eye':(-10,0,.74),'target':(0,0,.74),'lens':55,'ortho':6.1},
 'cockpit':{'eye':(-.38,-.46,1.125),'target':(-.04,.78,.86),'lens':18},
}


def render_views(camera,names):
    (OUT/'renders').mkdir(exist_ok=True)
    shader=h.M['paint'].node_tree.nodes.get('Principled BSDF')
    original={key:shader.inputs[key].default_value[:] if key=='Base Color' else shader.inputs[key].default_value for key in ['Base Color','Metallic','Roughness','Coat Weight']}
    for name in names:
        clay=name.startswith('clay-');view=name.removeprefix('clay-')
        for k,v in original.items():shader.inputs[k].default_value=v
        if clay:
            shader.inputs['Base Color'].default_value=(.52,.52,.52,1);shader.inputs['Metallic'].default_value=0;shader.inputs['Roughness'].default_value=.65;shader.inputs['Coat Weight'].default_value=0
        h.position_camera(camera,VIEWS[view]);bpy.context.scene.render.filepath=str(OUT/'renders'/('v2-'+name+'.png'))
        print('RENDER',name,flush=True);bpy.ops.render.render(write_still=True)
    for k,v in original.items():shader.inputs[k].default_value=v


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system='METRIC'
    h.MODEL=bpy.data.collections.new('SU7 / reference-traced revision 2')
    bpy.context.scene.collection.children.link(h.MODEL)
    h.PART='body';h.JOINTS={'body':{'pivot':(0,0,0),'motion':'static'}}
    material_revision();body();cabin();lights();wheels();h.interior()
    print('REVISION 2 GEOMETRY COMPLETE',len(h.MODEL.objects),flush=True)
    draft='--draft' in sys.argv
    if not draft:
        info=h.export_game(version='0.2');info['authoring']='Reference-traced silhouette; continuous window frames; recessed lamps; curved nose and tail.'
        (OUT/'manifest.json').write_text(json.dumps(info,ensure_ascii=False,indent=2)+'\n')
        h.rig_editable_source()
    camera=studio();h.position_camera(camera,VIEWS['front'])
    if not draft:bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'xiaomi-su7.blend'))
    if '--render' in sys.argv:
        names=sys.argv[sys.argv.index('--views')+1].split(',') if '--views' in sys.argv else ['front','rear','side','cockpit','clay-side']
        render_views(camera,names)
    print('REVISION 2 COMPLETE',flush=True)


if __name__=='__main__':main()
