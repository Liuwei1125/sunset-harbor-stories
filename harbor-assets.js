/* Blender-authored Harbor Workshop models. All bytes are bundled for file:// play.
   Rendering only: chassis physics, mission targets, saves and simulation stay owned
   by their existing modules. No asynchronous fetch or third-party runtime required. */
const WORKSHOP7 = {
 assets: HARBOR_ASSET_PACK7.assets,
 placements: [],
 decoded: new Map(),
 registered: new Map(),
 stats: {high:0,low:0,instances:0},
 vehicleAssets: {sport:'comet-sport',jeep:'trail-jeep',heli:'osprey-heli',speedboat:'stingray-boat'},
};

function decodeWorkshopMesh7(id){
 if(WORKSHOP7.decoded.has(id))return WORKSHOP7.decoded.get(id);
 const src=HARBOR_ASSET_PACK7.meshes[id];
 const bytes=s=>{const raw=atob(s),b=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)b[i]=raw.charCodeAt(i);return new DataView(b.buffer);};
 const v=bytes(src.v),ix=bytes(src.i),out=new Float32Array(ix.byteLength/2*6);
 for(let i=0,o=0;i<ix.byteLength;i+=2){const p=ix.getUint16(i,true)*12;
  for(let k=0;k<3;k++)out[o++]=v.getInt16(p+k*2,true)*HARBOR_ASSET_PACK7.positionScale;
  for(let k=0;k<3;k++)out[o++]=v.getInt16(p+6+k*2,true)/32767;
 }
 WORKSHOP7.decoded.set(id,out);return out;
}

function workshopParts7(id,lod){
 const key=id+'/'+lod;
 if(WORKSHOP7.registered.has(key))return WORKSHOP7.registered.get(key);
 const parts=WORKSHOP7.assets[id].lods[lod].map(p=>{
  // Geometry can share a GPU buffer whenever the authored surface parameters match.
  const name='workshop_'+p.mesh+'_'+p.roughness+'_'+p.metallic+'_'+Number(p.unlit);
  if(!shapes[name]){shapes[name]=decodeWorkshopMesh7(p.mesh);SHAPE_MATERIALS.set(name,p);}
  return {...p,name};
 });
 WORKSHOP7.registered.set(key,parts);
 if(lod==='high'){
  const low=workshopParts7(id,'low');
  for(const p of parts){
   const caster=low.find(q=>q.part===p.part&&q.role===p.role&&q.color.join(',')===p.color.join(',')&&q.roughness===p.roughness&&q.metallic===p.metallic&&q.unlit===p.unlit);
   SHAPE_SHADOW_MESHES.set(p.name,caster?.name||null);
  }
 }
 return parts;
}

function workshopLOD7(p,owner){
 const distance=dist2(p,cam.eye),edge=Math.min(78,RENDER.detail*.85);
 // Small hysteresis keeps slow camera movement from repeatedly switching meshes.
 const high=!renderer.software&&RENDER.tier>0&&distance<edge+(owner?.workshopLOD==='high'?7:0);
 const lod=high?'high':'low';if(owner)owner.workshopLOD=lod;return lod;
}

function drawWorkshop7(b,id,p,yaw=0,options={}){
 const asset=WORKSHOP7.assets[id];if(!asset)return false;
 const owner=options.car||options.owner,lod=options.lod||workshopLOD7(p,owner),car=options.car;
 const scale=options.scale||[1,1,1],s=Array.isArray(scale)?scale:[scale,scale,scale];
 const root=bmul(basis(yaw,car?.pitch||0,car?.roll||0),[s[0],0,0,0,s[1],0,0,0,s[2]]);
 const previousParent=b.parent,previousOrigin=b.origin;
 for(const part of workshopParts7(id,lod)){
  const joint=asset.joints[part.part]||{pivot:[0,0,0]},pivot=V(...joint.pivot);
  let rotation=ID;
  if(car){
   const spin=car.wheel||0,steer=car.steerVisual||0;
   if(joint.motion==='wheel-front')rotation=basis(steer,spin,0);
   else if(joint.motion==='wheel')rotation=basis(0,spin,0);
   else if(joint.motion==='door')rotation=basis((car.door||0)*1.12);
   // Time comes from fixed simulation; pause and render interpolation never advance it.
   else if(joint.motion==='rotor')rotation=basis(options.time*(state.car===car?32+Math.abs(car.throttle||0)*22:1.4));
   else if(joint.motion==='tail-rotor')rotation=basis(0,options.time*(state.car===car?75:2.8));
   else if(joint.motion==='rudder')rotation=basis(clamp(steer,-.5,.5));
  }
  b.origin=add(p,bx(root,pivot));b.parent=bmul(root,rotation);
  let c=part.role==='paint'?(car?.color||options.color||part.color):part.color;
  if(car?.hp<=0)c=part.unlit?'#293035':'#43494a';
  else if(part.role==='brake'&&car&&!car.braking)c=part.color.map(x=>x*.65);
  else if(part.role==='status'&&options.status==='inactive')c='#507b70';
  b.put(part.name,c,0,0,0,1,1,1,0,0,0,1,part.unlit);
 }
 b.parent=previousParent;b.origin=previousOrigin;
 WORKSHOP7.stats[lod]++;WORKSHOP7.stats.instances++;
 return true;
}

function placeWorkshop7(id,x,y,z,yaw=0,scale=1,colorOverride){
 if(!WORKSHOP7.assets[id])return false;
 WORKSHOP7.placements.push({id,pos:V(x,y,z),yaw,scale,color:colorOverride});return true;
}

const drawVehicleBeforeWorkshop7=drawCar;
drawCar=function(b,c,t){
 if(c.hidden)return;
 const id=WORKSHOP7.vehicleAssets[c.kind];
 if(!id||c.customModel)return drawVehicleBeforeWorkshop7(b,c,t);
 drawWorkshop7(b,id,add(c.pos,V(0,c.medium==='sea'?.34:.04,0)),c.yaw,{car:c,time:t});
 // Preserve existing police beacons and delivery feedback for customized sports cars.
 if(c.police){b.transform(c.pos,c.yaw,c.pitch||0,c.roll||0);
  for(const s of [-1,1])b.box(Math.floor(t*8)%2===(s<0?0:1)?(s<0?'#63cfff':'#ff7063'):'#304555',s*.35,1.63,.20,.5,.12,.28,0,0,0,1,true);
  b.world();
 }
 if(state.car===c&&contract?.type==='delivery'&&contract.stage>0){b.transform(c.pos,c.yaw);softBox(b,'#d7b17e',0,1.22,1.48,.62,.35,.55);b.world();}
};

const renderActorsBeforeWorkshop7=renderWorldActors;
renderWorldActors=function(alpha){
 WORKSHOP7.stats.high=WORKSHOP7.stats.low=WORKSHOP7.stats.instances=0;
 renderActorsBeforeWorkshop7(alpha);
 if(regionId!=='coast')return;
 for(const p of WORKSHOP7.placements){
  const r=p.id==='quay-container'?8:4;
  if(isActorVisible(p.pos,r))drawWorkshop7(dynamic,p.id,p.pos,p.yaw,{scale:p.scale,color:p.color,owner:p,status:p.id==='relay-terminal'&&experience.mission?.terminal?'inactive':undefined});
 }
};

// A compact read-only inspection surface for asset validation and visual QA.
window.__workshop7={assets:WORKSHOP7.assets,stats:WORKSHOP7.stats,
 get placements(){return WORKSHOP7.placements;},
 get loadedMeshes(){return WORKSHOP7.decoded.size;},
 draw:drawWorkshop7,parts:workshopParts7,
};
