"""Match both selectable effects to retained builds, then exercise UI and saves.

Frozen cameras/time and raw WebGL pixels exclude HUD animation. Browser contexts
are isolated from the user's saves. Mobile checks emulate input, not phone GPUs.
"""
import hashlib
import json
from playwright.sync_api import sync_playwright
from verify_config import ROOT, OUT, PREVIEW, CHROMIUM
from capture_graphics import fixture, VIEWS

checks=[];errors=[];references={}
def check(name,ok,detail=None):
    checks.append({'name':name,'pass':bool(ok),'detail':detail})
    print(('PASS ' if ok else 'FAIL ')+name,flush=True)

PIXELS='''()=>{
 render(1);const g=renderer.gl,d=new Uint8Array(canvas.width*canvas.height*4);
 g.readPixels(0,0,canvas.width,canvas.height,g.RGBA,g.UNSIGNED_BYTE,d);
 let hash=2166136261,sum=0;for(const value of d){hash=Math.imul(hash^value,16777619);sum+=value;}
 return {width:canvas.width,height:canvas.height,hash,sum,shadow:RENDER.shadow,radius:RENDER.shadowRadius,scale:RENDER.scale,error:g.getError()};
}'''
def boot(browser,source='index.html',mobile=False):
    ctx=browser.new_context(viewport={'width':390,'height':844} if mobile else {'width':960,'height':600},device_scale_factor=1,is_mobile=mobile,has_touch=mobile,offline=True)
    page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script('window.requestAnimationFrame=()=>0');page.goto((ROOT/source).as_uri())
    page.wait_for_function('!!window.__experience',polling=20)
    if mobile:page.locator('#start').tap();page.locator('[data-route="road"]').tap()
    else:page.locator('#start').click();page.locator('[data-route="road"]').click()
    return ctx,page

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=CHROMIUM)
    for effect,source in [('classic','verification/baseline-6.2.0.html'),('photo','verification/baseline-6.3.1.html')]:
        ctx,page=boot(browser,source);references[effect]={}
        for quality in ['low','medium','high']:
            page.evaluate('setGraphicsQuality',quality);references[effect][quality]={}
            for scene in ['sport','warehouse','boat']:
                fixture(page,VIEWS[scene]);references[effect][quality][scene]=page.evaluate(PIXELS)
        ctx.close()
    ctx,page=boot(browser)
    page.locator('#graphics-open9').click()
    choices=page.locator('#s-radiance9 option').all_text_contents()
    check('Settings expose exactly 6.2 and 6.3.1 effects',choices==['6.2 · 经典效果','6.3.1 · 自然光影'],choices)
    for effect in ['classic','photo']:
        page.locator('#s-radiance9').select_option(effect)
        for quality in ['low','medium','high']:
            page.locator('#s-quality').select_option(quality);actual={}
            for scene in ['sport','warehouse','boat']:
                fixture(page,VIEWS[scene]);actual[scene]=page.evaluate(PIXELS)
            check(effect+' / '+quality+' matches archived rendered pixels and quality',actual==references[effect][quality],actual)
    page.locator('#s-exposure9').fill('1.2');page.locator('#s-exposure9').dispatch_event('change')
    page.evaluate('''()=>{
      window.effectState9=()=>JSON.stringify({t:state.t,pos:player.pos,hp:player.hp,cars:cars.map(c=>[c.pos,c.yaw]),weapons:weapons.map(w=>[w.ammo,w.reserve]),mission:experience.mission});
      window.beforeEffectState9=effectState9();window.oldEffectTarget9=renderer.targets9.scene.color;
    }''')
    page.locator('#s-radiance9').select_option('classic')
    released=page.evaluate('renderer.targets9===null&&renderer.nearShadow9===null&&!renderer.gl.isTexture(oldEffectTarget9)')
    disabled=page.locator('#s-exposure9').is_disabled()
    page.locator('#s-radiance9').select_option('photo')
    retained=page.evaluate('RADIANCE9.exposure===1.2&&experience.options.exposure9===1.2')
    check('Classic releases unused targets and preserves photo brightness',released and disabled and retained and page.locator('#s-exposure9').is_enabled())
    for _ in range(3):
        page.locator('#s-radiance9').select_option('classic');page.locator('#s-radiance9').select_option('photo')
    check('Repeated live switches preserve game state',page.evaluate('effectState9()===beforeEffectState9&&renderer.gl.getError()===0'))
    for effect in ['classic','photo']:
        page.locator('#s-radiance9').select_option(effect)
        page.reload();page.wait_for_function('!!window.__experience',polling=20)
        page.evaluate("openPanel('settings')");saved=page.evaluate('({enabled:RADIANCE9.enabled,exposure:RADIANCE9.exposure,scale:RENDER.scale,quality:graphicsMode,loaded:saveLoaded})')
        check(effect+' persists through a real page reload',saved['loaded'] and saved['enabled']==(effect=='photo') and saved['exposure']==1.2 and page.locator('#s-radiance9').input_value()==effect,saved)
    imported=page.evaluate('''()=>{setGraphicsEffect9('classic');const data=validateSave(JSON.stringify(serialiseSave()));setGraphicsEffect9('photo');applySave(data);return !RADIANCE9.enabled&&RADIANCE9.exposure===1.2&&RENDER.shadow===1024;}''')
    check('Exported and imported saves retain the classic effect',imported)
    page.locator('#s-quality').select_option('auto')
    auto=page.evaluate('''()=>{const out=[];for(const level of [0,1,2]){quality6.level=level;applyQuality6();out.push({scale:RENDER.scale,shadow:RENDER.shadow});}return {classic:!RADIANCE9.enabled,tiers:out};}''')
    check('Adaptive quality retains the selected 6.2 effect',auto['classic'] and auto['tiers']==[{'scale':.62,'shadow':0},{'scale':.83,'shadow':512},{'scale':1,'shadow':1024}],auto)
    page.locator('#s-quality').select_option('high')
    regions=page.evaluate('''()=>{const out=[];for(const id of Object.keys(REGIONS)){loadRegionSync(id);updateCamera(.016,true);for(const effect of ['classic','photo']){setGraphicsEffect9(effect);render(1);out.push({id,effect,active:renderer.active9,error:renderer.gl.getError()});}}return out;}''')
    check('Both effects render all three maps',len(regions)==6 and all(x['active']==(x['effect']=='photo') and x['error']==0 for x in regions),regions)
    page.set_viewport_size({'width':1440,'height':1000});page.evaluate("loadRegionSync('coast');updateCamera(.016,true);openPanel('settings')")
    page.locator('#s-radiance9').select_option('classic');page.screenshot(path=str(PREVIEW/'effects-settings-classic.png'))
    page.locator('#s-radiance9').select_option('photo');page.screenshot(path=str(PREVIEW/'effects-settings-photo.png'))
    ctx.close()
    ctx,page=boot(browser,mobile=True)
    page.locator('#systems-menu6').tap();page.locator('#graphics-open9').tap()
    page.locator('#s-radiance9').select_option('classic');classic=page.evaluate('!renderer.active9')
    page.locator('#s-radiance9').select_option('photo');photo=page.evaluate('renderer.active9')
    box=page.locator('#s-radiance9').bounding_box()
    check('Phone-sized touch menu exposes both working effects',classic and photo and box['x']>=0 and box['x']+box['width']<=390,box)
    page.screenshot(path=str(PREVIEW/'effects-settings-mobile.png'));ctx.close();browser.close()

check('No renderer or application errors during switches',not errors,errors)
report={'sha256':hashlib.sha256((ROOT/'index.html').read_bytes()).hexdigest(),'baselines':{v:hashlib.sha256((ROOT/'verification'/('baseline-'+v+'.html')).read_bytes()).hexdigest() for v in ['6.2.0','6.3.1']},'passed':sum(x['pass'] for x in checks),'total':len(checks),'checks':checks,'errors':errors,'method':'Three frozen cameras, three quality tiers, raw RGBA hashes/sums and dimensions against the archived builds; real UI controls and page reloads in isolated browser contexts.'}
(OUT/'effects-browser.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(f"{report['passed']}/{report['total']} passed",flush=True)
if report['passed']!=report['total']:raise SystemExit(1)
