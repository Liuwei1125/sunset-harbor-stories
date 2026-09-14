/* Harbor Armory: one authored pose drives hands, moving parts and muzzle sockets.
   Cosmetic pools are bounded and never own collision, damage, or saved ammo. */
Object.assign(HARBOR_ASSET_PACK7.meshes,ARMORY_ASSET_PACK8.meshes);
Object.assign(WORKSHOP7.assets,ARMORY_ASSET_PACK8.assets);
const ARMORY8={shot:null,reloading:null,casings:[],motes:[],marks:[],bodies:[],bursts:[],serial:0,
 profiles:{
  pistol:{asset:'sidearm-pistol',kick:.020,return:18,bloom:.07,flash:.14,flashTime:.045,eject:0,sound:[2500,.085,170,.18],noise:48},
  smg:{asset:'vector-smg',kick:.013,return:22,bloom:.085,flash:.13,flashTime:.033,eject:0,sound:[3400,.055,210,.14],noise:65},
  shotgun:{asset:'pump-shotgun',kick:.064,return:9,bloom:.22,flash:.34,flashTime:.072,eject:.24,sound:[1250,.22,72,.32],noise:92},
  rifle:{asset:'ar7-rifle',kick:.028,return:15,bloom:.13,flash:.23,flashTime:.044,eject:.022,sound:[2250,.115,123,.23],noise:82},
  sniper:{asset:'longwatch-sniper',kick:.045,return:7,bloom:.26,flash:.32,flashTime:.065,eject:.34,sound:[1750,.28,60,.30],noise:110},
  grenade:{asset:'pulse-grenade',kick:.01,return:14,bloom:0,flash:0,noise:16},
  molotov:{asset:'ember-bottle',kick:.01,return:14,bloom:0,flash:0,noise:16},
  launcher:{asset:'comet-launcher',kick:.052,return:8,bloom:.2,flash:.4,flashTime:.09,noise:105,sound:[780,.3,52,.30]},
 }};
weapons.forEach((w,i)=>{w.id=w.id||WEAPON_META[i].id;});
const profile8=(w=weapons[state.weapon])=>ARMORY8.profiles[w?.id]||ARMORY8.profiles.rifle;
const budget8=()=>RENDER.tier===0||renderer?.software?{casings:14,motes:36,marks:12,bodies:2,bursts:4}:{casings:48,motes:110,marks:42,bodies:5,bursts:10};
function bounded8(array,value,max){array.push(value);if(array.length>max)array.splice(0,array.length-max);return value;}
function ease8(a,b,x){const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);}

function weaponAction8(index,enemy){
 const w=weapons[index],reload=enemy?enemy.reload>0:state.weapon===index&&state.reload>0;
 const rt=reload?clamp(1-(enemy?enemy.reload:state.reload)/(enemy?ENEMY_TYPES[enemy.role].reload:state.reloadTotal||w.reloadTime),0,1):0;
 const shot=enemy?{index,time:enemy.shotUntil-.08}:ARMORY8.shot;
 const age=shot?.index===index&&Number.isFinite(shot.time)?Math.max(0,state.t-shot.time):99,p=profile8(w);
 const recoil=age<1?Math.exp(-age*p.return)*Math.sin(Math.min(1,age/.035)*PI/2)*p.kick:0;
 const cycle=w.id==='sniper'?ease8(.20,.40,age)*(1-ease8(.54,.72,age)):w.id==='shotgun'?ease8(.13,.27,age)*(1-ease8(.34,.49,age)):ease8(0,.023,age)*(1-ease8(.035,.09,age));
 const mag=reload&&w.id!=='shotgun'?ease8(.14,.31,rt)*(1-ease8(.55,.77,rt)):0;
 const tilt=reload?ease8(0,.17,rt)*(1-ease8(.82,1,rt)):0;
 return {reload,rt,age,recoil,cycle,mag,tilt};
}

