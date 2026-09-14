from playwright.sync_api import sync_playwright
from verify_config import ROOT,OUT,CHROMIUM
import json
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=CHROMIUM)
 page=b.new_page(viewport={'width':960,'height':600});page.add_init_script('window.requestAnimationFrame=()=>0')
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto((ROOT/'arcade.html').as_uri());page.wait_for_function('!!window.__club',polling=20)
 page.add_script_tag(content=(ROOT/'tools/arcade_playthrough.js').read_text())
 results=[]
 for mode in ['race','shooting','darts','archery']:
  for level in range(6):
   for difficulty in ['casual','sport','expert']:
    result=page.evaluate('args=>clubQADrive(...args)',[mode,level,difficulty])
    results.append(result)
    print(mode,level,difficulty,result['success'],round(result['elapsed'],2),'score',result['score'],'shots',result.get('shots'),'gates',result.get('checkpoints'),'rank',result.get('rank'),flush=True)
 print('errors',errors)
 (OUT/'arcade-playthrough-probe.json').write_text(json.dumps({'results':results,'errors':errors},ensure_ascii=False,indent=2))
 b.close()
