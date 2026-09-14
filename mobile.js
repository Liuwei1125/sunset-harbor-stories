// Pointer Events input: every finger has its own role/capture; keyboard remains independent.
const touch={enabled:matchMedia('(pointer:coarse)').matches||(navigator.maxTouchPoints>0&&innerWidth<1100),x:0,y:0,fire:false,aim:false,boost:false,brake:false,gas:false,reverse:false,stickId:null,lookId:null,sensitivity:1,assist:true,pointers:new Map()};
let graphicsMode='auto',frameAverage=16.7,qualityTicks=0;
function isAiming(){return mouse.right||touch.aim;}
function setTouchMode(value){
 touch.enabled=value;document.body.classList.toggle('touch',value);clearTouchInput();
 $('input-mode').textContent=value?'\u89e6\u5c4f\u64cd\u4f5c':'\u952e\u9f20\u64cd\u4f5c';
 $('mobilewarn').textContent=value?'\u5de6\u4fa7\u6447\u6746\u79fb\u52a8\uff0c\u53f3\u4fa7\u6ed1\u52a8\u89c6\u89d2\u3002\u6309\u4f4f\u5f00\u706b\u53ef\u8fde\u5c04\uff0c\u540c\u65f6\u6ed1\u52a8\u624b\u6307\u53ef\u5fae\u8c03\u51c6\u661f\u3002\u5efa\u8bae\u6a2a\u5c4f\u6e38\u73a9\u3002':'WASD / \u79fb\u52a8\uff0c\u9f20\u6807 / \u89c6\u89d2\u3002\u89e6\u5c4f\u8bbe\u5907\u4e5f\u53ef\u624b\u52a8\u5207\u6362\u64cd\u4f5c\u6a21\u5f0f\u3002';
 if(value&&document.pointerLockElement)document.exitPointerLock();
 setGraphicsQuality(graphicsMode);if(state.started)updateHUD();
}
function setGraphicsQuality(value){
 graphicsMode=value;if(!renderer)return;
 renderer.quality=value==='high'?1:value==='low'?.64:touch.enabled?.82:1;renderer.resize();
 $('quality-select').value=value;$('quality-toggle').textContent='\u753b\u8d28\uff1a'+({auto:'\u81ea\u52a8',high:'\u7cbe\u7ec6',low:'\u6d41\u7545'}[value]);
 qualityTicks=0;frameAverage=16.7;
}
function adaptiveQuality(ms){
 if(graphicsMode!=='auto'||!touch.enabled||!state.started||state.paused)return;
 frameAverage=frameAverage*.98+Math.min(ms,100)*.02;
 if(++qualityTicks>240){if(frameAverage>30&&renderer.quality>.57){renderer.quality=Math.max(.56,renderer.quality-.10);renderer.resize();}qualityTicks=0;}
}
function clearTouchInput(){
 touch.x=touch.y=0;touch.fire=touch.aim=touch.boost=touch.brake=touch.gas=touch.reverse=false;touch.stickId=touch.lookId=null;
 for(const [id,p] of touch.pointers){try{if(p.el.hasPointerCapture(id))p.el.releasePointerCapture(id);}catch(_){}}
 touch.pointers.clear();document.querySelectorAll('.touch-btn.held').forEach(b=>b.classList.remove('held'));
 const knob=$('stick-knob');if(knob)knob.style.transform='translate(0px,0px)';
 document.body.classList.remove('aiming');
}
function touchLook(dx,dy){
 const factor=(isAiming()?.0030:.0044)*touch.sensitivity*inputAimScale();
 cam.yaw-=dx*factor;cam.pitch=clamp(cam.pitch-dy*factor*.82,-.88,.65);cam.lastLook=state.t;
}
function assistedDirection(){
 if(!touch.enabled||!touch.assist||!(touch.fire||touch.aim))return cam.dir;
 let best=.995,target=null;
 for(const e of enemies){if(!e.alive||dist2(e.pos,player.pos)>50)continue;const dv=sub(e.pos,cam.eye),dir=norm(dv),similarity=dot(dir,cam.dir);if(similarity<=best)continue;
  if(obstacleHit(cam.eye,dir,length(dv)).type!=='none')continue;best=similarity;target=dir;
 }
 return target||cam.dir;
}
function setupMobile(){
 // Switches are available before starting, including on a desktop touch monitor.
 $('input-mode').addEventListener('click',()=>setTouchMode(!touch.enabled));
 $('quality-select').addEventListener('change',e=>setGraphicsQuality(e.target.value));
 $('quality-toggle').addEventListener('click',()=>{const modes=['auto','high','low'];setGraphicsQuality(modes[(modes.indexOf(graphicsMode)+1)%3]);toast('\u753b\u8d28\u5df2\u5207\u6362\uff1a'+$('quality-toggle').textContent.split('\uff1a')[1]);});
 $('look-sensitivity').addEventListener('input',e=>touch.sensitivity=Number(e.target.value));
 $('assist-toggle').addEventListener('click',()=>{touch.assist=!touch.assist;$('assist-toggle').setAttribute('aria-pressed',String(touch.assist));$('assist-toggle').textContent='\u8f85\u52a9\u77c4\u51c6\uff1a'+(touch.assist?'\u5f00':'\u5173');});
 const playing=()=>touch.enabled&&state.started&&!state.paused&&!state.dead;
 const capture=(el,e)=>{try{el.setPointerCapture(e.pointerId);}catch(_){}};
 const bind=(id,down,up=null,look=false)=>{
  const el=$(id);
  el.addEventListener('pointerdown',e=>{if(!playing())return;e.preventDefault();e.stopPropagation();if([...touch.pointers.values()].some(p=>p.el===el))return;
   touch.pointers.set(e.pointerId,{el,x:e.clientX,y:e.clientY,up});el.classList.add('held');capture(el,e);down();
  });
  el.addEventListener('pointermove',e=>{const p=touch.pointers.get(e.pointerId);if(!p||p.el!==el||!look)return;e.preventDefault();touchLook(e.clientX-p.x,e.clientY-p.y);p.x=e.clientX;p.y=e.clientY;});
  const release=e=>{const p=touch.pointers.get(e.pointerId);if(!p||p.el!==el)return;touch.pointers.delete(e.pointerId);el.classList.remove('held');if(up)up();};
  for(const event of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(event,release);
  el.addEventListener('contextmenu',e=>e.preventDefault());
 };
 bind('touch-fire',()=>{touch.fire=true;shoot();},()=>touch.fire=false,true);
 bind('touch-aim',()=>{touch.aim=true;document.body.classList.add('aiming');},()=>{touch.aim=false;document.body.classList.remove('aiming');},true);
 bind('touch-reload',reload);
 bind('touch-weapon',()=>switchWeapon((state.weapon+1)%weapons.length));
 bind('touch-enter',toggleCar);
 bind('touch-jump',()=>{if(!state.car&&player.jump<.01){player.vy=7.1;player.jump=.02;}});
 bind('touch-sprint',()=>touch.boost=true,()=>touch.boost=false);
 bind('touch-nitro',()=>touch.boost=true,()=>touch.boost=false);
 bind('touch-gas',()=>touch.gas=true,()=>touch.gas=false);
 bind('touch-brake',()=>touch.reverse=true,()=>touch.reverse=false);
 bind('touch-handbrake',()=>touch.brake=true,()=>touch.brake=false);
 bind('touch-reset',resetCar);
 $('touch-map').addEventListener('click',()=>{if(!playing())return;state.map=!state.map;$('mapbox').classList.toggle('expanded',state.map);drawMap();});
 const stick=$('move-stick');
 function moveStick(e){const r=stick.getBoundingClientRect(),radius=r.width*.35,dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,len=Math.hypot(dx,dy),scale=len>radius?radius/len:1,n=Math.min(len/radius,1),v=n<.13?0:(n-.13)/.87;
  touch.x=len?dx/len*v:0;touch.y=len?-dy/len*v:0;$('stick-knob').style.transform=`translate(${dx*scale}px,${dy*scale}px)`;
 }
 stick.addEventListener('pointerdown',e=>{if(!playing()||touch.stickId!==null)return;e.preventDefault();touch.stickId=e.pointerId;capture(stick,e);moveStick(e);});
 stick.addEventListener('pointermove',e=>{if(e.pointerId!==touch.stickId)return;e.preventDefault();moveStick(e);});
 const endStick=e=>{if(e.pointerId!==touch.stickId)return;touch.stickId=null;touch.x=touch.y=0;$('stick-knob').style.transform='translate(0px,0px)';};
 for(const type of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(type,endStick);
 const look=$('look-pad');let lastX=0,lastY=0;
 look.addEventListener('pointerdown',e=>{if(!playing()||touch.lookId!==null)return;e.preventDefault();touch.lookId=e.pointerId;lastX=e.clientX;lastY=e.clientY;capture(look,e);});
 look.addEventListener('pointermove',e=>{if(e.pointerId!==touch.lookId)return;e.preventDefault();touchLook(e.clientX-lastX,e.clientY-lastY);lastX=e.clientX;lastY=e.clientY;});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])look.addEventListener(event,e=>{if(e.pointerId===touch.lookId)touch.lookId=null;});
 window.addEventListener('blur',clearTouchInput);window.addEventListener('resize',clearTouchInput);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTouchInput();});
 document.addEventListener('contextmenu',e=>{if(touch.enabled&&state.started)e.preventDefault();});
 setTouchMode(touch.enabled);
 $('render-info').textContent=renderer.software?'\u517c\u5bb9\u6e32\u67d3 / \u786c\u4ef6\u52a0\u901f\u4e0d\u53ef\u7528\uff0c\u753b\u8d28\u4e0e\u6d41\u7545\u5ea6\u53ef\u80fd\u964d\u4f4e':'WEBGL / \u5b8c\u5168\u672c\u5730\u6e32\u67d3';
}
function updateMobileHUD(){
 if(!touch.enabled)return;
 $('stick-label').textContent=state.car?'STEER / \u8f6c\u5411':'MOVE / \u79fb\u52a8';
 $('touch-enter').querySelector('span').textContent=state.car?'\u4e0b\u8f66':'\u4e0a\u8f66';
 $('touch-enter').classList.toggle('available',!!state.car||!!nearestCar());
 $('look-hint').style.opacity=state.t>15?'0':'.5';
 $('ammotip').textContent=state.reload>0?'\u88c5\u586b\u4e2d\u2026':weapons[state.weapon].cn+' / '+(touch.assist?'\u8f85\u52a9\u77c4\u51c6':'\u624b\u52a8\u77c4\u51c6');
 if(state.car)$('drivehint').textContent='\u6447\u6746\u8f6c\u5411 / \u6309\u4f4f\u6cb9\u95e8';
 else if(nearestCar())$('context').innerHTML='\u70b9\u51fb\u300c\u4e0a\u8f66\u300d\u5f00\u59cb\u9a7e\u9a76';
}
