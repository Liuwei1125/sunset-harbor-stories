/* Original procedural vehicle assets: separate silhouettes, materials and moving parts. */
const FLEET={
 sport:{name:'COMET GT',cn:'\u5f57\u661f\u8dd1\u8f66',medium:'land',color:'#d99857',tag:'SPORT',detail:'\u7075\u6d3b\u8f6c\u5411 / \u6c2e\u6c14\u52a0\u901f',top:38},
 sedan:{name:'SENTINEL',cn:'\u57ce\u5e02\u8f7f\u8f66',medium:'land',color:'#789ca9',tag:'CRUISER',detail:'\u5e73\u8861\u64cd\u63a7 / \u65e5\u5e38\u901a\u52e4',top:31},
 van:{name:'ATLAS CARGO',cn:'\u963f\u7279\u62c9\u65af\u8d27\u8f66',medium:'land',color:'#719d8c',tag:'CARGO',detail:'\u8d27\u7269\u4fdd\u62a4 / \u91cd\u578b\u5e95\u76d8',top:26},
 jeep:{name:'TRAILBLAZER',cn:'\u62d3\u8352\u8005\u8d8a\u91ce',medium:'land',color:'#b8ad77',tag:'OFF ROAD',detail:'\u63d0\u9ad8\u79bb\u5730\u95f4\u9699 / \u8352\u5730\u6293\u5730',top:30},
 interceptor:{name:'NIGHTHAWK',cn:'\u591c\u9e70\u62e6\u622a\u8f66',medium:'land',color:'#425769',tag:'INTERCEPTOR',detail:'\u9ad8\u901f\u8ffd\u9010 / \u5f3a\u529b\u5239\u8f66',top:43},
 trainer:{name:'KESTREL 160',cn:'\u7ea2\u96bc\u6559\u7ec3\u673a',medium:'air',color:'#e6dcca',tag:'LIGHT AIRCRAFT',detail:'\u6ed1\u8dd1\u8d77\u98de / \u7a7a\u4e2d\u7a7f\u73af',top:58,lift:17},
 twin:{name:'AEROLINER',cn:'\u53cc\u53d1\u901a\u52e4\u673a',medium:'air',color:'#d7ded6',tag:'TWIN ENGINE',detail:'\u53cc\u87ba\u65cb\u6868 / \u9ad8\u901f\u5de1\u822a',top:80,lift:22},
 heli:{name:'OSPREY H4',cn:'\u9c7c\u9e70\u76f4\u5347\u673a',medium:'air',color:'#dba969',tag:'ROTORCRAFT',detail:'\u5782\u76f4\u8d77\u964d / \u60ac\u505c\u6551\u63f4',top:39},
 speedboat:{name:'STINGRAY',cn:'\u9ec4\u8c82\u5feb\u8247',medium:'sea',color:'#efdfbd',tag:'SPEEDBOAT',detail:'\u9ad8\u901f\u6ed1\u6c34 / \u6d77\u4e0a\u63a2\u7d22',top:30},
 yacht:{name:'SUNDANCER',cn:'\u65e5\u821e\u8005\u6e38\u8247',medium:'sea',color:'#eadfca',tag:'CABIN CRUISER',detail:'\u591a\u5c42\u8239\u8231 / \u6d77\u6e7e\u5de1\u6e38',top:22},
 tug:{name:'HARBORMASTER',cn:'\u6e2f\u52a1\u62d6\u8f6e',medium:'sea',color:'#cd8660',tag:'WORKBOAT',detail:'\u7a33\u5b9a\u6392\u6c34 / \u6d77\u4e0a\u8fd0\u8f93',top:16}
};
for(const [k,v]of Object.entries(FLEET)){CAR_NAMES[k]=v.name;if(!profile.garage[k])profile.garage[k]={owned:true,color:v.color,mods:{}};}
const AIR_KEYS=new Set(['trainer','twin','heli']);
function loftMesh(name,sections,segments=20){if(shapes[name])return;const out=[];const pt=(s,j)=>V(Math.sin(j*TAU/segments)*s[1],(s[3]||0)+Math.cos(j*TAU/segments)*s[2],s[0]);for(let i=0;i<sections.length-1;i++)for(let j=0;j<segments;j++){const p=pt(sections[i],j),q=pt(sections[i],j+1),r=pt(sections[i+1],j+1),u=pt(sections[i+1],j);tri(out,p,r,q);tri(out,p,u,r);}shapes[name]=out;}
function polygonMesh(name,points,thick=.04){if(shapes[name])return;const out=[],p=points.map(v=>V(...v)),N=p.length;for(let i=1;i<N-1;i++){tri(out,p[0],p[i],p[i+1]);tri(out,add(p[0],V(0,-thick,0)),add(p[i+1],V(0,-thick,0)),add(p[i],V(0,-thick,0)));}for(let i=0;i<N;i++){const a=p[i],b=p[(i+1)%N],c=add(b,V(0,-thick,0)),d=add(a,V(0,-thick,0));tri(out,a,b,c);tri(out,a,c,d);}shapes[name]=out;}
function makeExpeditionShapes(){
 loftMesh('v4_fuselage',[[-4.2,.05,.05],[-3.6,.55,.57],[-2.2,.79,.8],[-.6,.86,.94],[1,.70,.83],[3.6,.21,.24],[4.6,.08,.12]],22);
 loftMesh('v4_hull',[[-4.1,.025,.06,.36],[-3.5,.65,.36,.14],[-2,1.22,.58,0],[1.3,1.22,.59,0],[3.1,1.04,.52,.08],[3.15,.04,.04,.08]],20);
 loftMesh('v4_heli',[[-2.75,.05,.13],[-2.05,.75,.79],[-.6,1.00,1.04],[.8,.83,.9],[1.75,.42,.48],[5.2,.12,.12]],22);
 polygonMesh('v4_wing',[[-.3,0,-.55],[-6.4,0,.12],[-6.8,.12,1.12],[-.3,0,1.35]],.12);
 polygonMesh('v4_tailplane',[[-.1,0,-.30],[-2.35,.08,.25],[-2.45,.13,1.00],[-.1,0,.94]],.10);
 polygonMesh('v4_fin',[[0,0,0],[0,1.8,1.05],[0,1.65,1.75],[0,0,1.7]],.07);
 polygonMesh('v4_glass',[[-.63,0,-.60],[.63,0,-.60],[.75,.72,.27],[-.75,.72,.27]],.025);
}
function v4Wheel(b,x,y,z,r=.42,spin=0,steer=0){b.put('cyl','#182833',x,y,z,r*2,.25,r*2,steer,0,PI/2);b.put('cyl','#b5c3bf',x+Math.sign(x||1)*.14,y,z,r*1.30,.03,r*1.30,steer,0,PI/2);for(let j=0;j<5;j++){const a=spin+j*TAU/5;b.beam('#d8ded2',V(x+Math.sign(x||1)*.16,y,z),V(x+Math.sign(x||1)*.16,y+Math.cos(a)*r*.58,z+Math.sin(a)*r*.58),.045);}}
function navLight(b,x,y,z,c,t,phase=0){b.put('sphere',Math.sin(t*3+phase)>.15?c:'#415961',x,y,z,.13,.13,.13,0,0,0,1,true);}
function drawAircraft(b,c,t){const twin=c.kind==='twin',scale=twin?1.32:1;
 b.transform(add(c.pos,V(0,twin?1.68:1.55,0)),c.yaw,c.pitch||0,c.roll||0);const root=b.parent,origin=b.origin;
 b.put('v4_fuselage',c.color,0,0,0,scale,scale,scale);b.put('v4_glass','#345c73',0,.46*scale,-2.05*scale,scale,scale,scale,0,.08);
 for(let s of [-1,1]){b.put('v4_wing',c.color,0,.14*scale,-.90*scale,s*scale,scale,scale);b.put('v4_tailplane',c.color,0,.28*scale,3.25*scale,s*scale,scale,scale);b.box('#4f8595',s*.10,.02,3.8,.11,.25,1.4);for(let j=0;j<(twin?5:2);j++)b.put('sphere','#31546b',s*(.77-j*.015)*scale,.23*scale,(-1.55+j*.70)*scale,.052*scale,.41*scale,.48*scale);
 const engineX=twin?s*2.65:0;if(twin||s===1){b.put('sphere','#d4d8c7',engineX,-.15,-2.1*scale,.74,.78,2.18);b.put('sphere','#385264',engineX,-.15,twin?-3.92:-4.28,.43,.43,.6);const parent=b.parent,org=b.origin;const pos=add(org,bx(parent,V(engineX,-.15,twin?-3.96:-4.50)));b.parent=bmul(parent,basis(0,0,t*(12+(c.throttle||0)*95)));b.origin=pos;for(let j=0;j<3;j++)b.box('#354854',0,.51,0,.16,1.05,.07,0,0,j*TAU/3);b.parent=parent;b.origin=org;}
 b.beam('#aebbb7',V(s*1.15,-.43,.45),V(s*1.62,-1.09,.68),.12);v4Wheel(b,s*1.67,-1.09,.68,.34,c.wheel||0);navLight(b,s*6.63*scale,.2,0,s<0?'#e87066':'#9ce5bd',t,s);}
 b.put('v4_fin',c.color,0,.38*scale,3.04*scale,scale,scale,scale);b.put('v4_fin','#5a8e9d',.05,.77*scale,3.23*scale,.99,scale*.66,scale*.71);b.beam('#9caeac',V(0,-.5,-2.6),V(0,-1.16,-2.6),.13);v4Wheel(b,0,-1.16,-2.6,.27,c.wheel||0,c.steerVisual||0);
 b.box('#d6ad76',0,.89*scale,-.78,.16,.03,2.0);navLight(b,0,1.72*scale,4.1*scale,'#edf6e2',t);b.world();}
