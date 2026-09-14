"""Live desktop rendering under gameplay. No RAF override or clock stepping."""
import hashlib,json,statistics
from playwright.sync_api import sync_playwright
from verify_config import ROOT,OUT,PREVIEW,CHROMIUM

DRIVER=r'''()=>{
 const old=clubRender,frames=[];window.clubLive={frames};
 clubRender=function(){const start=performance.now();old();frames.push([start,performance.now()-start]);};
 clubLive.timer=setInterval(()=>{
  if(CLUB.phase!=='playing')return;const r=CLUB.run;
  if(CLUB.mode==='race'){
   const c=r.car,n=clubTrackNearest(CLUB.track,c.pos),ahead=8+Math.abs(c.speed)*.42,p=clubTrackAt(CLUB.track,n.s+ahead),far=clubTrackAt(CLUB.track,n.s+ahead+16),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a)),error=wrap(Math.atan2(-(p.pos.x-c.pos.x),-(p.pos.z-c.pos.z))-c.yaw),bend=Math.abs(wrap(far.yaw-n.yaw)),goal=clamp(30-bend*15,13,30);
   CLUB.touch.steer=-clamp(2*c.speed*Math.sin(error)/ahead*(1+Math.max(0,Math.abs(c.speed)-27)*.026)/(.28+Math.abs(c.speed)*.026),-1,1);clubHold('action',c.speed<goal+.2);clubHold('secondary',c.speed>goal+1.5);
  }else{
   let p,speed=10000,g=0,wind=0;
   if(CLUB.mode==='shooting'){const t=r.targets.find(t=>t.active&&!t.friend&&t.fold<.2);if(t)p=V(t.x,t.y+1.24*t.scale,t.z+.09*t.scale);clubHold('action',!!t&&r.reload===0&&r.cooldown===0);}
   else {if(r.projectile||r.cooldown>0||r.aiTurn)return;clubHold('breath',true);if(!r.charging)clubHold('action',true);if(CLUB.mode==='archery'){const t=r.targets[r.activeTarget];p=V(t.x,t.y,t.z+.055*t.radius/.61);speed=62;g=9.81;wind=r.wind;}else {p=V(0,1.833,-2.37);speed=13.5;g=7.2;}}
   if(p){clubCamera();const eye=cam.eye;let t=Math.hypot(p.x-eye.x,p.z-eye.z)/speed;
    for(let i=0;i<6;i++){const dx=p.x-eye.x-wind*.75*t*(t+1/120)/2,dy=p.y-eye.y+g*t*(t+1/120)/2,dz=p.z-eye.z;CLUB.look.yaw=Math.atan2(-dx,-dz);CLUB.look.pitch=Math.atan2(dy,Math.hypot(dx,dz));if(g){const l=clubLaunchProfile(1,CLUB.look,bx(basis(CLUB.look.yaw,CLUB.look.pitch),V(0,0,-1)));t=(l.plane-l.origin.z)/(l.dir.z*speed);}}
   }if(r.charging&&r.charge>=1)clubHold('action',false);
  }
 },16);
}'''

profiles=[];errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=CHROMIUM)
 for mode,quality in [(m,'high') for m in ['race','shooting','darts','archery']]+[('race','low')]:
  ctx=browser.new_context(viewport={'width':1280,'height':800},device_scale_factor=1,offline=True)
  page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto((ROOT/'arcade.html').as_uri());page.wait_for_function('!!window.__club')
  page.evaluate('q=>{CLUB.save.settings.volume=0;CLUB.save.settings.quality=q;clubApplySettings()}',quality)
  page.locator('[data-mode="'+mode+'"]').click();page.locator('[data-playlist="endless"]').click();page.locator('#club-start').click();page.locator('#club-go').click();page.wait_for_function('CLUB.phase==="playing"')
  page.evaluate(DRIVER);page.wait_for_timeout(2000);page.evaluate('clubLive.frames.length=0')
  page.wait_for_timeout(20000)
  data=page.evaluate('''()=>{clearInterval(clubLive.timer);clubClearInput();const r=CLUB.run;return {frames:clubLive.frames,errors:CLUB.frame.errors,gl:renderer.gl.getError(),phase:CLUB.phase,elapsed:r.elapsed,shots:r.shots,hits:r.hits,checkpoints:r.checkpoints,pools:{sparks:r.sparks.length,tracers:r.tracers.length,embedded:r.embedded.length,trace:r.trace?.length||0},tier:RENDER.tier,width:canvas.width,height:canvas.height};}''')
  frames=data.pop('frames');intervals=[b[0]-a[0] for a,b in zip(frames,frames[1:])]
  elapsed=(frames[-1][0]-frames[0][0])/1000 if len(frames)>1 else 0
  row={'mode':mode,'quality':quality,'seconds':elapsed,'frames':len(frames),'averageFPS':len(intervals)/elapsed if elapsed else 0,'medianFrameMs':statistics.median(intervals) if intervals else None,'p95FrameMs':sorted(intervals)[int(len(intervals)*.95)] if intervals else None,'medianRenderCpuMs':statistics.median(f[1] for f in frames) if frames else None,**data}
  row['passed']=elapsed>=19 and len(frames)>300 and data['phase']=='playing' and not data['errors'] and data['gl']==0 and data['pools']['sparks']<=90 and data['pools']['tracers']<=12 and data['pools']['embedded']<=30 and data['pools']['trace']<=8000 and (data.get('checkpoints',0)>0 if mode=='race' else data['shots']>3)
  profiles.append(row);print(('PASS ' if row['passed'] else 'FAIL ')+mode+'/'+quality+f" {row['averageFPS']:.2f} FPS, p95 {row['p95FrameMs']:.2f} ms",flush=True)
  page.screenshot(path=str(PREVIEW/f'club-{mode}-live-{quality}.png'));ctx.close()
 browser.close()
report={'sha256':hashlib.sha256((ROOT/'arcade.html').read_bytes()).hexdigest(),'passed':all(r['passed'] for r in profiles) and not errors,'profiles':profiles,'errors':errors,'scope':'20 wall-clock seconds per profile after warm-up, desktop Chrome WebGL at 1280x800 DPR1, photo effect. Normal requestAnimationFrame loop; control driver steers, aims, fires or charges through production physics. Average FPS counts actual rendered frame intervals. CPU measures render submission only, not GPU time. These are not physical-phone or thermal measurements.'}
(OUT/'arcade-live.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
raise SystemExit(0 if report['passed'] else 1)
