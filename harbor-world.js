/* Hand-authored harbor encounter. One layout serves driving, water and air approaches.
   Static collision, navigation and walkable surfaces use the same coordinates. */
const HARBOR6={
 min:V(65,0,184),max:V(161,0,365),base:V(94,.24,345),roadStart:V(101,.24,337),
 port:V(116,.24,261),terminal:V(111,.24,254),cargo:V(124,.24,241),
 heliStart:V(76,.24,344),heliPort:V(80,.24,205),landExit:V(102,.24,340),
 piers:[{x:179,z:345,boat:V(187,-.18,345),name:'BASE DOCK'},{x:179,z:236,boat:V(187,-.18,236),name:'NORTH QUAY'}],
 obstacles:[],floor:[],built:false,actorIds:[],lamps:[]
};
function inHarbor6(p,margin=0){return regionId==='coast'&&p.x>65-margin&&p.x<192+margin&&p.z>185-margin&&p.z<365+margin;}
function harborPier6(p){return regionId==='coast'&&HARBOR6.piers.some(d=>Math.abs(p.z-d.z)<3.35&&p.x>145&&p.x<183);}
function portHeight6(p){
 let y=.24;
 if(p.x>91&&p.x<98&&p.z>232&&p.z<258)y=.24+(258-p.z)/26*3.96;
 if(p.x>98&&p.x<107&&p.z>223&&p.z<239&&(p.y||0)>3.5)y=4.2;
 return y;
}
function harborBlock6(x,y,z,w,h,d,c,solid=true,visible=true,surface='concrete'){
 if(visible)city.box(c,x,y+h/2,z,w,h,d);
 if(solid){const b={minx:x-w/2,maxx:x+w/2,minz:z-d/2,maxz:z+d/2,miny:y,h:y+h,maxy:y+h,kind:'harbor',pos:V(x,y,z),w,d,height:h,color:c,surface};colliders.push(b);HARBOR6.obstacles.push(b);}
}
function harborContainer6(x,z,c,rot=0){
 const w=rot?10.8:4.9,d=rot?4.9:10.8;
 if(placeWorkshop7('quay-container',x,.24,z,rot?PI/2:0,[.987,1,.98],c)){
  harborBlock6(x,.24,z,w,2.72,d,c,true,false,'metal');return;
 }
 harborBlock6(x,.24,z,w,2.72,d,c,true,true,'metal');
 for(let i=-4;i<=4;i++){
  if(rot){city.box('#263f49',x+i*1.05,1.55,z+d/2+.035,.045,2.38,.06);city.box('#d9c9a0',x+i*1.05,.34,z+d/2+.05,.42,.075,.03);}
  else{city.box('#263f49',x+w/2+.035,1.55,z+i*1.05,.06,2.38,.045);city.box('#b1bba9',x-w/2-.035,1.55,z+i*1.05,.06,2.38,.045);}
 }
 city.box('#d0c9ae',x,2.99,z,w+.05,.07,d+.05);
 for(const s of [-1,1])city.box('#c2c6b7',x+s*w*.25,1.45,z+d/2+.065,.045,2.4,.04);
}
function harborCrate6(x,z,w=1.5){
 if(placeWorkshop7('oak-crate',x,.24,z,0,[w/1.60,1.02,w/1.60])){
  harborBlock6(x,.24,z,w,1.05,w,'#b79865',true,false,'wood');return;
 }
 harborBlock6(x,.24,z,w,1.05,w,'#b79865',true,true,'wood');
 for(const s of [-1,1]){city.box('#694f35',x+s*w*.33,.78,z+w/2+.01,.08,1.03,.04);city.box('#695239',x+s*w*.33,.78,z-w/2-.01,.08,1.03,.04);}
 city.box('#e3d3a7',x,1.305,z,w*.90,.06,.12);
}
function harborLamp6(x,z){
 if(placeWorkshop7('quay-lamp',x,.24,z,0,.94)){
  HARBOR6.lamps.push(V(x+1.48,6.7,z));return;
 }
 city.put('cyl','#35515d',x,3.6,z,.13,6.72,.13);city.beam('#416472',V(x,6.9,z),V(x+1.8,6.9,z),.12);
 softBox(city,'#d6c6a2',x+1.6,6.85,z,1.15,.15,.5);city.box('#ffe7ab',x+1.6,6.755,z,.96,.025,.39,0,0,0,1,true);
 HARBOR6.lamps.push(V(x+1.6,6.8,z));
}
function drawHelipad6(x,z,r=8){
 city.put('disc','#536d70',x,.251,z,r*2,1,r*2);
 city.put('ring','#decea2',x,.27,z,r*1.83,r*1.83,r*1.83,0,PI/2,0,1,true);
 city.box('#dce0c1',x-1.5,.281,z,.45,.02,4.8);city.box('#dce0c1',x+1.5,.281,z,.45,.02,4.8);city.box('#dce0c1',x,.281,z,3.0,.02,.45);
 for(let i=0;i<8;i++){const a=i*TAU/8;city.put('sphere','#d6efd0',x+Math.cos(a)*r,.43,z+Math.sin(a)*r,.18,.16,.18,0,0,0,1,true);}
}
function buildHarborWorld6(){
 WORKSHOP7.placements.length=0;
 HARBOR6.obstacles=[];HARBOR6.floor=[];HARBOR6.lamps=[];HARBOR6.built=false;
 if(regionId!=='coast')return;HARBOR6.built=true;city.world();
 // Continuous road and service apron, not a separate mini-game arena.
 city.box('#5c6b6b',112,.11,276,94,.22,184);
 city.box('#35474f',102,.232,265,11,.024,206);
 for(let z=167;z<369;z+=8){city.box('#cebb91',102,.249,z,.16,.014,3.2);city.box('#a3a899',94.9,.251,z,.13,.014,7.8);city.box('#a3a899',109.1,.251,z,.13,.014,7.8);}
 for(let z=192;z<365;z+=12)city.box('#80908a',137,.239,z,42,.014,.04);
 for(let x=115;x<162;x+=9)city.box('#87948c',x,.239,275,.04,.014,176);
 // Quay edge, bollards, tires, access piers.
 harborBlock6(159.5,-.65,276,4,.84,177,'#849b99',false);
 for(let z=190;z<365;z+=11){placeWorkshop7('mooring-bollard',160,.24,z);city.put('ring','#263b43',161.8,-.06,z,1.1,1.1,1.1,0,0,0);}
 for(const dock of HARBOR6.piers){
  city.box('#b5a888',164,.32,dock.z,38,.26,6.5);
  for(let x=147;x<183;x+=1.2)city.box('#91856c',x,.457,dock.z,.032,.015,6.3);
  for(let x=148;x<184;x+=7)for(const s of [-1,1])city.put('cyl','#64766e',x,-.7,dock.z+s*2.7,.23,2.65,.23);
  for(const s of [-1,1]){city.put('cyl','#d5c4a0',178,.88,dock.z+s*2.7,.18,.88,.18);city.put('sphere','#91e1d0',178,1.34,dock.z+s*2.7,.23,.20,.23,0,0,0,1,true);}
 }
 // Warehouse: split walls create a real open south doorway and west side entrance.
 harborBlock6(124,.24,226,29,7.1,.36,'#7eaaa8');
 harborBlock6(138.3,.24,243,.36,7.1,34,'#668f92');
 harborBlock6(109.6,.24,232,.36,7.1,12,'#83aaa5');harborBlock6(109.6,.24,254,.36,7.1,12,'#729797');
 harborBlock6(114,.24,260,9,7.1,.36,'#91b1a8');harborBlock6(135,.24,260,7,7.1,.36,'#83a69e');
 harborBlock6(125,.24+5.7,260,13,1.4,.36,'#4a6c70');
 // Roof beams and alternating skylights. Solids have their actual vertical intervals.
 for(let z=228;z<260;z+=7){harborBlock6(124,7.3,z,30,.23,.25,'#4a6870');}
 for(const x of [112.5,120,128,136])harborBlock6(x,7.57,243,5.9,.15,35,'#77918d');
 for(let z=230;z<257;z+=9){city.box('#c1d5c6',124,6.92,z,2.8,.055,.35,0,0,0,1,true);}
 for(const x of [110,138])for(const z of [226.5,243,259.5])harborBlock6(x,.24,z,.36,7,.36,'#3c5d66');
 city.box('#183944',124,6.66,260.3,17,1.0,.15);pixelText('NORTH QUAY',117.0,7.0,260.40,.21,'#e8ddba');
 for(const [x,z]of [[115,229],[120,229],[133,229],[133,234],[115,236],[115,237.7]])harborCrate6(x,z,1.7);
 // Raised observation catwalk and physically sampled ramp.
 harborBlock6(102,3.94,231,9,.26,16,'#536e77');
 HARBOR6.floor.push({minx:98,maxx:106.5,minz:223,maxz:239,y:4.2});
 surface(city,'#677e80',[[91,.24,258],[98,.24,258],[98,4.2,232],[91,4.2,232]]);
 for(let z=234;z<260;z+=2){const y=.24+(258-z)/26*3.96;city.box('#adac8f',94.5,y+.03,z,7,.035,.10);}
 for(const x of [91,98]){city.beam('#b7c4b4',V(x,1.2,258),V(x,5.16,232),.055);for(let z=232;z<=258;z+=4){const y=.24+(258-z)/26*3.96;city.beam('#7c928d',V(x,y,z),V(x,y+.93,z),.065);}}
 for(const z of [223,239]){city.beam('#aec1b5',V(98,5.16,z),V(106.5,5.16,z),.065);for(let x=99;x<107;x+=2)city.beam('#809891',V(x,4.2,z),V(x,5.16,z),.07);}
 // Lanes, flanking opportunities and waist-high cover.
 for(const [x,z,c,r]of [[139,282,'#b37952',0],[151,273,'#426f7c',0],[128,302,'#667e77',1],[145,311,'#bd995f',1],[117,282,'#527d84',0],[149,219,'#9e725c',1]])harborContainer6(x,z,c,r);
 for(const [x,z]of [[111,287],[130,273],[144,296],[122,293],[116,268]])harborCrate6(x,z);
 harborBlock6(85,.24,279,16,.95,1.0,'#a9b5a6',true,false);harborBlock6(84,.24,260,7,.95,1,'#a9b5a6',true,false);
 for(const x of [79,83,87,91])placeWorkshop7('quay-barrier',x,.24,279,PI/2);
 placeWorkshop7('quay-barrier',84,.24,260,PI/2,[1,1,1.75]);
 for(const x of [70,154])for(const z of [197,231,267,306,355])harborLamp6(x,z);
 // Crane, hoist and dock machinery have readable silhouettes at long range.
 for(const x of [145,154])harborBlock6(x,.24,256,.65,22,.7,'#cc9e50');
 harborBlock6(149.5,19.8,256,11,.9,1,'#dbb365');harborBlock6(158,21.9,256,32,.65,.65,'#d8b567');
 for(let x=143;x<174;x+=3){city.beam('#976e3e',V(x,20.4,256),V(x+2.8,22.3,256),.10);}
 city.beam('#223f49',V(168,21.8,256),V(168,5,256),.055);city.put('ring','#414f50',168,4.6,256,.65,.65,.65);
 softBox(city,'#bf985e',150,18.7,256,3.6,2.5,3.3);city.box('#315463',150,19.3,257.69,3,.85,.04);
 // Base, mission board, dedicated helipads.
 drawHelipad6(76,344,8);drawHelipad6(80,205,8);
 harborBlock6(122,.24,357,19,3.5,.3,'#41656c');harborBlock6(122,3.7,350,19,.25,15,'#637f7e');
 for(const x of [113,131])harborBlock6(x,.24,344,.16,3.46,.16,'#5c8181');
 city.box('#1b3e49',121,2.4,357.18,13,1,.16);pixelText('HARBOR OPS',115.2,2.82,357.28,.19,'#d8dab2');
 for(let x=113;x<132;x+=6)harborCrate6(x,352,1.3);
 // Relay and recoverable package are dynamic and respond to mission state.
 harborBlock6(110.3,.24,254,.7,1.5,.5,'#264c57',true,false);
 placeWorkshop7('relay-terminal',110.3,.24,254);
 // Equipment lives against storage edges, clear of the road, warehouse doors and piers.
 placeWorkshop7('dock-forklift',144,.24,233,PI/2);
 harborBlock6(143.485,.24,233,4.35,3.1,1.8,'#d79048',true,false);
 for(const [x,z]of [[135,229],[136,231],[130,355],[133,355]]){
  placeWorkshop7('fuel-drum',x,.24,z,0,1,'#ae7749');
  harborBlock6(x,.24,z,.67,.94,.67,'#ae7749',true,false);
 }
 for(const [x,z]of [[135,235],[137,237],[129,352]])placeWorkshop7('dock-pallet',x,.24,z,PI/2);
 for(let z=315;z<340;z+=8){city.box('#daca92',113,.26,z,6,.03,.15);city.box('#daca92',110,.26,z+3,.15,.03,6);}
 city.world();
}
function spawnHarborVehicles6(){
 if(regionId!=='coast')return;
 const defs=[['sport',HARBOR6.roadStart,0],['jeep',V(115,.24,336),0],['heli',HARBOR6.heliStart,0],['speedboat',HARBOR6.piers[0].boat,0]];
 for(const [kind,p,yaw]of defs){let c=cars.find(x=>x.harborKind===kind);if(!c){c=makeFleetVehicle(kind,{...p},yaw);c.harborKind=kind;c.id='harbor-'+kind;c.home={...p};c.homeYaw=yaw;}}
}
function drawHarborDynamic6(b,ef,t){
 if(regionId!=='coast')return;const m=experience.mission,p=HARBOR6.terminal;
 const unlocked=experience.progress.portUnlocked;
 if(!m||!m.carrying){const q=HARBOR6.cargo;if(isActorVisible(q,3))drawWorkshop7(b,'mission-case',q,0);}
 if(m?.carrying&&!state.car){b.transform(player.pos,player.yaw);softBox(b,'#ba9f70',0,1.22,.35,.49,.61,.26);b.box('#7edaab',0,1.29,.49,.18,.16,.02,0,0,0,1,true);b.world();}
 if(unlocked){for(const q of [HARBOR6.port,HARBOR6.base])if(isActorVisible(q,8)){b.put('ring','#96e4c1',q.x,.28,q.z,5,5,5,0,PI/2,0,.72,true);}}
 if(m){const q=harborTarget6();if(q){const y=waterAt(q)?0:ground(q);b.put('cone','#abdcd1',q.x,y+3.7+Math.sin(t*2)*.16,q.z,.55,.8,.55,0,PI,0,1,true);ef.put('ring','#a9e4cf',q.x,y+.06,q.z,3.4,3.4,3.4,0,PI/2,0,.65,true);}}
}
