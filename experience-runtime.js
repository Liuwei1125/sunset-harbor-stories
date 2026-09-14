/* V6 owns simulation, quality and frame snapshots. Legacy game services remain
   callable, but only this scheduler invokes them. */
const ground5=ground,water5=waterAt,pier5=onPier;
ground=function(p){if(regionId==='coast'&&(inHarbor6(p)||harborPier6(p)))return harborPier6(p)?.45:water5(p)?ground5(p):portHeight6(p);return ground5(p);};
onPier=function(p){return harborPier6(p)||pier5(p);};
waterAt=function(p){if(harborPier6(p))return false;if(regionId==='coast'&&inHarbor6(p)&&p.x<=162)return false;return water5(p);};
const resetActors5=resetRegionActors;resetRegionActors=function(){resetActors5();spawnHarborVehicles6();};
const initialiseActors5=initialiseV3Actors;initialiseV3Actors=function(){initialiseActors5();spawnHarborVehicles6();};
setGraphicsQuality=setQuality6;adaptiveQuality=adjustQuality6;updateCombatUnits=updateUnits6;unitMove=moveUnit6;pickUnitCover=selectCover6;
const drawPerson5=drawPerson;
drawPerson=function(b,p,yaw,phase,wi=0,civil=false){if(!civil&&scopeActive()&&!state.car)return;if(dist2(p,cam.eye)>RENDER.detail+12)return drawPersonBasic(b,p,yaw,phase,wi,civil);drawHumanoid6(b,p,yaw,phase,wi,{civil});};
drawCombatUnit=function(b,e,t){if(dist2(e.pos,cam.eye)>RENDER.detail+20)return drawPersonBasic(b,e.pos,e.yaw,e.phase,e.role==='marksman'?4:3,true);drawHumanoid6(b,e.pos,e.yaw,e.phase,e.role==='marksman'?4:3,{enemy:e});};
const switchWeapon5=switchWeapon;switchWeapon=function(i){if(i===state.weapon||state.car)return;const old=state.weapon;switchWeapon5(i);if(state.weapon!==old){experience.lastWeapon=old;recordEvent6('weapon-switch',{from:old,to:i,reloadCancelled:state.reload>0});}};
onPlayerShot=function(w){effects.shotAt=state.t;effects.shotPos={...player.pos};combat.bloom=Math.min(1,combat.bloom+profile8(w).bloom);state.lastCrime=state.t;experience.shootAt=state.t;experience.stats.shots++;if(!combat.job&&!experience.mission)state.heat=Math.min(4.9,state.heat+.04);reportNoise(player.pos,profile8(w).noise);hearNoise6(player.pos,profile8(w).noise);};
const hurt5=hurt;hurt=function(amount){experience.director.lastDamage=state.t;experience.stats.damage+=amount;if(experience.mission)experience.mission.damage+=amount;hurt5(amount);};
const cargoImpact5=onCargoImpact;onCargoImpact=function(impact){cargoImpact5(impact);const m=experience.mission;if(m?.carrying&&state.car){const loss=Math.max(0,impact-5)*.60;m.cargo=Math.max(0,m.cargo-loss);recordEvent6('cargo-impact',{loss:+loss.toFixed(2)});}};
const updatePlayer5=updatePlayer;
updatePlayer=function(dt){const before={...player.pos};if(state.car||state.transition)updatePlayer5(dt);else updateWalker6(dt);experience.stats.distance+=Math.min(15,dist2(before,player.pos));};
const oldToggle6=toggleCar;
toggleCar=function(){
 if(missionInteract6())return;
 const c=state.car;if(c?.medium==='sea'&&regionId==='coast'){
  const d=HARBOR6.piers.slice().sort((a,b)=>dist2(c.pos,a.boat)-dist2(c.pos,b.boat))[0];
  if(dist2(c.pos,d.boat)<25){if(Math.abs(c.speed)>2){toast('\u5148\u505c\u7a33\u518d\u4e0b\u8239');return;}player.pos=V(176,.45,d.z);player.prevPos={...player.pos};player.yaw=cam.yaw=-PI/2;state.car=null;c.pos={...d.boat};c.pos.y=waveHeight(c.pos);c.prevPos={...c.pos};c.yaw=c.prevYaw=0;c.speed=0;c.vel=V();c.throttle=0;document.body.classList.remove('driving','sailing');cam.pitch=-.14;clearTouchInput();syncCraftUI();updateHUD();recordEvent6('disembark',{medium:'sea'});return;}
 }
 oldToggle6();syncFlightTarget6();experience.walkSpeed=0;experience.input.crouch=false;experience.crouching=false;updateExperienceUI6();
};
const look5=touchLook;touchLook=function(dx,dy){
 if(isFighter()&&experience.options.flight==='assisted'&&!experience.flight.freeLook){experience.flight.targetYaw-=dx*.0042*experience.options.lookSensitivity;experience.flight.targetPitch=clamp(experience.flight.targetPitch-dy*.0034*experience.options.lookSensitivity,-.62,.62);experience.input.look=true;return;}
 look5(dx*experience.options.lookSensitivity,dy*experience.options.lookSensitivity);
};
const plane5=updatePlane;
updatePlane=function(c,dt){if(c.kind!=='fighter')return plane5(c,dt);const u=craftInput(),old={...c.pos},f=experience.flight,assist=experience.options.flight==='assisted';advanceThrottle(c,u,dt);
 const boost=(keys.has('ShiftLeft')||keys.has('ShiftRight')||combat.controls.boost)&&c.throttle>.45&&combat.boost>.04;
 combat.boost=clamp(combat.boost+(boost?-.22:.095)*dt,0,1);c.afterburner=boost;const thrust=c.throttle*(boost?30:19),drag=1.5+c.speed*.11;c.speed=clamp(c.speed+(thrust-drag)*dt,0,boost?125:88);
 if(u.slow&&!c.airborne)c.speed=Math.max(0,c.speed-12*dt);
 const steer=u.left,pitchControl=clamp((u.up?1:0)-(u.down?1:0)+u.pitch,-1,1);
 let desiredRoll,desiredPitch;
 if(assist){
  if(Math.abs(steer)>.025){f.targetYaw=c.yaw+steer*.82;experience.input.look=false;}else if(!experience.input.look)f.targetYaw=c.yaw;
  if(Math.abs(pitchControl)>.025){f.targetPitch=pitchControl*.56;experience.input.look=false;}else if(!experience.input.look)f.targetPitch*=Math.exp(-dt*2.0);
  const delta=Math.atan2(Math.sin(f.targetYaw-c.yaw),Math.cos(f.targetYaw-c.yaw));desiredRoll=clamp(delta*1.5,-.99,.99);desiredPitch=f.targetPitch;
 }else{desiredRoll=clamp((c.roll||0)+steer*dt*2.2,-1.30,1.30);desiredPitch=clamp((c.pitch||0)+pitchControl*dt*.72,-1.05,1.05);if(!steer)desiredRoll*=Math.exp(-dt*.10);}
 c.roll=mix(c.roll||0,desiredRoll,1-Math.exp(-dt*3.8));c.pitch=mix(c.pitch||0,desiredPitch,1-Math.exp(-dt*3));
 const yawRate=clamp(Math.tan(clamp(c.roll,-1.2,1.2))*23/Math.max(24,c.speed),-1.18,1.18);
 c.yaw+=(c.airborne?yawRate:steer*.60)*dt;if(!assist&&c.airborne)c.yaw+=((keys.has('KeyQ')?1:0)-(keys.has('KeyE')?1:0))*.26*dt;
 c.vertical=mix(c.vertical||0,c.speed>23?Math.sin(c.pitch)*c.speed:-Math.max(2,(23-c.speed)*.62),1-Math.exp(-dt*2.7));if(!c.airborne&&c.pitch<=.025)c.vertical=Math.min(c.vertical,0);
 c.vel=mul(forward(c.yaw),c.speed*Math.cos(c.pitch));c.vel.y=c.vertical;c.pos=add(c.pos,mul(c.vel,dt));c.wheel=(c.wheel||0)+c.speed*dt/.32;collideAircraft(c,old,dt);c.stall=c.airborne&&c.speed<23;craftAudio(c);
};
updateAirCombat=function(dt){if(!isFighter()){combat.lock=null;combat.lockProgress=0;combat.incoming=0;return;}
 const c=state.car,dir=fighterDirection(c),firing=mouse.left||combat.controls.cannon||touch.fire;
 combat.heat=Math.max(0,combat.heat-dt*(firing?.05:.27));if(combat.overheated&&combat.heat<.25)combat.overheated=false;if(firing)fireCannon();
 const active=experience.options.lockToggle?experience.flight.autoLock:mouse.right||combat.controls.lock||touch.aim;
 const valid=(j,relaxed=false)=>{if(!j?.alive)return false;const v=sub(j.pos,c.pos),d=length(v);return d<(relaxed?780:720)&&d>10&&dot(norm(v),dir)>(relaxed?.88:.932)&&lineClear(add(c.pos,V(0,2,0)),j.pos);};
 let candidate=valid(combat.lock,true)?combat.lock:null;
 if(!candidate){let best=.932;for(const j of combat.jets){if(!valid(j))continue;const a=dot(norm(sub(j.pos,c.pos)),dir);if(a>best){best=a;candidate=j;}}}
 if(candidate!==combat.lock){combat.lock=candidate;combat.lockProgress=0;}
 if(active&&candidate){combat.lockProgress=Math.min(1,combat.lockProgress+dt/1.15);if(state.t>combat.lockToneAt){combat.lockToneAt=state.t+(combat.lockProgress>=1?.32:.55);tone(combat.lockProgress>=1?870:550,.055,.018,'sine',720);}}
 else combat.lockProgress=Math.max(0,combat.lockProgress-dt*1.2);
 combat.incoming=combat.projectiles.filter(p=>p.team==='enemy'&&p.kind==='missile'&&!p.decoy&&p.target==='player'&&combatDistance(p.pos,c.pos)<360).length;
 if(combat.incoming&&state.t>(combat.warningAt||0)){combat.warningAt=state.t+.7;tone(430,.12,.026,'square',680);}
};
const startCombat5=startCombat;startCombat=function(type){if(experience.mission){toast('\u8bf7\u5148\u5b8c\u6210\u6216\u7ed3\u675f\u6e2f\u53e3\u884c\u52a8');return false;}const ok=startCombat5(type);syncFlightTarget6();experience.flight.autoLock=false;return ok;};
const deploy5=deployVehicle;deployVehicle=function(...args){if(experience.mission){toast('\u4efb\u52a1\u4e2d\u8bf7\u4f7f\u7528\u73b0\u573a\u8f7d\u5177');return false;}const r=deploy5(...args);syncFlightTarget6();return r;};
const contract5=startContract;startContract=function(t){if(experience.mission)return toast('\u8bf7\u5148\u7ed3\u675f\u6e2f\u53e3\u884c\u52a8');return contract5(t);};
const expedition5=startExpedition;startExpedition=function(t){if(experience.mission)return toast('\u8bf7\u5148\u7ed3\u675f\u6e2f\u53e3\u884c\u52a8');return expedition5(t);};
const travel5=travelTo;travelTo=function(id){if(experience.mission){if(!confirm('\u79bb\u5f00\u5730\u56fe\u4f1a\u7ed3\u675f\u6e2f\u53e3\u884c\u52a8\uff0c\u7ee7\u7eed\uff1f'))return;finishHarbor6(false,'\u79bb\u5f00\u6e2f\u53e3');closeExperiencePanel6(false);}return travel5(id);};
const region5=loadRegionSync;loadRegionSync=function(id){experience.mission=null;experience.action=null;experience.input.crouch=false;region5(id);spawnHarborVehicles6();experience.renderPoses.clear();};
const recover5=recoverCraft;recoverCraft=function(...args){if(experience.mission){finishHarbor6(false,'\u8f7d\u5177\u635f\u6bc1 / \u8fd4\u822a\u6551\u63f4');}return recover5(...args);};
const reset5=resetGame;resetGame=function(){experience.mission=null;experience.action=null;experience.input.crouch=false;reset5();spawnHarborVehicles6();};
const nav5=navigationTarget;navigationTarget=function(){return experience.mission?harborTarget6():nav5();};
const navName5=navigationName;navigationName=function(){return experience.mission?STAGES6[experience.mission.stage]:navName5();};
const actors5=renderWorldActors;renderWorldActors=function(alpha){actors5(alpha);if(regionId==='coast')drawHarborDynamic6(dynamic,fx,state.t);};
const camera5=updateCamera;
updateCamera=function(dt,preview=false){
 if(preview&&regionId==='coast'&&!experience.mission){const a=state.t*.025;cam.eye=V(192+Math.sin(a)*7,48,329);const target=V(120,2.5,252);cam.dir=norm(sub(target,cam.eye));cam.fov6=59*PI/180;cam.vp=matmul(perspective(cam.fov6,innerWidth/innerHeight,.12,2200),lookAt(cam.eye,target));return;}
 camera5(dt,preview);cam.fov6=(isFighter()?71:state.car?state.car.medium==='land'?68:67:isAiming()?49:66)*PI/180;
 if(!preview&&isFighter()){
  const c=state.car,free=keys.has('AltLeft')||keys.has('AltRight')||experience.flight.freeLook;
  if(!free){cam.yaw=lerpAngle(cam.yaw,c.yaw,1-Math.exp(-dt*5));cam.pitch=mix(cam.pitch,(c.pitch||0)*.66-.13,1-Math.exp(-dt*4));}
  cam.dir=norm(V(-Math.sin(cam.yaw)*Math.cos(cam.pitch),Math.sin(cam.pitch),-Math.cos(cam.yaw)*Math.cos(cam.pitch)));
  const target=add(c.pos,V(0,2,0)),distance=24+Math.min(6,Math.abs(c.speed)*.04),want=add(sub(target,mul(cam.dir,distance)),V(0,2.6,0));cam.eye=add(cam.eye,mul(sub(want,cam.eye),1-Math.exp(-dt*7)));cam.eye.y=Math.max(cam.eye.y,ground(cam.eye)+1);cam.vp=matmul(perspective(cam.fov6,innerWidth/innerHeight,.14,2700),lookAt(cam.eye,add(cam.eye,cam.dir)));
 }
 if(!state.car&&experience.crouching&&!preview){cam.eye.y-=.30;cam.vp=matmul(perspective(scopeActive()?2*Math.atan(Math.tan(66*PI/360)/combat.scopeZoom):cam.fov6,innerWidth/innerHeight,.055,2100),lookAt(cam.eye,add(cam.eye,cam.dir)));}
};
snapshotActors=function(){cam.prevEye={...cam.eye};cam.prevDir={...cam.dir};for(const a of [player,...cars,...enemies,...civilians,...combat.units,...combat.jets]){if(!a.pos)continue;a.prevPos={...a.pos};a.prevYaw=a.yaw||0;a.prevPitch=a.pitch||0;a.prevRoll=a.roll||0;}};
update=function(dt){
 if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.04);
 if(!state.started){state.t+=dt;updateCamera(dt,true);return;}if(state.paused||state.dead)return;state.t+=dt;
 if(keys.has('ArrowLeft')){cam.yaw+=dt*1.5;cam.lastLook=state.t;}if(keys.has('ArrowRight')){cam.yaw-=dt*1.5;cam.lastLook=state.t;}if(keys.has('ArrowUp'))cam.pitch=clamp(cam.pitch+dt*.8,-.88,.65);if(keys.has('ArrowDown'))cam.pitch=clamp(cam.pitch-dt*.8,-.88,.65);
 updatePlayer(dt);updateTraffic(dt);updateCivilians(dt);
 updateReload8(dt);
 updateCamera(dt);cam.trauma=(cam.trauma||0)*Math.exp(-dt*9);
 if((mouse.left||touch.fire)&&!state.car)shoot();updateEnemies(dt);updateItems(dt);updateContracts(dt);updateCombat(dt);updateHarbor6(dt);
 state.damage=Math.max(0,state.damage-dt*.7);for(const c of cars)if(!state.transition)c.door=Math.max(0,(c.door||0)-dt*2);
 if(state.t>state.toastUntil)$('toast').classList.remove('show');if(state.t>state.hudAt){updateHUD();state.hudAt=state.t+.12;}if(state.t>saveAt)saveProgress();if(navOverride&&atGarage())navOverride=null;updateAudioListener();
};
const render5=render;
render=function(alpha=1){if(!worldMeshes||!cam.vp)return;gpuBegin6();try{withRenderSnapshot6(state.started?alpha:1,()=>{render5(1);updateProjection6();});}finally{gpuEnd6();}};
function updateProjection6(){
 const ui=$('combat-targets');if(!ui)return;const all=isFighter()?combat.jets:combat.units,placed=[];
 for(const e of all){const node=combat.hudNodes.get(e.id);if(!node||node.hidden)continue;const point=add(e.pos,V(0,isFighter()?1.1:2.35,0)),p=project(point,cam.vp),x=p.x*innerWidth,y=p.y*innerHeight,d=dist2(e.pos,player.pos),nearAim=Math.abs(p.x-.5)<.16&&Math.abs(p.y-.5)<.22;
  if(!experience.options.showLabels||(!isFighter()&&d>32&&!nearAim)||placed.some(q=>Math.abs(q.x-x)<110&&Math.abs(q.y-y)<37)){node.hidden=true;continue;}placed.push({x,y});
  node.classList.toggle('enemy-windup6',e.windupUntil>state.t);if(!isFighter()){const text=node.querySelector('span');if(text)text.textContent=(e.canSee?'! ':e.mode==='SEARCH'||e.mode==='INVESTIGATE'?'? ':'')+ENEMY_TYPES[e.role].name+' / '+Math.round(d)+'m';}
 }
 const air=$('air-guide6');if(!air)return;air.hidden=!isFighter();if(isFighter()){
  const c=state.car,list=combat.jets.filter(x=>x.alive).sort((a,b)=>dist2(a.pos,c.pos)-dist2(b.pos,c.pos)),j=combat.lock||list[0];let direction='';
  if(j){const v=sub(j.pos,c.pos),bearing=Math.atan2(-v.x,-v.z),d=Math.atan2(Math.sin(bearing-c.yaw),Math.cos(bearing-c.yaw));direction=Math.abs(d)<.24?'AHEAD':d>0?'\u25c0 LEFT':'RIGHT \u25b6';}
  air.textContent=c.stall?'STALL / \u589e\u52a0\u6cb9\u95e8':combat.incoming?'MISSILE / \u5e72\u6270 C':combat.overheated?'COOLING / '+Math.round(combat.heat*100)+'%':combat.lockProgress>=1?'LOCKED / X \u53d1\u5c04':j?direction+' / '+Math.round(dist2(j.pos,c.pos))+'m / '+(experience.flight.autoLock?'TRACKING '+Math.round(combat.lockProgress*100)+'%':'\u70b9\u51fb\u9501\u5b9a'):'AIRSPACE CLEAR';
 }
}
const hud5=updateHUD;updateHUD=function(){hud5();updateExperienceUI6();};
const map5=drawMap;drawMap=function(){map5();if(regionId!=='coast')return;const el=$('map'),ctx=el.getContext('2d'),s=state.map?.30:state.car?.medium==='air'?.43:state.car?.medium==='sea'?.70:1.65,cx=state.map?0:player.pos.x,cz=state.map?70:player.pos.z,px=x=>el.width/2+(x-cx)*s,pz=z=>el.height/2+(z-cz)*s;
 ctx.fillStyle='#8b8772';ctx.fillRect(px(98),pz(174),8*s,180*s);ctx.fillStyle='#5b6664';for(const b of HARBOR6.obstacles)if(b.h>1)ctx.fillRect(px(b.minx),pz(b.minz),(b.maxx-b.minx)*s,(b.maxz-b.minz)*s);
 for(const [p,label]of [[HARBOR6.base,'B'],[HARBOR6.port,'P'],[HARBOR6.heliPort,'H']]){ctx.fillStyle='#a5d1b6';ctx.fillRect(px(p.x)-5,pz(p.z)-5,10,10);ctx.fillStyle='#193b43';ctx.font='bold 10px monospace';ctx.textAlign='center';ctx.fillText(label,px(p.x),pz(p.z)+3);}
 if(experience.mission){const q=harborTarget6();ctx.strokeStyle='#f9d48b';ctx.lineWidth=2;ctx.beginPath();ctx.arc(px(q.x),pz(q.z),7,0,TAU);ctx.stroke();for(const e of combat.units)if(e.alive&&(e.canSee||dist2(e.pos,player.pos)<22)){ctx.fillStyle='#df9276';ctx.fillRect(px(e.pos.x)-2,pz(e.pos.z)-2,4,4);}}
};
const report5=reportTelemetry;reportTelemetry=function(now,elapsed){report5(now,elapsed);samplePerformance6(elapsed*1000);if(settings.showStats&&$('perf-panel')){$('perf-panel').textContent+='\nGPU '+(profiler6.gpuMs===null?'N/A':profiler6.gpuMs.toFixed(2)+' ms')+' / LONG TASKS '+profiler6.longTasks+'\nRULE PROJECTILES '+combat.projectiles.length+' / VISUAL CAP '+RENDER.particles;}};
const clear5=clearTouchInput;clearTouchInput=function(){clear5();experience.input.interact=false;experience.input.look=false;experience.flight.touchPitch=experience.flight.touchSteer=0;if(wheelHeld6){clearTimeout(wheelHeld6);wheelHeld6=null;}};
const setup5=setupUI;setupUI=function(){setup5();};
const serialise5=serialiseSave;serialiseSave=function(){const d=serialise5();d.version=6;d.experience={options:{...experience.options},progress:JSON.parse(JSON.stringify(experience.progress)),mission:experience.mission?JSON.parse(JSON.stringify(experience.mission)):null,guards:experience.mission?combat.units.map(e=>({role:e.role,pos:{...e.pos},home:{...e.home},yaw:e.yaw,hp:e.hp,alive:e.alive,ammo:e.ammo,staticPost:e.staticPost,suspicion:e.suspicion,mode:e.mode,lastKnown:e.lastKnown?{...e.lastKnown}:null})):[],fleet:cars.filter(c=>c.harborKind).map(c=>({kind:c.harborKind,pos:{...c.pos},yaw:c.yaw,hp:c.hp})),carHarborKind:state.car?.harborKind||null};return d;};
const validate5=validateSave;validateSave=function(raw){if(typeof raw==='string'&&raw.length>2500000)throw Error('Save too large');let d=typeof raw==='string'?JSON.parse(raw):raw;if(d?.payload){if(typeof d.payload!=='string'||hashText(d.payload)!==d.checksum)throw Error('Save checksum mismatch');d=JSON.parse(d.payload);}if(d?.version!==6)return validate5(raw);validate5({...d,version:5});if(!d.experience||typeof d.experience!=='object')throw Error('Missing V6 data');if(d.experience.mission&&!ROUTES6[d.experience.mission.route])throw Error('Unknown mission route');if(d.experience.mission&&!STAGES6[d.experience.mission.stage])throw Error('Unknown mission stage');return d;};
const apply5=applySave;applySave=function(d){const v6=d.version===6,x=v6?d.experience:null;experience.mission=null;apply5(v6?{...d,version:5,combat:{...d.combat,job:null,units:[]}}:d);spawnHarborVehicles6();if(!x)return;
 const f=finite,p=x.progress||{};experience.progress={wins:Math.floor(f(p.wins,0,99999,0)),best:p.best==null?null:f(p.best,.1,999999,null),routes:(Array.isArray(p.routes)?p.routes:[]).filter(r=>['land','sea','air'].includes(r)),portUnlocked:!!p.portUnlocked,helipadUnlocked:!!p.helipadUnlocked,ledger:Array.from(new Set((Array.isArray(p.ledger)?p.ledger:[]).filter(v=>typeof v==='string'&&v.length<100))).slice(-100)};
 const o=x.options||{};experience.options.flight=o.flight==='advanced'?'advanced':'assisted';experience.options.lockToggle=o.lockToggle!==false;experience.options.shake=f(o.shake,0,1,.35);experience.options.lookSensitivity=f(o.lookSensitivity,.4,1.8,1);experience.options.showLabels=o.showLabels!==false;
 const vec=p=>V(f(p?.x,-950,950,HARBOR6.base.x),f(p?.y,-2,430,.24),f(p?.z,-950,950,HARBOR6.base.z));
 for(const a of(Array.isArray(x.fleet)?x.fleet:[]).slice(0,4)){const c=cars.find(c=>c.harborKind===a.kind);if(!c)continue;c.pos=vec(a.pos);c.prevPos={...c.pos};c.yaw=f(a.yaw,-1e5,1e5,0);c.prevYaw=c.yaw;c.hp=f(a.hp,0,100,100);c.speed=0;c.vel=V();}
 if(x.mission&&regionId==='coast'&&!contract&&!expeditionJob&&!combat.job){const j=x.mission,id=typeof j.id==='string'&&j.id.length<100?j.id:'restored-'+Date.now();if(!experience.progress.ledger.includes(id)){
 experience.mission={id,route:j.route,stage:j.stage,difficulty:j.difficulty==='normal'?'normal':'easy',elapsed:f(j.elapsed,0,86400,0),hold:0,cargo:f(j.cargo,1,100,100),carrying:j.stage==='extract',terminal:['recover','extract'].includes(j.stage),used:(Array.isArray(j.used)?j.used:[]).filter(v=>['land','sea','air'].includes(v)),lastMedium:['land','sea','air'].includes(j.lastMedium)?j.lastMedium:ROUTES6[j.route].medium,detected:f(j.detected,0,86400,0),quiet:0,kills:0,checkpoint:j.stage,scoreStart:f(j.scoreStart,0,999999,combat.score.kills),damage:f(j.damage,0,999999,0)};
 combat.difficulty=experience.mission.difficulty;combat.center={...HARBOR6.port};combat.units.length=0;
 for(const a of(Array.isArray(x.guards)?x.guards:[]).slice(0,8)){if(!ENEMY_TYPES[a.role])continue;const u=spawnCombatUnit(a.role,vec(a.pos));u.pos=vec(a.pos);u.prevPos={...u.pos};u.home=vec(a.home);u.yaw=f(a.yaw,-1e5,1e5,0);u.homeYaw=u.yaw;u.hp=f(a.hp,0,u.maxHP,u.maxHP);u.alive=!!a.alive&&u.hp>0;u.ammo=Math.floor(f(a.ammo,0,ENEMY_TYPES[a.role].mag,ENEMY_TYPES[a.role].mag));u.staticPost=!!a.staticPost;u.suspicion=f(a.suspicion,0,1,0);u.lastKnown=a.lastKnown?vec(a.lastKnown):null;u.mode=u.lastKnown?'SEARCH':'PATROL';u.alertUntil=u.lastKnown?state.t+7:0;}
 if(!combat.units.length)spawnPortGuards6();experience.director={phase:'calm',until:0,lastDamage:state.t-30,lastAlarm:state.t-30,reinforced:combat.units.length>4};
 const c=cars.find(c=>c.harborKind===x.carHarborKind);if(c){state.car=c;player.pos={...c.pos};c.airborne=c.medium==='air'&&c.pos.y>ground(c.pos)+.5;}player.prevPos={...player.pos};
 }}syncCraftUI();syncFlightTarget6();updateExperienceUI6();};
