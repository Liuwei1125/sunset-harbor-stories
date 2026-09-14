from input_driver import *
import hashlib
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=CHROMIUM,headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);page=b.new_page(viewport={'width':1280,'height':800});errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
 page.set_content(ROOT.joinpath('index.html').read_text().replace('<script>','<script>window.requestAnimationFrame=()=>0;',1));page.wait_for_function('!!window.__experience',polling=20);page.locator('#start').click();page.locator('[data-route="sea"]').click();a=InputRunner(page)
 try:
  a.walk(139,345);a.walk(181.7,345,epsilon=.4);a.press('e',30);print('BOAT',json.dumps(a.state()),flush=True)
  a.ship_straight(236);a.press('e',15);a.capture('07-quay');print('QUAY',json.dumps(a.state()),flush=True)
  a.walk(156,236);a.clear_visible();a.walk(156,266);a.clear_visible();a.walk(124,266);a.clear_visible();a.walk(124,257,crouch=True);a.clear_visible();a.walk(111.5,253.5,crouch=True);a.press('e',180)
  print('TERMINAL',json.dumps(a.state()),flush=True);a.walk(124,241,crouch=True);a.clear_visible();a.press('e',240)
  a.walk(124,257,crouch=True);a.walk(124,266);a.walk(156,266);a.walk(156,236);a.walk(181.8,236,epsilon=.4);a.press('e',15);print('BOARDED',json.dumps(a.state()),flush=True)
  a.ship_straight(345);a.step(200);a.capture('08-sea-result');print('RESULT',json.dumps(a.state()),flush=True);outcome={'passed':bool(a.state()['result'] and a.state()['result']['success']),'state':a.state()}
 except Exception as e:
  print('FAIL',str(e),flush=True);a.capture('sea-failure');outcome={'passed':False,'error':str(e),'state':a.state()}
 outcome['sha256']=hashlib.sha256(ROOT.joinpath('index.html').read_bytes()).hexdigest();outcome.update({'route':'sea','method':'Keyboard/mouse input event replay, fixed time stepping. No actor, health or mission-state edits after the route was selected.','events':a.events,'errors':errs,'gameEvents':page.evaluate('__experience.experience.events')});(OUT/'input-sea.json').write_text(json.dumps(outcome,indent=2,ensure_ascii=False));b.close()
