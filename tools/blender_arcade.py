"""Original first-person sports equipment, exported through the Harbor mesh contract."""
import sys,math,json,random
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import blender_harbor as h
import bpy
from mathutils import Vector
h.OUT=h.ROOT/'assets'/'arcade';h.OUT.mkdir(exist_ok=True)

def cockpit():
    h.asset('club-cockpit','APEX GT • first-person cockpit');h.joint()
    # A continuous cockpit tub hides the road below the driver. Seats are empty.
    h.box('Carpeted cockpit floor',(0,.22,.22),(1.72,.18,2.35),'rubber',.035)
    h.box('Front bulkhead',(0,.48,-.54),(1.70,.64,.12),'black',.028)
    h.box('Lower dash knee bolster',(-.37,.54,-.25),(.86,.35,.27),'rubber',.055)
    h.box('Passenger glovebox',(.49,.57,-.30),(.64,.34,.20),'black',.035)
    h.box('Glovebox latch',(.48,.67,-.185),(.11,.022,.015),'alloy',.003)
    for side in [-1,1]:
        h.box('Inner door card',(side*.864,.47,.29),(.075,.58,1.95),'black',.024)
        h.box('Padded door armrest',(side*.814,.60,.35),(.145,.12,.91),'rubber',.045)
        h.box('Brushed door release',(side*.772,.64,-.04),(.016,.055,.14),'alloy',.009)
        h.box('Door storage pocket',(side*.804,.36,.43),(.11,.14,.53),'rubber',.018)
    h.box('Transmission tunnel',(.20,.42,.46),(.31,.39,1.39),'black',.050)
    h.box('Console stitched top',(.20,.65,.73),(.29,.12,.53),'rubber',.040)
    h.cyl('Rotary drive selector',(.20,.65,.10),.063,.054,'alloy',(0,1,0),24,.008)
    h.cyl('Selector insert',(.20,.68,.10),.046,.006,'black',(0,1,0),24,.003)
    h.box('Empty driver cushion',(-.37,.44,.77),(.58,.20,.64),'black',.075)
    for side in [-1,1]:h.box('Seat side bolster',(-.37+side*.27,.56,.78),(.10,.29,.65),'rubber',.040)
    h.box('Empty passenger cushion',(.59,.43,.77),(.46,.20,.66),'black',.065)
    h.loft('Sculpted dashboard',[(-.74,.82,.085,.85),(-.56,.84,.12,.85),(-.32,.81,.105,.80),(-.24,.72,.065,.78)],'rubber',32)
    h.box('Brushed dash fascia',(0,.77,-.29),(1.42,.19,.055),'black',.028)
    h.box('Accent trim',(0,.878,-.285),(1.45,.016,.013),'alloy',.006)
    for side in [-1,1]:
        h.box('Door top',(side*.87,.71,.17),(.10,.13,1.03),'rubber',.036)
        h.tube('Windshield pillar',[(side*.87,.67,-.58),(side*.71,1.04,-.69),(side*.65,1.45,-.49)],.036,'black',12)
        h.box('Satin vent bezel',(side*.65,.77,-.249),(.20,.115,.025),'alloy',.016)
        h.box('Vent recess',(side*.65,.77,-.231),(.18,.089,.018),'black',.01)
        for j in range(4):h.box('Vent vane',(side*.65,.737+j*.021,-.216),(.162,.005,.014),'steel',.001)
    h.loft('Visible sculpted bonnet',[(-2.0,.62,.045,.56),(-1.76,.80,.065,.63),(-1.16,.83,.075,.70),(-.76,.78,.035,.72)],'paint',24)
    for x in [-.49,.49]:h.box('Bonnet inset',(x,.767,-1.12),(.21,.012,.33),'black',.014)
    h.box('Center information screen',(.27,.805,-.205),(.32,.125,.02),'glass',.013)
    h.text_mesh('APEX',(.27,.80,-.19),.027,'screen','back')
    for j in range(4):h.cyl('Console dial',(.17+j*.065,.675,-.18),.020,.026,'alloy',(0,0,1),16,.004)
    for x in [-.48,-.25]:
        h.cyl('Gauge bezel',(x,.85,-.29),.115,.035,'alloy',(0,0,1),40,.003)
        h.cyl('Gauge dial',(x,.85,-.265),.105,.013,'black',(0,0,1),40,0)
        for i in range(13):
            a=(-130+i*260/12)*math.pi/180
            h.beam('Gauge tick',(x+math.sin(a)*.088,.85+math.cos(a)*.088,-.252),(x+math.sin(a)*.099,.85+math.cos(a)*.099,-.252),.0018,'ivory',6)
    for part,x in [('speed-needle',-.48),('rpm-needle',-.25)]:
        h.joint(part,(x,.85,-.243),'gauge');h.beam('Instrument needle',(x,.85,-.243),(x,.932,-.243),.0028,'tail',6)
    h.joint('steering',(-.37,.72,.02),'steering')
    h.torus('Stitched steering wheel',(-.37,.72,.02),.194,.025,'rubber',(0,.12,1),48,10)
    for a in [0,2.12,4.16]:h.beam('Steering spoke',(-.37,.72,.02),(-.37+math.sin(a)*.17,.72+math.cos(a)*.17,.02),.019,'alloy',10)
    h.cyl('Wheel boss',(-.37,.72,.029),.064,.044,'black',(0,0,1),24,.009)
    h.box('Wheel emblem',(-.37,.72,.055),(.048,.015,.005),'paint',.003)
    h.joint();h.DETAIL=True
    for side in [-1,1]:
        for i in range(18):h.box('Door stitch',(side*.848,.787,-.30+i*.04),(.007,.005,.014),'seat',.001)
    h.DETAIL=False;h.finish_asset()

