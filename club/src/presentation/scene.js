import {V,add,sub,mul,length,right,TAU,PI} from '../core/math.js';
import {trackAt as clubTrackAt} from '../core/track.js';
import {LEVELS} from '../games/catalog.js';
import {SceneDraft} from './geometry.js';

// Retains the authored venue layout; emits no engine objects and changes no gameplay state.
export function buildScene(session){
 const b=new SceneDraft(),CLUB={decor:b.models};let seed=session.worldSeed;
 const clubRandom=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const clubMesh=(draft,id,pos,yaw=0,opts={})=>draft.model(id,pos,yaw,opts);
function clubTree(b,x,z,size=1,pine=false){
 if(!pine){CLUB.decor.push({id:'club-canopy-tree',pos:V(x,0,z),yaw:clubRandom()*TAU,scale:size});return;}
 b.put('cyl','#857757',x,2.3*size,z,.33*size,4.6*size,.33*size);
 if(pine){for(let i=0;i<3;i++)b.put('cone',['#59765b','#668361','#79916c'][i],x,(3.3+i*1.2)*size,z,(4-i*.8)*size,3.4*size,(4-i*.8)*size);}
 else{for(let i=0;i<5;i++){const t=i*2.4;b.put('sphere',i%2?'#7a9361':'#66825c',x+Math.cos(t)*1.35*size,(4.7+i%2*.7)*size,z+Math.sin(t)*1.35*size,3.2*size,2.8*size,3.2*size);}}
}
function clubLamp(b,x,z,h=5){b.put('cyl','#527578',x,h/2,z,.11,h,.11);b.box('#748983',x+.65,h,z,1.5,.14,.30);b.box('#faecc8',x+.65,h-.09,z,1.22,.035,.20,0,0,0,1,true);}
function clubBench(b,x,z,yaw=0){b.transform(V(x,0,z),yaw);for(const xx of [-.8,.8]){b.box('#405e60',xx,.33,0,.07,.66,.52);b.box('#405e60',xx,.92,.24,.07,1,.07);}for(let i=0;i<4;i++){b.box('#b9a57a',0,.65,-.27+i*.16,2,.06,.12);b.box('#baa983',0,.98+i*.14,.25,2,.10,.05);}b.world();}
function clubRoadSegment(b,a,c,width,color){const dv=sub(c,a),p=mul(add(a,c),.5),len=length(dv);b.box(color,p.x,p.y+(width<.3?-.02:.01),p.z,width,width<.3?.004:width<.8?.05:.13,len+.12,Math.atan2(dv.x,dv.z),-Math.atan2(dv.y,Math.hypot(dv.x,dv.z)));}
function clubBuildRaceWorld(b,track,level){
 const forest=level.theme==='forest',canyon=level.theme==='canyon',dock=level.theme==='dock',coastal=!forest&&!canyon,shore=-level.rx*(1+level.wave)-track.width/2-10;
 if(coastal){
  b.box(dock?'#a2aaa0':'#a4ae85',(350+shore)/2,-.46,0,350-shore,.8,700);
  b.box('#367d89',(-350+shore)/2,-.23,0,350+shore,.015,700);
  b.box('#d0c5a0',shore+2,-.06,0,4,.06,700);
 }else b.box(canyon?'#b4a17b':'#a4ae85',0,-.46,0,700,.8,700);
 const p=track.points,w=track.width;
 for(let i=0;i<track.n;i++){
  const a=p[i],c=p[i+1],dv=sub(c,a),yaw=Math.atan2(-dv.x,-dv.z),rt=right(yaw);clubRoadSegment(b,add(a,V(0,-.07,0)),add(c,V(0,-.07,0)),w+2.2,'#a9b4a5');clubRoadSegment(b,a,c,w,'#53656a');
  for(const side of [-1,1]){const aa=add(a,mul(rt,(w/2-.22)*side)),cc=add(c,mul(rt,(w/2-.22)*side));clubRoadSegment(b,add(aa,V(0,.095,0)),add(cc,V(0,.095,0)),.15,'#e8e6cd');if(i%2===0){clubRoadSegment(b,add(a,mul(rt,(w/2+.32)*side)),add(c,mul(rt,(w/2+.32)*side)),.52,i%4?'#e7dbc1':'#a47561');}
   if(i%3===0){const q=add(a,mul(rt,(w/2+1.2)*side));b.put('cyl','#708883',q.x,q.y+.45,q.z,.085,.9,.085);b.box('#829992',q.x,q.y+.76,q.z,.11,.24,length(dv)*3.15,yaw);}
  }
  if(i%4<2)clubRoadSegment(b,add(a,V(0,.10,0)),add(c,V(0,.10,0)),.11,'#c1c7b3');
  if(canyon&&i%6===0&&a.y>.55){b.box('#9c9d88',a.x,a.y/2-.05,a.z,w*.65,a.y,1.6,yaw);}
  if(i%15===0){const q=add(a,mul(rt,w/2+3));clubLamp(b,q.x,q.z);}
  if(i%2===0&&!dock){for(const side of [-1,1]){const q=add(a,mul(rt,side*(w/2+3+clubRandom()*4)));if(!coastal||q.x>shore+4)CLUB.decor.push({id:'club-meadow',pos:V(q.x,q.y,q.z),yaw:clubRandom()*TAU,scale:.8+clubRandom()*.8});}}
  if(i%5===0){for(const s of [-1,1]){const q=add(a,mul(rt,s*(w/2+10+clubRandom()*12)));if(coastal&&q.x<shore+4)continue;if(canyon){b.put('sphere',i%2?'#b5a181':'#c1ac8d',q.x,3,q.z,6+clubRandom()*7,8+clubRandom()*11,6,clubRandom()*6);b.put('sphere','#8c9170',q.x+4,.5,q.z+2,2.4,1.2,2.4);}else if(dock){if(i%10===0){CLUB.decor.push({id:'quay-container',pos:V(q.x,0,q.z),yaw,scale:.8});}}else clubTree(b,q.x,q.z,.8+clubRandom()*.45,forest);}}
 }
 const start=clubTrackAt(track,0);CLUB.decor.push({id:'club-race-gate',pos:start.pos,yaw:start.yaw,scale:[w/10,1,1]});
 for(let j=0;j<7;j++)for(let s=0;s<2;s++){const q=clubTrackAt(track,j*.6,(s?1:-1)*w*.23);b.transform(q.pos,q.yaw);b.box((j+s)%2?'#eee6d1':'#3c565c',0,.12,0,w*.46,.02,.58);b.world();}
 for(let i=0;i<10;i++){const t=i/10*TAU,rr=310;b.put('sphere',canyon?'#a79983':'#8a9f85',Math.sin(t)*rr,15,Math.cos(t)*rr,80,40+clubRandom()*35,95,clubRandom()*3);}
 // A compact pit pavilion gives the start a recognizable destination.
 const pit=clubTrackAt(track,track.length-16,-w/2-11);b.transform(pit.pos,pit.yaw);b.box('#d4c5a3',0,2.2,0,8,4.4,14);b.box('#536f71',0,4.4,0,8.4,.35,14.5);b.box('#4d7f86',4.03,2.4,0,.02,2.2,11);for(let j=-5;j<=5;j+=2.5)b.box('#e9dfc4',4.07,2.4,j,.07,2.4,.12);b.world();
}
function clubBuildRangeWorld(b,mode,level){
 const darts=mode==='darts',archery=mode==='archery';
 if(darts){
  b.box('#afa78e',0,-.13,-2,16,.2,19);for(let x=-8;x<8;x+=.32)b.box(x%2?'#bdb19a':'#b5a88e',x,-.018,-2,.30,.015,18);
  b.box('#536e68',0,2.2,-3.3,15,4.4,.22);b.box('#758b7f',-6.6,2.1,1,.23,4.2,9);b.box('#839689',6.6,2.1,1,.23,4.2,9);
  for(let x=-6.5;x<7;x+=.55)b.box('#a49778',x,1.0,-3.15,.06,2,.075);
  b.box('#b49d70',0,2.8,-3.13,15,.06,.06);b.box('#d5c5a1',0,4.13,0,14,.10,8);for(let x=-6;x<=6;x+=3){b.box('#5f7169',x,4.06,0,.14,.19,8);b.box('#f4d59e',x,3.94,-2.7,.85,.06,.18,0,0,0,1,true);}
  b.box('#e1c484',0,.015,.03,1,.015,.035);b.box('#688477',0,.00,.45,1.4,.01,.8);
  for(const x of [-3.4,3.4]){clubBench(b,x,1,PI);b.put('cyl','#52706c',x,.5,-.4,.1,1,.1);b.put('cyl','#b49d78',x,1.04,-.4,1.1,.065,1.1);clubMesh(b,'club-dartboard',V(x,1.73,-3.02),0,{scale:1});}
  // Board hangs clear of a fabric surround, with a small light above the face.
  b.put('cyl','#314e49',0,1.73,-2.485,.61,.065,.61,0,PI/2);b.box('#d7c09b',0,2.13,-2.5,.46,.055,.13);b.box('#ffdfa8',0,2.093,-2.46,.39,.015,.08,0,0,0,1,true);
  CLUB.decor.push({id:'club-dartboard',pos:V(0,1.73,-2.415),yaw:0});
 }else{
  b.box(archery?'#9ca97f':'#a4ad9a',0,-.25,-30,220,.4,250);
  b.box(archery?'#b2b295':'#a5aa9a',0,-.019,-28,18,.03,78);
  b.box('#c4b599',0,-.016,2,14,.04,8);for(let i=-7;i<7;i++)b.box('#d4c4a5',i,-.001,2,.018,.012,8);
  for(const x of [-7,7]){b.put('cyl','#7f8b71',x,1.5,2,.18,3,.18);b.put('cyl','#7f8b71',x,1.5,-2,.18,3,.18);b.box('#bfc5ab',x,3.12,0,.13,.18,4.5);}
  for(let x=-7;x<=7;x+=.5)b.box('#b8bfa2',x,3.16,0,.2,.09,4.5);
  for(let z=-5;z>=-65;z-=5){b.box('#dcdcc2',0,.006,z,15,.012,.075);for(const x of [-8.5,8.5]){b.put('cyl','#9aa58b',x,.4,z,.08,.8,.08);b.box('#7c9380',x,.81,z,1.1,.27,.045);}}
  for(const side of [-1,1])for(let z=4;z>-74;z-=5){b.put('cyl','#798b79',side*11,1,z,.13,2,.13);b.box('#879987',side*11,1.25,z,.08,.12,5.1);b.box('#94a38b',side*11,.7,z,.08,.12,5.1);}
  for(let i=0;i<38;i++){const s=i%2?1:-1,x=s*(15+clubRandom()*24),z=9-clubRandom()*92;clubTree(b,x,z,.85+clubRandom()*.55,archery&&i%3===0);}
  for(let i=0;i<120;i++){const side=i%2?1:-1,x=side*(8.7+clubRandom()*7),z=4-clubRandom()*78;CLUB.decor.push({id:'club-meadow',pos:V(x,0,z),yaw:clubRandom()*TAU,scale:.8+clubRandom()*.9});}
  for(let i=0;i<90;i++){const x=(clubRandom()-.5)*18,z=2-clubRandom()*72;b.put('sphere',i%3?'#a9ab92':'#c3bd9b',x,.017,z,.035+clubRandom()*.10,.025,.05,clubRandom()*6);}
  b.put('sphere','#899772',0,4,-85,100,13,24);for(let i=0;i<10;i++)b.put('sphere','#8f9e80',(i-5)*28,7,-112,47,19+clubRandom()*23,38);
  if(!archery){b.box('#7e9186',0,2.5,-56,25,5,.8);for(let x=-12;x<=12;x+=1.4)b.box('#92a293',x,2.5,-55.55,.55,4.9,.16);for(const z of [-12,-26,-40])for(const side of [-1,1]){CLUB.decor.push({id:'oak-crate',pos:V(side*9,.03,z),yaw:clubRandom()*.6});}clubBench(b,-4,3,0);}
  else{clubBench(b,-4.8,3,0);b.put('cyl','#a5ac8d',5.8,1,-3,.07,2,.07);b.box('#debe80',6.2,1.9,-3,.9,.30,.04);}
 }
}

 const level=LEVELS[session.mode][session.level];
 if(session.mode==='race'){
  clubBuildRaceWorld(b,session.track,level);
  for(let i=1;i<12;i++){const q=clubTrackAt(session.track,i*session.track.length/12,session.track.width/2+1.8);b.label(String(i).padStart(2,'0')+'  /  APEX',add(q.pos,V(0,1.6,0)),1.8,.46,q.yaw);}
 }else{
  clubBuildRangeWorld(b,session.mode,level);
  if(session.mode==='darts'){
   b.label('FLIGHT  /  SOCIAL CLUB',V(0,3.08,-3.015),3.4,.36);
   b.label('THE OCHÉ  /  2.37 M',V(2.7,2.55,-3.015),1.8,.22);
   b.label('20  ·  5  ·  12  ·  9',V(-2.7,2.55,-3.015),1.8,.22);
  }else{
   for(let z=-5;z>=-65;z-=5)for(const x of [-8.5,8.5])b.label(-z+' M',V(x,.81,z+.028),1.03,.24);
   b.label(session.mode==='archery'?'WINDSONG  /  FIELD 01':'PRECISION  /  RANGE 01',V(0,3.12,-2.28),4.2,.22);
  }
 }
 return {...b.finish(),mode:session.mode,level:session.level,theme:level.theme||session.mode};
}
