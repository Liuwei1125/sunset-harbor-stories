"""Original stylized game props. Blender meters, Y-up / -Z-forward at export.
Run via tools/build_blender_assets.py --armory [--render] [--export-only].
Shared Harbor exporter keeps material, LOD and joint contracts identical.
"""
import sys
import json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import blender_harbor as h
import bpy
from mathutils import Vector

h.OUT = h.ROOT / 'assets' / 'armory'
h.OUT.mkdir(exist_ok=True)
SPECS = {
    'ar7-rifle': {'label': 'AR-7 • Harbor assault rifle', 'muzzle': [0,.055,-.985], 'eject': [.085,.045,-.17], 'support': [-.03,-.075,-.36]},
    'pump-shotgun': {'label': 'PUMP • Dockside shotgun', 'muzzle': [0,.065,-1.10], 'eject': [.08,.045,-.15], 'support': [-.03,-.075,-.52]},
    'longwatch-sniper': {'label': 'LONGWATCH • Precision rifle', 'muzzle': [0,.055,-1.33], 'eject': [.083,.06,-.18], 'support': [-.03,-.075,-.38]},
    'sidearm-pistol': {'label': '9MM • Harbor sidearm', 'muzzle': [0,.035,-.38], 'eject': [.07,.07,-.17], 'support': [-.04,-.07,-.055]},
    'vector-smg': {'label': 'VECTOR • Compact automatic', 'muzzle': [0,.07,-.60], 'eject': [.08,.06,-.15], 'support': [0,-.09,-.37]},
    'pulse-grenade': {'label': 'PULSE • Arcade grenade', 'muzzle': [0,.05,-.07], 'eject': [0,0,0], 'support': [-.04,0,-.08]},
    'ember-bottle': {'label': 'EMBER • Incendiary prop', 'muzzle': [0,.30,-.06], 'eject': [0,0,0], 'support': [-.06,0,-.07]},
    'comet-launcher': {'label': 'COMET • Rocket launcher', 'muzzle': [0,.08,-.91], 'eject': [0,0,.15], 'support': [0,-.06,-.44]},
}

def grip():
    h.box('Textured pistol grip', (0,-.145,-.02), (.10,.245,.13), 'rubber', .018, (-.18,0,0))
    h.tube('Trigger guard', [(-.048,-.07,-.075),(-.048,-.15,-.11),(-.048,-.15,-.22),(-.048,-.07,-.22)], .010,'steel')
    h.box('Trigger', (0,-.09,-.145), (.02,.07,.025),'alloy',.005)

def stock(wood=False):
    h.loft('Sculpted shoulder stock',[(.02,.049,.055,.015),(.19,.055,.059,-.002),(.35,.075,.09,-.015),(.43,.075,.10,-.015)],'wood' if wood else 'teal',12,False)
    h.box('Rubber butt pad',(0,-.017,.443),(.16,.212,.038),'rubber',.017)
    h.box('Cheek rest',(0,.065,.27),(.114,.042,.23),'woodLight' if wood else 'black',.016)

def rail(z,length):
    h.box('Optics rail',(0,.14,z),(.095,.024,length),'steel',.004)
    h.DETAIL=True
    for i in range(max(2,int(length/.038))):
        h.box('Rail cross slot',(0,.154,z-length/2+.02+i*.038),(.103,.012,.012),'black',.002)
    h.DETAIL=False