def recurve():
    h.asset('club-recurve','WINDSONG • laminated recurve bow');h.joint()
    h.tube('Sculpted riser',[(0,-.20,0),(-.025,-.11,-.025),(-.030,.02,0),(.01,.13,-.018),(0,.22,0)],.030,'wood',16)
    h.box('Leather grip',(-.025,-.025,.002),(.056,.135,.055),'seat',.014)
    for side in [-1,1]:
        h.joint('upper-limb' if side>0 else 'lower-limb',(0,side*.19,0),'bow-limb')
        pts=[(0,side*y,z) for y,z in [(.18,0),(.29,-.025),(.42,-.060),(.54,-.075),(.64,-.025),(.69,.055)]]
        for dx,mat in [(-.006,'ivory'),(0,'wood'),(.006,'woodLight')]:h.tube('Laminated limb',[(x+dx,y,z) for x,y,z in pts],.012,mat,10)
        h.cyl('Limb tip nock',(0,side*.69,.055),.019,.035,'black',(1,0,0),12,.003)
    h.joint();h.beam('Sight mount',(0,.105,0),(.13,.105,-.08),.007,'alloy')
    h.torus('Sight aperture',(.125,.105,-.095),.029,.004,'steel',(0,0,1),20,6)
    h.cyl('Sight pin',(.125,.105,-.095),.0025,.012,'tail',(0,0,1),8,0)
    h.beam('Stabilizer',(0,-.13,-.02),(0,-.13,-.39),.012,'black',12)
    h.cyl('Stabilizer weight',(0,-.13,-.40),.023,.065,'steel',(0,0,1),16,.004)
    h.joint('string-top',(0,.69,.055),'socket');h.joint('string-bottom',(0,-.69,.055),'socket');h.finish_asset()

def arrow():
    h.asset('club-arrow','Carbon practice arrow');h.joint()
    h.beam('Carbon shaft',(0,0,-.36),(0,0,.31),.004,'black',12)
    h.cyl('Target point',(0,0,-.378),.006,.036,'alloy',(0,0,1),12,.002)
    h.cyl('Nock',(0,0,.324),.005,.024,'screen',(0,0,1),10,.001)
    for i in range(3):
        a=i*math.pi*2/3
        h.mesh('Fletching',[(0,0,.16),(.023*math.cos(a),.023*math.sin(a),.20),(.024*math.cos(a),.024*math.sin(a),.29),(0,0,.31)],[(0,1,2,3),(3,2,1,0)],'paint')
    h.finish_asset()

