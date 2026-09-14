"""7.1 native camera controls, instrument ownership and simultaneous touch.
Functional cases use the existing 120 Hz diagnostic clock, not FPS samples.
"""
from playwright.sync_api import sync_playwright
from browser_common import OUT, PREVIEW, CHROME, server, boot, wait_ready, tick, select, native_start
from benchmark import fingerprint
import json, time

checks=[]; errors=[]; source=fingerprint(); previews=PREVIEW/'7.1'; previews.mkdir(exist_ok=True)
def check(name, passed, detail=None):
 checks.append({'name':name,'pass':bool(passed),'detail':detail}); print(('PASS ' if passed else 'FAIL ')+name,flush=True)
def ready(page):
 page.evaluate('async()=>{await __club.renderer.ready(__club.sim.snapshot(1));__club.app.draw(1)}');page.wait_for_timeout(300)
def close(context,page):
 page.goto('about:blank');context.close()

CAR='''()=>{const a=__club.app,item=[...a.renderer.dynamic.values()].find(v=>v.root.name==='player-car'&&(v.root.isEnabled?v.root.isEnabled():v.root.enabled));return {view:a.sim.state.save.settings.camera,speed:Math.round(Math.abs(a.sim.state.run.car.speed)*3.6),nitro:Math.round(a.sim.state.run.nitro),display:item?.dashboard?{speed:item.dashboard.speed,nitro:item.dashboard.nitro}:null,id:item?.id,lod:item?.lod,hud:document.getElementById('score-main').innerText,gl:document.getElementById('view').getContext('webgl2').getError(),glass:item?.materials.filter(m=>/glass/i.test(m.material.name)).map(m=>m.material.alpha??m.material.opacity)};}'''

