"""SU7 revision 3: observed exterior details, not a manufacturer CAD replica.

Reference: official 2026 SU7 Max photographs, 20-inch plum-blossom wheel option.
All geometry is authored here; reference photographs are never used as textures.
"""
import sys, math, json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import bpy
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
import rebuild_su7 as b

h=b.h
OUT=h.OUT
TAU=math.tau
clamp=lambda v: max(0,min(1,v))
LAMP_PLAN=[(.435,2.455),(.58,2.442),(.815,2.346),(.901,2.228),(.882,2.166),(.803,2.186),(.599,2.345)]
BODY_BVH=None


def blend(a,c,t):return a+(c-a)*b.smooth(t)


def top(x,y):
    """Blend bonnet and deck into the door shoulder without a section jump."""
    w=b.value(b.WIDTH,y);u=min(1.1,abs(x)/w)
    middle=b.waist(y)+.013*(1-u*u)
    hood=b.value(b.HOOD,y)
    bulge=.073*math.exp(-((y-1.54)/.73)**2)*math.exp(-((u-.80)/.24)**2)
    bonnet=hood+bulge-.046*u*u*b.smooth((y-.70)/.65)
    deck=b.value([(-2.4985,.858),(-2.40,.956),(-2.22,1.0),(-2.0,1.025),(-1.55,1.044)],y)-.033*u*u
    if y>.56:return blend(middle,bonnet,(y-.56)/.61)
    if y<-1.52:return blend(middle,deck,(-y-1.52)/.46)
    return middle


def remove_prefix(*prefixes):
    for o in list(h.MODEL.objects):
        if o.name.startswith(prefixes):bpy.data.objects.remove(o,do_unlink=True)


def meshband(name,outer,inner,mat):
    n=len(outer);assert n==len(inner)
    return h.mesh(name,outer+inner,[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],mat)


def extruded_loop(name,edge,direction,mat):
    n=len(edge);delta=Vector(direction)
    vs=list(edge)+[tuple(Vector(p)+delta) for p in edge]
    fs=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]
    fs += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return h.mesh(name,vs,fs,mat)


def fascia_y(x,z,sign=1):
    """Continuous bumper design surface, shared by all fascia components."""
    return b.nose(x,z,sign)


def fascia_loop(coords,sign=1,offset=0,steps=5):
    return [(x,fascia_y(x,z,sign)+offset*sign,z) for x,z,_ in h.smooth_loop([(x,z,0) for x,z in coords],steps)]


def recess(shell,name,coords,sign=1,depth=.065,mat='black'):
    edge=fascia_loop(coords,sign,.003)
    back_q=min(sign*y for x,y,z in edge)-depth-.035
    die=extruded_loop(name+' cutting tool',[(x,sign*3.2,z) for x,y,z in edge],(0,-sign*(3.2-back_q),0),'black')
    before=len(shell.data.polygons)
    h.subtract(shell,die)
    print('RECESS',name,before,'->',len(shell.data.polygons),flush=True)
    back=[(x,y-sign*depth,z) for x,y,z in edge]
    meshband(name+' return walls',edge,back,mat)
    h.mesh(name+' inner shadow',back,[tuple(range(len(back)))],'rubber',False)
    h.tube(name+' edge gasket',edge,.0023,'black',True,2)
    return edge


def patch_at(name,coords,mat,sign=1,offset=.006):
    points=[(x,fascia_y(x,z,sign)+offset*sign,z) for x,z in coords]
    return h.patch(name,points,mat,project=lambda p:(p[0],fascia_y(p[0],p[2],sign)+offset*sign,p[2]))


