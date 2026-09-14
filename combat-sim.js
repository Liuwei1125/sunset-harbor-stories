/* V5 simulation. All values are deliberately arcade-game balance constants. */
const obstacleBefore5=obstacleHit,resolveBefore5=resolveXZ,lineClearBefore5=lineClear;
obstacleHit=function(o,d,max,ignore=null){const hit=obstacleBefore5(o,d,max,ignore);for(const b of combat.covers){const t=rayBox(o,d,b,hit.t);if(t<hit.t){hit.t=t;hit.type='wall';hit.object=b;}}return hit;};
lineClear=function(a,b){const dv=sub(b,a),len=length(dv);if(len<.001)return true;const dir=mul(dv,1/len);if(!lineClearBefore5(a,b))return false;return !combat.covers.some(c=>rayBox(a,dir,c,len)<len-.07);};
resolveXZ=function(p,r,withCars=true,ignore=null){let hit=resolveBefore5(p,r,withCars,ignore);for(const b of combat.covers){if(p.y>b.h+.10)continue;const x=clamp(p.x,b.minx,b.maxx),z=clamp(p.z,b.minz,b.maxz),dx=p.x-x,dz=p.z-z,len=Math.hypot(dx,dz);if(len>=r)continue;hit=true;if(len>.0001){p.x=x+dx/len*r;p.z=z+dz/len*r;}else{const edges=[[p.x-b.minx,'x',b.minx-r],[b.maxx-p.x,'x',b.maxx+r],[p.z-b.minz,'z',b.minz-r],[b.maxz-p.z,'z',b.maxz+r]].sort((a,b)=>a[0]-b[0]);p[edges[0][1]]=edges[0][2];}}return hit;};
function unitChest(e){return add(e.pos,V(0,e.mode==='COVER'?1.03:1.30,0));}
function visibleTarget(){return state.car?add(state.car.pos,V(0,1.15,0)):add(player.pos,V(0,1.32,0));}
function rayGround(o,d,max){if(max<=0)return Infinity;const steps=Math.min(40,Math.ceil(max/2));let last=0;for(let i=1;i<=steps;i++){const s=max*i/steps,p=add(o,mul(d,s));if(p.y<=ground(p)){let lo=last,hi=s;for(let j=0;j<7;j++){const m=(lo+hi)/2,q=add(o,mul(d,m));if(q.y>ground(q))lo=m;else hi=m;}return hi;}last=s;}return Infinity;}
function combatRay(o,d,max,includeWorld=true,ignore=null){let hit=includeWorld?obstacleHit(o,d,max,ignore):{t:max,type:'none',object:null};
 for(const e of combat.units){if(!e.alive)continue;const chest=unitChest(e),head=add(e.pos,V(0,e.mode==='COVER'?1.64:1.86,0));
  for(const [p,r,part]of [[head,.235,'head'],[chest,e.role==='heavy'?.48:.38,'body'],[add(e.pos,V(0,.63,0)),.36,'body']]){const t=raySphere(o,d,p,r);if(t<hit.t)hit={t,type:'soldier',object:e,part};}}
 for(const e of enemies){if(!e.alive)continue;const t=raySphere(o,d,e.pos,1.01);if(t<hit.t)hit={t,type:'enemy',object:e};}
 for(const j of combat.jets){if(!j.alive)continue;const t=raySphere(o,d,add(j.pos,V(0,1.1,0)),3.9);if(t<hit.t)hit={t,type:'jet',object:j};}
 return hit;
}
const assistedBefore5=assistedDirection;
assistedDirection=function(){if(scopeActive())return cam.dir;const prior=assistedBefore5();if(!touch.enabled||!touch.assist||!(touch.fire||touch.aim))return prior;let best=.994,found=null;for(const e of combat.units){if(!e.alive)continue;const p=unitChest(e),dv=sub(p,cam.eye),dir=norm(dv),v=dot(dir,cam.dir);if(v>best&&length(dv)<95&&lineClear(cam.eye,p)){best=v;found=dir;}}return found||prior;};
function showCombatHit(text,kill=false){combat.hitText=text;combat.hitUntil=state.t+.38;state.hit=state.t+.16;if(kill)tone(600,.12,.035,'triangle',920);}
function damageUnit(e,amount,part='body',source='player'){if(!e?.alive)return;const def=ENEMY_TYPES[e.role];let dmg=amount;if(part==='head')dmg*=e.role==='heavy'?1.7:2.4;else if(e.role==='heavy')dmg*=.78;
 e.hp=Math.max(0,e.hp-dmg);e.flash=.10;e.mode='ENGAGE';e.lastKnown=combatVec(player.pos);e.alertUntil=state.t+12;e.firstShotAt=Math.max(e.firstShotAt||0,state.t+.18);
 if(source==='player')showCombatHit(part==='head'?'HEADSHOT':'HIT');
 if(e.hp<=0){e.alive=false;e.deadAt=state.t;combat.score.kills++;if(part==='head')combat.score.headshots++;state.cash+=e.role==='heavy'?230:130;combat.loot.push({pos:combatVec(e.pos),life:35});spawnParticles(unitChest(e),'#d1c09e',8,2.5);if(combat.job){combat.job.kills++;combat.job.waveKills++;}showCombatHit('\u51fb\u8d25 '+def.name,true);}
}
function damageJet(j,amount){if(!j?.alive)return;j.hp=Math.max(0,j.hp-amount);j.evadeUntil=state.t+1.8;showCombatHit('AIR HIT');if(j.hp<=0){j.alive=false;combat.score.airKills++;state.cash+=300;if(combat.job?.type==='air'){combat.job.kills++;combat.job.waveKills++;}combatBurst(add(j.pos,V(0,1,0)),12);spawnParticles(j.pos,'#e9bb8b',18,12);showCombatHit('\u654c\u673a\u5df2\u51fb\u843d',true);}}
function hurtVehicle(c,amount){if(!c||c.hp<=0)return;c.hp=Math.max(0,c.hp-amount);if(c===state.car){state.damage=Math.min(.6,state.damage+.12);if(c.hp<=0){if(combat.job)finishCombat(false,'\u8f7d\u5177\u635f\u6bc1');if(c.medium==='air'||c.medium==='sea')recoverCraft(true);else explodeCar(c);}}else if(c.hp<=0)explodeCar(c);}
function applyCombatHit(hit,damage){if(hit.type==='soldier')damageUnit(hit.object,damage,hit.part);else if(hit.type==='jet')damageJet(hit.object,damage);else if(hit.type==='enemy'){hitEnemy(hit.object,damage);showCombatHit(hit.object.alive?'HIT':'DISABLED',!hit.object.alive);}else if(hit.type==='car'){hurtVehicle(hit.object,damage*.45);showCombatHit('IMPACT');}}
function combatBurst(p,radius){combat.bursts.push({pos:combatVec(p),life:.55,max:.55,radius});if(combat.bursts.length>18)combat.bursts.shift();spatialSound(p,70,.34,.18,'sawtooth',22);}
function blastAt(p,radius,damage,team='player',ignore=null){combatBurst(p,radius);spawnParticles(p,'#ecb16c',Math.min(24,RENDER.particles/5),8);const origin=add(p,V(0,.16,0));
 for(const e of combat.units){if(!e.alive)continue;const dst=unitChest(e),d=combatDistance(p,dst);if(d<radius&&lineClear(origin,dst))damageUnit(e,damage*(1-d/radius*.72),'body',team);}
 for(const e of enemies){if(e.alive&&combatDistance(e.pos,p)<radius&&lineClear(origin,e.pos))hitEnemy(e,damage*.75);}
 for(const j of combat.jets)if(j.alive&&combatDistance(j.pos,p)<radius+2&&lineClear(origin,j.pos))damageJet(j,damage*.9);
 for(const c of cars){if(c.hidden||c.hp<=0||c===ignore)continue;const dst=add(c.pos,V(0,1,0)),d=combatDistance(dst,p);if(d<radius&&lineClear(origin,dst))hurtVehicle(c,damage*(1-d/radius)*.65);}
 const pc=visibleTarget(),d=combatDistance(pc,p);if(!state.car&&d<radius&&lineClear(origin,pc)){hurt(damage*(1-d/radius)*.48);combat.hitText='\u6ce8\u610f\u7206\u70b8\u8303\u56f4';}
 if(d<24)cam.trauma=Math.min(.7,(cam.trauma||0)+.25*(1-d/24));reportNoise(p,100);
}
function throwOrigin(){return add(player.pos,rotate(V(.30,1.48,-.58),player.yaw));}
function throwVelocity(){const speed=weapons[state.weapon]?.id==='molotov'?21:24;return add(mul(cam.dir,speed),V(0,6.8,0));}
function spawnProjectile(kind,pos,vel,extra={}){if(!projectileCapacity6(kind))return null;const p={id:combat.nextId++,kind,pos:combatVec(pos),prev:combatVec(pos),vel:combatVec(vel),age:0,life:kind==='grenade'?2.35:kind==='molotov'?4:kind==='missile'?6:kind==='bullet'?2.6:3.5,team:'player',damage:20,trail:[],...extra};combat.projectiles.push(p);return p;}
function onPlayerShot(w){effects.shotAt=state.t;effects.shotPos=combatVec(player.pos);combat.bloom=Math.min(1,combat.bloom+.12);state.lastCrime=state.t;if(!combat.job)state.heat=Math.min(4.9,state.heat+.04);reportNoise(player.pos,w.id==='sniper'?110:70);for(const e of combat.units){if(e.alive&&combatDistance(e.pos,player.pos)<100){e.alertUntil=state.t+12;e.lastKnown=combatVec(player.pos);if(e.mode==='PATROL')e.mode='SEARCH';}}}
shoot=function(){
 if(!state.started||state.paused||state.dead||state.transition)return;
 if(isFighter()){fireCannon();return;}if(state.car)return;
 const w=weapons[state.weapon];if(!w||state.t<state.nextShot)return;
 if(state.reload>0){if(w.id==='shotgun'&&w.ammo>0)cancelReload8();else return;}
 if((w.throwable||w.id==='launcher')&&!projectileCapacity6(w.id==='launcher'?'rocket':w.id))return;
 if(w.ammo<=0){reload();state.nextShot=state.t+.2;return;}
 w.ammo--;state.nextShot=state.t+w.delay;onPlayerShot(w);
 const pose=beginShot8(w),scoped=scopeActive(),profile=profile8(w);
 if(w.throwable){spawnProjectile(w.id,throwOrigin(),throwVelocity(),{damage:w.damage});combat.throwUntil=state.t+.5;tone(320,.15,.055,'triangle',150);}
 else if(w.id==='launcher'){
  const ray=traceWeapon8(pose,cam.dir,w.range);
  if(ray.blocked)blastAt(ray.end,9,w.damage);else spawnProjectile('rocket',pose.muzzle,mul(ray.dir,72),{damage:w.damage,trail:[]});
  gunSound8(w);cam.recoil+=profile.kick*.55;
 }else{
  const spread=w.spread*(scoped?.018:isAiming()?.32:1)*(1+combat.bloom*.5+(player.moving?.75:0)),hits=new Map();
  for(let i=0;i<w.pellets;i++){
   const d=norm(add(assistedDirection(),V((Math.random()-.5)*spread,(Math.random()-.5)*spread,(Math.random()-.5)*spread))),r=traceWeapon8(pose,d,w.range);
   if(r.hit.object&&['soldier','enemy','jet','car'].includes(r.hit.type)){
    const key=r.hit.object;let entry=hits.get(key);if(!entry){entry={body:0,head:0,hit:r.hit};hits.set(key,entry);}
    entry[r.hit.part==='head'?'head':'body']+=weaponDamage8(w,r.distance);
   }
   impact8(r.hit,r.end,r.dir,w.id==='sniper');
   if(!r.blocked)tracers.push({a:{...pose.muzzle},b:r.end,life:scoped?.13:.045,color:'#f8dfac',width:scoped?.026:w.id==='shotgun'?.012:.019});
  }
  // Aggregate each pellet group before damage / hit feedback, preserving head multipliers.
  for(const entry of hits.values()){
   if(entry.body>0)applyCombatHit({...entry.hit,part:'body'},entry.body);
   if(entry.head>0)applyCombatHit({...entry.hit,part:'head'},entry.head);
  }
  if(hits.size)tone(w.id==='sniper'?1350:1050,.035,.028,'sine',700);
  gunSound8(w);cam.recoil+=profile.kick*(scoped?.34:.52);combat.scopePulse=1;
 }
 cam.trauma=Math.min(.25,(cam.trauma||0)+profile.kick*.8);
 if(touch.enabled&&settings.vibration&&navigator.vibrate)navigator.vibrate(w.id==='shotgun'?22:w.id==='sniper'?17:9);
 updateHUD();
};
const switchBefore5=switchWeapon;
switchWeapon=function(i){i=Math.floor(i);if(!Number.isFinite(i)||i<0||i>=weapons.length||state.car)return;switchBefore5(i);combat.bloom=0;combat.scopePulse=0;if(weapons[i].id!=='sniper')document.body.classList.remove('scoped');updateCombatHUD();};
function igniteAt(p){if(waterAt(p)){spawnParticles(p,'#c9e5e0',8,2);return;}const q=V(p.x,ground(p)+.04,p.z);combat.fires.push({pos:q,radius:3.9,life:7,tick:0});combatBurst(add(q,V(0,.25,0)),1.4);}
function updateCombatProjectiles(dt){
 for(let i=combat.projectiles.length-1;i>=0;i--){const p=combat.projectiles[i];if(!p)continue;p.age+=dt;p.life-=dt;p.prev=combatVec(p.pos);
  if(p.kind==='grenade'||p.kind==='molotov')p.vel.y-=12*dt;
  if(p.kind==='missile'){
   let target=p.decoy?.life>0?p.decoy.pos:p.target==='player'?state.car?.pos:p.target?.alive?p.target.pos:null;
   if(target){const targetVel=p.target==='player'?state.car?.vel:p.target?.vel;const aim=add(target,mul(targetVel||V(),.18));const desired=norm(sub(aim,p.pos)),v=norm(p.vel),factor=1-Math.exp(-dt*(p.decoy?5:2.1));p.vel=mul(norm(add(mul(v,1-factor),mul(desired,factor))),p.team==='enemy'?132:176);}
  }
  const next=add(p.pos,mul(p.vel,dt)),delta=sub(next,p.pos),len=length(delta),dir=norm(delta);let hit=obstacleHit(p.pos,dir,len,p.team==='player'?state.car:null);const floor=rayGround(p.pos,dir,len);if(floor<hit.t)hit={t:floor,type:'ground'};
  if(p.kind==='bullet'||p.kind==='cannon'||p.kind==='rocket'||p.kind==='missile'){
   if(p.team==='player'){const h=combatRay(p.pos,dir,hit.t,false);if(h.type!=='none')hit=h;}
   else if(state.started&&!state.dead){const target=visibleTarget(),t=raySphere(p.pos,dir,target,state.car?(isFighter()?3.3:1.35):.43);if(t<hit.t)hit={t,type:'player'};}
  }
  const contact=hit.type!=='none';p.pos=contact?add(p.pos,mul(dir,Math.max(0,hit.t-.025))):next;
  if(p.trail&&(p.kind==='rocket'||p.kind==='missile')&&Math.floor(p.age*16)!==Math.floor((p.age-dt)*16)){p.trail.push(combatVec(p.pos));if(p.trail.length>14)p.trail.shift();}
  let remove=p.life<=0;
  if(p.kind==='grenade'){
   if(contact){if(hit.type==='ground'){p.pos.y=ground(p.pos)+.12;p.vel.y=Math.abs(p.vel.y)*.36;p.vel.x*=.74;p.vel.z*=.74;}else{const n=normal8(hit,p.pos,dir);p.vel=mul(sub(p.vel,mul(n,2*dot(p.vel,n))),.45);p.vel.y+=.7;p.pos=add(p.pos,mul(n,.03));}}
   if(waterAt(p.pos)&&p.pos.y<-.05){remove=true;spawnParticles(p.pos,'#b8d9dd',8,2);}else if(p.life<=0)blastAt(p.pos,8,p.damage);
  }else if(p.kind==='molotov'){if(contact||remove){igniteAt(p.pos);remove=true;}}
  else if(p.kind==='rocket'||p.kind==='missile'){
   const near=p.kind==='missile'&&p.age>.15&&!p.decoy&&((p.target==='player'&&state.car&&combatDistance(p.pos,visibleTarget())<5)||(p.target?.alive&&combatDistance(p.pos,p.target.pos)<5));
   if(contact||near){if(hit.type==='jet')damageJet(hit.object,190);else if(hit.type==='player'||(near&&p.target==='player')){if(state.car)hurtVehicle(state.car,p.damage);else hurt(55);}else if(near&&p.target?.alive)damageJet(p.target,p.damage);blastAt(p.pos,p.kind==='missile'?7:9,p.damage,p.team,p.team==='enemy'?state.car:null);remove=true;}
  }else if(contact){if(hit.type==='player'){if(state.car)hurtVehicle(state.car,p.damage);else hurt(p.damage);}else if(p.team==='player')applyCombatHit(hit,p.damage);else if(hit.type==='car')hurtVehicle(hit.object,p.damage*.8);if(hit.type!=='player')impact8(hit,p.pos,dir,p.kind==='cannon');remove=true;}
  if(Math.abs(p.pos.x)>REGIONS[regionId].bounds+300||Math.abs(p.pos.z)>REGIONS[regionId].bounds+300)remove=true;
  if(remove)combat.projectiles.splice(i,1);
 }
 for(let i=combat.fires.length-1;i>=0;i--){const f=combat.fires[i];f.life-=dt;f.tick-=dt;if(f.tick<=0){f.tick=.25;for(const e of combat.units)if(e.alive&&combatDistance(unitChest(e),f.pos)<f.radius&&lineClear(add(f.pos,V(0,.2,0)),unitChest(e)))damageUnit(e,6);if(!state.car&&combatDistance(player.pos,f.pos)<f.radius&&lineClear(add(f.pos,V(0,.2,0)),visibleTarget()))hurt(3.5);for(const c of cars)if(c.hp>0&&combatDistance(c.pos,f.pos)<f.radius&&lineClear(add(f.pos,V(0,.2,0)),add(c.pos,V(0,1,0))))hurtVehicle(c,3);}if(f.life<=0)combat.fires.splice(i,1);}
 for(let i=combat.bursts.length-1;i>=0;i--)if((combat.bursts[i].life-=dt)<=0)combat.bursts.splice(i,1);
 for(let i=combat.decoys.length-1;i>=0;i--){const d=combat.decoys[i];d.prev=combatVec(d.pos);d.life-=dt;d.vel.y-=2*dt;d.pos=add(d.pos,mul(d.vel,dt));if(d.life<=0)combat.decoys.splice(i,1);}
 for(let i=combat.loot.length-1;i>=0;i--){const l=combat.loot[i];l.life-=dt;if(!state.car&&combatDistance(l.pos,player.pos)<2){player.hp=Math.min(100,player.hp+13);for(const w of weapons)w.reserve=Math.min(w.maxReserve,w.reserve+Math.max(1,Math.round(w.mag*.5)));tone(520,.06,.04,'sine',800);l.life=0;}if(l.life<=0)combat.loot.splice(i,1);}
}
function makeCamp(){combat.covers.length=0;const p=regionId==='islands'?V(-75,0,188):V(-86,0,242);p.y=ground(p);combat.center=p;
 const specs=[[-11,19,7,1.25,2,'#9c9c82'],[11,8,6,1.35,2,'#95a18c'],[-19,-8,5,1.2,3,'#aaa38d'],[5,-18,7,1.35,2,'#7c9291'],[-30,0,7,3.4,13,'#526c76'],[30,-11,7,3.2,14,'#9b8368'],[-6,-32,14,3,6,'#667d80']];
 for(const [x,z,w,h,d,color]of specs){const q=add(p,V(x,0,z));q.y=ground(q);combat.covers.push({pos:q,w,height:h,d,color,minx:q.x-w/2,maxx:q.x+w/2,minz:q.z-d/2,maxz:q.z+d/2,miny:q.y,h:q.y+h});}
 return p;
}
function safeCombatPosition(p){const q=combatVec(p);q.y=ground(q);resolveXZ(q,.5,true);if(waterAt(q))return add(combat.center||REGIONS[regionId].spawn,V(0,0,5));return q;}
function spawnCombatUnit(role,p,phase=0){p=safeCombatPosition(p);const e={id:'u'+combat.nextId++,role,pos:p,prevPos:combatVec(p),home:combatVec(p),yaw:PI,hp:ENEMY_TYPES[role].hp,maxHP:ENEMY_TYPES[role].hp,alive:true,phase,mode:'PATROL',ammo:ENEMY_TYPES[role].mag,reload:0,shotAt:state.t+1.5,firstShotAt:state.t+1.2,senseAt:0,canSee:false,goal:null,lastKnown:combatVec(player.pos),flash:0,alertUntil:state.t+12,moving:false};combat.units.push(e);return e;}
function unitMove(e,goal,dt,speed){const v=sub(goal,e.pos),d=Math.hypot(v.x,v.z);e.moving=d>.8;if(!e.moving)return;const dir=V(v.x/d,0,v.z/d),old=combatVec(e.pos),p=add(e.pos,mul(dir,speed*dt));resolveXZ(p,.43,false);if(combatDistance(old,p)<speed*dt*.15){const s=e.id.length%2?1:-1;const q=add(old,V(-dir.z*s*speed*dt,0,dir.x*s*speed*dt));resolveXZ(q,.44,false);p.x=q.x;p.z=q.z;}if(!waterAt(p)){p.y=ground(p);e.pos=p;}e.phase+=dt*speed*2.8;}
function pickUnitCover(e,target){let best=null,score=Infinity;for(const b of combat.covers){if(b.height>2)continue;const away=norm(sub(b.pos,target)),p=add(b.pos,mul(away,Math.max(b.w,b.d)*.5+1.1)),d=combatDistance(e.pos,p);if(d<score&&d>1&&lineClear(unitChest(e),add(p,V(0,1.3,0)))){score=d;best=p;}}return best;}
function updateCombatUnits(dt){const target=visibleTarget(),difficulty=combat.difficulty==='easy'?.60:1;for(const e of combat.units){if(!e.alive)continue;e.prevPos=combatVec(e.pos);e.flash=Math.max(0,e.flash-dt);const def=ENEMY_TYPES[e.role],d=combatDistance(e.pos,target);if(d>230){e.moving=false;continue;}
 if(state.t>=e.senseAt){e.senseAt=state.t+.15;const visible=perception6(e,target,def.range);if(visible){if(!e.canSee)e.firstShotAt=state.t+.7;e.mode=e.reload>0?'RELOAD':'ENGAGE';e.lastKnown=combatVec(player.pos);e.alertUntil=state.t+10;}else if(e.canSee){e.mode='SEARCH';e.goal=combatVec(e.lastKnown);}e.canSee=visible;}
 if(e.reload>0){e.reload-=dt;e.mode='RELOAD';if(e.reload<=0){e.ammo=def.mag;e.mode=e.canSee?'ENGAGE':'SEARCH';}const p=pickUnitCover(e,target);if(p)unitMove(e,p,dt,def.speed);}
 else if(e.canSee){e.yaw=lerpAngle(e.yaw,Math.atan2(-(target.x-e.pos.x),-(target.z-e.pos.z)),1-Math.exp(-dt*8));
  if(d>def.range*.64)unitMove(e,target,dt,def.speed);else if(e.role==='marksman'){e.mode='COVER';e.moving=false;}else if(e.role==='rifle'){const side=Math.sin(state.t*.5+e.phase*.05)>0?1:-1;unitMove(e,add(e.pos,mul(right(e.yaw),side*2.2)),dt,.85);}else if(d>18)unitMove(e,target,dt,def.speed*.7);else e.moving=false;
  if(state.t>=e.shotAt&&state.t>=e.firstShotAt){e.shotAt=state.t+def.interval/(difficulty*.6+.4);const o=add(unitChest(e),mul(forward(e.yaw),.68)),scatter=def.spread*(touch.enabled?1.5:1)*(combat.difficulty==='easy'?1.5:1),dir=norm(add(norm(sub(target,o)),V((Math.random()-.5)*scatter,(Math.random()-.5)*scatter,(Math.random()-.5)*scatter)));
   if(lineClear(o,target)){spawnProjectile('bullet',o,mul(dir,e.role==='marksman'?110:82),{team:'enemy',damage:def.damage*difficulty});e.shotUntil=state.t+.07;spatialSound(o,e.role==='marksman'?130:230,.07,.035,'triangle',70);e.ammo--;if(e.ammo<=0){e.reload=def.reload;e.mode='RELOAD';}}}
 }else if(state.t<e.alertUntil&&e.lastKnown){e.mode='SEARCH';unitMove(e,e.lastKnown,dt,def.speed*.75);const dir=sub(e.lastKnown,e.pos);e.yaw=lerpAngle(e.yaw,Math.atan2(-dir.x,-dir.z),dt*3);}
 else{e.mode='PATROL';const goal=add(e.home,V(Math.sin(state.t*.23+e.phase)*3,0,Math.cos(state.t*.23+e.phase)*2));unitMove(e,goal,dt,def.speed*.35);e.yaw+=dt*.24;}
 if(state.car&&state.car.medium==='land'&&Math.abs(state.car.speed)>6&&d<2.5){damageUnit(e,100);state.car.speed*=.87;}
 }
}
function resetJetWeapons(){combat.heat=0;combat.overheated=false;combat.lock=null;combat.lockProgress=0;combat.flares=6;combat.missiles=8;combat.missileAt=state.t;combat.boost=1;combat.incoming=0;}
const updatePlaneBefore5=updatePlane;
updatePlane=function(c,dt){if(c.kind!=='fighter')return updatePlaneBefore5(c,dt);const u=craftInput(),old=combatVec(c.pos);advanceThrottle(c,u,dt);const after=(keys.has('ShiftLeft')||keys.has('ShiftRight')||combat.controls.boost)&&c.throttle>.45&&combat.boost>.04;
 c.afterburner=after;combat.boost=clamp(combat.boost+(after?-.22:.095)*dt,0,1);const thrust=(c.throttle||0)*(after?30:19),drag=1.5+c.speed*.11;c.speed=clamp(c.speed+(thrust-drag)*dt,0,after?125:88);if(u.slow&&!c.airborne)c.speed=Math.max(0,c.speed-12*dt);
 const pitch=clamp((u.up?1:0)-(u.down?1:0)+u.pitch,-1,1);c.pitch=mix(c.pitch||0,pitch*.59,1-Math.exp(-dt*3));c.roll=mix(c.roll||0,u.left*.99,1-Math.exp(-dt*3.3));c.yaw+=u.left*(c.airborne?1.03:.60)*clamp(c.speed/15,0,1)*dt;
 c.vertical=mix(c.vertical||0,c.speed>23?Math.sin(c.pitch)*c.speed:-Math.max(2,(23-c.speed)*.62),1-Math.exp(-dt*2.7));if(!c.airborne&&c.pitch<=.025)c.vertical=Math.min(c.vertical,0);c.vel=mul(forward(c.yaw),c.speed*Math.cos(c.pitch));c.vel.y=c.vertical;c.pos=add(c.pos,mul(c.vel,dt));c.wheel=(c.wheel||0)+c.speed*dt/.32;collideAircraft(c,old,dt);c.stall=c.airborne&&c.speed<23;craftAudio(c);
};
function fireCannon(){if(!projectileCapacity6('cannon'))return false;const c=state.car;if(!isFighter()||!state.started||state.paused||state.dead||state.t<combat.cannonAt||combat.overheated)return false;combat.cannonAt=state.t+.085;combat.heat=Math.min(1,combat.heat+.047);if(combat.heat>=.99)combat.overheated=true;const dir=fighterDirection(c),o=add(add(c.pos,V(0,1.13,0)),mul(dir,7.1));spawnProjectile('cannon',o,mul(dir,270),{damage:28,life:2.8});cam.trauma=Math.min(.12,(cam.trauma||0)+.025);tone(112,.045,.024,'triangle',60);return true;}
function fireMissile(){if(!projectileCapacity6('missile'))return false;const c=state.car;if(!isFighter()||state.paused||!state.started)return false;if(combat.lockProgress<1||!combat.lock?.alive){toast('\u6309\u4f4f\u53f3\u952e\u9501\u5b9a\u524d\u65b9\u654c\u673a');return false;}if(combat.missiles<=0){toast('\u5bfc\u5f39\u7528\u5c3d\uff0c\u6ce2\u6b21\u95f4\u8865\u7ed9\u6216\u8fd4\u822a');return false;}if(state.t<combat.missileAt)return false;combat.missileAt=state.t+1.15;combat.missiles--;const dir=fighterDirection(c);spawnProjectile('missile',add(add(c.pos,V(0,.6,0)),mul(dir,7.2)),mul(dir,130),{target:combat.lock,damage:150,life:6});combat.lockProgress=.35;spatialSound(c.pos,180,.26,.11,'sawtooth',60);return true;}
function deployFlares(){const c=state.car;if(!isFighter()||state.paused||state.t<combat.flareAt||combat.flares<=0)return false;combat.flareAt=state.t+2;combat.flares--;const side=right(c.yaw);for(let s of [-1,1])for(let i=0;i<3;i++){const p={pos:add(c.pos,add(mul(side,s*(1+i)),V(0,-.2,i))),vel:add(mul(c.vel||V(),.25),add(mul(side,s*(6+i*2)),V(0,-3,0))),life:3};combat.decoys.push(p);}
 for(const p of combat.projectiles)if(p.kind==='missile'&&p.team==='enemy'&&combatDistance(p.pos,c.pos)<430)p.decoy=combat.decoys[combat.decoys.length-1];tone(380,.15,.08,'triangle',85);toast('\u5e72\u6270\u5f39\u5df2\u91ca\u653e / BREAK LOCK');return true;}
