/* Own the lifecycle before the shared runtime's delayed init resolves. */
init=function(){
 try{
  suppressSave=true;canvas=$('view');touch.enabled=CLUB.touch.active;settings.targetFPS=60;
  const forceCPU=new URLSearchParams(location.search).get('compat')==='1';
  try{if(forceCPU)throw Error('Requested compatibility renderer');renderer=new Renderer(canvas);if(!renderer.inst)throw Error('Instancing unavailable');}
  catch(error){const replacement=canvas.cloneNode(false);canvas.replaceWith(replacement);canvas=replacement;renderer=new SoftwareRenderer(canvas);console.info('Harbor Club compatibility:',error.message);}
  dynamic=clubEquipmentBuilder();fx=clubEquipmentBuilder();clubApplySettings();clubInputSetup();
  const dot=document.createElement('div');dot.id='club-prediction';dot.hidden=true;dot.style.cssText='position:absolute;width:10px;height:10px;margin:-5px;border:1.5px solid #b9f5c4;border-radius:50%;box-shadow:0 0 0 3px #173b4533;pointer-events:none';$('club-game-hud').appendChild(dot);
  if(!renderer.software)renderer.localLights9=function(){this.lightPositions9.fill(0);this.lightColors9.fill(0);let count=0;
   if(CLUB.mode==='darts'){this.lightPositions9.set([0,2.1,-2.05,4],0);this.lightColors9.set([1.7,1.4,.85],0);count++;}
   if(CLUB.run?.flash>0){this.lightPositions9.set([cam.eye.x,cam.eye.y-.1,cam.eye.z-.8,4],count*4);this.lightColors9.set([4,2.2,.6],count*3);count++;}this.localLightCount9=count;};
  clubRenderLobby();clubBuildWorld();clubRender();$('loading').style.display='none';
  window.__club={CLUB,levels:CLUB_LEVELS,modes:CLUB_MODES,difficulties:CLUB_DIFFICULTIES,saveKey:CLUB_SAVE,selectMode:clubSelectMode,selectLevel:clubSelectLevel,playlist:clubPlaylist,start:clubNewRun,briefing:clubBriefing,lobby:clubLobby,pause:clubPause,resume:clubResume,step:clubStep,render:clubRender,camera:clubCamera,hold:clubHold,fire:clubFire,release:clubReleaseCharge,reload:clubReload,bank:clubBank,settings:clubApplySettings,validate:clubValidate,dartScore:clubDartScore,checkout:clubCheckout,archeryScore:clubArcheryScore,trackAt:clubTrackAt,trackNearest:clubTrackNearest,prediction:clubPredictedImpact,engine:renderer,assetPack:ARCADE_ASSET_PACK10,get cam(){return cam;},get state(){return state;}};
  let hudAt=0,renderAt=0;
  function frame(now){
   try{
    if(!CLUB.last)CLUB.last=now;const dt=Math.min((now-CLUB.last)/1000,.15);CLUB.last=now;const started=performance.now();
    if(!document.hidden&&CLUB.phase!=='paused'&&CLUB.phase!=='result'){CLUB.accum+=dt;let steps=0;while(CLUB.accum>=1/120&&steps<18){clubStep(1/120);CLUB.accum-=1/120;steps++;}}else CLUB.accum=0;
    const cap=CLUB.phase==='lobby'?30:CLUB.phase==='paused'||CLUB.phase==='result'?12:renderer.software?30:60;
    if(now-renderAt>=1000/cap-1){const elapsed=renderAt?now-renderAt:1000/cap;renderAt=now;clubRender();CLUB.frame.frames++;CLUB.frame.fps=mix(CLUB.frame.fps,1000/Math.max(1,elapsed),.05);CLUB.frame.cpu=mix(CLUB.frame.cpu,performance.now()-started,.05);telemetry.cpu=CLUB.frame.cpu;if(!renderer.software)adjustQuality6(elapsed);}
    if(now>hudAt){hudAt=now+75;if(CLUB.run)clubHUD();}
    requestAnimationFrame(frame);
   }catch(e){CLUB.frame.errors.push(e.message);console.error(e);fatal(e.message);}
  }
  requestAnimationFrame(frame);
 }catch(error){console.error(error);fatal(error.message);}
};
