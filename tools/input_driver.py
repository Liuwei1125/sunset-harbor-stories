from pathlib import Path
from playwright.sync_api import sync_playwright
import json,math,time
from verify_config import ROOT, OUT, PREVIEW, CHROMIUM
class InputRunner:
 def __init__(self,page): self.p=page;self.events=[];self.down=set()
 def step(self,n=1):
  self.events.append({"frames":n}); self.p.evaluate('(n)=>{for(let i=0;i<n;i++){__experience.snapshotActors();__experience.update(1/60);}}',n)
 def key(self,key,yes):
  if yes and key not in self.down:self.p.keyboard.down(key);self.down.add(key);self.events.append({'key':key,'down':True})
  if not yes and key in self.down:self.p.keyboard.up(key);self.down.remove(key);self.events.append({'key':key,'down':False})
 def stop(self):
  for k in list(self.down): self.key(k,False)
 def state(self):return self.p.evaluate('({pos:{...__experience.player.pos},yaw:__experience.cam.yaw,car:__experience.state.car?{kind:__experience.state.car.kind,yaw:__experience.state.car.yaw,speed:__experience.state.car.speed,pos:{...__experience.state.car.pos}}:null,hp:__experience.player.hp,mission:__experience.experience.mission,result:__experience.experience.result,err:document.querySelector("#error").textContent})')
 def look(self,heading):
  self.stop();d=(heading-self.state()['yaw']+math.pi)%(2*math.pi)-math.pi
  k='ArrowLeft' if d>0 else 'ArrowRight';self.key(k,True);self.step(max(1,round(abs(d)/1.5*60)));self.key(k,False)
 def walk(self,x,z,epsilon=.8,maxsecs=80,crouch=False):
  self.stop()
  if crouch:self.key('Control',True)
  for _ in range(int(maxsecs*4)):
   s=self.state();px,pz=s['pos']['x'],s['pos']['z'];d=math.hypot(x-px,z-pz)
   if d<epsilon: self.stop();self.step(15);return True
   if s['hp']<=0 or s['err']:raise RuntimeError('walker failed '+str(s))
   wanted=math.atan2(-(x-px),-(z-pz));delta=(wanted-s['yaw']+math.pi)%(2*math.pi)-math.pi
   if abs(delta)>.12:
    self.key('w',False);self.key('Control',False);self.look(wanted)
    if crouch:self.key('Control',True)
   self.key('w',True);self.step(min(15,max(1,int(d/3*60))))
  self.stop();raise RuntimeError('walk timeout '+str(self.state()))
 def press(self,key,n=1):self.key(key,True);self.step(n);self.key(key,False);self.step(3)
 def drive_straight(self,x,z,medium='land',epsilon=3,maxsecs=60):
  self.stop()
  for _ in range(int(maxsecs*5)):
   s=self.state();c=s['car']
   if not c:raise RuntimeError('lost vehicle '+str(s))
   dx,dz=x-c['pos']['x'],z-c['pos']['z'];d=math.hypot(dx,dz);v=c['speed'];angle=math.atan2(-dx,-dz);delta=(angle-c['yaw']+math.pi)%(2*math.pi)-math.pi
   self.key('a',delta>.06 and d>epsilon);self.key('d',delta<-.06 and d>epsilon)
   decel=25 if medium=='land' else 8
   braking=d<max(epsilon,abs(v)*abs(v)/(2*decel)+1.5)
   self.key('w',not braking);self.key('s',braking and v>.5)
   if d<epsilon and abs(v)<1.0:self.stop();self.step(40);return True
   self.step(12)
  self.stop();raise RuntimeError('drive timeout '+str(self.state()))
 def capture(self,name):
  self.p.evaluate('__experience.render(1)');self.p.screenshot(path=str(PREVIEW/(name+'.png')))

 def clear_visible(self,maxsecs=12):
  self.stop(); self.press('4'); self.p.dispatch_event('#view','mousedown',{'button':2,'buttons':2}); self.step(4)
  firing=False
  for i in range(int(maxsecs*10)):
   data=self.p.evaluate('''()=>{const g=__experience;const es=g.combat.units.filter(e=>e.alive&&dist2(e.pos,g.player.pos)<95&&lineClear(g.cam.eye,unitChest(e))).sort((a,b)=>dist2(a.pos,g.player.pos)-dist2(b.pos,g.player.pos));return {e:es[0]?{pos:unitChest(es[0]),hp:es[0].hp}:null,eye:g.cam.eye,yaw:g.cam.yaw,pitch:g.cam.pitch,recoil:g.cam.recoil,ammo:g.weapons[g.state.weapon].ammo,dead:g.state.dead};}''')
   if not data['e'] or data['dead']:break
   v={k:data['e']['pos'][k]-data['eye'][k] for k in ('x','y','z')};desired=math.atan2(-v['x'],-v['z']);pitch=math.atan2(v['y'],math.hypot(v['x'],v['z']));delta=(desired-data['yaw']+math.pi)%(2*math.pi)-math.pi
   dx=-delta/.0015;dy=(data['pitch']+data['recoil']-pitch)/.0021
   self.events.append({'mouseLook':[dx,dy]}); self.p.evaluate('([x,y])=>document.dispatchEvent(new MouseEvent("mousemove",{bubbles:true,movementX:x,movementY:y}))',[dx,dy]);self.step(2)
   if not firing:self.p.dispatch_event('#view','mousedown',{'button':0,'buttons':3});self.events.append({'fire':True});firing=True
   if data['ammo']==0:self.press('r')
   self.step(4)
  self.p.evaluate('window.dispatchEvent(new MouseEvent("mouseup",{button:0,bubbles:true}));window.dispatchEvent(new MouseEvent("mouseup",{button:2,bubbles:true}));'); self.events.append({'fire':False});self.step(5)

 def reverse_to(self,x,z,epsilon=4,maxsecs=35):
  self.stop()
  for _ in range(int(maxsecs*5)):
   s=self.state();c=s['car']
   if not c:raise RuntimeError('lost reversing vehicle')
   dx,dz=x-c['pos']['x'],z-c['pos']['z'];d=math.hypot(dx,dz);v=c['speed'];angle=math.atan2(-dx,-dz)+math.pi;delta=(angle-c['yaw']+math.pi)%(2*math.pi)-math.pi
   self.key('a',delta<-.07 and d>epsilon);self.key('d',delta>.07 and d>epsilon)
   braking=d<max(epsilon,abs(v)*abs(v)/32+1)
   self.key('s',not braking);self.key('w',braking and v<-.5)
   if d<epsilon and abs(v)<1.0:self.stop();self.step(200);return True
   self.step(12)
  raise RuntimeError('reverse timeout '+str(self.state()))
 def ship_straight(self,z,epsilon=2,maxsecs=65):
  self.stop()
  for _ in range(int(maxsecs*5)):
   s=self.state();c=s['car']
   if s['result'] and s['result']['success']:self.stop();return
   if not c:raise RuntimeError('ship missing')
   error=c['pos']['z']-z;v=c['speed'];desired=max(-3.5,min(17,error*.65))
   self.key('w',v<desired-.25);self.key('s',v>desired+.25)
   if abs(error)<epsilon and abs(v)<.9:self.stop();self.step(70);return True
   self.step(12)
  self.stop();raise RuntimeError('ship timeout '+str(self.state()))
 def heli_z(self,z,epsilon=4,maxsecs=60):
  self.stop()
  for _ in range(int(maxsecs*5)):
   s=self.state();c=s['car']
   if s['result'] and s['result']['success']:return True
   if not c:raise RuntimeError('helicopter missing')
   err=c['pos']['z']-z;v=c['speed'];brake=abs(err)<abs(v)/1.5+2.4
   self.key('w',err>epsilon and not brake);self.key('s',err<-epsilon and not brake)
   if abs(err)<epsilon+1 and abs(v)<1.0:self.stop();self.step(60);return True
   self.step(12)
  raise RuntimeError('heli transit timeout '+str(self.state()))
 def altitude(self,y,maxsecs=20):
  self.stop()
  for _ in range(maxsecs*5):
   c=self.state()['car'];err=y-c['pos']['y']
   self.key('Space',err>.65);self.key('Control',err<-.65)
   self.step(12)
   if abs(err)<.65:self.stop();self.step(60);return True
  self.stop()
