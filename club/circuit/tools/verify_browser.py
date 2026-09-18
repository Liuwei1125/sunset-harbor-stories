"""Actual Chromium UI, input paths, telemetry and resource-lifetime checks."""
from pathlib import Path
import sys,json,time
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'tools'))
from browser_common import server,CHROME,GPU_TRACKER
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parents[1]/'verification';OUT.mkdir(exist_ok=True)
results=[]
def check(name,ok,details=None):
 results.append({'name':name,'passed':bool(ok),'details':details});print(name,ok,flush=True)
 if not ok:raise AssertionError(name+': '+str(details))
with server(),sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=CHROME)
 context=browser.new_context(viewport={'width':1440,'height':900});page=context.new_page();errors=[];requests=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
 page.add_init_script(GPU_TRACKER)
 page.add_init_script("if(location.protocol==='http:'){localStorage.setItem('sunset-harbor-club-v2','old-club-sentinel');localStorage.setItem('sunset-run-v6-save','old-main-sentinel')}")
 page.goto('http://127.0.0.1:8012/club/circuit/');page.wait_for_function('window.__circuit && !__circuit.loading',timeout=90000)
 check('garage and M4 loaded',page.locator('#garage').is_visible() and page.locator('#car-name').inner_text()=='BMW M4')
 page.screenshot(path=str(OUT/'garage.png'))
 page.locator('#start').click();page.wait_for_function('!__circuit.loading && !__circuit.lobby');page.wait_for_function('__circuit.session.phase==="running"');page.keyboard.down('w');page.wait_for_timeout(2000);page.keyboard.press('c');page.wait_for_timeout(200);page.keyboard.press('c');page.wait_for_timeout(200);page.keyboard.up('w')
 t=page.evaluate('({speed:__circuit.session.player.speed,camera:__circuit.settings.camera,panel:__circuit.renderer.telemetry.getState()})');check('native keyboard acceleration and both camera switches',t['speed']>7 and t['camera']==2,t);check('real RPM and speed drive cabin display',t['panel']['speedKph']>20 and t['panel']['engineRpm']>1000,t['panel'])
 page.screenshot(path=str(OUT/'m4-cockpit.png'));page.keyboard.press('Escape');before=page.evaluate('__circuit.session.elapsed');page.wait_for_timeout(400);check('pause stops simulation',page.evaluate('__circuit.session.elapsed')==before);page.locator('[data-action="pause"]').last.click();page.keyboard.press('f');check('reset penalty visible',page.evaluate('__circuit.session.entries[0].penalty')==5)
 page.locator('[data-action="finish"]').click();check('practice result and retry actions',page.locator('dialog').is_visible());page.locator('dialog [data-action="garage"]').click();page.wait_for_function('!__circuit.loading && __circuit.lobby')
 counts=[]
 for cycle in range(2):
  for car in ['su7','ferrari-458','bmw-m4']:
   page.locator('[data-car="'+car+'"]').click();page.wait_for_function('!__circuit.loading');page.wait_for_timeout(250)
   check(car+' model switch '+str(cycle),page.evaluate('__circuit.session.settings.car')==car)
   page.locator('#start').click();page.wait_for_function('!__circuit.loading && !__circuit.lobby');page.evaluate('__circuit.session.phase="running"');page.keyboard.down('w');page.wait_for_timeout(350);page.keyboard.up('w');page.evaluate('__circuit.settings.camera=2;__circuit.session.settings.camera=2');page.wait_for_timeout(200)
   check(car+' live telemetry bound '+str(cycle),page.evaluate('__circuit.renderer.telemetry.stats().bindings')==(2 if car=='su7' else 1))
   if not cycle:page.screenshot(path=str(OUT/(car+'-cockpit.png')))
   page.evaluate('__circuit.action("garage")');page.wait_for_function('!__circuit.loading && __circuit.lobby')
   if car=='bmw-m4':counts.append(page.evaluate('({gpu:__gpuLive(),scene:__circuit.stats()})'))
 check('GPU resource counts stable after repeated switching',all(counts[1]['gpu'][k]<=counts[0]['gpu'][k]+4 for k in counts[0]['gpu']),counts)
 check('legacy saves untouched',page.evaluate('localStorage.getItem("sunset-harbor-club-v2")==="old-club-sentinel" && localStorage.getItem("sunset-run-v6-save")==="old-main-sentinel"'))
 check('only selected runtime car assets loaded',all('/art/' not in r for r in requests))
 # Full keyboard driving path: synthetic key transitions exercise the same key state
 # and progressive controls; the earlier trusted key test checks browser delivery.
 page.select_option('#event','race');page.locator('#start').click();page.wait_for_function('!__circuit.loading && !__circuit.lobby');page.evaluate('__circuit.settings.volume=0')
 keyboard=page.evaluate('''async()=>{const {Driver}=await import('./src/ai.js');const a=__circuit,s=a.session,d=new Driver(0,'club');const held={};const key=(code,on)=>{if(held[code]!==on){held[code]=on;window.dispatchEvent(new KeyboardEvent(on?'keydown':'keyup',{code,bubbles:true}));}};let n=0;for(;n<120*570&&s.phase!=='result';n++){const wanted=d.step(s.player,s.track,s.physics.cars),c=s.player,target=wanted.steer*c.config.maxSteer;key('KeyA',target>0&&c.steer<target);key('KeyD',target<0&&c.steer>target);key('KeyW',c.throttle<wanted.throttle-.01);key('KeyS',c.brake<wanted.brake-.01);key('KeyQ',!!wanted.reverse);s.step(a.input.read());}Object.keys(held).forEach(k=>key(k,false));return {steps:n,phase:s.phase,result:s.result,pose:s.player.pose()};}''')
 check('keyboard control path completes full race',keyboard['phase']=='result' and any(e['id']==0 and e['finished'] for e in keyboard['result']),keyboard['result'])
 page.wait_for_timeout(200);page.screenshot(path=str(OUT/'keyboard-race-result.png'));page.evaluate('__circuit.action("garage")');page.wait_for_function('!__circuit.loading && __circuit.lobby')
 check('browser has no uncaught exceptions',not errors,errors)
 (OUT/'browser.json').write_text(json.dumps({'checks':results,'errors':errors,'keyboardRace':keyboard},ensure_ascii=False,indent=2))
 context.close();browser.close()
