import {DT,DIFFICULTIES} from './catalog.js';
import {clamp,angle,wrap} from './math.js';
export function targetSpeed(car,track,s,pace=1){let desired=82;for(let d=0;d<=220;d+=4){const a=track.sample(s+d),limit=Math.sqrt(car.config.mu*9.81*.42/Math.max(.0012,Math.abs(a.curvature)))*pace;desired=Math.min(desired,Math.sqrt(limit*limit+2*2.7*d));}return desired;}
export class Driver {
 constructor(index,difficulty='club'){this.index=index;this.difficulty=DIFFICULTIES[difficulty];this.age=0;this.timer=0;this.stuck=0;this.reverse=0;this.input={};this.lane=0;this.decisions=0;this.passUntil=0;this.targetLane=0;this.trafficSpeed=100;}
 step(car,track,cars){this.age+=DT;this.timer-=DT;const pos=car.body.translation(),near=car.near,speed=car.speed;this.stuck=Math.abs(speed)<1?this.stuck+DT:0;
  if(this.stuck>4&&this.age>6){this.reverse=1.5;this.stuck=0;}if(this.reverse>0){this.reverse-=DT;return {throttle:.55,reverse:true,steer:Math.sign(near.offset),analog:true};}
  if(this.timer<=0){this.timer=this.difficulty.reaction;this.decisions++;this.trafficSpeed=100;
   if(this.age>this.passUntil)this.targetLane=Math.sin(this.age*.17+this.index*3)*this.difficulty.error;
   const traffic=cars.filter(other=>other!==car&&!other.finished).map(other=>({other,gap:wrap(other.near.s-near.s+track.length/2,track.length)-track.length/2}));
   for(const {other,gap} of traffic){if(gap>0&&gap<30&&Math.abs(other.near.offset-near.offset)<2.3){
     this.trafficSpeed=Math.min(this.trafficSpeed,Math.max(3,other.speed)+(gap-7)*.7);
     if(Math.abs(near.curvature)<.009&&this.age>this.passUntil){const side=this.index%2?1:-1,candidate=side*2.8;
      if(!traffic.some(t=>Math.abs(t.gap)<14&&Math.abs(t.other.near.offset-candidate)<2.4)){this.targetLane=candidate;this.passUntil=this.age+3;}}
    }else if(gap<-9&&gap>-22&&this.index===1&&Math.abs(near.curvature)<.005&&this.age>this.passUntil)this.targetLane=clamp(other.near.offset,-1.2,1.2);}
  }
  const lane=this.targetLane;
  this.lane+=clamp(lane-this.lane,-DT*1.2,DT*1.2);
  const look=clamp(6+Math.abs(speed)*.5,7,25),target=track.sample(near.s+look,this.lane),q=car.body.rotation(),yaw=Math.atan2(2*(q.w*q.y+q.x*q.z),1-2*(q.y*q.y+q.z*q.z));const aim=Math.atan2(-(target.p.x-pos.x),-(target.p.z-pos.z));
  const steer=clamp(Math.atan2(2*(car.config.axles[0]+car.config.axles[1])*Math.sin(angle(aim-yaw)),look)/car.config.maxSteer,-1,1);
  const errorPulse=Math.pow(Math.max(0,Math.sin(this.age*.117+this.index*2.2)),36)*this.difficulty.error;
  const desired=Math.min(this.trafficSpeed,targetSpeed(car,track,near.s,this.difficulty.pace*(1-errorPulse)))*(Math.abs(near.offset)>track.width/2?.6:1);
  const err=desired-speed;this.input={steer,throttle:clamp(err*.23+.12),brake:clamp(-err*.17),analog:true};return this.input;
 }
}
