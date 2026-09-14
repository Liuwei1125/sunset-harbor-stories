const colliders=[],buildings=[],palms=[];
const city=new Builder(4000000),shadows=new Builder(160000);
const roadCenters=[-132,-88,-44,0,44,88,132];
const cityPalette=['#d8b4a1','#e6c8ae','#b0bec1','#bfaaa4','#8ba4aa','#c4b1bd','#d4c6ac'];
let leaf=[];tri(leaf,V(),V(1.25,.4,.65),V(3.8,-1.1,0));tri(leaf,V(),V(3.8,-1.1,0),V(1.25,.4,-.65));tri(leaf,V(),V(1.25,.65,0),V(1.25,.4,.65));tri(leaf,V(1.25,.65,0),V(3.8,-1.1,0),V(1.25,.4,.65));shapes.leaf=leaf;
const letters={A:['01110','10001','10001','11111','10001','10001','10001'],B:['11110','10001','10001','11110','10001','10001','11110'],C:['01111','10000','10000','10000','10000','10000','01111'],D:['11110','10001','10001','10001','10001','10001','11110'],E:['11111','10000','10000','11110','10000','10000','11111'],F:['11111','10000','10000','11110','10000','10000','10000'],G:['01111','10000','10000','10111','10001','10001','01111'],H:['10001','10001','10001','11111','10001','10001','10001'],I:['111','010','010','010','010','010','111'],L:['10000','10000','10000','10000','10000','10000','11111'],M:['10001','11011','10101','10101','10001','10001','10001'],N:['10001','11001','11001','10101','10011','10011','10001'],O:['01110','10001','10001','10001','10001','10001','01110'],P:['11110','10001','10001','11110','10000','10000','10000'],R:['11110','10001','10001','11110','10100','10010','10001'],S:['01111','10000','10000','01110','00001','00001','11110'],T:['11111','00100','00100','00100','00100','00100','00100'],U:['10001','10001','10001','10001','10001','10001','01110'],V:['10001','10001','10001','10001','10001','01010','00100'],W:['10001','10001','10001','10101','10101','10101','01010'],Y:['10001','10001','01010','00100','00100','00100','00100']};
function pixelText(text,x,y,z,size,c){let dx=0;for(let ch of text){const glyph=letters[ch];if(glyph){for(let r=0;r<7;r++)for(let k=0;k<glyph[r].length;k++)if(glyph[r][k]==='1')city.box(c,x+dx+k*size,y-r*size,z,size*.85,size*.85,.06,0,0,0,1,true);dx+=(glyph[0].length+1)*size;}else dx+=size*3;}}
function collider(x,z,w,d,h,kind='building'){colliders.push({minx:x-w/2,maxx:x+w/2,minz:z-d/2,maxz:z+d/2,h,kind});}
function palmBasic(x,z,h=6){palms.push({x,z});city.put('cyl','#997653',x,h/2,z,.43,h,.43,0,0,.055);for(let i=0;i<5;i++)city.put('cyl','#b39671',x+.1,h*(i+1)/6,z,.46,.15,.46);for(let i=0;i<7;i++)city.put('leaf',i%2?'#477a68':'#678e64',x+.2,h,z,1,1,1,i/7*TAU+.2);city.put('ball','#a77c45',x+.35,h-.1,z,.55,.65,.6);shadows.put('disc','#101d28',x+1.4,.185,z-1,5.5,1,4.6,0,0,0,.17);}
function benchBasic(x,z,yaw=0){city.transform(V(x,.16,z),yaw);city.box('#a37855',0,.6,0,2.5,.13,.65);city.box('#b28660',0,1.07,.28,2.5,.6,.12);for(let s of [-.9,.9])city.box('#384853',s,.3,0,.12,.6,.6);city.world();}
function lamp(x,z,side=1){city.put('cyl','#53626a',x,3.35,z,.15,6.7,.15);city.box('#445660',x-side*.8,6.55,z,1.7,.12,.12);city.box('#ffdeb0',x-side*1.5,6.45,z,.75,.12,.42,0,0,0,1,true);city.put('cyl','#c8b5a0',x,.29,z,.43,.58,.43);}
function block(x,z,index){
 city.box('#b4b7af',x,.015,z,31,.28,31);city.box('#c4c3b6',x,.16,z,30.4,.06,30.4);
 if((x===22&&z===22)||(x===-66&&z===66)){
  city.box('#668875',x,.24,z,26,.15,26);city.box('#d4c8a8',x,.34,z,3,.08,27);city.box('#d4c8a8',x,.34,z,27,.08,3);city.put('cyl','#c4d1c4',x,.56,z,7.5,.5,7.5);city.put('cyl','#58b5b5',x,.83,z,6.8,.07,6.8);city.put('cyl','#cfded3',x,1.18,z,2.0,.76,2);city.put('ball','#a8e5dd',x,1.9,z,1.7,1.5,1.7,0,0,0,.85);collider(x,z,7,7,2,'fountain');for(let [dx,dz] of [[-10,-10],[10,-10],[10,10],[-10,10]])palm(x+dx,z+dz,5.3+rand()*2);bench(x-6,z+4);bench(x+6,z-4,PI);return;
 }
 if(x===-22&&z===22){
  city.box('#78838a',x,.2,z,27,.09,27);city.box('#d7cdc0',x,4.5,z-3,24,.55,17);city.box('#368e91',x,4.83,z-3,24.2,.15,17.2);for(let dx of [-10,10])for(let dz of [-9,3]){city.box('#c7bbb0',x+dx,2.3,z+dz,.6,4.6,.6);collider(x+dx,z+dz,.6,.6,4.6,'post');}for(let dx of [-5,5]){city.box('#d66f52',x+dx,.9,z-3,1.6,1.8,.8);city.box('#ced7ce',x+dx,1.1,z-2.54,1.3,.8,.1);city.box('#263a40',x+dx,1.3,z-2.47,.8,.35,.08);}city.box('#364950',x,5.5,z+5.66,11,1.2,.25);pixelText('GAS',x-2.5,5.91,z+5.82,.24,'#ffd898');palm(x-12,z+12,6);return;
 }
 let w=20+rand()*5,d=19+rand()*5,h=7+rand()*18;
 if(index%7===0)h+=15;
 if(x===-22&&z===-22){w=26;d=21;h=8.8;}
 if(x===22&&z===-22){w=22;d=23;h=20;}
 let c=pick(cityPalette);if(x===-22&&z===-22)c='#d68f79';if(x===22&&z===-22)c='#cfbba0';
 city.box(c,x,h/2+.25,z,w,h,d);city.box('#dfd1bc',x,h+.36,z,w+.5,.3,d+.5);city.box('#627581',x,h+.7,z,4,.8,3);city.box('#919d9e',x+4,h+1.05,z-4,2.6,1.4,2.4);collider(x,z,w,d,h+.65);buildings.push({x,z,w,d,h,c});
 const floors=Math.max(1,Math.floor((h-2)/3));
 for(let f=0;f<floors;f++){let y=2.3+f*3.1;for(let px=-w/2+2;px<w/2-1;px+=3.3){let wc=(rand()>.65)?'#e7c98f':'#4d6b78';city.box(wc,x+px,y,z+d/2+.045,1.5,1.65,.075);city.box('#78949c',x+px,y,z-d/2-.045,1.5,1.65,.075);}for(let pz=-d/2+2;pz<d/2-1;pz+=3.5){city.box('#65818a',x+w/2+.045,y,z+pz,.075,1.65,1.65);city.box('#4d6976',x-w/2-.045,y,z+pz,.075,1.65,1.65);}}
 city.box('#3d555d',x,1.42,z+d/2+.09,3,2.7,.13);city.box('#89a6a3',x,1.42,z+d/2+.17,.08,2.4,.04);
 if(h<15){city.box(index%2?'#4f9390':'#d8a96f',x,3.45,z+d/2+.82,w*.91,.2,1.8,.0,.11);for(let dx=-w/2+1;dx<w/2;dx+=3)city.box('#efe0bd',x+dx,3.45,z+d/2+.82,.8,.23,1.8,0,.11);}
 shadows.put('disc','#15212b',x+h*.26,.19,z-h*.14,w+h*.47,1,d+h*.25,0,0,0,.18);
 if(index%3===0){palm(x-w/2-1.6,z+d/2+1.4,5.5+rand()*1.8);bench(x+w/2+1,z+d/2-2,PI/2);}
 if(x===-22&&z===-22){city.box('#293e4c',x,11.5,z+9.3,24,4.1,.5);city.box('#77d4c8',x,13.57,z+9.56,24,.09,.09,0,0,0,1,true);pixelText('SUNSET',x-10.15,12.75,z+9.59,.54,'#ffd184');city.box('#384c57',x-8,9.9,z+9.2,.25,4,.3);city.box('#384c57',x+8,9.9,z+9.2,.25,4,.3);}
 if(x===22&&z===-22){city.box('#416b70',x,5.2,z+11.65,20,2,.23);pixelText('PALMS',x-6.6,5.85,z+11.8,.36,'#ebdeba');for(let q of [-8,-4,0,4,8])city.box('#ead6b1',x+q,12,z+11.74,.32,14,.25);}
}
function buildWorld(){
 city.box('#444e5a',0,-.11,0,345,.2,345);
 city.box('#d1bb9b',166,-.09,0,11,.2,345);city.box('#c8c7b4',159,.04,0,8,.25,345);
 for(let z=-152;z<=150;z+=8){city.box('#414f57',162,1,z,.13,2,.13);if(z<150)city.box('#56696d',162,1.75,z+4,.1,.1,8);}
 for(let r of roadCenters){
  for(let p=-168;p<168;p+=8){if(roadCenters.some(c=>Math.abs(p-c)<9))continue;for(let s of [-.24,.24]){city.box('#d9bb77',r+s,.016,p,.1,.03,3.8);city.box('#d9bb77',p,.016,r+s,3.8,.03,.1);}city.box('#c9c6b4',r-5.9,.018,p,.12,.03,7.9);city.box('#c9c6b4',r+5.9,.018,p,.12,.03,7.9);city.box('#c9c6b4',p,.018,r-5.9,7.9,.03,.12);city.box('#c9c6b4',p,.018,r+5.9,7.9,.03,.12);}
  for(let s of roadCenters){for(let i=-4;i<=4;i+=1.6){city.box('#cfccc0',r+i,.02,s+8,.85,.03,2.8);city.box('#cfccc0',r+i,.02,s-8,.85,.03,2.8);city.box('#cfccc0',r+8,.02,s+i,2.8,.03,.85);city.box('#cfccc0',r-8,.02,s+i,2.8,.03,.85);}}
 }
 let idx=0;for(let x=-110;x<=110;x+=44)for(let z=-110;z<=110;z+=44)block(x,z,idx++);
 for(let z=-140;z<150;z+=22){lamp(7.5,z);lamp(-7.5,z,-1);palm(154,z,6+rand()*2);}
 for(let x=-132;x<=132;x+=44)for(let z=-132;z<=132;z+=44){if((x+z)%88!==0)continue;city.put('cyl','#48585c',x+7.1,2.5,z+7.1,.18,5,.18);city.box('#293b44',x+7.1,4.7,z+7.1,.6,1.6,.6);city.put('ball','#ffc85c',x+7.1,4.72,z+7.45,.34,.34,.1,0,0,0,1,true);}
 for(let i=0;i<16;i++){const x=-190+rand()*340,z=-194-rand()*35,h=20+rand()*70;city.box(pick(['#92a0b2','#a9a8b5','#a6b7ba']),x,h/2,z,12+rand()*20,h,14+rand()*20);}
 // Hills and an offshore skyline make the city read as a complete environment.
 for(let i=0;i<16;i++)city.put('cone','#9b9caa',-300+i*40,15,-325-rand()*50,60,45+rand()*50,65);
 buildStreetDetails();
 return {static:renderer.upload(city),shadows:renderer.upload(shadows)};
}
function drawCarBasic(b,car,t){
 const pos=car.pos;b.transform(V(pos.x,(pos.y||0)+.05,pos.z),car.yaw,car.pitch||0,car.roll||0);let c=car.hp<=0?'#424d55':car.color;
 b.box('#202c35',0,.48,0,2.05,.33,4.3);b.box(c,0,.82,0,2.04,.65,4.25);b.box(c,0,1.07,-1.25,1.98,.19,1.55);b.box(c,0,1.37,.24,1.73,.77,1.95);b.box('#263f4d',0,1.44,-.78,1.55,.52,.08,0,.20);b.box('#385564',0,1.44,1.24,1.5,.48,.08,0,-.18);for(let s of [-1,1]){b.box('#324b59',s*.88,1.44,.20,.055,.49,1.64);b.box(c,s*.92,1.13,.12,.05,.1,1.8);b.box(c,s*1.09,1.2,-.58,.26,.15,.38);b.box('#d2d5ce',s*.94,1.03,.68,.08,.05,.25);}
 b.box(c,0,1.80,.19,1.82,.13,1.84);b.box('#2b3b45',0,.53,-2.16,1.9,.19,.17);b.box('#c1c8c2',0,.57,2.17,1.9,.14,.12);b.box('#293c48',0,.81,-2.153,.7,.24,.03);
 for(let s of [-1,1]){b.box('#fff2c8',s*.7,.9,-2.145,.48,.21,.04,0,0,0,1,true);b.box(car.braking?'#ff7052':'#b54e48',s*.7,.96,2.145,.5,.17,.05,0,0,0,1,true);for(let z of [-1.32,1.37]){b.put('cyl','#19242d',s*1.00,.48,z,.86,.23,.86,0,0,PI/2);b.put('cyl','#bdc2ba',s*1.13,.48,z,.52,.026,.52,0,0,PI/2);b.box('#485560',s*1.15,.48,z,.02,.11,.44,0,car.wheel||0);b.box('#485560',s*1.16,.48,z,.02,.44,.09,0,car.wheel||0);}}
 if(car.sport){b.box('#d7dfd3',0,1.17,-1.33,.18,.035,1.2);b.box('#31434c',0,1.4,1.8,2.15,.14,.42);for(let s of [-.7,.7])b.box('#31434c',s,1.25,1.8,.1,.3,.1);}
 b.world();
}
function drawPersonBasic(b,p,yaw,phase,weaponIndex=0,ghost=false){
 b.transform(p,yaw);const jacket=ghost?'#a66e58':'#e6c9a3',pants=ghost?'#454b5c':'#263e49',skin='#bd8b68';
 b.box(jacket,0,1.22,0,.62,.67,.36);b.box('#b66241',0,1.28,-.19,.24,.48,.03);b.box('#26323d',0,.85,0,.62,.13,.37);b.box(skin,0,1.89,-.02,.38,.4,.36);b.box('#25343e',0,2.07,0,.41,.15,.39);b.box('#182c38',0,1.92,-.207,.37,.09,.028);b.box('#d0a278',0,1.62,0,.2,.17,.2);
 for(let side of [-1,1]){let swing=Math.sin(phase+(side>0?PI:0))*.62,hip=V(side*.18,.84,0),knee=V(side*.18,.45,Math.sin(swing)*.28),ankle=V(side*.18,.12,Math.sin(swing)*.48);b.beam(pants,hip,knee,.26);b.beam(pants,knee,ankle,.23);b.box('#e2ddd0',ankle.x,.10,ankle.z-.06,.29,.16,.45);}
 if(!ghost){b.beam(jacket,V(.35,1.47,0),V(.48,1.21,-.25),.24);b.beam(jacket,V(.48,1.21,-.25),V(.30,1.27,-.70),.20);b.beam(jacket,V(-.35,1.46,0),V(-.28,1.11,-.28),.24);b.beam(jacket,V(-.28,1.11,-.28),V(.2,1.22,-.62),.20);b.box(skin,.29,1.26,-.69,.2,.18,.20);let barrel=weaponIndex===0?.45:weaponIndex===1?.72:.99;b.box('#263741',.29,1.29,-.65-barrel/2,.15,.16,barrel);b.box('#172934',.29,1.16,-.73,.12,.25,.14,0,-.2);if(weaponIndex===2)b.box('#986c44',.29,1.24,-1.1,.19,.14,.39);if(weaponIndex===1)b.box('#263741',.29,1.05,-.9,.12,.3,.17);}else{for(let s of [-1,1])b.beam(jacket,V(s*.36,1.47,0),V(s*.4,.97,Math.sin(phase)*s*.17),.21);}
 b.box('#314851',0,1.27,.28,.44,.56,.2);b.world();
}
function drawDroneBasic(b,e,t){
 const p=V(e.pos.x,e.pos.y,e.pos.z);b.transform(p,e.yaw);const c=e.flash>0?'#fff0c8':e.aggressive?'#d67a54':'#ca975b';b.box(c,0,0,0,1.12,.64,.77);b.box('#2d414d',0,.03,-.42,.82,.35,.14);b.put('ball',e.aggressive?'#ff775e':'#81e5d3',0,.06,-.52,.28,.28,.16,0,0,0,1,true);b.box('#344b53',0,.4,.03,.57,.15,.5);b.box('#2e4049',0,-.48,.03,.49,.5,.42);for(let s of [-1,1]){b.beam('#53636c',V(s*.52,0,0),V(s*1.1,.07,.03),.15);b.put('cyl','#263c44',s*1.1,.16,.04,.57,.13,.57);b.box('#9eadad',s*1.1,.25,.04,.84,.035,.10,t*36*s);}b.world();
}
function drawCheckpoint(b,fx,p,t){
 const pulse=1+Math.sin(t*2)*.025;
 b.put('ring','#8cf1c8',p.x,3.15,p.z,6.0*pulse,6.0*pulse,6.0,0,0,0,1,true);fx.put('disc','#8cf1c8',p.x,.045,p.z,7,1,6,0,0,0,.12,true);b.put('cone','#aaffd8',p.x,7+Math.sin(t*2)*.3,p.z,1,1.3,1,0,PI,0,1,true);
}
