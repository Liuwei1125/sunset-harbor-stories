// Original dependency-free WebGL renderer. All geometry is generated locally.
const $ = (id) => document.getElementById(id);
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
let seed=731;
function rand(){seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;}
const pick = a=>a[Math.floor(rand()*a.length)];
const COLOR = new Map();
function color(c){if(Array.isArray(c))return c;if(!COLOR.has(c)){let n=parseInt(c.replace('#',''),16);COLOR.set(c,[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]);}return COLOR.get(c);}
function perspective(fovy,aspect,n,f){const q=1/Math.tan(fovy/2);return new Float32Array([q/aspect,0,0,0,0,q,0,0,0,0,(f+n)/(n-f),-1,0,0,2*f*n/(n-f),0]);}
function lookAt(eye,target){let z=norm(sub(eye,target)),x=norm(cross(V(0,1,0),z)),y=cross(z,x);return new Float32Array([x.x,y.x,z.x,0,x.y,y.y,z.y,0,x.z,y.z,z.z,0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);}
function matmul(a,b){let o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;}
function basis(y=0,x=0,z=0){let cy=Math.cos(y),sy=Math.sin(y),cx=Math.cos(x),sx=Math.sin(x),cz=Math.cos(z),sz=Math.sin(z);return [cy*cz, -cy*sz*cx+sy*sx, cy*sz*sx+sy*cx, sz,cz*cx,-cz*sx,-sy*cz,sy*sz*cx+cy*sx,-sy*sz*sx+cy*cx];}
function bmul(a,b){let o=[];for(let r=0;r<3;r++)for(let c=0;c<3;c++)o[r*3+c]=a[r*3]*b[c]+a[r*3+1]*b[3+c]+a[r*3+2]*b[6+c];return o;}
function bx(a,p){return V(a[0]*p.x+a[1]*p.y+a[2]*p.z,a[3]*p.x+a[4]*p.y+a[5]*p.z,a[6]*p.x+a[7]*p.y+a[8]*p.z);}
const ID=basis();
const shapes={};
function tri(out,a,b,c,n){n=n||norm(cross(sub(b,a),sub(c,a)));for(const p of [a,b,c])out.push(p.x,p.y,p.z,n.x,n.y,n.z);}
function createShapes(){
 let box=[];
 for(const [pts,n] of [
  [[[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]],V(0,0,1)],
  [[[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]],V(0,0,-1)],
  [[[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5]],V(1,0,0)],
  [[[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]],V(-1,0,0)],
  [[[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]],V(0,1,0)],
  [[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]],V(0,-1,0)]]){const p=pts.map(v=>V(...v));tri(box,p[0],p[1],p[2],n);tri(box,p[0],p[2],p[3],n);}shapes.box=box;
 for(const cone of [false,true]){let a=[];for(let i=0;i<10;i++){let t=i/10*TAU,t2=(i+1)/10*TAU;let p=V(Math.cos(t)*.5,-.5,Math.sin(t)*.5),q=V(Math.cos(t2)*.5,-.5,Math.sin(t2)*.5),r=V(q.x,.5,q.z),s=V(p.x,.5,p.z);if(cone){tri(a,q,p,V(0,.5,0));}else{let n=V(Math.cos((t+t2)/2),0,Math.sin((t+t2)/2));tri(a,p,q,r,n);tri(a,p,r,s,n);tri(a,V(0,.5,0),r,s,V(0,1,0));}tri(a,V(0,-.5,0),q,p,V(0,-1,0));}shapes[cone?'cone':'cyl']=a;}
 let ball=[];const top=V(0,.5,0),bottom=V(0,-.5,0);for(let i=0;i<8;i++){let t=i/8*TAU,u=(i+1)/8*TAU,p=V(Math.cos(t)*.5,0,Math.sin(t)*.5),q=V(Math.cos(u)*.5,0,Math.sin(u)*.5);tri(ball,q,p,top);tri(ball,p,q,bottom);}shapes.ball=ball;
 let disc=[];for(let i=0;i<24;i++)tri(disc,V(),V(Math.cos(i/24*TAU)*.5,0,Math.sin(i/24*TAU)*.5),V(Math.cos((i+1)/24*TAU)*.5,0,Math.sin((i+1)/24*TAU)*.5),V(0,1,0));shapes.disc=disc;
 let ring=[];const pt=(a,b)=>V((.5+.025*Math.cos(b))*Math.cos(a),(.5+.025*Math.cos(b))*Math.sin(a),.025*Math.sin(b));for(let i=0;i<40;i++)for(let j=0;j<5;j++){let a=i/40*TAU,b=(i+1)/40*TAU,c=j/5*TAU,d=(j+1)/5*TAU;tri(ring,pt(a,c),pt(b,c),pt(b,d));tri(ring,pt(a,c),pt(b,d),pt(a,d));}shapes.ring=ring;
}
class Builder{
 constructor(size=200000){this.data=new Float32Array(size);this.n=0;this.parent=ID;this.origin=V();}
 reset(){this.n=0;this.world();}
 world(){this.parent=ID;this.origin=V();return this;}
 transform(p,y=0,x=0,z=0){this.origin=p;this.parent=basis(y,x,z);return this;}
 ensure(count){if(this.n+count>this.data.length){let d=new Float32Array(Math.max(this.data.length*2,this.n+count));d.set(this.data);this.data=d;}}
 put(shape,c,x,y,z,sx=1,sy=1,sz=1,ry=0,rx=0,rz=0,alpha=1,unlit=false){
  const a=shapes[shape],rgb=color(c),r=bmul(this.parent,basis(ry,rx,rz)),t=add(this.origin,bx(this.parent,V(x,y,z)));this.ensure(a.length/6*10);let o=this.n,d=this.data;
  for(let i=0;i<a.length;i+=6){let px=a[i]*sx,py=a[i+1]*sy,pz=a[i+2]*sz;d[o++]=r[0]*px+r[1]*py+r[2]*pz+t.x;d[o++]=r[3]*px+r[4]*py+r[5]*pz+t.y;d[o++]=r[6]*px+r[7]*py+r[8]*pz+t.z;let nx=unlit?0:a[i+3]/(sx||1),ny=unlit?0:a[i+4]/(sy||1),nz=unlit?0:a[i+5]/(sz||1);d[o++]=r[0]*nx+r[1]*ny+r[2]*nz;d[o++]=r[3]*nx+r[4]*ny+r[5]*nz;d[o++]=r[6]*nx+r[7]*ny+r[8]*nz;d[o++]=rgb[0];d[o++]=rgb[1];d[o++]=rgb[2];d[o++]=alpha;}
  this.n=o;return this;
 }
 box(c,x,y,z,w,h,d,ry=0,rx=0,rz=0,a=1,unlit=false){return this.put('box',c,x,y,z,w,h,d,ry,rx,rz,a,unlit);}
 beam(c,a,b,width=.08,alpha=1,unlit=false){const dv=sub(b,a),l=length(dv),m=mul(add(a,b),.5);return this.put('cyl',c,m.x,m.y,m.z,width,l,width,Math.atan2(dv.x,dv.z),Math.acos(clamp(dv.y/(l||1),-1,1)),0,alpha,unlit);}
}
function shader(gl,type,source){let s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
function program(gl,vs,fs){let p=gl.createProgram();gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,vs));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
class Renderer{
 constructor(canvas){
  this.canvas=canvas;this.gl=canvas.getContext('webgl',{antialias:true,alpha:false,powerPreference:'high-performance'})||canvas.getContext('experimental-webgl');if(!this.gl)throw Error('WebGL is unavailable. Please enable browser hardware acceleration.');const g=this.gl;
  this.p=program(g,`attribute vec3 aPosition;attribute vec3 aNormal;attribute vec4 aColor;uniform mat4 uVP;uniform mediump vec3 uEye;varying mediump vec3 vNormal;varying mediump vec4 vColor;varying mediump float vDistance;varying mediump vec3 vWorld;void main(){vWorld=aPosition;vNormal=aNormal;vColor=aColor;vDistance=distance(aPosition,uEye);gl_Position=uVP*vec4(aPosition,1.);}`,`precision mediump float;varying mediump vec3 vNormal;varying mediump vec4 vColor;varying mediump float vDistance;varying mediump vec3 vWorld;uniform mediump vec3 uEye;void main(){bool unlit=length(vNormal)<.01;vec3 N=normalize(vNormal+vec3(.00001));vec3 L=normalize(vec3(-.65,.95,.45));vec3 E=normalize(uEye-vWorld);float sun=max(dot(N,L),0.);float hemi=.5+.5*N.y;vec3 light=mix(vec3(.43,.48,.56),vec3(.72,.76,.79),hemi)+sun*vec3(.46,.37,.25);vec3 c=unlit?vColor.rgb*1.13:vColor.rgb*light;float blue=step(vColor.r*1.08,vColor.b)*step(vColor.r,vColor.g);float spec=pow(max(dot(N,normalize(L+E)),0.),mix(24.,70.,blue));float fresnel=pow(1.-max(dot(N,E),0.),4.);if(!unlit)c+=spec*mix(.09,.29,blue)+fresnel*blue*vec3(.055,.083,.094);if(abs(vWorld.y)<.03&&!unlit){float grain=fract(sin(dot(floor(vWorld.xz*22.),vec2(12.9898,78.233)))*43758.5453);c*=.97+grain*.06;}float f=smoothstep(100.,285.,vDistance);c=mix(c,vec3(.78,.74,.73),f);gl_FragColor=vec4(c,vColor.a);}`);
  this.loc={pos:g.getAttribLocation(this.p,'aPosition'),normal:g.getAttribLocation(this.p,'aNormal'),color:g.getAttribLocation(this.p,'aColor'),vp:g.getUniformLocation(this.p,'uVP'),eye:g.getUniformLocation(this.p,'uEye')};
  this.sky=program(g,`attribute vec2 aPosition;varying vec2 vUV;void main(){vUV=aPosition*.5+.5;gl_Position=vec4(aPosition,1.,1.);}`,`precision mediump float;varying vec2 vUV;uniform vec2 uSun;uniform float uAspect;void main(){vec3 c=mix(vec3(.95,.75,.61),vec3(.26,.47,.66),smoothstep(.15,1.,vUV.y));float d=length((vUV-uSun)*vec2(uAspect,1.));c+=vec3(.20,.12,.04)*exp(-d*7.);float s=1.-smoothstep(.037,.039,d);c=mix(c,vec3(1.,.91,.68),s);gl_FragColor=vec4(c,1.);}`);
  this.skyPos=g.getAttribLocation(this.sky,'aPosition');this.skySun=g.getUniformLocation(this.sky,'uSun');this.skyAspect=g.getUniformLocation(this.sky,'uAspect');this.skyBuf=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,this.skyBuf);g.bufferData(g.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),g.STATIC_DRAW);this.dynamic=g.createBuffer();this.quality=1;this.resize();
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fatal('\u56fe\u5f62\u4e0a\u4e0b\u6587\u4e22\u5931\uff0c\u8bf7\u5237\u65b0\u9875\u9762\u91cd\u8bd5\u3002');});
 }
 resize(){let mobile=typeof touch!=="undefined"&&touch.enabled;let d=Math.min(devicePixelRatio||1,mobile?1.4:1.7)*this.quality;d=Math.min(d,Math.sqrt((mobile?1350000:3400000)/(innerWidth*innerHeight)));this.canvas.width=Math.max(1,Math.floor(innerWidth*d));this.canvas.height=Math.max(1,Math.floor(innerHeight*d));this.gl.viewport(0,0,this.canvas.width,this.canvas.height);}
 upload(builder){let g=this.gl,b=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,b);g.bufferData(g.ARRAY_BUFFER,builder.data.subarray(0,builder.n),g.STATIC_DRAW);return {buffer:b,count:builder.n/10};}
 begin(vp,eye){const g=this.gl;this.vp=vp;this.eye=eye;g.clearColor(.78,.74,.73,1);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);g.disable(g.DEPTH_TEST);g.disable(g.BLEND);g.useProgram(this.sky);g.bindBuffer(g.ARRAY_BUFFER,this.skyBuf);for(let i=0;i<3;i++)g.disableVertexAttribArray(i);g.enableVertexAttribArray(this.skyPos);g.vertexAttribPointer(this.skyPos,2,g.FLOAT,false,0,0);let sp=project(add(eye,V(-130,105,-250)),vp);g.uniform2f(this.skySun,sp.behind?-10:sp.x,sp.behind?-10:1-sp.y);g.uniform1f(this.skyAspect,innerWidth/innerHeight);g.drawArrays(g.TRIANGLES,0,3);g.enable(g.DEPTH_TEST);g.enable(g.BLEND);g.blendFunc(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA);g.useProgram(this.p);g.uniformMatrix4fv(this.loc.vp,false,vp);g.uniform3f(this.loc.eye,eye.x,eye.y,eye.z);}
 draw(batch,transparent=false){const g=this.gl,l=this.loc;g.bindBuffer(g.ARRAY_BUFFER,batch.buffer);for(let i=0;i<3;i++)g.disableVertexAttribArray(i);g.enableVertexAttribArray(l.pos);g.vertexAttribPointer(l.pos,3,g.FLOAT,false,40,0);g.enableVertexAttribArray(l.normal);g.vertexAttribPointer(l.normal,3,g.FLOAT,false,40,12);g.enableVertexAttribArray(l.color);g.vertexAttribPointer(l.color,4,g.FLOAT,false,40,24);g.depthMask(!transparent);g.drawArrays(g.TRIANGLES,0,batch.count);g.depthMask(true);}
 drawBuilder(b,transparent=false){if(!b.n)return;const g=this.gl;g.bindBuffer(g.ARRAY_BUFFER,this.dynamic);g.bufferData(g.ARRAY_BUFFER,b.data.subarray(0,b.n),g.DYNAMIC_DRAW);this.draw({buffer:this.dynamic,count:b.n/10},transparent);}
}
function project(p,m){const w=m[3]*p.x+m[7]*p.y+m[11]*p.z+m[15];return {x:(m[0]*p.x+m[4]*p.y+m[8]*p.z+m[12])/(w||.001)*.5+.5,y:.5-(m[1]*p.x+m[5]*p.y+m[9]*p.z+m[13])/(w||.001)*.5,behind:w<=0};}
function rayBox(o,d,b,max=300){let lo=0,hi=max;for(const [v,dir,mn,mx] of [[o.x,d.x,b.minx,b.maxx],[o.y,d.y,b.miny||0,b.maxy||b.h],[o.z,d.z,b.minz,b.maxz]]){if(Math.abs(dir)<.000001){if(v<mn||v>mx)return Infinity;}else{let a=(mn-v)/dir,c=(mx-v)/dir;if(a>c){const t=a;a=c;c=t;}lo=Math.max(lo,a);hi=Math.min(hi,c);if(lo>hi)return Infinity;}}return lo;}
function raySphere(o,d,c,r){let a=sub(o,c),b=dot(a,d),cc=dot(a,a)-r*r,h=b*b-cc;if(h<0)return Infinity;let t=-b-Math.sqrt(h);return t>=0?t:Infinity;}
function fatal(message){$('loading').style.display='grid';$('loadlabel').textContent='UNABLE TO START';$('error').style.display='block';$('error').textContent=String(message);}
createShapes();