def body():
    global BODY_BVH
    b.SIDE=[(0,1),(.13,1.005),(.36,1.0),(.59,.981),(.79,.953),(.91,.942),(1,.93)]
    b.ztop=top
    b.lamp_outline=lambda side:[b.surf(side*x,y,-.002) for x,y,_ in h.smooth_loop([(x,y,0) for x,y in LAMP_PLAN],8)]
    shell=b.body()
    for modifier in list(shell.modifiers):h.apply_modifier(shell,modifier)
    bpy.context.view_layer.update()
    BODY_BVH=BVHTree.FromObject(shell,bpy.context.evaluated_depsgraph_get())
    for o in list(h.MODEL.objects):
        if o.name.startswith('Charging door seam'):
            points=o.data.splines[0].points
            if sum(p.co.x for p in points)>0:bpy.data.objects.remove(o,do_unlink=True)
    remove_prefix('Slim front wing camera trim','Side camera lens','Flush handle','Sill black aerodynamic skirt','Sill body crease','Bonnet shut line')
    bonnet=[(.697,.96),(.671,1.31),(.657,1.75),(.563,2.10),(.419,2.26),(.22,2.335),(0,2.352)]
    seam=b.catmull_open(bonnet,14)
    path=[b.surf(-x,y,.0015) for x,y in seam]+[b.surf(x,y,.0015) for x,y in reversed(seam[:-1])]
    h.tube('Continuous bonnet front shut line',path,.0013,'black',res=2)
    for side in [-1,1]:
        # A tapered camera/repeater insert, with a recessed second surface.
        coords=[(1.25,.798),(1.0,.807),(.993,.736),(1.17,.748)]
        edge=h.smooth_loop([(y,z,0) for y,z in coords],5)
        points=[(side*(b.side_x(y,z)+.003),y,z) for y,z,_ in edge]
        center=sum((Vector(p) for p in points),Vector())/len(points)
        inner=[tuple(center+(Vector(p)-center)*.82) for p in points]
        meshband('Wing repeater thin metallic surround',points,inner,'graphite')
        h.mesh('Wing repeater smoked inset',inner,[tuple(range(len(inner)))],'lens')
        h.cylinder('Side repeater optical camera',(side*(b.side_x(1.04,.775)+.005),1.04,.775),.010,.005,'glassdark',segments=24)
        h.tube('Wing repeater lower bright blade',[(side*(b.side_x(y,z)+.006),y,z) for y,z in [(1.18,.762),(1.06,.757),(1.02,.756)]],.0022,'alloy',res=1)
        for yy,zz in [(-.045,.817),(-1.05,.84)]:
            shape=[(yy-.115,zz-.018),(yy-.091,zz+.020),(yy+.074,zz+.022),(yy+.103,zz+.008),(yy+.09,zz-.019)]
            edge=h.smooth_loop([(y,z,0) for y,z in shape],5)
            pts=[(side*(b.side_x(y,z)+.003),y,z) for y,z,_ in edge]
            h.mesh('Flush handle recess',pts,[tuple(range(len(pts)))],'black')
            cy=sum(y for y,z,_ in edge)/len(edge);cz=sum(z for y,z,_ in edge)/len(edge)
            pts=[(side*(b.side_x(y,z)+.006),cy+(y-cy)*.89,cz+(z-cz)*.71+.003) for y,z,_ in edge]
            h.mesh('Flush sculpted handle',pts,[tuple(range(len(pts)))],'paint')
        # A wide black sill with a tapered painted upper shoulder.
        def sill(u,v):
            y=-1.08+2.23*v;z=.157+u*.10
            x=b.side_x(y,z)+.013*math.sin(u*math.pi)+.014
            return (side*x,y,z)
        h.grid('Sculpted aerodynamic rocker sill',sill,9,60,'black')
        h.tube('Rocker upper highlight',[sill(.94,i/60) for i in range(61)],.004,'paint',res=2)
        for y,z in [(1.80,.585),(-2.11,.55)]:
            x=side*(b.side_x(y,z)+.0025)
            h.cylinder('Side bumper parking sensor',(x,y,z),.010,.004,'paint',segments=24)
    return shell


