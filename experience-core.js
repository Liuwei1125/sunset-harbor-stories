/* V6 foundation. Gameplay capacity, deterministic snapshots, one quality policy,
   and diagnostic measurements. GPU timers are optional, asynchronous, never fabricated.
   References: MDN EXT_disjoint_timer_query and Pointer_events. */
const EXPERIENCE_VERSION=6;
const experience={
 mission:null,result:null,lastWeapon:0,action:null,crouching:false,walkSpeed:0,runBlend:0,
 movement:0,stride:0,shootAt:-9,noise:[],attackSlots:new Set(),slotAt:0,
 renderPoses:new Map(),cameraPose:null,rendering:false,frameAlpha:1,
 options:{flight:'assisted',lockToggle:true,shake:.35,aimAssist:true,lookSensitivity:1,showLabels:true},
 flight:{targetYaw:0,targetPitch:0,autoLock:false,throttle:.72,freeLook:false,touchSteer:0,touchPitch:0},
 progress:{wins:0,best:null,routes:[],portUnlocked:false,helipadUnlocked:false,ledger:[]},
 input:{interact:false,crouch:false,look:false},events:[],waypoints:[],initialized:false,
 director:{phase:'calm',until:0,lastDamage:-30,lastAlarm:-30,reinforced:false},
 audio:null,stats:{shots:0,hits:0,distance:0,damage:0,interactions:0},lastMessageAt:0
};
function recordEvent6(type,data={}){experience.events.push({t:+state.t.toFixed(3),type,...data});if(experience.events.length>500)experience.events.splice(0,100);}
function projectileCapacity6(kind){
 const ordnance=['grenade','molotov','missile','rocket'].includes(kind);
 let count=0;for(const p of combat.projectiles)if(['grenade','molotov','missile','rocket'].includes(p.kind)===ordnance)count++;
 return count<(ordnance?96:256);
}
function pose6(actor,alpha=experience.frameAlpha){
 if(experience.renderPoses.has(actor))return experience.renderPoses.get(actor);
 const p=actor.pos,prev=actor.prevPos||p,a=state.paused?1:clamp(alpha,0,1);
 const pose={pos:V(mix(prev.x,p.x,a),mix(prev.y||0,p.y||0,a),mix(prev.z,p.z,a)),
 yaw:typeof actor.prevYaw==='number'?lerpAngle(actor.prevYaw,actor.yaw||0,a):actor.yaw||0,
 pitch:mix(actor.prevPitch??actor.pitch??0,actor.pitch||0,a),roll:mix(actor.prevRoll??actor.roll??0,actor.roll||0,a)};
 experience.renderPoses.set(actor,pose);return pose;
}
function withRenderSnapshot6(alpha,fn){
 experience.renderPoses.clear();experience.frameAlpha=alpha;experience.rendering=true;
 const actors=[player,...cars,...enemies,...civilians,...combat.units,...combat.jets];const saved=[];
 const eye=cam.eye,dir=cam.dir,vp=cam.vp;
 for(const o of actors){if(!o.pos)continue;const q=pose6(o,alpha);saved.push([o,o.pos,o.yaw,o.pitch,o.roll]);o.pos=q.pos;o.yaw=q.yaw;o.pitch=q.pitch;o.roll=q.roll;}
 const a=state.paused?1:clamp(alpha,0,1),prevEye=cam.prevEye||eye,prevDir=cam.prevDir||dir;
 cam.eye=V(mix(prevEye.x,eye.x,a),mix(prevEye.y,eye.y,a),mix(prevEye.z,eye.z,a));
 cam.dir=norm(V(mix(prevDir.x,dir.x,a),mix(prevDir.y,dir.y,a),mix(prevDir.z,dir.z,a)));
 const shake=state.started&&!state.paused&&!scopeActive()?Math.min(.20,cam.trauma||0)*experience.options.shake:0;
 if(shake){cam.eye=add(cam.eye,V(Math.sin(state.t*71)*shake*.13,Math.cos(state.t*83)*shake*.09,0));}
 const fov=cam.armoryFov8??(scopeActive()?2*Math.atan(Math.tan(66*PI/360)/combat.scopeZoom):cam.fov6||66*PI/180);
 const near=typeof RADIANCE9!=='undefined'&&RADIANCE9.enabled?(state.car?.medium==='air'?.4:.18):.08;
 cam.vp=matmul(perspective(fov,innerWidth/innerHeight,near,state.car?.medium==='air'?2700:2100),lookAt(cam.eye,add(cam.eye,cam.dir)));
 experience.cameraPose={eye:{...cam.eye},dir:{...cam.dir},vp:cam.vp};
 try{return fn();}finally{for(const [o,p,y,pi,r]of saved){o.pos=p;o.yaw=y;o.pitch=pi;o.roll=r;}cam.eye=eye;cam.dir=dir;cam.vp=vp;experience.rendering=false;}
}
const QUALITY6=[
 {detail:26,landView:180,airView:460,shadow:0,shadowRadius:35,scale:.62,particles:60},
 {detail:53,landView:300,airView:680,shadow:512,shadowRadius:48,scale:.83,particles:115},
 {detail:90,landView:480,airView:960,shadow:1024,shadowRadius:68,scale:1,particles:180}
];
const quality6={level:2,resolution:1,next:0,good:0,bad:0,reason:'STARTUP'};
function applyQuality6(){
 if(!renderer)return;const profiles=typeof RADIANCE9!=='undefined'&&RADIANCE9.enabled&&!renderer.software?RADIANCE9.quality:QUALITY6;
 const b=profiles[quality6.level],air=state.car?.medium==='air';
 Object.assign(RENDER,b,{tier:quality6.level,view:air?b.airView:b.landView});
 if(renderer.software){RENDER.shadow=0;RENDER.detail=Math.min(RENDER.detail,38);RENDER.view=Math.min(RENDER.view,air?660:310);}
 const s=b.scale*quality6.resolution;if(Math.abs(renderer.quality-s)>.005){renderer.quality=s;renderer.resize();}
 telemetry.autoReason=quality6.reason;
}
function setQuality6(mode){
 graphicsMode=mode;settings.quality=mode;quality6.level=mode==='low'?0:mode==='medium'?1:mode==='high'?2:touch.enabled||renderer?.software?1:2;
 quality6.resolution=1;quality6.bad=quality6.good=0;quality6.reason=mode.toUpperCase();applyQuality6();
 if($('quality-select'))$('quality-select').value=mode;
 if($('quality-toggle'))$('quality-toggle').textContent='QUALITY / '+mode.toUpperCase();
}
function adjustQuality6(ms){
 applyQuality6();if(graphicsMode!=='auto'||!state.started||state.paused)return;
 const now=performance.now()/1000,target=1000/settings.targetFPS;frameAverage=mix(frameAverage,ms,.035);
 if(frameAverage>target*1.25){quality6.good=0;quality6.bad=quality6.bad||now;}
 else if(frameAverage<target*1.10){quality6.bad=0;quality6.good=quality6.good||now;}else quality6.good=quality6.bad=0;
 if(now<quality6.next)return;
 if(quality6.bad&&now-quality6.bad>4){
  if(telemetry.cpu>target*.7&&quality6.level>0){quality6.level--;quality6.reason='CPU: SCENE / EFFECT BUDGET';}
  else if(quality6.resolution>.68){quality6.resolution=Math.max(.68,quality6.resolution-.08);quality6.reason='RESOLUTION: FRAME PRESSURE';}
  else if(quality6.level>0){quality6.level--;quality6.resolution=.92;quality6.reason='SCENE TIER';}
  quality6.next=now+6;quality6.bad=0;applyQuality6();
 }else if(quality6.good&&now-quality6.good>18){
  const cap=touch.enabled||renderer.software?1:2;
  if(quality6.resolution<1){quality6.resolution=Math.min(1,quality6.resolution+.04);quality6.reason='SLOW RECOVERY: RESOLUTION';}
  else if(quality6.level<cap){quality6.level++;quality6.resolution=.88;quality6.reason='SLOW RECOVERY: SCENE';}
  quality6.next=now+12;quality6.good=0;applyQuality6();
 }
}
const profiler6={active:false,started:0,samples:[],frameWindow:[],lastSample:0,longTasks:0,longTaskMs:0,
 gpuMs:null,gpuSupported:false,queries:[],ext:null,activeQuery:null,errors:[],observer:null,label:'manual',
 inputCount:0,maxFrame:0,over100:0,events:[]};
