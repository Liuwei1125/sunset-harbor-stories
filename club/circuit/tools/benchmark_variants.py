from pathlib import Path
import sys,json
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'tools'))
from browser_common import server,CHROME
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parents[1]/'verification'
with server(),sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=CHROME);page=b.new_page(viewport={'width':1440,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8012/club/circuit/');page.wait_for_function('window.__circuit && !__circuit.loading');samples=[]
 for car in ['bmw-m4','ferrari-458','su7']:
  for track in ['harbor','coast']:
   page.evaluate('(s)=>{Object.assign(__circuit.settings,s);__circuit.load(false);}',{'car':car,'track':track,'event':'race','camera':0});page.wait_for_function('!__circuit.loading && !__circuit.lobby');page.wait_for_function('__circuit.session.phase==="running"');page.keyboard.down('w');page.evaluate('__circuit.renderer.frameTimes=[]');page.wait_for_timeout(12000);page.keyboard.up('w');sample=page.evaluate('({car:__circuit.settings.car,track:__circuit.settings.track,stats:__circuit.stats()})');samples.append(sample);print(sample,flush=True);page.screenshot(path=str(OUT/(car+'-'+track+'-performance.png')))
 (OUT/'performance-variants.json').write_text(json.dumps({'samples':samples,'errors':errors,'scope':'6 normal-RAF 12-second race samples; keyboard acceleration; 1440x900, high player LOD, low opponent LOD'},indent=2));b.close();assert not errors,errors;assert all(s['stats']['fps']>=40 for s in samples),samples