function weaponPose8(p=player.pos,yaw=player.yaw,phase=player.phase,index=state.weapon,options={}){
 const e=options.enemy,civil=options.civil,w=weapons[index],a=weaponAction8(index,e);
 const moving=e?(e.moving?1:0):civil?1:experience.movement,run=e||civil?0:experience.runBlend;
 const crouch=e?(e.mode==='COVER'?.30:0):civil?0:experience.crouching?.34:0;
 const bob=Math.abs(Math.sin(phase||0))*moving*.030+Math.sin(state.t*1.7)*.005;
 const bodyY=1.25-crouch,aiming=e||(!civil&&(options.forceAim||isAiming()||state.t-effects.shotAt<.30));
 const pitch=aiming?(e?Math.atan2(visibleTarget().y-unitChest(e).y,Math.max(1,dist2(e.pos,player.pos))):clamp(cam.pitch,-.7,.7)):0;
 const reach=({pistol:.52,smg:.36,rifle:.34,shotgun:.25,sniper:.29,launcher:.30,grenade:.44,molotov:.44})[w.id]||.34;
 const rightHand=V(.25,bodyY+.06+Math.sin(pitch)*.26-a.tilt*.10,-(aiming?reach*Math.cos(pitch):reach*.8)+a.recoil*.7);
 if(!e&&w.throwable&&a.age<.5){const follow=ease8(0,.13,a.age)*(1-ease8(.25,.5,a.age));rightHand.y+=follow*.15;rightHand.z-=follow*.24;}
 const localBasis=basis(a.tilt*.22,a.tilt*.52+(aiming?pitch:-.16)+a.recoil,a.tilt*.10);
 const gripOffset=V(0,w.throwable?0:.14,.02);
 const base=basis(yaw),rotation=bmul(base,localBasis),origin=add(add(p,V(0,bob,0)),bx(base,add(rightHand,bx(localBasis,gripOffset))));
 const asset=WORKSHOP7.assets[profile8(w).asset],s=asset?.joints;
 const socket=(name,fallback)=>add(origin,bx(rotation,V(...(s?.[name]?.pivot||fallback))));
 const support=s?.support?.pivot||[0,-.035,-.20];let leftHand=add(rightHand,bx(localBasis,add(gripOffset,V(...support))));
 if(a.reload){leftHand=add(rightHand,bx(localBasis,V(.02,-.20-a.mag*.16,-.22+a.tilt*.07)));if(w.id==='shotgun')leftHand.y+=Math.sin(a.rt*TAU*3)*.045;}
 else if(w.id==='shotgun')leftHand=add(leftHand,bx(localBasis,V(0,0,a.cycle*.13)));
 if(w.throwable)leftHand=V(-.26,bodyY-.19,-.21);
 return {origin,rotation,rightHand,leftHand,localBasis,gripOffset,bob,action:a,
  muzzle:socket('muzzle',[0,0,w.id==='pistol'?-.574:w.id==='smg'?-.804:w.id==='launcher'?-.88:-.1]),
  eject:socket('eject',[.075,.05,-.19]),forward:bx(rotation,V(0,0,-1))};
}

const weaponModelBefore8=weaponModel;
weaponModel=function(b,index,x,y,z,enemy=null){
 const w=weapons[index],asset=profile8(w).asset;
 if(!asset||!WORKSHOP7.assets[asset])return weaponModelBefore8(b,index,x,y,z);
 const parent=b.parent,origin=b.origin,base=add(origin,bx(parent,V(x,y,z))),a=weaponAction8(index,enemy);
 const lod=renderer.software||RENDER.tier===0||dist2(base,cam.eye)>24?'low':'high';
 for(const part of workshopParts7(asset,lod)){
  const joint=WORKSHOP7.assets[asset].joints[part.part],pivot=V(...joint.pivot);let offset=V(),r=ID;
  if(joint.motion==='magazine'){offset=V(a.mag*.05,-a.mag*.24,a.mag*.07);r=basis(0,a.mag*.15,a.mag*.08);}
  else if(joint.motion==='bolt'){offset.z=a.cycle*(w.id==='sniper'?.13:.055);if(a.reload)offset.z+=ease8(.76,.86,a.rt)*(1-ease8(.89,.97,a.rt))*.10;}
  else if(joint.motion==='slide')offset.z=a.cycle*.075;
  else if(joint.motion==='pump')offset.z=a.cycle*.13;
  else if(joint.motion==='round')offset.z=a.mag*.55;
  b.origin=add(base,bx(parent,add(pivot,offset)));b.parent=bmul(parent,r);
  b.put(part.name,part.color,0,0,0,1,1,1,0,0,0,1,part.unlit);
 }
 b.parent=parent;b.origin=origin;
};

function gunSound8(w){
 if(!audio||state.muted)return;const p=profile8(w);if(!p.sound)return;
 const [hz,duration,body,gain]=p.sound,{ctx,master,buffer}=audio,t=ctx.currentTime;
 const noise=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),g=ctx.createGain();noise.buffer=buffer;
 filter.type='lowpass';filter.frequency.setValueAtTime(hz,t);filter.frequency.exponentialRampToValueAtTime(hz*.4,t+duration);
 g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);
 noise.connect(filter);filter.connect(g);g.connect(master);noise.start(t);noise.stop(t+duration+.02);
 tone(body,duration*.75,gain*.45,'triangle',body*.34);
 // A short metallic transient makes the mechanism audible at modest volume.
 tone(w.id==='sniper'?1250:w.id==='shotgun'?620:1850,.027,.025,'triangle',360);
}

