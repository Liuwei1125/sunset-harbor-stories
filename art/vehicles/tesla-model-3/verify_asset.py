"""Check actual GLBs and exercise their Babylon runtime in Chromium."""
from pathlib import Path
import json, struct, math, hashlib, threading, http.server, functools
from playwright.sync_api import sync_playwright

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
report={'checks':[],'models':{},'browser':{}}

def check(name,value,detail=None):
    report['checks'].append({'name':name,'passed':bool(value),'detail':detail})
    if not value:raise AssertionError(name+': '+str(detail))

def glb(level):
    p=HERE/f'tesla-model-3.{level}.glb';data=p.read_bytes();magic,version,size=struct.unpack_from('<III',data)
    check(level+' / valid GLB',magic==0x46546c67 and version==2 and size==len(data))
    n=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+n]);binary=data[28+n:]
    manifest=json.loads((HERE/'manifest.json').read_text());entry=next(x for x in manifest['files'] if x['lod']==level)
    check(level+' / recorded checksum',hashlib.sha256(data).hexdigest()==entry['sha256'])
    check(level+' / embedded dependencies',all('uri' not in b for b in doc.get('buffers',[])) and all('uri' not in i and 'bufferView' in i for i in doc.get('images',[])))
    check(level+' / no Draco CDN or cameras',not doc.get('cameras') and 'KHR_draco_mesh_compression' not in doc.get('extensionsUsed',[]))
    nodes={n.get('name'):n for n in doc['nodes']}
    check(level+' / embedded attribution','CC BY 4.0' in nodes['tesla-model-3-highland']['extras']['license'])
    for name,j in manifest['joints'].items():
        node=nodes['joint:'+name];check(level+' / pivot '+name,all(abs(a-b)<1e-5 for a,b in zip(node['translation'],j['pivot'])) and bool(node.get('children')))
    def floats(accessor,width):
        a=doc['accessors'][accessor];v=doc['bufferViews'][a['bufferView']];start=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',width*4)
        return [struct.unpack_from('<'+'f'*width,binary,start+i*stride) for i in range(a['count'])]
    for display in manifest['dynamicDisplays'].values():
        ps=doc['meshes'][nodes[display['mesh']]['mesh']]['primitives'];check(level+' / independent '+display['mesh'],len(ps)==1 and doc['materials'][ps[0]['material']]['name']==display['material'])
        uvs=floats(ps[0]['attributes']['TEXCOORD_0'],2);check(level+' / full screen UV '+display['mesh'],all(-.0001<=v<=1.0001 for uv in uvs for v in uv) and min(u[0] for u in uvs)<.001 and max(u[0] for u in uvs)>.999)
    tris=0;finite=True;normals=True;indices=True
    for mesh in doc['meshes']:
        for p in mesh['primitives']:
            pos=floats(p['attributes']['POSITION'],3);norm=floats(p['attributes']['NORMAL'],3)
            finite &= all(math.isfinite(v) for xyz in pos for v in xyz)
            normals &= all(all(math.isfinite(v) for v in xyz) and abs(sum(v*v for v in xyz)-1)<.01 for xyz in norm)
            a=doc['accessors'][p['indices']];v=doc['bufferViews'][a['bufferView']];fmt={5121:'B',5123:'H',5125:'I'}[a['componentType']];off=v.get('byteOffset',0)+a.get('byteOffset',0)
            ix=struct.unpack_from('<'+fmt*a['count'],binary,off);indices &= max(ix)<len(pos);tris+=len(ix)//3
    check(level+' / finite geometry and valid indices',finite and indices)
    check(level+' / unit normals',normals)
    check(level+' / triangle count',tris==entry['triangles'])
    report['models'][level]={**entry,'materials':len(doc['materials'])}

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def browser(url):
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless=True)
        context=browser.new_context(viewport={'width':1440,'height':1000});page=context.new_page();errors=[];failures=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('response',lambda r:failures.append(r.url) if r.status>=400 else None)
        page.goto(url);page.wait_for_function('window.__model3?.ready',timeout=60000);page.wait_for_timeout(500)
        check('Browser / high GLB and both displays',page.evaluate('__model3.triangles')==report['models']['high']['triangles'] and page.evaluate('__model3.telemetry.stats().bindings')==2)
        for view in ['front','side','rear','cockpit','screen','rear-seat']:
            page.locator('[data-view="'+view+'"]').click();page.wait_for_timeout(150);check('View / '+view,page.evaluate('__model3.view')==view)
            page.screenshot(path=str(HERE/'renders'/f'browser-{view}.png'))
        page.locator('[data-view=front]').click();page.locator('#credits').click();check('Attribution / visible license',page.locator('#credit-dialog').is_visible() and 'CC BY 4.0' in page.locator('#credit-dialog').inner_text());page.locator('#close-credits').click()
        page.locator('#steer').fill('22');page.locator('#steer').dispatch_event('input');page.wait_for_timeout(80)
        q=page.evaluate('__model3.pose()');left=next(n for n in q if n['name']=='joint:wheel-front-left');right=next(n for n in q if n['name']=='joint:wheel-front-right');check('Rig / inner front wheel steers further',left['q'][1]>right['q'][1]>.05)
        steering=next(n for n in q if n['name']=='joint:steering');check('Rig / steering wheel follows',abs(steering['q'][2])>.1)
        page.locator('#steer').fill('0');page.locator('#steer').dispatch_event('input');page.evaluate('__model3.car.tick(0)');before=page.evaluate('__model3.pose()');page.locator('#wheels').check();page.wait_for_timeout(180);check('Rig / all wheels animate',sum(a!=b for a,b in zip(before,page.evaluate('__model3.pose()')) if a['name'].startswith('joint:wheel'))==4);page.locator('#wheels').uncheck()
        page.locator('[data-color="#293D57"]').click();check('Materials / paint changes',page.evaluate('__model3.car.info().paint')=='#293D57');page.locator('[data-color="#94252C"]').click()
        page.locator('#dark-interior').check();check('Materials / interior changes',page.evaluate('__model3.car.info().interior')=='#32383F');page.locator('#dark-interior').uncheck()
        before=page.evaluate("__model3.scene.textures.filter(t=>t.name.endsWith(' / live')).map(t=>t.getContext().canvas.toDataURL())")
        page.evaluate('__model3.setTelemetry({speedKph:188.4,gear:"D",powerKw:-95,batteryPct:71,lap:3,lapTimeMs:72911,deltaMs:-420,brake:.5,abs:true})');page.wait_for_timeout(450)
        after=page.evaluate("__model3.scene.textures.filter(t=>t.name.endsWith(' / live')).map(t=>t.getContext().canvas.toDataURL())")
        check('Telemetry / both real mesh textures update',len(before)==2 and all(a!=b for a,b in zip(before,after)))
        page.locator('[data-view=screen]').click();page.screenshot(path=str(HERE/'renders/browser-screen-live.png'))
        state=page.evaluate('__model3.telemetry.getState()');check('Telemetry / signed regeneration and caller lap time',state['powerKw']==-95 and state['lapTimeMs']==72911 and state['gear']=='D')
        page.evaluate('__model3.setTelemetry({speedKph:NaN,powerKw:Infinity,gear:"Q",lap:-4,batteryPct:150})');state=page.evaluate('__model3.telemetry.getState()');check('Telemetry / invalid values and clamping',state['speedKph']==188.4 and state['powerKw']==-95 and state['gear']=='D' and state['lap']==1 and state['batteryPct']==100)
        page.evaluate('__model3.setTelemetry({lap:3,batteryPct:71})')
        for level in ['low','high','low']:
            page.locator('#lightweight').set_checked(level=='low');page.wait_for_function(f'__model3.ready && __model3.lod==="{level}"',timeout=60000)
            check('LOD / '+level+' state and texture lifetime',page.evaluate('__model3.telemetry.getState().lapTimeMs')==72911 and page.evaluate('__model3.telemetry.stats().bindings')==2 and page.evaluate("__model3.scene.textures.filter(t=>t.name.endsWith(' / live')).length")==2)
        check('LOD / reduced geometry loaded',page.evaluate('__model3.triangles')==report['models']['low']['triangles'])
        page.locator('#lightweight').uncheck();page.wait_for_function('__model3.ready && __model3.lod==="high"')
        page.locator('#demo').click();page.evaluate('for(let i=0;i<90;i++)__model3.car.tick(.1)');check('Telemetry / demo drives data',page.evaluate('__model3.telemetry.getState().speedKph')>50)
        page.locator('#demo').click();paused=page.evaluate('({state:__model3.telemetry.getState(),spin:__model3.car.info().spin})');page.wait_for_timeout(150);check('Telemetry / pause freezes simulation and wheels',page.evaluate('__model3.telemetry.getState().lapTimeMs')==paused['state']['lapTimeMs'] and page.evaluate('__model3.car.info().spin')==paused['spin'])
        page.evaluate('__model3.telemetry.setDemo(true);__model3.setTelemetry({speedKph:123,lapTimeMs:12345})');check('Telemetry / external input stops demo',not page.evaluate('__model3.telemetry.getState().demo'))
        drift=page.evaluate('''() => {__model3.setTelemetry({speedKph:20,gear:'N'});const a=__model3.car.info().spin;__model3.car.tick(.02);const b=__model3.car.info().spin;__model3.setTelemetry({gear:'R'});__model3.car.tick(.02);return {a,b,c:__model3.car.info().spin};}''');check('Rig / neutral coasts and reverse rolls backwards',abs(drift['a']-drift['b'])>.01 and abs(drift['c']-drift['a'])<1e-5)
        page.locator('#reset').click();check('Telemetry / reset parked',page.evaluate('__model3.telemetry.getState().gear')=='P' and page.evaluate('__model3.telemetry.getState().speedKph')==0)
        page.evaluate("dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}))");check('Lifecycle / cached navigation preserves scene',not page.evaluate('__model3.car.info().disposed') and page.evaluate('__model3.telemetry.stats().bindings')==2)
        report['browser']['desktop']={'viewport':[1440,1000],'errors':errors,'failedResponses':failures}
        check('Browser / no runtime errors or missing files',not errors and not failures,{'errors':errors,'files':failures})
        page.evaluate('__model3.car.dispose();__model3.car.dispose()');check('Lifecycle / releases displays',page.evaluate('__model3.telemetry.stats().disposed') and page.evaluate("__model3.scene.textures.filter(t=>t.name.endsWith(' / live')).length")==0)
        context.close()
        context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True);page=context.new_page();page.goto(url);page.wait_for_function('window.__model3?.ready',timeout=60000)
        check('Mobile / controls fit width',page.evaluate('document.documentElement.scrollWidth===innerWidth'))
        page.screenshot(path=str(HERE/'renders/browser-mobile.png'))
        page.locator('[data-view=screen]').tap();page.locator('#speed').fill('160');page.locator('#speed').dispatch_event('input');page.wait_for_timeout(350)
        check('Mobile / touch view and speed control',page.evaluate('__model3.view')=='screen' and page.evaluate('__model3.telemetry.getState().speedKph')==160)
        page.screenshot(path=str(HERE/'renders/browser-mobile-screen.png'))
        report['browser']['mobile']={'viewport':[390,844],'mode':'Chromium touch emulation; not a physical device benchmark'}
        context.close();browser.close()

def main():
    server=None
    try:
        for level in ['high','low']:glb(level)
        check('LOD / useful reduction',report['models']['low']['triangles']<report['models']['high']['triangles']*.6)
        manifest=json.loads((HERE/'manifest.json').read_text());dims=manifest['dimensionsMeters'];check('Scale / vehicle dimensions',abs(dims['length']-4.720)<.001 and abs(dims['wheelbase']-2.875)<.005 and abs(dims['widthWithMirrors']-2.089)<.005)
        server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
        browser(f'http://127.0.0.1:{server.server_port}/art/vehicles/tesla-model-3/preview.html')
    except Exception as error:
        report['checks'].append({'name':'Verification completed','passed':False,'detail':str(error)})
        raise
    finally:
        if server:server.shutdown();server.server_close()
        report['passed']=all(c['passed'] for c in report['checks'])
        (HERE/'verification.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
    print(json.dumps({'passed':report['passed'],'checks':len(report['checks']),'models':report['models']},indent=2))

if __name__=='__main__':main()
