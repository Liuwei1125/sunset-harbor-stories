/* V4: independent land, coast and island maps. Geometry is local and offline. */
let regionId='coast', regionBusy=false;
const REGIONS={
 coast:{name:'\u65e5\u843d\u6d77\u5cb8',en:'PALM COAST',tag:'01 / METROPOLIS',desc:'\u57ce\u5e02\u8ffd\u9010\u3001\u6d77\u6e7e\u6e2f\u53e3\u4e0e\u56fd\u9645\u673a\u573a',accent:'#edbe80',fog:[.73,.81,.84],fogRange:670,water:'#247c92',spawn:V(5.4,.02,11),airport:V(44,0,485),heli:V(-4,0,432),dock:V(189,0,92),pier:V(171,.45,92),runway:{x:44,z:375,w:24,l:360},garage:V(-22,0,29),pickup:V(88,0,-44),drop:V(0,0,112),depot:V(-88,0,-44),bounds:950},
 islands:{name:'\u84dd\u6e7e\u7fa4\u5c9b',en:'AZURE ISLANDS',tag:'02 / ARCHIPELAGO',desc:'\u73ca\u745a\u6d77\u3001\u5c9b\u5c7f\u7a7a\u8fd0\u4e0e\u6d77\u4e0a\u6551\u63f4',accent:'#87dccc',fog:[.67,.83,.86],fogRange:850,water:'#147f9a',spawn:V(-80,.12,15),airport:V(0,0,329),heli:V(-30,0,305),dock:V(157,0,152),pier:V(139,.45,152),runway:{x:0,z:190,w:22,l:330},garage:V(-82,0,28),pickup:V(-105,0,70),drop:V(-8,0,-70),depot:V(-82,0,-63),bounds:1050},
 canyon:{name:'\u8d64\u5ca9\u9ad8\u5730',en:'REDSTONE REACH',tag:'03 / WILDERNESS',desc:'\u5ce1\u8c37\u98de\u884c\u3001\u8352\u6f20\u8d8a\u91ce\u4e0e\u6e56\u6cca\u822a\u9053',accent:'#e99d7f',fog:[.82,.76,.69],fogRange:800,water:'#3c8690',spawn:V(6,.02,16),airport:V(44,0,480),heli:V(-4,0,431),dock:V(357,0,160),pier:V(338,.45,160),runway:{x:44,z:375,w:24,l:360},garage:V(-22,0,29),pickup:V(88,0,-44),drop:V(0,0,140),depot:V(-88,0,-44),bounds:1050}
};
const COASTHILLS=Array.from({length:4},(_,i)=>({x:-480+i*150,z:-520,rx:135,rz:135,h:70+i*15}));
const ISLANDS=[{x:-40,z:140,rx:155,rz:282,h:.16},{x:455,z:-270,rx:138,rz:112,h:68},{x:-415,z:-310,rx:145,rz:110,h:92},{x:474,z:450,rx:108,rz:92,h:51},{x:-390,z:430,rx:116,rz:127,h:60}];
const HIGHLANDS=[{x:-370,z:20,rx:145,rz:300,h:112},{x:-440,z:-410,rx:260,rz:135,h:132},{x:50,z:-615,rx:260,rz:150,h:96},{x:100,z:800,rx:265,rz:175,h:100}];
function ovalDistance(x,z,a){return Math.hypot((x-a.x)/a.rx,(z-a.z)/a.rz);}
function heightOfMound(x,z,a){const d=ovalDistance(x,z,a);if(d>=1)return -.35;const f=Math.max(0,1-d*d);return .13+a.h*Math.pow(f,1.65)*(1+.13*Math.sin(x*.033)*Math.cos(z*.029));}
function landAt(p,region=regionId){if(region==='coast')return p.x<162;if(region==='canyon')return p.x<326;return ISLANDS.some(a=>ovalDistance(p.x,p.z,a)<1);}
function terrainHeight(p,region=regionId){if(region==='coast'){let y=.02;for(const a of COASTHILLS)y=Math.max(y,heightOfMound(p.x,p.z,a));return y;}if(region==='canyon'){let y=.02;for(const a of HIGHLANDS)y=Math.max(y,heightOfMound(p.x,p.z,a));return y;}let y=-.35;for(let i=0;i<ISLANDS.length;i++){const a=ISLANDS[i];if(i===0&&ovalDistance(p.x,p.z,a)<1)y=Math.max(y,.12);else y=Math.max(y,heightOfMound(p.x,p.z,a));}return y;}
function waterAt(p){return !landAt(p)&&!onPier(p);}
function onPier(p){const d=REGIONS[regionId].pier;return Math.abs(p.z-d.z)<3.2&&p.x>d.x-27&&p.x<d.x+8;}
const v3Ground=ground;
ground=function(p){const r=REGIONS[regionId];if(Math.abs(p.x-r.runway.x)<r.runway.w/2&&Math.abs(p.z-r.runway.z)<r.runway.l/2)return .20;if(dist2(p,r.heli)<9.5)return .23;if(onPier(p))return .45;if(regionId==='coast'&&Math.abs(p.x)<158&&Math.abs(p.z)<168)return v3Ground(p);return landAt(p)?terrainHeight(p):-.2;};
function waveHeight(p,t=state.t){return -.18+Math.sin(p.x*.11+t*.9)*.055+Math.sin(p.z*.17-t*1.2)*.045;}
function setRegionPoints(){const r=REGIONS[regionId];Object.assign(GARAGE,r.garage);Object.assign(PICKUP,r.pickup);Object.assign(DROP,r.drop);Object.assign(DEPOT,r.depot);if(regionId==='islands'){RACE_ROUTE.splice(0,RACE_ROUTE.length,...[[-80,-65],[-110,35],[-110,120],[-95,225],[-70,300],[-25,65],[-80,10]].map(p=>V(p[0],0,p[1])));}else{RACE_ROUTE.splice(0,RACE_ROUTE.length,...[[0,-88],[88,-88],[88,44],[0,132],[-88,88],[-88,0],[0,0]].map(p=>V(p[0],0,p[1])));} }
function waterPlane(){const n='v4_water';if(!shapes[n]){const a=[],s=28;for(let x=-.5;x<.499;x+=1/s)for(let z=-.5;z<.499;z+=1/s){const p=V(x,0,z),q=V(x+1/s,0,z),r=V(x+1/s,0,z+1/s),u=V(x,0,z+1/s);tri(a,p,u,q,V(0,1,0));tri(a,q,u,r,V(0,1,0));}shapes[n]=a;}city.put(n,REGIONS[regionId].water,0,-.23,0,3800,1,3800);}
function mountain(a,c,index){const n='v4_terrain_'+regionId+'_'+index;if(!shapes[n]){const out=[],grid=20;for(let i=0;i<grid;i++)for(let j=0;j<grid;j++){const pt=(i,j)=>{const x=(i/grid-.5)*2*a.rx,z=(j/grid-.5)*2*a.rz;return V(x/(a.rx*2),Math.max(-.23,heightOfMound(x+a.x,z+a.z,a)),z/(a.rz*2));};const p=pt(i,j),q=pt(i+1,j),r=pt(i+1,j+1),s=pt(i,j+1);tri(out,p,s,q);tri(out,q,s,r);}shapes[n]=out;}city.put(n,c,a.x,0,a.z,a.rx*2,1,a.rz*2);}
function ovalGround(a){const k='v4_island_flat';if(!shapes[k]){const out=[];for(let i=0;i<64;i++){const t=i*TAU/64,u=(i+1)*TAU/64;tri(out,V(0,0,0),V(Math.sin(t)*.5,0,Math.cos(t)*.5),V(Math.sin(u)*.5,0,Math.cos(u)*.5),V(0,1,0));}shapes[k]=out;}city.put(k,'#d9ca9e',a.x,.04,a.z,a.rx*2,1,a.rz*2);city.put(k,'#699175',a.x,.12,a.z,a.rx*1.92,1,a.rz*1.95);}
function street(x,z,w,l){city.box('#4f5c63',x,.137,z,w,.04,l);for(let y=z-l/2+4;y<z+l/2;y+=12)city.box('#e6dac0',x,.166,y,.13,.014,4);city.box('#b6b7a5',x-w/2,.18,z,.21,.05,l);city.box('#b6b7a5',x+w/2,.18,z,.21,.05,l);}
function airport(){const r=REGIONS[regionId],a=r.runway;city.box('#919b94',a.x,.025,a.z,a.w+18,.045,a.l+35);city.box('#434e59',a.x,.16,a.z,a.w,.08,a.l);for(let z=a.z-a.l/2+9;z<a.z+a.l/2;z+=21){city.box('#e9e9d6',a.x,.213,z,.7,.012,9);for(let s of [-1,1]){city.put('sphere','#c3e8ff',a.x+s*(a.w/2+1.2),.48,z,.4,.35,.4,0,0,0,1,true);}}for(let end of [-1,1])for(let x=-8;x<=8;x+=3)city.box('#f1e9d0',a.x+x,.215,a.z+end*(a.l/2-16),1.4,.012,16);
 for(let s of [-1,1])city.box('#eee7cf',a.x+s*(a.w/2-.5),.214,a.z,.19,.014,a.l-5);
 // Open-front hangar, apron and tower; the runway itself has no colliders.
 const x=a.x-51,z=a.z+25;city.box('#82928d',x,.18,z,58,.08,62);city.box('#678385',x,7,z+10,36,1.0,34);city.box('#486772',x-17,3.6,z+10,1,7,34);city.box('#486772',x+17,3.6,z+10,1,7,34);city.box('#45616c',x,3.6,z+26.5,35,7,1);collider(x-17,z+10,1,34,7,'hangar');collider(x+17,z+10,1,34,7,'hangar');collider(x,z+26.5,35,1,7,'hangar');pixelText('AIR CLUB',x-14,6.6,z-7.1,.38,'#e9d7aa');city.box('#f2b563',x,7.61,z-6.9,36,.2,.25);
 const tx=a.x-60,tz=a.z-60;city.box('#acb9ae',tx,6,tz,6,12,6);city.box('#325565',tx,13,tz,10,3,10);city.box('#c1ccc2',tx,14.6,tz,11,.24,11);city.put('cyl','#536774',tx,17,tz,.2,5,.2);city.put('sphere','#ee9d7a',tx,19.5,tz,.5,.5,.5,0,0,0,1,true);collider(tx,tz,10,10,15,'tower');
 const h=r.heli;city.put('disc','#3f5b60',h.x,.23,h.z,19,1,19);city.put('ring','#e1c88a',h.x,.255,h.z,16,16,16,0,PI/2,0);for(let dx of [-2,2])city.box('#f1e4b9',h.x+dx,.26,h.z,.8,.02,6);city.box('#f1e4b9',h.x,.26,h.z,4,.02,.8);
}
function harbor(){const r=REGIONS[regionId],d=r.pier;city.box('#baa98a',d.x-9,.23,d.z,34,.46,6);for(let x=d.x-25;x<d.x+8;x+=3){city.box('#dcc5a1',x,.48,d.z,.085,.02,6);for(let s of [-1,1]){city.put('cyl','#5d625b',x,0,d.z+s*2.5,.32,2,.32);city.put('cyl','#e2d4b1',x,.63,d.z+s*2.5,.46,.24,.46);}}
 const bx=d.x-30;city.box('#658c8a',bx,1.6,d.z-11,13,3.2,10);city.box('#d9c4a0',bx,3.3,d.z-11,14,.3,11);city.box('#243f50',bx,1.7,d.z-5.94,9,1.4,.08);pixelText('MARINA',bx-5.5,4.5,d.z-5.8,.24,'#e6b976');collider(bx,d.z-11,13,10,4,'marina');
 for(let i=0;i<5;i++){let x=d.x+30+i*32,z=d.z-75;city.put('cyl','#d9a064',x,.55,z,1.1,1.3,1.1);city.put('sphere','#f8e5b0',x,1.55,z,.5,.6,.5,0,0,0,1,true);} 
}
function settlement(x,z,c='#c7b79f'){const w=13,d=12,h=5;city.box(c,x,2.7,z,w,h,d);city.box('#324e5d',x,1.5,z+d/2+.04,2,2.7,.08);for(let s of [-1,1]){city.box('#436e7b',x+s*3.8,2.6,z+6.05,2.6,1.8,.10);city.box('#decfaa',x+s*3.8,3.65,z+6.3,3.2,.16,.6);}city.box('#d9c9ab',x,5.3,z,14,.3,13);city.box('#cb8b68',x,3.8,z+6.9,12,.2,2);collider(x,z,w,d,h+.5);buildings.push({x,z,w,d,h,c});}
function mapDecor(){const r=REGIONS[regionId];if(regionId==='coast'){
 city.box('#718a79',-474,-.18,0,1272,.10,2300);street(44,375,14,430);airport();harbor();for(let i=0;i<4;i++)mountain({x:-480+i*150,z:-520,rx:135,rz:135,h:70+i*15},'#809180',i);for(let z=190;z<550;z+=40){palm(85,z,8);palm(-105,z,7);} 
 }else if(regionId==='islands'){
 ovalGround(ISLANDS[0]);for(let i=1;i<ISLANDS.length;i++){ovalGround(ISLANDS[i]);mountain(ISLANDS[i],i%2?'#6d8d75':'#7a9279',i);}
 street(-80,115,12,385);street(0,162,10,400);city.box('#b0bba4',-40,.14,15,96,.035,11);for(const [x,z] of [[-107,-50],[-104,0],[-109,60],[-109,116],[-56,-45],[-48,52],[-49,99]])settlement(x,z,pick(['#d7c5a1','#cca996','#9ab4aa']));airport();harbor();for(let i=0;i<23;i++){const a=i*2.4,x=-40+Math.sin(a)*134,z=140+Math.cos(a)*247;if(Math.abs(x)<19)continue;palm(x,z,6+rand()*3);}for(let i=1;i<ISLANDS.length;i++){const a=ISLANDS[i];for(let j=0;j<6;j++){const t=j*TAU/6;palm(a.x+Math.cos(t)*a.rx*.81,a.z+Math.sin(t)*a.rz*.81,7);}}
 }else{
 city.box('#b8a484',-360,-.09,0,1370,.20,2300);street(44,370,15,700);street(-88,0,14,510);street(88,0,14,510);city.box('#555f66',0,.14,-88,550,.05,14);city.box('#555f66',0,.14,88,550,.05,14);city.box('#555f66',0,.14,0,550,.05,14);for(const x of [-110,-66,-22,22,66,110])for(const z of [-66,22,66]){if((x===-22&&z===22)||x===22)continue;settlement(x,z,pick(['#c39b7e','#bca489','#a69282']));}airport();harbor();for(let i=0;i<HIGHLANDS.length;i++)mountain(HIGHLANDS[i],i%2?'#a47f6b':'#b18f71',i);for(let i=0;i<30;i++){const x=-180-rand()*120,z=-350+rand()*800;city.put('cyl','#6c8469',x,1.5,z,.7,3,.7);city.beam('#6c8469',V(x,1.5,z),V(x+1.0,2.3,z),.38);}
 }
 // Visible 3D sign at the travel/garage hub, also usable as a landmark.
 const g=r.garage;city.box('#234d58',g.x,3.7,g.z-5,12,1.8,.24);pixelText('FRONTIERS',g.x-5.1,4.3,g.z-4.84,.20,'#efce93');for(let s of [-1,1])city.box('#45606a',g.x+s*5,1.8,g.z-5,.22,3.6,.22);
}
const originalV3World=buildWorld;
buildWorld=function(){setRegionPoints();city.reset();shadows.reset();city.records=[];shadows.records=[];city.capture=true;colliders.length=buildings.length=palms.length=0;seed=regionId==='coast'?12345:regionId==='islands'?62321:98342;waterPlane();if(regionId==='coast'){
 // Build the old town into the same builder, then append new areas.
 const upload=renderer.upload;renderer.upload=()=>null;try{originalV3World();}finally{renderer.upload=upload;}
 }mapDecor();buildHarborWorld6();collisionIndex.cells.clear();for(const b of colliders)collisionIndex.insert(b);return {static:renderer.upload(city),shadows:renderer.upload(shadows)};};
function releaseWorldGPU(meshes){if(!meshes||renderer.software)return;for(const batch of Object.values(meshes)){if(batch?.chunks)for(const c of batch.chunks)for(const key of ['buffer','lowBuffer']){if(c[key])renderer.gl.deleteBuffer(c[key].buffer);c[key]=null;}else if(batch?.buffer)renderer.gl.deleteBuffer(batch.buffer);}}
function rebuildRegion(){releaseWorldGPU(worldMeshes);worldMeshes=buildWorld();}
function flightRoute(){const r=REGIONS[regionId],a=r.airport;return [V(a.x,40,a.z-200),V(a.x+125,72,a.z-385),V(a.x+320,90,a.z-410),V(a.x+480,115,a.z-145),V(a.x+260,72,a.z+135),V(a.x,48,a.z+150)];}
function seaRoute(){const d=REGIONS[regionId].dock;return [V(d.x+75,0,d.z-70),V(d.x+200,0,d.z-170),V(d.x+345,0,d.z-100),V(d.x+340,0,d.z+135),V(d.x+115,0,d.z+180),V(d.x+25,0,d.z+35)];}
