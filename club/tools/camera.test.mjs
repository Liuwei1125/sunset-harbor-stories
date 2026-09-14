import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation} from '../src/games/simulation.js';
import {validateProgress} from '../src/core/progress.js';
import {trackAt,trackNearest} from '../src/core/track.js';
import {frameScene,viewCamera} from '../src/presentation/frame.js';

test('old saves receive chase view and imported cameras are validated',()=>{
 for(const value of [undefined,'bad',{},'chase','hood','cockpit']){
  const s=validateProgress({version:2,xp:950,records:{},settings:{camera:value}});
  assert.equal(s.settings.camera,['chase','hood','cockpit'].includes(value)?value:'chase');assert.equal(s.xp,950);
 }
});
test('camera changes preserve the race, held controls, random seed and recorded trace',()=>{
 const a=createSimulation({mode:'race',level:5}),b=createSimulation({mode:'race',level:5});a.start();b.start();a.hold('action',true);b.hold('action',true);
 for(let i=0;i<1440;i++){
  if(i%40===0){a.updateSettings({camera:['chase','hood','cockpit'][i/40%3]});frameScene(a.snapshot(.5),a.state.track);}
  a.step(1/120);b.step(1/120);
 }
 assert.deepEqual(a.state.run,b.state.run);assert.deepEqual(a.state.held,b.state.held);assert.equal(a.state.seed,b.state.seed);
});
test('every course has finite camera poses and chase clears rising terrain',()=>{
 for(let level=0;level<6;level++){
  const sim=createSimulation({mode:'race',level});sim.start();
  for(const view of ['chase','hood','cockpit'])for(let i=0;i<24;i++){
   const q=trackAt(sim.state.track,sim.state.track.length*i/24),car=sim.state.run.car;
   Object.assign(car,{pos:q.pos,yaw:q.yaw,pitch:q.pitch,speed:45});sim.updateSettings({camera:view});
   const s=sim.snapshot(),c=s.camera;assert(Object.values(c.eye).every(Number.isFinite));assert(Math.abs(Math.hypot(c.dir.x,c.dir.y,c.dir.z)-1)<1e-6);
   if(view==='chase')assert(c.eye.y>=trackNearest(sim.state.track,c.eye).pos.y+.899);
   for(const aspect of [390/844,844/390,1.6]){const p=viewCamera(s,aspect);assert(p.fov>.5&&p.fov<2.9);}
   assert(frameScene(s,sim.state.track).models.some(m=>m.key==='player-car'&&m.id==='touring-gt'));
  }
 }
});
test('race camera settings do not affect shooting rays or throwing predictions',()=>{
 for(const mode of ['shooting','darts','archery']){
  const s=createSimulation({mode});s.start();const before=s.snapshot();
  for(const camera of ['hood','cockpit','chase']){s.updateSettings({camera});const after=s.snapshot();assert.deepEqual(after.camera,before.camera);assert.deepEqual(after.prediction,before.prediction);}
 }
});