def cabin():
    b.cabin()
    remove_prefix('Exterior mirror neck','Body color mirror cap','Mirror black lower shell','Mirror glass','Continuous A / C pillar','Flush side glazing','Window rubber seal')
    for side in [-1,1]:
        topys=[.979-i*2.964/64 for i in range(65)]
        innerys=[.84-i*2.35/64 for i in range(65)]
        outer=[(y,b.roof(y)-.024) for y in topys]+[(y,b.waist(y)) for y in reversed(topys)]
        inner=[(y,b.roof(y)-.054) for y in innerys]+[(y,b.waist(y)+.022) for y in reversed(innerys)]
        n=len(outer);vs=[];fs=[]
        for j in range(7):
            t=j/6
            for (oy,oz),(iy,iz) in zip(outer,inner):
                y=oy*(1-t)+iy*t;z=oz*(1-t)+iz*t
                vs.append((side*b.cabin_x(y,z),y,z))
        for j in range(6):
            for i in range(n):
                a=j*n+i;c=j*n+(i+1)%n;fs.append((a,c,c+n,a+n))
        h.mesh('Smooth continuous painted window frame',vs,fs,'paint')
        cy=sum(y for y,z in inner)/n;cz=sum(z for y,z in inner)/n;vs=[(side*(b.cabin_x(cy,cz)+.001),cy,cz)];fs=[]
        for j in range(1,13):
            for y,z in inner:
                yy=cy+(y-cy)*j/12;zz=cz+(z-cz)*j/12;vs.append((side*(b.cabin_x(yy,zz)+.001),yy,zz))
        for i in range(n):fs.append((0,i+1,(i+1)%n+1))
        for j in range(11):
            for i in range(n):
                a=1+j*n+i;c=1+j*n+(i+1)%n;fs.append((a,c,c+n,a+n))
        h.mesh('Tessellated dark side windows',vs,fs,'sideglass')
        h.tube('Fine black side window seal',[(side*(b.cabin_x(y,z)+.002),y,z) for y,z in inner],.004,'black',True,2)
    for side in [-1,1]:
        # Official blue car uses black mirror shells.
        h.tube('Black mirror pedestal',[(side*.90,.71,1.006),(side*1.01,.665,1.025),(side*1.027,.657,1.065)],.017,'black',res=3)
        h.uv_sphere('Gloss black exterior mirror cap',(side*1.056,.662,1.085),(.115,.097,.055),'mirrorblack',segments=40,rings=24)
        h.uv_sphere('Mirror lower molded shell',(side*1.056,.652,1.057),(.116,.096,.026),'black')
        h.uv_sphere('Exterior mirror reflective face',(side*1.057,.570,1.083),(.099,.008,.037),'mirror')
        h.tube('Mirror repeater lens',[(side*(.975+i*.135/20),.714-abs(i/20-.5)*.021,1.066) for i in range(21)],.002,'led',res=1)
    # The dotted frit and perimeter seals are geometry, separate from glass.
    for yy in [.97,.26,-1.95]:
        h.tube('Windscreen ceramic black border',[b.roofpoint(yy,-.94+i*1.88/60) for i in range(61)],.006,'black',res=2)
    for side in [-1,1]:
        h.tube('Windscreen side black border',[b.roofpoint(.26+.71*i/60,side*.934) for i in range(61)],.007,'black',res=2)


def lamp_point(side,u,v,offset=0):
    # Swept, four-element light pack. u follows the horizontal signature.
    x=.466+.382*u
    y=2.448-.234*u-.060*v
    return b.surf(side*x,y,offset)


def surface_ribbon(name,points,width,mat):
    # Flat ribbons avoid the neon-tube appearance of the previous draft.
    vs=[]
    for i,p in enumerate(points):
        taper=.22+.78*min(1,i/max(1,len(points)*.15))
        q=Vector(p);vs.extend([tuple(q-Vector((0,0,width*taper/2))),tuple(q+Vector((0,0,width*taper/2)))])
    return h.mesh(name,vs,[(2*i,2*i+1,2*i+3,2*i+2) for i in range(len(points)-1)],mat)


