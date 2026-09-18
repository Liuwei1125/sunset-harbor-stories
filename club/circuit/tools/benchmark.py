"""Complete race through emulated gamepad API, with unmodified normal RAF timing."""
from pathlib import Path
import sys,json,time
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'tools'))
from browser_common import server,CHROME
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parents[1]/'verification';OUT.mkdir(exist_ok=True)
with server(),sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=CHROME);page=b.new_page(viewport={'width':1440,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8012/club/circuit/');page.wait_for_function('window.__circuit && !__circuit.loading');page.select_option('#event','race');page.locator('#start').click();page.wait_for_function('!__circuit.loading && !__circuit.lobby')
 page.evaluate('''async()=>{const {Driver}=await import('./src/ai.js');const a=__circuit,d=new Driver(0,'club');let step=-1,control={};window.__performanceSamples=[];const pad={id:'QA standard gamepad',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({value:0,pressed:false,touched:false}))};navigator.getGamepads=()=>{const s=a.session;if(s.steps!==step){step=s.steps;control=d.step(s.player,s.track,s.physics.cars);}const x=control.steer||0;pad.axes[0]=x?-Math.sign(x)*(.06+.94*Math.pow(Math.abs(x),1/1.35)):0;for(const [idx,value] of [[7,control.throttle||0],[6,control.brake||0],[4,control.reverse?1:0]])pad.buttons[idx]={value,pressed:value>.5,touched:value>0};return [pad];};a.settings.volume=0;}''')
 samples=[];start=time.monotonic()
 for block in range(60):
  page.wait_for_timeout(10000)
  sample=page.evaluate('({phase:__circuit.session.phase,time:__circuit.session.elapsed,lap:__circuit.session.entries[0].lapNumber,stats:__circuit.stats(),dropped:__circuit.clock.droppedSeconds})');samples.append(sample)
  if block%3==0:print(sample,flush=True)
  if block in [1,12,25]:page.screenshot(path=str(OUT/f'normal-race-{block}.png'))
  if sample['phase']=='result':break
 result=page.evaluate('__circuit.session.result');page.screenshot(path=str(OUT/'gamepad-race-result.png'))
 report={'device':'Actual local Chromium / 1440x900 / default GPU','userAgent':page.evaluate('navigator.userAgent'),'wallSeconds':time.monotonic()-start,'samples':samples,'result':result,'errors':errors,'input':'Emulated standard gamepad API; no physical controller tested','timing':'Normal requestAnimationFrame, no manual tick or timescale'}
 (OUT/'performance.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));b.close()
 assert result and next(e for e in result if e['id']==0)['finished'],'Gamepad path did not finish'
 assert not errors,errors
 assert all(s['stats']['fps']>=40 for s in samples[2:]),'Sustained frame rate below 40 FPS'