function drawHelicopter(b,c,t){b.transform(add(c.pos,V(0,1.65,0)),c.yaw,c.pitch||0,c.roll||0);b.put('v4_heli',c.color,0,0,0);b.put('sphere','#345c72',0,.16,-1.62,1.56,1.20,1.14);for(let s of [-1,1]){b.put('sphere','#3a6375',s*.90,.20,-.45,.04,.8,1.00);b.box('#d8b985',s*.99,-.22,-.1,.07,.09,1.4);b.beam('#737f7b',V(s*.6,-.48,-.8),V(s*1.23,-1.2,-.8),.12);b.beam('#737f7b',V(s*.6,-.48,.9),V(s*1.23,-1.2,.9),.12);b.beam('#394d57',V(s*1.23,-1.25,-2.1),V(s*1.23,-1.25,1.95),.14);navLight(b,s*1.1,.6,.5,s<0?'#f08968':'#84e5b9',t,s);}
 b.put('cyl','#5c6f73',0,1.05,0,.4,1.05,.4);b.put('sphere','#65777d',0,1.63,0,.6,.28,.6);b.box('#263e4c',0,1.69,0,10.5,.07,.24,t*(9+(c.throttle||0)*45));b.box('#263e4c',0,1.70,0,.24,.07,10.5,t*(9+(c.throttle||0)*45));b.put('v4_fin','#476b7c',0,-.03,4.05,.8,.7,.8);b.box('#344e5b',.21,.15,5.08,.05,1.9,.13,0,t*63);b.box('#344e5b',.21,.15,5.08,.05,.13,1.9,0,t*63);b.world();}
