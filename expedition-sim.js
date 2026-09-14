/* V4 gameplay and arcade land / sea / air dynamics. No external physics runtime. */
let expeditionJob=null, expeditionResult=null, lastSafeDock=0;
const expeditionProgress={visited:['coast'],completed:{airrace:0,seadelivery:0,rescue:0},best:{},distance:0,landings:0};
const JOBS4={
 airrace:{title:'\u5929\u9645\u822a\u7ebf',en:'SKYLINE CIRCUIT',medium:'air',vehicle:'trainer',time:360,reward:3200,desc:'\u6ed1\u8dd1\u8d77\u98de\uff0c\u4f9d\u6b21\u7a7f\u8fc7 6 \u4e2a\u9ad8\u7a7a\u6807\u73af\uff0c\u8fd4\u56de\u673a\u573a\u5e73\u5b89\u964d\u843d\u3002'},
 seadelivery:{title:'\u6d77\u6e7e\u8865\u7ed9',en:'BLUE WATER DELIVERY',medium:'sea',vehicle:'tug',time:300,reward:2400,desc:'\u5728\u6e2f\u53e3\u505c\u8239\u88c5\u8d27\uff0c\u7a7f\u8d8a\u6d6e\u6807\u822a\u9053\uff0c\u5c06\u7269\u8d44\u9001\u5230\u6d77\u4e0a\u4ea4\u63a5\u7ad9\u3002'},
 rescue:{title:'\u706f\u5854\u6551\u63f4',en:'COASTGUARD / AIRLIFT',medium:'air',vehicle:'heli',time:360,reward:3600,desc:'\u9a7e\u76f4\u5347\u673a\u524d\u5f80\u6d77\u9762\u4fe1\u6807\uff0c\u4f4e\u7a7a\u60ac\u505c\u6551\u63f4\uff0c\u5c06\u4eba\u5458\u9001\u56de\u505c\u673a\u576a\u3002'}
};
const oldActors4=initActors,oldInitV3Actors4=initialiseV3Actors;
initActors=function(){oldActors4();if(regionId==='islands'){
 cars.length=0;makeCar(-76,20,'#d99857',0,true);makeCar(-78,90,'#799e96',0);makeCar(-79,205,'#bcaa81',0);enemies.length=0;civilians.length=0;
 for(const [x,z]of [[-100,-45],[-115,42],[-49,72]])enemies.push({pos:V(x,2.3,z),home:V(x,2.3,z),hp:100,alive:true,yaw:0,aggressive:false,cool:1,phase:1,flash:0,respawn:0});
 for(const [x,z]of [[-68,20],[-65,52],[-93,110]])civilians.push({pos:V(x,.18,z),home:V(x,.18,z),phase:rand()*TAU,yaw:0});
 }else if(regionId==='canyon'){for(const c of cars)c.color=pick(['#bf9d7a','#788b88','#cfaf81']);}
};
initialiseV3Actors=function(){oldInitV3Actors4();for(const c of cars)c.medium='land';const r=REGIONS[regionId];
 makeFleetVehicle('jeep',add(r.spawn,V(7,0,8)),0);makeFleetVehicle('interceptor',add(r.spawn,V(0,0,18)),0);
 makeFleetVehicle('trainer',r.airport,0);makeFleetVehicle('twin',add(r.airport,V(-24,0,-53)),0);makeFleetVehicle('heli',r.heli,0);
 makeFleetVehicle('speedboat',r.dock,0);makeFleetVehicle('yacht',add(r.dock,V(26,0,18)),0);makeFleetVehicle('tug',add(r.dock,V(25,0,-26)),0);
 for(const c of cars){if(c.medium==='sea')c.pos.y=waveHeight(c.pos);c.prevPos={...c.pos};} };
