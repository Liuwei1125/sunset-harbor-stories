// Depth-buffered CPU fallback. The simulation and geometry are unchanged.
class SoftwareRenderer{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});if(!this.ctx)throw Error('Canvas is unavailable.');this.software=true;this.quality=1;this.resize();this.queue=[];this.gl={getError:()=>0};}
 resize(){const s=Math.min(1,(typeof touch!=="undefined"&&touch.enabled?720:960)/innerWidth)*this.quality;this.canvas.width=Math.round(innerWidth*s);this.canvas.height=Math.round(innerHeight*s);this.image=this.ctx.createImageData(this.canvas.width,this.canvas.height);this.pixels=new Uint32Array(this.image.data.buffer);this.depth=new Float32Array(this.pixels.length);}
 upload(b){return {data:b.data.subarray(0,b.n),count:b.n/10};}
 begin(vp,eye){this.vp=vp;this.eye=eye;this.queue=[];this.depth.fill(0);const W=this.canvas.width,H=this.canvas.height;for(let y=0;y<H;y++){let t=clamp(y/(H*.84),0,1),r=Math.round(mix(73,203,t)),g=Math.round(mix(130,218,t)),b=Math.round(mix(177,218,t));this.pixels.fill((255<<24)|(b<<16)|(g<<8)|r,y*W,(y+1)*W);}const s=project(add(eye,V(-130,105,-250)),vp);if(!s.behind){let cx=s.x*W,cy=s.y*H,r=H*.04;for(let y=Math.max(0,Math.floor(cy-r));y<Math.min(H,cy+r);y++){let dx=Math.sqrt(Math.max(0,r*r-(y-cy)*(y-cy)));this.pixels.fill(0xffbdf0ff,y*W+clamp(Math.floor(cx-dx),0,W),y*W+clamp(Math.ceil(cx+dx),0,W));}}}
 draw(batch,transparent=false){this.queue.push({batch,transparent});}
 drawBuilder(b,transparent=false){this.queue.push({batch:{data:b.data.subarray(0,b.n),count:b.n/10},transparent});}
 raster(a,b,c,r,g,blue,alpha,transparent){
  const W=this.canvas.width,H=this.canvas.height,pixels=this.pixels,zbuf=this.depth;
  let area=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(area)<.12)return;
  let minx=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),maxx=Math.min(W-1,Math.ceil(Math.max(a[0],b[0],c[0]))),miny=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),maxy=Math.min(H-1,Math.ceil(Math.max(a[1],b[1],c[1])));if(minx>maxx||miny>maxy)return;
  let A=(b[1]-c[1])/area,B=(c[0]-b[0])/area,C=(b[0]*c[1]-c[0]*b[1])/area,D=(c[1]-a[1])/area,E=(a[0]-c[0])/area,F=(c[0]*a[1]-a[0]*c[1])/area;
  let iz0=1/a[2],iz1=1/b[2],iz2=1/c[2],urow=A*(minx+.5)+B*(miny+.5)+C,vrow=D*(minx+.5)+E*(miny+.5)+F;
  const packed=(255<<24)|(blue<<16)|(g<<8)|r;
  for(let y=miny;y<=maxy;y++,urow+=B,vrow+=E){let u=urow,v=vrow,idx=y*W+minx;for(let x=minx;x<=maxx;x++,idx++,u+=A,v+=D){if(u<-.00001||v<-.00001||u+v>1.00001)continue;let iz=u*iz0+v*iz1+(1-u-v)*iz2;if(iz<zbuf[idx]-.000004)continue;if(!transparent||alpha>.99){pixels[idx]=packed;if(!transparent)zbuf[idx]=iz;}else{let dst=pixels[idx],rr=(r*alpha+(dst&255)*(1-alpha))|0,gg=(g*alpha+((dst>>8)&255)*(1-alpha))|0,bb=(blue*alpha+((dst>>16)&255)*(1-alpha))|0;pixels[idx]=(255<<24)|(bb<<16)|(gg<<8)|rr;}}}
 }
 end(){
  const m=this.vp,eye=this.eye,W=this.canvas.width,H=this.canvas.height;let count=0;
  // Opaque depth first, blended details second.
  this.queue.sort((a,b)=>Number(a.transparent)-Number(b.transparent));
  for(const item of this.queue){const d=item.batch.data;for(let i=0;i<d.length;i+=30){
   let nx=d[i+3],ny=d[i+4],nz=d[i+5],nl=Math.hypot(nx,ny,nz),alpha=d[i+9];
   if(alpha>=.99&&nl>.01&&nx*(eye.x-d[i])+ny*(eye.y-d[i+1])+nz*(eye.z-d[i+2])<-.001)continue;
   let p=[];for(let k=0;k<3;k++){let j=i+k*10,x=d[j],y=d[j+1],z=d[j+2];p.push([m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[3]*x+m[7]*y+m[11]*z+m[15]]);}
   if(p.every(a=>a[2]<.09)||p.every(a=>a[0]<-a[2])||p.every(a=>a[0]>a[2])||p.every(a=>a[1]<-a[2])||p.every(a=>a[1]>a[2]))continue;
   let depth=(p[0][2]+p[1][2]+p[2][2])/3;if(depth>(state.car?.medium==='air'?950:650)&&Math.abs(ny)<nl*.7)continue;
   if(p.some(a=>a[2]<.09)){let out=[];for(let k=0;k<p.length;k++){const a=p[k],b=p[(k+1)%p.length],ai=a[2]>=.09,bi=b[2]>=.09;if(ai)out.push(a);if(ai!==bi){let t=(.09-a[2])/(b[2]-a[2]);out.push([mix(a[0],b[0],t),mix(a[1],b[1],t),.09]);}}p=out;}if(p.length<3)continue;
   let pts=p.map(v=>[(v[0]/v[2]*.5+.5)*W,(.5-v[1]/v[2]*.5)*H,v[2]]);
   const lit=nl<.01?1.15:.43+.66*Math.max(0,(-.65*nx+.95*ny+.45*nz)/(1.23592*nl));let fog=clamp((depth-180)/850,0,1);if(ny>nl*.9&&Math.abs(d[i+1]+.23)<.01)fog=0;fog=fog*fog*(3-2*fog);let r=Math.round(clamp(mix(d[i+6]*lit,.78,fog),0,1)*255),g=Math.round(clamp(mix(d[i+7]*lit,.74,fog),0,1)*255),b=Math.round(clamp(mix(d[i+8]*lit,.73,fog),0,1)*255);
   for(let k=1;k<pts.length-1;k++)this.raster(pts[0],pts[k],pts[k+1],r,g,b,alpha,item.transparent);count++;
  }}
  this.ctx.putImageData(this.image,0,0);this.faceCount=count;
 }
}
