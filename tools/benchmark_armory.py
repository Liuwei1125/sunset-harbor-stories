"""Controlled live WebGL load, not an input-only playthrough or phone benchmark."""
import hashlib
import json
import statistics
from playwright.sync_api import sync_playwright
from verify_config import ROOT, OUT, CHROMIUM

results=[];errors=[]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,executable_path=CHROMIUM)
    for quality in ['high','low']:
        ctx=b.new_context(viewport={'width':1280,'height':800},offline=True)
        page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto((ROOT/'index.html').as_uri());page.wait_for_function('!!window.__experience')
        page.locator('#start').click();page.locator('[data-route="road"]').click()
        page.evaluate('''quality=>{
          clearCombatEncounter();experience.mission=null;state.car=null;state.weapon=3;state.nextShot=0;
          player.pos=V(110,.24,319);player.prevPos={...player.pos};player.yaw=cam.yaw=0;cam.pitch=-.08;
          setGraphicsQuality(quality);mouse.left=true;mouse.right=true;startRecording6('Armory controlled combat / '+quality);
          window.armoryStress8=setInterval(()=>{
            weapons[3].ammo=30;weapons[3].reserve=210;
            if(ARMORY8.bursts.length<3)combatBurst(V(114,.3,309),8);
            if(combat.fires.length<2)igniteAt(V(117,.24,308));
          },650);
        }''',quality)
        page.wait_for_timeout(20000)
        report=page.evaluate('''()=>{clearInterval(armoryStress8);mouse.left=mouse.right=false;return {report:diagnosticReport6(),cap:budget8(),pools:Object.fromEntries(['casings','motes','marks','bursts','bodies'].map(k=>[k,ARMORY8[k].length])),glError:renderer.gl.getError()};}''')
        samples=report['report']['samples']
        result={'quality':quality,'samples':len(samples),'medianFPS':statistics.median(s['fps'] for s in samples) if samples else None,'medianCpuMs':statistics.median(s['cpuMs'] for s in samples) if samples else None,'report':report}
        result['passed']=len(samples)>=15 and not report['report']['errors'] and report['glError']==0 and all(report['pools'][k]<=report['cap'][k] for k in report['pools'])
        print(('PASS ' if result['passed'] else 'FAIL ')+quality+' '+str(result['medianFPS'])+' FPS; CPU '+str(result['medianCpuMs']),flush=True)
        results.append(result);ctx.close()
    b.close()
data={'sha256':hashlib.sha256((ROOT/'index.html').read_bytes()).hexdigest(),'passed':all(r['passed'] for r in results) and not errors,'profiles':results,'errors':errors,'scope':'20 seconds each, high and low quality, desktop Chrome WebGL, continuous rifle fire with replenished ammo and overlapping cosmetic bursts/fire. Not physical phone or thermal testing.'}
(OUT/'armory-live.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
raise SystemExit(0 if data['passed'] else 1)
