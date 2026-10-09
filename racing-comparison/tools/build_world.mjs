import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {random,roadX,roadY} from '../shared/simulation.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),rng=random(812),meshes=[],objects=[];
function geometry(name,material){return{name,material,positions:[],normals:[],uvs:[],colors:[],indices:[]};}
function ellipsoid(g,p,s,color,rings=6,sides=10,rough=.09){
 const off=g.positions.length/3;
 for(let y=0;y<=rings;y++)for(let i=0;i<=sides;i++){
  const a=i/sides*Math.PI*2,b=y/rings*Math.PI,normal=[Math.sin(b)*Math.cos(a),Math.cos(b),Math.sin(b)*Math.sin(a)],k=1+rough*Math.sin(i*2.8+y*3.2+p[0]);
  g.positions.push(...normal.map((v,j)=>+(v*s[j]*k+p[j]).toFixed(4)));g.normals.push(...normal);g.uvs.push(i/sides,y/rings);
  const c=(.82+.18*normal[1])*(.93+rng()*.14);g.colors.push(...color.map(v=>v*c),1);
  if(y<rings&&i<sides){const a=off+y*(sides+1)+i,b=a+sides+1;g.indices.push(a,b,a+1,a+1,b,b+1);}
 }
}
for(let type=0;type<3;type++){
 const g=geometry('tree'+type,'foliage');
 const height=type===1?10:7;
 for(let k=0;k<17;k++){
  const a=k*2.4,r=.5+Math.sqrt(k/17)*(type===1?1.8:3.0),y=height-1.7-Math.pow(k/17,.8)*2;
  ellipsoid(g,[Math.cos(a)*r,y,Math.sin(a)*r],[1.45,1.2,1.35],[.24,.34,.13],5,8,.17);
 }
 meshes.push(g);
 const b=geometry('trunk'+type,'bark');ellipsoid(b,[0,2.5,0],[.24,2.6,.25],[.4,.34,.27],4,7,0);meshes.push(b);
}
const rock=geometry('boulder','rock');ellipsoid(rock,[0,0,0],[1,1,1],[1,1,1],8,12,.19);meshes.push(rock);
for(let z=-100;z<8000;z+=18){
 for(let side of [-1,1]){
  const s=z+rng()*15,lateral=(12+rng()*40)*side,scale=.75+rng()*.72;
  if(side<0&&Math.sin(s/650)>.4)continue;
  const type=Math.floor(rng()*3),p=[roadX(s)+lateral,roadY(s)-.3+Math.max(0,Math.abs(lateral)-12)*.08,s];
  objects.push({mesh:'tree'+type,position:p,scale:[scale,scale,scale],yaw:rng()*6.28});
  objects.push({mesh:'trunk'+type,position:p,scale:[scale,scale,scale],yaw:0});
  if(rng()<.3){const r=2+rng()*3;objects.push({mesh:'boulder',position:[p[0]+side*7,p[1],s+10],scale:[r,r*.65,r*.8],yaw:rng()*6.28});}
 }
}
const json=JSON.stringify({meshes,objects});
fs.writeFileSync(path.join(root,'shared/world.json'),json);fs.writeFileSync(path.join(root,'unity/Assets/Resources/Racer/world.json'),json);
console.log(`${meshes.length} mesh templates, ${objects.length} placements, ${json.length} bytes`);
