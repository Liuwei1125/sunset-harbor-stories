import {PI,TAU,V,add,sub,mul,norm,length,dist2,forward,right,mix,clamp,lerpAngle,basis,bx} from '../core/math.js';
import {buildTrack,trackAt} from '../core/track.js';
import {cameraPose} from '../core/camera.js';
import {hash,formatTime,lowerIsBetter,defaultSettings} from '../core/progress.js';
import {LEVELS,MODES,DIFFICULTIES,TUNES,WEAPONS,SKINS,FIXED_DT} from './catalog.js';
import {createRacing} from './racing.js';
import {createShooting} from './shooting.js';
import {createDarts} from './darts.js';
import {createThrowing} from './throwing.js';

// The authoritative world: no browser, renderer, asset, clock or storage IO.
export function createSimulation(options={}){
  const settings={...defaultSettings(),...options.settings};
  const mode=MODES[options.mode]?options.mode:'race',playlist=['levels','daily','endless'].includes(options.playlist)?options.playlist:'levels';
  const day=options.day||'2026-09-11';
  const level=playlist==='daily'?hash(day+mode)%6:clamp(Math.floor(options.level||0),0,5);
  const worldSeed=hash(mode+level+(playlist==='daily'?day:''));
  const session={mode,level,playlist,day,worldSeed,initialSeed:options.seed??731,seed:worldSeed,phase:'lobby',run:null,result:null,time:0,look:{yaw:0,pitch:0},held:new Set(),touch:{steer:0,x:0,y:0},save:{settings,ghosts:options.ghosts||{}},events:[],message:'',messageUntil:0,hitUntil:0};
  if(mode==='race')session.track=buildTrack(LEVELS.race[level],playlist==='daily'?worldSeed%20:0);
  let previous=null;
  const core={
    session,
    difficulty:()=>session.run?.difficulty||DIFFICULTIES.find(d=>d.id===settings.difficulty)||DIFFICULTIES[0],
    random:()=>{session.seed=(Math.imul(session.seed,1664525)+1013904223)>>>0;return session.seed/4294967296;},
    camera:()=>cameraPose(session),lowerIsBetter:()=>lowerIsBetter(mode,level,playlist),
    emit(type,data={}){
      const event={type,t:session.time,...data};session.events.push(event);
      if(session.events.length>600)session.events.splice(0,100);
      options.onEvent?.(event);
    },
    tone(...args){core.emit('tone',{args});},
    message(text,duration=2.2){session.message=text;session.messageUntil=session.time+duration;},
    impact(p,color='#efd49a',count=8){
      const r=session.run;
      for(let i=0;i<count;i++)r.sparks.push({pos:{...p},vel:V((core.random()-.5)*2.3,core.random()*1.8,(core.random()-.5)*2),life:.25+core.random()*.3,size:.013+core.random()*.014,color});
      if(r.sparks.length>90)r.sparks.splice(0,r.sparks.length-90);session.hitUntil=session.time+.13;
    },
    award(success,score,medal,details=[]){
      if(session.phase==='result')return;
      const r=session.run;
      session.result={success,score,medal:success?clamp(medal,1,3):0,details,mode,level,playlist,difficulty:r.difficulty.id,key:r.key,day,elapsed:r.elapsed,trace:r.trace};
      session.phase='result';clearInput();core.emit('result',{success,score,medal,key:r.key});
      core.tone(success?620:180,.3,.14,'triangle',success?940:90);
      options.onResult?.(session.result);
    }
  };
  core.racing=createRacing(core);core.shooting=createShooting(core);core.darts=createDarts(core);core.throwing=createThrowing(core);

function start(){
  const def=LEVELS[session.mode][session.level],d=core.difficulty(),daily=session.playlist==='daily';session.seed=hash(`${session.mode}:${session.level}:${daily?session.day:session.initialSeed}`);
 const r={def:{...def},difficulty:{...d},key:`${session.mode}:${session.level}:${d.id}:${daily?'daily-'+session.day:session.playlist}`,elapsed:0,countdown:3,cooldown:0,score:0,shots:0,hits:0,combo:0,maxCombo:0,aim:0,charge:0,charging:false,holdTime:0,releaseAnim:0,pos:V(),tracers:[],sparks:[],embedded:[],targets:[],projectile:null};
 session.run=r;session.look={yaw:0,pitch:0};
 if(session.mode==='race'){
  const q=trackAt(session.track,0),c={pos:{...q.pos},yaw:q.yaw,pitch:q.pitch,roll:0,speed:0,lateral:0,steer:0,steerVisual:0,wheel:0,hp:100,kind:'sport',color:SKINS[session.save.settings.skin].color};
  Object.assign(r,{car:c,tune:session.save.settings.tune,nextGate:1,checkpoints:0,lap:1,lapStart:0,lapTimes:[],lastS:0,progress:0,penalty:0,collisions:0,bumpAt:-1,nitro:100,drift:0,skids:[],trace:[],ghost:session.save.ghosts[r.key]||null,rivals:[],rank:4,wet:daily&&(session.seed%3===0)});
  for(let i=0;i<3;i++){const s=7+i*6,q=trackAt(session.track,s,(i-1)*2.8);r.rivals.push({id:i,pos:q.pos,yaw:q.yaw,pitch:q.pitch,speed:0,progress:s,pace:def.pace*d.ai*(1+i*.045),lane:(i-1)*2.8,currentLane:(i-1)*2.8,color:['#9abbba','#d89d78','#bec68c'][i],kind:'sport',wheel:0,steerVisual:0,hp:100,braking:false,roll:0});}
 }else if(session.mode==='shooting'){
  const w=WEAPONS[session.save.settings.weapon];Object.assign(r,{weapon:session.save.settings.weapon,ammo:w.mag,reload:0,kick:0,flash:0,missed:0,fouls:0,spawnAt:0,duration:def.duration*d.time,wave:1});
  for(let i=0;i<5;i++){const distance=def.mixed?[12,22,40,30,16][i]:def.distance+(i%2)*3;const t={id:i,x:(i-2)*2.0,baseX:(i-2)*2.0,y:0,z:-distance,scale:d.size*(def.mixed&&distance>30?1.5:1),active:false,fold:1,until:0,friend:false,phase:i*1.7};r.targets.push(t);}
  core.shooting.spawn();session.look.pitch=-.032;
 }else if(session.mode==='darts'){
  Object.assign(r,{throws:0,turn:[],turnStart:parseInt(def.rule)||0,remaining:parseInt(def.rule)||0,around:1,round:1,completedSets:0,bankedScore:0,aiWins:0,aiRemaining:501,aiAt:0,aiTurn:false,aiThrows:0,aiTurnStart:501,aiLast:[],bestTurn:0,history:[],lastDart:null,limit:Math.ceil(def.throws*d.time),busts:0});
  session.look.pitch=.055;
 }else{
  Object.assign(r,{throws:0,limit:def.arrows,baseWind:(session.seed%2?1:-1)*def.wind*d.wind,wind:0,windPhase:core.random()*TAU,round:1,history:[],tens:0});r.wind=r.baseWind;
  const distances=def.mixed?[15,30,45]:[def.distance];for(let i=0;i<distances.length;i++)r.targets.push({id:i,x:def.mixed?(i-1)*3:0,baseX:def.mixed?(i-1)*3:0,y:1.4,z:-distances[i],radius:.61*d.size,phase:i*2});r.activeTarget=0;
  session.look.yaw=Math.atan2(-r.targets[0].x,-r.targets[0].z);session.look.pitch=.01;
 }
 session.phase='countdown';clearInput();core.emit('start',{mode:session.mode,level:session.level,playlist:session.playlist,difficulty:d.id});core.emit("state");
}


  function clearInput(){
    session.held.clear();session.touch={steer:0,x:0,y:0};
    if(session.run){session.run.charging=false;session.run.charge=0;session.run.holdTime=0;}
  }
  function hold(action,pressed){
    if(pressed){if(session.phase!=='playing')return;session.held.add(action);if(action==='action')core.throwing.startCharge();}
    else{session.held.delete(action);if(action==='action')core.throwing.release();}
  }
  function look(dx,dy){
    if(!['playing','countdown'].includes(session.phase))return;
    const scale=(mode==='darts'?.00045:mode==='archery'?.0009:.0018)*settings.sensitivity*(1-(session.run?.aim||0)*.55);
    session.look.yaw-=dx*scale;session.look.pitch=clamp(session.look.pitch-dy*scale,-.7,.8);
  }
  function pause(){if(['playing','countdown'].includes(session.phase)){session.resumePhase=session.phase;session.phase='paused';clearInput();core.emit('pause');}}
  function resume(){if(session.phase==='paused'){session.phase=session.resumePhase||'playing';clearInput();core.emit('resume');}}
  function bank(){
    const r=session.run;if(session.phase!=='playing'||playlist!=='endless')return false;
    if(r.elapsed<3){core.message('先体验几秒，再记录这次成绩');return false;}
    const score=mode==='race'?Math.round(r.progress):r.score;
    const medal=mode==='race'?Math.floor(r.checkpoints/12)>=3?3:Math.floor(r.checkpoints/12)>=1?2:1:score>800?3:score>180?2:1;
    core.award(true,score,medal,[[formatTime(r.elapsed),'练习时长'],[mode==='race'?Math.floor(r.checkpoints/12)+' 圈':r.shots+' 次','完成练习'],[mode==='shooting'?r.wave+' 波':mode==='archery'?r.round+' 组':'自由挑战','练习进度']]);return true;
  }
  function poses(){
    const r=session.run;if(!r)return null;
    return {pos:{...r.pos},car:r.car?{...r.car,pos:{...r.car.pos}}:null,rivals:r.rivals?.map(a=>({...a,pos:{...a.pos}})),targets:r.targets.map(t=>({...t})),projectile:r.projectile?{...r.projectile,pos:{...r.projectile.pos},vel:{...r.projectile.vel}}:null};
  }
  function step(dt=FIXED_DT){
    if(Math.abs(dt-FIXED_DT)>1e-10)throw Error('The authoritative simulation requires a 1/120 second step');
    if(['paused','result','lobby'].includes(session.phase))return;
    previous=poses();session.time+=dt;const r=session.run;if(!r)return;
    if(session.phase==='countdown'){
      const old=Math.ceil(r.countdown);r.countdown-=dt;
      if(Math.ceil(r.countdown)<old)core.tone(r.countdown<=0?900:480,.07,.07,'triangle',r.countdown<=0?1200:480);
      if(r.countdown<=0){session.phase='playing';core.emit('go');core.message(mode==='race'?'GO / 全速出发':'开始挑战',1);}return;
    }
    r.elapsed+=dt;r.cooldown=Math.max(0,r.cooldown-dt);r.releaseAnim=Math.max(0,r.releaseAnim-dt*4);
    r.aim=mix(r.aim,session.held.has('secondary')?1:0,1-Math.exp(-dt*11));
    if(session.held.has('lookLeft'))session.look.yaw+=dt*.85;if(session.held.has('lookRight'))session.look.yaw-=dt*.85;
    if(session.held.has('lookUp'))session.look.pitch+=dt*.60;if(session.held.has('lookDown'))session.look.pitch-=dt*.60;
    session.look.pitch=clamp(session.look.pitch,-.7,.8);if(mode==='race')session.look.yaw=clamp(session.look.yaw,-1.1,1.1);
    if(mode==='race')core.racing.step(dt);else if(mode==='shooting')core.shooting.step(dt);else core.throwing.step(dt);
    for(const t of r.tracers)t.life-=dt;r.tracers=r.tracers.filter(t=>t.life>0).slice(-12);
    for(const p of r.sparks){p.vel.y-=dt*4;p.pos=add(p.pos,mul(p.vel,dt));p.life-=dt;}r.sparks=r.sparks.filter(p=>p.life>0);
  }
  const lerpV=(a,b,t)=>V(mix(a.x,b.x,t),mix(a.y,b.y,t),mix(a.z,b.z,t));
  function snapshot(alpha=1){
    const r=session.run;let run=null,ghost=null;
    if(r){
      const {trace,ghost:recorded,...small}=r;run=structuredClone(small);
      if(previous){
        const blend=(a,b)=>{if(!a||!b)return;if(b.pos)a.pos=lerpV(b.pos,a.pos,alpha);for(const k of ['yaw','pitch','roll','wheel'])if(Number.isFinite(a[k])&&Number.isFinite(b[k]))a[k]=lerpAngle(b[k],a[k],alpha);};
        run.pos=lerpV(previous.pos,run.pos,alpha);blend(run.car,previous.car);
        run.rivals?.forEach((a,i)=>blend(a,previous.rivals?.[i]));
        run.targets.forEach((a,i)=>{const b=previous.targets[i];if(b){a.x=mix(b.x,a.x,alpha);a.fold=mix(b.fold||0,a.fold||0,alpha);}});
        if(run.projectile&&previous.projectile)run.projectile.pos=lerpV(previous.projectile.pos,run.projectile.pos,alpha);
      }
      if(recorded?.length>1&&r.elapsed>1&&r.elapsed<recorded.at(-1)[0]){
        let i=Math.min(recorded.length-2,Math.floor(r.elapsed*10));
        while(i>0&&recorded[i][0]>r.elapsed)i--;while(i<recorded.length-2&&recorded[i+1][0]<r.elapsed)i++;
        const a=recorded[i],b=recorded[i+1],t=clamp((r.elapsed-a[0])/(b[0]-a[0]||1),0,1);
        ghost={pos:V(mix(a[1],b[1],t),mix(a[2],b[2],t)+.08,mix(a[3],b[3],t)),yaw:lerpAngle(a[4],b[4],t)};
      }
    }
    return {mode,level,playlist,phase:session.phase,time:session.time,look:{...session.look},settings:{...settings},run,ghost,camera:cameraPose(session,run),prediction:core.throwing.prediction(),hit:session.time<session.hitUntil,message:session.time<session.messageUntil?session.message:''};
  }
  return {
    state:session,core,start(){session.result=null;session.run=null;start();previous=poses();},step,hold,look,pause,resume,bank,clearInput,snapshot,
    axis(x,y=0){session.touch={steer:clamp(x,-1,1),x:clamp(x,-1,1),y:mode==='race'?0:clamp(y,-1,1)};},
    recover:()=>core.racing.recover(),reload:()=>core.shooting.reload(),
    updateSettings(next){for(const k of ['volume','assist','sensitivity','quality','look','resolution','camera'])if(k in next)settings[k]=next[k];},
    camera:core.camera,launchProfile:core.throwing.launchProfile,prediction:core.throwing.prediction
  };
}
