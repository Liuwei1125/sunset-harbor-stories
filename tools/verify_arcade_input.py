"""Real browser input, with only time advanced deterministically between inputs."""
from playwright.sync_api import sync_playwright
from verify_config import ROOT,OUT,PREVIEW,CHROMIUM
import json,math,hashlib

def tick(page,seconds):
 page.evaluate('(seconds)=>{for(let i=0;i<Math.round(seconds*120);i++)clubStep(1/120);clubCamera();clubHUD();}',seconds)

def setup(page,mode,level=0):
 page.evaluate('clubLobby()')
 page.locator('[data-mode="'+mode+'"]').click()
 page.locator('[data-level="'+str(level)+'"]').click()
 page.locator('#club-start').click();page.locator('#club-go').click();tick(page,3.1)

def target_angles(page,mode):
 return page.evaluate('''mode=>{
 const r=CLUB.run,arc=mode==='archery';clubCamera();let p;
 if(mode==='shooting'){const t=r.targets.find(t=>t.active&&!t.friend&&t.fold<.2);if(!t)return null;p=V(t.x,t.y+1.24*t.scale,t.z+.09*t.scale);}
 else if(arc){const t=r.targets[r.activeTarget];p=V(t.x,t.y,t.z+.055*t.radius/.61);}
 else p=V(0,1.73+.103,-2.37);
 const speed=arc?62:mode==='darts'?13.5:10000,g=arc?9.81:mode==='darts'?7.2:0,wind=arc?r.wind:0;
 let time=Math.hypot(p.x-cam.eye.x,p.z-cam.eye.z)/speed,yaw,pitch;
 for(let i=0;i<6;i++){const dx=p.x-cam.eye.x-wind*.75*time*(time+1/120)/2,dy=p.y-cam.eye.y+g*time*(time+1/120)/2,dz=p.z-cam.eye.z;yaw=Math.atan2(-dx,-dz);pitch=Math.atan2(dy,Math.hypot(dx,dz));if(g){const launch=clubLaunchProfile(1,{yaw,pitch},bx(basis(yaw,pitch),V(0,0,-1)));time=(launch.plane-launch.origin.z)/(launch.dir.z*speed);}else time=Math.hypot(dx,dz)/(speed*Math.cos(pitch));}
 const scale=(mode==='darts'?.00045:arc?.0009:.0018)*CLUB.save.settings.sensitivity*(1-r.aim*.55);
 return {dx:(CLUB.look.yaw-yaw)/scale,dy:(CLUB.look.pitch-pitch)/scale};
 }''',mode)

with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=CHROMIUM)
 page=b.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1);page.add_init_script('window.requestAnimationFrame=()=>0')
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto((ROOT/'arcade.html').as_uri());page.wait_for_function('!!window.__club',polling=20)
 outputs=[]
 for mode in ['shooting','darts','archery']:
  setup(page,mode);mx,my=720,450;page.mouse.move(mx,my);page.mouse.down(button='right');tick(page,.3)
  for attempt in range(150):
   state=page.evaluate('({phase:CLUB.phase,cooldown:CLUB.run.cooldown,reload:CLUB.run.reload,projectile:!!CLUB.run.projectile})')
   if state['phase']=='result':break
   if state['cooldown']>0 or state['projectile'] or (state.get('reload') or 0)>0:tick(page,.1);continue
   aim=target_angles(page,mode)
   if not aim:tick(page,.2);continue
   mx+=aim['dx'];my+=aim['dy'];page.mouse.move(mx,my)
   page.keyboard.down('Shift');page.keyboard.down('Space');tick(page,.03 if mode=='shooting' else 1.25)
   page.keyboard.up('Space');page.keyboard.up('Shift');tick(page,.04 if mode=='shooting' else .85)
   if page.evaluate('CLUB.run.shots')==3:
    page.evaluate('clubRender();clubHUD()');page.screenshot(path=str(PREVIEW/('club-'+mode+'-gameplay.png')))
  page.mouse.up(button='right');page.evaluate('clubRender();clubHUD()')
  res=page.evaluate('({mode:CLUB.mode,phase:CLUB.phase,result:CLUB.result,shots:CLUB.run.shots,hits:CLUB.run.hits,elapsed:CLUB.run.elapsed,score:CLUB.run.score})');outputs.append(res);print(json.dumps(res,ensure_ascii=False),flush=True)
  page.screenshot(path=str(PREVIEW/('club-'+mode+'-input-result.png')))
  page.locator('#club-result-next').click();tick(page,3.1);res['nextStarted']=page.evaluate('CLUB.level===1&&CLUB.phase==="playing"&&CLUB.run.elapsed<.2')
 # Keyboard-only steering, throttle and braking, all the way through a race.
 setup(page,'race');pressed=set()
 for frame in range(2000):
  values=page.evaluate('''()=>{const r=CLUB.run;if(CLUB.phase==='result')return null;const c=r.car,n=clubTrackNearest(CLUB.track,c.pos),p=clubTrackAt(CLUB.track,n.s+8+c.speed*.40),far=clubTrackAt(CLUB.track,n.s+25),desired=Math.atan2(-(p.pos.x-c.pos.x),-(p.pos.z-c.pos.z)),error=Math.atan2(Math.sin(desired-c.yaw),Math.cos(desired-c.yaw));return {error,speed:c.speed,bend:Math.abs(Math.atan2(Math.sin(far.yaw-n.yaw),Math.cos(far.yaw-n.yaw)))};}''')
  if values is None:break
  desired_speed=max(13,min(29,29-values['bend']*14))
  want=set()
  if values['speed']<desired_speed+.2:want.add('w')
  if values['speed']>desired_speed+1.5:want.add('s')
  if values['error']>.035:want.add('a')
  if values['error']<-.035:want.add('d')
  for key in pressed-want:page.keyboard.up(key)
  for key in want-pressed:page.keyboard.down(key)
  pressed=want;tick(page,.05)
  if frame==170:
   page.evaluate('clubRender();clubHUD()');page.screenshot(path=str(PREVIEW/'club-race-gameplay.png'))
 for key in pressed:page.keyboard.up(key)
 page.evaluate('clubRender();clubHUD()');res=page.evaluate('({mode:CLUB.mode,phase:CLUB.phase,result:CLUB.result,elapsed:CLUB.run.elapsed,gates:CLUB.run.checkpoints,collisions:CLUB.run.collisions})');outputs.append(res);print(json.dumps(res,ensure_ascii=False),flush=True)
 page.screenshot(path=str(PREVIEW/'club-race-input-result.png'))
 page.locator('#club-result-next').click();tick(page,3.1);res['nextStarted']=page.evaluate('CLUB.level===1&&CLUB.phase==="playing"&&CLUB.run.elapsed<.2')
 passed=sum(r['phase']=='result' and r['result']['success'] and r['nextStarted'] for r in outputs)
 report={'sha256':hashlib.sha256((ROOT/'arcade.html').read_bytes()).hexdigest(),'passed':passed,'total':4,'results':outputs,'errors':errors,'method':'Real Playwright mouse drags, right button, Space/Shift and WASD. All four representative events complete through gameplay and their public Next controls start the following event; only the production 120 Hz simulation clock is advanced deterministically. No position, checkpoint, hit or score is injected.'}
 (OUT/'arcade-native-input.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print('errors',errors)
 b.close()
 if passed!=4 or errors:raise SystemExit(1)
