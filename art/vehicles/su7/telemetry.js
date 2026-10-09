/* Original racing display artwork and a renderer-independent telemetry contract.
 * No network, timers, vehicle physics, or dependency on the Harbor game.
 */
(function (root) {
  'use strict';
  const DEFAULTS = Object.freeze({speedKph:0,motorRpm:0,gear:'P',powerKw:0,batteryPct:86,throttle:0,brake:0,lap:1,lapTimeMs:0,deltaMs:0,abs:false,tc:false});
  const RANGES = {speedKph:[0,400],motorRpm:[0,30000],powerKw:[-300,600],batteryPct:[0,100],throttle:[0,1],brake:[0,1],lap:[1,999],lapTimeMs:[0,86400000],deltaMs:[-600000,600000]};
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  function clean(patch,previous=DEFAULTS) {
    const next={...previous};
    if (!patch || typeof patch!=='object') return next;
    for (const [key,[min,max]] of Object.entries(RANGES)) {
      if (typeof patch[key]==='number' && Number.isFinite(patch[key])) next[key]=clamp(patch[key],min,max);
    }
    next.lap=Math.floor(next.lap);
    if (['P','R','N','D'].includes(patch.gear)) next.gear=patch.gear;
    for (const key of ['abs','tc']) if (typeof patch[key]==='boolean') next[key]=patch[key];
    return next;
  }
  function time(ms) {
    const n=Math.floor(ms),minutes=Math.floor(n/60000),seconds=Math.floor(n/1000)%60;
    return `${minutes}:${String(seconds).padStart(2,'0')}.${String(n%1000).padStart(3,'0')}`;
  }
  const C={bg:'#071015',panel:'#10212a',line:'#29414c',white:'#eef6f7',muted:'#819aa6',cyan:'#73d9f0',green:'#8dedad',red:'#ff736a',amber:'#ffcd78'};
  function label(ctx,value,x,y,size=22,color=C.muted,align='left',weight=500) {
    ctx.font=`${weight} ${size}px system-ui, sans-serif`;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(String(value),x,y);
  }
  function bar(ctx,x,y,width,height,value,color) {
    ctx.fillStyle=C.line;ctx.fillRect(x,y,width,height);ctx.fillStyle=color;ctx.fillRect(x,y,width*clamp(value,0,1),height);
  }
  function base(ctx,w,h) {
    ctx.save();ctx.setTransform(ctx.canvas.width/w,0,0,ctx.canvas.height/h,0,0);ctx.fillStyle=C.bg;ctx.fillRect(0,0,w,h);
  }
  function drawCluster(ctx,state,source='parked') {
    const s=clean(state);base(ctx,1024,320);
    label(ctx,'SU7  /  TRACK',36,34,18,C.muted);
    label(ctx,source==='demo'?'DEMO':source==='external'?'TELEMETRY':'READY',990,34,17,C.cyan,'right');
    // The SU7 is electric: motor speed and signed electrical power, no invented gears.
    label(ctx,Math.round(s.speedKph),505,146,124,C.white,'center',600);
    label(ctx,'km/h',505,229,22,C.muted,'center');
    label(ctx,s.gear,96,147,84,C.cyan,'center',550);
    label(ctx,'DRIVE',96,220,16,C.muted,'center');
    label(ctx,'MOTOR',980,85,16,C.muted,'right');
    label(ctx,Math.round(s.motorRpm).toLocaleString('en-US'),980,119,30,C.white,'right',550);
    label(ctx,'rpm',980,149,16,C.muted,'right');
    label(ctx,`${s.powerKw>=0?'+':''}${Math.round(s.powerKw)} kW`,980,207,32,s.powerKw<0?C.green:C.white,'right');
    bar(ctx,36,270,720,6,s.motorRpm/30000,C.cyan);
    label(ctx,`${Math.round(s.batteryPct)}%`,984,278,24,s.batteryPct<15?C.amber:C.green,'right');
    if(s.abs)label(ctx,'ABS',238,193,20,C.amber,'center');
    if(s.tc)label(ctx,'TC',238,223,20,C.amber,'center');
    ctx.restore();
  }
  function drawCenter(ctx,state,source='parked') {
    const s=clean(state);base(ctx,1280,720);
    label(ctx,'HARBOR  /  TRACK TELEMETRY',48,45,22,C.white);
    label(ctx,source==='demo'?'演示数据':source==='external'?'外部数据':'停驻',1230,45,21,C.cyan,'right');
    ctx.strokeStyle=C.line;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(48,80);ctx.lineTo(1232,80);ctx.stroke();
    label(ctx,'LAP',50,130,19);label(ctx,String(s.lap).padStart(2,'0'),50,184,54,C.white);
    label(ctx,'CURRENT LAP',230,130,19);label(ctx,time(s.lapTimeMs),228,190,63,C.white,'left',550);
    label(ctx,'DELTA',920,130,19);
    label(ctx,`${s.deltaMs>0?'+':''}${(s.deltaMs/1000).toFixed(3)}`,920,190,57,s.deltaMs<=0?C.green:C.red);
    ctx.fillStyle=C.panel;ctx.beginPath();ctx.roundRect(46,257,760,315,20);ctx.fill();
    label(ctx,'VEHICLE',75,292,18);
    label(ctx,Math.round(s.speedKph),82,405,108,C.white,'left',550);label(ctx,'km/h',290,443,22);
    label(ctx,s.gear,716,407,91,C.cyan,'center');
    label(ctx,'MOTOR',80,511,17);label(ctx,`${Math.round(s.motorRpm).toLocaleString('en-US')} rpm`,208,511,26,C.white);
    label(ctx,'BATTERY',530,511,17);label(ctx,`${Math.round(s.batteryPct)}%`,753,511,26,C.green,'right');
    label(ctx,'THROTTLE',855,291,18);label(ctx,`${Math.round(s.throttle*100)}%`,1230,291,22,C.white,'right');
    bar(ctx,855,319,377,12,s.throttle,C.cyan);
    label(ctx,'BRAKE',855,376,18);label(ctx,`${Math.round(s.brake*100)}%`,1230,376,22,C.white,'right');
    bar(ctx,855,404,377,12,s.brake,C.red);
    label(ctx,s.powerKw<0?'REGEN':'POWER',855,480,18);
    label(ctx,`${s.powerKw>0?'+':''}${Math.round(s.powerKw)} kW`,1230,531,49,s.powerKw<0?C.green:C.white,'right');
    ctx.strokeStyle=C.line;ctx.beginPath();ctx.moveTo(48,609);ctx.lineTo(1232,609);ctx.stroke();
    label(ctx,'ABS',48,662,21,s.abs?C.amber:C.muted);label(ctx,'TC',133,662,21,s.tc?C.amber:C.muted);
    label(ctx,source==='demo'?'模拟输入 · 非实车数据':'独立赛车显示界面',1230,662,19,C.muted,'right');
    ctx.restore();
  }
  function create(scene,B=root.BABYLON) {
    let state={...DEFAULTS},shown={...state},source='parked',demo=false,demoTime=0,elapsed=.05,disposed=false,updates=0,lastSignature='';
    const bindings=[];
    const panels=[['40 Instrument dynamic display',1024,320,drawCluster],['41 Center dynamic display',1280,720,drawCenter]].map(([name,w,h,draw])=>{
      const texture=new B.DynamicTexture(name+' / live',{width:w,height:h},scene,true,B.Texture.TRILINEAR_SAMPLINGMODE);
      texture.anisotropicFilteringLevel=4;
      texture.wrapU=texture.wrapV=B.Texture.CLAMP_ADDRESSMODE;texture.gammaSpace=true;
      const material=new B.PBRMaterial(name+' / runtime',scene);material.unlit=true;
      material.albedoColor=B.Color3.White();material.albedoTexture=texture;material.metallic=0;material.roughness=1;
      return {name,texture,material,draw};
    });
    function paint(force=false) {
      const signature=JSON.stringify([Math.round(shown.speedKph),Math.round(shown.motorRpm),shown.gear,Math.round(shown.powerKw),Math.round(shown.batteryPct),Math.round(shown.throttle*100),Math.round(shown.brake*100),shown.lap,Math.floor(shown.lapTimeMs),Math.round(shown.deltaMs),shown.abs,shown.tc,source,demo]);
      if(!force&&signature===lastSignature)return;lastSignature=signature;
      for(const p of panels){p.draw(p.texture.getContext(),shown,source);p.texture.update(false);}updates++;
    }
    function detach(){for(const [mesh,material] of bindings)if(!mesh.isDisposed())mesh.material=material;bindings.length=0;}
    const api={
      setTelemetry(patch){if(disposed)return;demo=false;source='external';state=clean(patch,state);return {...state};},
      setDemo(enabled){if(disposed)return;demo=Boolean(enabled);source=demo?'demo':source;if(demo)demoTime=0;return demo;},
      reset(){if(disposed)return;demo=false;demoTime=0;source='parked';state={...DEFAULTS};shown={...state};paint();},
      getState(){return {...state,source,demo};},
      getDisplayed(){return {...shown,source};},
      stats(){return {updates,bindings:bindings.length,textures:disposed?0:panels.length,disposed};},
      detach,
      attach(container){if(disposed)throw new Error('Telemetry renderer is disposed');detach();
        for(const mesh of container.meshes){const p=panels.find(p=>mesh.material?.name===p.name);if(p){bindings.push([mesh,mesh.material]);mesh.material=p.material;}}
        if(bindings.length!==2){detach();throw new Error('Expected independent cluster and center display surfaces');}paint(true);
      },
      tick(dt){if(disposed||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.1);elapsed+=dt;
        if(demo){demoTime+=dt;const t=demoTime%24;
          const speed=t<3?0:t<12?(t-3)/9*215:t<17?215-(t-12)/5*158:t<21?57+(t-17)/4*72:129-(t-21)/3*129;
          const braking=t>=12&&t<17||t>=21;
          state=clean({speedKph:speed,motorRpm:speed*88,gear:t<3?'P':'D',powerKw:t<3?0:braking?-115:240,throttle:t<3||braking?0:.72,brake:braking?.64:0,batteryPct:86-demoTime/1000,lap:1+Math.floor(demoTime/24),lapTimeMs:t*1000,deltaMs:Math.sin(demoTime/4)*420,abs:braking&&speed>150,tc:!braking&&t>3&&t<4.5},state);
        }
        const f=1-Math.exp(-dt*12);shown={...state,speedKph:shown.speedKph+(state.speedKph-shown.speedKph)*f,motorRpm:shown.motorRpm+(state.motorRpm-shown.motorRpm)*f};
        if(elapsed>=.05){elapsed%=.05;paint();}
      },
      dispose(){if(disposed)return;detach();for(const p of panels){p.material.dispose();p.texture.dispose();}disposed=true;}
    };
    paint();return api;
  }
  root.SU7Telemetry=Object.freeze({schemaVersion:1,defaults:DEFAULTS,normalize:clean,formatLapTime:time,drawCluster,drawCenter,create});
})(globalThis);
