"""Offline browser, render/animation contracts and reproducible visual fixtures.

Screenshots use deliberately fixed cameras; they are not input-only playthroughs.
The separate verify_all.py suite checks the complete road, sea and air campaigns.
"""
import hashlib
import json
import statistics
import time
from pathlib import Path
from playwright.sync_api import sync_playwright
from verify_config import ROOT, OUT, PREVIEW, CHROMIUM

checks=[]
errors=[]
def check(name, ok, detail=None):
    checks.append({'name':name,'pass':bool(ok),'detail':detail})
    print(('PASS ' if ok else 'FAIL ')+name,flush=True)

FIXTURE="""({eye,target})=>{
 cam.eye=V(...eye);cam.prevEye={...cam.eye};cam.dir=norm(sub(V(...target),cam.eye));cam.prevDir={...cam.dir};
 state.paused=true;render(1);
}"""
VIEWS={
    'base':{'eye':[108,4,345],'target':[100,1,335]},
    'sport':{'eye':[106,2.7,331],'target':[101,1.1,337]},
    'jeep':{'eye':[120,3.2,330],'target':[115,1.3,336]},
    'helicopter':{'eye':[84,4.7,336],'target':[76,1.8,345]},
    'boat':{'eye':[194,3.7,337],'target':[187,.5,345]},
    'quay':{'eye':[154,5.6,293],'target':[132,2.3,275]},
    'cargo':{'eye':[119,2.8,247],'target':[123,1,239]},
    'forklift':{'eye':[150,3.4,240],'target':[143.4,1.6,233]},
}