def dart():
    h.asset('club-dart','Tungsten precision dart');h.joint()
    h.beam('Steel point',(0,0,-.068),(0,0,-.025),.0018,'alloy',10)
    h.cyl('Tungsten barrel',(0,0,0),.006,.061,'alloy',(0,0,1),20,.002)
    for i in range(9):h.torus('Barrel grip ring',(0,0,-.022+i*.005),.006,.0015,'black',(0,0,1),20,6)
    h.beam('Flight stem',(0,0,.029),(0,0,.088),.0025,'steel',10)
    for i in range(4):
        a=i*math.pi/2
        pts=[(0,0,.062),(.028*math.cos(a),.028*math.sin(a),.078),(.019*math.cos(a),.019*math.sin(a),.108),(0,0,.099)]
        h.mesh('Moulded flight',pts,[(0,1,2,3),(3,2,1,0)],'paint' if i%2 else 'ivory')
    h.finish_asset()

def dartboard():
    h.asset('club-dartboard','Tournament sisal dartboard');h.joint()
    h.cyl('Oak cabinet back',(0,0,-.021),.237,.08,'wood',(0,0,1),96,.008)
    h.cyl('Sisal board body',(0,0,.021),.223,.035,'boardBlack',(0,0,1),96,.003)
    rings=[(.0159,.099),(.099,.107),(.107,.162),(.162,.170)]
    numbers=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5]
    for i,num in enumerate(numbers):
        a=(i-.5)*math.pi/10;b=(i+.5)*math.pi/10
        for j,(r0,r1) in enumerate(rings):
            material=('boardRed' if i%2==0 else 'boardGreen') if j in [1,3] else ('boardBlack' if i%2==0 else 'boardCream')
            for n in range(5):
                aa=a+(b-a)*n/5;bb=a+(b-a)*(n+1)/5
                p=lambda r,t:(math.sin(t)*r,math.cos(t)*r,.043)
                h.mesh('Scoring segment',[p(r0,aa),p(r0,bb),p(r1,bb),p(r1,aa)],[(0,1,2,3)],material)
        h.beam('Radial spider wire',(math.sin(a)*.016,math.cos(a)*.016,.044),(math.sin(a)*.17,math.cos(a)*.17,.044),.0008,'alloy',6)
        t=i*math.pi/10;h.text_mesh(str(num),(math.sin(t)*.197,math.cos(t)*.197-.009,.044),.023,'ivory','back')
    for r in [.00635,.0159,.099,.107,.162,.170]:h.torus('Spider ring',(0,0,.044),r,.0008,'alloy',(0,0,1),96,6)
    h.cyl('Outer bull',(0,0,.042),.0159,.002,'boardGreen',(0,0,1),48,0)
    h.cyl('Inner bull',(0,0,.044),.00635,.002,'boardRed',(0,0,1),32,0)
    h.torus('Cabinet surround',(0,0,.034),.228,.009,'steel',(0,0,1),96,8)
    h.finish_asset()

def archery_target():
    h.asset('club-archery-target','Ten-ring target and folding stand');h.joint()
    for x in [-.39,.39]:
        h.beam('A-frame front leg',(x,-1.30,.19),(x,.25,-.10),.033,'wood',12)
        h.beam('A-frame back leg',(x,-1.30,-.65),(x,.25,-.10),.031,'wood',12)
    h.beam('Cross brace',(-.49,-.48,.18),(.49,-.48,.18),.024,'steel')
    h.cyl('Compressed straw butt',(0,0,-.072),.655,.18,'rope',(0,0,1),80,.012)
    h.cyl('White target face',(0,0,.025),.61,.016,'boardCream',(0,0,1),100,0)
    cols=['boardCream','boardCream','boardBlack','boardBlack','targetBlue','targetBlue','boardRed','boardRed','targetGold','targetGold']
    for i in range(10):h.cyl('Scoring zone '+str(i+1),(0,0,.036+i*.0015),.61*(10-i)/10,.0015,cols[i],(0,0,1),100,0)
    for i in range(1,11):h.torus('Printed ring',(0,0,.053),.061*i,.001,'boardBlack' if i>6 else 'steel',(0,0,1),100,4)
    h.beam('Center X',(-.006,-.006,.055),(.006,.006,.055),.001,'boardBlack',4)
    h.beam('Center X',(-.006,.006,.055),(.006,-.006,.055),.001,'boardBlack',4)
    h.finish_asset()

