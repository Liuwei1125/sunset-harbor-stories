import {PI,TAU,V,add,sub,mul,dot,norm,length,dist2,forward,right,mix,clamp,lerpAngle,basis,bx,bmul} from '../core/math.js';
import {formatTime} from '../core/progress.js';
import {trackAt,trackNearest} from '../core/track.js';
import {LEVELS,TUNES,WEAPONS,SKINS} from './catalog.js';

export function createShooting(core){
 const session=core.session;
function spawn(){
 const r=session.run,inactive=r.targets.filter(t=>!t.active&&t.fold>.9);if(!inactive.length)return;const t=inactive[Math.floor(core.random()*inactive.length)],diff=core.difficulty();t.active=true;t.friend=r.def.friends&&core.random()<.24;t.until=r.elapsed+r.def.window*diff.time;t.scale=diff.size*(r.def.mixed&&-t.z>30?1.5:1);r.spawnAt=r.elapsed+(session.level===0?2.3:1.1)*diff.time;core.emit('target-up',{id:t.id,friend:t.friend});
}
function step(dt){
 const r=session.run,w=WEAPONS[r.weapon];r.kick*=Math.exp(-dt*14);r.flash=Math.max(0,r.flash-dt);
 const move=V((session.held.has('right')?1:0)-(session.held.has('left')?1:0)+session.touch.x,0,(session.held.has('back')?1:0)-(session.held.has('forward')?1:0)+session.touch.y);if(length(move)>1)Object.assign(move,norm(move));const delta=bx(basis(session.look.yaw),mul(move,dt*(session.held.has('breath')?4.5:2.5)));r.pos.x=clamp(r.pos.x+delta.x,-5.5,5.5);r.pos.z=clamp(r.pos.z+delta.z,-4,4);
 if(r.reload>0){r.reload=Math.max(0,r.reload-dt);if(r.reload===0){r.ammo=w.mag;core.tone(520,.06,.055,'triangle',680);core.emit('reload-complete');}}
 for(const t of r.targets){if(r.def.moving)t.x=t.baseX+Math.sin(r.elapsed*(.55+(session.level*.06))* (core.difficulty().id==='expert'?1.3:1)+t.phase)*1.15;t.fold=mix(t.fold,t.active?0:1,1-Math.exp(-dt*13));if(t.active&&r.elapsed>t.until){t.active=false;if(!t.friend){r.missed++;r.combo=0;}else{r.score+=15;core.message('正确辨识 +15',.7);}}}
 if(r.elapsed>r.spawnAt)spawn();if(session.held.has('action'))fire();
 if(session.playlist!=='endless'&&r.hits>=r.def.quota){const accuracy=r.hits/Math.max(1,r.shots),quality=accuracy-.06*r.fouls,medal=quality>=.82?3:quality>=.58?2:1;core.award(true,r.score,medal,[[Math.round(accuracy*100)+'%','命中率'],[r.maxCombo+' 连','最高连击'],[r.fouls+' 次','禁射靶误击'],[formatTime(r.elapsed),'完成时间']]);}
 if(session.playlist!=='endless'&&r.elapsed>=r.duration)core.award(false,r.score,0,[[r.hits+' / '+r.def.quota,'命中靶数'],[Math.round(r.hits/Math.max(1,r.shots)*100)+'%','命中率']]);
 if(session.playlist==='endless'&&r.hits>=r.wave*15){r.wave++;r.def.window=Math.max(1.4,r.def.window*.93);core.message(`第 ${r.wave} 波 · 靶标节奏提升`,2);}
}
function reload(){const r=session.run;if(session.mode!=='shooting'||session.phase!=='playing'||r.reload>0)return;const w=WEAPONS[r.weapon];if(r.ammo===w.mag)return;r.reload=w.reload;r.reloadStarted=core.session.time;core.emit('reload');core.tone(420,.06,.05,'triangle',210);}
function fire(){
 const r=session.run;if(session.phase!=='playing'||session.mode!=='shooting'||r.reload>0||r.cooldown>0)return;
 const w=WEAPONS[r.weapon];if(!r.ammo){reload();return;}const cam=core.camera();r.ammo--;r.shots++;r.cooldown=w.delay;r.flash=.047;r.shotAt=session.time;
 const sway=core.difficulty().sway*.002*(r.aim>.5?.35:1),dir=norm(add(cam.dir,V((core.random()-.5)*sway, (core.random()-.5)*sway,0)));let best=null,min=Infinity;
 for(const t of r.targets){if(!t.active||t.fold>.25)continue;const dz=t.z+.09*t.scale-cam.eye.z;if(dir.z>=-.01)continue;const distance=dz/dir.z;if(distance<=0||distance>min)continue;const p=add(cam.eye,mul(dir,distance)),dx=p.x-t.x,dy=p.y-(t.y+1.24*t.scale),rad=.285*t.scale,hit=Math.hypot(dx,dy);if(hit<=rad){best={target:t,p,ring:hit/rad};min=distance;}}
 const endpoint=best?best.p:add(cam.eye,mul(dir,65));r.tracers.push({a:add(cam.eye,bx(basis(session.look.yaw,session.look.pitch),V(.13,-.12,-.8))),b:endpoint,life:.045});
 if(best){const t=best.target;t.active=false;core.impact(best.p,t.friend?'#7fdcdb':'#edd7a7');if(t.friend){r.fouls++;r.score=Math.max(0,r.score-100);r.combo=0;core.message('禁射靶 −100 · 青色灯请等待',1.6);core.tone(150,.16,.09,'triangle',70);}else{r.hits++;r.combo++;r.maxCombo=Math.max(r.combo,r.maxCombo);const points=Math.round((best.ring<.23?150:100)*(1+Math.min(10,r.combo-1)*.08));r.score+=points;core.message(`${best.ring<.23?'中心命中':'命中'} +${points}${r.combo>1?' / '+r.combo+' 连':''}`, .8);core.tone(best.ring<.23?1200:850,.055,.055,'triangle',620);}core.emit('hit',{target:t.id,friend:t.friend,ring:best.ring,score:r.score});}
 else{r.combo=0;core.emit('miss');}
 r.kick+=w.kick;session.look.pitch=clamp(session.look.pitch+w.kick*(r.aim>.5?.45:1),-.7,.8);core.emit('shot',{weapon:r.weapon});
}

 return {step,spawn,fire,reload};
}
