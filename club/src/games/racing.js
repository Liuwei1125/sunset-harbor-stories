import {PI,TAU,V,add,sub,mul,dot,norm,length,dist2,forward,right,mix,clamp,lerpAngle,basis,bx,bmul} from '../core/math.js';
import {formatTime} from '../core/progress.js';
import {trackAt,trackNearest} from '../core/track.js';
import {LEVELS,TUNES,WEAPONS,SKINS} from './catalog.js';

export function createRacing(core){
 const session=core.session;
function step(dt){
 const r=session.run,c=r.car,track=session.track,tune=TUNES[r.tune],prev={...c.pos},near=trackNearest(track,c.pos);
 const gas=session.held.has('action')?1:Math.max(0,-session.touch.y),brake=session.held.has('secondary')?1:Math.max(0,session.touch.y),steer=clamp((session.held.has('left')?1:0)-(session.held.has('right')?1:0)-session.touch.steer,-1,1),hand=session.held.has('handbrake'),nitro=session.held.has('nitro')&&gas>0&&r.nitro>.1&&c.speed>4;
 c.steer=mix(c.steer,steer,1-Math.exp(-dt*7));c.steerVisual=c.steer*.44;
 const off=near.distance>track.width*.48,grip=tune.grip*(r.wet?.84:1)*(off?.56:1)*(hand?.18:1),drag=.0045*c.speed*Math.abs(c.speed)+1.1+(off?Math.abs(c.speed)*.9:0);
 c.speed+=((gas*tune.accel+(nitro?tune.nitro:0))*(1-Math.max(0,c.speed)/(tune.max+(nitro?17:0))*.34)-drag*Math.sign(c.speed)-brake*23*(c.speed>0?1:-.12)-(hand?c.speed*.55:0))*dt;c.speed=clamp(c.speed,-5,tune.max+(nitro?17:0));if(gas===0&&Math.abs(c.speed)<.09)c.speed=0;
 const yawRate=c.steer*(.28+Math.abs(c.speed)*.026)*clamp(c.speed/5,-1,1)*(hand?1.55:1)/(1+Math.max(0,Math.abs(c.speed)-27)*.026);
 c.yaw+=yawRate*dt;c.lateral+=(yawRate*c.speed*.39-c.lateral*grip)*dt;
 const velocity=add(mul(forward(c.yaw),c.speed),mul(right(c.yaw),c.lateral));c.pos=add(c.pos,mul(velocity,dt));
 const post=trackNearest(track,c.pos);c.pos.y=mix(c.pos.y,post.pos.y,1-Math.exp(-dt*14));c.pitch=lerpAngle(c.pitch,post.pitch,1-Math.exp(-dt*7));c.roll=mix(c.roll,-c.steer*Math.abs(c.speed)*.0008,dt*8);c.wheel+=c.speed*dt*2;
 if(nitro)r.nitro=Math.max(0,r.nitro-dt*22);else r.nitro=Math.min(100,r.nitro+dt*(hand&&c.speed>9?13:4));
 if(hand&&c.speed>8&&Math.abs(c.lateral)>.3){r.drift+=dt*Math.abs(c.lateral)*3;if(r.skids.length<90&&Math.floor(r.elapsed*30)!==Math.floor((r.elapsed-dt)*30))for(const s of [-1,1])r.skids.push({a:add(prev,add(mul(right(c.yaw),s*.7),V(0,.13,0))),b:add(c.pos,add(mul(right(c.yaw),s*.7),V(0,.13,0))),life:5});}
 for(const s of r.skids)s.life-=dt;r.skids=r.skids.filter(s=>s.life>0).slice(-90);
 if(post.distance>track.width/2+.8){const inward=norm(sub(post.pos,c.pos));c.pos=add(post.pos,mul(inward,-(track.width/2+.65)));c.speed*=Math.exp(-dt*4);c.lateral*=.85;if(r.elapsed>r.bumpAt){r.collisions++;r.penalty+=.8;r.bumpAt=r.elapsed+.7;core.message('护栏碰撞 · +0.8 秒',.75);core.tone(80,.1,.08,'triangle',40);}}
 for(const a of r.rivals){
  const ahead=trackAt(track,a.progress+12),far=trackAt(track,a.progress+32),bend=Math.abs(Math.atan2(Math.sin(far.yaw-ahead.yaw),Math.cos(far.yaw-ahead.yaw))),desired=a.pace*clamp(1.22-bend*.65,.61,1.2);
  const close=dist2(a.pos,c.pos)<11,avoid=close&&Math.abs(a.currentLane-post.side)<2.8;
  const wantedLane=avoid?(post.side>=0?-1:1)*track.width*.29:a.lane+Math.sin(a.progress*.018+a.id)*.45;a.currentLane=mix(a.currentLane,wantedLane,dt*(close?2.5:1.1));
  a.speed=mix(a.speed,desired,dt*.9);a.progress+=a.speed*dt;const q=trackAt(track,a.progress,a.currentLane);a.pos=q.pos;a.yaw=q.yaw;a.pitch=q.pitch;a.wheel+=a.speed*dt*2;a.steerVisual=clamp(far.yaw-a.yaw,-.4,.4);
  if(dist2(a.pos,c.pos)<2.05&&r.elapsed>r.bumpAt){c.speed*=.86;a.speed*=.88;c.pos=add(c.pos,mul(norm(sub(c.pos,a.pos)),.7));r.bumpAt=r.elapsed+.7;r.collisions++;r.penalty+=.5;core.message('擦碰 · 保持车距',.75);core.tone(95,.1,.08,'triangle',45);}
 }
 const gate=trackAt(track,r.nextGate*track.length/12),dir=forward(gate.yaw),before=dot(sub(prev,gate.pos),dir),after=dot(sub(c.pos,gate.pos),dir);
 if(before<0&&after>=0&&dist2(c.pos,gate.pos)<track.width/2+2&&c.speed>0){
  r.checkpoints++;r.nextGate=(r.nextGate+1)%12;core.emit('checkpoint',{checkpoint:r.checkpoints});core.tone(550,.055,.05,'triangle',740);
  if(r.checkpoints%12===0){const lapTime=r.elapsed-r.lapStart;r.lapTimes.push(lapTime);r.lapTimes=r.lapTimes.slice(-50);r.lapStart=r.elapsed;r.lap++;core.message(`完成第 ${r.lap-1} 圈 · ${formatTime(lapTime)}`,2);}
 }
 const laps=Math.floor(r.checkpoints/12);let progress=laps*track.length+post.s;if(r.nextGate===0&&post.s<track.length*.1)progress= (laps+1)*track.length+post.s;
 r.progress=progress;r.rank=1+r.rivals.filter(a=>a.progress>progress).length;
 if(r.trace.length<8000&&r.elapsed>=r.trace.length*.1)r.trace.push([+(r.trace.length*.1).toFixed(1),c.pos.x,c.pos.y,c.pos.z,c.yaw]);
 if(session.playlist!=='endless'&&r.checkpoints>=r.def.laps*12){const time=r.elapsed+r.penalty,medal=r.rank===1?3:r.rank===2?2:1;core.award(true,time,medal,[[r.rank+' / 4','最终名次'],[formatTime(Math.min(...r.lapTimes)),'最佳单圈'],[r.collisions+' 次','碰撞'],[r.penalty.toFixed(1)+' 秒','罚时']]);}
 if(session.playlist!=='endless'&&r.elapsed>track.length*r.def.laps/5*core.difficulty().time+90)core.award(false,r.elapsed+r.penalty,0,[['时间用尽','可随时重试'],[r.checkpoints+' / '+r.def.laps*12,'通过检查点']]);
}
function recover(){const r=session.run;if(!r||session.mode!=='race')return;const q=trackAt(session.track,((r.nextGate+11)%12)*session.track.length/12+2);r.car.pos=q.pos;r.car.yaw=q.yaw;r.car.speed=0;r.car.lateral=0;r.car.pitch=q.pitch;r.car.steer=0;r.penalty+=3;session.look={yaw:0,pitch:0};core.message('回到上一检查点 · +3 秒');core.emit('recover');}

 return {step,recover};
}
