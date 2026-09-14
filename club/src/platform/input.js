export class ClubInput{
 constructor(canvas,getSimulation,onPause,onUnlock,onCamera=()=>{}){
  this.canvas=canvas;this.getSimulation=getSimulation;this.onPause=onPause;this.onUnlock=onUnlock;this.onCamera=onCamera;this.sources=new Map();this.pointers=new Map();this.abort=new AbortController();this.lastLocked=false;
  const listen=(target,event,handler,opts={})=>target.addEventListener(event,handler,{...opts,signal:this.abort.signal});
  listen(window,'keydown',e=>this.key(e,true));listen(window,'keyup',e=>this.key(e,false));
  listen(window,'blur',()=>this.cancel(true));listen(document,'visibilitychange',()=>{if(document.hidden)this.cancel(true);});
  listen(document,'pointerlockchange',()=>{const locked=document.pointerLockElement===canvas;if(this.lastLocked&&!locked)this.cancel(true);this.lastLocked=locked;});
  listen(canvas,'contextmenu',e=>e.preventDefault());
  listen(document,'pointerdown',e=>this.down(e));listen(document,'pointermove',e=>this.move(e));
  listen(document,'pointerup',e=>this.up(e));listen(document,'pointercancel',()=>this.cancel(false));
  listen(document,'lostpointercapture',e=>{if(this.pointers.has(e.pointerId))this.cancel(false);});
 }
 command(action,on,source){
  const sim=this.getSimulation();if(!sim)return;
  const set=this.sources.get(action)||new Set(),was=set.size>0;if(on)set.add(source);else set.delete(source);this.sources.set(action,set);if(was!==(set.size>0))sim.hold(action,set.size>0);
 }
 mouseButtons(buttons){
  const sim=this.getSimulation();if(!sim||!['playing','countdown'].includes(sim.state.phase))return;
  // A chord changes PointerEvent.buttons through pointermove, not another
  // pointerdown/up. Give each mouse button its own source so releasing fire
  // keeps aim held, and keyboard fire can remain pressed independently.
  if(sim.state.mode!=='race')this.command('action',!!(buttons&1),'mouse:left');
  this.command('secondary',!!(buttons&2),'mouse:right');
 }
 key(e,on){
  const sim=this.getSimulation();if(!sim)return;
  if(e.target.closest('input,select,textarea'))return;
  if(e.code==='Escape'||e.code==='KeyP'){if(on&&!e.repeat){e.preventDefault();this.onPause();}return;}
  if(!['playing','countdown'].includes(sim.state.phase))return;
  const race=sim.state.mode==='race',key={KeyW:race?'action':'forward',KeyS:race?'secondary':'back',KeyA:'left',KeyD:'right',ArrowUp:race?'action':'lookUp',ArrowDown:race?'secondary':'lookDown',ArrowLeft:race?'left':'lookLeft',ArrowRight:race?'right':'lookRight',Space:race?'handbrake':'action',ShiftLeft:race?'nitro':'breath',ShiftRight:race?'nitro':'breath'}[e.code];
  if(key){e.preventDefault();if(!e.repeat)this.command(key,on,'key:'+e.code);}
  if(e.code==='KeyR'&&on&&!e.repeat){e.preventDefault();race?sim.recover():sim.reload();}
  if(race&&e.code==='KeyC'&&on&&!e.repeat){e.preventDefault();this.onCamera();}
 }
 down(e){
  const sim=this.getSimulation();if(!sim||!['playing','countdown'].includes(sim.state.phase))return;
  const target=e.target.closest('[data-hold],#stick')||(e.target===this.canvas?this.canvas:null);if(!target)return;
  this.onUnlock();e.preventDefault();const race=sim.state.mode==='race',touch=e.pointerType==='touch';
  if(touch)document.body.classList.add('touch-active');
  let action=target.dataset.hold;
  if(action==='primary')action='action';if(action==='secondary')action='secondary';if(action==='aux')action=race?'handbrake':sim.state.mode==='shooting'?'reload':'breath';
  if(target===this.canvas&&!touch){action=null;this.mouseButtons(e.buttons);if(!document.pointerLockElement&&this.canvas.requestPointerLock){try{const p=this.canvas.requestPointerLock();p?.catch?.(()=>{});}catch{}}}
  const stick=target.id==='stick',rect=target.getBoundingClientRect();
  this.pointers.set(e.pointerId,{target,action,x:e.clientX,y:e.clientY,cx:rect.left+rect.width/2,cy:rect.top+rect.height/2,stick});
  if(document.pointerLockElement!==this.canvas)try{target.setPointerCapture(e.pointerId);}catch{}
  if(action==='reload')sim.reload();else if(action)this.command(action,true,'pointer:'+e.pointerId);
  target.classList.add('pressed');if(stick)this.move(e);
 }
 move(e){
  const sim=this.getSimulation();if(!sim)return;
  const p=this.pointers.get(e.pointerId);
  if(e.pointerType==='mouse'&&(p?.target===this.canvas||document.pointerLockElement===this.canvas))this.mouseButtons(e.buttons);
  if(document.pointerLockElement===this.canvas&&e.pointerType!=='touch'){sim.look(e.movementX,e.movementY);return;}
  if(!p)return;e.preventDefault();
  if(p.stick){const x=Math.max(-1,Math.min(1,(e.clientX-p.cx)/44)),y=Math.max(-1,Math.min(1,(e.clientY-p.cy)/44));sim.axis(x,y);p.target.style.setProperty('--x',x*30+'px');p.target.style.setProperty('--y',y*30+'px');}
  else if(sim.state.mode!=='race'){const multiplier=e.pointerType==='touch'?1.65:1;sim.look((e.clientX-p.x)*multiplier,(e.clientY-p.y)*multiplier);}
  p.x=e.clientX;p.y=e.clientY;
 }
 up(e){
  const p=this.pointers.get(e.pointerId);if(!p)return;this.pointers.delete(e.pointerId);
  if(e.pointerType==='mouse'&&p.target===this.canvas)this.mouseButtons(e.buttons);
  if(p.action&&p.action!=='reload')this.command(p.action,false,'pointer:'+e.pointerId);
  if(p.stick){this.getSimulation()?.axis(0,0);p.target.style.setProperty('--x','0px');p.target.style.setProperty('--y','0px');}
  p.target.classList.remove('pressed');try{p.target.releasePointerCapture(e.pointerId);}catch{}
 }
 cancel(pause=false){
  this.getSimulation()?.clearInput();this.sources.clear();const pointers=[...this.pointers.entries()];this.pointers.clear();
  for(const [id,p] of pointers){p.target.classList.remove('pressed');p.target.style.setProperty('--x','0px');p.target.style.setProperty('--y','0px');try{p.target.releasePointerCapture(id);}catch{}}
  if(pause&&['playing','countdown'].includes(this.getSimulation()?.state.phase))this.onPause();
 }
 sync(){for(const [action,sources] of this.sources)if(sources.size)this.getSimulation()?.hold(action,true);}
 dispose(){this.cancel();this.abort.abort();}
}