def shooting_target():
    h.asset('club-shooting-target','Reactive mechanical training plate');h.joint()
    h.box('Weighted base',(0,.12,0),(.78,.22,.52),'rubber',.055)
    h.box('Actuator body',(0,.41,-.06),(.27,.53,.23),'steel',.03)
    h.cyl('Pivot axle',(0,.72,0),.09,.54,'alloy',(1,0,0),24,.008)
    h.joint('plate',(0,.72,0),'target-fold')
    h.box('Target carrier',(0,1.17,0),(.66,.86,.075),'targetCarrier',.09)
    h.cyl('Impact face',(0,1.24,.055),.285,.025,'ivory',(0,0,1),56,.008)
    for r in [.10,.20,.275]:h.torus('Engraved aiming ring',(0,1.24,.073),r,.004,'steel',(0,0,1),48,6)
    h.cyl('Reactive bull',(0,1.24,.077),.052,.008,'paint',(0,0,1),32,.002)
    for side in [-1,1]:h.box('Status lamp',(side*.30,1.51,.05),(.025,.075,.014),'screen',.008)
    h.joint();h.finish_asset()

def race_gate():
    h.asset('club-race-gate','Illuminated timing gantry');h.joint()
    for side in [-1,1]:
        h.box('Gantry footing',(side*4.8,.22,0),(.9,.44,1.2),'rubber',.10)
        h.box('Gantry upright',(side*4.8,2.05,0),(.20,3.75,.20),'steel',.024)
        h.box('Timing light strip',(side*4.8,2.0,.13),(.08,3.0,.02),'screen',.006)
    h.box('Gantry header',(0,3.93,0),(9.85,.50,.32),'black',.045)
    h.box('Timing display',(0,3.93,.17),(2.2,.32,.02),'glass',.02)
    h.text_mesh('HARBOR CLUB',(0,3.86,.193),.19,'screen','back')
    for i in range(5):h.cyl('Start lamp',(-.48+i*.24,3.55,.02),.070,.06,'tail',(0,0,1),24,.01)
    h.finish_asset()

def canopy(name,center,radii,material,phase):
    # Small scallops and smooth normals give the crown a leafy, irregular contour.
    points=[];faces=[];rings=6;segments=12
    for j in range(rings+1):
        v=j/rings*math.pi
        for i in range(segments):
            u=i/segments*math.tau;ruffle=1+.08*math.sin(i*2.7+j*3.1+phase)
            points.append((center[0]+math.sin(v)*math.cos(u)*radii[0]*ruffle,center[1]+math.cos(v)*radii[1],center[2]+math.sin(v)*math.sin(u)*radii[2]*ruffle))
    for j in range(rings):
        for i in range(segments):
            a=j*segments+i;b=j*segments+(i+1)%segments;faces.append((a,b,b+segments,a+segments))
    h.mesh(name,points,faces,material,True)

def club_tree():
    h.asset('club-canopy-tree','Wind-shaped coastal tree');h.joint();rng=random.Random(502)
    h.tube('Tapered trunk',[(0,0,0),(.07,1.1,.02),(-.09,2.4,0),(.04,3.8,.05)],.15,'bark',10)
    for i in range(7):
        a=i*2.4;tip=(math.cos(a)*(1.0+i%2*.65),3.5+i%3*.45,math.sin(a)*(1.0+i%2*.65))
        h.beam('Crown branch',(0,2.2+i%3*.30,0),tip,.055,'bark',8)
        canopy('Layered crown',tip,(1.45,.88,1.30),['leafDark','leafMid','leafLight'][i%3],i*.8)
    for i in range(5):
        a=i*math.tau/5;h.beam('Surface root',(0,.12,0),(math.cos(a)*.6,.015,math.sin(a)*.6),.07,'bark',8)
    h.DETAIL=True
    for i in range(30):
        a=rng.random()*math.tau;y=2.9+rng.random()*2.2;rad=1.5+rng.random()*.6;x=math.cos(a)*rad;z=math.sin(a)*rad
        h.mesh('Leaf silhouette',[(x-.14,y,z),(x,y+.15,z-.04),(x+.14,y+.03,z),(x,y-.04,z+.06)],[(0,1,2),(0,2,3),(2,1,0),(3,2,0)],['leafMid','leafLight'][i%2])
    h.DETAIL=False;h.finish_asset()

