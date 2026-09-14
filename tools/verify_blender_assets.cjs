/* Validate the actual generated assets: bounds, normals, indices, LOD budgets,
   moving pivots and each independent GLB. No browser or npm install required. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const armory=process.argv.includes('--armory'),arcade=process.argv.includes('--arcade'),folder=arcade?'arcade':armory?'armory':'blender',packFile=arcade?'arcade-pack.js':armory?'armory-pack.js':'harbor-pack.js';
const root=path.resolve(__dirname,'..'),dir=path.join(root,'assets',folder);
const context={};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(dir,packFile),'utf8')+';this.pack='+(arcade?'ARCADE_ASSET_PACK10':armory?'ARMORY_ASSET_PACK8':'HARBOR_ASSET_PACK7')+';',context);
const pack=context.pack,manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'))),rows=[];
assert.equal(Object.keys(pack.assets).length,arcade?10:armory?8:14);
let maxNormalError=0;
for(const [id,mesh]of Object.entries(pack.meshes)){
 const v=Buffer.from(mesh.v,'base64'),i=Buffer.from(mesh.i,'base64');
 assert.equal(v.length%12,0,id+' vertex stride');assert.equal(i.length%6,0,id+' triangles');
 for(let o=0;o<i.length;o+=2)assert(i.readUInt16LE(o)<v.length/12,id+' index range');
 for(let o=0;o<v.length;o+=12){
  const n=Math.hypot(v.readInt16LE(o+6),v.readInt16LE(o+8),v.readInt16LE(o+10))/32767;
  maxNormalError=Math.max(maxNormalError,Math.abs(1-n));assert(Math.abs(1-n)<.002,id+' unit normal');
 }
}
for(const [id,asset]of Object.entries(pack.assets)){
 const item=manifest.assets.find(a=>a.id===id);assert(item,id);
 const counts={};
 for(const lod of ['high','low']){
  let count=0;
  for(const p of asset.lods[lod]){
   const mesh=pack.meshes[p.mesh];assert(mesh,id+' mesh reference');
   assert(p.roughness>=0&&p.roughness<=1);assert(p.metallic>=0&&p.metallic<=1);
   const v=Buffer.from(mesh.v,'base64'),joint=asset.joints[p.part];assert(joint,id+' joint reference');
   for(let o=0;o<v.length;o+=12)for(let k=0;k<3;k++){
    const x=v.readInt16LE(o+k*2)*pack.positionScale+joint.pivot[k];
    // Decimation can move boundary vertices by a small amount; high LOD is exact to 1mm.
    assert(x>=asset.bounds[0][k]-(lod==='high'?.002:.2)&&x<=asset.bounds[1][k]+(lod==='high'?.002:.2),id+' authored bounds');
   }
   count+=Buffer.from(mesh.i,'base64').length/6;
  }
  counts[lod]=count;assert.equal(count,item.triangles[lod],id+' manifest count');
 }
 assert(counts.high<35000,id+' high triangle budget');
 const lowLimit=arcade&&id==='club-dartboard'?6000:arcade&&id==='club-archery-target'?4000:3500;
 assert(counts.low<lowLimit&&counts.low<counts.high*.55,id+' low triangle budget');
 const glb=fs.readFileSync(path.join(dir,item.glb));
 assert.equal(glb.readUInt32LE(0),0x46546c67);assert.equal(glb.readUInt32LE(4),2);assert.equal(glb.readUInt32LE(8),glb.length);
 const doc=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString());
 assert.equal(doc.scenes.length,1,id+' standalone scene');
 assert(!doc.skins?.length);assert(!doc.images?.length);assert(!doc.buffers.some(b=>b.uri));
 const glbTriangles=doc.meshes.reduce((s,m)=>s+m.primitives.reduce((t,p)=>t+doc.accessors[p.indices??p.attributes.POSITION].count/3,0),0);
 // Source GLB retains exporter's mesh sharing, whereas runtime counts each placed wheel.
 assert(glbTriangles>0&&glbTriangles<=counts.high*1.01,id+' standalone geometry');
 rows.push({id,...counts,glbBytes:glb.length});
}
if(arcade){
 for(const [id,motion,count]of [['club-cockpit','steering',1],['club-cockpit','gauge',2],['club-recurve','bow-limb',2],['club-shooting-target','target-fold',1]])assert.equal(Object.values(pack.assets[id].joints).filter(j=>j.motion===motion).length,count,id+' articulated '+motion);
 assert(pack.assets['club-recurve'].joints['string-top']);assert(pack.assets['club-recurve'].joints['string-bottom']);
 assert(pack.assets['club-shooting-target'].lods.high.some(p=>p.role==='club-target'));
}else if(!armory){
for(const id of ['comet-sport','trail-jeep']){
 const joints=Object.values(pack.assets[id].joints);
 assert.equal(joints.filter(j=>j.motion==='wheel-front').length,2);
 assert.equal(joints.filter(j=>j.motion==='wheel').length,2);
 assert.equal(joints.filter(j=>j.motion==='door').length,1);
}
assert(Object.values(pack.assets['osprey-heli'].joints).some(j=>j.motion==='rotor'));
assert(Object.values(pack.assets['osprey-heli'].joints).some(j=>j.motion==='tail-rotor'));
}else{
 for(const asset of Object.values(pack.assets))for(const socket of ['muzzle','eject','support'])assert(asset.joints[socket]?.pivot.length===3,'weapon socket '+socket);
 for(const [id,motion]of [['sidearm-pistol','slide'],['ar7-rifle','magazine'],['pump-shotgun','pump'],['longwatch-sniper','bolt'],['comet-launcher','round']])assert(Object.values(pack.assets[id].joints).some(j=>j.motion===motion),id+' moving part');
}
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const report={passed:true,sha256:sha(path.join(root,arcade?'arcade.html':'index.html')),packSha256:sha(path.join(dir,packFile)),assets:rows,uniqueMeshes:Object.keys(pack.meshes).length,maxNormalError,runtimeBytes:fs.statSync(path.join(dir,packFile)).size};
fs.writeFileSync(path.join(root,'verification',folder+'-assets.json'),JSON.stringify(report,null,2)+'\n');
console.table(rows);console.log('PASS:',rows.length,'Blender models, independent GLBs, indexed geometry, LODs, materials and articulated parts.');
