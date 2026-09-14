"""7.1 measurements: all racing cameras, AKM and two touch viewports, normal RAF."""
from playwright.sync_api import sync_playwright
from browser_common import OUT, PREVIEW, CHROME, server, boot, select, runtime_info
from benchmark import PILOT, RESET, COLLECT, fingerprint
import argparse, json, time

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--seconds',type=float,default=12);args=parser.parse_args()
 source=fingerprint();rows=[];errors=[]
 cases=[(e,False,{'width':1440,'height':900},'high','race',v) for e in ['babylon','playcanvas'] for v in ['chase','hood','cockpit']]
 cases += [('babylon',True,v,'medium','race','chase') for v in [{'width':390,'height':844},{'width':844,'height':390}]]
 cases += [('babylon',False,{'width':1440,'height':900},'high','shooting','chase')]
 with server(),sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path=CHROME)
  for engine,mobile,viewport,quality,mode,view in cases:
   context,page=boot(browser,mobile=mobile,engine=engine,track_gpu=True,viewport=viewport);page.on('pageerror',lambda e:errors.append(str(e)))
   page.evaluate('([q,v])=>{const a=__club.app;a.setting("quality",q);a.setting("camera",v);a.progress.settings.difficulty="sport"}',[quality,view])
   select(page,mode,5,'endless');page.evaluate(PILOT);page.wait_for_timeout(6000)
   before=page.evaluate(RESET);page.wait_for_timeout(args.seconds*1000);row=page.evaluate(COLLECT,before)
   row.update({'engine':engine,'mode':mode,'camera':view if mode=='race' else None,'weapon':'field-akm' if mode=='shooting' else None,'level':5,'playlist':'endless','quality':quality,'profile':'touch-emulation-on-M2' if mobile else 'desktop','device':runtime_info(page),'measuredFps':1000/row['meanFrameMs'],'targetBandFps':28 if mobile else 55})
   row['passed']=row['measuredFps']>=row['targetBandFps'] and row['gl']==0 and row['phase']=='playing' and row['simulationElapsed']>=row['wallElapsedMs']/1000*.85 and not row['errors'];rows.append(row)
   print(json.dumps({k:row[k] for k in ['engine','mode','camera','profile','measuredFps','p95FrameMs','p99FrameMs','simulationElapsed','wallElapsedMs','gl','passed']},ensure_ascii=False),flush=True)
   page.screenshot(path=str(PREVIEW/'7.1'/f'perf-{engine}-{mode}-{view}-{viewport["width"]}.png'));page.goto('about:blank');context.close()
  browser.close()
 same=source==fingerprint()
 report={'timestamp':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'sourceFingerprint':source,'sourcesUnchangedDuringRun':same,'conditions':f'Nine sequential cases, normal requestAnimationFrame and production FixedClock. A pilot supplies only inputs at ordinary physics steps. No synthetic time. Each case has 6 seconds of countdown/shader warm-up and {args.seconds:g} seconds of measured real time. Single benchmark browser; no concurrent graphics tests. Touch profiles use desktop Apple M2 graphics and do not measure phone hardware. Local HTTP with normal filesystem/browser caches; this report does not measure cold network loading.','runs':rows,'errors':errors,'passed':same and not errors and all(r['passed'] for r in rows)}
 (OUT/'performance-update.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('7.1 performance passed:',report['passed'],flush=True)
 if not report['passed']:raise SystemExit(1)

if __name__=='__main__':main()
