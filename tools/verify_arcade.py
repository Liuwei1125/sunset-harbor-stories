"""Harbor Club rules, complete playthroughs, saves, rendering and native touch.

Each browser context is isolated. Rules tests explicitly arrange edge cases;
playthroughs only steer/aim/press controls and advance the production 120 Hz clock.
"""
import hashlib,json,math
from playwright.sync_api import sync_playwright
from verify_config import ROOT,OUT,PREVIEW,CHROMIUM

checks=[];errors=[];requests=[]
def check(name,ok,detail=None):
 checks.append({'name':name,'pass':bool(ok),'detail':detail});print(('PASS ' if ok else 'FAIL ')+name,flush=True)
def tick(page,t):
 page.evaluate('(t)=>{for(let i=0;i<Math.round(t*120);i++)clubStep(1/120);clubCamera();clubHUD()}',t)
def boot(browser,mobile=False,compat=False):
 ctx=browser.new_context(viewport={'width':390,'height':844} if mobile else {'width':1280,'height':800},device_scale_factor=1,is_mobile=mobile,has_touch=mobile,offline=True,accept_downloads=True)
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
 page.add_init_script('window.requestAnimationFrame=()=>0')
 page.goto((ROOT/'arcade.html').as_uri()+('?compat=1' if compat else ''));page.wait_for_function('!!window.__club',polling=20)
 page.evaluate('CLUB.save.settings.volume=0;clubApplyAudio()')
 page.add_script_tag(content=(ROOT/'tools/arcade_playthrough.js').read_text())
 return ctx,page

def start(page,mode,level=0,playlist='levels'):
 page.evaluate('([mode,level,playlist])=>{clubLobby();CLUB.mode=mode;CLUB.level=level;CLUB.playlist=playlist;clubBuildWorld();clubNewRun()}',[mode,level,playlist]);tick(page,3.1)

