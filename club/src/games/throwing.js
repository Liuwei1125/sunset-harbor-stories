import {PI,TAU,V,add,sub,mul,dot,norm,length,dist2,forward,right,mix,clamp,lerpAngle,basis,bx,bmul} from '../core/math.js';
import {formatTime} from '../core/progress.js';
import {trackAt,trackNearest} from '../core/track.js';
import {LEVELS,TUNES,WEAPONS,SKINS} from './catalog.js';
import {dartScore} from './darts.js';
export const projectileBasis=v=>{const d=norm(v);return basis(Math.atan2(-d.x,-d.z),Math.asin(clamp(d.y,-1,1)));};
export function archeryScore(radius,hitDistance){if(hitDistance>radius+1e-9)return 0;return clamp(Math.ceil(10-hitDistance/(radius/10)+1e-9),1,10);}

export function createThrowing(core){
 const session=core.session;
function startCharge(){
 const r=session.run;if(!r||session.phase!=='playing'||!['darts','archery'].includes(session.mode)||r.projectile||r.cooldown>0||r.aiTurn)return;r.charging=true;r.charge=0;r.holdTime=0;core.emit('draw-start');
}
function launchProfile(charge,angles=session.look,direction=core.camera().dir){
 const cam=core.camera(),r=session.run,archery=session.mode==='archery',speed=archery?20+42*charge:8.5+5*charge,gravity=archery?9.81:7.2,base=basis(angles.yaw,angles.pitch);
 // The projectile starts at the visible equipment tip. Its zero-gravity line
 // converges with the sight at the current target plane, as a sighted bow does.
 const local=archery?V(-.25,-.14,-1.3466+charge*.22):add(V(.105,-.10,-.60+charge*.10),bx(basis(.35,.15,.1),V(0,0,-.068*1.4)));
 const origin=add(cam.eye,bx(base,local)),target=archery?r.targets[r.activeTarget]:null,plane=archery?target.z+.055*target.radius/.61:-2.37;
 const distance=(plane-cam.eye.z)/(direction.z||-.001),aim=add(cam.eye,mul(direction,Math.max(.5,distance))),dir=norm(sub(aim,origin));
 return {origin,dir,speed,gravity,wind:archery?r.wind:0,plane,target};
}
function release(){
 const r=session.run;if(!r?.charging)return;r.charging=false;if(session.phase!=='playing'){r.charge=0;return;}if(r.charge<.12){r.charge=0;return;}
 const archery=session.mode==='archery',{origin,dir,speed,gravity,wind}=launchProfile(r.charge);
 r.projectile={pos:origin,prev:{...origin},vel:mul(dir,speed),gravity,wind,age:0,charge:r.charge};r.releaseAnim=1;r.cooldown=archery?.9:.7;core.emit('release',{charge:r.charge,speed,wind,dir,origin});core.tone(archery?175:440,archery?.12:.055,.09,'triangle',archery?610:160);r.charge=0;
}
function apply(points,target,p,vel){
 const r=session.run;r.throws++;r.shots++;r.hits+=points>0?1:0;r.score+=points;r.tens+=points===10?1:0;r.history.push(points);r.history=r.history.slice(-15);
 if(points>0&&target){const index=r.targets.indexOf(target);r.embedded.push({kind:'archery',target:index,local:sub(sub(p,mul(norm(vel),.396)),V(target.x,target.y,target.z)),rotation:projectileBasis(vel)});if(r.embedded.length>30)r.embedded.shift();core.impact(p,points===10?'#f9d482':'#d6d5ab',6);}
 core.message(points?points===10?'十环！ / PERFECT 10':points+' 环':'脱靶 · 调整仰角与风偏',1.8);core.emit('arrow',{points,target:r.targets.indexOf(target),pos:p,score:r.score});core.tone(points===10?1080:points?680:170,.11,.08,'triangle',points?480:85);
 if(r.def.mixed)r.activeTarget=(r.activeTarget+1)%r.targets.length;
 const goal=r.def.goal*(core.difficulty().id==='casual'?.75:core.difficulty().id==='expert'?1.15:1);
 if(session.playlist!=='endless'&&r.throws>=r.limit){const success=r.score>=goal,ratio=r.score/(r.limit*10);core.award(success,r.score,ratio>=.85?3:ratio>=.65?2:1,[[r.tens+' 支','十环'],[Math.round(r.hits/r.shots*100)+'%','上靶率'],[(r.score/r.shots).toFixed(1)+' 环','平均环数'],[r.def.distance+' 米','基准距离']]);}
 if(session.playlist==='endless'&&r.throws%6===0){r.round++;r.baseWind=(core.random()*2-1)*Math.min(2.6,.4+r.round*.22)*core.difficulty().wind;r.wind=r.baseWind;core.message(`第 ${r.round} 组 · 新风况 ${Math.abs(r.wind).toFixed(1)} m/s`,2);}
}
function step(dt){
 const r=session.run;if(session.mode==='darts')core.darts.stepAI();else{r.wind=r.baseWind*(.82+.18*Math.sin(r.elapsed*.23+r.windPhase));for(const t of r.targets){if(r.def.moving)t.x=t.baseX+Math.sin(r.elapsed*.48+t.phase)*.8;}}
 if(r.charging){r.holdTime+=dt;r.charge=Math.min(1,r.holdTime/(session.mode==='archery'?1.2:.8));}
 if(!r.projectile)return;const p=r.projectile;p.age+=dt;p.prev={...p.pos};p.vel.y-=p.gravity*dt;p.vel.x+=p.wind*dt*.75;p.pos=add(p.pos,mul(p.vel,dt));
 if(session.mode==='darts'){
  const plane=-2.37;if(p.prev.z>plane&&p.pos.z<=plane){const a=(plane-p.prev.z)/(p.pos.z-p.prev.z),hit=add(p.prev,mul(sub(p.pos,p.prev),a)),score=dartScore(hit.x,hit.y-1.73);if(Math.hypot(hit.x,hit.y-1.73)<.237){r.embedded.push({kind:'darts',pos:add(hit,V(0,0,.063)),rotation:projectileBasis(p.vel)});if(r.embedded.length>9)r.embedded.shift();core.impact(hit,score.score?'#e9d39d':'#b2bba1',4);}r.projectile=null;core.darts.apply(score);return;}
 }else{
  const target=r.targets[r.activeTarget],plane=target.z+.055*target.radius/.61;
  if(p.prev.z>plane&&p.pos.z<=plane){const a=(plane-p.prev.z)/(p.pos.z-p.prev.z),hit=add(p.prev,mul(sub(p.pos,p.prev),a)),distance=Math.hypot(hit.x-target.x,hit.y-target.y),points=archeryScore(target.radius,distance);r.projectile=null;apply(points,target,hit,p.vel);return;}
 }
 if(p.pos.y<-.06||p.age>5||p.pos.z>3){r.projectile=null;if(session.mode==='darts')core.darts.apply(dartScore(1,1));else apply(0,null,p.pos,p.vel);}
}
function prediction(){
 const r=session.run;if(!r||!['darts','archery'].includes(session.mode)||!session.save.settings.assist||core.difficulty().id==='expert')return null;
 const arc=session.mode==='archery',target=arc?r.targets[r.activeTarget]:{x:0,y:1.73,z:-2.37,radius:.17},charge=r.charging?r.charge:1,{origin,dir,speed,gravity,wind,plane}=launchProfile(charge);
 const time=(plane-origin.z)/(dir.z*speed);if(time<=0||time>5)return null;const p=add(origin,mul(dir,speed*time));p.y-=gravity*time*(time+1/120)/2;p.x+=wind*.75*time*(time+1/120)/2;
 return {pos:p,target,distance:Math.hypot(p.x-target.x,p.y-target.y),score:arc?archeryScore(target.radius,Math.hypot(p.x-target.x,p.y-target.y)):dartScore(p.x,p.y-target.y).score};
}

 return {step,startCharge,launchProfile,release,prediction};
}
