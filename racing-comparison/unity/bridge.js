// DOM controls and audio only. Simulation and 3D rendering run inside the real Unity player.
import {EngineSound} from '../shared/sound.js';
const $=id=>document.getElementById(id),audio=new EngineSound(),keys=new Set(),touch=new Set();
const startedAt=0,benchmark=new URLSearchParams(location.search).has('benchmark');
let instance,ready=false,readyAt=0,paused=false,camera=0,level=0,state,resultShown=false,lastEvent='',lastInput='',benchmarkChanged=false,benchmarkCamera=0;
const cameraNames=['座舱','引擎盖','追车'];
function resizeCanvas(){const scale=$('quality').value==='high'?1:1.5;$('game').width=Math.max(1,Math.floor($('game').clientWidth/scale));$('game').height=Math.max(1,Math.floor($('game').clientHeight/scale));}
addEventListener('resize',()=>{if(benchmark&&state?.phase==='running')benchmarkChanged=true;resizeCanvas();});
const send=(method,value='')=>instance?.SendMessage('Racer',method,String(value));
function activate(){if(!instance||!ready)return;readyAt=performance.now();$('start').disabled=false;$('start').textContent='开始驾驶  →';if(benchmark){send('SetBenchmark','1');start();}}
window.addEventListener('coast-ready',()=>{ready=true;activate();});
function start(){benchmarkChanged=false;benchmarkCamera=camera;send('StartRace');paused=false;resultShown=false;lastEvent='';lastInput='';$('menu').classList.add('hidden');$('result').classList.add('hidden');$('pausemenu').classList.add('hidden');audio.start();$('game').focus();}
function pause(value){if(value&&benchmark&&state?.phase==='running')benchmarkChanged=true;if(state?.phase!=='running')return;paused=value;keys.clear();touch.clear();send('SetPaused',value?'1':'0');$('pausemenu').classList.toggle('hidden',!value);lastInput='';}
function changeCamera(){if(benchmark&&state?.phase==='running')benchmarkChanged=true;camera=(camera+1)%3;send('SetCamera',camera);$('camera').textContent=cameraNames[camera]+' · C';}
function sound(){audio.enabled=!audio.enabled;$('sound').textContent='声音 '+(audio.enabled?'开':'关');}
$('start').onclick=start;$('again').onclick=start;$('restart').onclick=start;$('resume').onclick=()=>pause(false);$('pause').onclick=()=>pause(!paused);$('camera').onclick=changeCamera;$('sound').onclick=sound;$('quality').onchange=()=>{if(benchmark&&state?.phase==='running')benchmarkChanged=true;resizeCanvas();send('SetQuality',$('quality').value);};
$('tomenu').onclick=()=>{send('SetDifficulty',level);resultShown=false;$('result').classList.add('hidden');$('menu').classList.remove('hidden');};
for(const b of document.querySelectorAll('[data-level]'))b.onclick=()=>{level=Number(b.dataset.level);send('SetDifficulty',level);for(const btn of document.querySelectorAll('[data-level]'))btn.classList.toggle('selected',btn===b);};
addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','Escape'].includes(e.code))e.preventDefault();if(e.repeat)return;keys.add(e.code);if(e.code==='KeyC')changeCamera();if(e.code==='KeyM')sound();if(e.code==='Escape')pause(!paused);if(e.code==='KeyR'&&ready)start();if(e.code==='Enter'&&state?.phase==='ready')start();});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>pause(true));document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});
for(const el of document.querySelectorAll('[data-input]')){el.onpointerdown=e=>{e.preventDefault();el.setPointerCapture(e.pointerId);touch.add(el.dataset.input);};for(const kind of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(kind,()=>touch.delete(el.dataset.input));}
function loop(now){
 if(instance&&ready){const input=JSON.stringify({steer:(keys.has('KeyD')||keys.has('ArrowRight')||touch.has('right')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')||touch.has('left')?1:0),brake:keys.has('KeyS')||keys.has('ArrowDown')||touch.has('brake'),boost:keys.has('Space')||touch.has('boost'),throttle:true});if(input!==lastInput){send('SetInput',input);lastInput=input;}}
 requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
window.addEventListener('coast-state',e=>{
 const s=state=e.detail;paused=s.paused;camera=s.camera;$('pausemenu').classList.toggle('hidden',!paused);$('speed').textContent=Math.round(s.speed*3.6);$('gear').textContent=Math.min(6,Math.max(1,Math.floor(s.speed/12)+1));
 const seconds=Math.ceil(s.time);$('timer').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');$('distance').textContent=Math.floor(s.progress)+' / '+s.target+' m';$('distancebar').style.width=Math.min(100,s.progress/s.target*100)+'%';$('score').textContent=String(s.score).padStart(5,'0');$('passes').textContent='超越 '+s.overtakes+' · 擦车 '+s.nearMisses;$('health').textContent=Math.ceil(s.health);$('healthbar').style.width=s.health+'%';$('nitrobar').style.width=s.nitro+'%';$('hit').style.opacity=s.hit*.7;
 $('objective').textContent=benchmark?'自动驾驶 · 固定场景对比':s.boosting?'氮气喷射 · 保持路线':s.combo>1?'连击 ×'+s.combo+' · 继续擦车':'保持速度，穿过车流';
 if(s.eventText&&s.elapsed-s.eventTime<1.8){$('notification').textContent=s.eventText;$('notification').style.opacity=1;$('notification').classList.toggle('bad',s.eventKind==='bad');const id=s.eventTime+s.eventText;if(id!==lastEvent&&s.eventKind==='bad')audio.crash();lastEvent=id;}else{$('notification').style.opacity=0;$('notification').textContent='';}
 audio.update(paused?{...s,phase:'paused'}:s);$('telemetry').textContent=`${s.fps.toFixed(0)} FPS · ${s.width}×${s.height} · Unity / IL2CPP / WebGL 2 · 加载 ${((readyAt-startedAt)/1000).toFixed(2)}s`;
 if(s.phase==='finished'&&!resultShown){resultShown=true;$('result').classList.remove('hidden');$('resulttitle').textContent=s.result;let best=0;try{best=Number(localStorage.getItem('coast-best-'+s.difficulty))||0;localStorage.setItem('coast-best-'+s.difficulty,Math.max(best,s.score));}catch{}$('resultstats').innerHTML=`行驶距离 <b>${Math.floor(s.progress)} m</b><br>本轮得分 <b>${s.score}</b><br>超越 / 擦车 <b>${s.overtakes} / ${s.nearMisses}</b><br>最高连击 <b>×${s.maxCombo}</b><br>个人纪录 <b>${Math.max(best,s.score)}</b>`;if(benchmark){const report={schemaVersion:2,loadDefinition:'navigation-to-render-ready',fixture:'coast-v1',userAgent:navigator.userAgent,engine:'Unity '+window.coastUnityConfig.version,at:new Date().toISOString(),loadMs:readyAt-startedAt,samples:s.samples,averageFps:s.averageFps,p95FrameMs:s.p95FrameMs,render:{width:s.width,height:s.height,fps:s.fps},game:s,quality:$('quality').value,camera:cameraNames[benchmarkCamera],comparable:!benchmarkChanged&&$('quality').value==='high'&&benchmarkCamera===0&&level===0,visibility:document.visibilityState};window.racerBenchmark=report;if(report.comparable)try{localStorage.setItem('coast-benchmark-unity',JSON.stringify(report));}catch{}}}
});
window.racerQA={snapshot:()=>state,get loadingMs(){return readyAt-startedAt},get paused(){return paused},get camera(){return cameraNames[camera]}};
try{
 if(!window.coastUnityConfig)throw Error('Unity 构建配置未生成');
 const {loaderUrl,config}=window.coastUnityConfig;await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=loaderUrl;script.onload=resolve;script.onerror=()=>reject(Error('Unity loader 加载失败'));document.body.append(script);});
 resizeCanvas();instance=await window.createUnityInstance($('game'),{...config,devicePixelRatio:1,matchWebGLToCanvasSize:false},p=>{$('start').textContent='载入 Unity · '+Math.round(p*100)+'%';});activate();
}catch(error){console.error(error);$('loaderror').textContent='Unity 载入失败：'+error.message;$('start').textContent='载入失败';}