function initProfiler6(){
 if(!renderer.software){try{profiler6.ext=renderer.gl.getExtension('EXT_disjoint_timer_query');profiler6.gpuSupported=!!profiler6.ext;}catch(_) {}}
 if(typeof PerformanceObserver!=='undefined')try{profiler6.observer=new PerformanceObserver(list=>{for(const e of list.getEntries()){profiler6.longTasks++;profiler6.longTaskMs+=e.duration;}});profiler6.observer.observe({type:'longtask',buffered:true});}catch(_){}
 addEventListener('error',e=>{profiler6.errors.push({type:'error',message:e.message});if(profiler6.errors.length>40)profiler6.errors.shift();});
 addEventListener('unhandledrejection',e=>{profiler6.errors.push({type:'rejection',message:String(e.reason)});});
 for(const event of ['keydown','pointerdown'])addEventListener(event,()=>profiler6.inputCount++,{passive:true});
}
function gpuBegin6(){const p=profiler6,e=p.ext;if(!e||p.activeQuery)return;
 try{const g=renderer.gl;if(g.getParameter(e.GPU_DISJOINT_EXT)){for(const q of p.queries)e.deleteQueryEXT(q);p.queries=[];p.gpuMs=null;return;}
  while(p.queries.length&&e.getQueryObjectEXT(p.queries[0],e.QUERY_RESULT_AVAILABLE_EXT)){const q=p.queries.shift();const ms=e.getQueryObjectEXT(q,e.QUERY_RESULT_EXT)/1e6;p.gpuMs=p.gpuMs===null?ms:mix(p.gpuMs,ms,.2);e.deleteQueryEXT(q);}
  if(p.queries.length>=6)return;
  p.activeQuery=e.createQueryEXT();e.beginQueryEXT(e.TIME_ELAPSED_EXT,p.activeQuery);
 }catch(err){p.ext=null;p.gpuSupported=false;p.gpuMs=null;}}