function updateAirCombat(dt){if(!isFighter()){combat.lock=null;combat.lockProgress=0;combat.incoming=0;return;}const c=state.car,dir=fighterDirection(c);combat.heat=Math.max(0,combat.heat-dt*((mouse.left||combat.controls.cannon)? .05:.27));if(combat.overheated&&combat.heat<.25)combat.overheated=false;
 if(mouse.left||combat.controls.cannon||touch.fire)fireCannon();const active=mouse.right||combat.controls.lock||touch.aim;let candidate=null,best=.932;
 for(const j of combat.jets){if(!j.alive)continue;const delta=sub(j.pos,c.pos),d=length(delta),alignment=dot(norm(delta),dir);if(d<720&&d>10&&alignment>best&&lineClear(add(c.pos,V(0,2,0)),j.pos)){best=alignment;candidate=j;}}
 if(candidate!==combat.lock){combat.lock=candidate;combat.lockProgress=0;}if(active&&candidate){combat.lockProgress=Math.min(1,combat.lockProgress+dt/1.15);if(state.t>combat.lockToneAt){combat.lockToneAt=state.t+(combat.lockProgress>=1?.32:.55);tone(combat.lockProgress>=1?870:550,.055,.018,'sine',720);}}else combat.lockProgress=Math.max(0,combat.lockProgress-dt*2.0);
 combat.incoming=combat.projectiles.filter(p=>p.team==='enemy'&&p.kind==='missile'&&!p.decoy&&p.target==='player'&&combatDistance(p.pos,c.pos)<360).length;
 if(combat.incoming&&state.t>(combat.warningAt||0)){combat.warningAt=state.t+.7;tone(430,.12,.026,'square',680);}
}
function spawnEnemyJet(index=0){const p=state.car?.pos||add(REGIONS[regionId].airport,V(0,110,-50)),a=(state.car?.yaw||0)+(index-.5)*.34,dir=forward(a),q=add(p,mul(dir,170+index*65));q.y=Math.max(80,p.y+index*12);const j={id:'j'+combat.nextId++,kind:'fighter',medium:'air',enemy:true,color:index%2?'#687784':'#987e70',pos:q,prevPos:combatVec(q),yaw:a,pitch:0,roll:0,speed:53+index*4,vel:mul(dir,54),hp:130,alive:true,airborne:true,mode:'PATROL',phase:index*2.3,fireAt:state.t+4+index*2,missileAt:state.t+10+index*4,evadeUntil:0};combat.jets.push(j);return j;}
function updateEnemyJets(dt){const c=state.car;for(const j of combat.jets){if(!j.alive)continue;j.prevPos=combatVec(j.pos);const target=isFighter()?add(c.pos,V(0,1,0)):add(REGIONS[regionId].airport,V(0,110,-150)),diff=sub(target,j.pos),distance=length(diff),bearing=Math.atan2(-diff.x,-diff.z);let goal=bearing;
 if(distance<65||state.t<j.evadeUntil){goal=j.yaw+Math.sin(state.t+j.phase)*1.6+.65;j.mode='EVADE';}else if(distance>280){j.mode='INTERCEPT';}else{j.mode='ENGAGE';if(Math.sin(state.t*.2+j.phase)>.75)goal+=.7;}
 const bound=REGIONS[regionId].bounds-100;if(Math.abs(j.pos.x)>bound||Math.abs(j.pos.z)>bound)goal=Math.atan2(j.pos.x,j.pos.z);
 const delta=Math.atan2(Math.sin(goal-j.yaw),Math.cos(goal-j.yaw)),rate=clamp(delta,-.68,.68);j.yaw+=rate*dt;j.roll=mix(j.roll,-rate*.95,1-Math.exp(-dt*3));const groundSafe=Math.max(75,ground(j.pos)+60);const desiredY=Math.max(groundSafe,target.y+(j.mode==='EVADE'?35:0)),pitch=clamp((desiredY-j.pos.y)*.008,-.35,.36);j.pitch=mix(j.pitch,pitch,1-Math.exp(-dt*2));j.speed=mix(j.speed,distance>360?70:54,dt*.6);j.vel=mul(fighterDirection(j),j.speed);j.pos=add(j.pos,mul(j.vel,dt));j.pos.y=Math.max(ground(j.pos)+16,j.pos.y);
 if(!isFighter()||state.dead)continue;const dir=fighterDirection(j),toward=norm(sub(visibleTarget(),add(j.pos,V(0,1,0)))),alignment=dot(dir,toward);
 if(distance<250&&alignment>.975&&state.t>j.fireAt){j.fireAt=state.t+.23;const o=add(add(j.pos,V(0,1.1,0)),mul(dir,7));spawnProjectile('cannon',o,mul(dir,215),{team:'enemy',damage:combat.difficulty==='easy'?2.5:5,life:2.0});}
 if(distance<430&&distance>70&&alignment>.96&&state.t>j.missileAt){j.missileAt=state.t+(combat.difficulty==='easy'?19:13);spawnProjectile('missile',add(j.pos,mul(dir,7)),mul(dir,110),{team:'enemy',target:'player',damage:combat.difficulty==='easy'?17:27,life:5.0});}
 }}