def firearm(name):
    s=SPECS[name];sniper='sniper' in name;shotgun='shotgun' in name
    h.asset(name,s['label']);h.joint()
    grip();stock(shotgun)
    h.box('Beveled receiver',(0,.035,-.165),(.148,.155,.35),'teal' if sniper else 'steel',.019)
    h.box('Upper receiver spine',(0,.108,-.17),(.12,.035,.33),'black',.009)
    h.box('Ejection recess',(.077,.051,-.16),(.012,.055,.125),'black',.003)
    front=-1.32 if sniper else -1.09 if shotgun else -.975
    h.cyl('Barrel',(0,.055,(front-.34)/2),.027,abs(front+.34),'black',(0,0,1),20,.004)
    h.cyl('Muzzle shoulder',(0,.055,front+.035),.043,.082,'steel',(0,0,1),20,.004)
    h.cyl('Dark bore',(0,.055,front-.006),.020,.004,'black',(0,0,1),16,0)
    if shotgun:
        h.cyl('Magazine tube',(0,-.025,-.60),.030,.72,'steel',(0,0,1),16,.006)
        h.joint('pump',(0,-.03,-.56),'pump')
        h.loft('Oiled wood fore-end',[(-.72,.06,.047,-.03),(-.68,.073,.055,-.03),(-.44,.073,.055,-.03),(-.42,.06,.047,-.03)],'wood',12,False)
        h.DETAIL=True
        for i in range(7): h.torus('Fore-end groove',(0,-.03,-.47-i*.032),.06,.003,'black',(0,0,1),16,4)
        h.DETAIL=False
    else:
        h.box('Vented fore-end',(0,.015,-.54),(.137,.15,.39),'teal',.016)
        h.DETAIL=True
        for side in [-1,1]:
            for i in range(5): h.box('Vent inset',(side*.069,.028,-.40-i*.06),(.006,.035,.034),'black',.003)
        h.DETAIL=False
        rail(-.38,.67)
        h.joint('magazine',(0,-.09,-.22),'magazine')
        h.box('Removable magazine',(0,-.215,-.225),(.094,.27 if not sniper else .18,.14),'black',.012, (.06,0,0))
        h.box('Magazine floor plate',(0,-.35 if not sniper else -.31,-.218),(.11,.025,.153),'steel',.005)
        h.DETAIL=True
        for side in [-1,1]:
            for i in range(2): h.box('Magazine pressed rib',(side*.049,-.215,-.19-i*.059),(.005,.16,.015),'alloy',.002)
        h.DETAIL=False
    h.joint('bolt',(0,.05,-.16),'bolt')
    h.box('Bolt face',(.081,.054,-.165),(.013,.04,.075),'alloy',.004)
    if sniper:
        h.beam('Bolt handle',(.06,.065,-.03),(.15,.002,.005),.016,'steel')
        h.cyl('Bolt handle knob',(.15,.002,.005),.026,.037,'black',(1,0,0),12,.006)
    h.joint()
    if sniper:
        for z in [-.38,-.09]:
            h.box('Optic mount',(0,.195,z),(.068,.085,.07),'steel',.007)
            h.torus('Scope clamp',(0,.265,z),.058,.014,'steel',(0,0,1),20,6)
        h.cyl('Scope main tube',(0,.265,-.23),.046,.46,'black',(0,0,1),24,.006)
        h.cyl('Objective housing',(0,.265,-.51),.078,.13,'teal',(0,0,1),24,.007)
        h.cyl('Coated objective lens',(0,.265,-.578),.061,.004,'glass',(0,0,1),24,0)
        h.cyl('Eyepiece',(0,.265,.035),.058,.115,'rubber',(0,0,1),20,.007)
        h.cyl('Elevation dial',(0,.337,-.22),.033,.053,'steel',n=16,bevel=.005)
    elif not shotgun:
        h.box('Reflex pedestal',(0,.194,-.15),(.083,.066,.083),'black',.008)
        for side in [-1,1]: h.box('Reflex frame',(side*.052,.25,-.15),(.018,.092,.035),'steel',.004)
        h.box('Reflex frame top',(0,.297,-.15),(.12,.016,.035),'steel',.004)
        h.box('Amber aiming dot',(0,.251,-.15),(.009,.009,.01),'light',.002)
    else: h.cyl('Front bead',(0,.094,-1.03),.010,.014,'alloy',n=10,bevel=.002)
    h.DETAIL=True
    for side in [-1,1]:
        for z in [-.06,-.285]: h.cyl('Receiver pin',(side*.077,.015,z),.013,.005,'alloy',(1,0,0),10,.002)
    h.DETAIL=False
    for socket in ['muzzle','eject','support']: h.joint(socket,s[socket],'socket')
    h.finish_asset()

