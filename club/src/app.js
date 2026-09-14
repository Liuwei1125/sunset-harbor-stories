import {createSimulation} from './games/simulation.js';
import {MODES,SUPPORTED_ENGINES} from './games/catalog.js';
import {ProgressStore} from './platform/storage.js';
import {ClubAudio} from './platform/audio.js';
import {ClubInput} from './platform/input.js';
import {Diagnostics} from './platform/diagnostics.js';
import {FixedClock} from './core/clock.js';
import {awardProgress,localDay} from './core/progress.js';
import {createRenderer} from './presentation/engine.js';
import {ClubUI,$} from './ui.js';
import {RACE_CAMERAS,raceCamera} from './core/camera.js';

class ClubApp{
 constructor(){
  this.store=new ProgressStore();this.progress=this.store.load();this.engine=this.progress.settings.engine;this.audio=new ClubAudio();this.diagnostics=new Diagnostics();
  this.ui=new ClubUI(this);this.loading=false;this.renderer=null;this.result=null;this.disposed=false;this.lastHUD=0;this.manual=false;
  const query=new URLSearchParams(location.search),requested=query.get('mode');this.selection={mode:MODES[requested]?requested:'race',level:Math.max(0,Math.min(5,Number(query.get('level'))||0)),playlist:['levels','daily','endless'].includes(query.get('playlist'))?query.get('playlist'):'levels'};
  if(!SUPPORTED_ENGINES[this.engine].includes(this.selection.mode))this.engine='babylon';
  this.touch=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;if(this.touch)document.body.classList.add('touch-active');
  this.attachCanvas($('view'));
  this.clock=new FixedClock(dt=>this.sim?.step(dt));
  addEventListener('pagehide',()=>this.dispose());
  addEventListener('error',e=>this.diagnostics.errors.push(e.message));
  addEventListener('unhandledrejection',e=>this.diagnostics.errors.push(String(e.reason?.message||e.reason)));
  // Verification exposes production commands and a controllable clock, never hit/award shortcuts.
  if(query.get('verify')==='1')window.__club={app:this,get sim(){return this.app.sim;},get renderer(){return this.app.renderer;},select:o=>this.select(o),start:()=>this.start(),pause:()=>this.pause(),resume:()=>this.resume(),tick:seconds=>{this.manual=true;for(let i=0;i<Math.round(seconds*120);i++)this.sim.step(1/120);this.draw(1);},normal:()=>{this.manual=false;this.clock.reset();},report:()=>this.diagnostics.report(this.renderer)};
  this.frame=this.frame.bind(this);this.raf=requestAnimationFrame(this.frame);
 }
 effectiveSettings(){const s=this.progress.settings;return {...s,quality:s.quality==='auto'?(this.touch?'medium':'high'):s.quality};}
 attachCanvas(canvas){
  this.input=new ClubInput(canvas,()=>this.sim,()=>this.pause(),()=>this.audio.unlock().catch(()=>{}),()=>this.cycleCamera());
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();if(this.disposed||this.replacingCanvas)return;this.pause();this.loading=true;this.ui.error(Error('图形上下文暂时丢失，请重试加载场地。'));});
 }
 save(){this.store.save(this.progress);}
 makeSimulation(){
  this.sim=createSimulation({...this.selection,settings:this.progress.settings,day:localDay(),ghosts:this.progress.ghosts,
   onEvent:event=>{if(event.type==='tone')this.audio.tone(...event.args);if(event.type==='go')this.input.sync();},
   onResult:result=>{this.result=awardProgress(this.progress,result);this.save();this.input.cancel();this.audio.silence();queueMicrotask(()=>{if(this.sim.state.phase==='result'){document.exitPointerLock?.();this.ui.result();}});}
  });this.selection.level=this.sim.state.level;
 }
 async boot(){
  if(this.loading)return;this.loading=true;this.ui.loading('正在打开俱乐部',.02);
  try{
   this.makeSimulation();if(!this.renderer)this.renderer=await createRenderer($('view'),this.engine,this.effectiveSettings(),(t,v)=>this.ui.loading(t,v));
   await this.renderer.setScene(this.sim.state,(t,v)=>this.ui.loading(t,v));await this.renderer.ready(this.sim.snapshot());
   this.loading=false;this.clock.reset();this.ui.close();this.ui.lobby();this.ui.loaded();this.diagnostics.interactive();this.audio.setVolume(this.progress.settings.volume);
  }catch(error){this.loading=false;this.diagnostics.errors.push(error.message);this.ui.error(error);console.error(error);}
 }
 async select(next){
  if(this.loading)return;const selection={...this.selection,...next};if(!MODES[selection.mode])return;
  if(!SUPPORTED_ENGINES[this.engine].includes(selection.mode)){this.selection=selection;this.switchEngine('babylon');return;}
  this.input.cancel();this.audio.silence();this.ui.close();document.exitPointerLock?.();this.selection=selection;this.result=null;this.loading=true;this.ui.loading('正在布置场地',.16);
  try{this.makeSimulation();await this.renderer.setScene(this.sim.state,(t,v)=>this.ui.loading(t,v));await this.renderer.ready(this.sim.snapshot());this.loading=false;this.clock.reset();this.ui.lobby();this.ui.loaded();}
  catch(error){this.loading=false;this.diagnostics.errors.push(error.message);this.ui.error(error);console.error(error);}
 }
 reconfigure(){if(!this.sim||this.sim.state.phase!=='lobby')return;this.makeSimulation();this.renderer.session=this.sim.state;this.ui.lobby();}
 async start(){if(this.loading)return;if(this.selection.playlist==='daily'&&this.sim.state.day!==localDay())await this.select({playlist:'daily'});if(this.loading||$('load-error').hidden===false)return;this.ui.close();this.input.cancel();await this.audio.unlock().catch(()=>{});this.result=null;this.makeSimulation();this.renderer.session=this.sim.state;this.sim.start();this.clock.reset();this.ui.game();$('view').focus({preventScroll:true});this.draw(1);}
 pause(){if(!this.sim||this.loading)return;const phase=this.sim.state.phase;if(phase==='paused'){if(this.ui.dialogKind==='pause')this.resume();return;}if(!['playing','countdown'].includes(phase))return;this.sim.pause();this.input.cancel();this.audio.silence();document.exitPointerLock?.();this.ui.pause();}
 resume(){if(this.sim.state.phase!=='paused')return;this.ui.close();this.input.cancel();this.sim.resume();this.clock.reset();$('view').focus({preventScroll:true});}
 setting(key,value){
  this.progress.settings[key]=value;this.save();this.sim.updateSettings({[key]:value});if(key==='volume')this.audio.setVolume(value);if(['look','quality','resolution'].includes(key))this.renderer.setQuality(this.effectiveSettings());
 }
 cycleCamera(){
  if(this.loading||this.sim?.state.mode!=='race')return;
  const current=RACE_CAMERAS.findIndex(([id])=>id===raceCamera(this.progress.settings.camera));
  this.setting('camera',RACE_CAMERAS[(current+1)%RACE_CAMERAS.length][0]);this.ui.camera();this.draw(1);
 }
 import(text){this.progress=this.store.import(text);this.sim.updateSettings(this.progress.settings);this.audio.setVolume(this.progress.settings.volume);this.renderer.setQuality(this.effectiveSettings());}
 export(){const blob=new Blob([JSON.stringify(this.progress,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='harbor-club-'+localDay()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);if($('settings-status'))$('settings-status').textContent='进度已导出。';}
 switchEngine(engine){
  if(engine===this.engine)return;if(!SUPPORTED_ENGINES[engine].includes(this.selection.mode))return;
  if(this.sim.state.playlist==='endless'&&['playing','paused'].includes(this.sim.state.phase)){if(this.sim.state.phase==='paused')this.sim.resume();this.sim.bank();}
  this.progress.settings.engine=engine;this.save();this.dispose();const url=new URL(location.href);for(const [k,v] of Object.entries(this.selection))url.searchParams.set(k,v);location.assign(url.href);
 }
 async action(action){
  if(action==='retry-load'){this.replacingCanvas=true;this.input.dispose();this.renderer?.dispose();this.renderer=null;const old=$('view'),canvas=old.cloneNode();old.replaceWith(canvas);this.attachCanvas(canvas);this.replacingCanvas=false;this.loading=false;await this.boot();return;}
  if(this.loading)return;
  if(action==='brief'){this.audio.unlock().catch(()=>{});this.ui.brief();}
  else if(action==='close')this.ui.close();
  else if(action==='go'||action==='retry')await this.start();
  else if(action==='pause')this.pause();
  else if(action==='camera')this.cycleCamera();
  else if(action==='resume')this.resume();
  else if(action==='lobby')await this.select({});
  else if(action==='next'){await this.select({level:this.selection.level+1});await this.start();}
  else if(action==='bank')this.sim.bank();
  else if(action==='settings')this.ui.settings();
  else if(action==='records')this.ui.records();
  else if(action==='credits')this.ui.credits();
  else if(action==='settings-done'){const phase=this.sim.state.phase;if(phase==='paused')this.ui.pause();else if(phase==='result')this.ui.result();else{this.ui.close();this.reconfigure();}}
  else if(action==='export')this.export();
  else if(action==='import')$('import-file').click();
  else if(action==='switch-engine')this.switchEngine($('engine-choice').value);
 }
 draw(alpha=1){if(this.loading||!this.renderer||!this.sim||this.disposed)return;const snapshot=this.sim.snapshot(alpha);this.renderer.render(snapshot);const now=performance.now();if(now-this.lastHUD>90||this.manual){this.lastHUD=now;this.ui.hud(snapshot);if(this.ui.perf){const stats=this.renderer.stats();$('performance').textContent=`${Math.round(stats.fps)} FPS · ${stats.width} × ${stats.height}\n${stats.drawCalls??'—'} draws · ${stats.triangles==null?'—':Math.round(stats.triangles/1000)+'k'} triangles`;}}this.audio.update(snapshot);}
 frame(now){if(this.disposed)return;this.raf=requestAnimationFrame(this.frame);if(this.loading||!this.renderer||!this.sim){this.clock.reset(now);return;}try{const alpha=this.manual?1:this.clock.advance(now,!document.hidden);this.draw(alpha);this.diagnostics.frame(now,this.renderer,this.sim.state.phase,this.clock);}catch(error){this.input.cancel();this.audio.silence();this.diagnostics.errors.push(error.message);this.loading=true;this.ui.error(error);console.error(error);}}
 dispose(){if(this.disposed)return;this.disposed=true;cancelAnimationFrame(this.raf);this.input.dispose();this.audio.dispose();this.renderer?.dispose();}
}

const app=new ClubApp();app.boot();
