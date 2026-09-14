/* One input owner, pointer capture for touch, no legacy campaign bindings. */
function clubClearInput(){CLUB.held.clear();keys.clear();mouse.left=mouse.right=false;CLUB.touch.steer=CLUB.touch.x=CLUB.touch.y=0;const r=CLUB.run;if(r){r.charging=false;r.charge=0;r.holdTime=0;}document.querySelectorAll('#club-touch .held').forEach(e=>e.classList.remove('held'));if($('club-stick'))$('club-stick').firstElementChild.style.transform='';}
function clubHold(action,value){
 if(value){if(CLUB.phase!=='playing')return;CLUB.held.add(action);if(action==='action')clubStartCharge();}
 else{CLUB.held.delete(action);if(action==='action')clubReleaseCharge();}
}
function clubLook(dx,dy){
 if(!['playing','countdown'].includes(CLUB.phase))return;const r=CLUB.run,s=CLUB.save.settings.sensitivity,scale=CLUB.mode==='darts'?.00045:CLUB.mode==='archery'?.0009:.0018;
 const aim=r?.aim||0;CLUB.look.yaw-=dx*s*scale*(1-aim*.55);CLUB.look.pitch=clamp(CLUB.look.pitch-dy*s*scale*(1-aim*.55),-.7,.8);
}
function clubInputSetup(){
 const pressMap={KeyW:'forward',KeyS:'back',KeyA:'left',KeyD:'right',ShiftLeft:'breath',ShiftRight:'breath',ArrowLeft:'lookLeft',ArrowRight:'lookRight',ArrowUp:'lookUp',ArrowDown:'lookDown',Space:'action'};
 function actionFor(code){if(CLUB.mode==='race')return ({KeyW:'action',ArrowUp:'action',KeyS:'secondary',ArrowDown:'secondary',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',Space:'handbrake',ShiftLeft:'nitro',ShiftRight:'nitro'})[code];return pressMap[code];}
 document.addEventListener('keydown',e=>{
  if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;if(e.code==='Escape'){e.preventDefault();if(CLUB.phase==='paused')clubResume();else if(['playing','countdown'].includes(CLUB.phase))clubPause();return;}
  if(!['playing','countdown'].includes(CLUB.phase)||$('club-dialog').open)return;const action=actionFor(e.code);if(action){e.preventDefault();if(!e.repeat)clubHold(action,true);}if(e.code==='KeyR'&&!e.repeat){e.preventDefault();if(CLUB.mode==='race')clubRaceReset();else clubReload();}if(e.code==='KeyF'&&!e.repeat)clubHold('secondary',!CLUB.held.has('secondary'));
 });
 document.addEventListener('keyup',e=>{const a=actionFor(e.code);if(a){e.preventDefault();clubHold(a,false);}});
 window.addEventListener('blur',()=>{if(['playing','countdown'].includes(CLUB.phase))clubPause();clubClearInput();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&['playing','countdown'].includes(CLUB.phase))clubPause();});
 const lookSurface=canvas;let pointer=null,lastX=0,lastY=0,hadLock=false;
 lookSurface.addEventListener('contextmenu',e=>e.preventDefault());lookSurface.addEventListener('pointerdown',e=>{
  if(!['playing','countdown'].includes(CLUB.phase)||e.pointerType==='touch')return;e.preventDefault();initAudio();clubApplyAudio();pointer=e.pointerId;lastX=e.clientX;lastY=e.clientY;
  if(CLUB.mode!=='race'&&e.button===0&&document.pointerLockElement!==canvas){try{const p=canvas.requestPointerLock?.();p?.catch?.(()=>clubMessage('拖动场地瞄准 · 也可使用方向键',2));}catch(_){}}
  if(!document.pointerLockElement)try{canvas.setPointerCapture(e.pointerId);}catch(_){}
  if(e.button===0&&CLUB.mode!=='race')clubHold('action',true);if(e.button===2)clubHold('secondary',true);
 });
 document.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;if(document.pointerLockElement===canvas)clubLook(e.movementX,e.movementY);else if(pointer===e.pointerId){clubLook(e.clientX-lastX,e.clientY-lastY);lastX=e.clientX;lastY=e.clientY;}});
 document.addEventListener('pointerup',e=>{if(e.pointerType==='touch')return;if(e.button===0)clubHold('action',false);if(e.button===2)clubHold('secondary',false);if(e.pointerId===pointer)pointer=null;});
 document.addEventListener('pointercancel',()=>{pointer=null;clubClearInput();});document.addEventListener('pointerlockchange',()=>{const has=document.pointerLockElement===canvas;if(hadLock&&!has&&['playing','countdown'].includes(CLUB.phase))clubPause();hadLock=has;});
 const look=$('club-look');let touchLook=null;
 look.onpointerdown=e=>{if(!['playing','countdown'].includes(CLUB.phase))return;e.preventDefault();touchLook={id:e.pointerId,x:e.clientX,y:e.clientY};look.setPointerCapture(e.pointerId);};look.onpointermove=e=>{if(touchLook?.id!==e.pointerId)return;clubLook((e.clientX-touchLook.x)*1.8,(e.clientY-touchLook.y)*1.8);touchLook.x=e.clientX;touchLook.y=e.clientY;};look.onpointerup=look.onpointercancel=e=>{if(touchLook?.id===e.pointerId)touchLook=null;};
 const stick=$('club-stick');let stickPointer=null;function updateStick(e){const box=stick.getBoundingClientRect(),x=clamp((e.clientX-box.x-box.width/2)/(box.width*.36),-1,1),y=clamp((e.clientY-box.y-box.height/2)/(box.height*.36),-1,1);CLUB.touch.steer=CLUB.touch.x=x;CLUB.touch.y=CLUB.mode==='race'?0:y;stick.firstElementChild.style.transform=`translate(${x*33}px,${y*33}px)`;}
 stick.onpointerdown=e=>{e.preventDefault();stickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);updateStick(e);};stick.onpointermove=e=>{if(stickPointer===e.pointerId)updateStick(e);};stick.onpointerup=stick.onpointercancel=e=>{if(stickPointer===e.pointerId){stickPointer=null;CLUB.touch.steer=CLUB.touch.x=CLUB.touch.y=0;stick.firstElementChild.style.transform='';}};
 for(const b of document.querySelectorAll('#club-touch button')){
  let heldPointer=null,aimX=0,aimY=0;const action=()=>b.id==='club-touch-aux'?(CLUB.mode==='race'?'handbrake':CLUB.mode==='shooting'?'reload':'breath'):b.dataset.hold;
  b.onpointerdown=e=>{e.preventDefault();if(CLUB.phase!=='playing')return;heldPointer=e.pointerId;aimX=e.clientX;aimY=e.clientY;b.setPointerCapture(e.pointerId);b.classList.add('held');initAudio();clubApplyAudio();const a=action();if(a==='reload')clubReload();else clubHold(a,true);};
  b.onpointermove=e=>{if(heldPointer!==e.pointerId||action()!=='action'||CLUB.mode==='race')return;clubLook((e.clientX-aimX)*1.8,(e.clientY-aimY)*1.8);aimX=e.clientX;aimY=e.clientY;};
  b.onpointerup=b.onpointercancel=e=>{if(heldPointer!==e.pointerId)return;heldPointer=null;b.classList.remove('held');clubHold(action(),false);};
 }
 $('club-mode-cards').onclick=e=>{const b=e.target.closest('[data-mode]');if(b)clubSelectMode(b.dataset.mode);};$('club-levels').onclick=e=>{const b=e.target.closest('[data-level]');if(b&&!b.disabled)clubSelectLevel(Number(b.dataset.level));};document.querySelectorAll('[data-playlist]').forEach(b=>b.onclick=()=>clubPlaylist(b.dataset.playlist));
 $('club-difficulty').onchange=e=>{CLUB.save.settings.difficulty=e.target.value;clubPersist();clubRenderLobby();};$('club-equipment').onchange=e=>{const key=CLUB.mode==='race'?'tune':CLUB.mode==='shooting'?'weapon':'skin';CLUB.save.settings[key]=Number(e.target.value);clubPersist();};
 $('club-start').onclick=clubBriefing;$('club-pause').onclick=clubPause;$('club-bank').onclick=clubBank;$('club-settings-open').onclick=()=>clubSettings();$('club-progress-open').onclick=()=>clubProgress();
 $('club-dialog').addEventListener('cancel',e=>{e.preventDefault();if(CLUB.phase==='paused')clubResume();else if(CLUB.phase==='result')clubLobby();else clubCloseDialog();});
 window.addEventListener('resize',()=>renderer.resize());window.addEventListener('pagehide',()=>clubPersist());
}
