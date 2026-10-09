"""Structural and native-browser checks for the independent SU7 asset.

Does not load or modify gameplay, browser saves, or the published Site.
"""
from pathlib import Path
from contextlib import contextmanager
import json,struct,hashlib,math,threading,http.server,functools,time

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
REPORT={'checks':[],'models':{},'browser':{}}


def check(name,condition,detail=None):
    REPORT['checks'].append({'name':name,'passed':bool(condition),'detail':detail})
    if not condition:raise AssertionError(name+': '+str(detail))


def inspect_glb(lod):
    path=HERE/f'xiaomi-su7.{lod}.glb';data=path.read_bytes()
    magic,version,length=struct.unpack_from('<III',data)
    check(lod+' / GLB header',magic==0x46546c67 and version==2 and length==len(data))
    size,kind=struct.unpack_from('<II',data,12);doc=json.loads(data[20:20+size]);offset=20+size
    binary=data[offset+8:]
    check(lod+' / embedded assets',all('uri' not in b for b in doc.get('buffers',[])) and not doc.get('images'))
    nodes=doc['nodes'];names={n.get('name') for n in nodes}
    manifest=json.loads((HERE/'manifest.json').read_text())
    check(lod+' / matching manifest version',next(n for n in nodes if n.get('name')=='xiaomi-su7-study').get('extras',{}).get('version')==manifest['version'])
    entry=next(f for f in manifest['files'] if f['lod']==lod)
    check(lod+' / matching manifest hash',hashlib.sha256(data).hexdigest()==entry['sha256'])
    check(lod+' / all animation pivots',all('joint:'+k in names for k in manifest['joints']))
    check(lod+' / no cameras or lights',not doc.get('cameras') and not doc.get('extensions',{}).get('KHR_lights_punctual'))
    check(lod+' / no construction meshes',not any(name and ('NORMAL SOURCE' in name or 'CONSTRUCTION /' in name) for name in names))
    optical=[m for m in doc.get('materials',[]) if m.get('name','').startswith(('27 ','30 '))]
    check(lod+' / optical transmission preserved',len(optical)==2 and all(m.get('extensions',{}).get('KHR_materials_transmission',{}).get('transmissionFactor',0)>.9 for m in optical))
    for part,j in manifest['joints'].items():
        node=next(n for n in nodes if n.get('name')=='joint:'+part)
        actual=node.get('translation',[0,0,0]);expected=j['pivot']
        check(lod+' / pivot '+part,all(abs(a-b)<1e-5 for a,b in zip(actual,expected)),actual)
    triangles=0;primitives=0;finite=True;in_range=True;normal_valid=True
    for mesh in doc['meshes']:
        for primitive in mesh['primitives']:
            primitives+=1
            ia=doc['accessors'][primitive['indices']];triangles+=ia['count']//3
            pa=doc['accessors'][primitive['attributes']['POSITION']];pv=doc['bufferViews'][pa['bufferView']]
            off=pv.get('byteOffset',0)+pa.get('byteOffset',0);stride=pv.get('byteStride',12)
            for i in range(pa['count']):
                p=struct.unpack_from('<fff',binary,off+i*stride);finite &= all(math.isfinite(v) for v in p)
            na=doc['accessors'][primitive['attributes']['NORMAL']];nv=doc['bufferViews'][na['bufferView']]
            no=nv.get('byteOffset',0)+na.get('byteOffset',0);ns=nv.get('byteStride',12)
            for i in range(na['count']):
                n=struct.unpack_from('<fff',binary,no+i*ns)
                normal_valid &= all(math.isfinite(v) for v in n) and abs(sum(v*v for v in n)-1)<.002
            iv=doc['bufferViews'][ia['bufferView']];off=iv.get('byteOffset',0)+ia.get('byteOffset',0)
            fmt={5121:'B',5123:'H',5125:'I'}[ia['componentType']];width=struct.calcsize(fmt)
            indices=struct.unpack_from('<'+fmt*ia['count'],binary,off);in_range &= max(indices)<pa['count']
    check(lod+' / finite vertices and valid indices',finite and in_range)
    check(lod+' / finite unit surface normals',normal_valid)
    REPORT['models'][lod]={'bytes':len(data),'triangles':triangles,'drawPrimitives':primitives,'sha256':hashlib.sha256(data).hexdigest()}


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass


@contextmanager
def server():
    handler=functools.partial(QuietHandler,directory=str(ROOT))
    httpd=http.server.ThreadingHTTPServer(('127.0.0.1',0),handler)
    thread=threading.Thread(target=httpd.serve_forever,daemon=True);thread.start()
    try:yield f'http://127.0.0.1:{httpd.server_port}/art/vehicles/su7/preview.html'
    finally:httpd.shutdown();httpd.server_close();thread.join()