const oldResolve4=resolveXZ;
resolveXZ=function(p,r,withCars=true,ignore=null){const B=REGIONS[regionId].bounds;let hit=false;const ox=p.x,oz=p.z;p.x=clamp(p.x,-B+r,B-r);p.z=clamp(p.z,-B+r,B-r);hit=p.x!==ox||p.z!==oz;
 for(const b of nearbyObstacles(p,r+1)){if((p.y||0)+1.72<(b.miny||0)||(p.y||0)>(b.h||0)+.05||p.x<b.minx-r||p.x>b.maxx+r||p.z<b.minz-r||p.z>b.maxz+r)continue;const x=clamp(p.x,b.minx,b.maxx),z=clamp(p.z,b.minz,b.maxz),dx=p.x-x,dz=p.z-z,d=Math.hypot(dx,dz);if(d<r){hit=true;if(d>.00001){p.x=x+dx/d*r;p.z=z+dz/d*r;}else{const a=[[p.x-b.minx,'x',b.minx-r],[b.maxx-p.x,'x',b.maxx+r],[p.z-b.minz,'z',b.minz-r],[b.maxz-p.z,'z',b.maxz+r]].sort((a,b)=>a[0]-b[0]);p[a[0][1]]=a[0][2];}}}
 if(withCars)for(const c of cars){if(c===ignore||c.hidden||Math.abs((p.y||0)-c.pos.y)>3.2)continue;const radius=c.medium==='air'?1.9:c.medium==='sea'?2.1:1.25,dx=p.x-c.pos.x,dz=p.z-c.pos.z,d=Math.hypot(dx,dz),rr=radius+r;if(d<rr&&d>.001){hit=true;p.x=c.pos.x+dx/d*rr;p.z=c.pos.z+dz/d*rr;}}
 return hit;};