function clearCombatEncounter(){combat.units.length=combat.jets.length=combat.projectiles.length=combat.fires.length=combat.loot.length=combat.decoys.length=0;combat.bursts.length=0;combat.covers.length=0;combat.center=null;combat.lock=null;combat.lockProgress=0;combat.incoming=0;combat.job=null;combat.controls.cannon=combat.controls.lock=combat.controls.boost=false;}
function fullCombatSupply(){player.hp=100;player.armor=50;for(const w of weapons){w.ammo=w.mag;w.reserve=w.initialReserve;}state.reload=0;state.nextShot=state.t;}
function beginCombatWave(){const j=combat.job;if(!j)return;j.stage='fight';j.waveKills=0;j.nextWave=0;if(j.type==='air'){combat.jets.length=0;const n=j.wave===2?3:2;j.waveTotal=n;for(let i=0;i<n;i++)spawnEnemyJet(i);if(state.car){state.car.hp=Math.min(100,state.car.hp+20);}combat.missiles=Math.min(8,combat.missiles+3);combat.flares=Math.min(6,combat.flares+2);}
 else{combat.units.length=0;j.waveTotal=Math.min(9,3+j.wave);const c=combat.center;for(let i=0;i<j.waveTotal;i++){const a=i*2.15+j.wave*.3,r=11+i%3*5,p=add(c,V(Math.sin(a)*r,0,Math.cos(a)*r-4));const role=j.wave>=2&&i===0?'heavy':i%4===3?'marksman':'rifle';spawnCombatUnit(role,p,i*1.6);}if(j.wave>1){player.hp=Math.min(100,player.hp+22);player.armor=Math.min(50,player.armor+15);for(const w of weapons)w.reserve=Math.min(w.maxReserve,w.reserve+w.mag);}}
 toast('\u7b2c '+j.wave+' \u8f6e / '+j.waveTotal+' \u4e2a\u76ee\u6807');saveProgress();
}
function startCombat(type){if(!OPS[type])return false;if((contract||expeditionJob||combat.job)&&!combat.mutating){toast('\u8bf7\u5148\u7ed3\u675f\u5f53\u524d\u4efb\u52a1');return false;}clearCombatEncounter();combat.result=null;combat.mutating=true;state.heat=0;wanted.phase='CLEAR';wanted.lastSeen=-100;state.dead=false;state.transition=null;fullCombatSupply();
 if(type==='air'){deployVehicle('fighter',true,true);const c=state.car;c.pos=add(REGIONS[regionId].airport,V(0,110,-100));c.prevPos=combatVec(c.pos);c.speed=64;c.throttle=.75;c.airborne=true;c.vel=V(0,0,-64);c.vertical=0;player.pos=combatVec(c.pos);player.prevPos=combatVec(player.pos);resetJetWeapons();cam.yaw=0;cam.pitch=-.06;cam.eye=add(c.pos,V(0,4,24));}
 else{state.car=null;const center=makeCamp();player.pos=safeCombatPosition(add(center,V(0,0,46)));player.prevPos=combatVec(player.pos);player.yaw=cam.yaw=0;cam.pitch=-.10;player.jump=player.vy=0;cam.eye=add(player.pos,V(1,3.1,7));state.weapon=3;document.body.classList.remove('driving','flying','sailing');}
 combat.mutating=false;combat.job={type,region:regionId,wave:1,waveTotal:0,waveKills:0,kills:0,elapsed:0,stage:'fight',nextWave:0,exit:combatVec(player.pos),hold:0};closeCombatPanel();closePanel();closeExpeditionPanel();startGame();beginCombatWave();syncCraftUI();updateHUD();saveProgress();return true;
}
function finishCombat(success,reason=''){const j=combat.job;if(!j)return;const def=OPS[j.type],payout=success&&j.type!=='survival'?def.reward+Math.max(0,Math.floor(600-j.elapsed)):0;state.cash+=payout;profile.earned+=payout;if(success&&j.type==='ground')combat.score.groundWins++;if(success&&j.type==='air')combat.score.airWins++;combat.score.survivalBest=Math.max(combat.score.survivalBest,j.type==='survival'?j.wave-1:0);combat.result={success,type:j.type,payout,reason,kills:j.kills,waves:j.wave,time:j.elapsed};combat.job=null;combat.lock=null;combat.lockProgress=0;combat.incoming=0;combat.projectiles.length=0;for(const e of combat.units)e.alive=false;for(const e of combat.jets)e.alive=false;combat.resultUntil=state.t+9;saveProgress();toast(success?'\u884c\u52a8\u6210\u529f / +$'+payout:'\u884c\u52a8\u7ed3\u675f / '+reason);updateCombatHUD();}
function updateCombatJob(dt){const j=combat.job;if(!j)return;j.elapsed+=dt;if(state.dead||player.hp<=0)return finishCombat(false,'\u4f5c\u6218\u4eba\u5458\u5931\u53bb\u884c\u52a8\u80fd\u529b');if(j.type==='air'&&!isFighter())return finishCombat(false,'\u5df2\u79bb\u5f00\u6218\u6597\u673a');
 if(j.stage==='fight'){const remaining=j.type==='air'?combat.jets.filter(e=>e.alive).length:combat.units.filter(e=>e.alive).length;if(remaining===0){if(j.type!=='survival'&&j.wave>=3){if(j.type==='air')return finishCombat(true);j.stage='extract';toast('\u636e\u70b9\u5df2\u6e05\u9664\uff0c\u8fd4\u56de\u7eff\u8272\u64a4\u79bb\u70b9');}else{j.stage='break';j.nextWave=state.t+7;if(j.type==='survival'){const reward=400+j.wave*100;state.cash+=reward;profile.earned+=reward;combat.score.survivalBest=Math.max(combat.score.survivalBest,j.wave);toast('\u5b88\u536b\u5956\u91d1 +$'+reward);}else toast('\u6ce2\u6b21\u5b8c\u6210 / 7 \u79d2\u540e\u589e\u63f4');saveProgress();}}}
 else if(j.stage==='break'&&state.t>=j.nextWave){j.wave++;beginCombatWave();}
 else if(j.stage==='extract'){j.hold=!state.car&&combatDistance(player.pos,j.exit)<5?j.hold+dt:0;if(j.hold>1.3)return finishCombat(true);}
}
function updateCombat(dt){combat.bloom=Math.max(0,combat.bloom-dt*.8);combat.scopePulse=Math.max(0,combat.scopePulse-dt*6);if(scopeActive()&&(keys.has('ShiftLeft')||keys.has('ShiftRight')||combat.controls.steady||(touch.enabled&&touch.boost)))combat.breath=Math.max(0,combat.breath-dt);else combat.breath=Math.min(4,combat.breath+dt*.55);
 updateCombatUnits(dt);updateEnemyJets(dt);updateAirCombat(dt);updateCombatProjectiles(dt);updateCombatJob(dt);
}