def headlights():
    for side in [-1,1]:
        plan=h.smooth_loop([(x,y,0) for x,y in LAMP_PLAN],8)
        cx=sum(p[0] for p in plan)/len(plan);cy=sum(p[1] for p in plan)/len(plan)
        edge=[b.surf(side*x,y,-.002) for x,y,_ in plan]
        innerplan=[(cx+(x-cx)*.963,cy+(y-cy)*.963) for x,y,_ in plan]
        inner=[b.surf(side*x,y,-.012) for x,y in innerplan]
        meshband('Headlight molded perimeter seal',edge,inner,'black')
        def lens_surface(name,offset,mat):
            n=len(innerplan);vs=[b.surf(side*cx,cy,offset)];fs=[]
            for j in range(1,13):
                for x,y in innerplan:vs.append(b.surf(side*(cx+(x-cx)*j/12),cy+(y-cy)*j/12,offset))
            for i in range(n):fs.append((0,i+1,(i+1)%n+1))
            for j in range(11):
                for i in range(n):
                    a=1+j*n+i;c=1+j*n+(i+1)%n;fs.append((a,c,c+n,a+n))
            return h.mesh(name,vs,fs,mat)
        lens_surface('Deep headlamp reflector bowl',-.010,'lens')
        h.tube('Headlight fine upper rim',inner,.0015,'graphite',True,2)
        path=[lamp_point(side,i/50,.0,.004) for i in range(51)]
        surface_ribbon('Single horizontal daytime light blade',path,.013,'led')
        # Four square projector lenses in two stacked pairs, like the close-up.
        for u in [.62,.87]:
            for v in [-.22,.43]:
                center=Vector(lamp_point(side,u,v,-.001))
                du=Vector(lamp_point(side,min(.99,u+.015),v))-Vector(lamp_point(side,u-.015,v))
                dv=Vector(lamp_point(side,u,v+.025))-Vector(lamp_point(side,u,v-.025))
                tangent=du.normalized();vertical=(dv-tangent*dv.dot(tangent)).normalized();normal=tangent.cross(vertical).normalized()
                if normal.z<0:normal=-normal
                corners=[center+tangent*x+vertical*y for x,y in [(-.014,-.012),(.014,-.012),(.014,.012),(-.014,.012)]]
                outside=h.smooth_loop([tuple(p) for p in corners],4)
                inside=[tuple(center+(Vector(p)-center)*.70) for p in outside]
                meshband('Square projector machined bezel',outside,inside,'alloy')
                glass=[tuple(Vector(p)+normal*.0015) for p in inside]
                h.mesh('Projector blue optical lens',glass,[tuple(range(len(glass)))],'projector')
                h.tube('Projector lower reflector',[tuple(center+tangent*x-vertical*.007+normal*.002) for x in [-.009,0,.009]],.0014,'alloy',res=1)
        lower=[b.surf(side*x,y,-.001) for x,y in b.catmull_open([(.55,2.438),(.66,2.403),(.77,2.354),(.857,2.272)],12)]
        surface_ribbon('Lower silver headlamp return',lower,.009,'alloy')
        # Nearly clear cover, not an emissive surface.
        lens_surface('Headlamp clear protective cover',.005,'clearlens')