const originalCarTune4=carTune;
carTune=function(c){const tune=originalCarTune4(c);if(c.kind==='jeep'){tune.grip*=1.22;tune.armor*=.75;tune.top=30;tune.accel=14;}if(c.kind==='interceptor'){tune.top=43;tune.brake*=1.22;tune.armor*=.8;}return tune;};
const oldRoadSurface4=roadSurface;
roadSurface=function(p){if(state.car?.kind==='jeep')return .92;if(regionId==='coast'&&Math.abs(p.z)<168)return oldRoadSurface4(p);const r=REGIONS[regionId].runway;if(Math.abs(p.x-r.x)<r.w/2&&Math.abs(p.z-r.z)<r.l/2)return 1;return regionId==='canyon'?.72:.88;};
function craftInput(){return {left:clamp((keys.has('KeyA')?1:0)-(keys.has('KeyD')?1:0)-touch.x,-1,1),gas:keys.has('KeyW')||touch.gas,slow:keys.has('KeyS')||touch.reverse,up:keys.has('Space')||touch.boost,down:keys.has('ControlLeft')||keys.has('ControlRight')||touch.brake,pitch:clamp(touch.y,-1,1)};}
function inRunway(p){const a=REGIONS[regionId].runway;return Math.abs(p.x-a.x)<a.w*.61&&Math.abs(p.z-a.z)<a.l*.56;}
function advanceThrottle(c,u,dt){if(u.gas)c.throttle=clamp((c.throttle||0)+dt*.48,0,1);if(u.slow)c.throttle=clamp((c.throttle||0)-dt*.66,0,1);}
function craftAudio(c){if(!audio)return;const hz=c.kind==='heli'?30:c.medium==='sea'?43:70;audio.engine.frequency.setTargetAtTime(hz+(c.throttle||0)*90, audio.ctx.currentTime,.10);audio.eg.gain.setTargetAtTime(.04+(c.throttle||0)*.055,audio.ctx.currentTime,.10);}
function damageCraft(c,amount){if(state.t<(c.impactAt||0))return;c.impactAt=state.t+.8;c.hp=Math.max(0,c.hp-amount);cam.trauma=.3;spawnParticles(add(c.pos,V(0,1,0)),'#efc28d',12,5);if(expeditionJob?.type==='seadelivery')expeditionJob.cargo=Math.max(0,expeditionJob.cargo-amount*.55);if(c.hp<=0){if(expeditionJob)finishExpedition(false,'\u8f7d\u5177\u635f\u6bc1');recoverCraft(true);}}
function collideAircraft(c,old,dt){let p=c.pos;const B=REGIONS[regionId].bounds;
 if(Math.abs(p.x)>B||Math.abs(p.z)>B){c.pos.x=clamp(p.x,-B+8,B-8);c.pos.z=clamp(p.z,-B+8,B-8);c.yaw+=PI*.65;toast('\u5230\u8fbe\u533a\u57df\u8fb9\u754c\uff0c\u6309 T \u5207\u6362\u5730\u56fe');}
 const delta=sub(p,old),len=length(delta);if(len>.001){const hit=obstacleHit(add(old,V(0,1,0)),mul(delta,1/len),len+1.0,c);if(hit.type!=='none'){c.pos={...old};c.speed*=.3;damageCraft(c,18+Math.abs(c.speed)*.7);}}
 p=c.pos;const h=waterAt(p)?-.22:ground(p);if(p.y<=h){const descending=c.vertical||0;
 if(waterAt(p)){damageCraft(c,100);return;}
 if(descending<-7||Math.abs(c.roll||0)>.8){damageCraft(c,Math.min(95,Math.abs(descending)*4+Math.abs(c.roll||0)*15));}
 if(c.airborne&&c.hp>0){expeditionProgress.landings++;toast(inRunway(p)?'\u5e73\u7a33\u7740\u9646 / LANDING':'\u5df2\u63a5\u5730\uff0c\u6ce8\u610f\u51cf\u901f');}
 c.pos.y=h;c.vertical=0;c.airborne=false;c.pitch=mix(c.pitch,0,Math.min(1,dt*4));
 }else c.airborne=p.y>h+.3;
 if(c.pos.y>430){c.pos.y=430;c.vertical=Math.min(0,c.vertical);c.pitch=Math.min(0,c.pitch);}
}
function updatePlane(c,dt){const u=craftInput(),d=FLEET[c.kind];advanceThrottle(c,u,dt);const old={...c.pos};c.speed=clamp((c.speed||0)+((c.throttle||0)*11.0-1.1-(c.speed||0)*.037)*(dt),0,d.top);if(u.slow&& !c.airborne)c.speed=Math.max(0,c.speed-dt*9);
 let stick=(u.up?1:0)-(u.down?1:0)+u.pitch;const pitchTarget=clamp(stick*.37,-.43,.38);c.pitch=mix(c.pitch||0,pitchTarget,1-Math.exp(-dt*2.9));c.roll=mix(c.roll||0,u.left*.62,1-Math.exp(-dt*3.3));c.yaw+=u.left*(c.airborne?.68:.44)*clamp(c.speed/10,0,1)*dt;c.steerVisual=u.left*.35;
 const flying=c.speed>d.lift,vy=flying?Math.sin(c.pitch)*c.speed:-Math.max(1.8,(d.lift-c.speed)*.70);c.vertical=mix(c.vertical||0,vy,1-Math.exp(-dt*2));if(!c.airborne&&c.pitch<=.025)c.vertical=Math.min(0,c.vertical);
 c.vel=mul(forward(c.yaw),c.speed*Math.cos(c.pitch));c.vel.y=c.vertical;c.pos=add(c.pos,mul(c.vel,dt));c.wheel=(c.wheel||0)+c.speed*dt/.35;collideAircraft(c,old,dt);c.stall=c.airborne&&c.speed<d.lift;c.rpm=Math.round(600+(c.throttle||0)*2300);craftAudio(c);
}
function updateHeli(c,dt){const u=craftInput();c.throttle=mix(c.throttle||0,.80,Math.min(1,dt*1.5));const target=(u.gas?1:0)-(u.slow?1:0)+u.pitch;c.speed=mix(c.speed||0,clamp(target,-1,1)*FLEET.heli.top,1-Math.exp(-dt*1.5));c.yaw+=u.left*1.04*dt;c.roll=mix(c.roll||0,u.left*.24,Math.min(1,dt*3));c.pitch=mix(c.pitch||0,-target*.12,Math.min(1,dt*3));const targetVy=(u.up?9:0)-(u.down?7:0);c.vertical=mix(c.vertical||0,targetVy,1-Math.exp(-dt*2));const old={...c.pos};c.vel=mul(forward(c.yaw),c.speed);c.vel.y=c.vertical;c.pos=add(c.pos,mul(c.vel,dt));collideAircraft(c,old,dt);craftAudio(c);}
function updateShip(c,dt){const u=craftInput(),max=FLEET[c.kind].top,mass=c.kind==='speedboat'?1:c.kind==='yacht'?1.7:2.5;
 const gas=u.gas?1:Math.max(0,touch.y),rev=(u.slow||u.down)?1:Math.max(0,-touch.y);c.throttle=gas;c.speed=(c.speed||0)+(gas*6.8/mass-rev*(c.speed>0?7:2))*dt;c.speed*=Math.exp(-dt*(gas?.025:.20));c.speed=clamp(c.speed,-4.2,max);c.yaw+=u.left*.82/mass*clamp(Math.abs(c.speed)/5,.06,1)*Math.sign(c.speed||1)*dt;
 const target=mul(forward(c.yaw),c.speed);c.vel=add(c.vel||V(),mul(sub(target,c.vel||V()),1-Math.exp(-dt*1.4)));const next=add(c.pos,mul(c.vel,dt));const B=REGIONS[regionId].bounds;
 if(!waterAt(next)||Math.abs(next.x)>B||Math.abs(next.z)>B){if(Math.abs(c.speed)>6)damageCraft(c,Math.abs(c.speed)*1.15);c.speed*=-.25;c.vel=mul(c.vel,-.2);}else c.pos=next;
 c.pos.y=waveHeight(c.pos);c.pitch=mix(c.pitch||0,.045*clamp(c.speed/18,0,1)+Math.sin(state.t*1.6+c.pos.x*.03)*.018,Math.min(1,dt*4));c.roll=mix(c.roll||0,-u.left*c.speed*.005+Math.sin(state.t*1.1)*.025,Math.min(1,dt*4));
 if(Math.abs(c.speed)>2&&state.t>(c.wakeAt||0)){c.wakeAt=state.t+.12;const p=add(c.pos,mul(forward(c.yaw),c.kind==='speedboat'?-3.5:-6));seaWakes.push({pos:p,yaw:c.yaw,age:0,width:mass*.9});if(seaWakes.length>80)seaWakes.shift();}craftAudio(c);
}
const seaWakes=[];
const oldUpdatePlayer4=updatePlayer;
updatePlayer=function(dt){const c=state.car,old={...player.pos};if(c?.medium==='air'||c?.medium==='sea'){
 if(c.medium==='sea')updateShip(c,dt);else if(c.kind==='heli')updateHeli(c,dt);else updatePlane(c,dt);
 if(state.car===c){player.pos={...c.pos};player.yaw=c.yaw;if(state.t-cam.lastLook>1.4&&settings.steeringAssist)cam.yaw=lerpAngle(cam.yaw,c.yaw,1-Math.exp(-dt*1.6));}
 }else{oldUpdatePlayer4(dt);if(state.car&&waterAt(state.car.pos)&&state.car.pos.y<.4){toast('\u8f66\u8f86\u5165\u6c34\uff0c\u5df2\u9000\u56de\u5b89\u5168\u4f4d\u7f6e');state.car.pos={...old};state.car.speed=0;state.car.vel=V();player.pos={...old};damageCraft(state.car,10);}else if(!state.car&&waterAt(player.pos)){player.pos.y=-.7;player.jump=0;player.vy=0;player.swimming=true;}else player.swimming=false;}
 expeditionProgress.distance+=Math.min(15,dist2(old,player.pos));for(let i=seaWakes.length-1;i>=0;i--)if((seaWakes[i].age+=dt)>5.2)seaWakes.splice(i,1);
};
nearestCar=function(){let best=null,dd=6.0;for(const c of cars){if(c.hidden||c.hp<=0)continue;const d=dist2(player.pos,c.pos),dy=Math.abs(player.pos.y-c.pos.y);if(d<dd&&dy<3.7){best=c;dd=d;}}return best;};
const oldToggle4=toggleCar;
toggleCar=function(){if(state.transition)return;const c=state.car||nearestCar();if(!c)return toast('\u9760\u8fd1\u8f7d\u5177\uff0c\u6216\u6309 V \u9009\u62e9\u8bd5\u9a7e');if(c.medium==='land'||!c.medium)return oldToggle4();
 if(state.car){if(c.medium==='air'&&(c.airborne||c.pos.y>ground(c.pos)+1.5))return toast('\u8bf7\u5148\u964d\u843d\uff0c\u6216\u6309 F \u8fd4\u56de\u673a\u573a');if(Math.abs(c.speed)>2)return toast('\u8bf7\u51cf\u901f\u505c\u7a33\u540e\u79bb\u5f00\u8f7d\u5177');if(c.medium==='sea'){const d=REGIONS[regionId].pier;if(dist2(c.pos,d)>48)return toast('\u9760\u8fd1\u7801\u5934\u540e\u4e0b\u8239\uff0cF \u53ef\u8fd4\u6e2f');player.pos=V(d.x-4,.45,d.z);}else{player.pos=add(c.pos,rotate(V(4,0,0),c.yaw));player.pos.y=ground(player.pos);}c.throttle=0;state.car=null;cam.pitch=-.14;document.body.classList.remove('driving');}
 else{state.car=c;state.entered=true;state.reload=0;c.ai=null;c.speed=0;c.throttle=0;c.vertical=0;player.pos={...c.pos};cam.yaw=c.yaw;cam.pitch=-.14;document.body.classList.add('driving');toast(c.kind==='heli'?'SPACE / \u722c\u5347\uff0cCTRL / \u4e0b\u964d':c.medium==='air'?'W \u63a8\u6cb9\u95e8\uff0c\u8d85\u8fc7 65 km/h \u540e SPACE \u62ac\u5934':'W / \u6cb9\u95e8\uff0cS / \u5239\u8239\u4e0e\u5012\u8f66');}
 clearTouchInput();keys.clear();syncCraftUI();updateHUD();};
