import {createSimulation} from '../src/games/simulation.js';
import {V,PI,clamp,basis,bx,sub} from '../src/core/math.js';
import {trackAt,trackNearest} from '../src/core/track.js';
import {DART_ORDER,checkout} from '../src/games/darts.js';
// Fixed-clock verification: controls only, never inject position, hit, score or result.
export function createPilot(sim){
 const session=sim.state,mode=session.mode;let cam=sim.camera();
 function clubCamera(){cam=sim.camera();}
 const r=session.run,dt=1/120;
 const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
 function aimAt(p,speed,gravity=0,wind=0,moving=null){
  clubCamera();const origin=cam.eye;let t=Math.hypot(p.x-origin.x,p.z-origin.z)/speed;
  for(let i=0;i<6;i++){const target={...p};if(moving)target.x=moving(t);const dx=target.x-origin.x-wind*.75*t*(t+dt)/2,dy=target.y-origin.y+gravity*t*(t+dt)/2,dz=target.z-origin.z;const yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(dy,Math.hypot(dx,dz));if(i===5){const sensitivity=(mode==='darts'?.00045:mode==='archery'?.0009:.0018)*session.save.settings.sensitivity*(1-r.aim*.55);sim.look((session.look.yaw-yaw)/sensitivity,(session.look.pitch-pitch)/sensitivity);}if(gravity){const launch=sim.launchProfile(1,{yaw,pitch},bx(basis(yaw,pitch),V(0,0,-1)));t=(launch.plane-launch.origin.z)/(launch.dir.z*speed);}else t=Math.hypot(dx,dz)/(speed*Math.cos(pitch));}
 }
 function dartAim(){
  let number=20,multiplier=3;if(r.def.rule==='around'){number=r.around;multiplier=1;}else if(['301','501'].includes(r.def.rule)){
   const route=checkout(r.remaining,3-r.turn.length,r.def.double);if(route){const label=route[0];number=label==='BULL'?25:parseInt(label.replace(/[TD]/,''));multiplier=label==='BULL'?2:label[0]==='T'?3:label[0]==='D'?2:1;}
  }
  const sector=DART_ORDER.indexOf(number),rad=number===25?multiplier===2?0:.010:multiplier===3?.103:multiplier===2?.166:.060,a=sector*PI/10;
  aimAt(V(number===25?0:Math.sin(a)*rad,1.73+(number===25?rad:Math.cos(a)*rad),-2.37),13.5,7.2);
 }
 return function control(){
  if(session.phase==='playing'){
   if(mode==='race'){
    const c=r.car,track=session.track,near=trackNearest(track,c.pos),lookahead=8+Math.abs(c.speed)*.42,target=trackAt(track,near.s+lookahead),far=trackAt(track,near.s+lookahead+16),desired=Math.atan2(-(target.pos.x-c.pos.x),-(target.pos.z-c.pos.z)),err=wrap(desired-c.yaw),bend=Math.abs(wrap(far.yaw-near.yaw));
    const speedGoal=clamp(30-bend*15,13,30),yawRate=2*c.speed*Math.sin(err)/lookahead,steer=clamp(yawRate*(1+Math.max(0,Math.abs(c.speed)-27)*.026)/(.28+Math.abs(c.speed)*.026),-1,1);sim.axis(-steer);
    sim.hold('action',c.speed<speedGoal+.2);sim.hold('secondary',c.speed>speedGoal+1.5);sim.hold('nitro',false);
   }else if(mode==='shooting'){
    const target=r.targets.find(t=>t.active&&!t.friend&&t.fold<.20);if(target&&r.cooldown===0&&r.reload===0){aimAt(V(target.x,target.y+1.24*target.scale,target.z+.09*target.scale),10000);sim.hold('action',true);}else sim.hold('action',false);
   }else if(!r.projectile&&r.cooldown<=0&&!r.aiTurn){
    if(!r.charging)sim.hold('action',true);if(mode==='darts')dartAim();else{const t=r.targets[r.activeTarget],position=V(t.x,t.y,t.z+.055*t.radius/.61),moving=r.def.moving?time=>t.baseX+Math.sin((r.elapsed+time)*.48+t.phase)*.8:null;aimAt(position,62,9.81,r.wind,moving);}
    sim.hold('breath',true);if(r.charge>=1)sim.hold('action',false);
   }
  }
 };
}

export function drive(mode,level,difficulty,options={}){
 const sim=options.sim||createSimulation({mode,level,playlist:options.playlist||'levels',settings:{difficulty},seed:731,day:options.day||'2026-09-11'});if(!options.sim||sim.state.phase==='lobby')sim.start();const session=sim.state,r=session.run,dt=1/120,control=createPilot(sim);let steps=0;const limit=options.seconds||360;
 while(session.phase!=='result'&&steps++<limit/dt){control();sim.step(dt);if(options.onStep&&steps%(options.renderEvery||120)===0)options.onStep(sim,steps);}

 const out={mode,level,difficulty,phase:session.phase,success:session.result?.success||false,result:session.result,elapsed:r.elapsed,steps,score:r.score,shots:r.shots,hits:r.hits,remaining:r.remaining,throws:r.throws,checkpoints:r.checkpoints,rank:r.rank,collisions:r.collisions,limits:{projectiles:r.projectile?1:0,embedded:r.embedded.length,sparks:r.sparks.length,trace:r.trace?.length},events:session.events.slice(-12)};
 return {...out,sim};
};
