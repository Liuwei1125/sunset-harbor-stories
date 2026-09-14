/* Fixed-step arcade simulation. UI and rendering never advance scoring clocks. */
function clubNewRun(){
 if(CLUB.playlist==='daily'&&CLUB.dailyDate!==clubDate()){CLUB.level=clubHash(clubDate()+CLUB.mode)%6;clubBuildWorld();}
 const def=CLUB_LEVELS[CLUB.mode][CLUB.level],d=clubConfiguredDiff(),daily=CLUB.playlist==='daily';CLUB.seed=clubHash(`${CLUB.mode}:${CLUB.level}:${daily?clubDate():Date.now()}`);
 const r={def:{...def},difficulty:{...d},key:`${CLUB.mode}:${CLUB.level}:${d.id}:${daily?'daily-'+clubDate():CLUB.playlist}`,elapsed:0,countdown:3,cooldown:0,score:0,shots:0,hits:0,combo:0,maxCombo:0,aim:0,charge:0,charging:false,holdTime:0,releaseAnim:0,pos:V(),tracers:[],sparks:[],embedded:[],targets:[],projectile:null};
 CLUB.run=r;CLUB.look={yaw:0,pitch:0};ARMORY8.shot=null;ARMORY8.reloading=null;state.reload=0;state.t=CLUB.time;state.started=true;state.paused=false;state.dead=false;
 if(CLUB.mode==='race'){
  const q=clubTrackAt(CLUB.track,0),c={pos:{...q.pos},yaw:q.yaw,pitch:q.pitch,roll:0,speed:0,lateral:0,steer:0,steerVisual:0,wheel:0,hp:100,kind:'sport',color:CLUB_SKINS[CLUB.save.settings.skin].color};
  Object.assign(r,{car:c,tune:CLUB.save.settings.tune,nextGate:1,checkpoints:0,lap:1,lapStart:0,lapTimes:[],lastS:0,progress:0,penalty:0,collisions:0,bumpAt:-1,nitro:100,drift:0,skids:[],trace:[],ghost:CLUB.save.ghosts[r.key]||null,rivals:[],rank:4,wet:daily&&(CLUB.seed%3===0)});
  for(let i=0;i<3;i++){const s=7+i*6,q=clubTrackAt(CLUB.track,s,(i-1)*2.8);r.rivals.push({id:i,pos:q.pos,yaw:q.yaw,pitch:q.pitch,speed:0,progress:s,pace:def.pace*d.ai*(1+i*.045),lane:(i-1)*2.8,currentLane:(i-1)*2.8,color:['#9abbba','#d89d78','#bec68c'][i],kind:'sport',wheel:0,steerVisual:0,hp:100,braking:false,roll:0});}
 }else if(CLUB.mode==='shooting'){
  const w=CLUB_WEAPONS[CLUB.save.settings.weapon];Object.assign(r,{weapon:CLUB.save.settings.weapon,ammo:w.mag,reload:0,kick:0,flash:0,missed:0,fouls:0,spawnAt:0,duration:def.duration*d.time,wave:1});state.weapon=w.id;
  for(let i=0;i<5;i++){const distance=def.mixed?[12,22,40,30,16][i]:def.distance+(i%2)*3;const t={id:i,x:(i-2)*2.0,baseX:(i-2)*2.0,y:0,z:-distance,scale:d.size*(def.mixed&&distance>30?1.5:1),active:false,fold:1,until:0,friend:false,phase:i*1.7};r.targets.push(t);}
  clubSpawnTarget();CLUB.look.pitch=-.032;
 }else if(CLUB.mode==='darts'){
  Object.assign(r,{throws:0,turn:[],turnStart:parseInt(def.rule)||0,remaining:parseInt(def.rule)||0,around:1,round:1,completedSets:0,bankedScore:0,aiWins:0,aiRemaining:501,aiAt:0,aiTurn:false,aiThrows:0,aiTurnStart:501,aiLast:[],bestTurn:0,history:[],lastDart:null,limit:Math.ceil(def.throws*d.time),busts:0});
  CLUB.look.pitch=.055;
 }else{
  Object.assign(r,{throws:0,limit:def.arrows,baseWind:(CLUB.seed%2?1:-1)*def.wind*d.wind,wind:0,windPhase:clubRandom()*TAU,round:1,history:[],tens:0});r.wind=r.baseWind;
  const distances=def.mixed?[15,30,45]:[def.distance];for(let i=0;i<distances.length;i++)r.targets.push({id:i,x:def.mixed?(i-1)*3:0,baseX:def.mixed?(i-1)*3:0,y:1.4,z:-distances[i],radius:.61*d.size,phase:i*2});r.activeTarget=0;
  CLUB.look.yaw=Math.atan2(-r.targets[0].x,-r.targets[0].z);CLUB.look.pitch=.01;
 }
 CLUB.phase='countdown';clubClearInput();clubEvent('start',{mode:CLUB.mode,level:CLUB.level,playlist:CLUB.playlist,difficulty:d.id});clubUpdateGameUI();
}
function clubImpact(p,color='#efd49a',count=8){const r=CLUB.run;for(let i=0;i<count;i++)r.sparks.push({pos:{...p},vel:V((clubRandom()-.5)*2.3,clubRandom()*1.8,(clubRandom()-.5)*2),life:.25+clubRandom()*.3,size:.013+clubRandom()*.014,color});if(r.sparks.length>90)r.sparks.splice(0,r.sparks.length-90);CLUB.hitUntil=CLUB.time+.13;}
function clubStep(dt){
 if(CLUB.phase==='paused'||CLUB.phase==='result')return;CLUB.time+=dt;state.t=CLUB.time;
 const r=CLUB.run;if(CLUB.phase==='lobby'||!r)return;
 if(CLUB.phase==='countdown'){const old=Math.ceil(r.countdown);r.countdown-=dt;if(Math.ceil(r.countdown)<old)tone(r.countdown<=0?900:480,.07,.07,'triangle',r.countdown<=0?1200:480);if(r.countdown<=0){CLUB.phase='playing';clubEvent('go');clubMessage(CLUB.mode==='race'?'GO / 全速出发':'开始挑战',1);}return;}
 if(CLUB.phase!=='playing')return;r.elapsed+=dt;r.cooldown=Math.max(0,r.cooldown-dt);r.releaseAnim=Math.max(0,r.releaseAnim-dt*4);
 r.aim=mix(r.aim,CLUB.held.has('secondary')?1:0,1-Math.exp(-dt*11));
 if(CLUB.held.has('lookLeft'))CLUB.look.yaw+=dt*.85;if(CLUB.held.has('lookRight'))CLUB.look.yaw-=dt*.85;
 if(CLUB.held.has('lookUp'))CLUB.look.pitch+=dt*.60;if(CLUB.held.has('lookDown'))CLUB.look.pitch-=dt*.60;
 CLUB.look.pitch=clamp(CLUB.look.pitch,-.7,.8);if(CLUB.mode==='race')CLUB.look.yaw=clamp(CLUB.look.yaw,-1.1,1.1);
 if(CLUB.mode==='race')clubRaceStep(dt);else if(CLUB.mode==='shooting')clubShootingStep(dt);else clubThrowingStep(dt);
 for(const t of r.tracers)t.life-=dt;r.tracers=r.tracers.filter(t=>t.life>0).slice(-12);
 for(const p of r.sparks){p.vel.y-=dt*4;p.pos=add(p.pos,mul(p.vel,dt));p.life-=dt;}r.sparks=r.sparks.filter(p=>p.life>0);
 if(audio){audio.eg.gain.setTargetAtTime(CLUB.mode==='race'?Math.min(.042,Math.abs(r.car.speed)*.001):0,audio.ctx.currentTime,.05);if(CLUB.mode==='race')audio.engine.frequency.setTargetAtTime(42+Math.abs(r.car.speed)*3.1,audio.ctx.currentTime,.04);}
}
function clubRaceStep(dt){
 const r=CLUB.run,c=r.car,track=CLUB.track,tune=CLUB_TUNES[r.tune],prev={...c.pos},near=clubTrackNearest(track,c.pos);
 const gas=CLUB.held.has('action')?1:Math.max(0,-CLUB.touch.y),brake=CLUB.held.has('secondary')?1:Math.max(0,CLUB.touch.y),steer=clamp((CLUB.held.has('left')?1:0)-(CLUB.held.has('right')?1:0)-CLUB.touch.steer,-1,1),hand=CLUB.held.has('handbrake'),nitro=CLUB.held.has('nitro')&&gas>0&&r.nitro>.1&&c.speed>4;
 c.steer=mix(c.steer,steer,1-Math.exp(-dt*7));c.steerVisual=c.steer*.44;
 const off=near.distance>track.width*.48,grip=tune.grip*(r.wet?.84:1)*(off?.56:1)*(hand?.18:1),drag=.0045*c.speed*Math.abs(c.speed)+1.1+(off?Math.abs(c.speed)*.9:0);
 c.speed+=((gas*tune.accel+(nitro?tune.nitro:0))*(1-Math.max(0,c.speed)/(tune.max+(nitro?17:0))*.34)-drag*Math.sign(c.speed)-brake*23*(c.speed>0?1:-.12)-(hand?c.speed*.55:0))*dt;c.speed=clamp(c.speed,-5,tune.max+(nitro?17:0));if(gas===0&&Math.abs(c.speed)<.09)c.speed=0;
 const yawRate=c.steer*(.28+Math.abs(c.speed)*.026)*clamp(c.speed/5,-1,1)*(hand?1.55:1)/(1+Math.max(0,Math.abs(c.speed)-27)*.026);
 c.yaw+=yawRate*dt;c.lateral+=(yawRate*c.speed*.39-c.lateral*grip)*dt;
 const velocity=add(mul(forward(c.yaw),c.speed),mul(right(c.yaw),c.lateral));c.pos=add(c.pos,mul(velocity,dt));
 const post=clubTrackNearest(track,c.pos);c.pos.y=mix(c.pos.y,post.pos.y,1-Math.exp(-dt*14));c.pitch=lerpAngle(c.pitch,post.pitch,1-Math.exp(-dt*7));c.roll=mix(c.roll,-c.steer*Math.abs(c.speed)*.0008,dt*8);c.wheel+=c.speed*dt*2;
 if(nitro)r.nitro=Math.max(0,r.nitro-dt*22);else r.nitro=Math.min(100,r.nitro+dt*(hand&&c.speed>9?13:4));
 if(hand&&c.speed>8&&Math.abs(c.lateral)>.3){r.drift+=dt*Math.abs(c.lateral)*3;if(r.skids.length<90&&Math.floor(r.elapsed*30)!==Math.floor((r.elapsed-dt)*30))for(const s of [-1,1])r.skids.push({a:add(prev,add(mul(right(c.yaw),s*.7),V(0,.13,0))),b:add(c.pos,add(mul(right(c.yaw),s*.7),V(0,.13,0))),life:5});}
 for(const s of r.skids)s.life-=dt;r.skids=r.skids.filter(s=>s.life>0).slice(-90);
 if(post.distance>track.width/2+.8){const inward=norm(sub(post.pos,c.pos));c.pos=add(post.pos,mul(inward,-(track.width/2+.65)));c.speed*=Math.exp(-dt*4);c.lateral*=.85;if(r.elapsed>r.bumpAt){r.collisions++;r.penalty+=.8;r.bumpAt=r.elapsed+.7;clubMessage('护栏碰撞 · +0.8 秒',.75);tone(80,.1,.08,'triangle',40);}}
 for(const a of r.rivals){
  const ahead=clubTrackAt(track,a.progress+12),far=clubTrackAt(track,a.progress+32),bend=Math.abs(Math.atan2(Math.sin(far.yaw-ahead.yaw),Math.cos(far.yaw-ahead.yaw))),desired=a.pace*clamp(1.22-bend*.65,.61,1.2);
  const close=dist2(a.pos,c.pos)<11,avoid=close&&Math.abs(a.currentLane-post.side)<2.8;
  const wantedLane=avoid?(post.side>=0?-1:1)*track.width*.29:a.lane+Math.sin(a.progress*.018+a.id)*.45;a.currentLane=mix(a.currentLane,wantedLane,dt*(close?2.5:1.1));
  a.speed=mix(a.speed,desired,dt*.9);a.progress+=a.speed*dt;const q=clubTrackAt(track,a.progress,a.currentLane);a.pos=q.pos;a.yaw=q.yaw;a.pitch=q.pitch;a.wheel+=a.speed*dt*2;a.steerVisual=clamp(far.yaw-a.yaw,-.4,.4);
  if(dist2(a.pos,c.pos)<2.05&&r.elapsed>r.bumpAt){c.speed*=.86;a.speed*=.88;c.pos=add(c.pos,mul(norm(sub(c.pos,a.pos)),.7));r.bumpAt=r.elapsed+.7;r.collisions++;r.penalty+=.5;clubMessage('擦碰 · 保持车距',.75);tone(95,.1,.08,'triangle',45);}
 }
 const gate=clubTrackAt(track,r.nextGate*track.length/12),dir=forward(gate.yaw),before=dot(sub(prev,gate.pos),dir),after=dot(sub(c.pos,gate.pos),dir);
 if(before<0&&after>=0&&dist2(c.pos,gate.pos)<track.width/2+2&&c.speed>0){
  r.checkpoints++;r.nextGate=(r.nextGate+1)%12;clubEvent('checkpoint',{checkpoint:r.checkpoints});tone(550,.055,.05,'triangle',740);
  if(r.checkpoints%12===0){const lapTime=r.elapsed-r.lapStart;r.lapTimes.push(lapTime);r.lapTimes=r.lapTimes.slice(-50);r.lapStart=r.elapsed;r.lap++;clubMessage(`完成第 ${r.lap-1} 圈 · ${clubFormatTime(lapTime)}`,2);}
 }
 const laps=Math.floor(r.checkpoints/12);let progress=laps*track.length+post.s;if(r.nextGate===0&&post.s<track.length*.1)progress= (laps+1)*track.length+post.s;
 r.progress=progress;r.rank=1+r.rivals.filter(a=>a.progress>progress).length;
 if(r.trace.length<8000&&r.elapsed>=r.trace.length*.1)r.trace.push([+(r.trace.length*.1).toFixed(1),c.pos.x,c.pos.y,c.pos.z,c.yaw]);
 if(CLUB.playlist!=='endless'&&r.checkpoints>=r.def.laps*12){const time=r.elapsed+r.penalty,medal=r.rank===1?3:r.rank===2?2:1;clubAward(true,time,medal,[[r.rank+' / 4','最终名次'],[clubFormatTime(Math.min(...r.lapTimes)),'最佳单圈'],[r.collisions+' 次','碰撞'],[r.penalty.toFixed(1)+' 秒','罚时']]);}
 if(CLUB.playlist!=='endless'&&r.elapsed>track.length*r.def.laps/5*clubDiff().time+90)clubAward(false,r.elapsed+r.penalty,0,[['时间用尽','可随时重试'],[r.checkpoints+' / '+r.def.laps*12,'通过检查点']]);
}
function clubRaceReset(){const r=CLUB.run;if(!r||CLUB.mode!=='race')return;const q=clubTrackAt(CLUB.track,((r.nextGate+11)%12)*CLUB.track.length/12+2);r.car.pos=q.pos;r.car.yaw=q.yaw;r.car.speed=0;r.car.lateral=0;r.car.pitch=q.pitch;r.car.steer=0;r.penalty+=3;CLUB.look={yaw:0,pitch:0};clubMessage('回到上一检查点 · +3 秒');clubEvent('recover');}
function clubSpawnTarget(){
 const r=CLUB.run,inactive=r.targets.filter(t=>!t.active&&t.fold>.9);if(!inactive.length)return;const t=inactive[Math.floor(clubRandom()*inactive.length)],diff=clubDiff();t.active=true;t.friend=r.def.friends&&clubRandom()<.24;t.until=r.elapsed+r.def.window*diff.time;t.scale=diff.size*(r.def.mixed&&-t.z>30?1.5:1);r.spawnAt=r.elapsed+(CLUB.level===0?2.3:1.1)*diff.time;clubEvent('target-up',{id:t.id,friend:t.friend});
}
function clubShootingStep(dt){
 const r=CLUB.run,w=CLUB_WEAPONS[r.weapon];r.kick*=Math.exp(-dt*14);r.flash=Math.max(0,r.flash-dt);state.reload=Math.max(0,r.reload);state.reloadTotal=w.reload;
 const move=V((CLUB.held.has('right')?1:0)-(CLUB.held.has('left')?1:0)+CLUB.touch.x,0,(CLUB.held.has('back')?1:0)-(CLUB.held.has('forward')?1:0)+CLUB.touch.y);if(length(move)>1)Object.assign(move,norm(move));const delta=bx(basis(CLUB.look.yaw),mul(move,dt*(CLUB.held.has('breath')?4.5:2.5)));r.pos.x=clamp(r.pos.x+delta.x,-5.5,5.5);r.pos.z=clamp(r.pos.z+delta.z,-4,4);
 if(r.reload>0){r.reload=Math.max(0,r.reload-dt);state.reload=r.reload;if(r.reload===0){r.ammo=w.mag;ARMORY8.reloading=null;tone(520,.06,.055,'triangle',680);clubEvent('reload-complete');}}
 for(const t of r.targets){if(r.def.moving)t.x=t.baseX+Math.sin(r.elapsed*(.55+(CLUB.level*.06))* (clubDiff().id==='expert'?1.3:1)+t.phase)*1.15;t.fold=mix(t.fold,t.active?0:1,1-Math.exp(-dt*13));if(t.active&&r.elapsed>t.until){t.active=false;if(!t.friend){r.missed++;r.combo=0;}else{r.score+=15;clubMessage('正确辨识 +15',.7);}}}
 if(r.elapsed>r.spawnAt)clubSpawnTarget();if(CLUB.held.has('action'))clubFire();
 if(CLUB.playlist!=='endless'&&r.hits>=r.def.quota){const accuracy=r.hits/Math.max(1,r.shots),quality=accuracy-.06*r.fouls,medal=quality>=.82?3:quality>=.58?2:1;clubAward(true,r.score,medal,[[Math.round(accuracy*100)+'%','命中率'],[r.maxCombo+' 连','最高连击'],[r.fouls+' 次','禁射靶误击'],[clubFormatTime(r.elapsed),'完成时间']]);}
 if(CLUB.playlist!=='endless'&&r.elapsed>=r.duration)clubAward(false,r.score,0,[[r.hits+' / '+r.def.quota,'命中靶数'],[Math.round(r.hits/Math.max(1,r.shots)*100)+'%','命中率']]);
 if(CLUB.playlist==='endless'&&r.hits>=r.wave*15){r.wave++;r.def.window=Math.max(1.4,r.def.window*.93);clubMessage(`第 ${r.wave} 波 · 靶标节奏提升`,2);}
}
function clubReload(){const r=CLUB.run;if(CLUB.mode!=='shooting'||CLUB.phase!=='playing'||r.reload>0)return;const w=CLUB_WEAPONS[r.weapon];if(r.ammo===w.mag)return;r.reload=w.reload;state.reload=w.reload;state.reloadTotal=w.reload;ARMORY8.reloading={index:w.id,start:CLUB.time,duration:w.reload};clubEvent('reload');tone(420,.06,.05,'triangle',210);}
function clubFire(){
 const r=CLUB.run;if(CLUB.phase!=='playing'||CLUB.mode!=='shooting'||r.reload>0||r.cooldown>0)return;
 const w=CLUB_WEAPONS[r.weapon];if(!r.ammo){clubReload();return;}clubCamera();r.ammo--;r.shots++;r.cooldown=w.delay;r.flash=.047;state.weapon=w.id;ARMORY8.shot={index:w.id,time:CLUB.time};
 const sway=clubDiff().sway*.002*(r.aim>.5?.35:1),dir=norm(add(cam.dir,V((clubRandom()-.5)*sway, (clubRandom()-.5)*sway,0)));let best=null,min=Infinity;
 for(const t of r.targets){if(!t.active||t.fold>.25)continue;const dz=t.z+.09*t.scale-cam.eye.z;if(dir.z>=-.01)continue;const distance=dz/dir.z;if(distance<=0||distance>min)continue;const p=add(cam.eye,mul(dir,distance)),dx=p.x-t.x,dy=p.y-(t.y+1.24*t.scale),rad=.285*t.scale,hit=Math.hypot(dx,dy);if(hit<=rad){best={target:t,p,ring:hit/rad};min=distance;}}
 const endpoint=best?best.p:add(cam.eye,mul(dir,65));r.tracers.push({a:add(cam.eye,bx(basis(CLUB.look.yaw,CLUB.look.pitch),V(.13,-.12,-.8))),b:endpoint,life:.045});
 if(best){const t=best.target;t.active=false;clubImpact(best.p,t.friend?'#7fdcdb':'#edd7a7');if(t.friend){r.fouls++;r.score=Math.max(0,r.score-100);r.combo=0;clubMessage('禁射靶 −100 · 青色灯请等待',1.6);tone(150,.16,.09,'triangle',70);}else{r.hits++;r.combo++;r.maxCombo=Math.max(r.combo,r.maxCombo);const points=Math.round((best.ring<.23?150:100)*(1+Math.min(10,r.combo-1)*.08));r.score+=points;clubMessage(`${best.ring<.23?'中心命中':'命中'} +${points}${r.combo>1?' / '+r.combo+' 连':''}`, .8);tone(best.ring<.23?1200:850,.055,.055,'triangle',620);}clubEvent('hit',{target:t.id,friend:t.friend,ring:best.ring,score:r.score});}
 else{r.combo=0;clubEvent('miss');}
 r.kick+=w.kick;CLUB.look.pitch=clamp(CLUB.look.pitch+w.kick*(r.aim>.5?.45:1),-.7,.8);gunSound8(weapons[w.id]);
}
const CLUB_DART_ORDER=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
function clubDartScore(x,y){
 const radius=Math.hypot(x,y);if(radius>.170)return {score:0,number:0,multiplier:0,label:'脱靶',double:false};if(radius<=.00635)return {score:50,number:25,multiplier:2,label:'内靶心 50',double:true};if(radius<=.0159)return {score:25,number:25,multiplier:1,label:'外靶心 25',double:false};
 const angle=((Math.atan2(x,y)+TAU+PI/20)%TAU),sector=Math.floor(angle/(TAU/20))%20,number=CLUB_DART_ORDER[sector];let multiplier=1;if(radius>=.162)multiplier=2;else if(radius>=.099&&radius<=.107)multiplier=3;
 return {score:number*multiplier,number,multiplier,label:(multiplier===3?'T':multiplier===2?'D':'')+number,double:multiplier===2};
}
function clubCheckout(remaining,darts=3,double=true){
 if(!Number.isInteger(remaining)||remaining<2&&double||remaining<1)return null;const all=[];for(let i=20;i>=1;i--){all.push({score:i*3,label:'T'+i,double:false},{score:i*2,label:'D'+i,double:true},{score:i,label:String(i),double:false});}all.unshift({score:50,label:'BULL',double:true},{score:25,label:'25',double:false});
 function search(n,left){for(const v of all)if(v.score===n&&(!double||v.double))return [v.label];if(left===1)return null;for(const v of all){if(n-v.score<(double?2:1))continue;const next=search(n-v.score,left-1);if(next)return [v.label,...next];}return null;}return remaining>180?null:search(remaining,Math.max(1,darts));
}
function clubDartApply(hit){
 const r=CLUB.run,d=r.def;r.throws++;r.shots++;r.lastDart=hit;r.turn.push(hit);r.history.push(hit.label);r.history=r.history.slice(-12);if(hit.score>0)r.hits++;
 let bust=false,won=false;
 if(d.rule==='301'||d.rule==='501'){
  const next=r.remaining-hit.score;if(next<0||(d.double&&next===1)||(next===0&&d.double&&!hit.double)){bust=true;r.remaining=r.turnStart;r.busts++;clubMessage('爆镖 · 本轮得分作废，回到 '+r.remaining,2);tone(150,.13,.07,'triangle',85);}
  else{r.remaining=next;r.score=r.bankedScore+d.goal-next;won=next===0;clubMessage(`${hit.label} · 剩余 ${next}`,1.5);}
 }else if(d.rule==='around'){
  if(hit.number===r.around){r.around++;r.score=r.bankedScore+r.around-1;clubMessage(`命中 ${hit.number} · 下一个 ${r.around>10?'完成':r.around}`,1.5);}else clubMessage(`${hit.label} · 目标数字 ${r.around}`,1.5);won=r.around>10;
 }else{const points=hit.score*(d.rule==='triple'&&hit.multiplier===3?2:1);r.score+=points;clubMessage(hit.label+(points?' +'+points:''),1.5);}
 if(bust)r.score=r.bankedScore+d.goal-r.remaining;
 clubEvent('dart',{...hit,remaining:r.remaining,turn:r.turn.length,bust,won});
 if(won&&CLUB.playlist!=='endless'){r.bestTurn=Math.max(r.bestTurn,r.turn.reduce((s,h)=>s+h.score,0));const pace=r.throws/(d.rule==='around'?30:Math.ceil(d.throws*clubDiff().time));clubAward(true,r.throws,pace<.45?3:pace<.72?2:1,[[r.throws+' 镖','完成用镖'],[r.bestTurn+' 分','最佳轮分'],[r.busts+' 次','爆镖'],[r.def.opponent?r.aiRemaining+' 分':'—','对手剩余']]);return;}
 const turnEnded=r.turn.length===3||bust;
 if(turnEnded){r.bestTurn=Math.max(r.bestTurn,bust?0:r.turn.reduce((s,h)=>s+h.score,0));r.turn=[];r.turnStart=r.remaining;r.round++;r.cooldown=1.5;if(d.opponent){r.aiTurn=true;r.aiAt=r.elapsed+1.5;r.aiThrows=0;r.aiTurnStart=r.aiRemaining;r.aiLast=[];}}
 if(CLUB.playlist==='endless'&&won){r.completedSets++;r.bankedScore+=d.goal;r.score=r.bankedScore;r.remaining=d.goal;r.turnStart=d.goal;r.around=1;r.bestTurn=Math.max(r.bestTurn,r.turn.reduce((s,h)=>s+h.score,0));r.turn=[];if(!turnEnded)r.round++;r.cooldown=1.5;r.aiRemaining=501;r.aiTurnStart=501;r.aiTurn=false;r.aiThrows=0;clubMessage('完成第 '+r.completedSets+' 局 · 新的一局开始',2);}
 if(CLUB.playlist!=='endless'&&r.throws>=r.limit){const goal=d.goal*(clubDiff().id==='casual'?.7:clubDiff().id==='expert'?1.15:1),success=['score','triple'].includes(d.rule)&&r.score>=goal,medal=r.score>=goal*1.65?3:r.score>=goal*1.2?2:1;clubAward(success,clubLowerIsBetter()?r.throws:r.score,medal,[[r.throws+' 镖','投掷次数'],[r.bestTurn+' 分','最佳轮分'],[Math.round(r.hits/r.shots*100)+'%','上靶率'],[d.double?'双倍收尾':d.rule==='around'?'数字 1—10':'累计得分','本关规则']]);}
}
function clubDartAI(){
 const r=CLUB.run;if(!r.aiTurn||r.elapsed<r.aiAt)return;let target={number:20,multiplier:3},route=clubCheckout(r.aiRemaining,3-r.aiThrows,true);
 if(route){const label=route[0];target=label==='BULL'?{number:25,multiplier:2}:label==='25'?{number:25,multiplier:1}:{number:parseInt(label.replace(/[TD]/,'')),multiplier:label[0]==='T'?3:label[0]==='D'?2:1};}
 const skill=clubDiff().id==='casual'?.22:clubDiff().id==='sport'?.48:.68;if(clubRandom()>skill){target.multiplier=1;if(clubRandom()>.65)target.number=[1,5,12,18][Math.floor(clubRandom()*4)];}
 const hit={score:target.number*target.multiplier,double:target.multiplier===2,label:(target.multiplier===3?'T':target.multiplier===2?'D':'')+target.number},next=r.aiRemaining-hit.score,bust=next<0||next===1||(next===0&&!hit.double);r.aiThrows++;r.aiLast.push(hit.label);
 if(bust){r.aiRemaining=r.aiTurnStart;r.aiThrows=3;r.aiLast.push('爆镖');}else r.aiRemaining=next;
 clubMessage(`对手：${r.aiLast.join(' / ')}\n剩余 ${r.aiRemaining}`,1.4);clubEvent('ai-dart',{remaining:r.aiRemaining,hit:hit.label,bust});
 if(r.aiRemaining===0&&CLUB.playlist!=='endless'){clubAward(false,r.throws,0,[[r.remaining+' 分','你的剩余'],['0 分','对手完成'],[r.bestTurn+' 分','最佳轮分']]);return;}
 if(r.aiRemaining===0){r.aiWins++;r.bankedScore+=r.def.goal-r.remaining;r.score=r.bankedScore;r.remaining=r.turnStart=r.def.goal;r.turn=[];r.aiRemaining=501;r.aiThrows=3;clubMessage('对手完成一局 · 双方重新开始',2);}
 if(r.aiThrows>=3){r.aiTurn=false;r.cooldown=1.1;}else r.aiAt=r.elapsed+1.15;
}
function clubStartCharge(){
 const r=CLUB.run;if(!r||CLUB.phase!=='playing'||!['darts','archery'].includes(CLUB.mode)||r.projectile||r.cooldown>0||r.aiTurn)return;r.charging=true;r.charge=0;r.holdTime=0;clubEvent('draw-start');
}
function clubLaunchProfile(charge,angles=CLUB.look,direction=cam.dir){
 const r=CLUB.run,archery=CLUB.mode==='archery',speed=archery?20+42*charge:8.5+5*charge,gravity=archery?9.81:7.2,base=basis(angles.yaw,angles.pitch);
 // The projectile starts at the visible equipment tip. Its zero-gravity line
 // converges with the sight at the current target plane, as a sighted bow does.
 const local=archery?V(-.25,-.14,-1.3466+charge*.22):add(V(.105,-.10,-.60+charge*.10),bx(basis(.35,.15,.1),V(0,0,-.068*1.4)));
 const origin=add(cam.eye,bx(base,local)),target=archery?r.targets[r.activeTarget]:null,plane=archery?target.z+.055*target.radius/.61:-2.37;
 const distance=(plane-cam.eye.z)/(direction.z||-.001),aim=add(cam.eye,mul(direction,Math.max(.5,distance))),dir=norm(sub(aim,origin));
 return {origin,dir,speed,gravity,wind:archery?r.wind:0,plane,target};
}
function clubReleaseCharge(){
 const r=CLUB.run;if(!r?.charging)return;r.charging=false;if(CLUB.phase!=='playing'){r.charge=0;return;}if(r.charge<.12){r.charge=0;return;}
 clubCamera();const archery=CLUB.mode==='archery',{origin,dir,speed,gravity,wind}=clubLaunchProfile(r.charge);
 r.projectile={pos:origin,prev:{...origin},vel:mul(dir,speed),gravity,wind,age:0,charge:r.charge};r.releaseAnim=1;r.cooldown=archery?.9:.7;clubEvent('release',{charge:r.charge,speed,wind,dir,origin});tone(archery?175:440,archery?.12:.055,.09,'triangle',archery?610:160);r.charge=0;
}
function clubArcheryScore(radius,hitDistance){if(hitDistance>radius+1e-9)return 0;return clamp(Math.ceil(10-hitDistance/(radius/10)+1e-9),1,10);}
function clubArcheryApply(points,target,p,vel){
 const r=CLUB.run;r.throws++;r.shots++;r.hits+=points>0?1:0;r.score+=points;r.tens+=points===10?1:0;r.history.push(points);r.history=r.history.slice(-15);
 if(points>0&&target){const index=r.targets.indexOf(target);r.embedded.push({kind:'archery',target:index,local:sub(sub(p,mul(norm(vel),.396)),V(target.x,target.y,target.z)),rotation:clubProjectileBasis(vel)});if(r.embedded.length>30)r.embedded.shift();clubImpact(p,points===10?'#f9d482':'#d6d5ab',6);}
 clubMessage(points?points===10?'十环！ / PERFECT 10':points+' 环':'脱靶 · 调整仰角与风偏',1.8);clubEvent('arrow',{points,target:r.targets.indexOf(target),pos:p,score:r.score});tone(points===10?1080:points?680:170,.11,.08,'triangle',points?480:85);
 if(r.def.mixed)r.activeTarget=(r.activeTarget+1)%r.targets.length;
 const goal=r.def.goal*(clubDiff().id==='casual'?.75:clubDiff().id==='expert'?1.15:1);
 if(CLUB.playlist!=='endless'&&r.throws>=r.limit){const success=r.score>=goal,ratio=r.score/(r.limit*10);clubAward(success,r.score,ratio>=.85?3:ratio>=.65?2:1,[[r.tens+' 支','十环'],[Math.round(r.hits/r.shots*100)+'%','上靶率'],[(r.score/r.shots).toFixed(1)+' 环','平均环数'],[r.def.distance+' 米','基准距离']]);}
 if(CLUB.playlist==='endless'&&r.throws%6===0){r.round++;r.baseWind=(clubRandom()*2-1)*Math.min(2.6,.4+r.round*.22)*clubDiff().wind;r.wind=r.baseWind;clubMessage(`第 ${r.round} 组 · 新风况 ${Math.abs(r.wind).toFixed(1)} m/s`,2);}
}
function clubThrowingStep(dt){
 const r=CLUB.run;if(CLUB.mode==='darts')clubDartAI();else{r.wind=r.baseWind*(.82+.18*Math.sin(r.elapsed*.23+r.windPhase));for(const t of r.targets){if(r.def.moving)t.x=t.baseX+Math.sin(r.elapsed*.48+t.phase)*.8;}}
 if(r.charging){r.holdTime+=dt;r.charge=Math.min(1,r.holdTime/(CLUB.mode==='archery'?1.2:.8));}
 if(!r.projectile)return;const p=r.projectile;p.age+=dt;p.prev={...p.pos};p.vel.y-=p.gravity*dt;p.vel.x+=p.wind*dt*.75;p.pos=add(p.pos,mul(p.vel,dt));
 if(CLUB.mode==='darts'){
  const plane=-2.37;if(p.prev.z>plane&&p.pos.z<=plane){const a=(plane-p.prev.z)/(p.pos.z-p.prev.z),hit=add(p.prev,mul(sub(p.pos,p.prev),a)),score=clubDartScore(hit.x,hit.y-1.73);if(Math.hypot(hit.x,hit.y-1.73)<.237){r.embedded.push({kind:'darts',pos:add(hit,V(0,0,.063)),rotation:clubProjectileBasis(p.vel)});if(r.embedded.length>9)r.embedded.shift();clubImpact(hit,score.score?'#e9d39d':'#b2bba1',4);}r.projectile=null;clubDartApply(score);return;}
 }else{
  const target=r.targets[r.activeTarget],plane=target.z+.055*target.radius/.61;
  if(p.prev.z>plane&&p.pos.z<=plane){const a=(plane-p.prev.z)/(p.pos.z-p.prev.z),hit=add(p.prev,mul(sub(p.pos,p.prev),a)),distance=Math.hypot(hit.x-target.x,hit.y-target.y),points=clubArcheryScore(target.radius,distance);r.projectile=null;clubArcheryApply(points,target,hit,p.vel);return;}
 }
 if(p.pos.y<-.06||p.age>5||p.pos.z>3){r.projectile=null;if(CLUB.mode==='darts')clubDartApply(clubDartScore(1,1));else clubArcheryApply(0,null,p.pos,p.vel);}
}
function clubPredictedImpact(){
 const r=CLUB.run;if(!r||!['darts','archery'].includes(CLUB.mode)||!CLUB.save.settings.assist||clubDiff().id==='expert')return null;
 const arc=CLUB.mode==='archery',target=arc?r.targets[r.activeTarget]:{x:0,y:1.73,z:-2.37,radius:.17},charge=r.charging?r.charge:1,{origin,dir,speed,gravity,wind,plane}=clubLaunchProfile(charge);
 const time=(plane-origin.z)/(dir.z*speed);if(time<=0||time>5)return null;const p=add(origin,mul(dir,speed*time));p.y-=gravity*time*(time+1/120)/2;p.x+=wind*.75*time*(time+1/120)/2;
 return {pos:p,target,screen:project(p,cam.vp),distance:Math.hypot(p.x-target.x,p.y-target.y),score:arc?clubArcheryScore(target.radius,Math.hypot(p.x-target.x,p.y-target.y)):clubDartScore(p.x,p.y-target.y).score};
}
function clubBank(){
 const r=CLUB.run;if(CLUB.phase!=='playing'||CLUB.playlist!=='endless')return;if(r.elapsed<3){clubMessage('先体验几秒，再记录这次成绩');return;}
 const score=CLUB.mode==='race'?Math.round(r.progress):r.score,medal=CLUB.mode==='race'?Math.floor(r.checkpoints/12)>=3?3:Math.floor(r.checkpoints/12)>=1?2:1:score>800?3:score>180?2:1;
 clubAward(true,score,medal,[[clubFormatTime(r.elapsed),'练习时长'],[CLUB.mode==='race'?Math.floor(r.checkpoints/12)+' 圈':r.shots+' 次','完成练习'],[CLUB.mode==='shooting'?r.wave+' 波':CLUB.mode==='archery'?r.round+' 组':'自由挑战','练习进度']]);
}
