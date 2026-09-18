/* Original Harbor racing display. Inputs are simulation data, not manufacturer specifications. */
(function(root){'use strict';
 const defaults={speedKph:0,engineRpm:0,gear:'P',powerKw:0,fuelPct:72,lap:1,lapTimeMs:0,deltaMs:0,throttle:0,brake:0,abs:false,tc:false};
 const ranges={speedKph:[0,400],engineRpm:[0,12000],powerKw:[-400,1000],fuelPct:[0,100],lap:[1,999],lapTimeMs:[0,86400000],deltaMs:[-600000,600000],throttle:[0,1],brake:[0,1]};
 function normalize(p,s=defaults){const n={...s};if(!p||typeof p!=='object')return n;for(const [k,[a,b]] of Object.entries(ranges))if(Number.isFinite(p[k]))n[k]=Math.max(a,Math.min(b,p[k]));n.lap=Math.floor(n.lap);if(['P','R','N','D','1','2','3','4','5','6','7','8'].includes(String(p.gear)))n.gear=String(p.gear);for(const k of ['abs','tc'])if(typeof p[k]==='boolean')n[k]=p[k];return n;}
 const time=ms=>`${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}.${String(Math.floor(ms)%1000).padStart(3,'0')}`;
 function draw(c,s,layout,label,source){
  const W=c.canvas.width,H=c.canvas.height;c.fillStyle='#111c25';c.fillRect(0,0,W,H);c.textBaseline='middle';
  const text=(v,x,y,size=30,color='#ecf3f8',align='left',weight=500)=>{c.font=`${weight} ${size}px system-ui,sans-serif`;c.fillStyle=color;c.textAlign=align;c.fillText(String(v),x,y);};
  const line=(x,y,w,color='#31414f',h=2)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
  const bar=(name,x,y,w,v,col)=>{text(name,x,y,20,'#94a9b8');line(x,y+30,w);line(x,y+30,w*v,col,7);};
  text(label.toUpperCase(),55,65,32);text(source==='demo'?'DEMO':source==='external'?'LIVE INPUT':'READY',W-55,65,25,'#77c8c0','right');
  if(layout==='portrait'){
   text(Math.round(s.speedKph),W/2,300,215,'#ecf3f8','center',400);text('km/h',W/2,458,32,'#94a9b8','center');
   ['P','R','N','D'].forEach((g,i)=>text(g,285+i*128,558,43,g===s.gear?'#ecf3f8':'#50626f','center'));
   line(65,630,W-130);text(`CURRENT LAP ${String(s.lap).padStart(2,'0')}`,75,704,33,'#94a9b8');text(time(s.lapTimeMs),75,821,123);
   text(`DELTA  ${s.deltaMs>0?'+':''}${(s.deltaMs/1000).toFixed(3)} s`,75,981,48,s.deltaMs<=0?'#77c8c0':'#ee827a');text(`FUEL  ${Math.round(s.fuelPct)}%`,75,1090,35);text(`${'POWER'}  ${Math.round(s.powerKw)} kW`,75,1170,35);
   bar('THROTTLE',75,1280,355,s.throttle,'#77c8c0');bar('BRAKE',530,1280,355,s.brake,'#e87676');
  }else{
   c.fillStyle='#31414f';c.fillRect(510,155,2,650);text(Math.round(s.speedKph),254,317,195,'#ecf3f8','center',400);text('km/h',254,460,32,'#94a9b8','center');
   text(`GEAR  ${s.gear}`,254,565,43,'#ecf3f8','center');
   text(`FUEL  ${Math.round(s.fuelPct)}%`,254,685,32,'#94a9b8','center');text(`${'POWER'} ${Math.round(s.powerKw)} kW`,254,767,30,'#77c8c0','center');
   text(`LAP ${String(s.lap).padStart(2,'0')}`,575,195,30,'#94a9b8');text(time(s.lapTimeMs),575,290,95);text(`DELTA  ${s.deltaMs>0?'+':''}${(s.deltaMs/1000).toFixed(3)} s`,580,395,34,s.deltaMs<=0?'#77c8c0':'#ee827a');
   const p=[[.07,.64],[.15,.18],[.45,.07],[.55,.38],[.80,.19],[.94,.36],[.84,.80],[.60,.91],[.41,.68],[.18,.93],[.07,.64]];c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(570+x*860,450+y*290):c.moveTo(570+x*860,450+y*290));c.strokeStyle='#64838e';c.lineWidth=10;c.lineJoin='round';c.stroke();const k=(s.lapTimeMs%90000)/90000*10,i=Math.floor(k),f=k-i;c.beginPath();c.arc(570+(p[i][0]*(1-f)+p[i+1][0]*f)*860,450+(p[i][1]*(1-f)+p[i+1][1]*f)*290,12,0,Math.PI*2);c.fillStyle='#77c8c0';c.fill();
   bar('THROTTLE',580,797,390,s.throttle,'#77c8c0');bar('BRAKE',1070,797,390,s.brake,'#e87676');
  }
  text(`${Math.round(s.engineRpm)} rpm`,55,H-65,24,'#94a9b8');text('ABS',W/2-80,H-65,24,s.abs?'#edb966':'#50626f');text('TC',W/2+20,H-65,24,s.tc?'#edb966':'#50626f');text('HARBOR / ORIGINAL UI',W-55,H-65,23,'#94a9b8','right');
 }
 function create(scene,B){let state={...defaults},shown={...defaults},demo=false,source='parked',t=0,elapsed=0,last='',panel=null,disposed=false,updates=0;
  function paint(force=false){const signature=JSON.stringify([shown,source,demo]);if(!force&&signature===last)return;last=signature;if(!panel){updates++;return;}draw(panel.texture.getContext(),shown,panel.layout,panel.label,source);panel.texture.update(false);updates++;}
  function detach(){if(!panel)return;for(const [mesh,original] of panel.bindings)if(!mesh.isDisposed())mesh.material=original;panel.material.dispose();panel.texture.dispose();panel=null;}
  const api={attach(container,config){if(disposed)throw Error('Telemetry disposed');if(!config.display.enabled){detach();paint(true);return;}const targets=container.meshes.filter(m=>m.material?.name==='display:front');if(targets.length!==1)throw Error('Missing independent cockpit display');detach();const texture=new B.DynamicTexture('Harbor / live display',{width:config.display.size[0],height:config.display.size[1]},scene,true,B.Texture.TRILINEAR_SAMPLINGMODE);texture.wrapU=texture.wrapV=B.Texture.CLAMP_ADDRESSMODE;texture.gammaSpace=true;const material=new B.PBRMaterial('Harbor / live material',scene);material.unlit=true;material.albedoTexture=texture;material.albedoColor=B.Color3.White();panel={texture,material,layout:config.display.layout,label:config.title,bindings:targets.map(m=>[m,m.material])};targets.forEach(m=>m.material=material);paint(true);},
   setTelemetry(p){if(disposed)return;state=normalize(p,state);demo=false;source='external';},setDemo(v){if(disposed)return;demo=Boolean(v);if(demo){source='demo';t=0;}},reset(){state={...defaults};shown={...state};demo=false;source='parked';t=0;paint(true);},
   tick(dt){if(disposed||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.1);elapsed+=dt;if(demo){t+=dt;const phase=t%30,speed=phase<3?0:phase<14?(phase-3)/11*198:phase<20?198-(phase-14)/6*135:phase<26?63+(phase-20)/6*86:149-(phase-26)/4*149,b=phase>=14&&phase<20||phase>=26;state=normalize({speedKph:speed,engineRpm:phase<3?850:1800+(speed%35)/35*5800,gear:phase<3?'P':String(Math.min(7,Math.floor(speed/35)+1)),powerKw:phase<3?0:b?0:210,lap:1+Math.floor(t/30),lapTimeMs:phase*1000,deltaMs:Math.sin(t/4)*430,throttle:phase<3||b?0:.7,brake:b?.55:0,abs:b&&speed>170,tc:phase>3&&phase<4},state);}const f=1-Math.exp(-dt*12);shown={...state,speedKph:shown.speedKph+(state.speedKph-shown.speedKph)*f,engineRpm:shown.engineRpm+(state.engineRpm-shown.engineRpm)*f};if(elapsed>=.05){elapsed%=.05;paint();}},
   getState:()=>({...state,demo,source}),stats:()=>({updates,bindings:panel?.bindings.length||0,textures:panel?1:0,disposed}),dispose(){if(disposed)return;detach();disposed=true;}};return api;
 }
 root.PerformanceTelemetry=Object.freeze({create,normalize,defaults,draw});
})(globalThis);
