"""Read-only campaign regressions plus its real HTTP entry and legacy Club link."""
from playwright.sync_api import sync_playwright
from browser_common import PROJECT,OUT,BASE,CHROME,server
import json,hashlib

errors=[];checks=[]
with server(),sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=CHROME)
 context=browser.new_context(viewport={'width':1280,'height':800});page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 original=(PROJECT/'index.html').read_text()
 page.set_content(original.replace('<script>','<script>window.requestAnimationFrame=()=>0;',1))
 page.wait_for_function('!!window.__experience',polling=20);fixtures=page.evaluate((PROJECT/'tools/regress.js').read_text())
 checks.append({'name':'Existing campaign rule regressions','pass':fixtures['passed']==fixtures['total'],'detail':fixtures})
 page.goto(BASE.split('/club/')[0]+'/index.html');page.wait_for_function('!!window.__experience')
 checks.append({'name':'Campaign still links to the original standalone Club','pass':page.locator('#arcade-open').get_attribute('href')=='arcade.html?v=6.4.0'})
 page.locator('#start').click();page.locator('[data-route="road"]').click();page.wait_for_timeout(600);before=page.evaluate('({...__experience.player.pos})')
 page.keyboard.down('w');page.wait_for_timeout(900);page.keyboard.up('w');after=page.evaluate('({...__experience.player.pos})')
 checks.append({'name':'Campaign native start and walking remain usable','pass':before!=after and page.evaluate('__experience.state.started&&!__experience.state.paused'),'detail':{'before':before,'after':after}})
 page.keyboard.press('Escape');page.wait_for_timeout(100)
 checks.append({'name':'Campaign native pause remains usable','pass':page.evaluate('__experience.state.paused')})
 page.goto(BASE.split('/club/')[0]+'/arcade.html?v=6.4.0');page.wait_for_timeout(1500)
 checks.append({'name':'Original Club still boots independently','pass':page.locator('canvas').count()>0 and page.locator('body').inner_text().find('HARBOR')>=0})
 context.close();browser.close()
checks.append({'name':'No uncaught exceptions in the protected entries','pass':not errors,'detail':errors})
report={'passed':sum(c['pass'] for c in checks),'total':len(checks),'checks':checks,'errors':errors,'campaignSHA256':hashlib.sha256((PROJECT/'index.html').read_bytes()).hexdigest(),'legacySHA256':hashlib.sha256((PROJECT/'arcade.html').read_bytes()).hexdigest(),'scope':'Existing campaign rule fixture suite and native boot/walk/pause smoke check; not a new full campaign playthrough.'}
(OUT/'campaign.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False,indent=2))
if report['passed']!=report['total']:raise SystemExit(1)
