/* Layered mesh effects, driven by simulation time. No screen-wide filters or
   unbounded emitters: low graphics / CPU rendering share the same damage rules. */
function makeArmoryShapes8(){
 const ring=[];for(let i=0;i<24;i++){
  const a=i/24*TAU,b=(i+1)/24*TAU,p=r=>V(Math.cos(a)*r,0,Math.sin(a)*r),q=r=>V(Math.cos(b)*r,0,Math.sin(b)*r);
  tri(ring,p(.43),q(.43),q(.5),V(0,1,0));tri(ring,p(.43),q(.5),p(.5),V(0,1,0));
 }shapes.armory_ring8=ring;
 const flame=[];const levels=[[0,.19,0],[.26,.22,.025],[.60,.115,-.03],[1,0,.065]];
 for(let j=0;j<levels.length-1;j++)for(let i=0;i<7;i++){
  const [y,r,x]=levels[j],[ny,nr,nx]=levels[j+1],a=i/7*TAU,b=(i+1)/7*TAU;
  const p=V(x+Math.cos(a)*r,y,Math.sin(a)*r),q=V(x+Math.cos(b)*r,y,Math.sin(b)*r),u=V(nx+Math.cos(a)*nr,ny,Math.sin(a)*nr),v=V(nx+Math.cos(b)*nr,ny,Math.sin(b)*nr);
  tri(flame,p,q,v);if(nr)tri(flame,p,v,u);
 }shapes.armory_flame8=flame;
}
makeArmoryShapes8();

// Feathered vertex-alpha fans work in the existing transparent stream. They
// need no textures or additional shader and cost less than a full sphere.
function softPuff8(b,p,w,h,c,alpha,seed=0,normal=null){
 if(b.instances)b=b.soft;
 const n=normal||norm(sub(cam.eye,p)),x=norm(cross(Math.abs(n.y)<.95?V(0,1,0):V(0,0,1),n)),y=cross(n,x),rgb=color(c),count=12;
 const point=(i,r)=>{const a=i/count*TAU,jitter=1+.07*Math.sin(i*2.1+seed);return add(p,add(mul(x,Math.cos(a)*w*.5*r*jitter),mul(y,Math.sin(a)*h*.5*r*jitter)));};
 const vertex=(v,a)=>{b.ensure(10);const d=b.data;let k=b.n;d[k++]=v.x;d[k++]=v.y;d[k++]=v.z;d[k++]=0;d[k++]=0;d[k++]=0;d[k++]=rgb[0];d[k++]=rgb[1];d[k++]=rgb[2];d[k++]=alpha*a;b.n=k;};
 for(let i=0;i<count;i++){
  const a=point(i,.55),c1=point(i+1,.55),o=point(i,1),o1=point(i+1,1);
  vertex(p,1);vertex(a,.56);vertex(c1,.56);
  vertex(a,.56);vertex(o,0);vertex(o1,0);vertex(a,.56);vertex(o1,0);vertex(c1,.56);
 }
}

combatBurst=function(p,radius){
 const cap=budget8(),water=waterAt(p)&&p.y<.4;
 bounded8(ARMORY8.bursts,{pos:{...p},radius,age:0,life:water?1.1:2.2,water,seed:++ARMORY8.serial},cap.bursts);
 spatialSound(p,water?110:55,water?.22:.50,.18,'sawtooth',22);
 spatialSound(p,water?520:270,.12,.035,'triangle',85);
 // Fragments are decorative; blastAt remains the only owner of blast damage.
 for(let i=0;i<(RENDER.tier===0?4:11);i++){
  const a=i*2.399,force=2+Math.random()*radius*.65;
  bounded8(ARMORY8.motes,{pos:add(p,V(0,.12,0)),prev:{...p},vel:V(Math.sin(a)*force,2+Math.random()*4,Math.cos(a)*force),age:0,life:.7+Math.random()*.7,color:water?'#badcdd':'#6c6960',size:water?.09:.055,kind:water?'drop':'chip'},cap.motes);
 }
 if(!water&&p.y<ground(p)+1)bounded8(ARMORY8.marks,{pos:V(p.x,ground(p)+.018,p.z),normal:V(0,1,0),age:0,life:14,size:radius*.72,color:'#3e4240'},cap.marks);
};

