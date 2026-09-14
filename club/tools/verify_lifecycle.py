"""Targeted failure recovery and day-boundary checks, using real browser lifecycles."""
from playwright.sync_api import sync_playwright
from browser_common import OUT,PREVIEW,BASE,CHROME,server,boot,wait_ready,tick,select
import json

checks=[];errors=[]
def check(name,passed,detail=None):checks.append({'name':name,'pass':bool(passed),'detail':detail});print(('PASS ' if passed else 'FAIL ')+name,flush=True)

with server(),sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=CHROME)
 context,page=boot(browser);page.on('pageerror',lambda e:errors.append(str(e)))
 # Date is held while RAF and real timers continue normally.
 page.clock.set_fixed_time('2026-09-11T23:59:50+08:00');select(page,'race',0,'daily')
 old=page.evaluate('({day:__club.sim.state.day,level:__club.sim.state.level,seed:__club.sim.state.worldSeed})')
 page.clock.set_fixed_time('2026-09-12T00:00:05+08:00');page.evaluate('__club.start()');page.wait_for_function('__club.sim.state.phase==="countdown"')
 new=page.evaluate('({day:__club.sim.state.day,level:__club.sim.state.level,seed:__club.sim.state.worldSeed,renderedLevel:__club.renderer.spec.level,rendererDay:__club.renderer.session.day})')
 check('Midnight daily rollover rebuilds the venue before entering',old['day']!=new['day'] and old['seed']!=new['seed'] and new['level']==new['renderedLevel'] and new['day']==new['rendererDay'],{'before':old,'after':new})
 # Lost contexts cannot be reused; visible Retry creates a new canvas and input owner.
 page.evaluate('document.getElementById("view").getContext("webgl2").getExtension("WEBGL_lose_context").loseContext()')
 page.wait_for_function('!document.getElementById("load-error").hidden',timeout=30000)
 page.locator('[data-action="retry-load"]').click();wait_ready(page)
 page.locator('#start').click();page.locator('[data-action="go"]').click();page.wait_for_function('__club.sim.state.phase==="countdown"');tick(page,3.1);page.keyboard.down('w');tick(page,.5);page.keyboard.up('w')
 check('GPU context loss recovers through Retry with functioning native input',page.evaluate('__club.sim.state.run.car.speed>0&&__club.sim.state.held.size===0&&document.getElementById("view").getContext("webgl2").getError()===0'))
 # A held throttle pressed during countdown is applied at GO.
 page.evaluate('__club.start()');page.keyboard.down('w');tick(page,3.5);page.keyboard.up('w')
 check('Countdown retains intended throttle and releases it cleanly at GO',page.evaluate('__club.sim.state.phase==="playing"&&__club.sim.state.run.car.speed>0&&__club.sim.state.held.size===0'))
 select(page,'shooting');page.locator('#start').click();page.locator('[data-action="go"]').click();tick(page,3.1)
 page.evaluate('''()=>{const c=document.getElementById('view'),old=c.requestPointerLock?.bind(c);if(old)c.requestPointerLock=(...args)=>{const p=old(...args);p?.catch(e=>window.__lockRejection={name:e.name,message:e.message});return p;};}''')
 page.mouse.click(700,400);page.wait_for_timeout(300);locked=page.evaluate('document.pointerLockElement===document.getElementById("view")')
 if locked:page.evaluate('document.exitPointerLock()');page.wait_for_function('__club.sim.state.phase==="paused"');usable=True
 else:
  before=page.evaluate('__club.sim.state.look.yaw');page.mouse.move(700,400);page.mouse.down(button='right');page.mouse.move(760,420);page.mouse.up(button='right');usable=page.evaluate('__club.sim.state.look.yaw')!=before;page.keyboard.press('Escape')
 check('Native pointer lock or its drag fallback supports aim and pause',usable and page.evaluate('__club.sim.state.phase==="paused"&&__club.sim.state.held.size===0'),{'nativeLockAcquired':locked,'rejection':page.evaluate('window.__lockRejection||null')})
 check('A user gesture unlocks audio and volume remains controllable',page.evaluate('()=>{__club.app.audio.setVolume(0);return __club.app.audio.ctx?.state==="running"&&__club.app.audio.volume===0;}'))
 page.goto('about:blank');context.close()
 # Independent PC resource validation: same circuit, same snapshot after each cycle.
 context,page=boot(browser,engine='playcanvas',track_gpu=True);page.on('pageerror',lambda e:errors.append(str(e)));rows=[]
 for sweep in range(3):
  for level in [2,3,4,0]:select(page,'race',level)
  page.evaluate('__club.app.manual=true;__club.app.draw(1)');rows.append(page.evaluate('({live:__gpuLive(),stats:__club.renderer.stats()})'))
 check('PlayCanvas circuit rebuilds stabilize native GPU resource counts',rows[1]['live']==rows[2]['live'],rows)
 page.goto('about:blank');context.close()
 # A browser denying access to localStorage still has an in-memory playable club.
 context=browser.new_context(viewport={'width':1280,'height':800});page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}})")
 page.goto(BASE+'?verify=1');wait_ready(page);page.locator('#start').click();page.locator('[data-action="go"]').click();tick(page,3.1);page.keyboard.down('w');tick(page,.5);page.keyboard.up('w')
 check('Blocked localStorage does not prevent a playable session',page.evaluate('__club.sim.state.run.car.speed>0&&__club.app.progress.version===2&&__club.app.store.status.length>0'))
 page.goto('about:blank');context.close();browser.close()

check('No uncaught exceptions in failure recovery paths',not errors,errors)
report={'passed':sum(c['pass'] for c in checks),'total':len(checks),'checks':checks,'errors':errors}
(OUT/'lifecycle.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(f'{report["passed"]}/{report["total"]} checks passed',flush=True)
if report['passed']!=report['total']:raise SystemExit(1)