def grass_patch():
    h.asset('club-meadow','Meadow tuft and seed heads');h.joint();rng=random.Random(37)
    for i in range(27):
        x=(rng.random()-.5)*1.8;z=(rng.random()-.5)*1.8;a=rng.random()*math.tau;height=.12+rng.random()*.34;width=.016+rng.random()*.014;dx=math.cos(a)*width;dz=math.sin(a)*width
        h.mesh('Bent grass blade',[(x-dx,0,z-dz),(x+dx,0,z+dz),(x+dx*.35+height*.22,height*.58,z+dz*.35),(x+height*.35,height,z)],[(0,1,2),(0,2,3),(2,1,0),(3,2,0)],['leafMid','leafLight','dryGrass'][i%3])
    h.DETAIL=True
    for i in range(6):
        x=(rng.random()-.5)*1.3;z=(rng.random()-.5)*1.3;y=.26+rng.random()*.22;h.beam('Seed stalk',(x,0,z),(x+.05,y,z),.004,'dryGrass',5);h.cyl('Seed head',(x+.05,y,z),.018,.07,'ivory',(0,1,0),6,0)
    h.DETAIL=False;h.finish_asset()

def studio():
    s=bpy.data.scenes.new('00 • HARBOR CLUB');bpy.context.window.scene=s
    s.render.engine='CYCLES';s.cycles.samples=40;s.cycles.use_denoising=True
    s.render.resolution_x=1600;s.render.resolution_y=1000;s.render.resolution_percentage=100
    s.world=bpy.data.worlds.new('Club studio');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.10,.15,.19,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.45
    cols=[c for c in bpy.data.collections if c.get('asset_id')]
    for i,c in enumerate(cols):
        bounds=[h.gv(o.matrix_world@Vector(p)) for o in c.objects if o.type=='MESH' for p in o.bound_box]
        extent=max(max(p[k] for p in bounds)-min(p[k] for p in bounds) for k in range(3));scale=1.55/max(extent,.01)
        root=bpy.data.objects.new(c.name+' display',None);s.collection.objects.link(root);root.location=((i%4-1.5)*2.2,(i//4-.5)*2.2,.95);root.scale=(scale,scale,scale)
        for o in c.objects:
            copy=o.copy();copy.data=o.data;s.collection.objects.link(copy);copy.parent=root
    bpy.ops.mesh.primitive_plane_add(size=200);floor=bpy.context.object;floor.data.materials.append(h.mat('Studio floor','273A40',.8))
    for pos,power,col in [((-4,-4,7),1100,(1,.85,.64)),((4,-1,5),900,(.60,.81,1)),((0,4,6),1200,(.85,1,.93))]:
        bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.size=5;o.data.color=col;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add(location=(6,-10,10));o=bpy.context.object;o.rotation_euler=(Vector((0,.4,1))-o.location).to_track_quat('-Z','Y').to_euler();o.data.type='ORTHO';o.data.ortho_scale=12.4;s.camera=o;s.view_settings.view_transform='AgX';s.render.filepath=str(h.ROOT/'previews'/'blender-arcade.png')

if __name__=='__main__':
    if '--export-only' not in sys.argv:
        bpy.ops.wm.read_factory_settings(use_empty=True);h.materials()
        for name,col in [('boardBlack','171D22'),('boardCream','ECE1C7'),('boardRed','BD433A'),('boardGreen','26735F'),('targetBlue','277DAB'),('targetGold','F3CC3C'),('leafDark','486B4D'),('leafMid','678653'),('leafLight','91A568'),('dryGrass','B5AF7C'),('bark','756A53')]:h.M[name]=h.mat(name,col,.85,0)
        h.M['targetCarrier']=h.mat('Reactive carrier','32616A',.4,.38,role='club-target')
        for fn in [cockpit,recurve,arrow,dart,dartboard,archery_target,shooting_target,race_gate,club_tree,grass_patch]:fn()
        studio()
    h.export_pack();p=h.OUT/'harbor-pack.js';(h.OUT/'arcade-pack.js').write_text(p.read_text().replace('HARBOR_ASSET_PACK7','ARCADE_ASSET_PACK10').replace('blender_harbor.py','blender_arcade.py'));p.unlink()
    bpy.context.window.scene=bpy.data.scenes['00 • HARBOR CLUB']
    if '--export-only' not in sys.argv:bpy.ops.wm.save_as_mainfile(filepath=str(h.ART/'harbor-arcade.blend'),compress=True)
    if '--render' in sys.argv:bpy.ops.render.render(write_still=True)
