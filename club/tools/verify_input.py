"""Native keyboard/mouse completions and simultaneous CDP touch contacts.
Only time is advanced deterministically; native events own all gameplay controls.
"""
from playwright.sync_api import sync_playwright
from browser_common import OUT,PREVIEW,CHROME,server,boot,wait_ready,tick,native_start,runtime_info
import json,math

checks=[];errors=[];completions=[]
def check(name,passed,detail=None):checks.append({'name':name,'pass':bool(passed),'detail':detail});print(('PASS ' if passed else 'FAIL ')+name,flush=True)

ANGLES='''mode=>{
 const sim=__club.sim,r=sim.state.run,camera=sim.camera(),arc=mode==='archery';let p;
 if(mode==='shooting'){const t=r.targets.find(t=>t.active&&!t.friend&&t.fold<.2);if(!t)return null;p={x:t.x,y:t.y+1.24*t.scale,z:t.z+.09*t.scale};}
 else if(arc){const t=r.targets[r.activeTarget];p={x:t.x,y:t.y,z:t.z+.055*t.radius/.61};}
 else p={x:0,y:1.73+.103,z:-2.37};
 const speed=arc?62:mode==='darts'?13.5:10000,g=arc?9.81:mode==='darts'?7.2:0,wind=arc?r.wind:0;
 let time=Math.hypot(p.x-camera.eye.x,p.z-camera.eye.z)/speed,yaw,pitch;
 for(let i=0;i<6;i++){const dx=p.x-camera.eye.x-wind*.75*time*(time+1/120)/2,dy=p.y-camera.eye.y+g*time*(time+1/120)/2,dz=p.z-camera.eye.z;yaw=Math.atan2(-dx,-dz);pitch=Math.atan2(dy,Math.hypot(dx,dz));if(g){const dir={x:-Math.sin(yaw)*Math.cos(pitch),y:Math.sin(pitch),z:-Math.cos(yaw)*Math.cos(pitch)},launch=sim.launchProfile(1,{yaw,pitch},dir);time=(launch.plane-launch.origin.z)/(launch.dir.z*speed);}else time=Math.hypot(dx,dz)/(speed*Math.cos(pitch));}
 const scale=(mode==='darts'?.00045:arc?.0009:.0018)*sim.state.save.settings.sensitivity*(1-r.aim*.55);
 return {dx:(sim.state.look.yaw-yaw)/scale,dy:(sim.state.look.pitch-pitch)/scale};
}'''

