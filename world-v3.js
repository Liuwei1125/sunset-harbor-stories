/* Original city extension and collision/navigation broad phase. */
const GARAGE=V(-22,0,29), PICKUP=V(88,0,-44), DROP=V(0,0,112), DEPOT=V(-88,0,-44);
const RACE_ROUTE=[V(0,0,-88),V(88,0,-88),V(88,0,44),V(0,0,88),V(-88,0,88),V(-88,0,0),V(0,0,0)];
const surfaceCache=new Map();
surface=function(b,c,points,flip=false){const ps=flip?points.slice().reverse():points,key=JSON.stringify(ps);let name=surfaceCache.get(key);if(!name){name='surface_'+surfaceCache.size;const out=[],p=ps.map(v=>V(...v));for(let i=1;i<p.length-1;i++)tri(out,p[0],p[i],p[i+1]);shapes[name]=out;surfaceCache.set(key,name);}return b.put(name,c,0,0,0);};
const capturedPut=Builder.prototype.put;
Builder.prototype.put=function(...args){const before=this.records?.length||0,ret=capturedPut.apply(this,args);if(this.capture&&(this.records?.length||0)>before){const rec=this.records[this.records.length-1];if(args[0].startsWith('surface_')){const data=this.data;let minx=Infinity,maxx=-Infinity,minz=Infinity,maxz=-Infinity,miny=Infinity,maxy=-Infinity;for(let i=rec.start;i<rec.end;i+=10){minx=Math.min(minx,data[i]);maxx=Math.max(maxx,data[i]);miny=Math.min(miny,data[i+1]);maxy=Math.max(maxy,data[i+1]);minz=Math.min(minz,data[i+2]);maxz=Math.max(maxz,data[i+2]);}rec.p=V((minx+maxx)/2,(miny+maxy)/2,(minz+maxz)/2);rec.r=Math.hypot(maxx-minx,maxy-miny,maxz-minz)/2;rec.size=Math.max(maxx-minx,maxy-miny,maxz-minz);}}return ret;};
class SpatialIndex{
 constructor(cell=18){this.cell=cell;this.cells=new Map();}
 insert(box){for(let x=Math.floor(box.minx/this.cell);x<=Math.floor(box.maxx/this.cell);x++)for(let z=Math.floor(box.minz/this.cell);z<=Math.floor(box.maxz/this.cell);z++){const k=x+','+z;let a=this.cells.get(k);if(!a){a=[];this.cells.set(k,a);}a.push(box);}}
 query(x,z,r=2){const out=[],seen=new Set();for(let ix=Math.floor((x-r)/this.cell);ix<=Math.floor((x+r)/this.cell);ix++)for(let iz=Math.floor((z-r)/this.cell);iz<=Math.floor((z+r)/this.cell);iz++)for(const b of this.cells.get(ix+','+iz)||[])if(!seen.has(b)){seen.add(b);out.push(b);}return out;}
 ray(o,d,max){const out=[],seen=new Set();for(let t=0;t<=max+this.cell;t+=this.cell*.6){const p=add(o,mul(d,Math.min(max,t)));for(const b of this.query(p.x,p.z,this.cell*.6))if(!seen.has(b)){seen.add(b);out.push(b);}}return out;}
}
const collisionIndex=new SpatialIndex();
function nearbyObstacles(p,r=3){return collisionIndex.cells.size?collisionIndex.query(p.x,p.z,r):colliders;}
function lineClear(a,b){const d=sub(b,a),len=length(d);if(len<.1)return true;const dir=mul(d,1/len);for(const box of collisionIndex.ray(a,dir,len))if(rayBox(a,dir,box,len)<len-.12)return false;return true;}
function footPath(from,to){
 if(lineClear(add(from,V(0,1,0)),add(to,V(0,1,0))))return [V(to.x,0,to.z)];
 const step=6,min=-156,max=156,N=53,idx=(x,z)=>z*N+x,grid=p=>({x:clamp(Math.round((p.x-min)/step),0,N-1),z:clamp(Math.round((p.z-min)/step),0,N-1)}),s=grid(from),goal=grid(to),start=idx(s.x,s.z),end=idx(goal.x,goal.z),open=[start],prev=new Int32Array(N*N).fill(-1),cost=new Float32Array(N*N).fill(Infinity),done=new Uint8Array(N*N);cost[start]=0;
 const h=id=>Math.abs(id%N-goal.x)+Math.abs(Math.floor(id/N)-goal.z);let count=0,best=start;
 while(open.length&&count++<650){let oi=0;for(let j=1;j<open.length;j++)if(cost[open[j]]+h(open[j])<cost[open[oi]]+h(open[oi]))oi=j;const id=open.splice(oi,1)[0];if(done[id])continue;done[id]=1;if(h(id)<h(best))best=id;if(id===end){best=id;break;}const x=id%N,z=Math.floor(id/N);for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz;if(nx<0||nz<0||nx>=N||nz>=N)continue;const ni=idx(nx,nz),wx=min+nx*step,wz=min+nz*step;if(done[ni]||nearbyObstacles(V(wx,0,wz),1).some(b=>wx>b.minx-.8&&wx<b.maxx+.8&&wz>b.minz-.8&&wz<b.maxz+.8))continue;const c=cost[id]+1;if(c<cost[ni]){cost[ni]=c;prev[ni]=id;open.push(ni);}}}
 const path=[];for(let i=best;i!==start&&i>=0;i=prev[i]){path.push(V(min+(i%N)*step,0,min+Math.floor(i/N)*step));if(path.length>150)break;}path.reverse();if(best===end)path.push(V(to.x,0,to.z));return path;
}
function roadPath(from,to){
 const nearest=v=>roadCenters.reduce((a,b)=>Math.abs(b-v)<Math.abs(a-v)?b:a),ax=nearest(from.x),az=nearest(from.z),bx=nearest(to.x),bz=nearest(to.z),out=[];
 if(Math.abs(from.x-ax)<Math.abs(from.z-az)){out.push(V(ax,0,from.z),V(ax,0,bz),V(bx,0,bz));}else out.push(V(from.x,0,az),V(bx,0,az),V(bx,0,bz));out.push(V(to.x,0,to.z));return [V(from.x,0,from.z),...out].filter((p,i,a)=>!i||dist2(p,a[i-1])>.3);
}
const baseBuildDetails=buildStreetDetails;
buildStreetDetails=function(){baseBuildDetails();
 // A small open, drive-through custom shop replaces no existing collision geometry.
 city.box('#203d48',-22,5.55,27.0,22,1.7,.26);pixelText('CUSTOMS',-30.7,6.02,27.17,.33,'#e8d7aa');city.box('#79dcc5',-22,4.71,27.2,22,.08,.08,0,0,0,1,true);
 for(let dx of [-7,0,7]){city.box('#ecd09b',-22+dx,.221,29.5,4,.03,.12);city.box('#ecd09b',-24+dx,.221,25,.12,.03,9);}
 for(let p of [V(-31,0,32),V(-13,0,32)]){softBox(city,'#26464d',p.x,.8,p.z,.8,1.5,.6);city.box('#89e6d2',p.x,1.12,p.z+.31,.60,.57,.01,0,0,0,1,true);}
 // Industrial containers and cargo stacks stay on the pavements.
 for(let i=0;i<3;i++){let x=146,z=-54-i*10;softBox(city,['#b7674c','#486f7d','#b49c62'][i],x,1.72,z,5.6,3.3,7.6);for(let j=-3;j<=3;j++)city.box('#344d56',x+j*.7,1.78,z+3.81,.045,3.0,.04);collider(x,z,5.6,7.6,3.5,'container');}
 // Proper directional baked footprint shadows for buildings (CPU renderer too).
 for(const b of buildings){const dx=b.h*.65/.95,dz=-b.h*.45/.95;const pts=[[b.x-b.w/2,b.z-b.d/2],[b.x+b.w/2,b.z-b.d/2],[b.x+b.w/2,b.z+b.d/2],[b.x-b.w/2,b.z+b.d/2]];const all=[...pts,...pts.map(p=>[p[0]+dx,p[1]+dz])].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const turn=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);let lo=[],hi=[];for(const p of all){while(lo.length>1&&turn(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p);}for(const p of all.slice().reverse()){while(hi.length>1&&turn(hi[hi.length-2],hi[hi.length-1],p)<=0)hi.pop();hi.push(p);}const hull=lo.slice(0,-1).concat(hi.slice(0,-1));const ps=hull.map(([x,z])=>[x,.026,z]);const key='bakedShadow_'+b.x+'_'+b.z,geom=[];for(let j=1;j<ps.length-1;j++)tri(geom,V(...ps[0]),V(...ps[j+1]),V(...ps[j]),V(0,1,0));shapes[key]=geom;shadows.put(key,'#162b40',0,0,0,1,1,1,0,0,0,.27,true);}
 // A jump on the ocean road. Physical height sampling uses the same dimensions.
 surface(city,'#829091',[[128,0,-76],[136,0,-76],[136,1.8,-62],[128,1.8,-62]]);
 surface(city,'#c8c2ae',[[128,0,-76],[128,1.8,-62],[128,0,-62]]);surface(city,'#c8c2ae',[[136,0,-76],[136,0,-62],[136,1.8,-62]]);
 for(let i=0;i<5;i++)city.box('#ead58b',132,i*.25+.15,-75+i*2,4,.03,.13);
};
const originalGround=ground;
ground=function(p){if(p.x>128&&p.x<136&&p.z>=-76&&p.z<-62)return (p.z+76)/14*1.8;return originalGround(p);};