def sidearm(name):
    s=SPECS[name];smg=name=='vector-smg';h.asset(name,s['label']);h.joint();grip()
    if smg:
        h.box('Compact receiver',(0,.01,-.18),(.148,.22,.36),'teal',.025)
        h.box('Lower magazine well',(0,-.15,-.20),(.13,.16,.18),'steel',.012)
        h.box('Handguard',(0,.035,-.405),(.14,.16,.20),'black',.014)
        for x in [-.059,.059]: h.beam('Folding stock rail',(x,.04,.02),(x,.04,.33),.018,'steel')
        h.box('Stock butt',(0,-.015,.35),(.14,.20,.06),'rubber',.013)
        rail(-.21,.36)
        h.cyl('Compact barrel',(0,.07,-.52),.032,.16,'steel',(0,0,1),16,.004)
        h.cyl('Muzzle recess',(0,.07,-.603),.022,.004,'black',(0,0,1),16,0)
        h.box('Sight hood',(0,.21,-.12),(.10,.09,.035),'steel',.006)
        h.box('Sight glass',(0,.21,-.14),(.07,.055,.009),'glass',.004)
    else:
        h.box('Polymer frame',(0,-.035,-.17),(.135,.10,.32),'teal',.015)
        h.box('Grip backstrap',(0,-.18,.033),(.105,.17,.023),'black',.01,(-.18,0,0))
    h.joint('magazine',(0,-.105,-.19 if smg else -.01),'magazine')
    h.box('Removable magazine',(0,-.28 if smg else -.175,-.19 if smg else -.005),(.078,.26 if smg else .17,.12),'black',.01)
    h.box('Magazine base',(0,-.42 if smg else -.267,-.19 if smg else .004),(.096,.025,.133),'alloy',.004)
    h.joint('slide' if not smg else 'bolt',(0,.05,-.15),'slide' if not smg else 'bolt')
    if smg: h.box('Bolt window',(.079,.065,-.15),(.012,.05,.09),'alloy',.004)
    else:
        h.box('Machined slide',(0,.047,-.20),(.135,.12,.36),'steel',.013)
        h.cyl('Barrel recess',(0,.035,-.383),.027,.008,'black',(0,0,1),16,0)
        for z in [-.04,-.32]:h.box('Raised sight',(0,.12,z),(.045,.035,.028),'black',.003)
        h.box('Front sight dot',(0,.133,-.335),(.009,.009,.004),'light',.001)
        h.DETAIL=True
        for x in [-.07,.07]:
            for i in range(5):h.box('Slide serration',(x,.049,-.04-i*.022),(.006,.067,.009),'black',.002)
        h.DETAIL=False
    for socket in ['muzzle','eject','support']:h.joint(socket,s[socket],'socket')
    h.finish_asset()

def ordnance(name):
    s=SPECS[name];h.asset(name,s['label']);h.joint()
    if name=='pulse-grenade':
        h.loft('Faceted olive body',[(-.18,.02,.025,0),(-.15,.07,.105,0),(-.07,.10,.13,0),(.01,.07,.105,0),(.025,.02,.025,0)],'teal',16,False)
        h.cyl('Top cap',(0,.13,-.07),.044,.053,'steel',n=16,bevel=.006)
        h.box('Identification band',(0,0,-.169),(.11,.027,.009),'ivory',.003)
        h.joint('lever',(0,.15,-.07),'lever')
        h.box('Safety lever',(.055,.065,-.055),(.024,.235,.046),'alloy',.006, (0,0,-.24))
        h.torus('Pull ring',(-.047,.161,-.07),.033,.006,'alloy',(0,0,1),20,6)
    elif name=='ember-bottle':
        h.loft('Green bottle',[(-.155,.018,.14,.01),(-.135,.055,.15,.01),(-.06,.074,.16,.01),(.015,.055,.15,.01),(.035,.018,.14,.01)],'glass',20,True)
        h.cyl('Bottle shoulder',(0,.15,-.06),.057,.05,'teal',n=20,bevel=.015)
        h.cyl('Bottle neck',(0,.225,-.06),.031,.12,'glass',n=16,bevel=.005)
        h.cyl('Lip',(0,.283,-.06),.038,.025,'alloy',n=16,bevel=.004)
        h.box('Warm paper label',(0,.005,-.153),(.105,.125,.01),'ivory',.003)
        h.box('Label ember stripe',(0,.005,-.16),(.063,.019,.004),'red',.001)
        h.tube('Cloth wick',[(0,.285,-.06),(.025,.322,-.05),(.054,.30,-.045)],.014,'rope',8)
    else:
        grip();h.cyl('Launcher tube',(0,.08,-.32),.112,1.12,'teal',(0,0,1),24,.008)
        for z in [-.88,.22]:
            h.cyl('Protective end collar',(0,.08,z),.137,.065,'rubber',(0,0,1),24,.008)
            h.cyl('Dark tube opening',(0,.08,z+(-.035 if z<0 else .035)),.095,.006,'black',(0,0,1),24,0)
        h.box('Shoulder pad',(0,-.02,.095),(.19,.17,.22),'rubber',.025)
        h.box('Front support',(0,-.11,-.45),(.095,.23,.13),'steel',.012)
        h.box('Raised sight',(0,.26,-.25),(.08,.16,.09),'black',.008)
        h.box('Sight glass',(0,.30,-.299),(.058,.076,.01),'glass',.004)
        for z in [-.61,-.015]:h.cyl('Tube reinforcement',(0,.08,z),.12,.033,'steel',(0,0,1),20,.004)
        h.joint('round',(0,.08,.12),'round')
        h.cyl('Loading round',(0,.08,.13),.080,.17,'ivory',(0,0,1),16,.003)
    for socket in ['muzzle','eject','support']:h.joint(socket,s[socket],'socket')
    h.finish_asset()