function rail(b,a,d){b.beam('#c1c9bb',a,d,.055);for(let i=0;i<=4;i++){const p=add(mul(a,1-i/4),mul(d,i/4));b.beam('#b9c3b9',p,add(p,V(0,-.6,0)),.04);}}
function drawBoat(b,c,t){const yacht=c.kind==='yacht',tug=c.kind==='tug',s=yacht?1.7:tug?1.9:1;const rootY=.34;b.transform(add(c.pos,V(0,rootY,0)),c.yaw,c.pitch||0,c.roll||0);b.put('v4_hull',tug?'#354f5a':c.color,0,0,0,s,s,s);b.put('v4_hull',tug?'#b9694e':'#4b8392',0,-.09,0,s*1.004,s*.40,s*1.003);
 softBox(b,tug?'#b9a47b':'#d4b888',0,.54*s,.0,1.95*s,.18,5.95*s);for(let z=-2.2;z<2.5;z+=.34)b.box('#b79669',0,.643*s,z*s,1.90*s,.012,.022);
 if(yacht||tug){softBox(b,tug?c.color:'#e5e0cd',0,1.13*s,-.25*s,1.8*s,1.00*s,2.72*s);b.box('#315b71',0,1.3*s,-1.62*s,1.66*s,.52*s,.06);for(let side of [-1,1]){b.box('#346179',side*.91*s,1.27*s,-.1*s,.04,.48*s,2.22*s);b.box('#d8d9c5',side*.94*s,.93*s,.08*s,.05,.09*s,2.55*s);rail(b,V(side*1.07*s,1.12*s,-2.9*s),V(side*1.07*s,1.12*s,2.65*s));}
 softBox(b,'#e9e1c9',0,1.76*s,-.15*s,2.02*s,.12,2.95*s);b.beam('#d6dbca',V(0,1.75*s,.30*s),V(0,3.0*s,.30*s),.08);b.box('#f0e3c6',0,2.35*s,.30*s,1.3*s,.09,.16);if(yacht){softBox(b,'#c4aa79',0,1.9*s,.45*s,1.18,.15,1.3);b.put('sphere','#3a5661',0,2.45*s,.3*s,.66,.25,.35);}else{b.put('cyl','#4b4a47',.60,2.05*s,.8*s,.65,1.8,.65);b.put('cyl','#e1bf80',.60,2.85*s,.8*s,.74,.2,.74);for(let side of [-1,1])for(let z of [-2,0,2])b.put('ring','#243b48',side*1.22*s,.43*s,z*s,.9,.9,.9,0,PI/2,PI/2);}
 }else{b.put('v4_glass','#4a7988',0,.66,-.68,1.25,.70,1.5,0,.1);for(let x of [-.5,.5]){softBox(b,'#f1e6cc',x,.91,.9,.72,.26,.80);softBox(b,'#ecd7b0',x,1.2,1.16,.72,.74,.16);}b.put('ring','#2b4757',.52,1.04,.06,.36,.36,.36,0,.55);b.box('#e4d7b5',0,1.03,-.2,1.58,.14,.27);rail(b,V(-.85,1.0,-2.65),V(-1.1,1.0,-.95));rail(b,V(.85,1.0,-2.65),V(1.1,1.0,-.95));}
 for(let side of [-1,1]){b.put('cyl','#354e5c',side*.55*s,.33*s,2.96*s,.36,.85,.38);navLight(b,side*1.02*s,1.20*s,-.85*s,side<0?'#f09179':'#97edc8',t,side);}
 b.world();}