function gpuEnd6(){const p=profiler6;if(!p.ext||!p.activeQuery)return;try{p.ext.endQueryEXT(p.ext.TIME_ELAPSED_EXT);p.queries.push(p.activeQuery);}catch(_){}p.activeQuery=null;}
function startRecording6(label='manual'){
 Object.assign(profiler6,{active:true,started:performance.now(),samples:[],frameWindow:[],lastSample:0,longTasks:0,longTaskMs:0,maxFrame:0,over100:0,label,inputCount:0,events:[]});
 recordEvent6('recording-start',{label});toast('\u6027\u80fd\u8bb0\u5f55\u5df2\u5f00\u59cb / RECORDING');updateExperienceUI6();
}
function samplePerformance6(ms){const p=profiler6;if(!p.active||state.paused||document.hidden)return;
 p.frameWindow.push(ms);if(p.frameWindow.length>600)p.frameWindow.shift();p.maxFrame=Math.max(p.maxFrame,ms);if(ms>100)p.over100++;
 const now=performance.now();if(now-p.lastSample<1000)return;p.lastSample=now;
 const a=p.frameWindow.slice().sort((a,b)=>a-b);const mean=a.reduce((s,n)=>s+n,0)/(a.length||1);
 p.samples.push({seconds:+((now-p.started)/1000).toFixed(2),fps:+(1000/(mean||16.67)).toFixed(1),p95:a[Math.floor(a.length*.95)]||0,cpuMs:telemetry.cpu,simMs:telemetry.sim,gpuMs:p.gpuMs,
  heapMB:performance.memory?performance.memory.usedJSHeapSize/1048576:null,projectiles:combat.projectiles.length,actors:combat.units.filter(e=>e.alive).length,draws:telemetry.draws,triangles:telemetry.triangles,chunks:telemetry.resident,
  quality:quality6.level,resolution:[canvas.width,canvas.height],medium:state.car?.medium||'foot',mission:experience.mission?.stage||null});
 if(p.samples.length>3600)p.samples.splice(0,300);
}
function diagnosticReport6(){const p=profiler6;return {schema:'sunset-diagnostic-6',createdAt:new Date().toISOString(),label:p.label,
 environment:{ua:navigator.userAgent,renderer:renderer.software?'CPU software compatibility':'WebGL',gpuTimerAvailable:p.gpuSupported,viewport:[innerWidth,innerHeight],devicePixelRatio,hardwareConcurrency:navigator.hardwareConcurrency||null,touch:touch.enabled},
 notice:'Device emulation is not physical-device testing. CPU submission time is not GPU time. No real-device pass is inferred.',
 durationSeconds:p.started?(performance.now()-p.started)/1000:0,framesOver100ms:p.over100,maxFrameMs:p.maxFrame,longTasks:p.longTasks,longTaskMs:p.longTaskMs,inputCount:p.inputCount,
 samples:p.samples,errors:p.errors,events:experience.events,missionResult:experience.result,checks:runInvariantChecks6()};}
function downloadJSON6(value,name){const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500);}
function exportRecording6(){profiler6.active=false;downloadJSON6(diagnosticReport6(),'sunset-v6-diagnostic.json');updateExperienceUI6();}
function runInvariantChecks6(){
 return [
 {name:'Finite player position',pass:Object.values(player.pos).every(Number.isFinite)},
 {name:'Unique projectile IDs',pass:new Set(combat.projectiles.map(p=>p.id)).size===combat.projectiles.length},
 {name:'No gameplay projectile eviction policy',pass:!String(spawnProjectile).includes('.shift(')},
 {name:'Projectile visual budget independent',pass:combat.projectiles.length>=0&&RENDER.particles>=0},
 {name:'Only one active primary activity',pass:[!!experience.mission,!!combat.job,!!contract,!!expeditionJob].filter(Boolean).length<=1},
 {name:'No duplicate campaign reward IDs',pass:new Set(experience.progress.ledger).size===experience.progress.ledger.length},
 {name:'No stale render mutations',pass:!experience.rendering}
 ];
}
function perception6(e,target,range){
 const delta=sub(target,unitChest(e)),distance=length(delta);if(distance>range||Math.abs(delta.y)>24)return false;
 const flat=norm(V(delta.x,0,delta.z)),dotView=dot(forward(e.yaw||0),flat),fov=e.mode==='ENGAGE'||e.mode==='SEARCH'?.15:.5;
 return (distance<2.0||dotView>fov)&&lineClear(unitChest(e),target);
}
