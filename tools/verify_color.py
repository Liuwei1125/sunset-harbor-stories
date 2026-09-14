"""Fixed-camera color regressions against the retained 6.3 grey-lighting build.

Reads the real WebGL canvas (no HUD pixels). Numeric bounds catch this specific
regression; they do not replace inspecting the six screenshots for art quality.
"""
import hashlib
import json
from playwright.sync_api import sync_playwright
from verify_config import ROOT, OUT, PREVIEW, CHROMIUM
from capture_graphics import fixture, VIEWS

REGIONS={
 'sport':{'sky':[450,30,1100,210],'vehicle':[597,463,645,497],'whole':[0,0,1440,900]},
 'boat':{'water':[310,625,1060,810],'whole':[0,0,1440,900]},
 'warehouse':{'floor':[350,660,570,760],'whole':[0,0,1440,900]},
}
METRICS='''regions=>{
 render(1);const g=renderer.gl,w=canvas.width,h=canvas.height,a=new Uint8Array(w*h*4);g.readPixels(0,0,w,h,g.RGBA,g.UNSIGNED_BYTE,a);
 const out={};for(const [name,[x0,y0,x1,y1]]of Object.entries(regions)){
  let count=0,luma=0,sat=0,clipped=0,dark=0;const rgb=[0,0,0];
  for(let y=Math.round(y0*h/900);y<Math.round(y1*h/900);y+=2)for(let x=Math.round(x0*w/1440);x<Math.round(x1*w/1440);x+=2){
   const i=((h-1-y)*w+x)*4,r=a[i],gr=a[i+1],b=a[i+2],hi=Math.max(r,gr,b),lo=Math.min(r,gr,b);
   luma+=r*.2126+gr*.7152+b*.0722;sat+=(hi-lo)/(hi||1);rgb[0]+=r;rgb[1]+=gr;rgb[2]+=b;if(hi>=254)clipped++;if(hi<5)dark++;count++;
  }out[name]={luma:luma/count,saturation:sat/count,rgb:rgb.map(x=>x/count),clipped:clipped/count,dark:dark/count};
 }out.glError=g.getError();return out;
}'''

checks=[];errors=[];versions={}
def check(name,ok,detail=None):
    checks.append({'name':name,'pass':bool(ok),'detail':detail})
    print(('PASS ' if ok else 'FAIL ')+name,flush=True)

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=CHROMIUM)
    for version,source in [('6.3','verification/baseline-6.3.0.html'),('current','index.html')]:
        ctx=browser.new_context(viewport={'width':1440,'height':900},device_scale_factor=1,offline=True)
        page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
        page.add_init_script('window.requestAnimationFrame=()=>0');page.goto((ROOT/source).as_uri());page.wait_for_function('!!window.__experience',polling=20)
        page.locator('#start').click();page.locator('[data-route="road"]').click();page.evaluate("setGraphicsQuality('high');RADIANCE9.exposure=1")
        versions[version]={}
        for name,view in VIEWS.items():
            fixture(page,view)
            page.screenshot(path=str(PREVIEW/(('grading-before-' if version=='6.3' else 'graphics-after-')+name+'.png')))
            if name in REGIONS:versions[version][name]=page.evaluate(METRICS,REGIONS[name])
        if version=='current':
            ramp=page.evaluate('''()=>{
              const levels=[0,.018,.05,.18,.5,1,2,4,8],fragment='precision highp float;varying vec2 vUV;'+AGX9+'void main(){float v=0.;'+levels.map((v,i)=>`if(vUV.x>=${(i/levels.length).toFixed(8)})v=${v.toFixed(8)};`).join('')+'gl_FragColor=vec4(display9(vec3(v)),1.);}';
              const program=renderer.photoProgram9(SCREEN_VERTEX9,fragment);renderer.screen9(program,null);const g=renderer.gl,out=[];
              for(let i=0;i<levels.length;i++){const rgba=new Uint8Array(4);g.readPixels(Math.floor((i+.5)/levels.length*canvas.width),Math.floor(canvas.height/2),1,1,g.RGBA,g.UNSIGNED_BYTE,rgba);out.push({linear:levels[i],rgb:[...rgba.slice(0,3)]});}
              g.deleteProgram(program.p);return out;
            }''')
        ctx.close()
    browser.close()

before=versions['6.3'];after=versions['current'];sky=after['sport']['sky'];old=before['sport']['sky']
check('Sky is less white and visibly bluer at unchanged exposure',sky['luma']<old['luma']-10 and sky['saturation']>old['saturation']+.10,{'before':old,'after':sky})
body=after['sport']['vehicle'];old=before['sport']['vehicle']
check('Vehicle panel gains brightness and warm color at unchanged exposure',body['luma']>old['luma']*1.10 and body['saturation']>old['saturation']+.04 and body['rgb'][0]>body['rgb'][2]*1.25,{'before':old,'after':body})
water=after['boat']['water'];old=before['boat']['water']
check('Water restores blue-green color without losing its midtone detail',water['saturation']>old['saturation']+.10 and water['luma']>old['luma']*.70,{'before':old,'after':water})
floor=after['warehouse']['floor']
check('Warehouse shadow fill avoids an excessive blue cast',floor['saturation']<.40 and floor['luma']>50,floor)
check('Default exposure retains highlight and dark detail across the fixtures',all(d['whole']['clipped']<.035 and d['whole']['dark']<.02 for d in after.values()),{k:v['whole'] for k,v in after.items()})
check('Grading preserves a neutral, monotonically increasing HDR grey ramp',all(max(x['rgb'])-min(x['rgb'])<=3 for x in ramp) and all(sum(a['rgb'])<sum(b['rgb']) for a,b in zip(ramp,ramp[1:])),ramp)
check('Both builds render all measured regions without GL or application errors',not errors and all(v['glError']==0 for data in versions.values() for v in data.values()),errors)

report={'sha256':hashlib.sha256((ROOT/'index.html').read_bytes()).hexdigest(),'baselineSha256':hashlib.sha256((ROOT/'verification/baseline-6.3.0.html').read_bytes()).hexdigest(),'passed':sum(x['pass'] for x in checks),'total':len(checks),'checks':checks,'measurements':versions,'sampleRegions':REGIONS,'errors':errors,'method':'Paused matching camera/time, high quality, exposure 1, same source models; WebGL readPixels excludes HTML HUD. Luma is weighted display RGB, not a photometric measurement.'}
(OUT/'color-browser.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
print(f"{report['passed']}/{report['total']} passed",flush=True)
if report['passed']!=report['total'] or errors:raise SystemExit(1)
