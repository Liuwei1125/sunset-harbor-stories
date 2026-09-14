from input_driver import *
import hashlib
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=CHROMIUM,headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1280,'height':800});errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
 html=ROOT.joinpath('index.html').read_text().replace('<script>','<script>window.requestAnimationFrame=()=>0;',1)
 page.set_content(html,wait_until='load');page.wait_for_function('!!window.__experience',timeout=20000,polling=20)
 page.locator('#start').click();page.locator('[data-route="road"]').click()
 a=InputRunner(page)
 try:
  a.walk(98,341);a.press('e',40);print('ENTER',json.dumps(a.state()),flush=True)
  a.drive_straight(101,285);a.press('e',40);print('PARK',json.dumps(a.state()),flush=True)
  a.clear_visible();a.walk(104,266);a.clear_visible();a.walk(104,244,crouch=True);a.clear_visible();a.walk(115,244,crouch=True);a.clear_visible();a.walk(111.5,253.5,crouch=True)
  a.capture('04-terminal');a.press('e',180);print('TERMINAL',json.dumps(a.state()),flush=True)
  a.clear_visible();a.walk(124,241,crouch=True);a.clear_visible();a.press('e',240);a.capture('05-cargo');print('CARGO',json.dumps(a.state()),flush=True)
  a.walk(115,244,crouch=True);a.walk(104,244,crouch=True);a.walk(104,266);a.walk(103,282);a.press('e',40)
  a.reverse_to(102,340);a.step(200);a.capture('06-result');print('RESULT',json.dumps(a.state()),flush=True)
  outcome={'passed':bool(a.state()['result'] and a.state()['result']['success']),'state':a.state()}
 except Exception as e:
  print('FAIL',str(e),flush=True);a.capture('failure');outcome={'passed':False,'error':str(e),'state':a.state()}
 outcome['sha256']=hashlib.sha256(ROOT.joinpath('index.html').read_bytes()).hexdigest();outcome.update({'route':'road','method':'Keyboard events + fixed simulation steps. No actor/health/mission-state edits after scenario start.','events':a.events,'errors':errs,'gameEvents':page.evaluate('__experience.experience.events')})
 (OUT/'input-road.json').write_text(json.dumps(outcome,indent=2,ensure_ascii=False))
 b.close()
