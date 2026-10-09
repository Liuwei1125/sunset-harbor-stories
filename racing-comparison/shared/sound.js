export class EngineSound{
 constructor(){this.enabled=true;}
 start(){
  if(this.ctx){this.ctx.resume();return;}
  this.ctx=new AudioContext();const c=this.ctx;this.master=c.createGain();this.master.gain.value=.20;this.master.connect(c.destination);
  this.filter=c.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=650;this.filter.Q.value=.7;this.filter.connect(this.master);
  this.voices=[['sawtooth',1,.16],['triangle',.5,.40],['sawtooth',2.003,.045]].map(([type,mul,gain])=>{const o=c.createOscillator(),g=c.createGain();o.type=type;g.gain.value=gain;o.connect(g);g.connect(this.filter);o.start();return{o,mul};});
  const noise=c.createBuffer(1,c.sampleRate*2,c.sampleRate),arr=noise.getChannelData(0);let n=0;for(let i=0;i<arr.length;i++){n=(n+(Math.random()*2-1)*.06)/1.025;arr[i]=n;}
  const src=c.createBufferSource();src.buffer=noise;src.loop=true;this.wind=c.createGain();this.wind.gain.value=0;src.connect(this.wind);this.wind.connect(this.master);src.start();
 }
 update(s){if(!this.ctx)return;const c=this.ctx,t=c.currentTime,active=s.phase==='running',gear=Math.min(6,Math.max(1,Math.floor(s.speed/12)+1)),rpm=1500+(s.speed-(gear-1)*12)/12*3900;
  this.master.gain.setTargetAtTime(active&&this.enabled?.22:0,t,.12);for(const {o,mul} of this.voices)o.frequency.setTargetAtTime((rpm/60)*mul,t,.08);this.filter.frequency.setTargetAtTime(400+s.speed*15+(s.boosting?600:0),t,.1);this.wind.gain.setTargetAtTime((s.speed/65)**2*1.5+(s.boosting?.8:0),t,.1);
 }
 crash(){if(!this.ctx||!this.enabled)return;const c=this.ctx,b=c.createBuffer(1,c.sampleRate*.23,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length)**3;const s=c.createBufferSource(),g=c.createGain();g.gain.value=.6;s.buffer=b;s.connect(g);g.connect(this.master);s.start();}
}
