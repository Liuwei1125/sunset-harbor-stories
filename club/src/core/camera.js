import {V,add,sub,mul,norm,right,basis,bx,mix,clamp,PI} from './math.js';
import {trackAt,trackNearest} from './track.js';
import {LEVELS} from '../games/catalog.js';

export const RACE_CAMERAS=[['chase','追尾'],['hood','引擎盖'],['cockpit','驾驶舱']];
export const raceCamera=value=>RACE_CAMERAS.some(([id])=>id===value)?value:'chase';

export function cameraPose(session,run=session.run){
  const active=run&&session.phase!=='lobby',mode=session.mode;
  let eye,dir,roll=0;
  if(!active){
    if(mode==='race'){
      const a=trackAt(session.track,session.track.length-10);
      eye=add(a.pos,add(mul(right(a.yaw),-7),V(0,3.1,0)));dir=norm(sub(add(trackAt(session.track,25).pos,V(0,.8,0)),eye));
    }else if(mode==='darts'){eye=V(.7,1.87,0);dir=norm(sub(V(0,1.73,-2.4),eye));}
    else{eye=V(2.8,1.8,2);dir=norm(sub(V(0,1.2,mode==='archery'?-LEVELS.archery[session.level].distance:-15),eye));}
  }else if(mode==='race'){
    const c=run.car,view=raceCamera(session.save.settings.camera),carBasis=basis(c.yaw,c.pitch,c.roll);
    if(view==='chase'){
      const distance=6.4+clamp(Math.abs(c.speed)/45,0,1)*.7;
      eye=add(c.pos,bx(basis(c.yaw+session.look.yaw,c.pitch*.45+session.look.pitch*.45),V(0,2.7,distance)));
      // Keep the camera above rising terrain on the canyon course.
      eye.y=Math.max(eye.y,trackNearest(session.track,eye).pos.y+.9);
      dir=norm(sub(add(c.pos,bx(carBasis,V(0,.85,-5.5))),eye));
    }else{
      eye=add(c.pos,bx(carBasis,view==='hood'?V(0,1.02,-1.35):V(0,.95,-.50)));
      dir=bx(basis(c.yaw+session.look.yaw,c.pitch+session.look.pitch),V(0,0,-1));roll=c.roll*(view==='hood'?.25:.4);
    }
  }else{
    eye=add(run.pos||V(),V(0,mode==='darts'?1.73:1.65,0));
    const sway=(run.charging||run.aim>.1)?run.difficulty.sway*(session.held.has('breath')?.18:1)*(1-(run.aim||0)*.4)*.0018*(1+Math.min(2.5,Math.max(0,(run.holdTime||0)-2)*.18)):0;
    dir=bx(basis(session.look.yaw+Math.sin(session.time*2.3)*sway,session.look.pitch+Math.cos(session.time*2.7)*sway),V(0,0,-1));
  }
  const fov=!active?60:mode==='darts'?29:mode==='archery'?mix(55,33,run.aim||0):mode==='shooting'?mix(72,run.weapon===2?25:46,run.aim||0):(raceCamera(session.save.settings.camera)==='chase'?64:raceCamera(session.save.settings.camera)==='hood'?72:66)+clamp((run.car.speed-18)*.22,0,8);
  return {eye,dir,roll,fov:fov*PI/180};
}
