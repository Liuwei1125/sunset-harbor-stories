/* QA drivers use the same control axes/aim state as input. Never place the car,
   score a hit, advance a checkpoint, or manufacture a result. */
window.clubQADrive=function(mode,level,difficulty,options={}){
 clubLobby();CLUB.mode=mode;CLUB.level=level;CLUB.save.settings.difficulty=difficulty;CLUB.playlist=options.playlist||'levels';clubBuildWorld();clubNewRun();
 const r=CLUB.run,dt=1/120;let steps=0,missedShots=0;const limit=options.seconds||360;
 const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
 function aimAt(p,speed,gravity=0,wind=0,moving=null){
  clubCamera();const origin=cam.eye;let t=Math.hypot(p.x-origin.x,p.z-origin.z)/speed;
  for(let i=0;i<6;i++){const target={...p};if(moving)target.x=moving(t);const dx=target.x-origin.x-wind*.75*t*(t+dt)/2,dy=target.y-origin.y+gravity*t*(t+dt)/2,dz=target.z-origin.z;CLUB.look.yaw=Math.atan2(-dx,-dz);CLUB.look.pitch=Math.atan2(dy,Math.hypot(dx,dz));if(gravity){const launch=clubLaunchProfile(1,CLUB.look,bx(basis(CLUB.look.yaw,CLUB.look.pitch),V(0,0,-1)));t=(launch.plane-launch.origin.z)/(launch.dir.z*speed);}else t=Math.hypot(dx,dz)/(speed*Math.cos(CLUB.look.pitch));}
 }
 function dartAim(){
  let number=20,multiplier=3;if(r.def.rule==='around'){number=r.around;multiplier=1;}else if(['301','501'].includes(r.def.rule)){
   const route=clubCheckout(r.remaining,3-r.turn.length,r.def.double);if(route){const label=route[0];number=label==='BULL'?25:parseInt(label.replace(/[TD]/,''));multiplier=label==='BULL'?2:label[0]==='T'?3:label[0]==='D'?2:1;}
  }
  const sector=CLUB_DART_ORDER.indexOf(number),rad=number===25?multiplier===2?0:.010:multiplier===3?.103:multiplier===2?.166:.060,a=sector*PI/10;
  aimAt(V(number===25?0:Math.sin(a)*rad,1.73+(number===25?rad:Math.cos(a)*rad),-2.37),13.5,7.2);
 }
 while(CLUB.phase!=='result'&&steps++<limit/dt){
  if(CLUB.phase==='playing'){
   if(mode==='race'){
    const c=r.car,track=CLUB.track,near=clubTrackNearest(track,c.pos),lookahead=8+Math.abs(c.speed)*.42,target=clubTrackAt(track,near.s+lookahead),far=clubTrackAt(track,near.s+lookahead+16),desired=Math.atan2(-(target.pos.x-c.pos.x),-(target.pos.z-c.pos.z)),err=wrap(desired-c.yaw),bend=Math.abs(wrap(far.yaw-near.yaw));
    const speedGoal=clamp(30-bend*15,13,30),yawRate=2*c.speed*Math.sin(err)/lookahead,steer=clamp(yawRate*(1+Math.max(0,Math.abs(c.speed)-27)*.026)/(.28+Math.abs(c.speed)*.026),-1,1);CLUB.touch.steer=-steer;
    clubHold('action',c.speed<speedGoal+.2);clubHold('secondary',c.speed>speedGoal+1.5);clubHold('nitro',false);
   }else if(mode==='shooting'){
    const target=r.targets.find(t=>t.active&&!t.friend&&t.fold<.20);if(target&&r.cooldown===0&&r.reload===0){aimAt(V(target.x,target.y+1.24*target.scale,target.z+.09*target.scale),10000);clubHold('action',true);}else clubHold('action',false);
   }else if(!r.projectile&&r.cooldown<=0&&!r.aiTurn){
    if(!r.charging)clubHold('action',true);if(mode==='darts')dartAim();else{const t=r.targets[r.activeTarget],position=V(t.x,t.y,t.z+.055*t.radius/.61),moving=r.def.moving?time=>t.baseX+Math.sin((r.elapsed+time)*.48+t.phase)*.8:null;aimAt(position,62,9.81,r.wind,moving);}
    clubHold('breath',true);if(r.charge>=1)clubHold('action',false);
   }
  }
  clubStep(dt);
 }
 const out={mode,level,difficulty,phase:CLUB.phase,success:CLUB.result?.success||false,result:CLUB.result,elapsed:r.elapsed,steps,score:r.score,shots:r.shots,hits:r.hits,remaining:r.remaining,throws:r.throws,checkpoints:r.checkpoints,rank:r.rank,collisions:r.collisions,limits:{projectiles:r.projectile?1:0,embedded:r.embedded.length,sparks:r.sparks.length,trace:r.trace?.length},events:CLUB.events.slice(-12)};
 clubRender();out.gl=renderer.gl.getError();return out;
};
