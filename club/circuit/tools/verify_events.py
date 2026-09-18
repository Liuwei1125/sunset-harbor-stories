"""Exercise proving ground and the three-round championship UI end to end."""
from pathlib import Path
import sys,json
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'tools'))
from browser_common import server,CHROME
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parents[1]/'verification'
with server(),sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=CHROME);page=b.new_page(viewport={'width':1440,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8012/club/circuit/');page.wait_for_function('window.__circuit && !__circuit.loading');page.select_option('#event','test');page.locator('#start').click();page.wait_for_function('!__circuit.loading && !__circuit.lobby');page.wait_for_timeout(500);page.screenshot(path=str(OUT/'proving-ground.png'))
 metrics=page.evaluate('''()=>{const s=__circuit.session;for(let i=0;i<1600&&!s.measurements.length;i++)s.step({throttle:1});for(let i=0;i<900&&s.measurements.length<2;i++)s.step({brake:1});return {mode:s.mode,measurements:s.measurements};}''');assert len(metrics['measurements'])==2,metrics
 page.locator('[data-action="finish"]').click();page.locator('dialog [data-action="garage"]').click();page.wait_for_function('!__circuit.loading && __circuit.lobby')
 # Establish the documented three-valid-lap unlock through the actual simulation.
 page.select_option('#event','practice');page.locator('#start').click();page.wait_for_function('!__circuit.loading && !__circuit.lobby')
 unlock=page.evaluate('''async()=>{const {Driver}=await import('./src/ai.js'),s=__circuit.session,d=new Driver(0,'club');for(let i=0;i<120*350&&s.laps.length<3;i++)s.step(d.step(s.player,s.track,s.physics.cars));return {xp:__circuit.save.xp,valid:s.laps.filter(l=>l.valid).length};}''');assert unlock['valid']==3,unlock
 page.locator('[data-action="finish"]').click();page.locator('dialog [data-action="garage"]').click();page.wait_for_function('!__circuit.loading && __circuit.lobby');page.select_option('#event','championship');page.locator('#start').click();page.wait_for_function('!__circuit.loading && !__circuit.lobby')
 rounds=[]
 for rnd in range(3):
  result=page.evaluate('''async()=>{const {Driver}=await import('./src/ai.js'),s=__circuit.session,d=new Driver(0,'club');for(let i=0;i<120*580&&s.phase!=='result';i++)s.step(d.step(s.player,s.track,s.physics.cars));return {track:s.track.id,phase:s.phase,result:s.result};}''');assert result['phase']=='result',result;rounds.append(result);page.wait_for_function('document.querySelector("dialog").open');page.wait_for_timeout(150)
  if rnd==0:
   page.locator('dialog [data-action="garage"]').click();page.wait_for_function('!__circuit.loading && __circuit.lobby');page.reload();page.wait_for_function('window.__circuit && !__circuit.loading');assert page.evaluate('__circuit.save.championship.round')==1;page.locator('#start').click();page.wait_for_function('!__circuit.loading && !__circuit.lobby')
  elif rnd==1:page.locator('dialog [data-action="next-round"]').click();page.wait_for_function('!__circuit.loading && !__circuit.lobby')
 final=page.evaluate('({champ:__circuit.save.championship,history:__circuit.save.lastChampionship})');assert final['champ'] is None;assert len(final['history']['results'])==3
 page.screenshot(path=str(OUT/'championship-result.png'));assert not errors,errors
 (OUT/'events.json').write_text(json.dumps({'provingGround':metrics,'unlock':unlock,'rounds':rounds,'final':final,'errors':errors},ensure_ascii=False,indent=2));b.close();print('Proving ground, three-valid-lap unlock, save/resume and three-round championship passed',flush=True)