with server(),sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=CHROME)
 context,page=boot(browser);page.on('pageerror',lambda e:errors.append(str(e)));device=runtime_info(page)
 # Pointer events emit a move when a second mouse button changes; verify both
 # press orders and independent releases through native Chrome button events.
 for first,second in [('right','left'),('left','right')]:
  native_start(page,'shooting',playlist='endless');page.mouse.move(720,450)
  page.mouse.down(button=first);page.mouse.down(button=second);tick(page,.06)
  both=page.evaluate('__club.sim.state.held.has("action")&&__club.sim.state.held.has("secondary")&&__club.sim.state.run.shots>0')
  page.mouse.up(button='left');tick(page,.2)
  independent=page.evaluate('!__club.sim.state.held.has("action")&&__club.sim.state.held.has("secondary")');shots=page.evaluate('__club.sim.state.run.shots');tick(page,.3)
  stopped=page.evaluate('__club.sim.state.run.shots')==shots
  page.mouse.up(button='right');clear=page.evaluate('__club.sim.state.held.size===0')
  check(f'Native mouse chord {first} then {second} fires while aiming and releases independently',both and independent and stopped and clear)
 native_start(page,'shooting',playlist='endless');page.mouse.move(720,450);page.keyboard.down('Space');page.mouse.down();page.mouse.up()
 survives=page.evaluate('__club.sim.state.held.has("action")');page.keyboard.up('Space')
 check('Releasing mouse fire preserves a separately held keyboard fire source',survives and page.evaluate('__club.sim.state.held.size===0'))
 for mode in ['shooting','darts','archery']:
  native_start(page,mode);mx,my=720,450;page.mouse.move(mx,my);page.mouse.down(button='right');tick(page,.35)
  for attempt in range(180):
   state=page.evaluate('({phase:__club.sim.state.phase,cooldown:__club.sim.state.run.cooldown,reload:__club.sim.state.run.reload,projectile:!!__club.sim.state.run.projectile})')
   if state['phase']=='result':break
   if state['phase']!='playing':raise RuntimeError('Unexpected phase '+state['phase'])
   if state['cooldown']>0 or state['projectile'] or (state.get('reload') or 0)>0:tick(page,.1);continue
   aim=page.evaluate(ANGLES,mode)
   if not aim:tick(page,.2);continue
   mx+=aim['dx'];my+=aim['dy'];page.mouse.move(mx,my)
   page.keyboard.down('Shift');page.keyboard.down('Space');tick(page,.035 if mode=='shooting' else 1.25)
   page.keyboard.up('Space');page.keyboard.up('Shift');tick(page,.05 if mode=='shooting' else .85)
   if page.evaluate('__club.sim.state.run.shots')==3:
    page.screenshot(path=str(PREVIEW/f'{mode}-native-gameplay.png'))
  page.mouse.up(button='right');page.evaluate('__club.app.draw(1)');page.wait_for_timeout(100)
  row=page.evaluate('({mode:__club.sim.state.mode,phase:__club.sim.state.phase,success:__club.sim.state.result?.success,score:__club.sim.state.result?.score,elapsed:__club.sim.state.run.elapsed,shots:__club.sim.state.run.shots,hits:__club.sim.state.run.hits})');completions.append(row)
  page.screenshot(path=str(PREVIEW/f'{mode}-native-result.png'))
  if row['success']:
   page.locator('[data-action="next"]').click();page.wait_for_function('__club.sim.state.level===1&&__club.sim.state.phase==="countdown"',timeout=90000);tick(page,3.1);row['nextStarted']=page.evaluate('__club.sim.state.phase==="playing"&&__club.sim.state.run.elapsed<.25')
  check(mode+' completes through native mouse and keyboard and starts Next',row.get('success') and row.get('nextStarted'),row)
 # A full race through physical WASD presses, without steering-axis injection.
 native_start(page,'race');pressed=set()
 for frame in range(2400):
  values=page.evaluate('''async()=>{const r=__club.sim.state.run;if(__club.sim.state.phase==='result')return null;const {trackAt,trackNearest}=await import('./src/core/track.js'),c=r.car,n=trackNearest(__club.sim.state.track,c.pos),p=trackAt(__club.sim.state.track,n.s+8+c.speed*.40),far=trackAt(__club.sim.state.track,n.s+25),desired=Math.atan2(-(p.pos.x-c.pos.x),-(p.pos.z-c.pos.z)),error=Math.atan2(Math.sin(desired-c.yaw),Math.cos(desired-c.yaw));return {error,speed:c.speed,bend:Math.abs(Math.atan2(Math.sin(far.yaw-n.yaw),Math.cos(far.yaw-n.yaw)))};}''')
  if values is None:break
  desired_speed=max(13,min(29,29-values['bend']*14));want=set()
  if values['speed']<desired_speed+.2:want.add('w')
  if values['speed']>desired_speed+1.5:want.add('s')
  if values['error']>.035:want.add('a')
  if values['error']<-.035:want.add('d')
  for key in pressed-want:page.keyboard.up(key)
  for key in want-pressed:page.keyboard.down(key)
  pressed=want;tick(page,.05)
  if frame==170:page.screenshot(path=str(PREVIEW/'race-native-gameplay.png'))
 for key in pressed:page.keyboard.up(key)
 page.evaluate('__club.app.draw(1)');page.wait_for_timeout(100)
 row=page.evaluate('({mode:__club.sim.state.mode,phase:__club.sim.state.phase,success:__club.sim.state.result?.success,score:__club.sim.state.result?.score,elapsed:__club.sim.state.run.elapsed,checkpoints:__club.sim.state.run.checkpoints,collisions:__club.sim.state.run.collisions})');completions.append(row)
 page.screenshot(path=str(PREVIEW/'race-native-result.png'))
 if row['success']:
  page.locator('[data-action="next"]').click();page.wait_for_function('__club.sim.state.level===1&&__club.sim.state.phase==="countdown"',timeout=90000);tick(page,3.1);row['nextStarted']=page.evaluate('__club.sim.state.phase==="playing"&&__club.sim.state.run.elapsed<.25')
 check('Race completes through native WASD and starts Next',row.get('success') and row.get('nextStarted'),row)
 # Native Escape and browser blur both cancel held actions without releasing a projectile.
 for mode in ['race','shooting','darts','archery']:
  native_start(page,mode,playlist='endless');page.keyboard.down('Space');tick(page,.3);page.evaluate('window.dispatchEvent(new Event("blur"))');before=page.evaluate('({elapsed:__club.sim.state.run.elapsed,shots:__club.sim.state.run.shots})');tick(page,1)
  ok=page.evaluate('__club.sim.state.phase==="paused"&&__club.sim.state.held.size===0&&!__club.sim.state.run.charging') and before==page.evaluate('({elapsed:__club.sim.state.run.elapsed,shots:__club.sim.state.run.shots})')
  page.keyboard.up('Space');page.locator('[data-action="resume"]').click();check(mode+' blur pauses and cancels input without throwing',ok)
 context.close()
 # Real browser touch contacts in two orientations. This is input emulation, not a phone GPU claim.
 context,phone=boot(browser,mobile=True);phone.on('pageerror',lambda e:errors.append(str(e)));cdp=context.new_cdp_session(phone)
 for viewport in [{'width':390,'height':844},{'width':844,'height':390}]:
  phone.set_viewport_size(viewport)
  for mode in ['race','shooting','darts','archery']:
   native_start(phone,mode,playlist='endless',mobile=True);before=phone.evaluate('({yaw:__club.sim.state.look.yaw,carYaw:__club.sim.state.run.car?.yaw,shots:__club.sim.state.run.shots})')
   act=phone.locator('#touch-primary').bounding_box();other=phone.locator('#stick' if mode in ['race','shooting'] else '#touch-secondary').bounding_box()
   contacts=[{'id':1,'x':other['x']+other['width']/2,'y':other['y']+other['height']/2},{'id':2,'x':act['x']+act['width']/2,'y':act['y']+act['height']/2}]
   cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':contacts});tick(phone,.2)
   if mode in ['race','shooting']:contacts[0]['x']+=24
   contacts[1]['x']-=20;contacts[1]['y']-=8
   cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':contacts});tick(phone,1.3);cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});tick(phone,.5)
   physical=phone.evaluate('({speed:__club.sim.state.run.car?.speed,carYaw:__club.sim.state.run.car?.yaw,yaw:__club.sim.state.look.yaw,shots:__club.sim.state.run.shots,projectile:!!__club.sim.state.run.projectile,held:__club.sim.state.held.size,gl:document.getElementById("view").getContext("webgl2").getError()})')
   moving=(physical.get('speed',0)>0 and physical['carYaw']!=before['carYaw']) if mode=='race' else physical['yaw']!=before['yaw'] and (physical['shots']>0 or physical['projectile'])
   phone.locator('[data-action="pause"]').tap();frozen=phone.evaluate('__club.sim.state.run.elapsed');tick(phone,1);pause_ok=phone.evaluate('__club.sim.state.run.elapsed')==frozen;phone.locator('[data-action="resume"]').tap();tick(phone,2)
   phone.locator('#bank').tap();phone.wait_for_function('__club.app.ui.dialogKind==="result"');result_ok=phone.locator('[data-action="retry"]').is_visible();phone.locator('[data-action="retry"]').tap();phone.wait_for_function('__club.sim.state.phase==="countdown"');tick(phone,3.1)
   in_bounds=phone.evaluate('''()=>[...document.querySelectorAll('#touch button')].filter(e=>!e.hidden).every(e=>{const r=e.getBoundingClientRect();return r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight})&&document.documentElement.scrollWidth<=innerWidth''')
   check(f'Native touch {viewport["width"]}×{viewport["height"]} / {mode}',moving and physical['held']==0 and physical['gl']==0 and pause_ok and result_ok and in_bounds,physical)
   phone.screenshot(path=str(PREVIEW/f'{mode}-touch-{viewport["width"]}.png'))
   # Cancellation at full draw must not fire on lost capture.
   if mode in ['archery','darts']:
    pos=phone.locator('#touch-primary').bounding_box();point={'id':3,'x':pos['x']+pos['width']/2,'y':pos['y']+pos['height']/2};cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[point]});tick(phone,1.3);shots=phone.evaluate('__club.sim.state.run.shots');cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});tick(phone,1)
    check(f'{mode} touch cancellation {viewport["width"]} clears draw without release',phone.evaluate('__club.sim.state.held.size===0&&!__club.sim.state.run.charging&&__club.sim.state.run.shots')==shots)
 context.close();browser.close()

check('No application exceptions in native input flows',not errors,errors)
report={'passed':sum(c['pass'] for c in checks),'total':len(checks),'checks':checks,'completions':completions,'errors':errors,'device':device,'method':'Playwright native mouse drags, right-button aiming, Space/Shift and WASD complete four representative events. CDP dispatchTouchEvent exercises simultaneous contacts in portrait and landscape, pause, banking, retry and cancellation. Only production 120 Hz time is advanced; no hit, position, score, checkpoint or result is injected. Physical phones remain unmeasured.'}
(OUT/'native-input.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(f'{report["passed"]}/{report["total"]} checks passed',flush=True)
if report['passed']!=report['total']:raise SystemExit(1)