with sync_playwright() as p:
    launch={'headless':True}
    if CHROMIUM: launch['executable_path']=CHROMIUM
    elif Path('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome').exists(): launch['channel']='chrome'
    browser=p.chromium.launch(**launch)
    ctx=browser.new_context(viewport={'width':1440,'height':900},device_scale_factor=1,offline=True)
    page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script('window.requestAnimationFrame=()=>0')
    start=time.perf_counter();page.goto((ROOT/'index.html').as_uri());page.wait_for_function('!!window.__experience',polling=20)
    boot=time.perf_counter()-start
    check('file:// boots with network disabled',page.evaluate('!!window.__workshop7&&document.querySelector("#error").textContent===""'),{'seconds':round(boot,3)})
    check('All 14 authored assets are bundled',page.evaluate('Object.keys(__workshop7.assets).filter(id=>!ARMORY_ASSET_PACK8.assets[id]).length===14'))
    page.locator('#start').click();page.locator('[data-route="road"]').click()
    check('Public Start / road route loads campaign',page.evaluate('experience.mission?.route==="road"&&state.started'))
    check('All 10 harbor props are placed',page.evaluate("new Set(WORKSHOP7.placements.map(p=>p.id).concat(['mission-case'])).size===10"))
    # Identical fixture cameras can be used on a saved original HTML for fair comparisons.
    page.evaluate("setGraphicsQuality('high');player.pos=V(98,.24,344);player.prevPos={...player.pos};state.t=0;")
    # Hide HUD only in asset inspection pictures; base image retains the playable HUD.
    for name,view in VIEWS.items():
        page.evaluate(FIXTURE,view)
        page.screenshot(path=str(PREVIEW/('workshop-'+name+'.png')))
    high=page.evaluate('''()=>{cam.eye=V(108,4,345);setGraphicsQuality('high');WORKSHOP7.placements.forEach(p=>delete p.workshopLOD);render(1);return {...WORKSHOP7.stats,draws:telemetry.draws,triangles:telemetry.triangles};}''')
    low=page.evaluate("setGraphicsQuality('low');render(1);({...WORKSHOP7.stats,draws:telemetry.draws,triangles:telemetry.triangles})")
    check('Low quality uses only simplified authored models',low['high']==0 and low['low']>0,{'high':high,'low':low})
    check('Reduced shadow meshes registered',page.evaluate('SHAPE_SHADOW_MESHES.size>0'))
    # Check material values reach the GPU instance stream without color guessing.
    materials=page.evaluate('''()=>{const b=new InstanceBuilder();const ps=workshopParts7('comet-sport','high');return ps.filter(p=>['paint',''].includes(p.role)).map(p=>{b.put(p.name,p.color,0,0,0);const g=b.groups.get(p.name),o=(g.count-1)*20;return Math.abs(g.data[o+17]-p.roughness)<.00001&&Math.abs(g.data[o+18]-p.metallic)<.00001;}).every(Boolean);}''')
    check('Blender roughness and metalness reach instance buffers',materials)
    animation=page.evaluate('''()=>{
      setGraphicsQuality('high');cam.eye=V(101,2,340);
      const sample=(kind,change)=>{const src=cars.find(c=>c.harborKind===kind),c={...src,pos:{...src.pos}},a=new Builder(),b=new Builder();
        drawWorkshop7(a,WORKSHOP7.vehicleAssets[kind],V(),0,{car:c,time:0,lod:'high'});
        Object.assign(c,change);drawWorkshop7(b,WORKSHOP7.vehicleAssets[kind],V(),0,{car:c,time:1,lod:'high'});
        let changed=0,finite=a.n===b.n;for(let i=0;i<a.n;i+=10){for(let k=0;k<3;k++){finite=finite&&Number.isFinite(b.data[i+k]);if(Math.abs(a.data[i+k]-b.data[i+k])>.002)changed++;}}
        return {changed,finite};};
      const wheels=sample('sport',{wheel:1.2,steerVisual:.3}),doors=sample('sport',{door:1}),rotors=sample('heli',{});
      const before=JSON.stringify(cars.map(c=>[c.pos,c.yaw,c.pitch,c.roll]));render(1);
      return {wheels,doors,rotors,physicsUntouched:before===JSON.stringify(cars.map(c=>[c.pos,c.yaw,c.pitch,c.roll]))};
    }''')
    check('Wheels, door and both rotor groups move as real geometry',all(animation[k]['finite'] and animation[k]['changed']>0 for k in ['wheels','doors','rotors']),animation)
    check('Rendering leaves simulation poses intact',animation['physicsUntouched'])
    regions=page.evaluate('''()=>{const original=regionId,out=[];for(const id of Object.keys(REGIONS)){loadRegionSync(id);render(1);out.push({id,placements:WORKSHOP7.placements.length,finite:Object.values(player.pos).every(Number.isFinite)});}loadRegionSync('coast');render(1);return out;}''')
    check('World switching resets harbor placements without duplicates',all(r['finite'] and (r['placements']>0 if r['id']=='coast' else r['placements']==0) for r in regions),regions)
    renderer_info=page.evaluate("({software:!!renderer.software,webgl:renderer.software?null:renderer.gl.getParameter(renderer.gl.VERSION),error:renderer.gl.getError()})")
    check('WebGL rendered without GL errors',not renderer_info['software'] and renderer_info['error']==0,renderer_info)
    ctx.close()

    # Force the compatibility path using the browser API, not a fake renderer object.
    ctx=browser.new_context(viewport={'width':844,'height':480},offline=True)
    page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script("window.requestAnimationFrame=()=>0;const originalContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl|experimental-webgl/.test(type)?null:originalContext.call(this,type,...args);};")
    page.goto((ROOT/'index.html').as_uri());page.wait_for_function('!!window.__experience',polling=20)
    page.evaluate("startHarbor6('road');setGraphicsQuality('low')")
    page.evaluate(FIXTURE,VIEWS['base']);page.screenshot(path=str(PREVIEW/'workshop-software.png'))
    check('CPU fallback keeps the new models with low LOD',page.evaluate('renderer.software&&WORKSHOP7.stats.high===0&&WORKSHOP7.stats.low>0&&renderer.faceCount>0'))
    ctx.close()

    # Real requestAnimationFrame sampling on the actual browser's WebGL backend.
    ctx=browser.new_context(viewport={'width':1280,'height':800},offline=True)
    page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto((ROOT/'index.html').as_uri());page.wait_for_function('!!window.__experience',polling=20)
    page.locator('#start').click();page.locator('[data-route="road"]').click()
    page.evaluate("startRecording6('Blender harbor / 20s live WebGL')")
    page.wait_for_timeout(20000)
    report=page.evaluate('diagnosticReport6()')
    check('Live WebGL loop runs without runtime errors',len(report['samples'])>=15 and not report['errors'] and report['environment']['renderer']=='WebGL',{'samples':len(report['samples']),'quality':report['samples'][-1]['quality'] if report['samples'] else None})
    ctx.close();browser.close()

check('No browser page errors',not errors,errors)
result={'sha256':hashlib.sha256((ROOT/'index.html').read_bytes()).hexdigest(),'passed':sum(c['pass'] for c in checks),'total':len(checks),'checks':checks,'live':report,'scope':'Fixed-camera visual fixtures, real offline file URL, software fallback, and 20 seconds of live desktop WebGL. Not a physical phone or thermal test.'}
(OUT/'blender-browser.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
raise SystemExit(0 if result['passed']==result['total'] else 1)
