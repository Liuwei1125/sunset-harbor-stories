import {Physics} from './physics.js';
import {Driver,targetSpeed} from './ai.js';
import {makeTrack,makeTestTrack} from './track.js';
import {DT} from './catalog.js';
import {wrap,clamp,dot,v} from './math.js';
import {recordKey,addLap,feedback,classify} from './records.js';
export class Session {
 constructor(settings,save,{sector=null,testing=false}={}){this.settings={...settings};this.save=save;this.track=settings.event==='test'?makeTestTrack():makeTrack(settings.track);this.key=recordKey(settings,this.track);this.physics=new Physics(this.track,{flat:settings.event==='test'});this.mode=sector===null?settings.event:'sector';this.sector=sector;this.phase='countdown';this.countdown=3;this.elapsed=0;this.notice='';this.noticeUntil=0;this.laps=[];this.lastFeedback=null;this.result=null;this.testing=testing;this.steps=0;this.trace=[];this.cooldown=0;this.measurements=[];this.accelStart=null;this.brakeStart=null;
  this.lapTarget=settings.track==='coast'?3:4;const race=['race','championship'].includes(this.mode),start=sector===null?-24:sector*this.track.length/3-10;
  this.entries=[];for(let i=0;i<(race?4:1);i++){const s=start+(race?i*6:0),offset=race?(i%2?2:-2):0,car=this.physics.addCar(settings.car,settings,s,offset);this.entries.push({id:i,name:i===0?'你':['','林舟','小夏','阿岚'][i],car,driver:i?new Driver(i,settings.difficulty):null,progress:s,lastS:wrap(s,this.track.length),lapNumber:0,lapStart:0,sectorStart:0,active:false,valid:true,reason:'',gate:Math.floor(s/this.track.length*24),sectors:[],brakeTime:0,offTime:0,offCharged:false,penalty:0,finished:false,finishTime:null,collisionCooldown:0});}
  this.player=this.entries[0].car;this.best=save.records[this.key]||null;this.ghost=this.best?.trace||null;
  // Establish broad-phase contact data before the first suspension ray query.
  for(let i=0;i<180;i++)this.physics.step(this.entries.map(()=>({brake:1})));
  this.entries.forEach(e=>{e.lastS=e.car.near.s;});
 }
 step(input={}){if(!['countdown','running'].includes(this.phase))return;this.steps++;
  if(this.phase==='countdown'){this.physics.step(this.entries.map(()=>({brake:1})));this.countdown-=DT;if(this.countdown<=0){this.phase='running';this.entries.forEach(e=>{e.lastS=e.car.near.s;});}return;}
  this.elapsed+=DT;this.cooldown=Math.max(0,this.cooldown-DT);
  const inputs=this.entries.map((e,i)=>e.finished?{brake:1}:i===0?input:e.driver.step(e.car,this.track,this.physics.cars));this.physics.step(inputs);
  if(this.mode==='test'){
   const car=this.player,speed=Math.abs(car.speed),p=car.body.translation();
   if(this.accelStart===null&&speed<.2&&input.throttle>.5)this.accelStart=this.elapsed;
   if(this.accelStart!==null&&speed>=100/3.6){const seconds=this.elapsed-this.accelStart;this.measurements.push(`0–100 km/h：${seconds.toFixed(2)} 秒`);this.message(this.measurements.at(-1),7);this.accelStart=null;}
   if(!this.brakeStart&&input.brake>.5&&speed>80/3.6)this.brakeStart={p:{...p},speed:speed*3.6};
   if(this.brakeStart&&speed<.2){const b=this.brakeStart,distance=Math.hypot(p.x-b.p.x,p.z-b.p.z);this.measurements.push(`${b.speed.toFixed(0)}–0 km/h：${distance.toFixed(1)} 米`);this.message(this.measurements.at(-1),8);this.brakeStart=null;}
   this.entries[0].progress=-p.z;return;
  }
  for(const e of this.entries){if(e.finished)continue;const car=e.car,near=car.near;let delta=wrap(near.s-e.lastS+this.track.length/2,this.track.length)-this.track.length/2;e.lastS=near.s;
   if(Math.abs(delta)>Math.max(8,Math.abs(car.speed)*DT*4)){e.valid=false;e.reason='路线跳跃，检查点无效';delta=0;}
   const old=e.progress;e.progress+=delta;e.collisionCooldown=Math.max(0,e.collisionCooldown-DT);
   const off=Math.abs(near.offset)>this.track.width/2+car.config.halfTrack+.1;e.offTime=off?e.offTime+DT:0;
   if(off&&e.offTime>.25){e.valid=false;e.reason='四轮越出赛道边线';e.badSector=this.track.sector(near.s);if(!e.offCharged){e.penalty+=3;e.offCharged=true;if(e.id===0)this.message('驶离赛道：本圈无效 · 比赛罚时 +3 秒');}}
   if(!off)e.offCharged=false;
   if(car.impact>3&&e.collisionCooldown===0){e.valid=false;e.reason='发生碰撞';e.penalty+=2;e.collisionCooldown=2;if(e.id===0)this.message('碰撞：本圈无效 · 比赛罚时 +2 秒');}
   if(e.offTime>1&&delta>0)e.penalty+=Math.max(DT,delta/12);
   if(delta<-.05&&e.id===0)this.message('逆向行驶，请按赛道方向前进',1);
   if(!e.active){const start=this.sector===null?0:this.sector*this.track.length/3;if(old<start&&e.progress>=start){e.active=true;e.lapStart=this.elapsed;e.sectorStart=this.elapsed;e.gate=Math.floor(start/this.track.length*24);e.valid=true;e.reason='';e.sectors=[];e.brakeTime=0;if(e.id===0)this.trace=[];}continue;}
   e.brakeTime+=car.brake>.15?DT:0;
   const gate=Math.floor(e.progress/this.track.length*24);if(gate>e.gate){if(gate-e.gate>1){e.valid=false;e.reason='漏过检查点';e.penalty+=5;}e.gate=gate;}
   const segment=this.track.length/3,oldSector=Math.floor(old/segment),newSector=Math.floor(e.progress/segment);
   if(newSector>oldSector){e.sectors.push({time:this.elapsed-e.sectorStart,exitSpeed:Math.abs(car.speed)*3.6,brake:e.brakeTime});e.sectorStart=this.elapsed;e.brakeTime=0;
    if(e.id===0&&this.best&&this.sector===null){const idx=(newSector-1)%3,d=e.sectors.at(-1).time-this.best.sectors[idx].time;this.message(`S${idx+1} ${d>0?'+':''}${d.toFixed(3)} 秒`);}
    if(this.mode==='sector'&&e.id===0){this.finishSector(e);return;}
   }
   if(e.id===0&&this.steps%12===0&&e.active){const pose=car.pose();this.trace.push([this.elapsed-e.lapStart,pose.p.x,pose.p.y,pose.p.z,pose.q.x,pose.q.y,pose.q.z,pose.q.w,near.s]);}
   if(Math.floor(e.progress/this.track.length)>Math.floor(old/this.track.length))this.finishLap(e);
  }
  if(['race','championship'].includes(this.mode)){
   if(this.entries.every(e=>e.finished)||this.entries[0].finished&&this.elapsed-this.entries[0].finishTime>40||this.elapsed>600){this.result=classify(this.entries.map(this.scoreEntry));this.phase='result';}
  }
 }
 scoreEntry=e=>({id:e.id,name:e.name,progress:e.progress,finished:e.finished,finishTime:e.finishTime,penalty:e.penalty,laps:e.lapNumber});
 finishLap(e){e.lapNumber++;if(e.id===0){const lap={time:this.elapsed-e.lapStart,valid:e.valid,reason:e.reason,badSector:e.badSector,sectors:e.sectors.map(s=>({...s})),trace:this.trace.map(p=>p.map(x=>Math.round(x*10000)/10000)),date:Date.now()};this.lastFeedback=feedback(lap,this.best,this.track);const personalBest=addLap(this.save,this.key,lap);this.laps.push({...lap,personalBest});if(personalBest){this.best=this.save.records[this.key];this.ghost=this.best.trace;}this.trace=[];this.message(lap.valid?(personalBest?'个人最佳！':'有效圈完成'):'无效圈：'+e.reason,5);}
  e.lapStart=this.elapsed;e.sectorStart=this.elapsed;e.sectors=[];e.brakeTime=0;e.valid=true;e.reason='';e.badSector=null;
  if(['race','championship'].includes(this.mode)&&e.lapNumber>=this.lapTarget){e.finished=true;e.car.finished=true;e.finishTime=this.elapsed;e.car.collider.setCollisionGroups(0x00020001);if(e.id===0)this.message('冲线！等待其他车手完成，最终名次含罚时。',40);}
 }
 finishSector(e){const lap={time:this.elapsed-e.lapStart,valid:e.valid,reason:e.reason,sector:this.sector,exitSpeed:Math.abs(e.car.speed)*3.6};this.result=lap;this.phase='result';const reference=this.best?.sectors?.[this.sector];this.lastFeedback={sector:this.sector,title:e.valid?'分段完成':'分段无效',text:reference?`本次 ${lap.time.toFixed(3)} 秒，完整最佳圈本段 ${reference.time.toFixed(3)} 秒；起步状态不同，仅供对照。出段 ${lap.exitSpeed.toFixed(0)} km/h。`:`本次 ${lap.time.toFixed(3)} 秒，出段 ${lap.exitSpeed.toFixed(0)} km/h。先稳定路线，再提高速度。`};}
 resetPlayer(){if(this.phase!=='running'||this.cooldown)return;const e=this.entries[0],s=e.progress;this.physics.reset(e.car,s,0);e.lastS=wrap(s,this.track.length);e.valid=false;e.reason='使用了返回赛道';e.penalty+=5;e.collisionCooldown=2;this.cooldown=2;this.message('返回赛道 · 本圈无效 · 比赛罚时 +5 秒');}
 message(text,duration=3){this.notice=text;this.noticeUntil=this.elapsed+duration;}
 liveDelta(){if(!this.ghost||!this.entries[0].active)return null;const s=this.player.near.s;let closest=this.ghost[0];for(const point of this.ghost)if(Math.abs(point[8]-s)<Math.abs(closest[8]-s))closest=point;return this.elapsed-this.entries[0].lapStart-closest[0];}
 hint(){if(!this.settings.hints)return '';if(this.player.brake>.2&&Math.abs(this.player.steer)>.16)return '先减速，再逐渐转向；松开刹车时保持平顺';if(this.player.tc)return '牵引控制介入：回正方向，逐渐增加油门';if(this.player.slip>.16)return '轮胎接近抓地极限，稍微收油并减小转向';const target=targetSpeed(this.player,this.track,this.player.near.s);if(this.player.speed>target+2)return '前方弯道，直线制动';return this.player.speed<target-7?'视线放远，平顺加速':'保持路线，准备下一个弯心';}
 dispose(){this.physics.dispose();}
}
