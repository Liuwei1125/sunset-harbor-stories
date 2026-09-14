"""Real-time 20–30 minute venue-switching soak. No virtual time or frame multiplication."""
from playwright.sync_api import sync_playwright
from browser_common import ROOT,OUT,PREVIEW,CHROME,server,boot,wait_ready,select,runtime_info
from benchmark import PILOT,RESET,COLLECT,fingerprint
import argparse,json,time,hashlib

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--minutes',type=float,default=20);parser.add_argument('--segment-seconds',type=float,default=75);args=parser.parse_args()
 if args.minutes<1:parser.error('Use at least one real minute. Release evidence requires --minutes 20 or more.')
 segments=[];checkpoints=[];errors=[];start_fingerprint=fingerprint();started_at=time.strftime('%Y-%m-%dT%H:%M:%S%z')
 with server(),sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path=CHROME);context,page=boot(browser,track_gpu=True);page.on('pageerror',lambda e:errors.append(str(e)));cdp=context.new_cdp_session(page)
  device=runtime_info(page);page.evaluate("__club.app.progress.settings.volume=0;__club.app.progress.settings.difficulty='sport';__club.app.setting('quality','high')")
  started=time.monotonic();deadline=started+args.minutes*60;index=0
  while time.monotonic()<deadline:
   mode=['race','shooting','darts','archery'][index%4]
   select(page,mode,5,'endless');page.evaluate('__club.app.manual=true;__club.app.draw(1)');cdp.send('HeapProfiler.collectGarbage')
   baseline=page.evaluate('({live:__gpuLive(),stats:__club.renderer.stats(),heap:performance.memory?.usedJSHeapSize||null})')
   page.evaluate(PILOT);before=page.evaluate(RESET);segment_start=time.monotonic();until=min(deadline,segment_start+args.segment_seconds);samples=[];paused=False
   while time.monotonic()<until:
    page.wait_for_timeout(min(5000,max(1,(until-time.monotonic())*1000)))
    sample=page.evaluate('''()=>({phase:__club.sim.state.phase,elapsed:__club.sim.state.run.elapsed,shots:__club.sim.state.run.shots,score:__club.sim.state.run.score,embedded:__club.sim.state.run.embedded.length,events:__club.sim.state.events.length,dynamicInstances:__club.renderer.stats().dynamicInstances,effectPool:__club.renderer.stats().effectPool,held:__club.sim.state.held.size,gl:document.getElementById('view').getContext('webgl2').getError()})''');sample['wallSeconds']=time.monotonic()-started;samples.append(sample)
    if sample['phase']!='playing' and sample['phase']!='countdown':errors.append('Unexpected phase during '+mode+': '+sample['phase']);break
    if time.monotonic()-segment_start>35 and not paused:
     page.locator('[data-action="pause"]').click();frozen=page.evaluate('__club.sim.state.run.elapsed');page.wait_for_timeout(700);pause_ok=page.evaluate('__club.sim.state.phase==="paused"&&__club.sim.state.held.size===0') and page.evaluate('__club.sim.state.run.elapsed')==frozen;page.locator('[data-action="resume"]').click();paused=True
     if not pause_ok:errors.append('Pause did not freeze '+mode)
    if len(samples)%6==0:print(f'{time.monotonic()-started:.1f}s / {args.minutes*60:.0f}s: {mode}, {sample["elapsed"]:.1f}s simulated, {sample["shots"]} shots, {sample["dynamicInstances"]} model instances',flush=True)
   row=page.evaluate(COLLECT,before);row.update({'index':index,'mode':mode,'baseline':baseline,'samples':samples,'wallStartSeconds':segment_start-started,'wallEndSeconds':time.monotonic()-started,'pauseExercised':paused})
   if row['phase']=='playing' and page.evaluate('__club.sim.state.run.elapsed')>=3:
    page.locator('#bank').click();page.wait_for_function('__club.app.ui.dialogKind==="result"');row['banked']=page.evaluate('__club.sim.state.result.success');row['xp']=page.evaluate('__club.app.progress.xp')
   else:row['banked']=False
   row['boundsOK']=all(s['gl']==0 and s['embedded']<=30 and s['events']<=600 and s['dynamicInstances']<=100 and s['effectPool']<=100 for s in samples);segments.append(row)
   print(f'Completed segment {index+1}: {mode}; banked={row["banked"]}; GPU={baseline["live"]}',flush=True)
   (OUT/'soak-live.json').write_text(json.dumps({'startedAt':started_at,'elapsedSeconds':time.monotonic()-started,'requestedMinutes':args.minutes,'segments':segments,'errors':errors},ensure_ascii=False,indent=2)+'\n')
   if index%4==3:page.screenshot(path=str(PREVIEW/f'soak-cycle-{index//4+1}.png'))
   index+=1
  elapsed=time.monotonic()-started
  for mode in ['race','shooting','darts','archery']:
   rows=[s for s in segments if s['mode']==mode];stable=len(rows)<3 or rows[-1]['baseline']['live']==rows[-2]['baseline']['live'];checkpoints.append({'mode':mode,'matchedSceneResourceCountsStable':stable,'baselines':[r['baseline'] for r in rows]})
  campaign_ok=page.evaluate("localStorage.getItem('sunset-run-v6-save')==='campaign-sentinel-do-not-touch'")
  save=page.evaluate('({version:__club.app.progress.version,records:Object.keys(__club.app.progress.records).length,xp:__club.app.progress.xp})');page.screenshot(path=str(PREVIEW/'soak-complete.png'))
  report={'startedAt':started_at,'finishedAt':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'requestedMinutes':args.minutes,'actualWallSeconds':elapsed,'releaseDurationMet':elapsed>=1200,'sourceFingerprint':start_fingerprint,'sourcesUnchangedDuringRun':start_fingerprint==fingerprint(),'device':device,'segments':segments,'resourceComparisons':checkpoints,'campaignSaveIntact':campaign_ok,'save':save,'errors':errors,'method':'Actual wall-clock run with normal RAF and the production 120 Hz FixedClock. The controller supplies aim/steering/buttons without advancing time. All four level-6 venues run in endless mode, switch every 75 seconds, pause/resume, bank results, and compare live WebGL resources at matched scene baselines after garbage collection. Pause and resource collection time remain part of real session duration. Physical phones are not represented.'}
  report['passed']=elapsed>=args.minutes*60 and all(s['boundsOK'] and (s['banked'] or s['wallEndSeconds']-s['wallStartSeconds']<6) for s in segments) and all(c['matchedSceneResourceCountsStable'] for c in checkpoints) and campaign_ok and not errors and report['sourcesUnchangedDuringRun']
  (OUT/'soak.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(f'Soak finished after {elapsed:.1f} real seconds; passed={report["passed"]}',flush=True)
  page.goto('about:blank');context.close();browser.close()
 if not report['passed']:raise SystemExit(1)

if __name__=='__main__':main()
