/* Developer-only checks. Run via DevTools on the local preview; not loaded by the viewer. */
(async function runFleetChecks(){
 const checks=[]; const check=(name,ok)=>{checks.push({name,passed:!!ok});if(!ok)throw Error(name)};
 const f=window.__fleet,c=f.car,t=f.telemetry;
 try {
 check('initial-ready',f.ready&&!f.error);
 const n=FleetTelemetry.normalize({speedKph:Infinity,motorRpm:50000,gear:'X',batteryPct:-9,lap:3.9,throttle:7,brake:-1});
 check('bounded-invalid-input',n.speedKph===0&&n.motorRpm===30000&&n.gear==='P'&&n.batteryPct===0&&n.lap===3&&n.throttle===1&&n.brake===0);
 c.setTelemetry({speedKph:123,gear:'D',lap:3,lapTimeMs:54321,powerKw:175});
 for(const id of ['model-y','model-s','roadster','cybertruck']){
  for(const lod of ['high','low']){
   document.querySelector('#lightweight').checked=lod==='low'; await load(id);
   check(id+'/'+lod+'/loaded',f.ready&&!f.error&&c.info().key===id&&c.info().lod===lod);
   check(id+'/'+lod+'/telemetry-retained',t.getState().speedKph===123&&t.getState().lapTimeMs===54321);
   check(id+'/'+lod+'/one-dynamic-display',f.scene.textures.filter(x=>x.name==='Harbor / live display').length===1&&t.stats().bindings===1);
   check(id+'/'+lod+'/one-runtime-material',f.scene.materials.filter(x=>x.name==='Harbor / live material').length===1);
   c.setSteering(20);c.tick(.05);
   const nodes=c.getContainer().transformNodes,fl=nodes.find(n=>n.name==='joint:steer-front-left').rotationQuaternion,fr=nodes.find(n=>n.name==='joint:steer-front-right').rotationQuaternion;
   check(id+'/'+lod+'/ackermann',Math.abs(fl.y)>Math.abs(fr.y)&&fl.y>0);
   check(id+'/'+lod+'/wheel-motion',nodes.find(n=>n.name==='joint:wheel-front-left').rotationQuaternion.x!==0);
  }
  for(const v of ['front','side','rear','cockpit','screen']){view(v);f.scene.render();check(id+'/'+v+'/camera',f.scene.activeCamera.position.asArray().every(Number.isFinite));}
 }
 c.setPaint('#A82128');c.setInterior(true);await c.load('cybertruck','high');
 check('lod-preserves-paint-interior',c.info().paint==='#A82128'&&c.info().dark);
 c.setSteering(999);check('steering-clamp',Math.abs(c.info().steering-30)<1e-8);
 c.setSteering(NaN);check('invalid-steering-ignored',Math.abs(c.info().steering-30)<1e-8);
 check('invalid-paint-rejected',c.setPaint('not-a-color')===false);
 t.reset();t.setDemo(true);for(let i=0;i<100;i++)c.tick(.1);
 check('demo-advances',t.getState().speedKph>0&&t.getState().source==='demo');
 t.setDemo(false);const paused=JSON.stringify(t.getState()),spin=c.info().spin,updates=t.stats().updates;c.tick(.1);
 check('demo-pauses-time-and-wheels',JSON.stringify(t.getState())===paused&&c.info().spin===spin);
 check('pause-redraws-ui',t.stats().updates>updates);
 c.setTelemetry({speedKph:55,gear:'R',powerKw:-44});
 check('external-stops-demo',!t.getState().demo&&t.getState().source==='external'&&t.getState().powerKw===-44);
 let old=c.info().spin;c.tick(.01);check('reverse-wheel-direction',c.info().spin>old);
 c.setTelemetry({gear:'P'});old=c.info().spin;c.tick(.01);check('parked-wheels-stop',c.info().spin===old);
 let rejected=false;try{await c.load('unknown')}catch(e){rejected=true}
 check('bad-model-retains-current',rejected&&c.info().key==='cybertruck');
 const race=await Promise.all([c.load('model-y','high'),c.load('roadster','low')]);
 check('latest-load-wins',race[0]===false&&race[1]===true&&c.info().key==='roadster');
 check('race-no-duplicate-display',f.scene.textures.filter(x=>x.name==='Harbor / live display').length===1);
 t.reset();check('reset',t.getState().speedKph===0&&t.getState().gear==='P'&&t.getState().source==='parked');
 document.querySelector('#lightweight').checked=false;await load('model-y');c.setSteering(0);c.setInterior(false);view('front');
 return {passed:true,count:checks.length,checks};
 }catch(error){return {passed:false,error:error.message,count:checks.length,checks};}
})()