def bumpers(shell):
    # Real depth in the central opening and both corner ducts.
    recess(shell,'Central front intake',[(-.33,.242),(-.32,.444),(.32,.444),(.33,.242)],depth=.10)
    for side in [-1,1]:
        corner=[(.37,.248),(.385,.432),(.455,.471),(.563,.455),(.749,.264),(.72,.237)]
        recess(shell,'Front corner brake cooling duct',[(side*x,z) for x,z in corner],depth=.082)
        air=[(.814,.622),(.891,.642),(.892,.595),(.844,.392),(.815,.41)]
        recess(shell,'Vertical front air curtain',[(side*x,z) for x,z in air],depth=.060)
        for z in [.286,.354]:
            h.tube('Front corner duct horizontal vane',[(side*x,fascia_y(x,z)-.035,z) for x in [.405,.49,.59]],.005,'black',res=1)
        for x,z in [(.26,.51),(.79,.505)]:
            yy=fascia_y(side*x,z)+.002
            h.tube('Front parking sensor seal',[(side*x+.011*math.cos(i*TAU/32),yy,z+.011*math.sin(i*TAU/32)) for i in range(32)],.001,'black',True,1)
            patch_at('Flush ultrasonic sensor',[(side*x+.010*math.cos(i*TAU/24),z+.010*math.sin(i*TAU/24)) for i in range(24)],'paint')
    for x in [-.24,-.16,.16,.24]:
        h.box('Central intake vertical guide',(x,2.44,.327),(.009,.066,.168),'black',.003)
    for z in [.278,.343,.411]:h.box('Central active grille shutter',(0,2.395,z),(.61,.025,.017),'graphite',.005)
    h.box('Flush front radar cover',(0,2.495,.328),(.194,.026,.163),'black',.014)
    h.box('Front registration bracket',(0,2.48,.537),(.45,.032,.118),'black',.008)
    h.box('Front registration plate',(0,2.502,.54),(.43,.008,.102),'white',.004)
    h.text('xiaomi  SU7',(0,2.508,.519),.037,'black',normal=(0,1,0))
    h.tube('Front black splitter',[(x,fascia_y(x,.227)+.011,.227) for x in [-.90+i*1.8/100 for i in range(101)]],.011,'black',res=2)
    badge=h.box('Inset bonnet badge',b.surf(0,2.12,.002),(.058,.066,.003),'alloy',.008)
    tangent=Vector(b.surf(0,2.13))-Vector(b.surf(0,2.11))
    normal=Vector((1,0,0)).cross(tangent).normalized()
    badge.rotation_euler=normal.to_track_quat('Z','Y').to_euler()
    h.text('mi',b.surf(0,2.12,.005),.026,'graphite',normal=normal)
    # Continuous tail housing and two concentric red optical guides.
    outline=[(-.938,.829),(-.862,.866),(-.618,.9),(-.463,.851),(.463,.851),(.618,.9),(.862,.866),(.938,.829),(.72,.789),(0,.782),(-.72,.789)]
    recess(shell,'Smoked rear light recess',outline,sign=-1,depth=.021,mat='lens')
    for shrink,width in [(1,.0033),(.967,.0017)]:
        guide=[(-.898,.832),(-.821,.859),(-.63,.879),(-.465,.830),(.465,.830),(.63,.879),(.821,.859),(.898,.832),(.685,.810),(0,.802),(-.685,.810)]
        edge=fascia_loop([(x*shrink,.832+(z-.832)*shrink) for x,z in guide],-1,.004)
        h.tube('Concentric rear red light guide',edge,width,'tail',True,2)
    for side in [-1,1]:
        recess(shell,'Rear quarter pressure relief',[(side*x,z) for x,z in [(.865,.655),(.899,.592),(.931,.428),(.895,.46),(.833,.574)]],sign=-1,depth=.043)
        for x,z in [(.85,.566),(.875,.528)]:
            h.tube('Rear vent internal vane',[(side*x,fascia_y(x,z,-1)+.015,z),(side*(x+.02),fascia_y(x+.02,z-.02,-1)+.016,z-.02)],.005,'black',res=1)
    diffuser=[(-.929,.249),(-.847,.427),(-.694,.519),(-.473,.536),(-.336,.483),(0,.469),(.336,.483),(.473,.536),(.694,.519),(.847,.427),(.929,.249),(.86,.180),(-.86,.180)]
    patch_at('Rear diffuser black surround',diffuser,'black',-1,.012)
    for side in [-1,1]:
        blade=[(.35,.20),(.351,.39),(.415,.454),(.58,.469),(.748,.407),(.813,.324),(.817,.20),(.863,.20),(.856,.367),(.78,.466),(.609,.525),(.421,.509),(.32,.429),(.312,.20)]
        edge=fascia_loop([(side*x,z) for x,z in blade],-1,.029,4)
        o=extruded_loop('Sculpted open rear diffuser arch',edge,(0,.023,0),'paint');h.bevel(o,.003,2)
        patch_at('Rear reflector smoked recess',[(side*x,z) for x,z in [(.41,.262),(.42,.301),(.705,.301),(.72,.262)]],'lens',-1,.033)
        h.tube('Rear bumper red reflector',[(side*x,fascia_y(x,.285,-1)-.039,.285) for x in [.438,.54,.684]],.0045,'tail',res=2)
    h.box('Recessed rear plate bracket',(0,-2.516,.362),(.56,.020,.20),'graphite',.013)
    h.box('Rear registration plate',(0,-2.53,.363),(.43,.008,.102),'white',.005)
    h.text('xiaomi  SU7',(0,-2.536,.342),.037,'black',normal=(0,-1,0))
    location,normal,index,distance=BODY_BVH.ray_cast(Vector((0,-3.2,.916)),Vector((0,1,0)),1.0)
    label_y=location.y-.005 if location is not None else -2.45
    h.text('x i a o m i',(0,label_y,.908),.035,'alloy',normal=(0,-1,0))
    h.text('SU7',(.585,-2.442,.701),.024,'alloy',normal=(0,-1,0))
    h.text('Max',(.682,-2.425,.701),.018,'tail',normal=(0,-1,0))
    # Thin, stowed deck spoiler with a black underside.
    h.PART='spoiler';h.JOINTS['spoiler']={'pivot':(0,-2.27,.994),'motion':'spoiler'}
    h.grid('Flush deck spoiler upper skin',lambda u,v:b.surf((u*2-1)*.81,-2.21-.18*v,.003+.014*v),64,12,'paint')
    h.tube('Spoiler lower shut line',[b.surf(-.80+i*1.6/80,-2.391,.005) for i in range(81)],.0015,'black',res=1)
    h.PART='body'
    for side in [-1,1]:
        pts=[(side*x,fascia_y(x,z,-1)-.003,z) for x,z in [(.666,.952),(.675,.865),(.639,.713),(.55,.678),(.025,.678)]]
        h.tube('Tailgate panel line',b.catmull_open(pts,12),.0012,'black',res=1)


