from pathlib import Path
from playwright.sync_api import sync_playwright
import hashlib
import json,time,hashlib
from verify_config import ROOT, OUT, PREVIEW, CHROMIUM
root=ROOT
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=CHROMIUM,headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1280,'height':800});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content((root/'index.html').read_text());page.wait_for_function('!!window.__experience')
 page.locator('#free-explore6').click();page.evaluate('startRecording6("120s-live-RAF-exploration")');start=time.monotonic();heartbeats=[]
 for i in range(12):
  page.keyboard.down('ArrowRight');page.wait_for_timeout(600);page.keyboard.up('ArrowRight');page.wait_for_timeout(9400)
  heartbeats.append(page.evaluate('({t:state.t,paused:state.paused,dead:state.dead,fps:telemetry.fps,projectiles:combat.projectiles.length})'))
  print('heartbeat',i+1,heartbeats[-1],flush=True)
 report=page.evaluate('diagnosticReport6()');report['actualWallSeconds']=round(time.monotonic()-start,2);report['heartbeats']=heartbeats;report['browserErrors']=errors;report['sha256']=hashlib.sha256((root/'index.html').read_bytes()).hexdigest();report['passed']=not errors and all(not h['dead'] and not h['paused'] for h in heartbeats) and len(report['samples'])>80
 report['scope']='Live requestAnimationFrame, 120+ seconds idle exploration with input turns; CPU compatibility renderer, not real-phone, sustained combat or thermal qualification.'
 (OUT/'live-120s.json').write_text(json.dumps(report,indent=2,ensure_ascii=False));page.screenshot(path=str(PREVIEW/'15-live-desktop.png'));print('LIVE',report['passed'],report['actualWallSeconds'],len(report['samples']),flush=True);b.close()