function deployVehicle(kind,board=true,quiet=false){const def=FLEET[kind];if(!def||regionBusy)return false;if(state.transition)state.transition=null;const r=REGIONS[regionId];let p=def.medium==='sea'?{...r.dock}:kind==='heli'?{...r.heli}:def.medium==='air'?{...r.airport}:add(r.spawn,V(-2,0,2));let c=cars.find(c=>c.kind===kind&&!c.ai&&!c.hidden&&!c.police);if(!c)c=makeFleetVehicle(kind,p);
 if(state.car&&state.car!==c){state.car.throttle=0;state.car.speed=0;state.car.vel=V();if(state.car.medium==='air'&&state.car.airborne){state.car.pos={...state.car.home};state.car.pos.y=ground(state.car.home);state.car.airborne=false;}}
 for(const other of cars){if(other===c||other.medium!==def.medium||dist2(other.pos,p)>12)continue;other.pos=add(p,V(def.medium==='air'?-40:35,0,25));other.pos.y=def.medium==='sea'?waveHeight(other.pos):ground(other.pos);other.prevPos={...other.pos};other.speed=0;other.throttle=0;}Object.assign(c,{pos:p,prevPos:{...p},yaw:0,prevYaw:0,roll:0,pitch:0,hp:100,destroyed:false,vel:V(),speed:0,throttle:0,vertical:0,airborne:false,ai:null,medium:def.medium,kind,name:def.name,bodyVy:0,impactAt:0});c.pos.y=def.medium==='sea'?waveHeight(c.pos):ground(c.pos);c.prevPos={...c.pos};state.car=board?c:null;state.entered=board||state.entered;state.dead=false;player.hp=Math.max(40,player.hp);player.pos=board?{...c.pos}:add(c.pos,V(3.5,0,0));player.prevPos={...player.pos};player.jump=0;player.vy=0;cam.yaw=0;cam.pitch=-.18;cam.eye=add(c.pos,V(6,5,14));state.nitro=100;clearTouchInput();keys.clear();document.body.classList.toggle('driving',!!state.car);syncCraftUI();if(!quiet)toast(def.cn+' / \u5df2\u51c6\u5907\u5c31\u7eea');saveProgress();return true;}
