"""New engine UI, 72 rendered playthroughs, lifecycle and resource verification.
The fixed-step driver is a behavior test; FPS is measured separately by benchmark.py.
"""
from playwright.sync_api import sync_playwright
from browser_common import ROOT,OUT,PREVIEW,BASE,CHROME,server,boot,wait_ready,tick,select,runtime_info
import json,time

checks=[];errors=[];requests=[];played=[];render_variants=[]
def check(name,passed,detail=None):
 checks.append({'name':name,'pass':bool(passed),'detail':detail});print(('PASS ' if passed else 'FAIL ')+name,flush=True)

def attach(page):
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('request',lambda r:requests.append(r.url))

with server(),sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=CHROME)
 legacy={'version':1,'xp':950,'records':{'darts:0:casual:levels':{'best':123,'medal':2,'plays':1,'date':'2026-09-10'}},'settings':{'effect':'classic','weapon':1,'volume':0}}
 context,page=boot(browser,track_gpu=True,legacy=legacy);attach(page);device=runtime_info(page)
 before=page.evaluate("localStorage.getItem('sunset-harbor-club-v1')")
 check('Same-origin legacy progress is copied and settings migrate',page.evaluate('__club.app.progress.version===2&&__club.app.progress.xp===950&&__club.app.progress.settings.look==="classic"&&__club.app.progress.records["darts:0:casual:levels"].best===123'))
 check('Babylon loads alone and no campaign global is initialized',page.evaluate('!!window.BABYLON&&!window.pc&&!window.__experience&&!window.CLUB&&!window.state'))
 page.evaluate("__club.app.setting('look','natural');__club.app.manual=true")
 # Every combination runs inside the real application with native GLB rendering.
 for mode in ['race','shooting','darts','archery']:
  for level in range(6):
   select(page,mode,level)
   rows=[]
   for difficulty in ['casual','sport','expert']:
    page.evaluate('(d)=>{__club.app.progress.settings.difficulty=d;if(__club.sim.state.phase==="lobby")__club.app.reconfigure();}',difficulty)
    if page.locator('#lobby').is_visible():page.locator('#start').click();page.locator('[data-action="go"]').click()
    else:page.locator('[data-action="retry"]').click()
    page.wait_for_function('__club.sim.state.phase==="countdown"')
    row=page.evaluate('''async ([mode,level,difficulty])=>{
     const {drive}=await import('./tools/playthrough.mjs');const app=__club.app;app.manual=true;let frames=0;
     const result=drive(mode,level,difficulty,{sim:app.sim,renderEvery:240,onStep:()=>{app.draw(1);frames++;}});app.draw(1);
     const gl=document.getElementById('view').getContext('webgl2');return {mode,level,difficulty,success:result.success,phase:result.phase,elapsed:result.elapsed,score:result.result.score,shots:result.shots,hits:result.hits,throws:result.throws,checkpoints:result.checkpoints,collisions:result.collisions,frames,gl:gl.getError(),stats:app.renderer.stats(),resultRecorded:!!app.progress.records[result.result.key]};
    }''',[mode,level,difficulty]);rows.append(row);played.append(row)
    page.wait_for_function('document.querySelector("[data-action=retry]")&&__club.app.ui.dialogKind==="result"')
    if level==0 and difficulty=='casual':page.screenshot(path=str(PREVIEW/f'{mode}-verified-result.png'))
   check(f'{mode} event {level+1}: three rendered completions',all(r['success'] and r['phase']=='result' and r['frames']>0 and r['gl']==0 and r['resultRecorded'] for r in rows),[{k:r.get(k) for k in ['difficulty','elapsed','score','frames','gl']} for r in rows])
 check('All 72 results and engine rules retain isolated saves',page.evaluate("Object.keys(__club.app.progress.records).length===72&&localStorage.getItem('sunset-run-v6-save')==='campaign-sentinel-do-not-touch'") and before==page.evaluate("localStorage.getItem('sunset-harbor-club-v1')"))
 # Shared lifecycle, settings and snapshots across four modes.
 for mode in ['race','shooting','darts','archery']:
  select(page,mode,0,'endless');page.evaluate('__club.start()');tick(page,3.1)
  page.keyboard.down('Space');tick(page,.4);page.keyboard.press('Escape');before_run=page.evaluate('JSON.stringify(__club.sim.state.run)');tick(page,2)
  frozen=page.evaluate('JSON.stringify(__club.sim.state.run)')==before_run
  page.locator('[data-action="resume"]').click();page.keyboard.up('Space');tick(page,4)
  input_clear=page.evaluate('__club.sim.state.phase==="playing"&&__club.sim.state.held.size===0&&!__club.sim.state.run.charging')
  page.locator('#bank').click();page.wait_for_function('__club.app.ui.dialogKind==="result"')
  check(mode+' native pause/resume and endless banking',frozen and input_clear and page.evaluate('__club.sim.state.result.success&&__club.sim.state.run.key.endsWith(":endless")'))
 # Daily survives a fresh simulation and runtime state does not adopt changed difficulty.
 for mode in ['race','shooting','darts','archery']:
  signatures=[]
  for _ in range(2):
   select(page,mode,0,'daily');page.evaluate('__club.start()');tick(page,11.1)
   signatures.append(page.evaluate('JSON.stringify({level:__club.sim.state.level,seed:__club.sim.state.seed,run:__club.sim.state.run})'))
  check(mode+' daily conditions repeat exactly',signatures[0]==signatures[1])
 # Changing renderer settings must never change authoritative state.
 for mode in ['race','shooting','darts','archery']:
  select(page,mode);page.evaluate('__club.start()');tick(page,3.1)
  before_run=page.evaluate('JSON.stringify(__club.sim.state.run)')
  for look in ['classic','natural']:
   for quality in ['low','medium','high']:
    row=page.evaluate('''([look,quality])=>{const a=__club.app;a.setting('look',look);a.setting('quality',quality);a.draw(1);return {mode:a.sim.state.mode,look,quality,gl:document.getElementById('view').getContext('webgl2').getError(),stats:a.renderer.stats()};}''',[look,quality]);render_variants.append(row)
  same=page.evaluate('JSON.stringify(__club.sim.state.run)')==before_run
  check(mode+' quality/effects render without changing rules',same and all(r['gl']==0 for r in render_variants if r['mode']==mode),{'sameState':same,'renders':[{k:r[k]for k in ['look','quality','gl']}for r in render_variants if r['mode']==mode]})
 # Three weapon models, native joint animation and scoped camera.
 weapon_rows=[]
 for weapon in range(3):
  select(page,'shooting');page.evaluate('(w)=>{__club.app.progress.settings.weapon=w;__club.app.reconfigure();}',weapon);page.evaluate('__club.start()');tick(page,3.1)
  page.keyboard.down('Space');tick(page,.04);page.keyboard.up('Space');page.keyboard.press('r');tick(page,.3)
  animated=page.evaluate('''()=>{const r=__club.renderer,g=[...r.dynamic.values()].find(v=>v.root.isEnabled()&&['sidearm-pistol','field-akm','longwatch-sniper'].includes(v.id)),j=g.joints.find(j=>j.motion==='magazine');return {id:g.id,magazineOffset:j.node.position.y-j.base.y,reload:__club.sim.state.run.reload};}''')
  page.evaluate('__club.sim.hold("secondary",true)');tick(page,.5);page.evaluate('__club.app.draw(1)');animated['scope']=page.locator('#scope').is_visible();weapon_rows.append(animated)
  page.screenshot(path=str(PREVIEW/f'weapon-{weapon}-aim.png'))
 check('All three native GLB weapons have moving magazines and usable scope states',all(r['magazineOffset']<-.02 and r['reload']>0 for r in weapon_rows) and [r['scope'] for r in weapon_rows]==[False,False,True],weapon_rows)
 # Native container geometry, thin instance buffers and material ownership stay separate.
 select(page,'race');page.evaluate('__club.start()');tick(page,3.1)
 joints=page.evaluate('''()=>{const r=__club.renderer,car=[...r.dynamic.values()].find(v=>v.id==='touring-gt'&&v.root.name==='player-car'),tree=r.staticBatches.find(m=>m.name.includes('canopy')),source=r.containers.get('club-canopy-tree:low').meshes.find(m=>m.geometry);return {joints:car.joints.map(j=>j.motion),dashboard:!!car.dashboard,uniqueGeometry:tree.geometry!==source.geometry,templateHasThinBuffers:source.isVerticesDataPresent('world0')};}''')
 check('Native joints and independent thin-instance buffers preserve the source templates','steering' in joints['joints'] and 'wheel-front' in joints['joints'] and joints['dashboard'] and joints['uniqueGeometry'] and not joints['templateHasThinBuffers'],joints)
 # Memory trend is meaningful only after caches warm; compare the same final venue.
 resource_sweeps=[]
 for sweep in range(3):
  for mode in ['race','shooting','darts','archery']:
   select(page,mode,sweep%2);page.evaluate('__club.start()');tick(page,4.6)
  select(page,'race',0);page.evaluate('__club.start()');tick(page,4.1)
  row=page.evaluate('({live:__gpuLive(),stats:__club.renderer.stats(),events:__club.sim.state.events.length})');resource_sweeps.append(row)
 check('Scene disposal stabilizes live GPU resources after warm-up',resource_sweeps[1]['live']==resource_sweeps[2]['live'] and resource_sweeps[1]['stats']['meshes']==resource_sweeps[2]['stats']['meshes'],resource_sweeps)
 # Save import, export and reload through the visible settings flow.
 select(page,'race');page.locator('[data-action="settings"]').click();page.locator('[data-setting="look"]').select_option('classic');page.locator('[data-setting="quality"]').select_option('medium')
 with page.expect_download() as download:page.locator('[data-action="export"]').click()
 payload=json.loads(download.value.path().read_text());count=len(payload['records'])
 check('Export contains versioned club records and settings',payload['version']==2 and count>=72 and payload['settings']['look']=='classic' and 'player' not in payload)
 page.locator('#import-file').set_input_files({'name':'club.json','mimeType':'application/json','buffer':json.dumps(payload).encode()});page.wait_for_function('document.getElementById("settings-status").textContent.includes("已导入")')
 page.locator('#import-file').set_input_files({'name':'broken.json','mimeType':'application/json','buffer':b'{broken'});page.wait_for_timeout(150)
 check('Malformed import preserves working records',page.evaluate('Object.keys(__club.app.progress.records).length')==count)
 page.reload();wait_ready(page)
 check('Reload retains settings and records without changing campaign progress',page.evaluate("__club.app.progress.settings.look==='classic'&&__club.app.progress.settings.quality==='medium'&&localStorage.getItem('sunset-run-v6-save')==='campaign-sentinel-do-not-touch'") and page.evaluate('Object.keys(__club.app.progress.records).length')==count)
 # Engine switch is explicit and always a fresh page; no two engine dependencies coexist.
 page.locator('[data-action="settings"]').click();page.locator('summary').click();page.locator('#engine-choice').select_option('playcanvas');page.locator('[data-action="switch-engine"]').click();wait_ready(page)
 check('Advanced engine switch starts PlayCanvas alone and preserves progress',page.evaluate('!!window.pc&&!window.BABYLON&&__club.app.engine==="playcanvas"') and page.evaluate('Object.keys(__club.app.progress.records).length')==count)
 pc_rows=[]
 for level in range(6):
  select(page,'race',level);page.evaluate("__club.app.progress.settings.difficulty='sport';__club.app.reconfigure();__club.app.manual=true");page.evaluate('__club.start()')
  row=page.evaluate('''async level=>{const {drive}=await import('./tools/playthrough.mjs');const a=__club.app,r=drive('race',level,'sport',{sim:a.sim,renderEvery:240,onStep:()=>a.draw(1)});a.draw(1);return {level,success:r.success,score:r.result.score,elapsed:r.elapsed,checkpoints:r.checkpoints,collisions:r.collisions,gl:document.getElementById('view').getContext('webgl2').getError(),stats:a.renderer.stats()};}''',level);pc_rows.append(row)
  if level==0:page.screenshot(path=str(PREVIEW/'playcanvas-verified-result.png'))
  match=next(r for r in played if r['mode']=='race' and r['level']==level and r['difficulty']=='sport')
  check(f'PlayCanvas race {level+1} shares the exact completed simulation',row['success'] and row['gl']==0 and all(row[k]==match[k] for k in ['score','elapsed','checkpoints','collisions']),row)
 select(page,'race');page.locator('[data-mode="darts"]').click();wait_ready(page)
 check('Selecting a non-racing mode reinitializes Babylon with progress intact',page.evaluate('!!window.BABYLON&&!window.pc&&__club.sim.state.mode==="darts"') and page.evaluate('Object.keys(__club.app.progress.records).length')>=count)
 page.goto('about:blank');context.close()
 # A failed GLB request can be retried without a hard reload or stuck input owner.
 retry_context=browser.new_context(viewport={'width':1280,'height':800});retry=retry_context.new_page();attach(retry)
 retry.route('**/touring-gt.high.glb',lambda route:route.abort())
 retry.goto(BASE+'?verify=1');retry.wait_for_function('document.getElementById("load-error").hidden===false',timeout=90000)
 retry.unroute('**/touring-gt.high.glb');retry.locator('[data-action="retry-load"]').click();wait_ready(retry)
 check('Failed native model load recovers through the visible Retry action',retry.locator('#lobby').is_visible() and retry.evaluate('__club.renderer.stats().meshes>0'))
 retry.goto('about:blank');retry_context.close();browser.close()

check('No remote engine, decoder or model requests are made',not any(u.startswith(('http:','https:')) and not u.startswith(BASE.split('/club/')[0]) for u in requests),sorted(set(u for u in requests if u.startswith(('http:','https:')) and not u.startswith(BASE.split('/club/')[0]))))
check('No application exceptions during all product flows',not errors,errors)
report={'passed':sum(c['pass'] for c in checks),'total':len(checks),'checks':checks,'errors':errors,'device':device,'playthroughs':played,'playcanvasRaces':pc_rows,'renderVariants':render_variants,'method':'Real Chromium, native Babylon GLB assets, 72 production-control playthroughs with fixed 120 Hz stepping and periodic rendering; PlayCanvas consumes the same simulation for six additional race checks. Native input and normal-RAF performance are reported separately.'}
(OUT/'browser.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(f'{report["passed"]}/{report["total"]} checks passed',flush=True)
if report['passed']!=report['total']:raise SystemExit(1)
