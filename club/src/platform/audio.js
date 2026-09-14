export class ClubAudio{
 constructor(){this.ctx=null;this.volume=.65;}
 async unlock(){
  if(!this.ctx){const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)return;this.ctx=new Context();this.master=this.ctx.createGain();this.master.gain.value=this.volume*.2;this.master.connect(this.ctx.destination);this.engine=this.ctx.createOscillator();this.engine.type='sawtooth';this.engine.frequency.value=42;this.engineGain=this.ctx.createGain();this.engineGain.gain.value=0;const filter=this.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=280;this.engine.connect(filter).connect(this.engineGain).connect(this.master);this.engine.start();}
  if(this.ctx.state==='suspended')await this.ctx.resume();
 }
 setVolume(v){this.volume=v;if(this.master)this.master.gain.setTargetAtTime(v*.2,this.ctx.currentTime,.03);}
 tone(f=440,duration=.1,volume=.1,type='sine',end=f){
  if(!this.ctx||this.ctx.state!=='running')return;
  const o=this.ctx.createOscillator(),g=this.ctx.createGain(),t=this.ctx.currentTime;o.type=['sine','square','sawtooth','triangle'].includes(type)?type:'sine';o.frequency.setValueAtTime(Math.max(20,f),t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);g.gain.setValueAtTime(Math.max(.0001,volume),t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g).connect(this.master);o.start(t);o.stop(t+duration+.01);o.onended=()=>{o.disconnect();g.disconnect();};
 }
 update(snapshot){if(!this.ctx)return;const active=snapshot.mode==='race'&&snapshot.phase==='playing',speed=snapshot.run?.car?.speed||0;this.engine.frequency.setTargetAtTime(38+Math.abs(speed)*3.5,this.ctx.currentTime,.08);this.engineGain.gain.setTargetAtTime(active?.055+Math.abs(speed)*.001:0,this.ctx.currentTime,.06);}
 silence(){if(this.engineGain)this.engineGain.gain.setTargetAtTime(0,this.ctx.currentTime,.02);}
 dispose(){this.engine?.stop();this.ctx?.close();this.ctx=null;}
}