def browser_checks(url):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless=True)
        context=browser.new_context(viewport={'width':1440,'height':1000},device_scale_factor=1)
        page=context.new_page();errors=[];failures=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.on('response',lambda r:failures.append({'status':r.status,'url':r.url}) if r.status>=400 else None)
        page.goto(url);page.wait_for_function('window.__su7?.ready',timeout=90000)
        page.wait_for_timeout(1200)
        check('Browser / native high GLB loaded',page.evaluate('__su7.triangles')==REPORT['models']['high']['triangles'])
        check('Browser / current revision',page.evaluate('__su7.version')==json.loads((HERE/'manifest.json').read_text())['version'])
        page.screenshot(path=str(HERE/'renders'/'browser-v5-front.png'))
        before=page.evaluate('__su7.pose()');page.locator('#wheels').check();page.wait_for_timeout(250)
        after=page.evaluate('__su7.pose()')
        check('Browser / wheels animate',before!=after)
        page.locator('#wheels').uncheck()
        page.locator('#steer').fill('22');page.locator('#steer').dispatch_event('input');page.wait_for_timeout(100)
        posed=page.evaluate('__su7.pose()');turns=[p for p in posed if p['name']=='joint:steering']
        check('Browser / steering pivot rotates',turns and abs(turns[0]['q'][2])>.1)
        page.locator('#steer').fill('0');page.locator('#steer').dispatch_event('input')
        for view in ['side','rear','cockpit']:
            page.locator('[data-view='+view+']').click();page.wait_for_timeout(300)
            check('Browser / '+view+' view',page.evaluate('__su7.view')==view)
            page.screenshot(path=str(HERE/'renders'/('browser-v5-'+view+'.png')))
        page.locator('[data-color="#286D63"]').click()
        check('Browser / paint changes',page.evaluate("__su7.scene.materials.find(m=>m.name.startsWith('01 ')).albedoColor.g > __su7.scene.materials.find(m=>m.name.startsWith('01 ')).albedoColor.b"))
        page.locator('[data-color="#007BC8"]').click()
        page.locator('#lightweight').check();page.wait_for_function('__su7.lod==="low" && document.querySelector("#load").style.display==="none"',timeout=90000)
        check('Browser / native low GLB loaded',page.evaluate('__su7.triangles')==REPORT['models']['low']['triangles'])
        page.locator('[data-view=front]').click();page.wait_for_timeout(300)
        page.screenshot(path=str(HERE/'renders'/'browser-v5-low.png'))
        report=page.evaluate('''()=>{const gl=__su7.engine._gl,e=gl.getExtension('WEBGL_debug_renderer_info');return {gpu:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):null,engine:__su7.engine.version,meshes:__su7.scene.meshes.length};}''')
        REPORT['browser']=report
        check('Browser / no runtime errors or missing files',not errors and not failures,{'errors':errors,'failures':failures})
        page.goto(url.replace('preview.html','comparison.html'))
        for mode in ['official','previous']:
            page.locator('#source').select_option(mode)
            for view in ['front','side','rear','rear-flat','headlight','wheel','clay-side','reflection-rear']:
                page.locator('[data-view='+view+']').click()
                page.wait_for_function("[...document.querySelectorAll('.grid img')].every(i=>i.complete&&i.naturalWidth>0)")
                check('Comparison / '+mode+' / '+view,page.locator('[data-view='+view+']').get_attribute('aria-pressed')=='true')
        page.locator('#source').select_option('official');page.locator('[data-view=rear]').click()
        page.wait_for_function("[...document.querySelectorAll('.grid img')].every(i=>i.complete&&i.naturalWidth>0)")
        page.screenshot(path=str(HERE/'renders'/'comparison-v5.png'),full_page=True)
        page.wait_for_function("[...document.querySelectorAll('.overlay-stage img')].every(i=>i.complete&&i.naturalWidth>0)")
        reference=page.locator('#overlay-model').evaluate('''img=>{
            const canvas=document.createElement('canvas');
            canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
            const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
            const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
            let minAlpha=255,maxAlpha=0;
            for(let i=3;i<data.length;i+=4){
                minAlpha=Math.min(minAlpha,data[i]);maxAlpha=Math.max(maxAlpha,data[i]);
                if(minAlpha===0&&maxAlpha===255)break;
            }
            return {width:canvas.width,height:canvas.height,minAlpha,maxAlpha};
        }''')
        check('Reference / transparent full-resolution render',reference=={'width':2048,'height':1152,'minAlpha':0,'maxAlpha':255},reference)
        page.locator('#overlay-opacity').fill('25');page.locator('#overlay-opacity').dispatch_event('input')
        check('Comparison / overlay opacity',page.locator('#overlay-model').evaluate('(img)=>getComputedStyle(img).opacity')=='0.25')
        page.locator('#overlay-opacity').fill('55');page.locator('#overlay-opacity').dispatch_event('input')
        page.locator('.overlay-stage').screenshot(path=str(HERE/'renders'/'v5-overlay-review.png'))
        check('Comparison / no runtime errors or missing files',not errors and not failures,{'errors':errors,'failures':failures})
        context.close()
        mobile=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True)
        page=mobile.new_page();page.goto(url);page.wait_for_function('window.__su7?.ready',timeout=90000);page.wait_for_timeout(800)
        check('Mobile emulation / controls fit',page.evaluate('document.documentElement.scrollWidth===innerWidth'))
        page.locator('[data-view=cockpit]').tap();check('Mobile emulation / cockpit touch',page.evaluate('__su7.view')=='cockpit')
        page.locator('[data-view=front]').tap();page.screenshot(path=str(HERE/'renders'/'browser-v5-mobile.png'))
        mobile.close();browser.close()


def main():
    (HERE/'renders').mkdir(exist_ok=True)
    try:
        for lod in ['high','low']:inspect_glb(lod)
        check('LOD reduces geometry',REPORT['models']['low']['triangles']<REPORT['models']['high']['triangles']*.5)
        fit=json.loads((HERE/'surface-fit.json').read_text())
        areas=fit['componentTessellation']
        check('Geometry / component tessellation area',len(areas)==60 and all(a['relativeAreaError']<.005 for a in areas))
        with server() as url:browser_checks(url)
    except Exception as error:
        REPORT['checks'].append({'name':'Verification run completed','passed':False,'detail':str(error)})
        raise
    finally:
        REPORT['passed']=all(c['passed'] for c in REPORT['checks'])
        (HERE/'verification.json').write_text(json.dumps(REPORT,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'passed':REPORT['passed'],'checks':len(REPORT['checks']),'models':REPORT['models'],'browser':REPORT['browser']},ensure_ascii=False,indent=2))


if __name__=='__main__':main()
