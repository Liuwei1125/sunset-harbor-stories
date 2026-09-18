import {v,sub,mul,add,length,norm,clamp,wrap,lerp} from './math.js';
export const TRACKS={
 harbor:{id:'harbor',version:1,name:'港湾短环',subtitle:'长直道重刹 / 发夹 / 连续弯',width:13,sectors:['码头重刹','仓库连弯','灯塔回旋'],nodes:[[0,0,0],[0,0,-180],[0,0,-400],[25,0,-470],[75,0,-460],[95,0,-400],[95,0,-250],[140,0,-200],[215,0,-220],[260,0,-155],[205,0,-65],[260,0,40],[270,0,140],[205,0,210],[75,0,200],[0,0,135]]},
 coast:{id:'coast',version:1,name:'海岸技术线',subtitle:'高速弧线 / 收紧弯 / 海崖起伏',width:12,sectors:['海风高速弯','山脊收紧弯','落日下坡'],nodes:[[0,1,0],[0,1,-200],[-40,3,-380],[15,6,-520],[170,9,-550],[340,11,-510],[420,12,-370],[405,10,-230],[340,9,-175],[300,8,-200],[285,7,-270],[240,6,-300],[200,5,-225],[230,4,-100],[335,3,40],[360,1,170],[275,0,260],[130,0,300],[10,1,225],[-35,1,120]]}
};
function curve(p0,p1,p2,p3,t){return v(...['x','y','z'].map(k=>.5*((2*p1[k])+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t*t+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t*t*t)));}
export function makeTrack(id='harbor'){
 const def=TRACKS[id],nodes=def.nodes.map(p=>v(...p)),raw=[];let total=0;
 for(let i=0;i<nodes.length;i++)for(let j=0;j<80;j++){const p=curve(nodes[wrap(i-1,nodes.length)],nodes[i],nodes[(i+1)%nodes.length],nodes[(i+2)%nodes.length],j/80);if(raw.length)total+=length(sub(p,raw.at(-1).p));raw.push({p,s:total});}
 total+=length(sub(raw[0].p,raw.at(-1).p));raw.push({p:raw[0].p,s:total});
 const count=Math.ceil(total/2.5),ds=total/count,points=[];let n=0;
 for(let i=0;i<count;i++){const s=i*ds;while(raw[n+1].s<s)n++;points.push(add(raw[n].p,mul(sub(raw[n+1].p,raw[n].p),(s-raw[n].s)/(raw[n+1].s-raw[n].s))));}
 const samples=points.map((p,i)=>{const tangent=norm(sub(points[wrap(i+1,count)],points[wrap(i-1,count)]));const side=norm(v(-tangent.z,0,tangent.x));const prev=norm(sub(p,points[wrap(i-4,count)])),next=norm(sub(points[wrap(i+4,count)],p));const curvature=Math.atan2(prev.x*next.z-prev.z*next.x,prev.x*next.x+prev.z*next.z)/(4*ds);return {p,tangent,side,curvature,s:i*ds,index:i};});
 function sample(s,offset=0){const index=Math.floor(wrap(s,total)/ds),t=(wrap(s,total)/ds)-index,a=samples[index],b=samples[(index+1)%count];const p=add(add(a.p,mul(sub(b.p,a.p),t)),mul(a.side,offset));return {...a,p,s:wrap(s,total),yaw:Math.atan2(-a.tangent.x,-a.tangent.z)};}
 function nearest(p,hint=null){let best=null;const narrow=Number.isInteger(hint);const begin=narrow?hint-45:0,end=narrow?hint+45:count-1;
  for(let j=begin;j<=end;j++){const i=wrap(j,count),a=samples[i],b=samples[(i+1)%count];const dx=b.p.x-a.p.x,dz=b.p.z-a.p.z,t=clamp(((p.x-a.p.x)*dx+(p.z-a.p.z)*dz)/(dx*dx+dz*dz));const q=add(a.p,mul(sub(b.p,a.p),t)),d=Math.hypot(p.x-q.x,p.z-q.z);if(!best||d<best.distance)best={...a,p:q,distance:d,offset:(p.x-q.x)*a.side.x+(p.z-q.z)*a.side.z,s:(i+t)*ds};}
  return narrow&&best.distance>45?nearest(p):best;
 }
 const road={positions:[],indices:[]},surface={positions:[],indices:[]};
 function strip(target,width){for(let i=0;i<=count;i++){const a=samples[i%count];for(const sign of [-1,1]){const p=add(a.p,mul(a.side,sign*width/2));target.positions.push(p.x,p.y,p.z);}if(i<count){const a=i*2;target.indices.push(a,a+1,a+2,a+1,a+3,a+2);}}}
 strip(road,def.width);strip(surface,def.width+24);
 return {...def,length:total,ds,samples,road,surface,sample,nearest,sector:s=>Math.min(2,Math.floor(wrap(s,total)/total*3))};
}
export function makeTestTrack(){
 const base=makeTrack('harbor');
 const road={positions:[-120,0,100,260,0,100,-120,0,-400,260,0,-400],indices:[0,1,2,1,3,2]};
 return {...base,id:'test',name:'港湾试车场',width:240,subtitle:'加速 / 制动 / 定圆 / 蛇形 / 路肩',road,surface:road,
  sample:(s,offset=0)=>({p:v(offset,0,-s),yaw:0,side:v(1,0,0),tangent:v(0,0,-1),curvature:0,s:wrap(s,base.length),index:0}),
  nearest:p=>({p:v(p.x,0,p.z),index:0,s:wrap(-p.z,base.length),offset:0,curvature:0})};
}
