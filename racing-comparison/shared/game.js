import {Simulation,benchmarkInput} from './simulation.js';
import {EngineSound} from './sound.js';
export async function startGame({Renderer,engine,storageKey}){
const $=id=>document.getElementById(id),loadingAt=0,keys=new Set(),touch=new Set(),audio=new EngineSound(),frames=[];
let sim,renderer,last=performance.now(),accumulator=0,eventIndex=0,readyAt=0,fpsAt=0,paused=false,benchmark=new URLSearchParams(location.search).has('benchmark'),resultShown=false,benchmarkChanged=false,benchmarkCamera=0;
const read=async url=>{const r=await fetch(url);if(!r.ok)throw Error(url+' HTTP '+r.status);return r.json();};
const cameraNames=['座舱','引擎盖','追车'];
function restart(){sim.start();paused=false;resultShown=false;benchmarkChanged=false;benchmarkCamera=renderer.cameraMode;eventIndex=0;frames.length=0;accumulator=0;last=performance.now();$('menu').classList.add('hidden');$('result').classList.add('hidden');$('pausemenu').classList.add('hidden');audio.start();$('game').focus();}
function pause(value){if(value&&benchmark&&sim?.phase==='running')benchmarkChanged=true;if(sim?.phase!=='running')return;paused=value;keys.clear();touch.clear();$('pausemenu').classList.toggle('hidden',!paused);last=performance.now();accumulator=0;}
function camera(){if(!renderer)return;if(benchmark&&sim.phase==='running')benchmarkChanged=true;renderer.cameraMode=(renderer.cameraMode+1)%3;$('camera').textContent=cameraNames[renderer.cameraMode]+' · C';}
function toggleSound(){audio.enabled=!audio.enabled;$('sound').textContent='声音 '+(audio.enabled?'开':'关');}
$('start').onclick=restart;$('again').onclick=restart;$('restart').onclick=restart;$('resume').onclick=()=>pause(false);$('pause').onclick=()=>pause(!paused);$('camera').onclick=camera;$('sound').onclick=toggleSound;
$('tomenu').onclick=()=>{sim.reset();resultShown=false;$('result').classList.add('hidden');$('menu').classList.remove('hidden');};
for(const button of document.querySelectorAll('[data-level]'))button.onclick=()=>{if(!sim)return;sim.reset(Number(button.dataset.level));for(const b of document.querySelectorAll('[data-level]'))b.classList.toggle('selected',b===button);};
addEventListener('resize',()=>{if(benchmark&&sim?.phase==='running')benchmarkChanged=true;});
$('quality').onchange=()=>{if(benchmark&&sim?.phase==='running')benchmarkChanged=true;renderer?.setQuality($('quality').value);};
addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','Escape'].includes(e.code))e.preventDefault();if(e.repeat)return;keys.add(e.code);if(e.code==='KeyC')camera();if(e.code==='KeyM')toggleSound();if(e.code==='Escape')pause(!paused);if(e.code==='KeyR'&&sim)restart();if(e.code==='Enter'&&sim?.phase==='ready')restart();});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();touch.clear();if(!benchmark)pause(true);});document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});
for(const el of document.querySelectorAll('[data-input]')){el.onpointerdown=e=>{e.preventDefault();el.setPointerCapture(e.pointerId);touch.add(el.dataset.input);};for(const kind of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(kind,()=>touch.delete(el.dataset.input));}
function input(){
 if(benchmark)return benchmarkInput(sim);
 return{steer:(keys.has('KeyD')||keys.has('ArrowRight')||touch.has('right')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')||touch.has('left')?1:0),brake:keys.has('KeyS')||keys.has('ArrowDown')||touch.has('brake'),boost:keys.has('Space')||touch.has('boost')};
}
function updateHUD(now){
 const s=sim,km=Math.round(s.speed*3.6),seconds=Math.ceil(s.time);$('speed').textContent=km;$('gear').textContent=Math.min(6,Math.max(1,Math.floor(s.speed/12)+1));$('timer').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');$('distance').textContent=Math.floor(s.progress)+' / '+s.mode.target+' m';$('distancebar').style.width=Math.min(100,s.progress/s.mode.target*100)+'%';$('score').textContent=String(s.score).padStart(5,'0');$('passes').textContent='超越 '+s.overtakes+' · 擦车 '+s.nearMisses;$('health').textContent=Math.ceil(s.health);$('healthbar').style.width=s.health+'%';$('nitrobar').style.width=s.nitro+'%';$('hit').style.opacity=s.hit*.7;$('objective').textContent=benchmark?'自动驾驶 · 固定场景对比':s.boosting?'氮气喷射 · 保持路线':s.combo>1?'连击 ×'+s.combo+' · 继续擦车':'保持速度，穿过车流';
 const ev=s.events.at(-1);if(ev&&s.elapsed-ev.time<1.8){$('notification').textContent=ev.text;$('notification').style.opacity=1;$('notification').classList.toggle('bad',ev.kind==='bad');if(ev.kind==='bad'&&ev!==eventIndex){audio.crash();eventIndex=ev;}}else{$('notification').style.opacity=0;$('notification').textContent='';}
 if(now-fpsAt>700){const q=renderer.stats();$('telemetry').textContent=`${q.fps.toFixed(0)} FPS · ${q.width}×${q.height} · ${q.triangles?Math.round(q.triangles/1000)+'k tris · ':''}加载 ${((readyAt-loadingAt)/1000).toFixed(2)}s`;fpsAt=now;}
 if(s.phase==='finished'&&!resultShown){resultShown=true;$('result').classList.remove('hidden');$('resulttitle').textContent=s.result;let best=0;try{best=Number(localStorage.getItem('coast-best-'+s.difficulty))||0;localStorage.setItem('coast-best-'+s.difficulty,Math.max(best,s.score));}catch{}$('resultstats').innerHTML=`行驶距离 <b>${Math.floor(s.progress)} m</b><br>本轮得分 <b>${s.score}</b><br>超越 / 擦车 <b>${s.overtakes} / ${s.nearMisses}</b><br>最高连击 <b>×${s.maxCombo}</b><br>个人纪录 <b>${Math.max(best,s.score)}</b>`;if(benchmark)saveBenchmark();}
}
function saveBenchmark(){const sorted=[...frames].sort((a,b)=>a-b),avg=frames.reduce((a,b)=>a+b,0)/frames.length,q=renderer.stats();const report={schemaVersion:2,engine,loadDefinition:'navigation-to-render-ready',seed:sim.rules.seed,fixture:'coast-v1',userAgent:navigator.userAgent,at:new Date().toISOString(),loadMs:readyAt-loadingAt,samples:frames.length,averageFps:1000/avg,p95FrameMs:sorted[Math.floor(sorted.length*.95)],render:q,game:sim.snapshot(),quality:$('quality').value,camera:cameraNames[benchmarkCamera],comparable:!benchmarkChanged&&$('quality').value==='high'&&benchmarkCamera===0&&sim.difficulty===0,visibility:document.visibilityState};window.racerBenchmark=report;if(report.comparable)try{localStorage.setItem('coast-benchmark-'+storageKey,JSON.stringify(report));}catch{} }
try{
 const [rules,models,world]=await Promise.all([read('../shared/rules.json'),read('../shared/models.json'),read('../shared/world.json')]);
 sim=new Simulation(rules);renderer=new Renderer($('game'),rules,models,world);await renderer.ready(sim);readyAt=performance.now();$('start').disabled=false;$('start').textContent='开始驾驶  →';
 window.racerQA={snapshot:()=>sim.snapshot(),render:()=>renderer.stats(),get paused(){return paused},get camera(){return cameraNames[renderer.cameraMode]},get loadingMs(){return readyAt-loadingAt},get frameSamples(){return frames.length},get engine(){return engine}};
 renderer.startLoop(()=>{const now=performance.now(),raw=now-last,dt=Math.min(.05,raw/1000);last=now;if(sim.phase==='running'&&!paused){accumulator+=dt;while(accumulator>=rules.fixedStep){sim.step(rules.fixedStep,input());accumulator-=rules.fixedStep;}if(sim.elapsed>3&&document.visibilityState==='visible')frames.push(raw);}renderer.render(sim,dt);audio.update(paused?{...sim,phase:'paused'}:sim);updateHUD(now);});
 if(benchmark)restart();
}catch(error){console.error(error);$('loaderror').textContent='载入失败：'+error.message+'。请通过本地 HTTP 服务打开。';$('start').textContent='载入失败';}

}