def studio():
    scene=bpy.data.scenes.new('00 • HARBOR ARMORY');bpy.context.window.scene=scene
    scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
    scene.render.resolution_x=1800;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
    scene.world=bpy.data.worlds.new('Armory studio');scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.20,.26,.30,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.55
    for i,name in enumerate(SPECS):
        o=bpy.data.objects.new(name,None);o.instance_type='COLLECTION';o.instance_collection=bpy.data.collections[name]
        scene.collection.objects.link(o);o.location=((-1.1+i*1.1,.45,.4) if i<3 else (-1.30+(i-3)*.67,-1.1,.4))
    bpy.ops.mesh.primitive_plane_add(size=200);o=bpy.context.object;o.location.z=-.025;o.data.materials.append(h.mat('Armory slate','263B42',.85))
    for name,p,power,size,col in [('Key',(-3,-2,5),450,4,(1,.86,.67)),('Fill',(3,-1,3),330,3,(.64,.82,1)),('Rim',(0,4,4),500,3,(1,.9,.75))]:
        bpy.ops.object.light_add(type='AREA',location=p);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.size=size;o.data.color=col
        o.rotation_euler=(Vector((0,.3,.4))-o.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add(location=(3,-4,7));c=bpy.context.object;c.rotation_euler=(Vector((0,.05,.35))-c.location).to_track_quat('-Z','Y').to_euler()
    c.data.type='ORTHO';c.data.ortho_scale=5.45;scene.camera=c;scene.view_settings.view_transform='AgX'
    scene.render.filepath=str(h.ROOT/'previews'/'blender-armory.png')
    return scene

if __name__=='__main__':
    if '--export-only' not in sys.argv:
        bpy.ops.wm.read_factory_settings(use_empty=True);h.materials()
        for name in SPECS:
            if name in ['sidearm-pistol','vector-smg']:sidearm(name)
            elif name in ['pulse-grenade','ember-bottle','comet-launcher']:ordnance(name)
            else:firearm(name)
        studio()
    h.export_pack()
    p=h.OUT/'harbor-pack.js';(h.OUT/'armory-pack.js').write_text(p.read_text().replace('HARBOR_ASSET_PACK7','ARMORY_ASSET_PACK8').replace('blender_harbor.py','blender_armory.py'));p.unlink()
    bpy.context.window.scene=bpy.data.scenes['00 • HARBOR ARMORY']
    if '--export-only' not in sys.argv: bpy.ops.wm.save_as_mainfile(filepath=str(h.ART/'harbor-armory.blend'),compress=True)
    if '--render' in sys.argv: bpy.ops.render.render(write_still=True)