function beginShot8(w){
 ARMORY8.shot={index:state.weapon,time:state.t,serial:++ARMORY8.serial,ejected:false};
 const pose=weaponPose8(player.pos,player.yaw,player.phase,state.weapon,{forceAim:true});
 ARMORY8.shot.pose=pose;return pose;
}

function surface8(hit,p){
 if(hit.type==='ground')return waterAt(p)?'water':'concrete';
 if(['car','jet','enemy'].includes(hit.type))return 'metal';
 if(hit.type==='soldier')return hit.object.role==='heavy'?'armor':'cloth';
 return hit.object?.surface||'concrete';
}
function normal8(hit,p,dir){
 if(hit.type==='ground')return V(0,1,0);const b=hit.object;
 if(hit.type==='wall'&&b){
  const edges=[[Math.abs(p.x-b.minx),V(-1,0,0)],[Math.abs(p.x-b.maxx),V(1,0,0)],[Math.abs(p.z-b.minz),V(0,0,-1)],[Math.abs(p.z-b.maxz),V(0,0,1)],[Math.abs(p.y-(b.maxy??b.h)),V(0,1,0)]];
  edges.sort((a,b)=>a[0]-b[0]);return edges[0][1];
 }return mul(dir,-1);
}
function impact8(hit,p,dir,heavy=false){
 if(hit.type==='none')return;const material=surface8(hit,p),n=normal8(hit,p,dir),cap=budget8();
 const metal=material==='metal'||material==='armor',water=material==='water',wood=material==='wood';
 const color=metal?'#ffe0a0':water?'#b5e0e2':wood?'#b58954':material==='cloth'?'#acb2a0':'#bdb6a8';
 const count=(heavy?7:4)*(RENDER.tier===0?.5:1);
 for(let i=0;i<count;i++)bounded8(ARMORY8.motes,{pos:add(p,mul(n,.018)),prev:{...p},vel:add(mul(n,metal?3:1.4),V((Math.random()-.5)*2,Math.random()*2,(Math.random()-.5)*2)),age:0,life:metal?.19+Math.random()*.16:water?.5:.65,color,size:water?.07:wood?.045:metal?.015:.08,kind:metal?'spark':wood?'chip':water?'drop':'dust'},cap.motes);
 if((hit.type==='wall'||hit.type==='ground')&&!water)bounded8(ARMORY8.marks,{pos:add(p,mul(n,.015)),normal:n,age:0,life:9,size:heavy?.14:.075,color:wood?'#624a36':'#485056'},cap.marks);
 if(water)bounded8(ARMORY8.marks,{pos:V(p.x,Math.max(ground(p),p.y)+.02,p.z),normal:V(0,1,0),age:0,life:.7,size:.36,color:'#aed8dc',water:true},cap.marks);
}

function traceWeapon8(pose,dir,range){
 let hit=combatRay(cam.eye,dir,range),end=add(cam.eye,mul(dir,hit.t));
 const floor=rayGround(cam.eye,dir,hit.t);if(floor<hit.t){hit={type:'ground',t:floor};end=add(cam.eye,mul(dir,floor));}
 // A barrel protruding through cover must never bypass the cover behind its tip.
 const chest=add(player.pos,V(0,experience.crouching?1.01:1.35,0)),arm=sub(pose.muzzle,chest),armLen=length(arm),armDir=norm(arm);
 const near=obstacleHit(chest,armDir,armLen);
 if(near.type!=='none')return {hit:near,end:add(chest,mul(armDir,near.t)),dir:armDir,distance:near.t,blocked:true};
 const delta=sub(end,pose.muzzle),len=length(delta),md=norm(delta);
 const block=combatRay(pose.muzzle,md,Math.max(0,len-.025));
 if(block.type!=='none'){hit=block;end=add(pose.muzzle,mul(md,block.t));}
 return {hit,end,dir:md,distance:length(sub(end,pose.muzzle)),blocked:false};
}
function weaponDamage8(w,distance){
 if(w.id!=='shotgun')return w.damage;
 return w.damage*mix(1,.23,ease8(10,w.range,distance));
}

