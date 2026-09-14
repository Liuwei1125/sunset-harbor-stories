export class FixedClock {
  constructor(step,dt=1/120){this.step=step;this.dt=dt;this.accumulator=0;this.last=null;this.droppedSeconds=0;}
  reset(now=null){this.last=now;this.accumulator=0;}
  advance(now,running=true){
    if(this.last===null){this.last=now;return 0;}
    const elapsed=Math.max(0,(now-this.last)/1000);this.last=now;
    if(!running){this.accumulator=0;return 0;}
    const accepted=Math.min(elapsed,.15);this.droppedSeconds+=elapsed-accepted;this.accumulator+=accepted;
    let count=0;while(this.accumulator+1e-12>=this.dt&&count<18){this.step(this.dt);this.accumulator=Math.max(0,this.accumulator-this.dt);count++;}
    return Math.min(1,this.accumulator/this.dt);
  }
}
