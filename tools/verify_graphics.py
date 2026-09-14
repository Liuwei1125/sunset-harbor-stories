"""Offline renderer contracts, actual pixel differences and degraded GPU paths.

Controlled fixtures test graphics in isolation. Complete input-only campaigns
remain in verify_all.py; these fixtures do not substitute for those playthroughs.
"""
import hashlib
import json
from playwright.sync_api import sync_playwright
from verify_config import ROOT, OUT, PREVIEW, CHROMIUM
from capture_graphics import fixture, VIEWS

checks=[];errors=[]
def check(name,ok,detail=None):
    checks.append({'name':name,'pass':bool(ok),'detail':detail})
    print(('PASS ' if ok else 'FAIL ')+name,flush=True)

PIXELS='''()=>{
 window.pixels9=()=>{render(1);const g=renderer.gl;g.bindFramebuffer(g.FRAMEBUFFER,null);const data=new Uint8Array(canvas.width*canvas.height*4);g.readPixels(0,0,canvas.width,canvas.height,g.RGBA,g.UNSIGNED_BYTE,data);return data;};
 window.luminance9=data=>{let sum=0;for(let i=0;i<data.length;i+=4)sum+=data[i]*.2126+data[i+1]*.7152+data[i+2]*.0722;return sum/(data.length/4);};
 window.difference9=(a,b)=>{let sum=0,count=0;for(let i=0;i<a.length;i+=4){const d=(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]))/3;sum+=d;if(d>2)count++;}return {mean:sum/(a.length/4),changed:count};};
}'''