function recoverCraft(crashed=false){const c=state.car;if(!c)return;const kind=c.kind;state.cash=Math.max(0,state.cash-(crashed?150:80));if(expeditionJob)finishExpedition(false,crashed?'\u8f7d\u5177\u635f\u6bc1':'\u5df2\u4e2d\u6b62\u4efb\u52a1\u5e76\u547c\u53eb\u6551\u63f4');deployVehicle(kind,true,true);toast(crashed?'\u5df2\u6551\u63f4\u81f3\u5b89\u5168\u5730\u70b9 / -$150':'\u5df2\u8fd4\u56de\u51fa\u53d1\u70b9 / -$80');}
const oldResetCar4=resetCar;
resetCar=function(){if(state.car?.medium!=='land'||regionId!=='coast')return recoverCraft();oldResetCar4();};
function mission4Target(){const j=expeditionJob,r=REGIONS[regionId];if(!j)return null;if(j.type==='airrace')return j.stage===0?flightRoute()[Math.min(j.gate,5)]:r.airport;if(j.type==='rescue')return j.stage===0?V(r.dock.x+235,9,r.dock.z-210):r.heli;return j.stage===0?r.dock:seaRoute()[Math.min(j.gate,5)];}
const oldNav4=navigationTarget,oldNavName4=navigationName;
navigationTarget=function(){return mission4Target()||(!contract&&!navOverride&&state.car?.medium==='air'?REGIONS[regionId].airport:!contract&&!navOverride&&state.car?.medium==='sea'?REGIONS[regionId].pier:oldNav4());};
navigationName=function(){const j=expeditionJob;if(!j)return !contract&&!navOverride&&state.car?.medium==='air'?'AIR CLUB / \u673a\u573a':!contract&&!navOverride&&state.car?.medium==='sea'?'MARINA / \u7801\u5934':oldNavName4();if(j.type==='airrace')return j.stage===0?'\u7a7f\u8d8a\u822a\u6807 '+(j.gate+1)+' / 6':'\u8fd4\u56de\u8dd1\u9053\u5e73\u7a33\u964d\u843d';if(j.type==='rescue')return j.stage===0?'\u4f4e\u7a7a\u60ac\u505c\u6551\u63f4':'\u8fd4\u56de\u505c\u673a\u576a';return j.stage===0?'\u7801\u5934\u88c5\u8d27':'\u822a\u9053\u6d6e\u6807 '+(j.gate+1)+' / 6';};
function startExpedition(type){if(!JOBS4[type]||contract||expeditionJob)return false;const d=JOBS4[type];deployVehicle(d.vehicle,true,true);expeditionJob={type,region:regionId,stage:0,gate:0,elapsed:0,hold:0,cargo:100,prev:{...player.pos}};closePanel();closeExpeditionPanel();if(!state.started||state.paused)startGame();toast(d.title+' / \u5df2\u4e3a\u4f60\u51c6\u5907'+FLEET[d.vehicle].cn);saveProgress();updateHUD();return true;}
function finishExpedition(success,reason=''){if(!expeditionJob)return;const j=expeditionJob,d=JOBS4[j.type],bonus=Math.max(0,d.time-j.elapsed)*3,payout=success?Math.round((d.reward+bonus)*(j.type==='seadelivery'?j.cargo/100:1)):0;if(success){state.cash+=payout;profile.earned+=payout;expeditionProgress.completed[j.type]++;if(!expeditionProgress.best[j.type]||j.elapsed<expeditionProgress.best[j.type])expeditionProgress.best[j.type]=j.elapsed;}expeditionResult={...j,success,payout,reason};expeditionJob=null;resultUntil=state.t+8;const el=$('contract-result');if(el){el.innerHTML=`<small>${success?'EXPEDITION COMPLETE':'EXPEDITION ENDED'}</small><h2>${d.title}</h2><p>${success?'TIME '+formatTime(j.elapsed):reason}</p><strong>${success?'+ $ '+payout:'\u518d\u8bd5\u4e00\u6b21'}</strong>`;el.classList.add('visible');}saveProgress();updateHUD();}
function sweptDistance(a,b,p){const d=sub(b,a),den=dot(d,d),t=den?clamp(dot(sub(p,a),d)/den,0,1):0;return length(sub(add(a,mul(d,t)),p));}
function updateExpedition(dt){const j=expeditionJob;if(!j)return;j.elapsed+=dt;const d=JOBS4[j.type],c=state.car,t=mission4Target();if(j.elapsed>d.time)return finishExpedition(false,'\u4efb\u52a1\u8d85\u65f6');if(j.cargo<=0)return finishExpedition(false,'\u8d27\u7269\u635f\u574f');
 if(j.type==='airrace'){if(j.stage===0&&c?.medium==='air'&&c.kind!=='heli'&&c.airborne&&sweptDistance(j.prev||player.pos,player.pos,t)<15){j.gate++;tone(720,.13,.08,'sine',1100);if(j.gate>=6){j.stage=1;j.hold=0;toast('\u822a\u6807\u5168\u90e8\u5b8c\u6210\uff0c\u8fd4\u56de\u673a\u573a\u964d\u843d');}else toast('\u7a7a\u4e2d\u822a\u6807 '+j.gate+' / 6');}
 if(j.stage===1){const ready=c?.medium==='air'&&c.kind!=='heli'&&!c.airborne&&inRunway(c.pos)&&Math.abs(c.speed)<8;j.hold=ready?j.hold+dt:0;if(j.hold>2)return finishExpedition(true);}}
 else if(j.type==='rescue'){const ready=c?.kind==='heli'&&dist2(c.pos,t)<18&&Math.abs(c.speed)<5&&(j.stage===0?c.pos.y>3&&c.pos.y<17:c.pos.y<.8);j.hold=ready?j.hold+dt:Math.max(0,j.hold-dt*.45);if(j.hold>(j.stage===0?4:2)){if(j.stage===0){j.stage=1;j.hold=0;toast('\u4eba\u5458\u5df2\u6551\u8d77\uff0c\u8fd4\u56de\u505c\u673a\u576a');}else return finishExpedition(true);}}
 else if(c?.medium==='sea'){if(j.stage===0){j.hold=dist2(c.pos,t)<18&&Math.abs(c.speed)<1.8?j.hold+dt:0;if(j.hold>2){j.stage=1;j.hold=0;toast('\u7269\u8d44\u5df2\u88c5\u8239\uff0c\u6cbf\u6d6e\u6807\u822a\u9053\u524d\u8fdb');}}else if(j.gate<5){if(dist2(c.pos,t)<18){j.gate++;tone(520,.15,.08,'sine',900);}}else{j.hold=dist2(c.pos,t)<19&&Math.abs(c.speed)<2.5?j.hold+dt:0;if(j.hold>2)return finishExpedition(true);}}
 j.prev={...player.pos};}
const oldUpdateContracts4=updateContracts;
updateContracts=function(dt){updateExpedition(dt);if(contract&&state.car&&state.car.medium!=='land'){contract.elapsed+=dt;if(contract.elapsed>=CONTRACTS[contract.type].time)finishContract(false,'\u59d4\u6258\u8d85\u65f6');return;}oldUpdateContracts4(dt);};
const oldStartContract4=startContract;
startContract=function(type){if(expeditionJob){toast('\u8bf7\u5148\u5b8c\u6210\u6216\u53d6\u6d88\u5f53\u524d\u884c\u52a8');return false;}return oldStartContract4(type);};
