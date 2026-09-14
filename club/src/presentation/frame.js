import {V,add,sub,mul,norm,basis,bmul,bx,ID,clamp,mix,PI,dist2} from '../core/math.js';
import {trackAt} from '../core/track.js';
import {LEVELS,WEAPONS,WEAPON_ASSETS,SKINS} from '../games/catalog.js';
import {projectileBasis} from '../games/throwing.js';

export const modeAssets={race:['touring-gt'],shooting:['club-shooting-target',...WEAPON_ASSETS],darts:['club-dart'],archery:['club-recurve','club-arrow','club-archery-target']};
export function viewCamera(snapshot,aspect){
 const camera={...snapshot.camera};
 if(aspect<.8&&snapshot.run&&snapshot.mode!=='darts'){
  const aim=snapshot.run.aim||0,horizontal=(snapshot.mode==='race'?50:snapshot.mode==='archery'?mix(40,26,aim):mix(44,28,aim))*PI/180;
  camera.fov=Math.max(camera.fov,2*Math.atan(Math.tan(horizontal/2)/aspect));
 }
 return camera;
}
export function frameScene(s,track){
 const models=[],effects=[],r=s.run,mode=s.mode,color=SKINS[s.settings.skin].color;
 const model=(key,id,pos,options={})=>models.push({key,id,pos,...options});
 const beam=(key,a,b,width,color='#ffe0a4',alpha=1)=>{const d=sub(b,a);effects.push({key,shape:'box',pos:mul(add(a,b),.5),rotation:projectileBasis(d),scale:[width,width,Math.hypot(d.x,d.y,d.z)],color,alpha});};
 if(mode==='race'){
  if(r){
   model('player-car','touring-gt',add(r.car.pos,V(0,.06,0)),{rotation:basis(r.car.yaw,r.car.pitch,r.car.roll),wheel:r.car.wheel,steer:r.car.steer,speed:r.car.speed,nitro:r.nitro,color,equipment:true});
   r.rivals.forEach((a,i)=>model('rival'+i,'touring-gt',add(a.pos,V(0,.07,0)),{rotation:basis(a.yaw,a.pitch,a.roll),wheel:a.wheel,steer:a.steerVisual,color:a.color}));
   if(s.ghost&&dist2(s.ghost.pos,r.car.pos)>4)model('ghost','touring-gt',s.ghost.pos,{yaw:s.ghost.yaw,color:'#9fdbc4',alpha:.25});
   const next=trackAt(track,r.nextGate*track.length/12),rot=basis(next.yaw);
   for(const x of [-track.width/2,track.width/2]){const p=add(next.pos,bx(rot,V(x,0,0)));beam('gate'+x,add(p,V(0,.12,0)),add(p,V(0,2.6,0)),.1,'#b7e8b8');}
   r.skids?.slice(-50).forEach((v,i)=>beam('skid'+i,v.a,v.b,.10,'#263331',clamp(v.life/5,0,.5)));
  }else{const q=trackAt(track,3,-2);model('display','touring-gt',q.pos,{yaw:q.yaw,color});}
 }else if(mode==='shooting'){
  const targets=r?.targets||[{x:0,y:0,z:-12,active:true},{x:-3.5,y:0,z:-18,active:true},{x:3.5,y:0,z:-20,active:true}];
  targets.forEach((t,i)=>model('target'+i,'club-shooting-target',V(t.x,t.y,t.z),{scale:t.scale||1,fold:t.fold||0,status:t.friend?'#74d4d4':t.active?'#ebbc71':'#526a66'}));
 }else if(mode==='archery'){
  const targets=r?.targets||[{x:0,y:1.4,z:-LEVELS.archery[s.level].distance,radius:.61}];
  targets.forEach((t,i)=>model('target'+i,'club-archery-target',V(t.x,t.y,t.z),{scale:t.radius/.61}));
 }
 if(r){
  r.embedded.forEach((hit,i)=>{const t=r.targets?.[hit.target],p=t?add(V(t.x,t.y,t.z),hit.local):hit.pos;model('embedded'+i,hit.kind==='darts'?'club-dart':'club-arrow',p,{rotation:hit.rotation||ID});});
  if(r.projectile)model('projectile',mode==='darts'?'club-dart':'club-arrow',sub(r.projectile.pos,mul(norm(r.projectile.vel),mode==='darts'?.068:.396)),{rotation:projectileBasis(r.projectile.vel)});
  r.tracers.forEach((t,i)=>beam('tracer'+i,t.a,t.b,.012,'#ffe0a4',clamp(t.life/.06,0,1)));
  r.sparks.slice(-36).forEach((p,i)=>effects.push({key:'spark'+i,shape:'sphere',pos:p.pos,scale:p.size,color:p.color,alpha:clamp(p.life*3,0,1)}));
  if(mode!=='race'){
   const aim=r.aim||0,base=basis(s.look.yaw,s.look.pitch),local=p=>add(s.camera.eye,bx(base,p));
   if(mode==='shooting'){
    const a=clamp(r.reload/WEAPONS[r.weapon].reload,0,1),tilt=r.reload>0?Math.sin(a*PI):0,sightHeight=[.133,.0495,.265][r.weapon];
    const gunPos=local(V(mix(.23,0,aim),-.20+mix(-.03,.20-sightHeight,aim)-tilt*.12,(r.weapon===1?-.62:-.45)+(r.kick||0)*2.3)),gunBasis=bmul(base,basis(-tilt*.2,tilt*.55,tilt*.2));
    if(!(r.weapon===2&&aim>.85))model('gun',WEAPON_ASSETS[r.weapon],gunPos,{rotation:gunBasis,reload:a,kick:r.kick,equipment:true});
    if(r.flash>0)effects.push({key:'flash',shape:'sphere',pos:r.weapon===1?add(gunPos,bx(gunBasis,V(0,0,-.4895))):local(V(mix(.23,0,aim),-.15,-1.08)),scale:[.05+r.flash*.55,.05+r.flash*.55,.08+r.flash*.8],color:'#fff0b3',alpha:.9});
   }else if(mode==='archery'){
    const root=local(V(-.30,-.14,-1.05+r.releaseAnim*.035));
    model('bow','club-recurve',root,{rotation:base,scale:.85,charge:r.charge,color,equipment:true});
    const pull=add(root,bx(base,V(0,0,(.06+r.charge*.38)*.85)));
    for(const sign of [-1,1])beam('string'+sign,add(root,bx(base,V(0,sign*.69*.85,(.055+r.charge*.09)*.85))),pull,.0028,'#e8e0c3');
    if(!r.projectile&&r.cooldown<.2)model('held-arrow','club-arrow',add(root,bx(base,V(.05,0,.04+r.charge*.22))),{rotation:base,scale:.85,equipment:true});
   }else if(!r.projectile&&r.cooldown<.3)model('held-dart','club-dart',local(V(.105,-.10,-.60+r.charge*.1)),{rotation:bmul(base,basis(.35,.15,.1)),scale:1.4,color,equipment:true});
  }
 }
 return {models,effects};
}

// Native joint transforms; adapters only translate these into engine coordinates.
export function jointPose(name,motion,opts){
 let rotation=ID,offset=V();
 if(motion==='steering')rotation=basis(0,0,(opts.steer||0)*-.8);
 if(motion==='gauge')rotation=basis(0,0,(name==='speed-needle'?(opts.speed||0)/48:(opts.speed||0)%13/13)*-4.2+2.1);
 if(motion==='wheel'||motion==='wheel-front')rotation=basis(motion==='wheel-front'?(opts.steer||0)*.5:0,opts.wheel||0,0);
 if(motion==='bow-limb')rotation=basis(0,(name==='upper-limb'?1:-1)*(opts.charge||0)*.13);
 if(motion==='target-fold')rotation=basis(0,(opts.fold||0)*-1.45);
 if(motion==='magazine'&&opts.reload){const p=opts.reload;offset.y=-Math.sin(p*PI)*.32;rotation=basis(0,0,Math.sin(p*PI)*-.14);}
 if(['bolt','slide'].includes(motion))offset.z=(opts.kick||0)*3;
 return {rotation,offset};
}
