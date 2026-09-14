/* Original combat props and animated aircraft, in meters with -Z forward. */
function makeCombatShapes(){
 loftMesh('v5_jetbody',[[-6.8,.018,.02,.03],[-5.65,.30,.27,.06],[-3.7,.62,.49,.09],[-1.7,.91,.68,.03],[.2,1.03,.65,0],[2.8,.88,.54,0],[4.25,.66,.46,.02],[4.55,.02,.04,.02]],24);
 polygonMesh('v5_delta',[[-.58,.05,-2.45],[-5.45,-.03,1.75],[-5.7,-.02,2.73],[-1,.08,2.47]],.10);
 polygonMesh('v5_canard',[[-.42,.12,-3.95],[-1.95,.10,-2.68],[-2.12,.09,-2.25],[-.5,.15,-2.8]],.08);
 polygonMesh('v5_jetfin',[[0,0,-.4],[0,2.4,1.03],[0,2.18,1.97],[0,.03,2.06]],.075);
 loftMesh('v5_missile',[[-.9,.01,.01],[-.55,.10,.10],[.6,.10,.1],[.7,.03,.03]],12);
}
makeCombatShapes();
const weaponModelBefore5=weaponModel;
weaponModel=function(b,i,x,y,z){
 if(i<3)return weaponModelBefore5(b,i,x,y,z);
 const root=b.parent,org=b.origin;b.origin=add(org,bx(root,V(x,y,z)));
 const id=weapons[i]?.id;
 if(id==='grenade'){b.put('sphere','#74836c',0,-.02,-.07,.19,.25,.19);b.box('#344954',0,.07,-.08,.16,.055,.18);b.box('#e7c282',0,.02,-.18,.055,.055,.012,0,0,0,1,true);}
 else if(id==='molotov'){b.put('cyl','#9a774d',0,-.03,-.06,.14,.28,.14);b.put('sphere','#d4a461',0,.13,-.06,.13,.10,.13);b.put('cyl','#5e8b75',0,.205,-.06,.062,.14,.062);b.box('#ddd0a8',0,-.02,-.135,.11,.13,.01);}
 else if(id==='launcher'){b.put('cyl','#4d645e',0,.05,-.3,.21,1.07,.21,0,PI/2);b.put('cyl','#263b42',0,.05,-.855,.23,.065,.23,0,PI/2);b.put('cyl','#acb4a1',0,.05,.22,.26,.04,.26,0,PI/2);b.box('#273b45',0,-.16,-.10,.09,.26,.13);b.box('#93aba8',0,.22,-.28,.09,.11,.14);}
 else {
 const sniper=id==='sniper',len=sniper?1.15:.78;
 softBox(b,sniper?'#a1957a':'#59686e',0,.0,-.22,.115,.13,.47);
 b.box('#243943',0,-.13,-.12,.09,.25,.10,0,-.15);
 b.box('#263a40',0,-.18,-.30,.08,.23,.14,0,.1);
 b.box('#41565c',0,-.005,.21,.13,.18,.30,0,.12);
 b.put('cyl','#293e47',0,.03,-.5-len*.25,.047,len*.72,.047,0,PI/2);
 b.put('cyl','#617277',0,.03,-.51-len*.59,.082,.075,.082,0,PI/2);
 for(let j=0;j<4;j++)b.box('#82928d',0,.10,-.13-j*.085,.083,.015,.035);
 if(sniper){b.box('#263a44',0,.125,-.18,.06,.11,.28);b.put('cyl','#253b47',0,.225,-.21,.09,.46,.09,0,PI/2);b.put('cyl','#1c303a',0,.225,-.48,.145,.12,.145,0,PI/2);b.put('disc','#71a7b4',0,.225,-.546,.12,1,.12,0,PI/2,0,1,true);b.put('cyl','#31434b',0,.30,-.20,.07,.07,.07);}
 else{b.box('#a0b5ad',0,.16,-.20,.03,.12,.08);b.box('#394f59',0,.155,-.37,.02,.065,.06);}
 }
 b.parent=root;b.origin=org;
};
function drawFighter(b,c,t){
 b.transform(add(c.pos,V(0,1.17,0)),c.yaw,c.pitch||0,c.roll||0);
 const dead=c.hp<=0,col=dead?'#48545b':c.color||'#a2b4bf';
 b.put('v5_jetbody',col,0,0,0);
 b.put('sphere','#243f54',0,.61,-2.48,.98,.82,2.75);
 b.beam('#b7c6c6',V(0,.82,-3.45),V(0,1.02,-1.61),.055);
 for(const s of [-1,1]){
  b.put('v5_delta',col,0,-.05,.2,s,1,1);b.put('v5_canard','#b3bdbb',0,-.02,0,s,1,1);
  b.put('v5_jetfin',col,s*.79,.13,2.16,1,1,1,0,0,-s*.2);
  b.box('#48616e',s*.82,.15,-.69,.39,.38,1.9,0,0,s*.06);
  b.box('#172e3a',s*.85,.11,-1.66,.31,.31,.06,0,.15);
  b.put('cyl','#314650',s*.43,-.04,3.90,.57,.6,.57,0,PI/2);
  b.put('cyl','#151f2a',s*.43,-.04,4.25,.44,.09,.44,0,PI/2);
  b.put('disc',c.afterburner?'#ffe2aa':'#df9a73',s*.43,-.04,4.30,.27,1,.27,0,PI/2,0,1,true);
  if(c.afterburner&&c.hp>0){b.put('cone','#d1e8ff',s*.43,-.04,4.9,.36,1.5,.36,0,-PI/2,0,1,true);b.put('cone','#f7be85',s*.43,-.04,5.5,.19,1.0,.19,0,-PI/2,0,1,true);}
  for(const x of [2.0,3.5]){b.box('#536973',s*x,-.14,.65,.1,.34,.6);b.put('v5_missile','#ccd8d3',s*x,-.34,.32,.85,.85,1.25);b.box('#78928f',s*x,-.34,1.05,.45,.025,.25);}
  b.box(c.enemy?'#bc6e55':'#cf9b54',s*3.6,.034,1.94,.70,.018,.46,-s*.50);
  navLight(b,s*5.48,.05,2.1,s<0?'#fa7d6b':'#86edbf',t,s);
  if(!c.airborne){b.beam('#7f9598',V(s*.8,-.42,.5),V(s*1.3,-.92,.82),.095);v4Wheel(b,s*1.35,-.92,.82,.32,c.wheel||0);}
 }
 if(!c.airborne){b.beam('#90a3a3',V(0,-.2,-3.42),V(0,-.91,-3.42),.1);v4Wheel(b,0,-.91,-3.42,.26,c.wheel||0,c.steerVisual||0);}
 b.box('#dbdcd3',0,.68,.52,.20,.025,1.70);b.world();
}
const drawCarBefore5=drawCar;
drawCar=function(b,c,t){return c.kind==='fighter'?drawFighter(b,c,t):drawCarBefore5(b,c,t);};
const drawPersonBefore5=drawPerson;
drawPerson=function(b,p,yaw,phase,i=0,ghost=false){if(!ghost&&p===player.pos&&scopeActive())return;drawPersonBefore5(b,p,yaw,phase,i,ghost);};
function drawCombatUnit(b,e,t){
 const far=combatDistance(e.pos,cam.eye)>75,heavy=e.role==='heavy',d=ENEMY_TYPES[e.role];
 b.transform(e.pos,e.yaw);const col=e.flash>0?'#f3d4a4':d.color;
 const crouch=e.mode==='COVER'?.22:0,bodyY=1.23-crouch;
 b.put('torso',col,0,bodyY,0,heavy?.78:.63,.67,.42);
 softBox(b,'#243b44',0,bodyY-.01,-.22,heavy?.68:.51,.46,.09);
 b.put('cyl','#52626a',0,1.62-crouch,0,.22,.23,.22);
 b.put('sphere','#57686c',0,1.86-crouch,0,.39,.45,.37);
 b.put('sphere','#30444d',0,2.02-crouch,.01,heavy?.47:.40,.28,.41);
 b.put('sphere','#263b46',0,1.80-crouch,-.14,.35,.22,.16);
 b.box('#e4be89',0,1.92-crouch,-.177,.25,.055,.015);
 for(const s of [-1,1]){
  const sw=e.moving?Math.sin(e.phase+(s>0?PI:0))*.28:0;
  capsule(b,'#374c55',V(s*.18,.90-crouch,0),V(s*.18,.50,sw),.23);
  capsule(b,'#435762',V(s*.18,.5,sw),V(s*.18,.13,sw*.7),.19);
  softBox(b,'#21343f',s*.18,.10,sw*.7-.1,.26,.18,.38);
  capsule(b,col,V(s*.34,bodyY+.19,0),V(s*.38,bodyY-.06,-.22),.22);
  capsule(b,col,V(s*.38,bodyY-.06,-.22),V(.15+s*.10,bodyY-.02,-.66),.16);
  b.put('sphere','#233947',.15+s*.10,bodyY-.02,-.66,.16,.15,.19);
  if(!far){b.box(d.accent,s*.37,bodyY+.07,-.08,.06,.10,.17);b.box('#536972',s*.18,.51,sw-.1,.15,.17,.04);b.box('#8c9e91',s*.16,bodyY-.11,-.286,.12,.19,.04);}
 }
 weaponModel(b,e.role==='marksman'?4:3,.25,bodyY-.01,-.70);
 if(e.flash>0)b.put('disc','#f5c489',0,.02,0,.85,1,.85,0,0,0,1,true);
 b.world();
}
function drawCombatObjects(b,ef,alpha){
 for(const q of combat.covers){if(!isActorVisible(q.pos,10))continue;b.box(q.color,q.pos.x,q.pos.y+q.height*.5,q.pos.z,q.w,q.height,q.d);if(q.height<2){for(const s of [-1,1])b.box('#809391',q.pos.x+s*q.w*.36,q.pos.y+q.height*.5,q.pos.z-q.d*.51,.08,q.height,.025);}else{b.box('#61757d',q.pos.x,q.pos.y+q.height+.04,q.pos.z,q.w+.12,.09,q.d+.12);for(let i=-2;i<=2;i++)b.box('#4c606b',q.pos.x+i*q.w/6,q.pos.y+q.height/2,q.pos.z-q.d*.505,.09,q.height-.12,.03);}}
 for(const e of combat.units){if(!e.alive||!isActorVisible(e.pos,3))continue;const p=e.pos;e.pos=e.prevPos?add(mul(e.prevPos,1-alpha),mul(p,alpha)):p;drawCombatUnit(b,e,state.t);ef.put('disc','#162c35',e.pos.x,e.pos.y+.024,e.pos.z,1.3,1,1.0,0,0,0,.24,true);e.pos=p;}
 for(const j of combat.jets){if(!j.alive||!isActorVisible(j.pos,12))continue;drawFighter(b,j,state.t);}
 for(const p of combat.projectiles){if(!isActorVisible(p.pos,3))continue;
  if(p.kind==='bullet'||p.kind==='cannon'){ef.beam(p.team==='enemy'?'#f29b7b':'#f9e8b3',p.prev||p.pos,p.pos,p.kind==='cannon'?.06:.025,.9,true);continue;}
  b.transform(p.pos,Math.atan2(-p.vel.x,-p.vel.z),Math.asin(clamp(p.vel.y/(length(p.vel)||1),-1,1)));
  if(p.kind==='grenade'){weaponModel(b,5,0,0,.07);}
  else if(p.kind==='molotov'){weaponModel(b,6,0,0,.06);const flame=add(b.origin,bx(b.parent,V(0,.32,0)));ef.put('armory_flame8','#ffc379',flame.x,flame.y,flame.z,.27,.20,.27,state.t*4,0,0,.85,true);}
  else{b.put('v5_missile',p.team==='enemy'?'#c79782':'#cbd7cb',0,0,0,.8,.8,p.kind==='rocket'?1.2:1.8);b.put('cone','#ffe3a6',0,0,1.45,.20,.72,.2,0,-PI/2,0,1,true);}
  b.world();drawRocketTrail8(ef,p);
 }
 for(const f of combat.fires)drawFire8(ef,f);
 for(const p of ARMORY8.bursts)drawExplosion8(ef,p);
 for(const p of combat.decoys){ef.put('sphere','#ffe5ba',p.pos.x,p.pos.y,p.pos.z,.35,.35,.35,0,0,0,.95,true);ef.beam('#f6c998',p.prev||p.pos,p.pos,.09,.7,true);}
 for(const p of combat.loot){if(!isActorVisible(p.pos,2))continue;const y=p.pos.y+.45+Math.sin(state.t*3)*.08;b.put('box','#80bba5',p.pos.x,y,p.pos.z,.44,.44,.44,state.t*.5);b.box('#dbedce',p.pos.x,y+.23,p.pos.z,.30,.03,.11,0,0,0,1,true);}
 if(combat.job&&combat.job.type!=='air'&&combat.job.stage==='extract'){const p=combat.job.exit;ef.put('ring','#93ecd1',p.x,p.y+.08,p.z,8,8,8,0,PI/2,0,.75,true);b.put('cone','#b3f2d8',p.x,p.y+3+Math.sin(state.t)*.2,p.z,.8,1.5,.8,0,PI,0,1,true);}
 if(!state.car&&weapons[state.weapon]?.throwable&&isAiming()&&state.reload<=0){let p=throwOrigin(),v=throwVelocity();for(let i=0;i<26;i++){const old=p;p=add(p,mul(v,.07));v=add(v,V(0,-12*.07,0));if(p.y<ground(p)+.12||!lineClear(old,p))break;ef.put('sphere','#cee8c1',p.x,p.y,p.z,.12,.12,.12,0,0,0,.55,true);}}
}
