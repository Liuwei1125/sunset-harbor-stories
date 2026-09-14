import {V,add,basis,bmul,bx,norm,ID} from '../core/math.js';

const cache=new Map();
export function primitive(kind){
  if(cache.has(kind))return cache.get(kind);
  const g={positions:[],normals:[],uvs:[],indices:[]};
  const vert=(p,n,u,v)=>{g.positions.push(...p);g.normals.push(...n);g.uvs.push(u,v);};
  if(kind==='box'){
    for(const [n,u,v] of [[[1,0,0],[0,0,-1],[0,1,0]],[[-1,0,0],[0,0,1],[0,1,0]],[[0,1,0],[1,0,0],[0,0,-1]],[[0,-1,0],[1,0,0],[0,0,1]],[[0,0,1],[1,0,0],[0,1,0]],[[0,0,-1],[-1,0,0],[0,1,0]]]){
      const a=g.positions.length/3;
      for(const [x,y] of [[-1,-1],[1,-1],[1,1],[-1,1]])vert(n.map((q,i)=>(q+u[i]*x+v[i]*y)/2),n,(x+1)/2,(y+1)/2);
      g.indices.push(a,a+1,a+2,a,a+2,a+3);
    }
  }else if(kind==='sphere'){
    const rows=8,cols=12;
    for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){
      const a=y/rows*Math.PI,b=x/cols*Math.PI*2,n=[Math.sin(a)*Math.cos(b),Math.cos(a),Math.sin(a)*Math.sin(b)];vert(n.map(v=>v*.5),n,x/cols,y/rows);
      if(y<rows&&x<cols){const i=y*(cols+1)+x,j=i+cols+1;g.indices.push(i,j+1,i+1,i,j,j+1);}
    }
  }else{
    const cols=12,top=kind==='cone'?0:.5;
    for(let x=0;x<cols;x++){
      const a=x/cols*Math.PI*2,b=(x+1)/cols*Math.PI*2,i=g.positions.length/3;
      for(const [ang,y,r] of [[a,-.5,.5],[a,.5,top],[b,.5,top],[b,-.5,.5]]){const n=norm(V(Math.cos(ang),kind==='cone'?.5:0,Math.sin(ang)));vert([Math.cos(ang)*r,y,Math.sin(ang)*r],[n.x,n.y,n.z],ang/(Math.PI*2),y+.5);}
      g.indices.push(i,i+1,i+2,i,i+2,i+3);
      for(const [y,r,sgn] of [[-.5,.5,-1],[.5,top,1]]){const j=g.positions.length/3;vert([0,y,0],[0,sgn,0],.5,.5);for(const t of (sgn>0?[b,a]:[a,b]))vert([Math.cos(t)*r,y,Math.sin(t)*r],[0,sgn,0],(Math.cos(t)+1)/2,(Math.sin(t)+1)/2);g.indices.push(j,j+1,j+2);}
    }
  }
  if(kind==='sphere')for(let i=0;i<g.indices.length;i+=3)[g.indices[i+1],g.indices[i+2]]=[g.indices[i+2],g.indices[i+1]];
  cache.set(kind,g);return g;
}

export const colorLinear=hex=>[1,3,5].map(i=>{const n=parseInt(hex.slice(i,i+2),16)/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;});
const surface=color=>color==='#53656a'?'road':['#a4ae85','#9ca97f','#a4ad9a'].includes(color)?'grass':['#b4a17b','#b5a181','#c1ac8d','#a79983'].includes(color)?'rock':color==='#367d89'?'sea':'solid';

// A portable scene description. Batches have local bounds, so both engines can cull them.
export class SceneDraft {
  constructor(){this.batches=new Map();this.models=[];this.labels=[];this.origin=V();this.parent=ID;}
  transform(p,yaw=0){this.origin=p;this.parent=basis(yaw);}
  world(){this.origin=V();this.parent=ID;}
  box(color,x,y,z,sx,sy,sz,yaw=0,pitch=0,roll=0,alpha=1,unlit=false){this.put('box',color,x,y,z,sx,sy,sz,yaw,pitch,roll,alpha,unlit);}
  put(kind,color,x,y,z,sx,sy,sz,yaw=0,pitch=0,roll=0,alpha=1,unlit=false){
    const p=add(this.origin,bx(this.parent,V(x,y,z))),rot=bmul(this.parent,basis(yaw,pitch,roll)),size=[sx,sy,sz],mat=unlit?'glow':surface(color);
    const key=`${mat}:${Math.floor(p.x/45)}:${Math.floor(p.z/45)}`;
    if(!this.batches.has(key))this.batches.set(key,{name:key,material:mat,positions:[],normals:[],uvs:[],colors:[],indices:[]});
    const g=this.batches.get(key),shape=primitive(kind),base=g.positions.length/3,rgb=colorLinear(['road','grass','rock'].includes(mat)?'#ffffff':color);
    for(let i=0;i<shape.positions.length;i+=3){
      const q=add(p,bx(rot,V(...shape.positions.slice(i,i+3).map((v,j)=>v*size[j])))),n=norm(bx(rot,V(...shape.normals.slice(i,i+3).map((v,j)=>v/(size[j]||1)))));
      g.positions.push(q.x,q.y,q.z);g.normals.push(n.x,n.y,n.z);g.colors.push(...rgb,alpha);
      if(mat==='grass'||mat==='rock')g.uvs.push(q.x/8,q.z/8);
      else if(mat==='road')g.uvs.push(.34+shape.uvs[i/3*2]*.13,.04+shape.uvs[i/3*2+1]*.42);
      else g.uvs.push(...shape.uvs.slice(i/3*2,i/3*2+2));
    }
    g.indices.push(...shape.indices.map(i=>i+base));
  }
  model(id,pos,yaw=0,options={}){this.models.push({id,pos,yaw,...options});}
  label(text,pos,width=2,height=.45,yaw=0,style='sign'){this.labels.push({text,pos,width,height,yaw,style});}
  finish(){return {meshes:[...this.batches.values()],models:this.models,labels:this.labels};}
}
