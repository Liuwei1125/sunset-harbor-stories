/* Export original model examples without a browser or third-party packages. */
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const element={style:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},setAttribute(){},dataset:{}};
const sandbox={console,TextEncoder,TextDecoder,Uint8Array,Uint32Array,Int32Array,Float32Array,DataView,ArrayBuffer,Map,Set,Math,JSON,Date,performance:{now:()=>0},innerWidth:1440,innerHeight:900,devicePixelRatio:1,matchMedia:()=>({matches:false}),navigator:{maxTouchPoints:0},document:{getElementById:()=>element,addEventListener(){},querySelector:()=>element,body:element},window:{addEventListener(){}},setTimeout(){},clearTimeout(){},requestAnimationFrame(){}};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(root,'bundle.js'),'utf8'),sandbox);
// Preserve this command's 20 legacy procedural editing samples. Blender assets
// have their own reproducible exporter and never overwrite these files.
vm.runInContext('drawCar=drawVehicleBeforeWorkshop7;',sandbox);
let assetSpecs=[['comet-gt',`const c={pos:V(),yaw:0,kind:'sport',sport:true,color:'#d18b57',hp:100,wheel:0};drawCar(b,c,0);`],['atlas-cargo',`const c={pos:V(),yaw:0,kind:'van',sport:false,color:'#729b9d',hp:100,wheel:0};drawCar(b,c,0);`],['city-runner',`drawPerson(b,V(),0,0,0,false);`],['patrol-drone',`drawDrone(b,{pos:V(0,0,0),yaw:0,hp:100,alive:true},0);`]];
const fleet=vm.runInContext('Object.keys(FLEET)',sandbox);
for(const kind of fleet.filter(k=>!['sport','van'].includes(k)))assetSpecs.push([kind,`const def=FLEET['${kind}'];const c={pos:V(),yaw:0,kind:'${kind}',medium:def.medium,sport:false,color:def.color,hp:100,wheel:0};drawCar(b,c,0);`]);
for(let i=3;i<8;i++)assetSpecs.push([['pistol','smg','shotgun','assault-rifle','sniper-rifle','grenade','molotov','rocket-launcher'][i],`weaponModel(b,${i},0,0,0);`]);
assetSpecs.push(['greycrow-rifleman',`drawCombatUnit(b,{pos:V(),yaw:0,role:'rifle',mode:'ENGAGE',phase:0,moving:false,flash:0},0);`]);
let manifest={format:'glTF 2.0 / GLB',provenance:'Original procedural meshes authored for this game; no Rockstar assets.',assets:[]};
for(const [name,draw]of assetSpecs){const result=vm.runInContext(`(()=>{renderer={software:false};cam.eye=V(0,2,5);const b=new Builder(400000);${draw}const bytes=encodeGLB(b,'${name}');const parsed=parseStaticGLB(bytes);return {bytes,triangles:parsed.triangles,materials:parsed.parts.length};})()`,sandbox);const file=name+'.glb';fs.writeFileSync(path.join(root,'assets',file),Buffer.from(result.bytes));manifest.assets.push({file,bytes:result.bytes.byteLength,triangles:result.triangles,materials:result.materials,static:true});}
fs.writeFileSync(path.join(root,'assets','manifest.json'),JSON.stringify(manifest,null,2));console.log(JSON.stringify(manifest,null,2));
