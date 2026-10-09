/* Original Harbor racing UI; display inputs are not Tesla performance claims. */
(function(root){
 'use strict';
 const defaults=Object.freeze({speedKph:0,motorRpm:0,gear:'P',powerKw:0,batteryPct:86,throttle:0,brake:0,lap:1,lapTimeMs:0,deltaMs:0,abs:false,tc:false});
 const ranges={speedKph:[0,400],motorRpm:[0,30000],powerKw:[-400,1000],batteryPct:[0,100],throttle:[0,1],brake:[0,1],lap:[1,999],lapTimeMs:[0,86400000],deltaMs:[-600000,600000]};
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 function normalize(patch,previous=defaults){const s={...previous};if(!patch||typeof patch!=='object')return s;for(const [k,[a,b]] of Object.entries(ranges))if(typeof patch[k]==='number'&&Number.isFinite(patch[k]))s[k]=clamp(patch[k],a,b);s.lap=Math.floor(s.lap);if(['P','R','N','D'].includes(patch.gear))s.gear=patch.gear;for(const k of ['abs','tc'])if(typeof patch[k]==='boolean')s[k]=patch[k];return s;}
 function time(ms){const n=Math.floor(ms);return `${Math.floor(n/60000)}:${String(Math.floor(n/1000)%60).padStart(2,'0')}.${String(n%1000).padStart(3,'0')}`;}
 function text(c,s,x,y,size=28,color='#737a83',align='left',weight=500){c.font=`${weight} ${size}px system-ui,sans-serif`;c.fillStyle=color;c.textAlign=align;c.textBaseline='middle';c.fillText(String(s),x,y);}
 function rect(c,x,y,w,h,color,r=0){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
 function track(c,x,y,w,h,progress){
  const points=[[.10,.70],[.14,.23],[.37,.12],[.48,.34],[.71,.17],[.90,.28],[.89,.68],[.66,.85],[.49,.64],[.26,.89],[.10,.70]];
  c.beginPath();points.forEach(([a,b],i)=>i?c.lineTo(x+a*w,y+b*h):c.moveTo(x+a*w,y+b*h));c.lineJoin='round';c.lineWidth=15;c.strokeStyle='#cfd5dc';c.stroke();c.lineWidth=3;c.strokeStyle='#ffffff';c.stroke();
  const k=(progress%1)*10,i=Math.floor(k),f=k-i,p=points[i],q=points[i+1];c.beginPath();c.arc(x+(p[0]+(q[0]-p[0])*f)*w,y+(p[1]+(q[1]-p[1])*f)*h,13,0,Math.PI*2);c.fillStyle='#da3b38';c.fill();
 }
 function drawFront(c,state,source='parked'){
  const s=normalize(state),W=1536,H=960;c.save();c.setTransform(c.canvas.width/W,0,0,c.canvas.height/H,0,0);rect(c,0,0,W,H,'#f5f6f8');
  rect(c,0,0,510,870,'#ffffff');text(c,'MODEL 3',42,51,25,'#1b2026','left',650);text(c,source==='demo'?'DEMO':source==='external'?'LIVE INPUT':'READY',1485,51,22,source==='demo'?'#ca3a35':'#76818b','right');
  text(c,Math.round(s.speedKph),254,195,150,'#11161d','center',500);text(c,'km/h',254,291,24,'#687482','center');
  ['P','R','N','D'].forEach((g,i)=>text(c,g,148+i*71,350,30,g===s.gear?'#11161d':'#b9bec5','center',g===s.gear?700:400));
  rect(c,58,400,394,5,'#e6e9ed',2);const power=clamp(s.powerKw/500,-1,1);rect(c,255+(power<0?power*195:0),400,Math.abs(power)*195,5,power<0?'#39a376':'#343e4a',2);
  text(c,`${s.powerKw<0?'REGEN':'POWER'}  ${Math.round(s.powerKw)} kW`,254,441,23,'#69737d','center');
  // Original top-view vehicle pictogram, separate from the licensed car mesh.
  rect(c,202,500,105,182,'#dde2e8',38);rect(c,214,533,81,65,'#647386',15);rect(c,215,617,79,38,'#7c8999',10);rect(c,194,529,8,34,'#2c343e',3);rect(c,307,529,8,34,'#2c343e',3);rect(c,194,635,8,34,'#2c343e',3);rect(c,307,635,8,34,'#2c343e',3);
  text(c,`${Math.round(s.batteryPct)}%`,254,744,38,s.batteryPct<15?'#b58027':'#313c47','center');rect(c,180,782,148,8,'#e1e6ea',4);rect(c,180,782,148*s.batteryPct/100,8,'#56a888',4);
  text(c,'HARBOR CIRCUIT',562,127,31,'#242d37','left',600);text(c,'TRACK TELEMETRY',562,169,20);
  track(c,560,205,900,370,s.lapTimeMs/90000);
  rect(c,558,590,925,206,'#ffffff',19);text(c,'LAP',590,629,21);text(c,String(s.lap).padStart(2,'0'),590,710,64,'#222b36');text(c,'CURRENT',736,629,21);text(c,time(s.lapTimeMs),736,710,61,'#222b36');text(c,'DELTA',1372,629,21,'#737a83','right');text(c,`${s.deltaMs>0?'+':''}${(s.deltaMs/1000).toFixed(3)}`,1438,710,47,s.deltaMs<=0?'#28856a':'#bc4141','right');
  text(c,'THROTTLE',562,832,17);rect(c,683,827,270,8,'#e1e6ea',4);rect(c,683,827,270*s.throttle,8,'#4a987b',4);text(c,'BRAKE',1025,832,17);rect(c,1100,827,330,8,'#e1e6ea',4);rect(c,1100,827,330*s.brake,8,'#d7514b',4);
  rect(c,0,872,W,88,'#e9edf1');text(c,'RACE',53,916,24,'#222b36','left',650);text(c,`${Math.round(s.motorRpm).toLocaleString('en-US')} rpm`,272,916,23);text(c,'ABS',611,916,22,s.abs?'#b88028':'#a7afb8');text(c,'TC',720,916,22,s.tc?'#b88028':'#a7afb8');text(c,source==='demo'?'SIMULATED INPUT':'HARBOR / ORIGINAL RACING UI',1485,916,20,'#737f8b','right');c.restore();
 }
 function drawRear(c,state,source='parked'){
  const s=normalize(state);c.save();c.setTransform(c.canvas.width/1024,0,0,c.canvas.height/600,0,0);rect(c,0,0,1024,600,'#10161e');text(c,'HARBOR / PASSENGER DISPLAY',42,48,23,'#bbc9d6');text(c,source==='demo'?'DEMO':'TRACK',978,48,21,'#7aabb0','right');text(c,Math.round(s.speedKph),256,226,142,'#f2f6fb','center');text(c,'km/h',256,337,25,'#8d9faf','center');text(c,`LAP ${String(s.lap).padStart(2,'0')}`,565,160,27,'#93a8ba');text(c,time(s.lapTimeMs),565,237,58,'#edf2f6');text(c,`${s.deltaMs>0?'+':''}${(s.deltaMs/1000).toFixed(3)} s`,565,326,36,s.deltaMs<=0?'#75c9a4':'#ed9690');rect(c,43,422,939,1,'#334353');text(c,`BATTERY  ${Math.round(s.batteryPct)}%`,43,503,25,'#b8c6d3');text(c,`${s.gear}  /  ${Math.round(s.powerKw)} kW`,981,503,25,'#b8c6d3','right');c.restore();
 }
 function create(scene,B=root.BABYLON){
  let state={...defaults},shown={...state},source='parked',demo=false,demoTime=0,elapsed=.05,disposed=false,updates=0,last='';const bindings=[];
  const panels=[['display:front',1536,960,drawFront],['display:rear',1024,600,drawRear]].map(([name,w,h,draw])=>{const texture=new B.DynamicTexture(name+' / live',{width:w,height:h},scene,true,B.Texture.TRILINEAR_SAMPLINGMODE);texture.wrapU=texture.wrapV=B.Texture.CLAMP_ADDRESSMODE;texture.gammaSpace=true;texture.anisotropicFilteringLevel=4;const material=new B.PBRMaterial(name+' / runtime',scene);material.unlit=true;material.albedoColor=B.Color3.White();material.albedoTexture=texture;material.metallic=0;material.roughness=1;return {name,texture,material,draw};});
  function paint(force=false){const sig=JSON.stringify([Math.round(shown.speedKph),Math.round(shown.motorRpm),shown.gear,Math.round(shown.powerKw),Math.round(shown.batteryPct),Math.round(shown.throttle*100),Math.round(shown.brake*100),shown.lap,Math.floor(shown.lapTimeMs),Math.round(shown.deltaMs),shown.abs,shown.tc,source,demo]);if(!force&&last===sig)return;last=sig;for(const p of panels){p.draw(p.texture.getContext(),shown,source);p.texture.update(false);}updates++;}
  function detach(){for(const [mesh,mat] of bindings)if(!mesh.isDisposed())mesh.material=mat;bindings.length=0;}
  const api={setTelemetry(p){if(disposed)return;demo=false;source='external';state=normalize(p,state);return {...state};},setDemo(v){if(disposed)return;demo=Boolean(v);if(demo){source='demo';demoTime=0;}return demo;},reset(){if(disposed)return;state={...defaults};shown={...state};source='parked';demo=false;demoTime=0;paint();},getState:()=>({...state,source,demo}),getDisplayed:()=>({...shown,source}),stats:()=>({bindings:bindings.length,textures:disposed?0:2,updates,disposed}),detach,
   attach(container){if(disposed)throw new Error('Display is disposed');detach();for(const mesh of container.meshes){const p=panels.find(p=>mesh.material?.name===p.name);if(p){bindings.push([mesh,mesh.material]);mesh.material=p.material;}}if(bindings.length!==2){detach();throw new Error('Expected the front and rear Model 3 display surfaces');}paint(true);},
   tick(dt){if(disposed||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.1);elapsed+=dt;if(demo){demoTime+=dt;const t=demoTime%30,speed=t<3?0:t<14?(t-3)/11*198:t<20?198-(t-14)/6*135:t<26?63+(t-20)/6*86:149-(t-26)/4*149,braking=t>=14&&t<20||t>=26;state=normalize({speedKph:speed,motorRpm:speed*82,gear:t<3?'P':'D',powerKw:t<3?0:braking?-95:210,batteryPct:86-demoTime/1200,throttle:t<3||braking?0:.68,brake:braking?.55:0,lap:1+Math.floor(demoTime/30),lapTimeMs:t*1000,deltaMs:Math.sin(demoTime/5)*380,abs:braking&&speed>170,tc:t>3&&t<4},state);}const f=1-Math.exp(-dt*12);shown={...state,speedKph:shown.speedKph+(state.speedKph-shown.speedKph)*f,motorRpm:shown.motorRpm+(state.motorRpm-shown.motorRpm)*f};if(elapsed>=.05){elapsed%=.05;paint();}},
   dispose(){if(disposed)return;detach();panels.forEach(p=>{p.material.dispose();p.texture.dispose();});disposed=true;}};paint();return api;
 }
 root.Model3Telemetry=Object.freeze({schemaVersion:1,defaults,normalize,formatLapTime:time,drawFront,drawRear,create});
})(globalThis);
