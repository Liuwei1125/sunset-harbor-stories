/* V6 campaign, fair perception and locomotion. All balance is fictional arcade play. */
const ROUTES6={road:{cn:'\u516c\u8def',en:'ROAD RUNNER',medium:'land',kind:'sport',desc:'\u7075\u6d3b\u9a7e\u9a76 / \u5c0f\u5df7\u7ed5\u884c'},sea:{cn:'\u6c34\u8def',en:'SILENT TIDE',medium:'sea',kind:'speedboat',desc:'\u7801\u5934\u767b\u9646 / \u6d77\u6e7e\u64a4\u79bb'},air:{cn:'\u7a7a\u8fd0',en:'SKY COURIER',medium:'air',kind:'heli',desc:'\u76f4\u5347\u673a\u8d77\u964d / \u822a\u7a7a\u8fd0\u8f93'}};
const STAGES6={approach:'\u524d\u5f80\u5317\u6e2f',terminal:'\u5173\u95ed\u8b66\u62a5\u7ec8\u7aef',recover:'\u56de\u6536\u4ed3\u5e93\u8d27\u7269',extract:'\u8fd4\u56de\u57fa\u5730\u4ea4\u4ed8'};
function spawnPortGuards6(){
 combat.units.length=0;combat.center={...HARBOR6.port};
 for(const [role,x,z,yaw]of [['rifle',117,276,0],['rifle',145,247,PI],['marksman',102,229,PI/2],['rifle',124,230,0]]){
  const u=spawnCombatUnit(role,V(x,x===102?4.2:.24,z));u.pos=V(x,x===102?4.2:.24,z);u.home={...u.pos};u.prevPos={...u.pos};u.yaw=yaw;u.prevYaw=yaw;u.homeYaw=yaw;u.senseAt=state.t+Math.random()*.18;u.suspicion=0;u.lastKnown=null;u.alertUntil=0;u.mode='PATROL';u.staticPost=role==='marksman';u.phaseSeed=combat.units.length*1.7;
 }
}
function resetHarborFleet6(){spawnHarborVehicles6();for(const c of cars.filter(c=>c.harborKind)){const p=c.harborKind==='heli'?HARBOR6.heliStart:c.harborKind==='speedboat'?HARBOR6.piers[0].boat:c.harborKind==='sport'?HARBOR6.roadStart:V(115,.24,336);Object.assign(c,{pos:{...p},prevPos:{...p},yaw:0,prevYaw:0,hp:100,speed:0,vel:V(),throttle:0,airborne:false,destroyed:false,hidden:false,ai:null});}}
function startHarbor6(route='road',difficulty='easy'){
 if(!ROUTES6[route])return false;
 if(contract||expeditionJob||combat.job){toast('\u8bf7\u5148\u7ed3\u675f\u5f53\u524d\u884c\u52a8');return false;}
 if(regionId!=='coast')loadRegionSync('coast');
 clearCombatEncounter();resetHarborFleet6();experience.result=null;experience.action=null;experience.crouching=false;
 experience.mission={id:'harbor-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),route,stage:'approach',difficulty:difficulty==='normal'?'normal':'easy',elapsed:0,hold:0,cargo:100,carrying:false,terminal:false,used:[],lastMedium:ROUTES6[route].medium,detected:0,quiet:0,kills:0,checkpoint:'approach',scoreStart:combat.score.kills,damage:0};
 experience.director={phase:'calm',until:0,lastDamage:-30,lastAlarm:-30,reinforced:false};
 Object.assign(player,{pos:{...HARBOR6.base},prevPos:{...HARBOR6.base},hp:100,armor:50,jump:0,vy:0,yaw:0});
 Object.assign(state,{car:null,transition:null,dead:false,heat:0,reload:0,nextShot:0});wanted.phase='CLEAR';wanted.lastSeen=-100;fullCombatSupply();combat.difficulty=difficulty;state.weapon=3;
 experience.walkSpeed=0;cam.yaw=0;cam.pitch=-.14;cam.eye=add(player.pos,V(1,3,8));cam.prevEye={...cam.eye};cam.lastLook=state.t;
 spawnPortGuards6();closeExperiencePanel6();closeCombatPanel();closePanel();closeExpeditionPanel();clearTouchInput();keys.clear();startGame();syncCraftUI();
 recordEvent6('campaign-start',{route,difficulty});saveProgress();toast('\u4e09\u6761\u8def\u7ebf\uff0c\u540c\u4e00\u4e2a\u76ee\u6807 / '+ROUTES6[route].en);return true;
}
function harborTarget6(){const m=experience.mission;if(!m)return HARBOR6.base;
 if(m.stage==='approach'){
  if(!m.used.length){const c=cars.find(c=>c.harborKind===ROUTES6[m.route].kind);return c?.pos||HARBOR6.base;}
  const medium=state.car?.medium||m.lastMedium;return medium==='sea'?HARBOR6.piers[1].boat:medium==='air'?HARBOR6.heliPort:V(102,.24,285);
 }
 if(m.stage==='terminal')return HARBOR6.terminal;if(m.stage==='recover')return HARBOR6.cargo;
 const medium=state.car?.medium||m.lastMedium;return medium==='sea'?HARBOR6.piers[0].boat:medium==='air'?HARBOR6.heliStart:HARBOR6.landExit;
}
function missionInteract6(){const m=experience.mission;if(!m||state.car)return null;
 const q=m.stage==='terminal'?HARBOR6.terminal:m.stage==='recover'?HARBOR6.cargo:null;
 if(q&&dist2(player.pos,q)<2.6&&Math.abs(player.pos.y-q.y)<1.8)return {point:q,verb:m.stage==='terminal'?'\u6309\u4f4f E \u5173\u95ed\u7ec8\u7aef':'\u6309\u4f4f E \u56de\u6536\u8d27\u7269',seconds:m.stage==='terminal'?2.1:3.4};return null;
}
function setHarborStage6(stage){const m=experience.mission;if(!m)return;m.stage=stage;m.hold=0;m.checkpoint=stage;recordEvent6('campaign-stage',{stage,route:m.route,elapsed:m.elapsed});saveProgress();toast(STAGES6[stage]);}
function finishHarbor6(success,reason=''){
 const m=experience.mission;if(!m)return;
 const kills=combat.score.kills-m.scoreStart,quietBonus=m.detected<1?900:0,base=success?Math.round(2800*m.cargo/100)+quietBonus+350*m.used.length:0;
 let payout=0;if(success&&!experience.progress.ledger.includes(m.id)){
  experience.progress.ledger.push(m.id);if(experience.progress.ledger.length>100)experience.progress.ledger.shift();payout=base;state.cash+=base;profile.earned+=base;experience.progress.wins++;experience.progress.best=experience.progress.best===null?m.elapsed:Math.min(m.elapsed,experience.progress.best);
  experience.progress.routes=Array.from(new Set(experience.progress.routes.concat(m.used)));experience.progress.portUnlocked=true;experience.progress.helipadUnlocked=experience.progress.routes.includes('air');
 }
 experience.result={success,reason,payout,route:m.route,used:m.used.slice(),cargo:Math.round(m.cargo),seconds:+m.elapsed.toFixed(1),kills,quiet:m.detected<1,checkpoint:m.checkpoint};
 recordEvent6(success?'campaign-success':'campaign-failed',{...experience.result});experience.mission=null;experience.input.interact=false;
 for(const e of combat.units)e.alive=false;combat.projectiles.length=0;combat.fires.length=0;state.heat=0;wanted.phase='CLEAR';wanted.lastSeen=-100;
 saveProgress();showDebrief6();
}
function updateHarbor6(dt){
 const m=experience.mission;if(!m){
  if(regionId==='coast'&&experience.progress.portUnlocked&&state.t>(experience.nextService||0)&&[HARBOR6.base,HARBOR6.port].some(p=>dist2(player.pos,p)<5)&&(!state.car||Math.abs(state.car.speed)<1)){
   experience.nextService=state.t+12;player.hp=Math.min(100,player.hp+20);player.armor=Math.min(50,player.armor+10);if(state.car)state.car.hp=Math.min(100,state.car.hp+20);
  }return;
 }
 m.elapsed+=dt;if(state.dead||player.hp<=0)return finishHarbor6(false,'\u884c\u52a8\u4e2d\u65ad');if(m.cargo<=0)return finishHarbor6(false,'\u8d27\u7269\u635f\u6bc1');
 if(state.car){m.lastMedium=state.car.medium;if(!m.used.includes(m.lastMedium)){m.used.push(m.lastMedium);recordEvent6('transport-boarded',{medium:m.lastMedium,kind:state.car.kind});}}
 const threat=combat.units.some(e=>e.alive&&e.canSee&&dist2(e.pos,player.pos)<85);m.quiet=threat?0:m.quiet+dt;if(threat){m.detected+=dt;experience.director.lastAlarm=state.t;}
 if(m.stage==='approach'&&m.used.length&&player.pos.z<301&&player.pos.z>185&&player.pos.x>68&&player.pos.x<204&&player.pos.y<22)setHarborStage6('terminal');
 const interact=missionInteract6();if(interact){
  const using=experience.input.interact||keys.has('KeyE');m.hold=using&&!player.moving&&!mouse.left&&!touch.fire?Math.min(interact.seconds,m.hold+dt):Math.max(0,m.hold-dt*1.4);
  if(m.hold>=interact.seconds){if(m.stage==='terminal'){m.terminal=true;setHarborStage6('recover');recordEvent6('alarm-disabled');}else{m.carrying=true;setHarborStage6('extract');recordEvent6('cargo-recovered');}}
 }else if(m.stage!=='extract')m.hold=Math.max(0,m.hold-dt*2);
 if(m.stage==='extract'){
  const target=harborTarget6(),c=state.car,landed=!c||c.medium==='land'||c.medium==='sea'||(!c.airborne&&c.pos.y<ground(c.pos)+1);
  const ready=dist2(player.pos,target)<9&&landed&&(!c||Math.abs(c.speed)<1.8)&&m.quiet>5;
  m.hold=ready?m.hold+dt:0;if(m.hold>2.2)return finishHarbor6(true);
 }
 updateDirector6(dt);
}
function updateDirector6(dt){const d=experience.director,m=experience.mission;if(!m)return;
 const busy=combat.units.filter(e=>e.alive&&e.canSee).length;
 d.phase=busy>=2?'pressure':state.t-d.lastDamage<3?'pressure':m.detected===0?'calm':m.quiet>8?'recover':'search';
 if(!d.reinforced&&!m.terminal&&m.detected>9&&m.elapsed>22&&m.quiet<2){
  const points=[V(150,.24,212),V(144,.24,203)];
  if(points.every(p=>dist2(p,player.pos)>30&&!lineClear(add(p,V(0,1.5,0)),cam.eye))){
   for(const p of points){const e=spawnCombatUnit('rifle',p);e.home={...p};e.lastKnown=V(Math.round(player.pos.x/12)*12,.24,Math.round(player.pos.z/12)*12);e.alertUntil=state.t+10;e.mode='INVESTIGATE';}d.reinforced=true;toast('\u6e2f\u53e3\u589e\u63f4\u62b5\u8fbe / \u5148\u5173\u95ed\u7ec8\u7aef\u53ef\u907f\u514d');recordEvent6('port-reinforcements');
  }
 }
}
function hearNoise6(p,radius){
 experience.noise.push({pos:V(Math.round(p.x/8)*8,p.y,Math.round(p.z/8)*8),until:state.t+1.4,radius});if(experience.noise.length>12)experience.noise.shift();
 for(const e of combat.units){if(!e.alive||dist2(e.pos,p)>radius||e.canSee)continue;e.lastKnown=V(Math.round(p.x/8)*8,ground(p),Math.round(p.z/8)*8);e.alertUntil=state.t+8;e.mode='INVESTIGATE';e.pathAt=0;}
}
function walkable6(p,r=.50){
 if(waterAt(p))return false;
 for(const b of [...nearbyObstacles(p,r+1),...combat.covers]){if((p.y||0)+1.7<(b.miny||0)||(p.y||0)>(b.h||0)+.08)continue;if(p.x>b.minx-r&&p.x<b.maxx+r&&p.z>b.minz-r&&p.z<b.maxz+r)return false;}
 return true;
}
function segmentWalkable6(a,b){const d=dist2(a,b),steps=Math.max(1,Math.ceil(d/1.1));for(let i=1;i<=steps;i++){const q=V(mix(a.x,b.x,i/steps),a.y,mix(a.z,b.z,i/steps));if(!walkable6(q))return false;}return true;}
function localPath6(from,to){
 if(segmentWalkable6(from,to))return [{...to}];
 const cell=2.7,N=37,ox=from.x-18*cell,oz=from.z-18*cell,start=18*N+18;
 const gx=clamp(Math.round((to.x-ox)/cell),0,N-1),gz=clamp(Math.round((to.z-oz)/cell),0,N-1),end=gz*N+gx;
 const score=new Float32Array(N*N).fill(Infinity),parent=new Int32Array(N*N).fill(-1),closed=new Uint8Array(N*N),open=[start];score[start]=0;
 const point=id=>V(ox+(id%N)*cell,from.y,oz+Math.floor(id/N)*cell),h=id=>Math.hypot(id%N-gx,Math.floor(id/N)-gz);let best=start,iter=0;
 while(open.length&&iter++<440){let bi=0;for(let i=1;i<open.length;i++)if(score[open[i]]+h(open[i])<score[open[bi]]+h(open[bi]))bi=i;const id=open.splice(bi,1)[0];if(closed[id])continue;closed[id]=1;if(h(id)<h(best))best=id;if(id===end){best=id;break;}
  const x=id%N,z=Math.floor(id/N);for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
   const nx=x+dx,nz=z+dz;if(nx<0||nz<0||nx>=N||nz>=N)continue;const ni=nz*N+nx;if(closed[ni])continue;const p=point(ni);if(!walkable6(p)||!segmentWalkable6(point(id),p))continue;
   const fireCost=combat.fires.some(f=>dist2(f.pos,p)<f.radius+1)?24:0,c=score[id]+Math.hypot(dx,dz)+fireCost;if(c<score[ni]){score[ni]=c;parent[ni]=id;open.push(ni);}
  }
 }
 const path=[];for(let id=best;id!==start&&id>=0;id=parent[id]){path.push(point(id));if(path.length>120)break;}path.reverse();if(best===end&&segmentWalkable6(path.at(-1)||from,to))path.push({...to});return path;
}
function moveUnit6(e,goal,dt,speed){
 if(e.staticPost){e.moving=false;return;}
 if(!e.path||state.t>(e.pathAt||0)||!e.pathGoal||dist2(e.pathGoal,goal)>4){e.path=localPath6(e.pos,goal);e.pathGoal={...goal};e.pathAt=state.t+.85+(Number(e.id.replace(/\D/g,''))%5)*.07;}
 const next=e.path[0]||goal;const d=dist2(e.pos,next);if(d<.6){e.path.shift();e.moving=false;return;}
 const dx=(next.x-e.pos.x)/d,dz=(next.z-e.pos.z)/d,p=add(e.pos,V(dx*speed*dt,0,dz*speed*dt));resolveXZ(p,.44,false);
 if(waterAt(p)){e.moving=false;e.path=[];return;}const moved=dist2(e.pos,p);e.moving=moved>.002;p.y=ground(p);e.pos=p;e.phase+=moved*5.4;
 if(!e.canSee)e.yaw=lerpAngle(e.yaw,Math.atan2(-dx,-dz),1-Math.exp(-dt*5));
}
function selectCover6(e,target){let best=null,bestScore=Infinity;const boxes=[...nearbyObstacles(e.pos,18),...combat.covers];
 for(const b of boxes){if((b.h||0)<.8||(b.h||0)>4||(b.miny||0)>e.pos.y+1)continue;const cx=(b.minx+b.maxx)/2,cz=(b.minz+b.maxz)/2,away=norm(V(cx-target.x,0,cz-target.z)),r=Math.max(b.maxx-b.minx,b.maxz-b.minz)/2;
  const p=V(cx+away.x*(r+1.1),e.pos.y,cz+away.z*(r+1.1)),d=dist2(e.pos,p);if(d>20||d<1||!walkable6(p)||lineClear(add(p,V(0,.98,0)),target))continue;
  const score=d+(segmentWalkable6(e.pos,p)?0:8);if(score<bestScore){bestScore=score;best=p;}
 }return best;}
