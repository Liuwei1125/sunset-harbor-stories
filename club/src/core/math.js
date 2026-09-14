// Engine-neutral meters / Y up / -Z forward. No DOM or engine imports.
const TAU = Math.PI * 2, PI = Math.PI;
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
const mix = (a,b,t) => a+(b-a)*t;
const V = (x=0,y=0,z=0) => ({x,y,z});
const add = (a,b) => V(a.x+b.x,a.y+b.y,a.z+b.z);
const sub = (a,b) => V(a.x-b.x,a.y-b.y,a.z-b.z);
const mul = (a,s) => V(a.x*s,a.y*s,a.z*s);
const dot = (a,b) => a.x*b.x+a.y*b.y+a.z*b.z;
const cross = (a,b) => V(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x);
const length = (a) => Math.hypot(a.x,a.y,a.z);
const norm = (a) => mul(a,1/(length(a)||1));
const dist2 = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
const forward = y => V(-Math.sin(y),0,-Math.cos(y));
const right = y => V(Math.cos(y),0,-Math.sin(y));
const rotate = (p,y) => V(p.x*Math.cos(y)+p.z*Math.sin(y),p.y,-p.x*Math.sin(y)+p.z*Math.cos(y));
const lerpAngle = (a,b,t) => a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
function perspective(fovy,aspect,n,f){const q=1/Math.tan(fovy/2);return new Float32Array([q/aspect,0,0,0,0,q,0,0,0,0,(f+n)/(n-f),-1,0,0,2*f*n/(n-f),0]);}
function lookAt(eye,target){let z=norm(sub(eye,target)),x=norm(cross(V(0,1,0),z)),y=cross(z,x);return new Float32Array([x.x,y.x,z.x,0,x.y,y.y,z.y,0,x.z,y.z,z.z,0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);}
function matmul(a,b){let o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;}
function basis(y=0,x=0,z=0){let cy=Math.cos(y),sy=Math.sin(y),cx=Math.cos(x),sx=Math.sin(x),cz=Math.cos(z),sz=Math.sin(z);return [cy*cz, -cy*sz*cx+sy*sx, cy*sz*sx+sy*cx, sz,cz*cx,-cz*sx,-sy*cz,sy*sz*cx+cy*sx,-sy*sz*sx+cy*cx];}
function bmul(a,b){let o=[];for(let r=0;r<3;r++)for(let c=0;c<3;c++)o[r*3+c]=a[r*3]*b[c]+a[r*3+1]*b[3+c]+a[r*3+2]*b[6+c];return o;}
function bx(a,p){return V(a[0]*p.x+a[1]*p.y+a[2]*p.z,a[3]*p.x+a[4]*p.y+a[5]*p.z,a[6]*p.x+a[7]*p.y+a[8]*p.z);}
const ID=basis();

export { TAU, PI, clamp, mix, V, add, sub, mul, dot, cross, length, norm, dist2, forward, right, rotate, lerpAngle, perspective, lookAt, matmul, basis, bmul, bx, ID };
