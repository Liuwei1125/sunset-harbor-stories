// Enhanced procedural meshes. No downloaded models, textures or runtime dependencies.
// High-detail geometry is used near the camera; distant actors keep the original LOD.
function detailShapes() {
  function smoothTriangle(out,a,b,c,na,nb,nc) {
    for (const [p,n] of [[a,na],[b,nb],[c,nc]]) out.push(p.x,p.y,p.z,n.x,n.y,n.z);
  }
  const sphere=[];
  const point=(u,v)=>V(Math.cos(u)*Math.sin(v)*.5,Math.cos(v)*.5,Math.sin(u)*Math.sin(v)*.5);
  for(let j=0;j<8;j++) for(let i=0;i<12;i++) {
    const a=point(i/12*TAU,j/8*PI),b=point((i+1)/12*TAU,j/8*PI),c=point((i+1)/12*TAU,(j+1)/8*PI),d=point(i/12*TAU,(j+1)/8*PI);
    smoothTriangle(sphere,a,b,c,norm(a),norm(b),norm(c));smoothTriangle(sphere,a,c,d,norm(a),norm(c),norm(d));
  }
  shapes.sphere=sphere;
  // Chamfered box: six faces, twelve bevels and eight clipped corners.
  const bevel=[],m=.39;
  for(let axis=0;axis<3;axis++)for(let s of [-1,1]) {
    let axes=[0,1,2].filter(a=>a!==axis),ps=[[-m,-m],[m,-m],[m,m],[-m,m]].map(([u,v])=>{let p=[0,0,0];p[axis]=s*.5;p[axes[0]]=u;p[axes[1]]=v;return V(...p);});
    let n=[0,0,0];n[axis]=s;tri(bevel,ps[0],ps[1],ps[2],V(...n));tri(bevel,ps[0],ps[2],ps[3],V(...n));
  }
  for(let axis=0;axis<3;axis++)for(let s of [-1,1])for(let t of [-1,1]) {
    let axes=[0,1,2].filter(a=>a!==axis),ps=[];
    for(let [u,v,w] of [[-m,.5,m],[m,.5,m],[m,m,.5],[-m,m,.5]]){let p=[];p[axis]=u;p[axes[0]]=s*v;p[axes[1]]=t*w;ps.push(V(...p));}
    let n=[0,0,0];n[axes[0]]=s;n[axes[1]]=t;tri(bevel,ps[0],ps[1],ps[2],norm(V(...n)));tri(bevel,ps[0],ps[2],ps[3],norm(V(...n)));
  }
  for(let x of [-1,1])for(let y of [-1,1])for(let z of [-1,1])tri(bevel,V(x*.5,y*m,z*m),V(x*m,y*.5,z*m),V(x*m,y*m,z*.5),norm(V(x,y,z)));
  shapes.bevel=bevel;
  function loft(name,rings) {
    const out=[];
    for(let j=0;j<rings.length-1;j++)for(let i=0;i<rings[j].length;i++) {
      let k=(i+1)%rings[j].length,a=rings[j][i],b=rings[j][k],c=rings[j+1][k],d=rings[j+1][i];tri(out,a,b,c);tri(out,a,c,d);
    }
    for(const [idx,n] of [[0,V(0,0,-1)],[rings.length-1,V(0,0,1)]]){const r=rings[idx],center=mul(r.reduce((s,p)=>add(s,p),V()),1/r.length);for(let i=0;i<r.length;i++)tri(out,center,r[i],r[(i+1)%r.length],n);}
    shapes[name]=out;
  }
  const sections=[[-.5,.40,-.40,.12],[-.43,.47,-.48,.34],[-.28,.50,-.48,.44],[-.06,.48,-.48,.50],[.23,.49,-.48,.48],[.42,.47,-.42,.34],[.5,.40,-.30,.20]];
  loft('carbody',sections.map(([z,w,lo,hi])=>[V(-w+.055,lo,z),V(w-.055,lo,z),V(w,lo+.09,z),V(w,hi-.09,z),V(w-.055,hi,z),V(-w+.055,hi,z),V(-w,hi-.09,z),V(-w,lo+.09,z)]));
  // Smooth, elliptical, tapered jacket instead of a cube.
  let torso=[];const rings=[[.0,.76,.7],[.16,.91,.86],[.68,1,1],[.88,.98,.9],[1,.62,.62]];
  for(let j=0;j<rings.length-1;j++)for(let i=0;i<12;i++) {
    const p=(r,k)=>V(Math.cos(k/12*TAU)*r[1]*.5,r[0]-.5,Math.sin(k/12*TAU)*r[2]*.5);
    const a=p(rings[j],i),b=p(rings[j],i+1),c=p(rings[j+1],i+1),d=p(rings[j+1],i),n1=norm(V(a.x,0,a.z)),n2=norm(V(b.x,0,b.z));
    smoothTriangle(torso,a,b,c,n1,n2,n2);smoothTriangle(torso,a,c,d,n1,n2,n1);
  }
  shapes.torso=torso;
  // More circular tires with sidewalls, shoulders, tread and a hollow center.
  const tire=[],profile=[[-.5,.32],[-.5,.42],[-.33,.49],[.33,.49],[.5,.42],[.5,.32]];
  for(let j=0;j<profile.length-1;j++)for(let i=0;i<20;i++) {
    let p=(r,k)=>V(Math.cos(k/20*TAU)*r[1],r[0],Math.sin(k/20*TAU)*r[1]);let a=p(profile[j],i),b=p(profile[j],i+1),c=p(profile[j+1],i+1),d=p(profile[j+1],i);let v=sub(c,b),n1=norm(V(a.x*Math.abs(v.y),-Math.sign(v.x*a.x+v.z*a.z)*Math.abs(profile[j+1][1]-profile[j][1]),a.z*Math.abs(v.y)));tri(tire,a,b,c,n1);tri(tire,a,c,d,n1);
  }
  shapes.tire=tire;
}
detailShapes();
function softBox(b,c,x,y,z,w,h,d,ry=0,rx=0,rz=0) {return b.put('bevel',c,x,y,z,w,h,d,ry,rx,rz);}
function capsule(b,c,a,d,width) {b.beam(c,a,d,width);for(const p of [a,d])b.put('sphere',c,p.x,p.y,p.z,width,width,width);}
function surface(b,c,points,flip=false) {
  if(flip)points=points.slice().reverse();
  // Only a few cabin surfaces need arbitrary quadrilaterals.
  const vertices=[];const ps=points.map(p=>V(...p));tri(vertices,ps[0],ps[1],ps[2]);if(ps.length===4)tri(vertices,ps[0],ps[2],ps[3]);shapes.patch=vertices;b.put('patch',c,0,0,0);
}
function drawCar(b,car,t) {
  if(dist2(car.pos,cam.eye)>Math.min(RENDER.detail,renderer.software?40:84))return drawCarBasic(b,car,t);
  const alive=car.hp>0,sport=car.sport,c=alive?car.color:'#454d54',roof=sport?1.68:1.82;
  b.transform(V(car.pos.x,(car.pos.y||0)+.04,car.pos.z),car.yaw,car.pitch||0,car.roll||0);
  const root=b.parent,origin=b.origin;
  softBox(b,'#16232d',0,.49,0,2.0,.27,4.16);
  b.put('carbody',c,0,.79,0,2.16,.76,4.46);
  softBox(b,c,0,.99,-1.29,1.85,.18,1.63,0,.035);
  softBox(b,c,0,1.04,1.49,1.94,.18,1.04);
  // Upholstery visible through the window tint at oblique angles.
  for(let s of [-1,1]) {
    softBox(b,'#273540',s*.43,1.15,.23,.6,.28,.83);
    softBox(b,'#293841',s*.43,1.38,.57,.57,.67,.2,0,-.12);
    softBox(b,'#384b55',s*.43,1.66,.6,.32,.26,.19);
  }
  const front=-.99,topfront=sport?-.38:-.52,back=sport?.58:.83,rear=1.34;
  surface(b,'#38596b',[[-.84,1.1,front],[.84,1.1,front],[.73,roof,topfront],[-.73,roof,topfront]],true);
  surface(b,'#466b7d',[[-.83,1.12,rear],[-.72,roof,back],[.72,roof,back],[.83,1.12,rear]],true);
  for(let s of [-1,1]) {
    surface(b,'#294a5b',[[s*.854,1.12,front],[s*.854,1.12,rear],[s*.742,roof,back],[s*.742,roof,topfront]],s>0);
    b.beam(c,V(s*.85,1.11,front),V(s*.745,roof,topfront),.082);
    b.beam(c,V(s*.85,1.13,rear),V(s*.744,roof,back),.11);
    b.beam('#233643',V(s*.858,1.11,.26),V(s*.748,roof,.24),.065);
    b.beam('#9badb5',V(s*.863,1.115,front),V(s*.863,1.115,rear),.025);
    // Reflection streak, door seam, handle and wing mirror.
    b.beam('#6f9ba9',V(s*.848,1.19,-.7),V(s*.776,roof-.1,-.37),.024);
    softBox(b,c,s*1.047,.76,.21,.10,.48,1.71);
    b.box('#756755',s*1.101,.69,.84,.014,.39,.018);
    softBox(b,'#b9c3c5',s*1.108,1.004,.63,.028,.065,.24);
    b.beam('#223b49',V(s*.87,1.20,-.63),V(s*1.10,1.28,-.7),.056);
    softBox(b,c,s*1.13,1.31,-.71,.28,.17,.29);
    b.box('#81a9b4',s*1.145,1.316,-.552,.19,.10,.022);
    b.box('#263643',s*1.006,.39,.02,.10,.16,2.13);
  }
  softBox(b,sport?'#253540':c,0,roof+.025,(topfront+back)/2,1.57,.115,back-topfront+.14);
  if(!sport)b.box('#395664',0,roof+.09,.18,1.20,.014,.64);
  // Front grille, LED signature, bumper and individual rear light bars.
  softBox(b,'#172a34',0,.70,-2.198,1.24,.24,.09);
  for(let i=-4;i<=4;i++)b.box('#536873',i*.13,.70,-2.255,.045,.16,.027);
  softBox(b,'#20323d',0,.43,-2.10,1.97,.10,.20);
  softBox(b,'#1b303c',0,.48,2.13,1.84,.17,.2);
  for(let s of [-1,1]) {
    softBox(b,'#294352',s*.72,.91,-2.105,.49,.17,.19);
    b.box('#e2f7ef',s*.72,.96,-2.213,.44,.038,.027,0,0,0,1,true);
    b.box('#e2f7ef',s*.914,.91,-2.189,.033,.12,.035,0,0,0,1,true);
    b.box('#f9c986',s*.985,.765,-1.90,.027,.048,.20,0,0,0,1,true);
    const light=car.braking?'#ffac7e':'#ec6760';b.box(light,s*.61,.99,2.11,.71,.062,.06,0,0,0,1,true);b.box(light,s*.938,.932,2.055,.05,.10,.13,0,0,0,1,true);
    b.put('cyl','#a8afb2',s*.61,.43,2.238,.15,.20,.15,0,PI/2);
    b.put('cyl','#17222b',s*.61,.43,2.343,.10,.011,.10,0,PI/2);
  }
  b.box('#ddd8b9',0,.69,2.235,.51,.17,.025);b.box('#687d83',0,.69,2.251,.32,.033,.008);
  if(sport) {
    for(let s of [-.64,.64])b.box('#22333e',s,1.18,1.86,.08,.25,.08);
    softBox(b,'#263d49',0,1.34,1.86,2.04,.10,.42);
    for(let s of [-.26,.26])b.box('#e7dabe',s,1.092,-1.28,.075,.015,1.24,0,.034);
    for(let i=0;i<5;i++)b.box('#324954',-.31+i*.155,1.128,1.50,.055,.016,.48);
  }
  const steering=car.steerVisual||0;
  for(let s of [-1,1])for(let z of [-1.34,1.40]) {
    b.origin=add(origin,bx(root,V(s*1.018,.455,z)));b.parent=bmul(root,basis(z<0?steering:0));
    b.put('tire','#202a32',0,0,0,.94,.28,.94,0,0,PI/2);
    b.put('cyl','#42505a',s*.146,0,0,.68,.025,.68,0,0,PI/2);
    b.put('cyl','#192c37',s*.165,0,0,.53,.025,.53,0,0,PI/2);
    for(let i=0;i<5;i++) {
      let a=(car.wheel||0)+i/5*TAU;const p=V(s*.186,Math.cos(a)*.071,Math.sin(a)*.071),q=V(s*.191,Math.cos(a+.14)*.273,Math.sin(a+.14)*.273);b.beam('#c2cbd0',p,q,.057);
      b.put('sphere','#7e919a',s*.218,Math.cos(a)*.069,Math.sin(a)*.069,.027,.027,.027);
    }
    b.put('cyl','#bac7cd',s*.209,0,0,.16,.025,.16,0,0,PI/2);
    softBox(b,'#b15d46',s*.16,.14,-.15,.035,.18,.09);
  }
  b.parent=root;b.origin=origin;
  if(car===state.car) {b.put('sphere','#bd967e',-.43,1.63,.22,.28,.34,.27);softBox(b,'#ba754f',-.43,1.3,.24,.46,.47,.23);}
  b.world();
}
function weaponModel(b,index,x,y,z) {
  const zlen=[.39,.62,.93][index];softBox(b,'#273942',x,y,z-zlen/2,.14,.145,zlen);
  softBox(b,'#516672',x,y+.035,z-zlen/2,.146,.061,zlen*.87);
  b.put('cyl','#233644',x,y,z-zlen-.08,.060,.19,.060,0,PI/2);
  b.put('cyl','#0b1822',x,y,z-zlen-.184,.040,.006,.040,0,PI/2);
  softBox(b,'#1c2933',x,y-.14,z-.09,.115,.24,.14,0,-.18);
  b.box('#14252e',x,y+.10,z-.19,.036,.047,.05);
  b.box('#162934',x,y+.10,z-zlen+.05,.027,.043,.045);
  if(index===1){softBox(b,'#233642',x,y-.19,z-.31,.12,.25,.18,0,.08);softBox(b,'#293a46',x,y,z+.12,.17,.1,.22);softBox(b,'#2e4755',x,y+.15,z-.27,.13,.10,.13);b.box('#6fc8c4',x,y+.16,z-.341,.068,.05,.009,0,0,0,1,true);}
  if(index===2){softBox(b,'#986b4b',x,y-.04,z-.61,.19,.15,.27);softBox(b,'#93694b',x,y-.065,z+.10,.18,.19,.33);for(let i=0;i<4;i++)b.box('#4d433b',x,y-.105,z-.54-i*.041,.193,.02,.018);}
}
function drawPerson(b,p,yaw,phase,weaponIndex=0,ghost=false) {
  if(ghost&&dist2(p,cam.eye)>(renderer.software?22:42))return drawPersonBasic(b,p,yaw,phase,weaponIndex,true);
  const jacket=ghost?'#699899':'#d79458',pants=ghost?'#566171':'#334e62',skin=ghost?'#bb997e':'#c49572';
  const moving=ghost||player.moving,walk=moving?Math.sin(phase):0,bob=moving?Math.abs(Math.sin(phase))*.025:Math.sin(state.t*2)*.006;
  b.transform(add(p,V(0,bob,0)),yaw);
  b.put('torso',jacket,0,1.245,0,.66,.67,.41);
  softBox(b,'#35434b',0,.88,0,.52,.18,.34);
  b.box('#aeb9b4',0,.915,-.185,.09,.07,.025);
  b.put('cyl',skin,0,1.646,-.02,.20,.19,.20);
  // Collar, shaped head, hairline, ears, nose and sunglasses.
  b.put('cyl','#eee1ca',0,1.58,0,.30,.10,.25);
  b.put('sphere',skin,0,1.869,-.018,.375,.451,.351);
  b.put('sphere','#2b333b',0,2.012,.010,.386,.214,.359);
  b.put('sphere',skin,-.195,1.866,.016,.075,.128,.065);b.put('sphere',skin,.195,1.866,.016,.075,.128,.065);
  b.put('sphere',skin,0,1.847,-.185,.075,.09,.09);
  b.beam('#5b4840',V(-.057,1.768,-.170),V(.057,1.768,-.170),.012);
  for(let s of [-1,1]){softBox(b,'#203846',s*.091,1.917,-.172,.151,.08,.032);b.beam('#2f3b40',V(s*.146,1.923,-.165),V(s*.188,1.917,.024),.018);b.box('#728e9b',s*.080,1.935,-.190,.059,.010,.008);}
  b.beam('#25353f',V(-.029,1.915,-.188),V(.029,1.915,-.188),.020);
  for(let s of [-1,1]) {
    const sw=moving?Math.sin(phase+(s>0?PI:0))*.67:0;
    const hip=V(s*.164,.86,0),knee=V(s*.181,.48,Math.sin(sw)*.27),ankle=V(s*.179,.15,Math.sin(sw)*.47);
    capsule(b,pants,hip,knee,.242);capsule(b,pants,knee,ankle,.197);
    softBox(b,'#496375',knee.x,knee.y,knee.z-.105,.161,.16,.031);
    b.beam('#798587',add(hip,V(s*.1,0,0)),add(knee,V(s*.1,0,0)),.013);
    softBox(b,'#ece6d7',ankle.x,.10,ankle.z-.07,.267,.17,.43);
    softBox(b,'#657a84',ankle.x,.153,ankle.z-.057,.233,.09,.28);
    b.box('#eae2d0',ankle.x,.035,ankle.z-.076,.277,.030,.438);
    for(let j=0;j<3;j++)b.box('#dfddcf',ankle.x,.205,ankle.z-.032-j*.046,.129,.01,.013);
  }
  if(!ghost) {
    const r=state.reload>0?Math.sin((1-state.reload/state.reloadTotal)*PI):0;
    const a=V(.34,1.46,0),elbow=V(.44,1.20,-.22),wrist=V(.28,1.275-r*.12,-.66+r*.20);
    capsule(b,jacket,a,elbow,.222);capsule(b,'#c3824f',elbow,wrist,.168);
    capsule(b,jacket,V(-.34,1.46,0),V(-.30,1.16,-.27),.219);capsule(b,'#c3824f',V(-.30,1.16,-.27),V(.15-r*.35,1.24-r*.11,-.57),.164);
    b.put('sphere','#374953',wrist.x,wrist.y,wrist.z,.179,.144,.19);
    for(let j=0;j<3;j++)b.put('sphere',skin,.35,1.25,-.645-j*.037,.057,.08,.027);
    weaponModel(b,weaponIndex,.29,wrist.y+.02,wrist.z-.025);
    // Jacket zipper and paired shoulder panels.
    b.beam('#f0d0a1',V(0,1.03,-.20),V(0,1.48,-.20),.019);
    for(let s of [-1,1]){softBox(b,'#e4b47e',s*.22,1.448,-.143,.13,.13,.06);b.beam('#313f45',V(s*.20,1.48,.145),V(s*.23,1.12,-.16),.054);}
    softBox(b,'#304953',0,1.269,.296,.461,.578,.226);
    softBox(b,'#47636c',0,1.307,.422,.347,.382,.05);
    softBox(b,'#263e4a',0,1.041,.417,.36,.118,.065);
    for(let s of [-1,1])b.box('#a7ada2',s*.133,1.435,.457,.025,.09,.015);
    b.box('#d2c9a1',0,1.308,.454,.15,.047,.012);
    b.beam('#a1b2ac',V(-.13,1.17,.452),V(.13,1.17,.452),.012);
  }else for(let s of [-1,1]){let elbow=V(s*.38,1.16,walk*s*.08),hand=V(s*.38,.94,walk*s*.19);capsule(b,jacket,V(s*.31,1.46,0),elbow,.211);capsule(b,skin,elbow,hand,.155);}
  b.world();
}
function drawDrone(b,e,t) {
  drawDroneBasic(b,e,t);if(dist2(e.pos,cam.eye)>45)return;
  b.transform(e.pos,e.yaw);softBox(b,'#aebfc1',0,.10,.10,.90,.49,.58);
  softBox(b,'#263d4b',0,.045,-.466,.81,.31,.08);b.put('cyl','#d2d7c8',0,.06,-.54,.30,.05,.30,0,PI/2);b.put('sphere',e.aggressive?'#ff8771':'#76dccb',0,.06,-.589,.21,.21,.08,0,0,0,1,true);
  for(let s of [-1,1]){b.put('ring','#526c75',s*1.1,.29,.04,.97,.97,.97,0,PI/2);b.beam('#a4b2b0',V(s*.31,-.4,-.05),V(s*.46,-.71,.08),.066);b.box('#e6c885',s*.45,.08,-.474,.13,.043,.014,0,0,0,1,true);}
  b.world();
}
function palm(x,z,h=6) {
  palms.push({x,z});let prev=V(x,.05,z);
  for(let i=0;i<7;i++){let t=(i+1)/7,p=V(x+Math.sin(t*1.1)*.40,t*h,z+t*t*.12);city.beam(i%2?'#a18159':'#967653',prev,p,.48-t*.18);prev=p;}
  for(let j=0;j<9;j++){let a=j/9*TAU;for(let k=0;k<3;k++){let t=k/3,u=(k+1)/3,pt=t=>add(prev,V(Math.cos(a)*t*3.4,-t*t*1.34+Math.sin(t*PI)*.39,Math.sin(a)*t*3.4)),p=pt(t),q=pt(u);city.beam('#577e60',p,q,.055);let side=V(-Math.sin(a)*(.51-t*.40),.06,Math.cos(a)*(.51-t*.40));surface(city,j%2?'#4b7f65':'#789461',[[p.x,p.y,p.z],[q.x,q.y,q.z],[p.x+side.x,p.y+side.y,p.z+side.z]]);surface(city,'#527c61',[[p.x,p.y,p.z],[p.x-side.x,p.y+side.y,p.z-side.z],[q.x,q.y,q.z]]);}}
  for(let i=0;i<3;i++)city.put('sphere','#99784d',prev.x+(i-1)*.22,prev.y-.09,prev.z+.08,.32,.43,.35);
  shadows.put('disc','#142731',x+1.4,.185,z-1,5.5,1,4.6,0,0,0,.16);
}
function bench(x,z,yaw=0) {
  city.transform(V(x,.16,z),yaw);
  for(let i=0;i<4;i++)softBox(city,'#a37d56',0,.60,-.27+i*.18,2.48,.09,.14);
  for(let i=0;i<3;i++)softBox(city,'#b98e64',0,.89+i*.17,.31,2.48,.12,.1,0,-.09);
  for(let s of [-1,1]){city.beam('#3e5660',V(s*.86,.02,-.24),V(s*.86,.59,-.24),.09);city.beam('#3e5660',V(s*.86,.02,.24),V(s*.86,1.32,.33),.085);city.beam('#3c5058',V(s*1.10,.58,-.27),V(s*1.10,.90,-.27),.052);city.beam('#3c5058',V(s*1.10,.90,-.27),V(s*1.10,.90,.28),.057);}
  city.world();
}
function buildStreetDetails() {
  // Facade LOD is baked once. Lower floors are richer than the skyline.
  for(let b of buildings) {
    const {x,z,w,d,h}=b,front=z+d/2+.095;
    city.box('#71828a',x,.58,front,w+.06,.55,.09);
    city.box('#d7c9b5',x,3.33,front+.03,w+.16,.17,.21);
    for(let px=-w/2+2;px<w/2-1;px+=3.3){
      city.box('#d9d4c3',x+px,2.3,front+.055,.055,1.67,.037);
      city.box('#c0bcab',x+px,1.43,front+.075,1.66,.1,.22);
      if(h>9){city.box('#c2bbaa',x+px,4.58,front+.02,1.7,.1,.23);city.box('#aaa9a0',x+px,5.42,front+.018,.05,1.68,.04);}
      if(h<16&&Math.abs(x)<75){city.box('#32525d',x+px,1.34,front+.05,2.35,2.18,.08);city.box('#69939d',x+px,1.50,front+.10,2.20,1.48,.023);city.box('#a2aa9e',x+px,1.2,front+.13,.04,2.1,.016);}
    }
    for(let s of [-1,1]){city.box('#ded0bb',x+s*(w/2-.25),h/2,front+.08,.27,h,.17);city.box('#bfbbac',x+s*(w/2-.10),h+.62,z,.28,.35,d+.30);}
    city.box('#c5c1ad',x,h+.62,z+d/2,w+.30,.35,.30);city.box('#c5c1ad',x,h+.62,z-d/2,w+.30,.35,.30);
    if(h>13&&Math.abs(x)<75){for(let s of [-1,1]){const bx=x+s*(w*.28);city.box('#b8b8a7',bx,7.5,front+.42,3.0,.15,1.1);city.beam('#455c66',V(bx-1.43,8.25,front+.96),V(bx+1.43,8.25,front+.96),.055);for(let j=-3;j<=3;j++)city.box('#4b6065',bx+j*.43,7.90,front+.96,.035,.75,.035);}}
    if(Math.abs(x)<75&&Math.abs(z)<75){
      for(let s of [-1,1]){const px=x+s*(w/2-1.1),pz=front+1.28;softBox(city,'#9d8166',px,.44,pz,.82,.72,.82);city.put('sphere','#6e9569',px,1.0,pz,1.16,.95,1.12);city.put('sphere','#608b69',px-.22,1.17,pz,.73,.77,.71);}
      // Rooftop ventilation fins and ducts.
      for(let i=0;i<5;i++)city.box('#435d69',x-1.2+i*.57,h+1.13,z, .20,.035,2.4);
      city.put('cyl','#a8b5b2',x+4,h+2.04,z-4,1.15,.19,1.15);
      city.beam('#7d929b',V(x+4,h+1.6,z-4),V(x+4,h+3.75,z-4),.044);
    }
  }
  // Sidewalk seams, tactile curb tiles, drains and small street furniture.
  for(let z=-124;z<128;z+=11){for(let side of [-1,1]){
    const x=side*7.23;city.box('#c9b79b',x,.218,z,1.20,.026,.62);
    city.box('#8a9594',side*8.1,.213,z,1.60,.013,.024);
    if(Math.abs(z)<65&&!roadCenters.some(r=>Math.abs(z+3-r)<10)){softBox(city,'#4e776f',side*8.5,.65,z+3,.53,.91,.60);city.box('#293f48',side*8.5,1.125,z+3,.4,.04,.48);}
  }}
  for(let z=-120;z<132;z+=26){city.put('disc','#657177',5.64,.024,z,.90,1,.9);for(let i=-2;i<=2;i++)city.box('#334851',5.64+i*.135,.030,z,.043,.01,.54);}
  // Cafe terrace in the southern-facing SUNSET block.
  for(let dx of [-29,-18]){
    city.put('cyl','#4e626a',dx,.70,-9.1,.12,1.2,.12);city.put('cyl','#e0c4a0',dx,1.3,-9.1,1.30,.09,1.30);
    for(let a of [0,PI]){let x=dx+Math.cos(a)*1.18;softBox(city,'#537a73',x,.70,-9.1,.56,.09,.52);softBox(city,'#6c9385',x,1.03,-8.89,.56,.61,.06);for(let s of [-1,1])city.box('#425963',x+s*.21,.36,-9.1,.055,.63,.38);}
  }
}
