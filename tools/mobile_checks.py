from pathlib import Path
from playwright.sync_api import sync_playwright
import hashlib
import json,time
from verify_config import ROOT, OUT, PREVIEW, CHROMIUM
root=ROOT
results=[]
def check(name,ok,detail=None):results.append({'name':name,'pass':bool(ok),'detail':detail})
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=CHROMIUM,headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 ctx=b.new_context(viewport={'width':844,'height':390},device_scale_factor=1,is_mobile=True,has_touch=True);page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(root.joinpath('index.html').read_text().replace('<script>','<script>window.requestAnimationFrame=()=>0;',1));page.wait_for_function('!!window.__experience',polling=20);page.locator('#start').tap();page.screenshot(path=str(PREVIEW/'11-mobile-brief.png'));page.locator('[data-route="road"]').tap();page.evaluate('__experience.render(1)');page.screenshot(path=str(PREVIEW/'12-mobile-ground.png'))
 check('Touch mode detected',page.evaluate('__experience.touch.enabled'))
 # Native two-finger CDP input, no direct input-state writes.
 client=ctx.new_cdp_session(page)
 def center(id):
  r=page.locator('#'+id).bounding_box();return {'x':r['x']+r['width']/2,'y':r['y']+r['height']/2}
 def send(kind,points):client.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
 s=center('move-stick');f=center('touch-fire')
 send('touchStart',[dict(s,id=1),dict(f,id=2)]);send('touchMove',[{'x':s['x']+35,'y':s['y']-20,'id':1},dict(f,id=2)])
 page.evaluate('for(let i=0;i<12;i++){__experience.snapshotActors();__experience.update(1/60)}')
 check('Simultaneous native move and fire',page.evaluate('touch.fire && Math.abs(touch.x)>.1 && weapons[state.weapon].ammo<weapons[state.weapon].mag'))
 send('touchCancel',[]);page.wait_for_function('!touch.fire && touch.x===0 && touch.y===0',timeout=2000,polling=20);check('Touch cancellation releases movement and fire',page.evaluate('!touch.fire && touch.x===0 && touch.y===0'))
 # The selector is a normal long-press control.
 q=center('touch-weapon');send('touchStart',[dict(q,id=3)]);page.wait_for_timeout(380);send('touchEnd',[])
 check('Long press opens the quick weapon wheel',page.locator('#weapon-wheel6').is_visible())
 page.locator('[data-wheel="4"]').tap();check('Wheel selects sniper and resumes',page.evaluate('state.weapon===4&&!state.paused'))
 page.locator('#touch-crouch6').tap();page.evaluate('__experience.update(1/60)');check('Touch crouch toggle is effective',page.evaluate('experience.crouching'))
 # Explicitly abandon the campaign using its public UI, then launch quick air challenge.
 page.locator('#harbor-open6').tap();page.on('dialog',lambda d:d.accept());page.locator('#story-abandon').tap();page.locator('#debrief-return6').tap();page.evaluate('openCombatPanel()');page.locator('[data-start-combat="air"]').count()
 # This fixture uses the same public scenario entry as the quick-play button.
 page.evaluate('closeCombatPanel();startCombat("air");render(1)')
 page.screenshot(path=str(PREVIEW/'13-mobile-air.png'))
 check('Flight throttle visible, redundant gas key hidden',page.locator('#flight-throttle6').is_visible() and not page.locator('#touch-gas').is_visible())
 page.locator('#touch-lock').tap();check('One tap latches target locking',page.evaluate('experience.flight.autoLock'));page.locator('#touch-lock').tap();check('Second tap releases target locking',not page.evaluate('experience.flight.autoLock'))
 # Native slider input at 60% of track, then a second finger can fly without holding the throttle.
 tr=page.locator('#throttle6').bounding_box();page.touchscreen.tap(tr['x']+tr['width']*.6,tr['y']+tr['height']/2);t=page.evaluate('state.car.throttle');page.evaluate('for(let i=0;i<30;i++)update(1/60)');check('Throttle remains latched after finger release',abs(page.evaluate('state.car.throttle')-t)<.001,{'throttle':t})
 s=center('move-stick');f=center('touch-cannon');send('touchStart',[dict(s,id=4),dict(f,id=5)]);send('touchMove',[{'x':s['x']+31,'y':s['y']-10,'id':4},dict(f,id=5)]);page.evaluate('for(let i=0;i<20;i++){snapshotActors();update(1/60)}');check('Native steering and cannon simultaneous',page.evaluate('Math.abs(state.car.roll)>.04&&combat.heat>0&&combat.controls.cannon'));send('touchCancel',[]);page.wait_for_function('!combat.controls.cannon && touch.x===0',timeout=2000,polling=20);check('Cancelling flight touches stops held cannon',page.evaluate('!combat.controls.cannon&&touch.x===0'))
 # Repeated down without release must not stick after a pause.
 page.locator('#touch-cannon').dispatch_event('pointerdown',{'pointerId':77,'pointerType':'touch','clientX':f['x'],'clientY':f['y']});page.evaluate('pauseGame()');check('Pause clears continuous flight controls',page.evaluate('!combat.controls.cannon&&!combat.controls.boost&&touch.x===0'))
 page.evaluate('startGame()');page.set_viewport_size({'width':390,'height':844});page.evaluate('renderer.resize();updateHUD();render(1)');page.screenshot(path=str(PREVIEW/'14-mobile-portrait.png'))
 boxes=page.evaluate('''()=>['move-stick','touch-cannon','touch-missile','touch-lock','touch-flare','throttle6'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {id,x:r.x,y:r.y,w:r.width,h:r.height,inside:r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight};})''')
 check('Portrait primary controls remain inside viewport',all(x['inside'] for x in boxes),boxes)
 check('No page runtime errors',not errors,errors)
 out={'sha256':hashlib.sha256((ROOT/'index.html').read_bytes()).hexdigest(),'mode':'Chromium mobile viewport emulation, native two-finger CDP input; not physical-phone testing','passed':sum(r['pass'] for r in results),'total':len(results),'results':results};(OUT/'mobile.json').write_text(json.dumps(out,indent=2,ensure_ascii=False));print(json.dumps(out,ensure_ascii=False,indent=2));b.close()