def wheel_lettering(text,x,y,radius,start,side,size=.012,step=.051):
    for i,char in enumerate(text):
        if char==' ':continue
        a=start+side*(i-(len(text)-1)/2)*step
        o=h.text(char,(x,y+math.sin(a)*radius,.355+math.cos(a)*radius),size,'tirelabel',normal=(side,0,0))
        tangent=Vector((0,side*math.cos(a),-side*math.sin(a)))
        radial=Vector((0,math.sin(a),math.cos(a)))
        o.rotation_mode='QUATERNION';o.rotation_quaternion=Matrix((tangent,radial,Vector((side,0,0)))).transposed().to_quaternion()


def wheels():
    h.wheels()
    remove_prefix('Machined split spoke','Recessed spoke center','Wheel lug','Center hub','Fixed brake caliper')
    # Remove original hub letters, preserving all cabin/plate text.
    for o in list(h.MODEL.objects):
        if o.type=='FONT' and o.get('partId','').startswith('wheel-'):bpy.data.objects.remove(o,do_unlink=True)
    for side in [-1,1]:
        for yy,which in [(1.55,'front'),(-1.45,'rear')]:
            h.PART='wheel-'+which+('-left' if side<0 else '-right')
            def wp(r,t,a,offset=0):
                d=.131
                return (side*(.841+d+offset),yy+math.sin(a)*r+math.cos(a)*t,.355+math.cos(a)*r-math.sin(a)*t)
            # Forked wide shoulders, beveled machined borders, recessed graphite core.
            shape=[(.048,-.017),(.095,-.025),(.200,-.078),(.247,-.080),(.247,-.057),(.159,-.009),(.155,.009),(.247,.060),(.247,.081),(.205,.079),(.095,.026),(.048,.018)]
            for i in range(5):
                a=i*TAU/5+math.pi
                contour=h.smooth_loop([(r,t,0) for r,t in shape],3)
                outer=[wp(r,t,a) for r,t,_ in contour]
                o=extruded_loop('Concave cast Y spoke',outer,(-side*.017,0,0),'alloy');h.bevel(o,.0015,2)
                cr=sum(p[0] for p in contour)/len(contour);ct=sum(p[1] for p in contour)/len(contour)
                inner=[wp(cr+(r-cr)*.89,ct+(t-ct)*.82,a,.0015) for r,t,_ in contour]
                h.mesh('Recessed graphite Y spoke face',inner,[tuple(range(len(inner)))],'graphite',False)
                # Deep bolt pockets and smaller actual lug heads.
                a2=a+.22;cy=yy+math.sin(a2)*.045;cz=.355+math.cos(a2)*.045
                h.cylinder('Recessed lug pocket',(side*.963,cy,cz),.011,.007,'black',segments=32)
                h.cylinder('Five lug machined fastener',(side*.967,cy,cz),.0065,.007,'alloy',segments=6)
            h.cylinder('Machined wheel center medallion',(side*.971,yy,.355),.027,.007,'alloy',segments=48)
            h.cylinder('Black wheel center inset',(side*.976,yy,.355),.020,.004,'black',segments=48)
            h.text('mi',(side*.979,yy,.347),.023,'alloy',normal=(side,0,0))
            # Valve stem and molded tire sidewall markings.
            a=.35
            h.cylinder('Wheel valve stem',(side*.978,yy+math.sin(a)*.24,.355+math.cos(a)*.24),.004,.017,'black',segments=12)
            wheel_lettering('MICHELIN',side*.979,yy,.319,-.83,side,.015,.069)
            wheel_lettering('PILOT SPORT',side*.979,yy,.321,.64,side,.009,.039)
            wheel_lettering('245/40 R20',side*.979,yy,.315,math.pi,side,.009,.041)
            h.PART='body'
            x=side*.925
            h.box('Sculpted fixed brake caliper',(x,yy-.139,.419),(.053,.082,.194),'caliper',.024)
            for z in [.365,.405,.447]:
                h.uv_sphere('Caliper piston casing',(x+side*.010,yy-.164,z),(.010,.020,.022),'caliper',segments=20,rings=12)
            logo=h.text('brembo',(x+side*.030,yy-.147,.427),.015,'white',normal=(side,0,0))
            logo.rotation_mode='QUATERNION';logo.rotation_quaternion=Matrix(((0,0,1),(0,-side,0),(side,0,0))).transposed().to_quaternion()
    h.PART='body'


