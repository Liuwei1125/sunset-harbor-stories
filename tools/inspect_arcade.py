from playwright.sync_api import sync_playwright
from verify_config import ROOT,CHROMIUM,PREVIEW
import json
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=CHROMIUM)
 page=b.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto((ROOT/'arcade.html').as_uri());page.wait_for_timeout(1800)
 print(json.dumps({'ready':page.evaluate('!!window.__club'),'errors':errors,'loading':page.locator('#loading').inner_text()},ensure_ascii=False),flush=True)
 if not page.evaluate('!!window.__club'):raise SystemExit(1)
 page.screenshot(path=str(PREVIEW/'club-lobby.png'))
 for mode in ['race','shooting','darts','archery']:
  page.evaluate('(m)=>{clubLobby();clubSelectMode(m)}',mode)
  page.locator('#club-start').click();page.locator('#club-go').click();page.wait_for_timeout(3600)
  page.screenshot(path=str(PREVIEW/('club-'+mode+'-initial.png')))
  print(mode,page.evaluate('({phase:CLUB.phase,errors:CLUB.frame.errors,gl:renderer.gl.getError(),fps:CLUB.frame.fps,cpu:CLUB.frame.cpu,triangles:telemetry.triangles,draws:telemetry.draws,cam:cam.eye})'),flush=True)
 print('errors',errors)
 b.close()