def native_start(page,mode,playlist='endless'):
 page.evaluate('clubLobby()');page.locator('[data-mode="'+mode+'"]').tap();page.locator('[data-playlist="'+playlist+'"]').tap();page.locator('#club-start').tap();page.locator('#club-go').tap();tick(page,3.1)

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=CHROMIUM)
 nav=browser.new_context(viewport={'width':1280,'height':800},offline=True);entry=nav.new_page();entry.on('pageerror',lambda e:errors.append(str(e)));entry.add_init_script('window.requestAnimationFrame=()=>0')
 entry.goto((ROOT/'index.html').as_uri());entry.wait_for_function('!!window.__experience',polling=20);entry.locator('#arcade-open').click();entry.wait_for_function('!!window.__club',polling=20)
 separated=entry.evaluate('!window.__experience&&!saveLoaded&&suppressSave');entry.locator('.club-main-link').click();entry.wait_for_function('!!window.__experience',polling=20)
 check('Public campaign and club links navigate to separate game lifecycles',separated and entry.evaluate('!window.__club&&!!document.getElementById("arcade-toolbar")'));nav.close()
 ctx,page=boot(browser)
 check('Four complete six-event catalogs and three difficulty choices',page.evaluate('Object.values(CLUB_LEVELS).every(a=>a.length===6&&new Set(a.map(l=>l.name)).size===6)&&Object.keys(CLUB_MODES).length===4&&CLUB_DIFFICULTIES.length===3'))
 check('Club owns lifecycle and never initializes campaign actors or saving',page.evaluate('suppressSave&&!saveLoaded&&cars.length===0&&enemies.length===0&&civilians.length===0&&!experience.initialized&&!window.__experience'))
 page.evaluate("localStorage.setItem('sunset-run-v6-save','campaign-sentinel-do-not-touch')")
 # Full reachability: all 24 events in each difficulty use simulation and controls.
 played=[]
 for mode in ['race','shooting','darts','archery']:
  for level in range(6):
   results=[page.evaluate('args=>clubQADrive(...args)',[mode,level,d]) for d in ['casual','sport','expert']]
   played.extend(results)
   check(f'{mode} event {level+1}: all three difficulties complete',all(r['success'] and r['phase']=='result' and r['gl']==0 for r in results),[{k:r.get(k) for k in ['difficulty','elapsed','score','shots','throws','checkpoints','rank','collisions']} for r in results])
 check('Campaign save survives every club game and pagehide',page.evaluate("()=>{window.dispatchEvent(new Event('pagehide'));return localStorage.getItem('sunset-run-v6-save')==='campaign-sentinel-do-not-touch';}"))
 # Traditional rule boundaries, independent expected geometry.
 darts=page.evaluate('''()=>{const order=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5],out=[];for(let i=0;i<20;i++)for(const [r,m]of [[.06,1],[.103,3],[.166,2]]){const a=i*Math.PI/10,h=clubDartScore(Math.sin(a)*r,Math.cos(a)*r);out.push(h.score===order[i]*m&&h.multiplier===m&&h.double===(m===2));}return {segments:out,bulls:[clubDartScore(0,0),clubDartScore(.010,0),clubDartScore(.171,0)]};}''')
 check('Dartboard geometry: all 60 scoring sectors, bulls and outside',all(darts['segments']) and [h['score'] for h in darts['bulls']]==[50,25,0],darts['bulls'])
 routes=page.evaluate('''()=>{const out={};for(const n of [2,3,40,50,100,158,159,160,162,163,164,165,166,167,168,169,170,171])out[n]=clubCheckout(n,3,true);return out;}''')
 check('Checkout routes obey three darts and legal double finishes',all(routes[str(n)] is None for n in [159,162,163,165,166,168,169,171]) and routes['170']==['T20','T20','BULL'] and routes['2']==['D1'],routes)
 start(page,'darts',4)
 bust=page.evaluate('''()=>{const r=CLUB.run;r.remaining=r.turnStart=60;clubDartApply({score:20,number:20,multiplier:1,label:'20',double:false});clubDartApply({score:45,number:15,multiplier:3,label:'T15',double:false});return {remaining:r.remaining,turn:r.turn.length,busts:r.busts,score:r.score};}''')
 check('Bust restores the entire three-dart turn, including earlier scoring',bust=={'remaining':60,'turn':0,'busts':1,'score':441},bust)
 start(page,'darts',4)
 single=page.evaluate('''()=>{const r=CLUB.run;r.remaining=r.turnStart=20;clubDartApply({score:20,number:20,multiplier:1,label:'20',double:false});return {remaining:r.remaining,phase:CLUB.phase,busts:r.busts};}''')
 check('501 rejects a single-segment finish',single['remaining']==20 and single['busts']==1 and single['phase']=='playing',single)
 start(page,'darts',4)
 bull=page.evaluate('''()=>{CLUB.run.remaining=CLUB.run.turnStart=50;clubDartApply(clubDartScore(0,0));return {success:CLUB.result.success,remaining:CLUB.run.remaining,throws:CLUB.result.score};}''')
 check('Inner bull is a valid double checkout and records actual darts used',bull=={'success':True,'remaining':0,'throws':1},bull)
 archery=page.evaluate('''()=>{const r=.61;return {centers:Array.from({length:10},(_,i)=>clubArcheryScore(r,(i+.5)*r/10)),lines:Array.from({length:10},(_,i)=>clubArcheryScore(r,(i+1)*r/10)),outside:clubArcheryScore(r,.611)};}''')
 check('Archery has ten rings, higher-ring line calls and zero outside',archery['centers']==list(range(10,0,-1)) and archery['lines']==list(range(10,0,-1)) and archery['outside']==0,archery)
 # Difficulty is taken from a runtime snapshot, with physical differences.
 diffs=page.evaluate('''()=>{const out=[];for(const mode of ['race','shooting','archery'])for(const d of CLUB_DIFFICULTIES){clubLobby();CLUB.mode=mode;CLUB.level=3;CLUB.save.settings.difficulty=d.id;clubBuildWorld();clubNewRun();const r=CLUB.run;out.push({mode,d:d.id,pace:r.rivals?.[0].pace,time:r.duration,radius:r.targets[0]?.radius,size:r.targets[0]?.scale,wind:Math.abs(r.baseWind||0),assist:d.sway});}return out;}''')
 check('Difficulty changes actual opponent pace, target window/size and wind',diffs[0]['pace']<diffs[1]['pace']<diffs[2]['pace'] and diffs[3]['time']>diffs[4]['time']>diffs[5]['time'] and diffs[3]['size']>diffs[4]['size']>diffs[5]['size'] and diffs[6]['wind']<diffs[7]['wind']<diffs[8]['wind'],diffs)
 # Shooting mechanics, movement bounds and exactly one input owner.
 start(page,'shooting',3)
 foul=page.evaluate('''()=>{const r=CLUB.run;r.targets.forEach(t=>t.active=false);const t=r.targets[2];t.active=true;t.friend=true;t.fold=0;r.score=200;clubCamera();const v=sub(V(t.x,1.24*t.scale,t.z+.09*t.scale),cam.eye);CLUB.look.yaw=Math.atan2(-v.x,-v.z);CLUB.look.pitch=Math.atan2(v.y,Math.hypot(v.x,v.z));clubFire();return {fouls:r.fouls,hits:r.hits,score:r.score,ammo:r.ammo,down:!t.active};}''')
 check('No-shoot targets penalize score and never count as a valid hit',foul['fouls']==1 and foul['hits']==0 and foul['score']==100 and foul['down'],foul)
 start(page,'shooting')
 page.keyboard.down('Space');tick(page,7);page.keyboard.up('Space')
 ammo=page.evaluate('({ammo:CLUB.run.ammo,reload:CLUB.run.reload,shots:CLUB.run.shots,events:CLUB.events.filter(e=>e.type.startsWith("reload")).slice(-5)})')
 check('Sustained fire depletes magazines and completes timed automatic reloads',ammo['shots']>30 and ammo['ammo']>=0 and any(e['type']=='reload-complete' for e in ammo['events']),ammo)
 page.keyboard.down('w');page.keyboard.down('a');tick(page,20);page.keyboard.up('w');page.keyboard.up('a')
 check('Training movement is bounded to the shooting apron',page.evaluate('Math.abs(CLUB.run.pos.x)<=5.5&&CLUB.run.pos.z>=-4&&CLUB.run.pos.z<=4'))
 # Three real gun assets, aimed scopes and reload poses.
 models=[]
 for weapon in range(3):
  start(page,'shooting');page.evaluate('(i)=>{CLUB.run.weapon=i;state.weapon=CLUB_WEAPONS[i].id;CLUB.run.ammo=CLUB_WEAPONS[i].mag;CLUB.held.add("secondary")}',weapon);tick(page,.5);page.evaluate('clubRender();clubHUD()')
  models.append(page.evaluate('({weapon:CLUB.run.weapon,gl:renderer.gl.getError(),scope:!$("club-scope").hidden,groups:[...dynamic.groups.entries()].filter(([k,v])=>v.count).length})'))
 check('Pistol, rifle and scoped precision rifle render with usable aiming views',all(x['gl']==0 and x['groups']>0 for x in models) and not models[0]['scope'] and not models[1]['scope'] and models[2]['scope'],models)
 # Ordered checkpoints, recoveries, nitro and braking.
 start(page,'race')
 skip=page.evaluate('''()=>{const r=CLUB.run,q=clubTrackAt(CLUB.track,CLUB.track.length/3);r.car.pos={...q.pos};r.car.yaw=q.yaw;for(let i=0;i<30;i++)clubStep(1/120);return r.checkpoints;}''')
 check('Skipping across the circuit cannot award later checkpoints',skip==0)
 recovered=page.evaluate('''()=>{clubRaceReset();return {gate:CLUB.run.nextGate,penalty:CLUB.run.penalty,speed:CLUB.run.car.speed,distance:clubTrackNearest(CLUB.track,CLUB.run.car.pos).distance};}''')
 check('Recovery returns to the last valid gate and applies a time penalty',recovered['gate']==1 and recovered['penalty']==3 and recovered['speed']==0 and recovered['distance']<.01,recovered)
 speeds=[]
 for action in ['action','nitro','secondary']:
  start(page,'race');page.evaluate('CLUB.run.car.speed=12')
  page.keyboard.down('s' if action=='secondary' else 'w')
  if action=='nitro':page.keyboard.down('Shift')
  tick(page,.4)
  speeds.append(page.evaluate('({speed:CLUB.run.car.speed,nitro:CLUB.run.nitro})'));page.keyboard.up('w');page.keyboard.up('s');page.keyboard.up('Shift')
 check('Nitro consumes charge and accelerates; braking slows the vehicle',speeds[1]['speed']>speeds[0]['speed']>speeds[2]['speed'] and speeds[1]['nitro']<100,speeds)
 # Pausing freezes each live game, then resumes without stuck actions.
 for mode in ['race','shooting','darts','archery']:
  start(page,mode);page.keyboard.down('Space');tick(page,.4);page.keyboard.press('Escape')
  before=page.evaluate('JSON.stringify(CLUB.run)');tick(page,2);after=page.evaluate('JSON.stringify(CLUB.run)')
  page.locator('#club-resume').click();tick(page,.2)
  check(mode+' pause freezes clocks and clears held input',before==after and page.evaluate('CLUB.phase==="playing"&&CLUB.held.size===0&&!CLUB.run.charging'))
 # Daily fixed seed and endless progression through multiple groups.
 for mode in ['race','shooting','darts','archery']:
  signatures=[]
  for _ in range(2):
   start(page,mode,playlist='daily');tick(page,8)
   signatures.append(page.evaluate('JSON.stringify({level:CLUB.level,key:CLUB.run.key,seed:CLUB.seed,targets:CLUB.run.targets,wind:CLUB.run.wind,rivals:CLUB.run.rivals?.map(a=>[a.progress,a.currentLane])})'))
  check(mode+' daily challenge repeats its scene and conditions',signatures[0]==signatures[1])
  result=page.evaluate('args=>clubQADrive(...args)',[mode,5,'sport',{'playlist':'endless','seconds':100}]);page.evaluate('clubBank()')
  banked=page.evaluate('({success:CLUB.result?.success,key:CLUB.run.key,embedded:CLUB.run.embedded.length,sparks:CLUB.run.sparks.length,round:CLUB.run.round,wave:CLUB.run.wave,sets:CLUB.run.completedSets})')
  check(mode+' endless session stays playable and banks progress',result['phase']=='playing' and banked['success'] and ':endless' in banked['key'] and banked['embedded']<=30 and banked['sparks']<=90,banked)
 # No actor model may be drawn by any of the four scene paths.
 no_people=page.evaluate('''()=>{let called=0;const old=drawPerson;drawPerson=function(){called++;return old(...arguments);};for(const mode of Object.keys(CLUB_MODES)){clubLobby();CLUB.mode=mode;clubBuildWorld();clubNewRun();clubRender();}drawPerson=old;return {calls:called,campaignActors:cars.length+enemies.length+civilians.length};}''')
 check('Every game renders first-person equipment without calling character drawing',no_people=={'calls':0,'campaignActors':0},no_people)
 # Render effects/quality variants and verify resource disposal.
 render_results=[]
 for effect in ['classic','photo']:
  for quality in ['low','medium','high']:
   row=[]
   for mode in ['race','shooting','darts','archery']:
    start(page,mode);page.evaluate('([e,q])=>{CLUB.save.settings.effect=e;CLUB.save.settings.quality=q;clubApplySettings();clubRender()}',[effect,quality])
    row.append(page.evaluate('({mode:CLUB.mode,effect:renderer.active9,tier:RENDER.tier,gl:renderer.gl.getError(),width:canvas.width,height:canvas.height,triangles:telemetry.triangles})'))
   render_results.extend(row);check(effect+' / '+quality+' renders all four games',all(x['gl']==0 and x['effect']==(effect=='photo') and x['triangles']>5000 for x in row),row)
 released=page.evaluate('''()=>{CLUB.save.settings.effect='photo';clubApplySettings();clubRender();const t=renderer.targets9.scene.color;CLUB.save.settings.effect='classic';clubApplySettings();return !renderer.gl.isTexture(t)&&renderer.targets9===null&&renderer.nearShadow9===null;}''')
 check('Changing to classic frees photographic framebuffers and textures',released)
 # Replay the saved personal best through the actual ghost render path.
 page.evaluate("CLUB.save.settings.difficulty='casual'");start(page,'race')
 ghost=page.evaluate('''()=>{const r=CLUB.run,calls=[],old=clubMesh;clubMesh=function(b,id,p,yaw,opts={}){if(id==='comet-sport'&&opts.alpha===.20)calls.push([p.x,p.y,p.z]);return old(...arguments);};for(const seconds of [3,6]){while(r.elapsed<seconds)clubStep(1/120);clubRender();}clubMesh=old;return {saved:r.ghost?.length||0,calls,gl:renderer.gl.getError()};}''')
 check('Saved personal-best ghost renders and advances along its recorded route',ghost['saved']>100 and len(ghost['calls'])==2 and ghost['calls'][0]!=ghost['calls'][1] and ghost['gl']==0,ghost)
 # Track new GPU resources through two full sweeps; mesh caches may warm once.
 resources=page.evaluate('''()=>{const g=renderer.gl,live={Buffer:new Set(),Texture:new Set(),Framebuffer:new Set()},methods={};for(const kind of Object.keys(live)){const a='create'+kind,b='delete'+kind;methods[a]=g[a];methods[b]=g[b];g[a]=function(){const item=methods[a].call(g);live[kind].add(item);return item;};g[b]=function(item){live[kind].delete(item);return methods[b].call(g,item);};}
 const sweeps=[];for(let sweep=0;sweep<2;sweep++){for(let n=0;n<24;n++){clubLobby();CLUB.mode=Object.keys(CLUB_MODES)[n%4];CLUB.level=Math.floor(n/4);CLUB.save.settings.effect=n%2?'classic':'photo';clubApplySettings();clubBuildWorld();clubNewRun();for(let i=0;i<400;i++)clubStep(1/120);clubRender();}CLUB.save.settings.effect='classic';clubApplySettings();clubRender();sweeps.push(Object.fromEntries(Object.entries(live).map(([k,v])=>[k,v.size])));}for(const [name,fn] of Object.entries(methods))g[name]=fn;return {sweeps,gl:g.getError(),events:CLUB.events.length,actors:cars.length+enemies.length+civilians.length};}''')
 check('48 scene rebuilds and effect switches keep GPU resources and histories bounded',resources['sweeps'][1]==resources['sweeps'][0] and resources['gl']==0 and resources['events']<=600 and resources['actors']==0,resources)
 # This macOS Chrome may reject pointer lock even on a minimal button page.
 # Test the native accepted path when available, otherwise its real drag fallback.
 page.evaluate('clubLobby()');page.locator('[data-mode="shooting"]').click();page.locator('#club-start').click();page.locator('#club-go').click();tick(page,3.1)
 page.evaluate('''()=>{const old=canvas.requestPointerLock.bind(canvas);canvas.requestPointerLock=(...args)=>old(...args).catch(e=>{window.clubLockError={name:e.name,message:e.message};throw e;});}''')
 page.mouse.click(700,450);page.wait_for_function('document.pointerLockElement===canvas||window.clubLockError',polling=20)
 locked=page.evaluate('document.pointerLockElement===canvas')
 if locked:
  page.evaluate('document.exitPointerLock()');page.wait_for_function('CLUB.phase==="paused"',polling=20);usable=True
 else:
  before=page.evaluate('CLUB.look.yaw');page.mouse.move(700,450);page.mouse.down(button='right');page.mouse.move(760,420);tick(page,.2);page.mouse.up(button='right')
  usable=page.evaluate('CLUB.look.yaw')!=before;page.keyboard.press('Escape')
 check('Native pointer-lock request or drag fallback preserves aiming and pause',usable and page.evaluate('CLUB.phase==="paused"&&CLUB.held.size===0'),{'nativeLockAcquired':locked,'browserRejection':page.evaluate('window.clubLockError||null'),'fallbackAimChanged':usable if not locked else None})
 # Settings persistence and corruption recovery, with the campaign sentinel intact.
 page.evaluate('clubLobby()');page.locator('#club-settings-open').click();page.locator('#club-effect').select_option('classic');page.locator('#club-quality').select_option('medium');page.locator('#club-sensitivity').fill('1.4');page.locator('#club-sensitivity').dispatch_event('input')
 with page.expect_download() as dl:page.locator('#club-export').click()
 payload=json.loads(dl.value.path().read_text())
 check('Export contains independent club records and settings',payload['version']==1 and len(payload['records'])>50 and payload['settings']['effect']=='classic' and 'player' not in payload)
 page.locator('#club-import-file').set_input_files({'name':'club.json','mimeType':'application/json','buffer':json.dumps(payload).encode()});page.wait_for_function('document.getElementById("club-storage-status").textContent.includes("已导入")',polling=20)
 check('Import restores a validated club save',page.evaluate('CLUB.save.settings.effect==="classic"&&CLUB.save.settings.sensitivity===1.4'))
 old_count=page.evaluate('Object.keys(CLUB.save.records).length')
 page.locator('#club-import-file').set_input_files({'name':'broken.json','mimeType':'application/json','buffer':b'{broken'});page.wait_for_timeout(80)
 check('Malformed imports do not replace working progress',page.evaluate('Object.keys(CLUB.save.records).length')==old_count)
 page.reload();page.wait_for_function('!!window.__club',polling=20)
 persisted=page.evaluate('({records:Object.keys(CLUB.save.records).length,settings:CLUB.save.settings,campaign:localStorage.getItem("sunset-run-v6-save")})')
 check('Reload retains completed challenges and selected effect',persisted['records']==old_count and persisted['settings']['effect']=='classic' and persisted['settings']['quality']=='medium' and persisted['settings']['sensitivity']==1.4 and persisted['campaign']=='campaign-sentinel-do-not-touch',{'records':persisted['records'],'settings':persisted['settings']})
 # Corrupt the slot before the next application boots; pagehide intentionally
 # saves the live healthy state, so writing before navigation is not corruption.
 page.add_init_script("localStorage.setItem('sunset-harbor-club-v1','{broken')");page.reload();page.wait_for_function('!!window.__club',polling=20)
 check('Damaged local club save recovers without touching the campaign slot',page.evaluate('CLUB.phase==="lobby"&&CLUB.save.version===1&&Object.keys(CLUB.save.records).length===0&&localStorage.getItem("sunset-run-v6-save")==="campaign-sentinel-do-not-touch"'))
 ctx.close()
 # Native CDP touch contacts exercise simultaneous movement and drag-to-aim.
 ctx,phone=boot(browser,mobile=True);cdp=ctx.new_cdp_session(phone)
 for viewport in [{'width':390,'height':844},{'width':844,'height':390}]:
  phone.set_viewport_size(viewport)
  for mode in ['race','shooting','darts','archery']:
   native_start(phone,mode);before=phone.evaluate('({yaw:CLUB.look.yaw,carYaw:CLUB.run.car?.yaw,shots:CLUB.run.shots})')
   act=phone.locator('#club-touch-action').bounding_box();stick=phone.locator('#club-stick').bounding_box();ax=act['x']+act['width']/2;ay=act['y']+act['height']/2;sx=stick['x']+stick['width']/2;sy=stick['y']+stick['height']/2
   contacts=[{'id':1,'x':sx,'y':sy},{'id':2,'x':ax,'y':ay}]
   cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':contacts});tick(phone,.2)
   contacts[0]['x']+=24;contacts[1]['x']-=20;contacts[1]['y']-=8
   cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':contacts});tick(phone,1.3)
   cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});tick(phone,.5)
   physical=phone.evaluate('({speed:CLUB.run.car?.speed,carYaw:CLUB.run.car?.yaw,yaw:CLUB.look.yaw,shots:CLUB.run.shots,projectile:!!CLUB.run.projectile,held:CLUB.held.size,gl:renderer.gl.getError()})')
   moving=physical.get('speed',0)>0 and physical['carYaw']!=before['carYaw'] if mode=='race' else physical['yaw']!=before['yaw'] and (physical['shots']>0 or physical['projectile'])
   phone.locator('#club-pause').tap();frozen=phone.evaluate('CLUB.run.elapsed');tick(phone,1);pause_ok=phone.evaluate('CLUB.run.elapsed')==frozen;phone.locator('#club-resume').tap();tick(phone,2)
   phone.locator('#club-bank').tap();result_ok=phone.locator('#club-result-retry').is_visible();phone.locator('#club-result-retry').tap();tick(phone,3.1);phone.evaluate('clubRender();clubHUD()')
   in_bounds=phone.evaluate('''()=>[...document.querySelectorAll('#club-touch button')].filter(e=>!e.hidden).every(e=>{const r=e.getBoundingClientRect();return r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight})&&document.documentElement.scrollWidth<=innerWidth''')
   check(f'Native touch {viewport["width"]}×{viewport["height"]} / {mode}',moving and physical['held']==0 and physical['gl']==0 and pause_ok and result_ok and in_bounds,physical)
   phone.screenshot(path=str(PREVIEW/f'club-{mode}-touch-{viewport["width"]}.png'))
 ctx.close()
 # Honest CPU fallback: run input/scoring and render each environment.
 ctx,cpu=boot(browser,compat=True)
 for mode in ['race','shooting','darts','archery']:
  start(cpu,mode);cpu.keyboard.down('w' if mode=='race' else 'Space');tick(cpu,1.3);cpu.keyboard.up('w' if mode=='race' else 'Space');tick(cpu,1)
  cpu.evaluate('clubRender();clubHUD()');result=cpu.evaluate('({software:renderer.software,elapsed:CLUB.run.elapsed,faces:renderer.faceCount,active:CLUB.phase})')
  check(mode+' CPU fallback keeps simulation, inputs and 3D geometry',result['software'] and result['elapsed']>2 and result['faces']>0 and result['active']=='playing',result)
 cpu.screenshot(path=str(PREVIEW/'club-compatibility.png'));ctx.close();browser.close()

check('Offline gameplay makes no remote asset requests',not any(u.startswith(('http:','https:')) for u in requests),list(set(u for u in requests if u.startswith(('http:','https:')))))
check('No application exceptions in desktop, touch or compatibility paths',not errors,errors)
report={'sha256':hashlib.sha256((ROOT/'arcade.html').read_bytes()).hexdigest(),'mainSha256':hashlib.sha256((ROOT/'index.html').read_bytes()).hexdigest(),'passed':sum(c['pass'] for c in checks),'total':len(checks),'checks':checks,'errors':errors,'playthroughs':played,'renderVariants':render_results,'method':'Isolated offline Chromium. Deterministic 120 Hz gameplay drivers use production controls and physics for 72 complete event/difficulty combinations; rule edge cases are explicitly arranged; native simultaneous CDP touch is tested in portrait and landscape. Physical phone GPU performance is not inferred from emulation.'}
(OUT/'arcade-browser.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(f'{report["passed"]}/{report["total"]} checks passed',flush=True)
if report['passed']!=report['total']:raise SystemExit(1)
