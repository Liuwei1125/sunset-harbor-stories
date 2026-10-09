// The renderer never owns gameplay. Unity's RacerSimulation.cs ports this fixed-step model.
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const roadX=z=>36*Math.sin(z/410)+18*Math.sin(z/173);
export const roadY=z=>.7*Math.sin(z/145)+1.6*Math.sin(z/640);
export const roadDX=z=>36/410*Math.cos(z/410)+18/173*Math.cos(z/173);
export const roadDDX=z=>-36/410**2*Math.sin(z/410)-18/173**2*Math.sin(z/173);
export function random(seed){let n=seed>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
export function benchmarkInput(s){
 const lanes=s.rules.lanes;
 const clearance=lane=>{let ttc=20,dist=600;for(const c of s.traffic){const dz=c.z-s.progress;if(Math.abs(c.x-lanes[lane])<1.8&&dz> -8){ttc=Math.min(ttc,(dz-7)/Math.max(1,s.speed-c.speed));dist=Math.min(dist,dz);}}return{ttc,dist};};
 let target=s.benchmarkLane,changing=Math.abs(lanes[target]-s.x)>.38;
 if(!changing&&clearance(target).ttc<4.2){let best=clearance(target).ttc;for(const candidate of [target-1,target+1]){if(candidate<0||candidate>3)continue;const gap=clearance(candidate);if(gap.ttc>1.8&&gap.dist>30&&gap.ttc-.8>best){best=gap.ttc-.8;s.benchmarkLane=candidate;}}target=s.benchmarkLane;changing=Math.abs(lanes[target]-s.x)>.38;}
 let danger=20;for(const c of s.traffic){const dz=c.z-s.progress;if(dz> -5&&Math.abs(c.x-s.x)<2)danger=Math.min(danger,(dz-7)/Math.max(1,s.speed-c.speed));}
 const gap=clearance(target),feedforward=roadDDX(s.progress)*s.speed*s.speed/s.rules.lateralAcceleration;
 return{steer:clamp((lanes[target]-s.x)*1.2-s.vx*.4+feedforward,-1,1),boost:!changing&&s.nitro>30&&gap.dist>180&&danger>5,brake:danger<1.6||gap.ttc<1.3};
}
export class Simulation{
  constructor(rules,difficulty=0){this.rules=rules;this.reset(difficulty);}
  reset(difficulty=this.difficulty){
    this.difficulty=difficulty;this.mode=this.rules.difficulties[difficulty];this.rng=random(this.rules.seed);
    Object.assign(this,{phase:'ready',time:this.rules.duration,progress:0,x:-1.8,vx:0,speed:28,steer:0,health:100,nitro:100,score:0,combo:0,comboTime:0,overtakes:0,nearMisses:0,boosting:false,hit:0,invincible:0,elapsed:0,events:[],maxCombo:0,benchmarkLane:1});
    this.traffic=Array.from({length:this.mode.traffic},(_,i)=>{const lane=i%4;return{id:i,z:70+i*38+this.rng()*17,lane,x:this.rules.lanes[lane],speed:(17+this.rng()*13)*this.mode.speed,type:i%5===0?1:0,color:i%5,passed:false};});
  }
  start(){this.reset();this.phase='running';}
  event(text,kind='good'){this.events.push({text,kind,time:this.elapsed});if(this.events.length>30)this.events.shift();}
  step(dt,input={}){
    if(this.phase!=='running')return;
    const r=this.rules;this.elapsed+=dt;this.time=Math.max(0,r.duration-this.elapsed);this.hit=Math.max(0,this.hit-dt*2.8);this.invincible=Math.max(0,this.invincible-dt);this.comboTime=Math.max(0,this.comboTime-dt);if(!this.comboTime)this.combo=0;
    const brake=input.brake?1:0,throttle=brake||input.throttle===false?0:1;
    this.boosting=!!input.boost&&this.nitro>1&&this.speed>12&&!brake;
    this.nitro=clamp(this.nitro+dt*(this.boosting?-25:5.5),0,100);
    const accel=throttle*(r.acceleration+(this.boosting?12:0))-brake*r.braking-r.drag*this.speed*this.speed-(throttle?0:1.5);
    this.speed=clamp(this.speed+accel*dt,0,r.boostSpeed);
    if(!this.boosting&&this.speed>r.maxSpeed)this.speed=Math.max(r.maxSpeed,this.speed-5*dt);
    this.steer+=(clamp(input.steer||0,-1,1)-this.steer)*Math.min(1,dt*r.steerResponse);
    this.vx+=(this.steer*r.lateralAcceleration*Math.min(1,this.speed/18)-this.vx*r.lateralDamping-roadDDX(this.progress)*this.speed*this.speed)*dt;
    this.x+=this.vx*dt;this.progress+=this.speed*dt;
    if(Math.abs(this.x)>6.55){this.x=clamp(this.x,-6.55,6.55);this.vx*=-.2;if(this.invincible===0){this.health=Math.max(0,this.health-6);this.speed*=.8;this.invincible=.7;this.hit=.35;this.combo=0;this.event('擦到护栏 · −6','bad');}}
    for(const car of this.traffic){
      car.z+=car.speed*dt;
      // Small deterministic lane movement keeps traffic alive without surprise lane changes.
      car.x=r.lanes[car.lane]+Math.sin(this.elapsed*.45+car.id*1.7)*.12;
      const dz=car.z-this.progress,dx=Math.abs(car.x-this.x);
      if(Math.abs(dz)<r.collisionHalfLength&&dx<r.collisionHalfWidth&&this.invincible===0){this.health=Math.max(0,this.health-r.collisionDamage);this.speed*=.46;this.invincible=1.5;this.hit=1;this.combo=0;this.vx+=(this.x<car.x?-1:1)*3;this.event('碰撞 · 连击中断','bad');}
      if(dz< -5&&!car.passed){car.passed=true;this.overtakes++;this.score+=50;if(dx<r.nearMissWidth&&dx>=r.collisionHalfWidth&&this.speed-car.speed>5&&this.invincible===0){this.combo=Math.min(8,this.combo+1);this.maxCombo=Math.max(this.maxCombo,this.combo);this.comboTime=5;this.nearMisses++;this.nitro=Math.min(100,this.nitro+16);this.score+=250*this.combo;this.event('极限擦车 ×'+this.combo+'  +'+250*this.combo);}else if(this.invincible===0){this.event('超越 +50');}}
      if(dz< -70){car.z=this.progress+620+this.rng()*280;car.lane=Math.floor(this.rng()*4);car.speed=(17+this.rng()*13)*this.mode.speed;car.passed=false;}
    }
    if(this.health<=0){this.phase='finished';this.result='车辆受损';}
    else if(this.time<=0){this.phase='finished';this.result=this.progress>=this.mode.target?'挑战完成':'距离不足';}
  }
  snapshot(){return{phase:this.phase,difficulty:this.difficulty,elapsed:this.elapsed,progress:this.progress,x:this.x,speed:this.speed,health:this.health,nitro:this.nitro,score:this.score,overtakes:this.overtakes,nearMisses:this.nearMisses,combo:this.combo};}
}
