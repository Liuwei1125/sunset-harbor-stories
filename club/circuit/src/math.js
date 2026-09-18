export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const approach=(a,b,d)=>a+clamp(b-a,-d,d);
export const wrap=(a,n)=>((a%n)+n)%n;
export const angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
export const v=(x=0,y=0,z=0)=>({x,y,z});
export const add=(a,b)=>v(a.x+b.x,a.y+b.y,a.z+b.z);
export const sub=(a,b)=>v(a.x-b.x,a.y-b.y,a.z-b.z);
export const mul=(a,s)=>v(a.x*s,a.y*s,a.z*s);
export const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
export const cross=(a,b)=>v(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x);
export const length=a=>Math.hypot(a.x,a.y,a.z);
export const norm=a=>mul(a,1/(length(a)||1));
export function rotate(a,q){const t=mul(cross(q,a),2);return add(a,add(mul(t,q.w),cross(q,t)));}
export const yawQ=a=>({x:0,y:Math.sin(a/2),z:0,w:Math.cos(a/2)});
export const time=t=>!Number.isFinite(t)?'—':`${Math.floor(t/60)}:${(t%60).toFixed(3).padStart(6,'0')}`;
