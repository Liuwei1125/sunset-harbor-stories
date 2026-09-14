from pathlib import Path
from playwright.sync_api import sync_playwright
import hashlib
import json
from verify_config import ROOT, OUT, PREVIEW, CHROMIUM
root=ROOT
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=CHROMIUM,headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);page=b.new_page(viewport={'width':1100,'height':720});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(root.joinpath('index.html').read_text().replace('<script>','<script>window.requestAnimationFrame=()=>0;',1));page.wait_for_function('!!window.__experience',polling=20);result=page.evaluate((ROOT/'tools'/'regress.js').read_text());result['browserErrors']=errors;result['sha256']=hashlib.sha256((ROOT/'index.html').read_bytes()).hexdigest()
 print(json.dumps(result,ensure_ascii=False,indent=2));(OUT/'regressions.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));b.close()