function updateUnits6(dt){
 const target=visibleTarget(),easy=combat.difficulty==='easy',factor=easy?.48:1;
 if(state.t>experience.slotAt){experience.slotAt=state.t+.6;const list=combat.units.filter(e=>e.alive&&e.canSee&&e.reload<=0).sort((a,b)=>(dist2(a.pos,target)+Math.sin(state.t*.25+Number(a.id.replace(/\D/g,'')))*12)-(dist2(b.pos,target)+Math.sin(state.t*.25+Number(b.id.replace(/\D/g,'')))*12));experience.attackSlots=new Set(list.slice(0,easy?1:2).map(e=>e.id));}
 for(const e of combat.units){if(!e.alive)continue;const def=ENEMY_TYPES[e.role],distance=dist2(e.pos,target);e.flash=Math.max(0,(e.flash||0)-dt);if(distance>240){e.moving=false;continue;}
  if(state.t>=(e.senseAt||0)){
   e.senseAt=state.t+.18;const raw=perception6(e,target,def.range * (experience.crouching && !state.car ? .8 : 1));
   e.suspicion=clamp((e.suspicion||0)+(raw?(experience.crouching?.25:.55):-.33),0,1);
   const canSee=raw&&(e.suspicion>.55||e.mode==='ENGAGE'||distance<5);
   if(canSee){if(!e.canSee)e.firstShotAt=state.t+(e.role==='marksman'?1.05:.72);e.lastKnown={...player.pos};e.alertUntil=state.t+9;e.mode=e.reload>0?'RELOAD':'ENGAGE';}
   else if(e.canSee){e.mode='SEARCH';e.pathAt=0;}e.canSee=canSee;
   const fire=combat.fires.find(f=>dist2(f.pos,e.pos)<f.radius+1.0);
   if(fire){const away=norm(sub(e.pos,fire.pos));e.evadeGoal=add(e.pos,mul(length(away)>.01?away:V(1,0,0),7));e.evadeUntil=state.t+1.2;e.pathAt=0;}
  }
  if(state.t<(e.evadeUntil||0)){e.mode='EVADE';moveUnit6(e,e.evadeGoal,dt,def.speed*1.5);continue;}
  if(e.reload>0){e.reload-=dt;e.mode='RELOAD';if(state.t>(e.coverAt||0)){e.coverAt=state.t+1;e.coverGoal=selectCover6(e,target);}if(e.coverGoal)moveUnit6(e,e.coverGoal,dt,def.speed);if(e.reload<=0){e.ammo=def.mag;e.reload=0;e.coverGoal=null;}continue;}
  if(e.canSee){
   const dir=sub(target,e.pos);e.yaw=lerpAngle(e.yaw,Math.atan2(-dir.x,-dir.z),1-Math.exp(-dt*7));
   if(distance>def.range*.58)moveUnit6(e,target,dt,def.speed);else if(e.role==='rifle'&&distance>10){const side=Math.sin(state.t*.35+e.phase*.1)>0?1:-1;moveUnit6(e,add(e.pos,mul(right(e.yaw),side*4)),dt,.8);}else e.moving=false;
   if(experience.attackSlots.has(e.id)&&state.t>=(e.shotAt||0)&&state.t>=(e.firstShotAt||0)){
    if(e.role==='marksman'&&!(e.windupUntil>0)){e.windupUntil=state.t+.65;}
    if(e.role!=='marksman'||state.t>=e.windupUntil){
     const o=add(unitChest(e),mul(forward(e.yaw),.6)),scatter=def.spread*(easy?1.8:1)*(touch.enabled?1.25:1),d=norm(add(norm(sub(target,o)),V((Math.random()-.5)*scatter,(Math.random()-.5)*scatter,(Math.random()-.5)*scatter)));
     if(lineClear(o,target)&&projectileCapacity6('bullet')){const p=spawnProjectile('bullet',o,mul(d,e.role==='marksman'?110:82),{team:'enemy',damage:def.damage*factor});if(p){e.ammo--;e.shotUntil=state.t+.08;spatialSound(o,210,.055,.025,'triangle',70);}}
     e.shotAt=state.t+def.interval/(easy?.68:1);e.windupUntil=0;if(e.ammo<=0)e.reload=def.reload;
    }
   }
  }else if(state.t<e.alertUntil&&e.lastKnown){e.mode=e.mode==='INVESTIGATE'?'INVESTIGATE':'SEARCH';moveUnit6(e,e.lastKnown,dt,def.speed*.80);if(dist2(e.pos,e.lastKnown)<2){e.yaw+=dt*.7;e.moving=false;}}
  else {e.mode='PATROL';e.windupUntil=0;const phase=state.t*.15+(e.phaseSeed||0),goal=add(e.home,V(Math.sin(phase)*2.5,0,Math.cos(phase)*2));moveUnit6(e,goal,dt,def.speed*.32);if(e.staticPost)e.yaw=(e.homeYaw||0)+Math.sin(state.t*.35)*.5;}
  if(state.car?.medium==='land'&&Math.abs(state.car.speed)>6&&dist2(e.pos,state.car.pos)<2.2){damageUnit(e,100);state.car.speed*=.85;}
 }
}
function updateWalker6(dt){
 if(state.transition){updateCarTransition(dt);return;}
 if(experience.action?.type==='vault'){
  const a=experience.action;a.time+=dt;const t=clamp(a.time/.62,0,1);player.pos=V(mix(a.from.x,a.to.x,t),mix(a.from.y,a.to.y,t)+Math.sin(t*PI)*.80,mix(a.from.z,a.to.z,t));player.jump=0;player.vy=0;player.moving=false;if(t>=1){player.pos={...a.to};experience.action=null;}return;
 }
 const crouch=experience.input.crouch||keys.has('ControlLeft')||keys.has('ControlRight');experience.crouching=crouch;
 const z=clamp((keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0)+touch.y,-1,1),x=clamp((keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+touch.x,-1,1);
 let move=add(mul(forward(cam.yaw),z),mul(right(cam.yaw),x));const strength=Math.min(1,length(move));const sprint=!crouch&&!isAiming()&&(keys.has('ShiftLeft')||keys.has('ShiftRight')||touch.boost);
 const desired=(crouch?2.0:isAiming()?3.0:sprint?7.8:4.9)*strength;
 experience.walkSpeed=mix(experience.walkSpeed,desired,1-Math.exp(-dt*(desired>experience.walkSpeed?8:15)));experience.runBlend=mix(experience.runBlend,sprint?1:0,1-Math.exp(-dt*7));
 const old={...player.pos};if(strength>.01)experience.moveDir=norm(move);
 if(experience.walkSpeed>.03&&experience.moveDir){const p=add(player.pos,mul(experience.moveDir,experience.walkSpeed*dt));resolveXZ(p,.36);player.pos.x=p.x;player.pos.z=p.z;}
 const moved=dist2(old,player.pos);player.moving=moved>.001;experience.movement=mix(experience.movement,player.moving?Math.min(1,experience.walkSpeed/4.9):0,1-Math.exp(-dt*9));
 if(moved>.001){player.phase+=moved*(sprint?3.2:5.1);if(!isAiming()&&!mouse.left&&!touch.fire)player.yaw=lerpAngle(player.yaw,Math.atan2(-(player.pos.x-old.x),-(player.pos.z-old.z)),1-Math.exp(-dt*12));else player.yaw=cam.yaw;}
 else if(isAiming()||mouse.left||touch.fire)player.yaw=lerpAngle(player.yaw,cam.yaw,1-Math.exp(-dt*15));
 if(player.jump>0||player.vy>0){player.vy-=18*dt;player.jump+=player.vy*dt;if(player.jump<0){player.jump=0;player.vy=0;}}
 const h=ground(player.pos);player.pos.y=h+player.jump;
 if(waterAt(player.pos)){player.pos.y=-.60;player.swimming=true;experience.walkSpeed=Math.min(2.2,experience.walkSpeed);}else player.swimming=false;
 if(player.moving&&state.t>effects.footAt&&player.jump<.05){effects.footAt=state.t+(crouch?.48:sprint?.25:.35);spatialSound(player.pos,inHarbor6(player.pos)?160:190,.045,crouch?.007:.018,'triangle',60);if(sprint)hearNoise6(player.pos,10);}
}
function tryVault6(){
 if(state.car||state.transition||player.jump>.05||experience.action)return false;
 const dir=forward(cam.yaw),ahead=add(player.pos,mul(dir,1.0));const b=[...nearbyObstacles(ahead,1.4),...combat.covers].find(b=>b.h>player.pos.y+.4&&b.h<player.pos.y+1.28&&ahead.x>b.minx-.3&&ahead.x<b.maxx+.3&&ahead.z>b.minz-.3&&ahead.z<b.maxz+.3);
 if(!b)return false;const width=Math.max(b.maxx-b.minx,b.maxz-b.minz);if(width>3.5)return false;
 const target=add(player.pos,mul(dir,Math.min(3.8,width+1.7)));target.y=ground(target);if(!walkable6(target,.4))return false;
 experience.action={type:'vault',time:0,from:{...player.pos},to:target};experience.walkSpeed=0;player.yaw=cam.yaw;recordEvent6('vault');return true;
}
function ikJoint6(a,c,len1,len2,pole){const d=sub(c,a),l=clamp(length(d),.001,len1+len2-.001),dir=norm(d),along=(len1*len1-len2*len2+l*l)/(2*l),bend=Math.sqrt(Math.max(0,len1*len1-along*along));let ort=sub(pole,mul(dir,dot(pole,dir)));ort=norm(ort);return add(add(a,mul(dir,along)),mul(ort,bend));}
function drawHumanoid6(b,p,yaw,phase,wi=0,options={}){
 const enemy=options.enemy,civil=options.civil,def=enemy?ENEMY_TYPES[enemy.role]:null;
 const moving=enemy?(enemy.moving?1:0):civil?1:experience.movement,run=enemy?0:experience.runBlend,crouch=enemy?(enemy.mode==='COVER'?.30:0):civil?0:experience.crouching?.34:0;
 const vault=!enemy&&!civil&&experience.action?.type==='vault'?Math.sin(clamp(experience.action.time/.62,0,1)*PI):0;
 const bob=Math.abs(Math.sin(phase))*moving*.030+Math.sin(state.t*1.7)*.005;
 const coat=enemy?(enemy.flash>0?'#edd7a9':def.color):civil?'#6a9991':'#bd754e',pants=enemy?'#334b56':'#284c5e',skin=enemy?'#9f927b':'#c69574',belt='#213c48';
 const death=options.dying?ease8(0,.55,options.deathAge):0,flinch=enemy&&!options.dying?Math.max(0,(enemy.flinchUntil||0)-state.t)/.22*(enemy.flinchSize||0):0;
 b.transform(add(p,V(0,bob+(options.dying?.09-Math.max(0,options.deathAge-2.8)*.32:0),0)),yaw,flinch,death*1.50);
 const hipY=.94-crouch-vault*.10,bodyY=1.25-crouch;
 b.put('torso',coat,0,bodyY,-run*.045,.64,.65,.40,0,run*.09);
 softBox(b,belt,0,hipY-.02,0,.57,.14,.34);b.put('cyl',skin,0,1.62-crouch,0,.19,.18,.19);
 const headYaw=enemy||civil?0:clamp(Math.atan2(Math.sin(cam.yaw-yaw),Math.cos(cam.yaw-yaw)),-.6,.6);
 b.put('sphere',skin,0,1.86-crouch,-.005,.38,.44,.35,headYaw);
 b.put('sphere',enemy?'#354e56':'#283e44',0,2.035-crouch,.025,.395,.20,.365,headYaw);
 b.box('#243946',0,1.88-crouch,-.177,.285,.071,.034,headYaw);b.box('#566f73',0,1.904-crouch,-.20,.205,.023,.009,headYaw);
 b.put('sphere',skin,-.192,1.87-crouch,0,.075,.12,.08);b.put('sphere',skin,.192,1.87-crouch,0,.075,.12,.08);
 if(!civil){softBox(b,'#254b54',0,bodyY-.015,-.229,.46,.43,.09);for(const s of [-1,1]){b.box('#8b9e8e',s*.15,bodyY-.1,-.289,.115,.16,.04);b.box('#4b625f',s*.24,bodyY+.1,.208,.07,.52,.045);}softBox(b,'#45605e',0,bodyY+.025,.23,.39,.48,.18);}
 for(const s of [-1,1]){
  const f=phase+(s>0?PI:0),swing=Math.sin(f),stride=(.25+run*.18)*moving,foot=V(s*.175,.10+Math.max(0,Math.cos(f))*.16*moving+vault*.35,-swing*stride-vault*.25),hip=V(s*.17,hipY,0),knee=ikJoint6(hip,foot,.47,.48,V(0,0,-1));
  capsule(b,pants,hip,knee,.21);capsule(b,pants,knee,foot,.175);softBox(b,'#1e333b',foot.x,foot.y-.018,foot.z-.085,.24,.16,.37);b.box('#6d7f77',foot.x,foot.y-.099,foot.z-.085,.25,.035,.38);
 }
 const gun=weaponPose8(p,yaw,phase,wi,{enemy,civil});let rightHand=gun.rightHand,leftHand=gun.leftHand;
 if(civil){rightHand=V(.30,.98,Math.sin(phase)*.24);leftHand=V(-.30,.98,-Math.sin(phase)*.24);}
 if(vault>0){rightHand=V(.32,1.0,-.58);leftHand=V(-.32,1.0,-.58);}
 for(const [s,hand]of [[1,rightHand],[-1,leftHand]]){const shoulder=V(s*.32,bodyY+.20,s<0&&!civil?-.10:0),elbow=ikJoint6(shoulder,hand,.42,.44,V(s,.1,.15));capsule(b,coat,shoulder,elbow,.20);capsule(b,coat,elbow,hand,.16);b.put('sphere',civil?skin:'#253e46',hand.x,hand.y,hand.z,.15,.13,.17);}
 const released=!enemy&&weapons[wi]?.throwable&&gun.action.age<.45;
 if(!civil&&vault<.2&&!released){const root=b.parent,org=b.origin;b.origin=add(org,bx(root,rightHand));b.parent=bmul(root,gun.localBasis);weaponModel(b,enemy?enemy.role==='marksman'?4:3:wi,gun.gripOffset.x,gun.gripOffset.y,gun.gripOffset.z,enemy);b.parent=root;b.origin=org;}
 b.world();
}