const reloadBefore8=reload;
reload=function(){
 if(!state.started||state.paused||state.dead||state.transition)return;
 reloadBefore8();if(state.reload<=0)return;
 const w=weapons[state.weapon];
 if(!ARMORY8.reloading||ARMORY8.reloading.index!==state.weapon){
  const shells=w.id==='shotgun',count=Math.min(w.mag-w.ammo,w.reserve),total=shells?.22+count*.36+.20:w.reloadTime;
  state.reload=state.reloadTotal=total;ARMORY8.reloading={index:state.weapon,total,elapsed:0,inserted:0,count,shells,stage:0};
 }
};
function cancelReload8(){state.reload=0;ARMORY8.reloading=null;}
function updateReload8(dt){
 if(state.reload<=0){ARMORY8.reloading=null;return;}
 const w=weapons[state.weapon],r=ARMORY8.reloading;
 if(r&&r.index!==state.weapon){cancelReload8();return;}
 state.reload=Math.max(0,state.reload-dt);
 if(r){
  r.elapsed=r.total-state.reload;
  if(r.shells){
   while(r.inserted<r.count&&r.elapsed>=.22+(r.inserted+1)*.36){if(w.reserve>0&&w.ammo<w.mag){w.ammo++;w.reserve--;tone(470,.04,.035,'triangle',250);}r.inserted++;}
  }else{
   const stage=r.elapsed/r.total>.79?3:r.elapsed/r.total>.60?2:r.elapsed/r.total>.20?1:0;
   if(stage>r.stage){tone(stage===2?420:800,.048,.035,'triangle',180);r.stage=stage;}
  }
 }
 if(state.reload===0){
  if(!r?.shells){const n=Math.min(w.mag-w.ammo,w.reserve);w.ammo+=n;w.reserve-=n;}
  ARMORY8.reloading=null;recordEvent6('reload-complete',{weapon:state.weapon,ammo:w.ammo});updateHUD();
 }
}

function updateArmory8(dt){
 const cap=budget8(),s=ARMORY8.shot,w=s&&weapons[s.index];
 if(s&&!s.ejected&&!w.throwable&&w.id!=='launcher'&&state.t-s.time>=profile8(w).eject){
  s.ejected=true;
  if(state.weapon===s.index&&!state.car){const pose=weaponPose8(),shell=w.id==='shotgun';
   bounded8(ARMORY8.casings,{pos:{...pose.eject},vel:bx(pose.rotation,V(1.3+Math.random()*.6,1.2+Math.random()*.6,.3)),age:0,life:shell?2.4:1.6,shell,angle:Math.random()*TAU,bounces:0},cap.casings);
   if(w.id==='shotgun'||w.id==='sniper')tone(w.id==='shotgun'?460:970,.085,.025,'triangle',190);
  }
 }
 for(const pool of ['casings','motes','marks','bodies','bursts']){
  const a=ARMORY8[pool];for(let i=a.length-1;i>=0;i--){const p=a[i];p.age+=dt;if(p.age>=p.life){a.splice(i,1);continue;}
   if(!p.vel)continue;p.prev={...p.pos};p.vel.y-=dt*(p.kind==='dust'?1.2:9);p.pos=add(p.pos,mul(p.vel,dt));
   const floor=ground(p.pos)+.025;if(p.pos.y<floor){p.pos.y=floor;
    if(pool==='casings'&&!waterAt(p.pos)&&p.bounces<2){p.vel.y=Math.abs(p.vel.y)*.26;p.vel.x*=.48;p.vel.z*=.48;p.bounces++;}
    else{p.vel=V();if(waterAt(p.pos))p.age=p.life;}
   }
   if(pool==='casings')p.angle+=dt*(p.bounces?1:18);
  }
  if(a.length>cap[pool])a.splice(0,a.length-cap[pool]);
 }
}

