"""Normal-RAF performance. Never calls tick(), drive(), or advances synthetic time."""
from playwright.sync_api import sync_playwright
from browser_common import ROOT,OUT,PREVIEW,BASE,CHROME,server,wait_ready,runtime_info,GPU_TRACKER,select
import argparse,json,time,hashlib

PILOT='''async()=>{const {createPilot}=await import('./tools/playthrough.mjs');const a=__club.app;await a.start();const pilot=createPilot(a.sim);a.clock.step=dt=>{pilot();a.sim.step(dt);};a.manual=false;a.clock.reset();}'''
RESET='''()=>{const a=__club.app;a.diagnostics.frames=[];a.diagnostics.samples=[];a.diagnostics.last=null;a.diagnostics.lastSample=0;return {wall:performance.now(),simulation:a.sim.state.run.elapsed,dropped:a.clock.droppedSeconds};}'''
COLLECT='''before=>{const a=__club.app;return {...a.diagnostics.report(a.renderer),wallElapsedMs:performance.now()-before.wall,simulationElapsed:a.sim.state.run.elapsed-before.simulation,droppedSeconds:a.clock.droppedSeconds-before.dropped,phase:a.sim.state.phase,score:a.sim.state.run.score,shots:a.sim.state.run.shots,checkpoints:a.sim.state.run.checkpoints,live:__gpuLive(),gl:document.getElementById('view').getContext('webgl2').getError()};}'''

def fingerprint():
 result={}
 for path in sorted((ROOT/'src').rglob('*.js')):result[str(path.relative_to(ROOT))]=hashlib.sha256(path.read_bytes()).hexdigest()
 for filename in ['index.html','style.css','assets/manifest.json','vendor/manifest.json']:result[filename]=hashlib.sha256((ROOT/filename).read_bytes()).hexdigest()
 return result

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--desktop-seconds',type=float,default=30);parser.add_argument('--touch-seconds',type=float,default=15);parser.add_argument('--desktop-only',action='store_true');args=parser.parse_args()
 reports=[];loads=[];errors=[]
 with server(),sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path=CHROME)
  cases=[('babylon',False,{'width':1440,'height':900},'high'),('playcanvas',False,{'width':1440,'height':900},'high')]
  if not args.desktop_only:cases.extend([('babylon',True,{'width':390,'height':844},'medium'),('babylon',True,{'width':844,'height':390},'medium')])
  for engine,mobile,viewport,quality in cases:
   context=browser.new_context(viewport=viewport,device_scale_factor=1,is_mobile=mobile,has_touch=mobile);page=context.new_page();page.add_init_script(GPU_TRACKER);page.on('pageerror',lambda e:errors.append(str(e)))
   page.add_init_script('if(!localStorage.getItem("sunset-harbor-club-v2"))localStorage.setItem("sunset-harbor-club-v2",JSON.stringify({version:2,xp:0,settings:'+json.dumps({'engine':engine,'quality':quality,'volume':0,'difficulty':'sport'})+',records:{}}))')
   cdp=context.new_cdp_session(page);cdp.send('Network.enable');cdp.send('Network.clearBrowserCache')
   for state in ['browser-cache-cleared','same-context-reload']:
    if state=='browser-cache-cleared':page.goto(BASE+'?verify=1')
    else:page.reload()
    wait_ready(page)
    data=page.evaluate('''()=>({firstInteractiveMs:__club.app.diagnostics.firstInteractive,navigation:performance.getEntriesByType('navigation')[0].toJSON(),resources:performance.getEntriesByType('resource').map(e=>({name:e.name.split('/club/').at(-1),transferSize:e.transferSize,encodedBodySize:e.encodedBodySize,duration:e.duration}))})''');data.update({'engine':engine,'profile':'touch-emulation-on-M2' if mobile else 'desktop','viewport':viewport,'cacheCondition':state});loads.append(data)
   info=runtime_info(page)
   for mode in (['race'] if engine=='playcanvas' else ['race','shooting','darts','archery']):
    select(page,mode,5,'endless');page.evaluate(PILOT)
    page.wait_for_timeout(6000)
    before=page.evaluate(RESET);seconds=args.touch_seconds if mobile else args.desktop_seconds;page.wait_for_timeout(seconds*1000)
    row=page.evaluate(COLLECT,before);row.update({'mode':mode,'level':5,'playlist':'endless','quality':quality,'engine':engine,'profile':'touch-emulation-on-M2' if mobile else 'desktop','device':info,'measuredFps':1000/row['meanFrameMs'],'targetFps':30 if mobile else 60});row['targetBandReached']=row['measuredFps']>=(28 if mobile else 55);reports.append(row)
    print(json.dumps({k:row[k] for k in ['engine','mode','profile','measuredFps','p95FrameMs','p99FrameMs','simulationElapsed','wallElapsedMs','gl']},ensure_ascii=False),flush=True)
    page.screenshot(path=str(PREVIEW/f'perf-{engine}-{mode}-{viewport["width"]}.png'))
   context.close()
  browser.close()
 report={'timestamp':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'conditions':'Normal requestAnimationFrame and the production FixedClock. A controller supplies only gameplay inputs before each ordinary physics step. No time acceleration. 6-second warm-up excludes first-use shader compilation; sequential cases, no parallel benchmark browser. Browser cache is explicitly cleared then compared with a reload. Local HTTP server filesystem cache is not cleared. Touch profiles use the same desktop Apple M2 GPU and do not measure phone hardware.','targets':'Desktop aims for 60 FPS; 55 FPS mean is the report acceptance band. Emulated touch aims for >=30 FPS; 28 FPS mean is the acceptance band. Reported P95/P99 expose stalls independently of the mean.','sourceFingerprint':fingerprint(),'firstInteractive':loads,'runs':reports,'errors':errors,'passed':all(r['targetBandReached'] and r['gl']==0 and r['phase']=='playing' and r['simulationElapsed']>=r['wallElapsedMs']/1000*.85 for r in reports) and not errors}
 (OUT/'performance.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('Performance complete; acceptance:',report['passed'],flush=True)
 if not report['passed']:raise SystemExit(1)

if __name__=='__main__':main()