function drawExplosion8(ef,p){
 if(!isActorVisible(p.pos,18))return;
 const t=p.age,r=p.radius,pos=p.pos,low=RENDER.tier===0||renderer.software,n=low?3:7;
 if(p.water){
  const s=r*.4*(.4+t*2);ef.put('armory_ring8','#b9e7e4',pos.x,Math.max(ground(pos),pos.y)+.025,pos.z,s,1,s,0,0,0,(1-t/p.life)*.7,true);
  for(let i=0;i<n;i++){const a=i*2.4,h=Math.sin(clamp(t/.8,0,1)*PI)*r*.3;ef.put('sphere','#b6e0df',pos.x+Math.sin(a)*t*2,pos.y+h*.5,pos.z+Math.cos(a)*t*2,.3,h+.1,.3,0,0,0,(1-t/p.life)*.5,true);}return;
 }
 if(t<.11){const s=r*(.12+t*3);ef.put('sphere','#fff3cb',pos.x,pos.y+.12,pos.z,s,s,s,0,0,0,(1-t/.11)*.93,true);}
 if(t<.45){
  const s=r*(.18+t*1.25);ef.put('armory_ring8','#f0c391',pos.x,ground(pos)+.05,pos.z,s*2,1,s*2,0,0,0,(1-t/.45)*.52,true);
 }
 for(let i=0;i<n;i++){
  const a=i*2.399+p.seed,rise=.35+t*(.6+i*.11),rr=r*.17*(.3+t),x=pos.x+Math.sin(a)*rr,z=pos.z+Math.cos(a)*rr;
  if(t<.36){const size=r*(.08+t*.52);ef.put('sphere',i%2?'#ee9853':'#f5c275',x,pos.y+rise*.45,z,size,size*1.1,size,0,0,0,(1-t/.36)*.75,true);}
  if(t>.10){const life=clamp((p.life-t)/1.1,0,1),size=r*(.16+t*.26);softPuff8(ef,V(x+t*.18,pos.y+rise,z),size,size*.88,i%2?'#454e50':'#73796f',life*.48,i+p.seed);}
  if(t<1.05){const rr2=r*(.20+t*.65),size=r*(.12+t*.25);softPuff8(ef,V(pos.x+Math.sin(a)*rr2,ground(pos)+.20+t*.13,pos.z+Math.cos(a)*rr2),size,size*.4,'#aaa28e',(1-t/1.05)*.28,i);}
 }
}

function drawFire8(ef,f){
 if(!isActorVisible(f.pos,9))return;
 const age=7-f.life,fade=Math.min(1,f.life*1.5,age*7+.15),g=ground(f.pos)+.045,low=RENDER.tier===0||renderer.software,n=Math.max(3,Math.min(low?5:11,Math.floor((low?18:55)/Math.max(1,combat.fires.length))));
 // Outer scorch, hot center and tongues use different scales and lifetimes.
 softPuff8(ef,V(f.pos.x,g-.014,f.pos.z),f.radius*2.1,f.radius*2.1,'#413e34',.46*fade,1,V(0,1,0));
 softPuff8(ef,V(f.pos.x,g,f.pos.z),f.radius*1.6,f.radius*1.6,'#a64c2c',.3*fade,2,V(0,1,0));
 for(let i=0;i<n;i++){
  const a=i*2.399,rr=f.radius*.77*Math.sqrt((i+.2)/n),x=f.pos.x+Math.sin(a)*rr,z=f.pos.z+Math.cos(a)*rr;
  if(waterAt(V(x,g,z))||!lineClear(add(f.pos,V(0,.2,0)),V(x,g+.2,z)))continue;
  const h=(.65+.28*Math.sin(state.t*7.2+i*1.9)+.13*Math.sin(state.t*13+i))*fade;
  if(!low&&i%2===0)softPuff8(ef,V(x,g+h*.4,z),.9,h*1.5,'#eb9a44',.15*fade,i);
  ef.put('armory_flame8','#e57337',x,g,z,1.4,h*1.5,1.4,state.t*.7+i,0,0,.62*fade,true);
  ef.put('armory_flame8','#ffce71',x,g+.015,z,.72,h*.9,.72,-state.t*.9+i,0,0,.84*fade,true);
  if(!low&&i%3===0){const spark=(state.t*1.1+i*.27)%1;ef.put('sphere','#ffe6a0',x+spark*.12,g+spark*1.8,z,.024,.065,.024,0,0,0,(1-spark)*fade,true);}
 }
 for(let i=0;i<(low?2:5);i++){
  const y=(state.t*.7+i*.63)%3,sz=.55+y*.34;
  softPuff8(ef,V(f.pos.x+Math.sin(i*2.4)*.8+y*.2,g+.7+y,f.pos.z+Math.cos(i*2.4)*.8),sz*1.6,sz*1.5,'#4c595a',.26*(1-y/3)*fade,i);
 }
}

function drawRocketTrail8(ef,p){
 if(!p.trail?.length)return;const step=RENDER.tier===0||renderer.software?4:2;
 for(let i=0;i<p.trail.length;i+=step){const q=p.trail[i],old=1-i/p.trail.length,s=.10+old*.24;
  softPuff8(ef,V(q.x,q.y+old*.12,q.z),s*1.7,s*1.7,'#abb5b2',.34*(1-old*.7),i);
 }
 const last=p.trail[p.trail.length-1];ef.beam('#ffd997',last,p.pos,.045,.55,true);
}

const igniteBefore8=igniteAt;
igniteAt=function(p){
 const water=waterAt(p),cap=budget8();igniteBefore8(p);
 for(let i=0;i<(RENDER.tier===0?3:8);i++)bounded8(ARMORY8.motes,{pos:add(p,V(0,.09,0)),prev:{...p},vel:V(Math.sin(i*2.4)*2,1+Math.random()*2,Math.cos(i*2.4)*2),age:0,life:.55,color:water?'#bde2df':'#6fa9a1',size:.048,kind:water?'drop':'chip'},cap.motes);
 if(!water)bounded8(ARMORY8.marks,{pos:V(p.x,ground(p)+.02,p.z),normal:V(0,1,0),age:0,life:13,size:7.2,color:'#44423a'},cap.marks);
};

throwOrigin=function(){return weaponPose8(player.pos,player.yaw,player.phase,state.weapon,{forceAim:true}).origin;};