def materials():
    b.material_revision()
    additions={
        'mirrorblack':('24 Gloss black mirror shell','090E14',.08,.19),
        'glassdark':('25 Camera glass','182C38',.12,.16),
        'projector':('26 Optical projector','35495C',.5,.18),
        'clearlens':('27 Clear polycarbonate cover','B8C7D2',0,.12),
        'tirelabel':('28 Molded sidewall lettering','3C4044',0,.82),
    }
    for key,args in additions.items():h.M[key]=h.material(*args)
    n=h.M['clearlens'].node_tree.nodes.get('Principled BSDF')
    n.inputs['Alpha'].default_value=.055;n.inputs['Specular IOR Level'].default_value=.20
    h.M['clearlens'].surface_render_method='DITHERED';h.M['clearlens'].diffuse_color=(.5,.6,.7,.055)
    p=h.M['paint'].node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=tuple(h.linear(v/255) for v in (0,123,200))+(1,)
    p.inputs['Metallic'].default_value=.36;p.inputs['Roughness'].default_value=.27;p.inputs['Coat Weight'].default_value=.25
    for key in ['black','graphite']:
        n=h.M[key].node_tree.nodes.get('Principled BSDF');n.inputs['Roughness'].default_value=.30;n.inputs['Coat Weight'].default_value=.06
    n=h.M['glass'].node_tree.nodes.get('Principled BSDF')
    n.inputs['Transmission Weight'].default_value=0;n.inputs['Alpha'].default_value=.83;n.inputs['Roughness'].default_value=.19
    n.inputs['Specular IOR Level'].default_value=.25
    n=h.M['alloy'].node_tree.nodes.get('Principled BSDF');n.inputs['Metallic'].default_value=.82;n.inputs['Roughness'].default_value=.28;n.inputs['Coat Weight'].default_value=.12


