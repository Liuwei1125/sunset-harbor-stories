"""Smoke-check the actual public directory before Sites publication."""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
import json, os, shutil

ROOT=Path(__file__).resolve().parents[1]
class QuietHandler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT/'dist')))
Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/'
checks=[];errors=[];failed=[]
def check(name,condition):
 checks.append({'name':name,'pass':bool(condition)});print(('PASS ' if condition else 'FAIL ')+name,flush=True)
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM') or shutil.which('chromium') or '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
  context=browser.new_context(viewport={'width':1280,'height':800});page=context.new_page()
  page.on('pageerror',lambda e:errors.append(e.stack or str(e)));page.on('response',lambda r:failed.append({'url':r.url,'status':r.status}) if r.status>=400 else None)
  page.goto(base);page.wait_for_function('!!window.__experience')
  check('Public main game opens with a link to the new Club',page.locator('#arcade-open').get_attribute('href')=='club/')
  page.locator('#start').click();page.locator('[data-route="road"]').click();page.wait_for_timeout(350)
  before=page.evaluate('({...__experience.player.pos})');page.keyboard.down('w');page.wait_for_timeout(500);page.keyboard.up('w');after=page.evaluate('({...__experience.player.pos})');page.keyboard.press('Escape')
  check('Published main-game bundle starts, walks and pauses',before!=after and page.evaluate('__experience.state.paused'))
  page.goto(base);page.wait_for_function('!!window.__experience');page.locator('#arcade-open').click();page.wait_for_function('document.querySelector("#lobby")&&!document.querySelector("#lobby").hidden',timeout=60000)
  check('Main-game navigation reaches the new Club and offers a return link',page.url.endswith('/club/') and page.locator('.lobby-footer a[href="../"]').is_visible())
  for mode in ['race','shooting','darts','archery']:
   page.goto(base+'club/?verify=1');page.wait_for_function('window.__club&&!__club.app.loading',timeout=60000)
   page.locator(f'[data-mode="{mode}"]').click();page.wait_for_function('!__club.app.loading',timeout=60000)
   page.locator('#start').click();page.locator('[data-action="go"]').click();page.wait_for_function('__club.sim.state.phase==="playing"',timeout=15000)
   if mode=='race':
    page.keyboard.down('w');page.wait_for_timeout(400);page.keyboard.press('c');page.keyboard.up('w')
    check('New public car and native camera switching work',page.evaluate('__club.sim.state.run.car.speed>0&&__club.sim.state.save.settings.camera==="hood"'))
   check(mode+' loads its public assets and reaches gameplay without GL errors',page.evaluate('document.getElementById("view").getContext("webgl2").getError()===0'))
  page.goto(base+'club/');page.wait_for_function('document.querySelector("#lobby")&&!document.querySelector("#lobby").hidden',timeout=60000)
  page.locator('.lobby-footer a[href="./circuit/"]').click();page.wait_for_function('window.__circuit&&!__circuit.loading',timeout=60000)
  check('Circuit entry loads same-origin physics and selected vehicle',page.url.endswith('/club/circuit/') and page.locator('#car-name').inner_text()=='BMW M4')
  page.locator('#start').click();page.wait_for_function('!__circuit.loading&&__circuit.session.phase==="running"',timeout=30000)
  page.keyboard.down('w');page.wait_for_timeout(650);page.keyboard.up('w');check('Published Circuit can accelerate',page.evaluate('__circuit.session.player.speed>1'))
  page.goto(base+'arcade.html');page.wait_for_timeout(1200);check('Original offline Club is also available',page.locator('canvas').count()>0 and 'HARBOR' in page.locator('body').inner_text())
  page.goto(base+'showroom.html');page.wait_for_function('document.querySelector("#view-status").textContent.includes("可交互")',timeout=60000);check('Existing model showroom loads its local engine and model',page.locator('#viewer-error').is_hidden())
  page.goto(base+'graphics.html');page.locator('[data-scene="rifle"]').click();page.wait_for_function('[...document.querySelectorAll("img")].every(i=>i.complete&&i.naturalWidth>0)');check('Existing graphics comparison and images load',True)
  check('No browser exceptions or HTTP failures in public routes',not errors and not failed)
  page.goto('about:blank');context.close();browser.close()
finally:server.shutdown();server.server_close()
report={'passed':sum(c['pass'] for c in checks),'total':len(checks),'checks':checks,'errors':errors,'httpFailures':failed,'scope':'Local smoke check of the prepared public directory, not a new full gameplay benchmark or hosted-network test.'}
(ROOT/'site-verification/smoke.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(f'{report["passed"]}/{report["total"]} passed',flush=True)
if report['passed']!=report['total']:raise SystemExit(1)