with server(),sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=CHROME)
 for engine in ['babylon','playcanvas']:
  context,page=boot(browser,engine=engine,track_gpu=True);page.on('pageerror',lambda e:errors.append(str(e)))
  native_start(page,'race',playlist='endless');page.keyboard.down('w');tick(page,2);ready(page)
  start=page.evaluate('JSON.stringify({run:__club.sim.state.run,held:[...__club.sim.state.held],time:__club.sim.state.time,look:__club.sim.state.look})')
  views=[];unchanged=True
  for expected in ['hood','cockpit','chase']:
   page.keyboard.press('c');ready(page);views.append(page.evaluate('__club.sim.state.save.settings.camera'))
   unchanged=unchanged and start==page.evaluate('JSON.stringify({run:__club.sim.state.run,held:[...__club.sim.state.held],time:__club.sim.state.time,look:__club.sim.state.look})')
   page.screenshot(path=str(previews/f'{engine}-{expected}.png'))
  check(engine+' C cycles all three views while preserving held throttle and the entire running simulation',views==['hood','cockpit','chase'] and unchanged,views)
  page.locator('#camera-switch').click()
  # The input map uses action names; compare all held sources instead of assuming a key name.
  clicked=page.evaluate('__club.sim.state.save.settings.camera==="hood"') and start==page.evaluate('JSON.stringify({run:__club.sim.state.run,held:[...__club.sim.state.held],time:__club.sim.state.time,look:__club.sim.state.look})')
  page.keyboard.up('w');tick(page,.1)
  check(engine+' native camera button preserves input and does not restart the race',clicked)
  rows=[]
  for quality in ['low','high']:
   page.evaluate('(q)=>{__club.app.setting("quality",q);__club.app.setting("camera","cockpit");__club.app.draw(1)}',quality);ready(page);rows.append(page.evaluate(CAR))
  check(engine+' both LOD dashboards match live speed, nitro and HUD with transparent glass',all(r['id']=='touring-gt' and r['display']=={'speed':r['speed'],'nitro':r['nitro']} and str(r['speed']) in r['hud'] and r['gl']==0 and r['glass'] and all(0<a<1 for a in r['glass']) for r in rows) and [r['lod'] for r in rows]==['low','high'],rows)
  page.keyboard.down('w');page.keyboard.down('Shift');tick(page,.7);page.keyboard.up('Shift');page.keyboard.up('w');ready(page);row=page.evaluate(CAR)
  check(engine+' instrument texture updates after acceleration and nitro use',row['display']=={'speed':row['speed'],'nitro':row['nitro']} and row['display']!=rows[-1]['display'],row)
  select(page,'race');page.locator('[data-action="settings"]').click();page.locator('[data-setting="camera"]').select_option('hood');page.reload();wait_ready(page)
  check(engine+' camera preference survives the visible settings flow and reload',page.evaluate('__club.app.progress.settings.camera==="hood"&&__club.sim.state.save.settings.camera==="hood"'))
  # Exercise both dashboard LODs on repeated scene rebuilds; compare identical warm scenes.
  sweeps=[]
  for sweep in range(3):
   for level in [1,0]:
    select(page,'race',level);page.evaluate('__club.start()');tick(page,3.2)
    for q in ['low','high']:
     page.evaluate('(q)=>{__club.app.setting("quality",q);__club.app.draw(1)}',q);ready(page)
   sweeps.append(page.evaluate('__gpuLive()'))
  check(engine+' repeated car and instrument LOD rebuilds stabilize native GPU resources',sweeps[1]==sweeps[2],sweeps)
  close(context,page)

 context,page=boot(browser,mobile=True);page.on('pageerror',lambda e:errors.append(str(e)));cdp=context.new_cdp_session(page)
 for viewport in [{'width':390,'height':844},{'width':844,'height':390}]:
  page.set_viewport_size(viewport);native_start(page,'race',playlist='endless',mobile=True);page.evaluate('__club.app.setting("camera","chase");__club.app.draw(1)');ready(page)
  gas=page.locator('#touch-primary').bounding_box();cam=page.locator('#camera-switch').bounding_box()
  gaspoint={'id':1,'x':gas['x']+gas['width']/2,'y':gas['y']+gas['height']/2};campoint={'id':2,'x':cam['x']+cam['width']/2,'y':cam['y']+cam['height']/2}
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[gaspoint]});tick(page,.5);held=page.evaluate('[...__club.sim.state.held]');before=page.evaluate('__club.sim.state.run.car.speed')
  # CDP touchEnd lists contacts being released (touchStart lists active contacts).
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[gaspoint,campoint]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[campoint]});page.wait_for_timeout(100)
  during=page.evaluate('({view:__club.sim.state.save.settings.camera,held:[...__club.sim.state.held],phase:__club.sim.state.phase})');tick(page,.5);accelerating=page.evaluate('__club.sim.state.run.car.speed')>before
  cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
  check(f'{viewport["width"]}×{viewport["height"]} second touch changes camera while the first keeps accelerating',during['view']=='hood' and bool(held) and during['held']==held and during['phase']=='playing' and accelerating and page.evaluate('__club.sim.state.held.size===0'),during)
  page.locator('#camera-switch').tap();page.wait_for_timeout(100)
  check(f'{viewport["width"]}×{viewport["height"]} primary touch switches the camera exactly once',page.evaluate('__club.sim.state.save.settings.camera==="cockpit"'))
  layout=page.evaluate('''()=>{const els=['#camera-switch','#bank','[data-action="pause"]'].map(s=>document.querySelector(s));const boxes=els.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom}});return {boxes,inBounds:boxes.every(r=>r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight),separate:boxes.every((a,i)=>boxes.every((b,j)=>i===j||a.right<=b.x||b.right<=a.x||a.bottom<=b.y||b.bottom<=a.y)),noScroll:document.documentElement.scrollWidth<=innerWidth,buttonLabel:els[0].textContent};}''')
  check(f'{viewport["width"]}×{viewport["height"]} camera, bank and pause fit without overlap',layout['inBounds'] and layout['separate'] and layout['noScroll'] and 'C' not in layout['buttonLabel'],layout)
  for view in ['chase','hood','cockpit']:
   page.evaluate('(v)=>{__club.app.setting("camera",v);__club.app.draw(1)}',view);ready(page);page.screenshot(path=str(previews/f'touch-{viewport["width"]}-{view}.png'))
 close(context,page)

 context,page=boot(browser);page.on('pageerror',lambda e:errors.append(str(e)))
 native_start(page,'shooting',playlist='endless');ready(page)
 check('Camera control is hidden outside racing and C leaves shooting unchanged',page.locator('#camera-switch').is_hidden())
 before=page.evaluate('JSON.stringify(__club.sim.state.run)');page.keyboard.press('c');check('C does not alter shooting state',before==page.evaluate('JSON.stringify(__club.sim.state.run)'))
 page.screenshot(path=str(previews/'akm-hip.png'));page.mouse.move(720,450);page.mouse.down(button='right');tick(page,.7);ready(page);page.screenshot(path=str(previews/'akm-aim.png'))
 sight=page.evaluate('''async()=>{const {frameScene}=await import('./src/presentation/frame.js'),{basis,sub}=await import('./src/core/math.js');const a=__club.app,s=a.sim.snapshot(1),gun=frameScene(s,a.sim.state.track).models.find(m=>m.key==='gun'),b=basis(s.look.yaw,s.look.pitch),d=sub(gun.pos,s.camera.eye);return {id:gun.id,aim:s.run.aim,x:b[0]*d.x+b[3]*d.y+b[6]*d.z,y:b[1]*d.x+b[4]*d.y+b[7]*d.z,scope:!document.getElementById('scope').hidden};}''')
 check('AKM ironsights align on the aiming axis without a scope overlay',sight['id']=='field-akm' and sight['aim']>.99 and abs(sight['x'])<.003 and abs(sight['y']+.0495)<.003 and not sight['scope'],sight)
 page.mouse.down(button='left');tick(page,.0167);page.mouse.up(button='left');ready(page)
 shot=page.evaluate('''async()=>{const a=__club.app,item=[...a.renderer.dynamic.values()].find(v=>v.id==='field-akm'&&v.root.isEnabled()),bolt=item.joints.find(j=>j.motion==='bolt'),{frameScene}=await import('./src/presentation/frame.js');return {shots:a.sim.state.run.shots,bolt:bolt.node.position.z-bolt.base.z,effects:frameScene(a.sim.snapshot(1),a.sim.state.track).effects.map(e=>e.key),gl:document.getElementById('view').getContext('webgl2').getError()};}''')
 check('AKM fires with native bolt motion and a muzzle effect',shot['shots']>0 and abs(shot['bolt'])>.001 and 'flash' in shot['effects'] and shot['gl']==0,shot)
 page.keyboard.press('r');tick(page,.3);ready(page);page.screenshot(path=str(previews/'akm-reload.png'));mag=page.evaluate('''()=>{const item=[...__club.renderer.dynamic.values()].find(v=>v.id==='field-akm'&&v.root.isEnabled()),j=item.joints.find(j=>j.motion==='magazine');return j.node.position.y-j.base.y;}''')
 check('AKM reload moves the native magazine',mag<-.02,mag);page.mouse.up(button='right');close(context,page);browser.close()

check('No exceptions and no runtime source changes during 7.1 checks',not errors and source==fingerprint(),errors)
report={'timestamp':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'passed':sum(c['pass'] for c in checks),'total':len(checks),'checks':checks,'errors':errors,'sourceFingerprint':source,'method':'Real native engine objects and keyboard/mouse/CDP touch events. Manual production physics time for functional assertions only. Portrait and landscape are desktop touch emulation; screenshots reviewed separately.'}
(OUT/'update.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(f'{report["passed"]}/{report["total"]} checks passed',flush=True)
if report['passed']!=report['total']:raise SystemExit(1)