const start5=startGame;startGame=function(){start5();if(experience.mission){$('start').textContent='\u7ee7\u7eed\u6e2f\u53e3\u884c\u52a8';toast('H / \u884c\u52a8\u7b80\u62a5 \u00b7 E / \u4ea4\u4e92 \u00b7 Ctrl / \u8e72\u4f0f');}cam.prevEye={...cam.eye};cam.prevDir={...cam.dir};updateExperienceUI6();};
const init5=init;init=function(){init5();if(!renderer)return;setupExperienceUI6();initProfiler6();spawnHarborVehicles6();applyQuality6();
 window.__experience={experience,profiler:profiler6,state,player,cars,combat,cam,keys,mouse,touch,weapons,harbor:HARBOR6,quality:quality6,renderer,
 start:startHarbor6,finish:finishHarbor6,update,render,ground,waterAt,walkable6,localPath6,perception6,spawnProjectile,projectileCapacity6,
 snapshotActors,serialiseSave,validateSave,applySave,report:diagnosticReport6,checks:runInvariantChecks6,record:startRecording6,open:openExperiencePanel6,
 target:harborTarget6,toggleCar,interact:missionInteract6,scopeActive,shoot,fireCannon,fireMissile,switchWeapon,loadRegionSync,
 startCombat,startGame,pauseGame,drawPerson,deployVehicle,updateAirCombat,applyQuality6};
 if(!experience.mission&&!saveLoaded){cam.eye=V(190,48,329);updateCamera(.016,true);}cam.prevEye={...cam.eye};cam.prevDir={...cam.dir};render(1);
};