def studio():
    cam=b.studio();s=bpy.context.scene
    s.cycles.samples=48
    preferences=bpy.context.preferences.addons['cycles'].preferences
    if any(t[0]=='METAL' for t in preferences.get_device_types(bpy.context)):
        preferences.compute_device_type='METAL';preferences.get_devices()
        metal=[d for d in preferences.devices if d.type=='METAL']
        if metal:
            for device in preferences.devices:device.use=device.type=='METAL'
            s.cycles.device='GPU'
    s.world.node_tree.nodes['Background'].inputs[0].default_value=(.28,.39,.52,1)
    s.world.node_tree.nodes['Background'].inputs[1].default_value=.4
    # Less intense specular stripes make the panel curvature readable.
    for name,power in {'broad front softbox':450,'roof ribbon':280,'side strip':360,'rear edge':470}.items():
        bpy.data.lights['STUDIO / '+name].energy=power
    bpy.data.lights['STUDIO / roof ribbon'].size=2.5
    bpy.data.lights['STUDIO / broad front softbox'].size=5
    bpy.data.lights['STUDIO / broad front softbox'].size_y=4
    s.view_settings.exposure=.25
    return cam


VIEWS={
 'front':{'eye':(-9.0,7.4,2.28),'target':(0,0,.74),'lens':62},
 'rear':{'eye':(8.5,-7.7,2.2),'target':(0,0,.72),'lens':62},
 'side':{'eye':(-10,0,1.1),'target':(0,0,.72),'lens':60,'ortho':6.1},
 'front-flat':{'eye':(0,10,1.40),'target':(0,0,.72),'lens':62,'ortho':3.15},
 'rear-flat':{'eye':(0,-10,1.35),'target':(0,0,.73),'lens':62,'ortho':3.15},
 'headlight':{'eye':(-2.60,4.00,1.35),'target':(-.70,2.19,.72),'lens':78},
 'wheel':{'eye':(-3.05,1.59,.68),'target':(-.96,1.55,.355),'lens':65},
 'cockpit':b.VIEWS['cockpit'],
}


def render(camera,names):
    for name in names:
        h.position_camera(camera,VIEWS[name]);bpy.context.scene.render.filepath=str(OUT/'renders'/('v3-'+name+'.png'))
        print('RENDER',name,flush=True);bpy.ops.render.render(write_still=True)


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.scene.unit_settings.system='METRIC'
    h.MODEL=bpy.data.collections.new('SU7 / exterior detail revision 3');bpy.context.scene.collection.children.link(h.MODEL)
    h.PART='body';h.JOINTS={'body':{'pivot':(0,0,0),'motion':'static'}}
    materials();shell=body();cabin();headlights();bumpers(shell);wheels();h.interior()
    if len(shell.data.polygons)<20000:
        raise RuntimeError('Exterior body was damaged by a fascia cut; export stopped.')
    bpy.context.view_layer.update()
    print('REVISION 3 GEOMETRY',len(h.MODEL.objects),flush=True)
    draft='--draft' in sys.argv
    if not draft:
        info=h.export_game(version='0.3')
        info['authoring']='Smoothed section transitions, four-element lights, recessed fascia ducts, 20-inch plum wheel detail, black mirrors, rear diffuser and badges.'
        info['accuracy']='Visual approximation from official images; no CAD or scan alignment. No numerical likeness score is claimed.'
        info['referenceModel']='2026 SU7 Max, Capri blue, 20-inch plum-blossom wheel; ceramic interior approximation'
        (OUT/'manifest.json').write_text(json.dumps(info,ensure_ascii=False,indent=2)+'\n')
        h.rig_editable_source()
    camera=studio();h.position_camera(camera,VIEWS['front'])
    if draft:
        bpy.context.scene.cycles.samples=20
        bpy.context.scene.render.resolution_x=1280;bpy.context.scene.render.resolution_y=800
    if not draft:bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'xiaomi-su7.blend'))
    if '--render' in sys.argv:
        names=sys.argv[sys.argv.index('--views')+1].split(',') if '--views' in sys.argv else ['front','rear','side','headlight','wheel','front-flat','rear-flat']
        render(camera,names)
    print('REVISION 3 COMPLETE',flush=True)


if __name__=='__main__':main()
