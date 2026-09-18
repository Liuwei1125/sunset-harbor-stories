import RAPIER from '../../vendor/rapier/rapier-0.20.0.mjs';
import {DT,CARS,SETUPS} from './catalog.js';
import {v,add,sub,mul,dot,cross,length,norm,rotate,yawQ,clamp,approach} from './math.js';
let initialization;
export function initPhysics(){return initialization??=RAPIER.init();}
export class Physics {
 constructor(track,{flat=false}={}){
  this.track=track;this.world=new RAPIER.World(v(0,-9.81,0));this.world.timestep=DT;this.cars=[];this.steps=0;
  this.world.numSolverIterations=6;
  const ground=flat?RAPIER.ColliderDesc.cuboid(3000,.2,3000).setTranslation(0,-.2,0):RAPIER.ColliderDesc.trimesh(new Float32Array(track.surface.positions),new Uint32Array(track.surface.indices));
  this.world.createCollider(ground.setFriction(.7).setCollisionGroups(0x00010003));
  if(track.id==='test'){
   this.world.createCollider(RAPIER.ColliderDesc.cuboid(15,.7,.6).setTranslation(0,.7,-380).setCollisionGroups(0x00010003));
   for(const [x,z,hx,hz] of [[-120,-150,.6,250],[260,-150,.6,250],[70,100,190,.6],[70,-400,190,.6]])this.world.createCollider(RAPIER.ColliderDesc.cuboid(hx,.6,hz).setTranslation(x,.6,z).setCollisionGroups(0x00010003));
   for(let i=0;i<5;i++)this.world.createCollider(RAPIER.ColliderDesc.cuboid(2,.06,.45).setTranslation(30,.06,-30-i*3).setCollisionGroups(0x00010003));
  }
  if(!flat){
   this.world.createCollider(RAPIER.ColliderDesc.cuboid(3000,.3,3000).setTranslation(0,-5,0).setCollisionGroups(0x00010003));
   // Low kerbs have real collision geometry. Outer barriers leave generous runoff.
   for(let i=0;i<track.samples.length;i+=4){const a=track.samples[i],b=track.samples[(i+4)%track.samples.length],delta=sub(b.p,a.p),len=length(delta),yaw=Math.atan2(delta.x,delta.z);for(const sign of [-1,1]){
    if(Math.abs(a.curvature)>.009){const p=add(mul(add(a.p,b.p),.5),mul(a.side,sign*(track.width/2+.35)));this.world.createCollider(RAPIER.ColliderDesc.cuboid(.35,.045,len/2).setTranslation(p.x,p.y+.025,p.z).setRotation(yawQ(yaw)).setCollisionGroups(0x00010003));}
    const p=add(mul(add(a.p,b.p),.5),mul(a.side,sign*(track.width/2+10)));this.world.createCollider(RAPIER.ColliderDesc.cuboid(.3,.6,len/2+.1).setTranslation(p.x,p.y+.6,p.z).setRotation(yawQ(yaw)).setCollisionGroups(0x00010003).setRestitution(.12));
   }}
  }
 }
 addCar(id,settings,s=0,offset=0){const car=new Vehicle(this,id,settings);this.cars.push(car);this.reset(car,s,offset);return car;}
 reset(car,s=0,offset=0){const a=this.track.sample(s,offset),q=yawQ(a.yaw);car.body.setTranslation(add(add(a.p,rotate(car.origin,q)),v(0,.05,0)),true);car.body.setRotation(q,true);car.body.setLinvel(v(),true);car.body.setAngvel(v(),true);car.body.resetForces(true);car.body.resetTorques(true);car.steer=0;car.throttle=0;car.brake=0;car.gear=1;car.shift=0;car.speed=0;car.abs=false;car.tc=false;car.slip=0;car.wheels.forEach(w=>{w.spin=0;w.steer=0;w.length=w.nominal;w.contact=false;w.load=0;});car.near=this.track.nearest(a.p);car.previous=car.pose();}
 step(inputs){for(let i=0;i<this.cars.length;i++){const car=this.cars[i];car.previous=car.pose();car.step(inputs[i]||{});}this.world.step();this.steps++;for(const car of this.cars)car.afterStep();}
 dispose(){this.world.free();this.cars.length=0;}
}
export class Vehicle {
 constructor(physics,id,settings){this.physics=physics;this.config=CARS[id];this.settings={...settings};this.setup=SETUPS[settings.setup]||SETUPS.balanced;const c=this.config;this.origin=v(0,c.com,c.axles[1]-c.frontWeight*(c.axles[0]+c.axles[1]));
  this.body=physics.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setCanSleep(false).setCcdEnabled(true).setAngularDamping(.15));
  this.collider=physics.world.createCollider(RAPIER.ColliderDesc.cuboid(.86,.24,2.05).setTranslation(0,.04,-this.origin.z).setDensity(0).setFriction(.3).setRestitution(.12).setCollisionGroups(0x00020003),this.body);
  this.body.setAdditionalMassProperties(c.mass,v(),v(c.mass*1.58,c.mass*1.65,c.mass*.35),{x:0,y:0,z:0,w:1},true);
  this.wheels=[];for(let i=0;i<4;i++){const front=i<2,staticLoad=c.mass*9.81*(front?c.frontWeight:1-c.frontWeight)/2,k=c.spring*this.setup.spring;const nominal=.36-staticLoad/k;this.wheels.push({local:v(i%2?-c.halfTrack:c.halfTrack,c.radius-c.com+nominal,(front?-c.axles[0]:c.axles[1])-this.origin.z),nominal,rest:.36,k,front,spin:0,steer:0,length:nominal,load:staticLoad,contact:false,slip:0});}
  this.energy=c.kind==='ev'?c.battery:c.fuel;this.rpm=c.idle;this.input={};this.forward=v(0,0,-1);this.right=v(1,0,0);this.power=0;this.lastVelocity=v();this.impact=0;
 }
 step(input){const c=this.config,b=this.body,dt=DT,q=b.rotation(),p=b.translation(),vel=b.linvel(),omega=b.angvel();this.input=input;this.forward=rotate(v(0,0,-1),q);this.right=rotate(v(1,0,0),q);const up=rotate(v(0,1,0),q);this.speed=dot(vel,this.forward);this.lateral=dot(vel,this.right);const speed=Math.abs(this.speed);
  this.throttle=approach(this.throttle,clamp(input.throttle||0),dt*3);this.brake=approach(this.brake,clamp(input.brake||0),dt*6);const target=clamp(input.steer||0,-1,1)*c.maxSteer/(1+(input.analog?0:speed*.023));this.steer=approach(this.steer,target,dt*(input.analog?2.8:1.5));
  b.resetForces(true);b.resetTorques(true);this.abs=false;this.tc=false;this.slip=0;this.shift=Math.max(0,this.shift-dt);
  let ratio=c.ratios[this.gear-1]*c.finalDrive;this.rpm=c.kind==='ev'?speed/c.radius*ratio*60/(2*Math.PI):clamp(Math.max(c.idle,speed/c.radius*ratio*60/(2*Math.PI)),c.idle,c.redline+200);
  if(c.kind==='ice'&&this.shift===0){if(this.rpm>c.redline*.93&&this.gear<c.ratios.length){this.gear++;this.shift=.16;}else if(this.rpm<c.redline*.38&&this.gear>1){this.gear--;this.shift=.13;}ratio=c.ratios[this.gear-1]*c.finalDrive;}
  const rpmTorque=c.kind==='ev'?c.torque:c.torque*(c.id==='bmw-m4'?clamp(this.rpm/1850,.72,1):clamp(.66+.34*this.rpm/6000,.66,1));
  let drive=Math.min(rpmTorque*ratio/c.radius,c.power/Math.max(speed,1))*.9*this.throttle*(this.shift?0:1)*(this.energy>0?1:0);if(this.rpm>=c.redline&&c.kind==='ice')drive=0;
  drive*=clamp(1-this.brake*5);
  if(input.reverse)drive=-Math.min(3500,c.mass*2)*this.throttle;
  const regen=c.kind==='ev'&&this.settings.regen?Math.min(100000/Math.max(speed,3),c.mass*(this.settings.regen===2?1.8:.85))*(1-this.throttle)*clamp(speed,0,1):0;
  const engineBrake=c.kind==='ice'?(1-this.throttle)*c.mass*.24*clamp(speed,0,1):regen;
  this.near=this.physics.track.nearest(p,this.near?.index);this.power=0;
  for(let i=0;i<4;i++){
   const w=this.wheels[i],hard=add(p,rotate(w.local,q)),ray=new RAPIER.Ray(hard,mul(up,-1));const hit=this.physics.world.castRayAndGetNormal(ray,w.rest+c.radius+.15,true,undefined,0x00010001,undefined,b);w.contact=!!hit;w.load=0;
   const steer=w.front?this.steer:0;w.steer=steer;
   if(!hit){w.length=w.rest+.1;w.spin-=this.speed/c.radius*dt;continue;}
   w.length=clamp(hit.timeOfImpact-c.radius,.03,w.rest+.12);const at=add(hard,mul(up,-hit.timeOfImpact));const pointVel=add(vel,cross(omega,sub(at,p)));const suspension=clamp((w.rest-w.length)*w.k-dot(pointVel,up)*c.damping,0,c.mass*9.81*.95);w.load=suspension;
   b.addForceAtPoint(mul(up,suspension),at,true);
   const fw=norm(sub(rotate(v(-Math.sin(steer),0,-Math.cos(steer)),q),mul(hit.normal,dot(rotate(v(-Math.sin(steer),0,-Math.cos(steer)),q),hit.normal))));const right=norm(cross(fw,hit.normal));const longitudinal=dot(pointVel,fw),lateral=dot(pointVel,right);
   const road=this.physics.track.nearest(at,this.near.index),grass=Math.abs(road.offset)>this.physics.track.width/2+.7;
   const grip=c.mu*this.setup.grip*(grass?.48:1)*Math.pow(Math.max(.25,suspension/(c.mass*9.81/4)),-.06);const limit=suspension*grip;
   const driveShare=(w.front?c.frontDrive:1-c.frontDrive)/2;let fx=drive*driveShare;
   const braking=this.brake*c.mass*12.5*(w.front?this.setup.bias:1-this.setup.bias)/2+engineBrake/4+(input.handbrake&&!w.front?c.mass*5:0);
   const slipAngle=Math.atan2(lateral,Math.max(Math.abs(longitudinal),2));let fy=-Math.tanh(slipAngle*c.cornering)*limit;
   // Locked tyres have markedly less lateral authority. ABS releases excess demand.
   const lock=braking>limit*.98&&speed>2;if(lock&&this.settings.abs&&!input.handbrake){this.abs=true;}else if(lock){fy*=.24;}
   const effectiveBrake=lock&&this.settings.abs&&!input.handbrake?Math.min(braking,limit*.91):braking;
   fx-=Math.sign(longitudinal||this.speed)*Math.min(effectiveBrake,Math.abs(longitudinal)*c.mass/(4*dt));
   fx-=longitudinal*(grass?c.mass*.032:c.mass*.0025);
   let demand=Math.hypot(fx,fy);const powerSlip=Math.max(0,Math.abs(drive*driveShare)-Math.sqrt(Math.max(0,limit*limit-fy*fy)));
   if(this.settings.tc&&powerSlip>20&&this.throttle>0&&driveShare>0){this.tc=true;const authority=this.settings.tc===2?.95:.55;fx-=Math.sign(drive)*powerSlip*authority;demand=Math.hypot(fx,fy);}
   if(demand>limit&&limit>0){const scale=limit/demand;fx*=scale;fy*=scale;}
   if(lock&&!this.settings.abs)fx=clamp(fx,-limit*.85,limit*.85);
   b.addForceAtPoint(add(mul(fw,fx),mul(right,fy)),at,true);
   const spinSlip=(this.tc?powerSlip*.08:powerSlip)/Math.max(200,suspension)*9;w.spin-=(lock&&!this.settings.abs?0:longitudinal/c.radius+Math.sign(drive)*spinSlip)*dt;w.slip=Math.max(Math.abs(slipAngle),spinSlip*.05);this.slip=Math.max(this.slip,w.slip);this.power+=fx*longitudinal;
  }
  const air=mul(vel,-.5*1.225*c.drag*this.setup.drag*length(vel));b.addForce(air,true);b.addForce(mul(up,-c.downforce*speed*speed),true);
  // Friction braking cannot charge a battery. Only the configured motor regen
  // contributes negative electrical power; drivetrain efficiency is approximate.
  if(c.kind==='ev'){this.power=clamp(Math.max(0,drive*this.speed)/920-regen*speed*.8/1000,-100,c.power/1000);this.energy=clamp(this.energy-this.power*dt/3600,0,c.battery);}else{this.power=Math.max(0,drive*this.speed/1000);this.energy=Math.max(0,this.energy-(.00022+this.power*.000082)*dt);}
  this.lastVelocity={...vel};
 }
 afterStep(){const vel=this.body.linvel();this.impact=Math.max(0,length(sub(vel,this.lastVelocity))-1.5);this.speed=dot(vel,this.forward);}
 pose(){const q={...this.body.rotation()},p=sub(this.body.translation(),rotate(this.origin,q));return {p,q,wheels:this.wheels.map(w=>({spin:w.spin,steer:w.steer,dy:w.nominal-w.length,load:w.load,contact:w.contact})),steer:this.steer||0};}
 telemetry(){const c=this.config;return {speedKph:Math.abs(this.speed)*3.6,engineRpm:this.rpm,motorRpm:this.rpm,gear:c.kind==='ev'?(this.input.reverse?'R':'D'):String(this.gear),powerKw:this.power,fuelPct:this.energy/c.fuel*100,batteryPct:this.energy/c.battery*100,throttle:this.throttle,brake:this.brake,abs:this.abs,tc:this.tc};}
}
