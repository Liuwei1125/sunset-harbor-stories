import {TAU,V,length,sub,norm,right,add,mix,mul,clamp,dist2,dot} from './math.js';

export function buildTrack(level,variant=0){
 const points=[],n=200,phase=variant*.15;
 for(let i=0;i<=n;i++){const t=i/n*TAU,r=1+level.wave*Math.sin(3*t+phase)+level.wave*.3*Math.cos(5*t);points.push(V(Math.sin(t)*level.rx*r,level.theme==='canyon'?2.8*(1-Math.cos(2*t)):0,-Math.cos(t)*level.rz*r));}
 let total=0;for(let i=0;i<n;i++){points[i].s=total;total+=length(sub(points[i+1],points[i]));}points[n].s=total;
 const track={points,length:total,width:level.width,n};return track;
}
export function trackAt(track,s,lane=0){
 s=((s%track.length)+track.length)%track.length;const p=track.points;let lo=0,hi=track.n;
 while(lo+1<hi){const mid=(lo+hi)>>1;if(p[mid].s>s)hi=mid;else lo=mid;}
 const a=p[lo],b=p[lo+1],u=(s-a.s)/(b.s-a.s),dir=norm(sub(b,a)),yaw=Math.atan2(-dir.x,-dir.z),r=right(yaw);
 return {pos:add(V(mix(a.x,b.x,u),mix(a.y,b.y,u),mix(a.z,b.z,u)),mul(r,lane)),yaw,pitch:Math.atan2(dir.y,Math.hypot(dir.x,dir.z)),index:lo,s};
}
export function trackNearest(track,pos){
 let best={distance:Infinity};for(let i=0;i<track.n;i++){const a=track.points[i],b=track.points[i+1],dx=b.x-a.x,dz=b.z-a.z,u=clamp(((pos.x-a.x)*dx+(pos.z-a.z)*dz)/(dx*dx+dz*dz),0,1),p=V(a.x+dx*u,mix(a.y,b.y,u),a.z+dz*u),dist=dist2(pos,p);if(dist<best.distance){const yaw=Math.atan2(-dx,-dz);best={distance:dist,pos:p,yaw,pitch:Math.atan2(b.y-a.y,Math.hypot(dx,dz)),index:i,s:mix(a.s,b.s,u),side:dot(sub(pos,p),right(yaw))};}}return best;
}
