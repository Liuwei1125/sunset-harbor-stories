from input_driver import *
import hashlib
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=CHROMIUM,headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);page=b.new_page(viewport={'width':1280,'height':800});errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
 page.set_content(ROOT.joinpath('index.html').read_text().replace('<script>','<script>window.requestAnimationFrame=()=>0;',1));page.wait_for_function('!!window.__experience',polling=20);page.locator('#start').click();page.locator('[data-route="air"]').click();a=InputRunner(page)
 try:
  a.walk(80,344);a.press('e',20);a.altitude(17);a.heli_z(205);a.capture('09-air-approach');a.press('Control',260);a.press('e',20);print('LANDED',json.dumps(a.state()),flush=True)
  a.walk(84,216);a.clear_visible();a.walk(104,216);a.clear_visible();a.walk(104,244);a.clear_visible();a.walk(115,244,crouch=True);a.clear_visible();a.walk(111.5,253.5,crouch=True);a.press('e',180)
  a.walk(124,241,crouch=True);a.clear_visible();a.press('e',240);print('CARGO',json.dumps(a.state()),flush=True)
  a.walk(115,244,crouch=True);a.walk(104,244);a.walk(104,216);a.walk(80,216);a.walk(79,205);a.press('e',20);a.altitude(17);a.heli_z(344);a.press('Control',260);a.step(200);a.capture('10-air-result');print('RESULT',json.dumps(a.state()),flush=True);outcome={'passed':bool(a.state()['result'] and a.state()['result']['success']),'state':a.state()}
 except Exception as e:
  print('FAIL',str(e),flush=True);a.capture('air-failure');outcome={'passed':False,'error':str(e),'state':a.state()}
 outcome['sha256']=hashlib.sha256(ROOT.joinpath('index.html').read_bytes()).hexdigest();outcome.update({'route':'air','method':'Keyboard/mouse input event replay, fixed time stepping. No actor, health or mission-state edits after the route was selected.','events':a.events,'errors':errs,'gameEvents':page.evaluate('__experience.experience.events')});(OUT/'input-air.json').write_text(json.dumps(outcome,indent=2,ensure_ascii=False));b.close()