const priorDrawCarV4=drawCar;
drawCar=function(b,c,t){if(c.hidden)return;if(c.medium==='sea')return drawBoat(b,c,t);if(c.kind==='heli')return drawHelicopter(b,c,t);if(c.medium==='air')return drawAircraft(b,c,t);priorDrawCarV4(b,c,t);if(c.kind==='jeep'||c.kind==='interceptor'){b.transform(add(c.pos,V(0,.02,0)),c.yaw,c.pitch||0,c.roll||0);if(c.kind==='jeep'){softBox(b,c.color,0,1.71,.36,1.90,.69,2.17);b.box('#314e5d',0,1.76,-.76,1.7,.48,.06,0,.09);b.box('#273c43',0,2.15,.40,2.0,.16,2.6);for(let x of [-.72,.72])b.box('#5a6258',x,2.31,.50,.065,.14,2.1);b.put('cyl','#20343c',0,1.33,2.38,.83,.25,.83,0,PI/2);for(let x of [-.65,0,.65])b.put('sphere','#f4e4af',x,1.14,-2.26,.27,.27,.13,0,0,0,1,true);}else{b.box('#233b47',0,1.91,0,1.4,.17,.38);for(let x of [-.42,.42])b.box(x<0?'#7ac5e5':'#ef967a',x,2.00,0,.57,.12,.33,0,0,0,1,true);b.box('#b3beb4',0,.46,-2.33,1.93,.26,.19);}b.world();}};
function makeFleetVehicle(kind,pos,yaw=0){const d=FLEET[kind];if(!d)throw Error('Unknown vehicle');const c=makeCar(pos.x,pos.z,d.color,yaw,kind==='sport'||kind==='interceptor');Object.assign(c,{id:'v4-'+kind+'-'+cars.length,kind,medium:d.medium,home:{...pos},homeYaw:yaw,pos:{...pos},prevPos:{...pos},prevYaw:yaw,name:d.name,mods:{...profile.garage[kind]?.mods},throttle:0,vertical:0,gear:1,rpm:0,service:true,vy:0});return c;}
makeExpeditionShapes();
