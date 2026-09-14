"""Real browser checks for the independent viewer; external network is blocked.

Uses native mouse/touch inputs and exported render pixels, not just DOM attributes.
Starts its own temporary loopback server; does not change the game or user saves.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlparse
import hashlib
import json
from playwright.sync_api import sync_playwright
from verify_config import ROOT, OUT, PREVIEW, CHROMIUM

checks=[];errors=[];external=[]
def check(name,ok,detail=None):
    checks.append({'name':name,'pass':bool(ok),'detail':detail})
    print(('PASS ' if ok else 'FAIL ')+name,flush=True)

class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass

def render_stats(page):
    return page.evaluate('''async()=>{
      const blob=await document.querySelector('model-viewer').toBlob(),bitmap=await createImageBitmap(blob);
      const c=new OffscreenCanvas(bitmap.width,bitmap.height),ctx=c.getContext('2d');ctx.drawImage(bitmap,0,0);
      const d=ctx.getImageData(0,0,c.width,c.height).data;let count=0,sum=0,minX=c.width,maxX=0,minY=c.height,maxY=0,hash=2166136261;
      for(let i=0;i<d.length;i+=4)if(d[i+3]>250){count++;sum+=(d[i]+d[i+1]+d[i+2])/3;const x=(i/4)%c.width,y=Math.floor(i/4/c.width);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);hash=Math.imul(hash^d[i],16777619);}
      return {count,mean:sum/(count||1),hash,width:c.width,height:c.height,bounds:[minX,minY,maxX,maxY]};
    }''')

def load(page,url):
    page.goto(url)
    page.wait_for_function('document.querySelector("model-viewer").loaded&&document.querySelector("#reset").disabled===false',timeout=45000)
    page.wait_for_timeout(650)

def orbit(page): return page.evaluate('document.querySelector("model-viewer").getCameraOrbit()')

server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}'

try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path=CHROMIUM)
        context=browser.new_context(viewport={'width':1440,'height':1000},device_scale_factor=1)
        def route(request):
            host=urlparse(request.request.url).hostname
            if host and host!='127.0.0.1': external.append(request.request.url);request.abort()
            else: request.continue_()
        context.route('**/*',route)
        page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
        load(page,base+'/showroom.html')
        original=render_stats(page)
        check('AR-7 GLB renders visible pixels with all runtime network restricted to loopback',original['count']>15000,original)
        page.locator('#exposure').fill('1.6');page.wait_for_timeout(400);bright=render_stats(page)
        check('Exposure changes actual model luminance',bright['mean']>original['mean']+8,{'default':original['mean'],'bright':bright['mean']})
        page.locator('#reset').click();page.wait_for_timeout(400)
        page.locator('#tone').select_option('neutral');page.wait_for_timeout(400);neutral_tone=render_stats(page)
        check('AgX / Neutral switch changes rendered material pixels',neutral_tone['hash']!=original['hash'],{'agx':original['mean'],'neutral':neutral_tone['mean']})
        page.locator('[name="lighting"][value="neutral"]').check();page.wait_for_timeout(700);neutral_light=render_stats(page)
        page.locator('[name="lighting"][value="sunset"]').check();page.wait_for_timeout(700);sunset=render_stats(page)
        check('All three local light presets produce different model renders',len({original['hash'],neutral_light['hash'],sunset['hash']})==3,{'studio':original['hash'],'neutral':neutral_light['hash'],'sunset':sunset['hash']})
        page.locator('#tone').select_option('aces');page.wait_for_timeout(250)
        check('ACES option remains usable',page.evaluate('document.querySelector("model-viewer").toneMapping==="aces"'))
        page.locator('#shadow').fill('0');page.wait_for_timeout(300)
        check('Shadow can be disabled',page.evaluate('document.querySelector("model-viewer").shadowIntensity===0&&document.querySelector("#shadow-value").value==="0.00"'))
        page.locator('[data-view="side"]').click();page.wait_for_timeout(600);side=orbit(page)
        page.locator('[data-view="detail"]').click();page.wait_for_timeout(600);detail=orbit(page)
        check('Camera presets move the real camera and zoom into the receiver',abs(side['theta']-1.570796)<.01 and detail['radius']<side['radius']*.5,{'side':side,'detail':detail})
        page.locator('#rotate').click();first=page.evaluate('document.querySelector("model-viewer").turntableRotation');page.wait_for_timeout(750);second=page.evaluate('document.querySelector("model-viewer").turntableRotation')
        page.locator('#rotate').click();stopped=page.evaluate('document.querySelector("model-viewer").turntableRotation');page.wait_for_timeout(350);after=page.evaluate('document.querySelector("model-viewer").turntableRotation')
        check('Automatic rotation starts and stops',abs(second-first)>.05 and abs(after-stopped)<.003,{'advance':second-first,'stoppedAdvance':after-stopped})
        page.locator('#reset').click();page.wait_for_timeout(650)
        check('Reset restores comparison lighting, camera and turntable',page.evaluate('''()=>{let v=document.querySelector('model-viewer');return v.exposure===1&&v.toneMapping==='agx'&&v.shadowIntensity===1&&Math.abs(v.getCameraOrbit().radius-2.65)<.01&&Math.abs(v.turntableRotation)<.001&&!v.autoRotate}'''))
        box=page.locator('model-viewer').bounding_box();x=box['x']+box['width']*.5;y=box['y']+box['height']*.45
        before=orbit(page);page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+130,y-25,steps=10);page.mouse.up();page.wait_for_timeout(450);dragged=orbit(page)
        page.mouse.wheel(0,-150);page.wait_for_timeout(450);zoomed=orbit(page)
        check('Native mouse drag and wheel rotate and zoom',abs(dragged['theta']-before['theta'])>.1 and zoomed['radius']<dragged['radius'],{'before':before,'dragged':dragged,'zoomed':zoomed})
        page.locator('#restore-comparison').click();page.wait_for_timeout(850)
        page.locator('#comparison').scroll_into_view_if_needed();page.wait_for_function('[...document.images].every(i=>i.complete&&i.naturalWidth===1296)')
        check('Both real renderer references load at full resolution',page.evaluate('[...document.images].every(i=>i.naturalHeight===810)'))
        page.evaluate('scrollTo(0,0)');page.wait_for_timeout(200);page.screenshot(path=str(PREVIEW/'showroom-desktop.png'),full_page=True)
        page.locator('model-viewer').screenshot(path=str(PREVIEW/'showroom-ar7.png'))
        check('Desktop layout has no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
        page.locator('[name="lighting"][value="sunset"]').check();page.wait_for_timeout(700);page.screenshot(path=str(PREVIEW/'showroom-sunset.png'))
        # A new browser context represents a clean mobile visit (not a resized desktop camera).
        mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1)
        mobile.route('**/*',route);phone=mobile.new_page();phone.on('pageerror',lambda error:errors.append(str(error)))
        load(phone,base+'/showroom.html');framed=render_stats(phone)
        check('Portrait framing keeps the entire model away from both horizontal edges',framed['bounds'][0]>framed['width']*.06 and framed['bounds'][2]<framed['width']*.94,framed)
        cdp=mobile.new_cdp_session(phone);box=phone.locator('model-viewer').bounding_box();x=box['x']+box['width']*.5;y=box['y']+box['height']*.45
        before=orbit(phone)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':0}]})
        for i in range(1,11): cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+i*7,'y':y,'id':0}]});phone.wait_for_timeout(20)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});phone.wait_for_timeout(350);dragged=orbit(phone)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x-25,'y':y,'id':0},{'x':x+25,'y':y,'id':1}]})
        for i in range(1,9): cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x-25-i*4,'y':y,'id':0},{'x':x+25+i*4,'y':y,'id':1}]});phone.wait_for_timeout(20)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});phone.wait_for_timeout(400);pinched=orbit(phone)
        check('Native emulated touch drag and two-finger pinch change the camera',abs(dragged['theta']-before['theta'])>.1 and pinched['radius']<dragged['radius']*.9,{'before':before,'dragged':dragged,'pinched':pinched})
        phone.locator('#reset').click();phone.wait_for_timeout(600);phone.evaluate('scrollTo(0,0)');phone.screenshot(path=str(PREVIEW/'showroom-mobile.png'),full_page=True)
        check('Mobile controls fit without horizontal scrolling',phone.evaluate('document.documentElement.scrollWidth<=innerWidth'))
        phone.set_viewport_size({'width':844,'height':390});phone.wait_for_timeout(700);rotated=render_stats(phone)
        check('Orientation change reframes the model',rotated['bounds'][0]>rotated['width']*.04 and rotated['bounds'][2]<rotated['width']*.96,rotated)
        # Failure paths use separate pages and never touch user data.
        failure=context.new_page();failure.route('**/ar7-rifle.glb',lambda request:request.abort());failure.goto(base+'/showroom.html');failure.locator('#viewer-error').wait_for(state='visible')
        check('Missing model displays a useful failure state',failure.locator('#retry').is_visible() and failure.locator('#reset').is_disabled())
        failure.unroute('**/ar7-rifle.glb');failure.locator('#retry').click();failure.wait_for_function('document.querySelector("model-viewer").loaded');check('Retry recovers after the asset becomes available',failure.locator('#viewer-error').is_hidden())
        component=context.new_page();component.route('**/model-viewer.min.js',lambda request:request.abort());component.goto(base+'/showroom.html');component.locator('#viewer-error').wait_for(state='visible')
        check('Missing component reports the dependency failure', '展示组件未能加载' in component.locator('#error-message').inner_text())
        local=context.new_page();local.goto((ROOT/'showroom.html').as_uri());check('Direct file opening explains the local HTTP requirement','python3 -m http.server' in local.locator('#error-message').inner_text())
        check('No external runtime requests or uncaught application errors',not external and not errors,{'external':external,'errors':errors})
        browser.close()
finally:
    server.shutdown();server.server_close()

manifest=json.loads((ROOT/'assets/showroom/manifest.json').read_text())
check('References match the current GLB and game build',manifest['modelSha256']==hashlib.sha256((ROOT/manifest['model']).read_bytes()).hexdigest() and manifest['gameSha256']==hashlib.sha256((ROOT/'index.html').read_bytes()).hexdigest())
files=[ROOT/'showroom.html',ROOT/'showroom.css',ROOT/'showroom.js',*list((ROOT/'assets/showroom').glob('*')),*list((ROOT/'assets/vendor/model-viewer').glob('*'))]
report={'pass':all(c['pass'] for c in checks),'checks':checks,'physicalMobileTested':False,'runtimeNetwork':'Only loopback HTTP allowed; every external request blocked and recorded',
        'files':{str(f.relative_to(ROOT)):hashlib.sha256(f.read_bytes()).hexdigest() for f in files if f.is_file()}}
(OUT/'showroom-browser.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
print(f'{sum(c["pass"] for c in checks)}/{len(checks)} passed',flush=True)
if not report['pass']: raise SystemExit(1)
