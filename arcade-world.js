/* Dedicated club environments. No player or pedestrian model is constructed. */
Object.assign(HARBOR_ASSET_PACK7.meshes,ARCADE_ASSET_PACK10.meshes);
Object.assign(WORKSHOP7.assets,ARCADE_ASSET_PACK10.assets);
const clubEquipmentBuilder=()=>renderer.software?new Builder(250000):new InstanceBuilder();
function clubMesh(b,id,p,yaw=0,opts={}){
 const asset=WORKSHOP7.assets[id];if(!asset)return;
 const sc=opts.scale||1,scale=Array.isArray(sc)?sc:[sc,sc,sc],rotation=opts.rotation||basis(yaw),root=bmul(rotation,[scale[0],0,0,0,scale[1],0,0,0,scale[2]]),parent=b.parent,origin=b.origin;
 const lod=renderer.software||RENDER.tier===0||dist2(p,cam.eye)>65?'low':'high';
 for(const part of workshopParts7(id,lod)){
  const joint=asset.joints[part.part]||{pivot:[0,0,0]},pivot=V(...joint.pivot);let turn=ID,offset=V();
  if(joint.motion==='steering')turn=basis(0,0,(opts.steer||0)*-.8);
  if(joint.motion==='gauge')turn=basis(0,0,(part.part==='speed-needle'?(opts.speed||0)/48:(opts.speed||0)%13/13)*-4.2+2.1);
  if(joint.motion==='bow-limb')turn=basis(0,(part.part==='upper-limb'?1:-1)*(opts.charge||0)*.13,0);
  if(joint.motion==='target-fold')turn=basis(0,(opts.fold||0)*-1.45,0);
  b.origin=add(p,bx(root,add(pivot,offset)));b.parent=bmul(root,turn);
  const c=part.role==='paint'?(opts.color||part.color):['status','club-target'].includes(part.role)&&opts.status?opts.status:part.color;
  b.put(part.name,c,0,0,0,1,1,1,0,0,0,opts.alpha??1,part.unlit);
 }
 if(id==='club-recurve'){
  b.origin=p;b.parent=root;const charge=opts.charge||0,pull=V(0,0,.06+charge*.38);
  b.beam('#e8e0c3',V(0,.69,.055+charge*.09),pull,.0028);b.beam('#e8e0c3',pull,V(0,-.69,.055+charge*.09),.0028);
 }
 b.parent=parent;b.origin=origin;
}
function clubDisposeWorld(){
 if(!worldMeshes||renderer.software)return;const g=renderer.gl;for(const batch of Object.values(worldMeshes)){if(batch?.chunks)for(const c of batch.chunks){if(c.buffer)g.deleteBuffer(c.buffer.buffer);if(c.lowBuffer)g.deleteBuffer(c.lowBuffer.buffer);}else if(batch?.buffer)g.deleteBuffer(batch.buffer);}
}
function clubStaticShape(b,c,p,size,yaw=0){b.box(c,p.x,p.y,p.z,...size,yaw);}
function clubTree(b,x,z,size=1,pine=false){
 if(!pine&&WORKSHOP7.assets['club-canopy-tree']){CLUB.decor.push({id:'club-canopy-tree',pos:V(x,0,z),yaw:clubRandom()*TAU,scale:size});return;}
 b.put('cyl','#857757',x,2.3*size,z,.33*size,4.6*size,.33*size);
 if(pine){for(let i=0;i<3;i++)b.put('cone',['#59765b','#668361','#79916c'][i],x,(3.3+i*1.2)*size,z,(4-i*.8)*size,3.4*size,(4-i*.8)*size);}
 else{for(let i=0;i<5;i++){const t=i*2.4;b.put('sphere',i%2?'#7a9361':'#66825c',x+Math.cos(t)*1.35*size,(4.7+i%2*.7)*size,z+Math.sin(t)*1.35*size,3.2*size,2.8*size,3.2*size);}}
}
function clubLamp(b,x,z,h=5){b.put('cyl','#527578',x,h/2,z,.11,h,.11);b.box('#748983',x+.65,h,z,1.5,.14,.30);b.box('#faecc8',x+.65,h-.09,z,1.22,.035,.20,0,0,0,1,true);}
function clubBench(b,x,z,yaw=0){b.transform(V(x,0,z),yaw);for(const xx of [-.8,.8]){b.box('#405e60',xx,.33,0,.07,.66,.52);b.box('#405e60',xx,.92,.24,.07,1,.07);}for(let i=0;i<4;i++){b.box('#b9a57a',0,.65,-.27+i*.16,2,.06,.12);b.box('#baa983',0,.98+i*.14,.25,2,.10,.05);}b.world();}
function clubTrack(level,variant=0){
 const points=[],n=200,phase=variant*.15;
 for(let i=0;i<=n;i++){const t=i/n*TAU,r=1+level.wave*Math.sin(3*t+phase)+level.wave*.3*Math.cos(5*t);points.push(V(Math.sin(t)*level.rx*r,level.theme==='canyon'?2.8*(1-Math.cos(2*t)):0,-Math.cos(t)*level.rz*r));}
 let total=0;for(let i=0;i<n;i++){points[i].s=total;total+=length(sub(points[i+1],points[i]));}points[n].s=total;
 const track={points,length:total,width:level.width,n};return track;
}
function clubTrackAt(track,s,lane=0){
 s=((s%track.length)+track.length)%track.length;const p=track.points;let lo=0,hi=track.n;
 while(lo+1<hi){const mid=(lo+hi)>>1;if(p[mid].s>s)hi=mid;else lo=mid;}
 const a=p[lo],b=p[lo+1],u=(s-a.s)/(b.s-a.s),dir=norm(sub(b,a)),yaw=Math.atan2(-dir.x,-dir.z),r=right(yaw);
 return {pos:add(V(mix(a.x,b.x,u),mix(a.y,b.y,u),mix(a.z,b.z,u)),mul(r,lane)),yaw,pitch:Math.atan2(dir.y,Math.hypot(dir.x,dir.z)),index:lo,s};
}
function clubTrackNearest(track,pos){
 let best={distance:Infinity};for(let i=0;i<track.n;i++){const a=track.points[i],b=track.points[i+1],dx=b.x-a.x,dz=b.z-a.z,u=clamp(((pos.x-a.x)*dx+(pos.z-a.z)*dz)/(dx*dx+dz*dz),0,1),p=V(a.x+dx*u,mix(a.y,b.y,u),a.z+dz*u),dist=dist2(pos,p);if(dist<best.distance){const yaw=Math.atan2(-dx,-dz);best={distance:dist,pos:p,yaw,pitch:Math.atan2(b.y-a.y,Math.hypot(dx,dz)),index:i,s:mix(a.s,b.s,u),side:dot(sub(pos,p),right(yaw))};}}return best;
}
function clubRoadSegment(b,a,c,width,color){const dv=sub(c,a),p=mul(add(a,c),.5),len=length(dv);b.box(color,p.x,p.y+.01,p.z,width,.13,len+.12,Math.atan2(dv.x,dv.z),-Math.atan2(dv.y,Math.hypot(dv.x,dv.z)));}
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
  if(!archery){b.box('#7e9186',0,2.5,-56,25,5,.8);for(let x=-12;x<=12;x+=1.4)b.box('#92a293',x,2.5,-55.55,.55,4.9,.16);for(const z of [-12,-26,-40])for(const side of [-1,1]){CLUB.decor.push({id:'supply-crate',pos:V(side*9,.03,z),yaw:clubRandom()*.6});}clubBench(b,-4,3,0);}
  else{clubBench(b,-4.8,3,0);b.put('cyl','#a5ac8d',5.8,1,-3,.07,2,.07);b.box('#debe80',6.2,1.9,-3,.9,.30,.04);}
 }
}
function clubBuildWorld(){
 clubDisposeWorld();CLUB.decor=[];const b=new Builder(800000);b.capture=!renderer.software;
 const level=CLUB_LEVELS[CLUB.mode][CLUB.level];CLUB.seed=clubHash(CLUB.mode+CLUB.level+(CLUB.playlist==='daily'?clubDate():''));
 if(CLUB.playlist==='daily')CLUB.dailyDate=clubDate();
 if(CLUB.mode==='race'){CLUB.track=clubTrack(level,CLUB.playlist==='daily'?(CLUB.seed%20):0);clubBuildRaceWorld(b,CLUB.track,level);regionId=level.theme==='canyon'?'canyon':'coast';}
 else{clubBuildRangeWorld(b,CLUB.mode,level);regionId='coast';}
 worldMeshes={static:renderer.upload(b),shadows:renderer.upload(new Builder(1))};clubEvent('world',{mode:CLUB.mode,level:CLUB.level,vertices:b.n/10,decor:CLUB.decor.length});
}
function clubEquipment(){
 const r=CLUB.run;if(!r||!['countdown','playing','paused','result'].includes(CLUB.phase))return;
 if(CLUB.mode==='race'){
  const c=r.car;clubMesh(dynamic,'club-cockpit',add(c.pos,V(0,.06,0)),c.yaw,{rotation:basis(c.yaw,c.pitch,c.roll),steer:c.steer,speed:c.speed,color:CLUB_SKINS[CLUB.save.settings.skin].color});return;
 }
 const aim=r.aim||0,bob=Math.sin(CLUB.time*1.8)*.0015,base=basis(CLUB.look.yaw,CLUB.look.pitch),p=add(cam.eye,bx(base,V(CLUB.mode==='shooting'?mix(.23,0,aim):CLUB.mode==='archery'?-.28:.20,-.20+bob,-.30)));
 if(CLUB.mode==='shooting'){
  const w=CLUB_WEAPONS[r.weapon],a=clamp(r.reload/w.reload,0,1),tilt=r.reload>0?Math.sin(a*PI):0;dynamic.origin=add(p,bx(base,V(0,-tilt*.12,(r.kick||0)*2.3)));dynamic.parent=bmul(base,basis(-tilt*.20,tilt*.55,tilt*.20));
  const sightHeight=r.weapon===0?.133:r.weapon===2?.265:.251;
  if(!(r.weapon===2&&aim>.85))weaponModel(dynamic,w.id,0,mix(-.03,.20-sightHeight,aim),-.15);dynamic.world();
  if(r.flash>0){const mu=add(cam.eye,bx(base,V(mix(.23,0,aim),-.15,-1.08)));fx.put('sphere','#fff0b3',mu.x,mu.y,mu.z,.05+r.flash*.55,.05+r.flash*.55,.08+r.flash*.8,0,0,0,.9,true);}
 }else if(CLUB.mode==='archery'){
  const root=add(cam.eye,bx(base,V(-.30,-.14,-1.05+(r.releaseAnim||0)*.035)));clubMesh(dynamic,'club-recurve',root,0,{rotation:base,scale:.85,charge:r.charge,color:CLUB_SKINS[CLUB.save.settings.skin].color});
  if(!r.projectile&&r.cooldown<.2)clubMesh(dynamic,'club-arrow',add(root,bx(base,V(.05,0,.04+r.charge*.22))),0,{rotation:base,scale:.85});
 }else if(!r.projectile&&r.cooldown<.3){clubMesh(dynamic,'club-dart',add(cam.eye,bx(base,V(.105,-.10,-.60+r.charge*.10))),0,{rotation:bmul(base,basis(.35,.15,.1)),scale:1.4,color:CLUB_SKINS[CLUB.save.settings.skin].color});}
}
function clubDrawScene(){
 dynamic.reset();fx.reset();for(const p of CLUB.decor){const distance=dist2(p.pos,cam.eye);if(distance<(p.id==='club-meadow'?RENDER.tier===0?24:65:RENDER.view+15))clubMesh(dynamic,p.id,p.pos,p.yaw,{scale:p.scale||1});}
 const r=CLUB.run;
 if(CLUB.mode==='race'){
  if(r){for(const a of r.rivals){if(dist2(a.pos,cam.eye)<190)drawWorkshop7(dynamic,'comet-sport',add(a.pos,V(0,.07,0)),a.yaw,{car:a,time:CLUB.time});}
   const next=clubTrackAt(CLUB.track,r.nextGate*CLUB.track.length/12);dynamic.transform(next.pos,next.yaw);for(const x of [-CLUB.track.width/2,CLUB.track.width/2]){dynamic.box('#e5d7a0',x,1.25,0,.11,2.5,.12);fx.box('#c5eaca',x,2.75,0,.35,.50,.15,0,0,0,1,true);}dynamic.world();fx.world();
   const gh=r.ghost;if(gh&&r.elapsed>1&&r.elapsed<gh[gh.length-1]?.[0]){const i=Math.min(gh.length-2,Math.floor(r.elapsed*10)),a=gh[i],c=gh[i+1];if(a&&c){const t=clamp((r.elapsed-a[0])/(c[0]-a[0]||1),0,1),p=V(mix(a[1],c[1],t),mix(a[2],c[2],t)+.16,mix(a[3],c[3],t));if(dist2(p,r.car.pos)>4)clubMesh(fx,'comet-sport',p,lerpAngle(a[4],c[4],t),{alpha:.20,color:'#aee8d2'});}}
   for(const s of r.skids){fx.beam('#293f44',s.a,s.b,.13,clamp(s.life/5,0,.5),true);}
  }
 }else if(CLUB.mode==='shooting'){
  const targets=r?.targets||[{x:0,y:0,z:-12,active:true,fold:0},{x:-3.5,y:0,z:-18,active:true,fold:0},{x:3.5,y:0,z:-20,active:true,fold:0}];
  for(const t of targets)clubMesh(dynamic,'club-shooting-target',V(t.x,t.y,t.z),0,{scale:t.scale||1,fold:t.fold||0,status:t.friend?'#74d4d4':t.active?'#ebbc71':'#526a66'});
 }else if(CLUB.mode==='archery'){
  const targets=r?.targets||[{x:0,y:1.4,z:-CLUB_LEVELS.archery[CLUB.level].distance,radius:.61}];for(const t of targets)clubMesh(dynamic,'club-archery-target',V(t.x,t.y,t.z),0,{scale:t.radius/.61});
 }
 if(r){for(const hit of r.embedded||[]){const t=r.targets?.[hit.target],p=t?add(V(t.x,t.y,t.z),hit.local):hit.pos;clubMesh(dynamic,hit.kind==='darts'?'club-dart':'club-arrow',p,0,{rotation:hit.rotation||ID});}
  if(r.projectile)clubMesh(dynamic,CLUB.mode==='darts'?'club-dart':'club-arrow',sub(r.projectile.pos,mul(norm(r.projectile.vel),CLUB.mode==='darts'?.068:.396)),0,{rotation:clubProjectileBasis(r.projectile.vel)});
  for(const t of r.tracers||[])fx.beam('#ffe0a4',t.a,t.b,.012,clamp(t.life/.06,0,1),true);
  for(const p of r.sparks||[])fx.put('sphere',p.color,p.pos.x,p.pos.y,p.pos.z,p.size,p.size,p.size,0,0,0,clamp(p.life*3,0,1),true);
 }
 clubEquipment();
}
function clubProjectileBasis(v){const d=norm(v);return basis(Math.atan2(-d.x,-d.z),Math.asin(clamp(d.y,-1,1)));}
function clubCamera(){
 const r=CLUB.run,active=r&&CLUB.phase!=='lobby';
 if(!active){
  if(CLUB.mode==='race'){const a=clubTrackAt(CLUB.track,CLUB.track.length-10);cam.eye=add(a.pos,add(mul(right(a.yaw),-7),V(0,3.1,0)));cam.dir=norm(sub(add(clubTrackAt(CLUB.track,25).pos,V(0,.8,0)),cam.eye));}
  else if(CLUB.mode==='darts'){cam.eye=V(.7,1.87,0);cam.dir=norm(sub(V(0,1.73,-2.4),cam.eye));}
  else{cam.eye=V(2.8,1.8,2);cam.dir=norm(sub(V(0,1.2,CLUB.mode==='archery'?-CLUB_LEVELS.archery[CLUB.level].distance:-15),cam.eye));}
 }else if(CLUB.mode==='race'){
  const c=r.car,carBasis=basis(c.yaw,c.pitch,c.roll);cam.eye=add(c.pos,bx(carBasis,V(-.37,1.12,.80)));cam.dir=bx(basis(c.yaw+CLUB.look.yaw,c.pitch+CLUB.look.pitch),V(0,0,-1));
 }else{
  const walk=r.pos||V();cam.eye=add(walk,V(0,CLUB.mode==='darts'?1.73:1.65,0));
  const holding=r.charging,sway=(holding||r.aim>.1)?clubDiff().sway*(CLUB.held.has('breath')?.18:1)*(1-(r.aim||0)*.4)*.0018*(1+Math.min(2.5,Math.max(0,(r.holdTime||0)-2)*.18)):0;
  cam.dir=bx(basis(CLUB.look.yaw+Math.sin(CLUB.time*2.3)*sway,CLUB.look.pitch+Math.cos(CLUB.time*2.7)*sway),V(0,0,-1));
 }
 const fov=!active?60:CLUB.mode==='darts'?29:CLUB.mode==='archery'?mix(55,33,r.aim||0):CLUB.mode==='shooting'?mix(72,r.weapon===2?25:46,r.aim||0):75+clamp((r.car.speed-18)*.28,0,11);
 cam.pitch=Math.asin(cam.dir.y);cam.yaw=Math.atan2(-cam.dir.x,-cam.dir.z);cam.vp=matmul(perspective(fov*PI/180,innerWidth/innerHeight,.035,1000),lookAt(cam.eye,add(cam.eye,cam.dir)));player.pos=active&&CLUB.mode==='race'?{...r.car.pos}:V(cam.eye.x,0,cam.eye.z);state.car=null;
}
function clubRender(){
 if(!worldMeshes)return;clubCamera();telemetry.draws=telemetry.triangles=telemetry.upload=0;clubDrawScene();renderer.begin(cam.vp,cam.eye);renderer.draw(worldMeshes.static);renderer.drawBuilder(dynamic);renderer.drawBuilder(fx,true);renderer.end?.();
}