def open_game(browser,mask=None):
    ctx=browser.new_context(viewport={'width':1280,'height':800},device_scale_factor=1,offline=True)
    page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    script='window.requestAnimationFrame=()=>0;'
    if mask:
        script+='const ext=WebGLRenderingContext.prototype.getExtension;WebGLRenderingContext.prototype.getExtension=function(name){return '+json.dumps(mask)+'.includes(name)?null:ext.call(this,name);};'
    page.add_init_script(script);page.goto((ROOT/'index.html').as_uri());page.wait_for_function('!!window.__experience',polling=20,timeout=30000)
    page.locator('#start').click();page.locator('[data-route="road"]').click();page.evaluate("setGraphicsQuality('high')");page.evaluate(PIXELS)
    return ctx,page

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=CHROMIUM)
    ctx,page=open_game(browser)
    fixture(page,VIEWS['quay'])
    caps=page.evaluate('({...renderer.capabilities9,...RADIANCE9.stats})')
    check('Offline game boots the HDR renderer with AO, two cascades and reflections',caps['hdr'] and caps['ao']==16 and caps['cascades']==2 and caps['reflection'],caps)
    data=page.evaluate('''()=>{const t=renderer.targets9.ao,g=renderer.gl,d=new Uint8Array(t.width*t.height*4);g.bindFramebuffer(g.FRAMEBUFFER,t.fb);g.readPixels(0,0,t.width,t.height,g.RGBA,g.UNSIGNED_BYTE,d);g.bindFramebuffer(g.FRAMEBUFFER,null);let dark=0,min=255;for(let i=0;i<d.length;i+=4){min=Math.min(min,d[i]);if(d[i]<245)dark++;}return {min,dark,pixels:d.length/4,error:g.getError()};}''')
    check('AO target contains actual contact occlusion pixels',data['min']<235 and data['dark']>100 and data['error']==0,data)
    diff=page.evaluate('''()=>{const a=pixels9();RADIANCE9.limits[2].ao=0;const b=pixels9();RADIANCE9.limits[2].ao=16;return difference9(a,b);}''')
    check('Contact occlusion changes final scene pixels',diff['changed']>100,diff)
    exposure=page.evaluate('''()=>{const out=[];for(const e of [.7,1,1.4]){RADIANCE9.exposure=e;out.push(luminance9(pixels9()));}RADIANCE9.exposure=1;return out;}''')
    check('Exposure produces a monotonic visible change through AgX',exposure[0]+4<exposure[1] and exposure[1]+4<exposure[2],exposure)
    fixture(page,VIEWS['boat'])
    diff=page.evaluate('''()=>{const a=pixels9();RADIANCE9.limits[2].reflection=false;const b=pixels9();RADIANCE9.limits[2].reflection=true;return difference9(a,b);}''')
    check('Water scene reflections change actual rendered pixels',diff['changed']>500 and diff['mean']>.05,diff)
    page.screenshot(path=str(PREVIEW/'graphics-verified-water.png'))
    fixture(page,VIEWS['quay'])
    data=page.evaluate('''()=>{
      clearCombatEncounter();combatBurst(V(140,1,282),8);ARMORY8.bursts[0].age=.08;const a=pixels9(),count=renderer.localLightCount9;
      const original=renderer.localLights9;renderer.localLights9=function(){this.localLightCount9=0;};const b=pixels9();renderer.localLights9=original;
      const d=difference9(a,b);clearCombatEncounter();return {count,...d};
    }''')
    check('Explosion light illuminates nearby geometry',data['count']>0 and data['changed']>30,data)
    data=page.evaluate('''()=>{const a=pixels9();RADIANCE9.limits[2].bloom=false;const b=pixels9();RADIANCE9.limits[2].bloom=true;return difference9(a,b);}''')
    check('Bloom affects emissive highlights in the final image',data['changed']>10,data)
    state=page.evaluate('''()=>{const state=()=>JSON.stringify({t:stateGlobal9.t,pos:player.pos,cars:cars.map(c=>[c.pos,c.yaw]),ammo:weapons.map(w=>[w.ammo,w.reserve]),hp:player.hp,mission:experience.mission});window.stateGlobal9=window.__experience.state;const before=state();for(let i=0;i<20;i++)render(.4);return before===state();}''')
    check('Repeated renders leave time, ammunition, mission and actor poses intact',state)
    quality=page.evaluate('''()=>{const out=[];for(const mode of ['medium','low','high']){setGraphicsQuality(mode);render(1);out.push({mode,...RADIANCE9.stats,error:renderer.gl.getError()});}return out;}''')
    check('Quality tiers reduce AO, reflections and shadow workload without GL errors',quality[0]['ao']==8 and quality[0]['cascades']==2 and not quality[0]['reflection'] and quality[1]['ao']==0 and quality[1]['cascades']==0 and not quality[1]['bloom'] and all(x['error']==0 for x in quality),quality)
    page.evaluate('window.oldTexture9=renderer.targets9.scene.color;window.oldGeneration9=renderer.resourceGeneration9')
    page.set_viewport_size({'width':1080,'height':720});page.evaluate('renderer.resize();render(1)')
    resize=page.evaluate('''()=>{const generation=renderer.resourceGeneration9,deleted=!renderer.gl.isTexture(oldTexture9);for(let i=0;i<8;i++)render(1);return {old:oldGeneration9,generation,stable:renderer.resourceGeneration9===generation,deleted,error:renderer.gl.getError()};}''')
    check('Resize replaces and deletes old render targets; steady frames reuse them',resize['generation']==resize['old']+1 and resize['stable'] and resize['deleted'] and resize['error']==0,resize)
    page.evaluate("openPanel('settings')")
    page.locator('#s-radiance9').select_option('classic');classic=page.evaluate('!RADIANCE9.stats.active&&renderer.gl.getError()===0')
    page.locator('#s-radiance9').select_option('photo');page.locator('#s-exposure9').fill('1.2');page.locator('#s-exposure9').dispatch_event('change')
    saved=page.evaluate('''()=>{const s=serialiseSave();RADIANCE9.enabled=false;RADIANCE9.exposure=.7;applySave(s);return {enabled:RADIANCE9.enabled,exposure:RADIANCE9.exposure};}''')
    check('Public graphics controls switch renderer and round-trip through saves',classic and saved['enabled'] and abs(saved['exposure']-1.2)<.0001,saved)
    oldsave=page.evaluate('''()=>{const s=serialiseSave();delete s.experience.options.radiance9;delete s.experience.options.exposure9;applySave(s);return RADIANCE9.enabled&&RADIANCE9.exposure===1;}''')
    check('Older saves receive safe graphics defaults',oldsave)
    page.evaluate('closePanel()')
    regions=page.evaluate('''()=>{const out=[];for(const id of Object.keys(REGIONS)){loadRegionSync(id);updateCamera(.016,true);render(1);out.push({id,error:renderer.gl.getError(),active:RADIANCE9.stats.active});}return out;}''')
    check('Coast, islands and canyon all render through the new pipeline',len(regions)==3 and all(x['active'] and x['error']==0 for x in regions),regions)
    ctx.close()
    paths=[('no-hdr',['OES_texture_half_float','OES_texture_half_float_linear']),('no-depth',['WEBGL_depth_texture']),('basic-gpu',['WEBGL_depth_texture','OES_texture_half_float','OES_texture_half_float_linear','OES_standard_derivatives'])]
    for name,mask in paths:
        ctx,page=open_game(browser,mask);fixture(page,VIEWS['sport'])
        data=page.evaluate('''()=>{const a=luminance9(pixels9());RADIANCE9.exposure=1.4;const b=luminance9(pixels9());return {software:!!renderer.software,...RADIANCE9.stats,caps:renderer.capabilities9,error:renderer.gl.getError(),mean:a,bright:b};}''')
        expected=not data['software'] and data['error']==0 and data['mean']>10 and data['bright']>data['mean']+3
        if 'WEBGL_depth_texture' in mask:expected=expected and data['ao']==0 and not data['reflection']
        if 'OES_texture_half_float' in mask:expected=expected and not data['hdr'] and not data['bloom']
        check(name+' retains a visible game and working exposure',expected,data)
        page.screenshot(path=str(PREVIEW/('graphics-'+name+'.png')));ctx.close()
    browser.close()

report={'sha256':hashlib.sha256((ROOT/'index.html').read_bytes()).hexdigest(),'passed':sum(x['pass'] for x in checks),'total':len(checks),'checks':checks,'errors':errors,'physicalMobileTested':False}
(OUT/'graphics-browser.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
print(f"{report['passed']}/{report['total']} passed",flush=True)
if report['passed']!=report['total'] or errors:raise SystemExit(1)
