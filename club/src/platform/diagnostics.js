export class Diagnostics{
 constructor(){this.started=performance.now();this.firstInteractive=null;this.frames=[];this.samples=[];this.errors=[];this.last=null;this.lastSample=0;}
 interactive(){this.firstInteractive??=performance.now();}
 frame(now,renderer,phase,clock){
  if(this.last!==null&&!document.hidden){this.frames.push(now-this.last);if(this.frames.length>18000)this.frames.splice(0,1000);}this.last=now;
  if(now-this.lastSample>10000){this.lastSample=now;this.samples.push({t:Math.round((now-this.started)/1000),phase,...renderer.stats(),heap:performance.memory?.usedJSHeapSize??null,droppedSeconds:clock.droppedSeconds});if(this.samples.length>240)this.samples.shift();}
 }
 report(renderer){const sorted=[...this.frames].sort((a,b)=>a-b),q=p=>sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))]??null;return {timestamp:new Date().toISOString(),firstInteractiveMs:this.firstInteractive,frames:this.frames.length,meanFrameMs:this.frames.reduce((a,b)=>a+b,0)/Math.max(1,this.frames.length),p95FrameMs:q(.95),p99FrameMs:q(.99),over50ms:this.frames.filter(x=>x>50).length,userAgent:navigator.userAgent,dpr:devicePixelRatio,viewport:[innerWidth,innerHeight],renderer:renderer?.stats(),samples:this.samples,errors:this.errors};}
}