function normalBasis8(n){const x=norm(cross(Math.abs(n.z)<.9?V(0,0,1):V(1,0,0),n)),z=cross(x,n);return [x.x,n.x,z.x,x.y,n.y,z.y,x.z,n.z,z.z];}
function drawArmory8(b,ef){
 const s=ARMORY8.shot,w=weapons[state.weapon],profile=profile8(w);
 if(s&&s.index===state.weapon&&!state.car&&state.t-s.time<(profile.flashTime||0)){
  const pose=weaponPose8(),p=pose.muzzle,sz=profile.flash,fade=1-(state.t-s.time)/profile.flashTime;
  ef.origin=p;ef.parent=pose.rotation;
  ef.put('sphere','#fff6d5',0,0,-.045,sz*.42,sz*.42,sz*.75,0,0,0,.94*fade,true);
  for(let i=0;i<3;i++)ef.put('cone',i?'#ffc76c':'#ffe5a2',Math.sin(i*2.1)*sz*.11,Math.cos(i*2.1)*sz*.1,-sz*.38,sz*.22,sz*(i?.7:1.2),sz*.22,0,-PI/2,0,.75*fade,true);
  ef.world();
 }
 if(w.id==='molotov'&&!state.car&&w.ammo>0&&(!s||s.index!==state.weapon||state.t-s.time>.45)){
  const p=weaponPose8().muzzle;ef.put('armory_flame8','#ffd080',p.x,p.y,p.z,.28,.18+Math.sin(state.t*15)*.035,.28,state.t*4,0,0,.8,true);
 }
 for(const p of ARMORY8.casings){if(!isActorVisible(p.pos,1))continue;
  b.put('cyl',p.shell?'#ad674d':'#c8a05b',p.pos.x,p.pos.y,p.pos.z,p.shell?.041:.022,p.shell?.085:.047,p.shell?.041:.022,p.angle,p.angle*.7);
 }
 for(const p of ARMORY8.motes){if(!isActorVisible(p.pos,2))continue;const fade=1-p.age/p.life;
  if(p.kind==='spark')ef.beam(p.color,p.prev||p.pos,add(p.pos,mul(p.vel,.025)),p.size,fade,true);
  else{const size=p.size*(p.kind==='dust'?1+p.age*3:1);ef.put(p.kind==='chip'?'box':'sphere',p.color,p.pos.x,p.pos.y,p.pos.z,size,size*(p.kind==='drop'?1.8:1),size,p.age*3,0,0,fade*(p.kind==='dust'?.5:.9),true);}
 }
 for(const p of ARMORY8.marks){if(!isActorVisible(p.pos,2))continue;ef.origin=p.pos;ef.parent=normalBasis8(p.normal);
  const fade=Math.min(1,(p.life-p.age)*2),size=p.size*(p.water?1+p.age*4:1);
  if(size>.5&&!p.water){ef.world();softPuff8(ef,p.pos,size,size,p.color,fade*.65,1,p.normal);continue;}
  ef.put(p.water?'ring':'disc',p.color,0,0,0,size,p.water?size:1,size,0,p.water?PI/2:0,0,fade*(p.water?.4:.62),true);ef.world();
 }
 for(const corpse of ARMORY8.bodies)if(isActorVisible(corpse.pos,3))drawHumanoid6(b,corpse.pos,corpse.yaw,0,corpse.role==='marksman'?4:3,{enemy:corpse,dying:true,deathAge:corpse.age});
}

const damageUnitBefore8=damageUnit;
damageUnit=function(e,amount,part='body',source='player'){
 const alive=e?.alive;damageUnitBefore8(e,amount,part,source);if(!alive)return;
 e.flinchUntil=state.t+.22;e.flinchSize=Math.min(.11,amount*.0018);
 if(!e.alive)bounded8(ARMORY8.bodies,{...e,pos:{...e.pos},moving:false,reload:0,flash:0,age:0,life:3.5},budget8().bodies);
};
const clearEncounterBefore8=clearCombatEncounter;
clearCombatEncounter=function(){clearEncounterBefore8();for(const key of ['casings','motes','marks','bodies','bursts'])ARMORY8[key].length=0;ARMORY8.shot=null;cancelReload8();};
const switchBefore8=switchWeapon;
switchWeapon=function(i){const old=state.weapon;switchBefore8(i);if(state.weapon!==old){ARMORY8.reloading=null;ARMORY8.shot=null;}};
const updateBefore8=update;
update=function(dt){const time=state.t;updateBefore8(dt);if(state.started&&state.t>time)updateArmory8(state.t-time);};
const cameraBeforeArmory8=updateCamera;
updateCamera=function(dt,preview=false){
 cameraBeforeArmory8(dt,preview);
 if(preview||state.car){cam.armoryFov8=null;return;}
 const target=scopeActive()?2*Math.atan(Math.tan(66*PI/360)/combat.scopeZoom):cam.fov6||66*PI/180;
 cam.armoryFov8=mix(cam.armoryFov8??66*PI/180,target,1-Math.exp(-dt*22));
 cam.vp=matmul(perspective(cam.armoryFov8,innerWidth/innerHeight,.055,2100),lookAt(cam.eye,add(cam.eye,cam.dir)));
};
const renderActorsBefore8=renderWorldActors;
renderWorldActors=function(alpha){renderActorsBefore8(alpha);drawArmory8(dynamic,fx);};
window.__armory8={state:ARMORY8,pose:weaponPose8,profile:profile8,budget:budget8,trace:traceWeapon8,damage:weaponDamage8,impact:impact8};
