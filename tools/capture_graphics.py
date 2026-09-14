"""Fixed scene states for before/after full-game graphics comparisons."""
import argparse
import json
import hashlib
from playwright.sync_api import sync_playwright
from verify_config import ROOT, PREVIEW, OUT, CHROMIUM

VIEWS={
 'harbor':{'eye':[161,21,310],'target':[124,3,262],'player':[121,.24,285]},
 'sport':{'eye':[106,2.7,331],'target':[101,1.1,337],'player':[99,.24,341]},
 'quay':{'eye':[154,5.6,293],'target':[132,2.3,275],'player':[140,.24,287]},
 'warehouse':{'eye':[117,3.3,251],'target':[124,1.5,238],'player':[120,.24,245]},
 'boat':{'eye':[194,3.7,337],'target':[187,.5,345],'player':[184,.24,342]},
 'rifle':{'eye':[112.4,2.2,317.8],'target':[110,1.5,315.8],'player':[110,.24,316.5]},
}

def fixture(page,view):
    page.evaluate('''({eye,target,player:p})=>{
      player.pos=V(...p);player.prevPos={...player.pos};player.yaw=0;player.phase=0;state.weapon=3;state.reload=0;ARMORY8.shot=null;state.t=10;
      cam.eye=V(...eye);cam.prevEye={...cam.eye};cam.dir=norm(sub(V(...target),cam.eye));cam.prevDir={...cam.dir};cam.armoryFov8=52*PI/180;cam.fov6=cam.armoryFov8;
      state.paused=true;document.body.classList.remove('paused');document.querySelector('#overlay').style.display='none';render(1);
    }''',view)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--baseline',action='store_true');args=parser.parse_args()
    source=ROOT/('verification/baseline-6.3.0.html' if args.baseline else 'index.html');tag='grading-before' if args.baseline else 'graphics-after'
    results=[]
    with sync_playwright() as p:
        b=p.chromium.launch(headless=True,executable_path=CHROMIUM)
        ctx=b.new_context(viewport={'width':1440,'height':900},device_scale_factor=1,offline=True)
        page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.add_init_script('window.requestAnimationFrame=()=>0');page.goto(source.as_uri());page.wait_for_function('!!window.__experience',polling=20)
        page.locator('#start').click();page.locator('[data-route="road"]').click();page.evaluate("setGraphicsQuality('high');RADIANCE9.exposure=1")
        for name,view in VIEWS.items():
            fixture(page,view);page.screenshot(path=str(PREVIEW/f'{tag}-{name}.png'))
            results.append({'scene':name,'glError':page.evaluate('renderer.gl.getError()')})
        b.close()
    (OUT/f'{tag}.json').write_text(json.dumps({'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'exposure':1,'views':VIEWS,'results':results,'errors':errors},indent=2)+'\n')
    print(tag,results,errors,flush=True)
