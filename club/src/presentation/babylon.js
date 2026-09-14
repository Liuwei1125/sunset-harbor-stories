import {basis,ID,V,dist2,clamp} from '../core/math.js';
import {buildScene} from './scene.js';
import {frameScene,jointPose,modeAssets,viewCamera} from './frame.js';
import {createDashboard,paintDashboard} from './dashboard.js';
import {primitive} from './geometry.js';

const B=window.BABYLON,vec=p=>new B.Vector3(p.x,p.y,p.z),rgb=h=>B.Color3.FromHexString(h).toLinearSpace();
const rotation=a=>B.Quaternion.FromRotationMatrix(B.Matrix.FromValues(a[0],a[3],a[6],0,a[1],a[4],a[7],0,a[2],a[5],a[8],0,0,0,0,1));
const scale=s=>Array.isArray(s)?new B.Vector3(...s):new B.Vector3(s||1,s||1,s||1);
const timeout=(p,ms,label)=>{let timer;return Promise.race([p,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label)),ms);})]).finally(()=>clearTimeout(timer));};

export class BabylonRenderer{
 constructor(canvas,settings,progress){
  this.canvas=canvas;this.settings={...settings};this.progress=progress;this.kind='babylon';this.disposed=false;
  this.engine=new B.Engine(canvas,true,{stencil:true,powerPreference:'high-performance',preserveDrawingBuffer:false,disableWebGL2Support:false});
  if(this.engine.webGLVersion<2){this.engine.dispose();throw Error('新版场地需要 WebGL 2。可以使用原版离线入口。');}
  this.abort=new AbortController();addEventListener('resize',()=>this.resize(),{signal:this.abort.signal});
 }
 async setScene(session,progress=this.progress){
  this.releaseScene();this.session=session;this.spec=buildScene(session);
  const scene=this.scene=new B.Scene(this.engine);scene.useRightHandedSystem=true;scene.clearColor=new B.Color4(.67,.78,.85,1);
  scene.skipPointerMovePicking=true;scene.fogMode=B.Scene.FOGMODE_LINEAR;scene.fogStart=140;scene.fogEnd=410;scene.fogColor=new B.Color3(.70,.79,.82);
  this.camera=new B.FreeCamera('first-person',new B.Vector3(0,1.65,0),scene);this.camera.inputs.clear();this.camera.minZ=.025;this.camera.maxZ=800;
  this.camera.fovMode=B.Camera.FOVMODE_VERTICAL_FIXED;this.instrumentation=new B.SceneInstrumentation(scene);
  scene.imageProcessingConfiguration.toneMappingEnabled=true;scene.imageProcessingConfiguration.toneMappingType=B.ImageProcessingConfiguration.TONEMAPPING_ACES;scene.imageProcessingConfiguration.exposure=1.15;scene.imageProcessingConfiguration.contrast=1.04;
  const env=new B.EquiRectangularCubeTexture('./assets/textures/sky.png',scene,128,false,true);scene.environmentTexture=env;scene.environmentIntensity=.9;
  const sky=scene.createDefaultSkybox(env,true,1400,0,false);sky.applyFog=false;sky.isPickable=false;
  const sun=this.sun=new B.DirectionalLight('morning sun',new B.Vector3(.48,-.78,-.42),scene);sun.position=new B.Vector3(-80,130,70);sun.intensity=2.6;sun.diffuse=new B.Color3(1,.94,.83);
  const fill=new B.HemisphericLight('open sky',new B.Vector3(0,1,0),scene);fill.intensity=.55;fill.diffuse=new B.Color3(.78,.86,1);fill.groundColor=new B.Color3(.34,.32,.24);
  if(session.mode==='darts'){
   const lamp=new B.PointLight('board lamp',new B.Vector3(0,2.7,-1.7),scene);lamp.diffuse=new B.Color3(1,.87,.62);lamp.intensity=8;lamp.range=5;
   fill.intensity=.85;scene.environmentIntensity=.7;
  }
  this.shadow=new B.CascadedShadowGenerator(1536,sun);this.shadow.numCascades=2;this.shadow.lambda=.8;this.shadow.shadowMaxZ=100;this.shadow.usePercentageCloserFiltering=true;this.shadow.filteringQuality=B.ShadowGenerator.QUALITY_LOW;this.shadow.bias=.001;this.shadow.normalBias=.018;this.shadow.stabilizeCascades=true;
  this.pipeline=new B.DefaultRenderingPipeline('finish',true,scene,[this.camera]);this.pipeline.fxaaEnabled=true;this.pipeline.samples=1;this.pipeline.bloomThreshold=1.0;this.pipeline.bloomWeight=.09;this.pipeline.bloomKernel=24;
  this.materials=new Map();this.containers=new Map();this.dynamic=new Map();this.effects=new Map();this.staticBatches=[];
  for(const name of ['solid','road','grass','rock','sea','glow']){
   const m=new B.PBRMaterial(name,scene);m.albedoColor=B.Color3.White();m.metallic=name==='sea'?.35:0;m.roughness=name==='sea'?.25:.9;m.backFaceCulling=true;
   if(['road','grass','rock'].includes(name)){m.albedoTexture=new B.Texture('./assets/textures/'+name+'.png',scene);m.albedoTexture.anisotropicFilteringLevel=4;}
   if(name==='road'){m.bumpTexture=new B.Texture('./assets/textures/road-normal.png',scene);m.bumpTexture.level=.18;m.bumpTexture.gammaSpace=false;}
   if(name==='glow'){m.unlit=true;m.emissiveColor=B.Color3.White();}
   this.materials.set(name,m);
  }
  for(const g of this.spec.meshes){const m=this.mesh(g.name,g,this.materials.get(g.material));m.freezeWorldMatrix();m.receiveShadows=true;}
  for(const label of this.spec.labels)this.label(label);
  progress('正在载入场地与装备',.24);
  const response=await fetch('./assets/manifest.json');if(!response.ok)throw Error('模型清单加载失败');this.manifest=await response.json();
  const ids=[...new Set([...this.spec.models.map(m=>m.id),...modeAssets[session.mode]])];let complete=0;
  const loaded=await Promise.allSettled(ids.map(async id=>{
   const nativeHigh=modeAssets[session.mode].includes(id)||id==='club-dartboard'||id==='club-race-gate';
   for(const lod of nativeHigh?['high','low']:['low']){
    const file=this.manifest.assets[id]?.lods[lod]?.file;if(!file)throw Error('模型清单缺失：'+id);
    const c=await timeout(B.SceneLoader.LoadAssetContainerAsync('./assets/',file,scene),30000,'模型加载超时：'+id);
    this.containers.set(id+':'+lod,c);
    c.meshes.forEach(m=>{m.isPickable=false;m.receiveShadows=true;});
   }
   progress('场地与装备 '+(++complete)+' / '+ids.length,.24+.57*complete/ids.length);
  }));
  const failed=loaded.find(result=>result.status==='rejected');if(failed)throw failed.reason;
  this.staticModels();this.setQuality(this.settings);
  progress('正在准备光影',.87);
 }
 mesh(name,g,material){const m=new B.Mesh(name,this.scene),d=new B.VertexData();d.positions=g.positions;d.indices=g.indices;d.normals=g.normals;if(g.uvs)d.uvs=g.uvs;if(g.colors)d.colors=g.colors;d.applyToMesh(m);m.material=material;m.overrideMaterialSideOrientation=B.Material.CounterClockWiseSideOrientation;m.isPickable=false;return m;}
 label(l){
  const w=1024,h=128,dt=new B.DynamicTexture('label '+l.text,{width:w,height:h},this.scene,true),ctx=dt.getContext();ctx.fillStyle='#254b43';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#c9d7b9';ctx.lineWidth=4;ctx.strokeRect(8,8,w-16,h-16);ctx.fillStyle='#f3e9ce';ctx.font='600 58px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(l.text,w/2,h/2,w-48);dt.update();
  const m=new B.StandardMaterial('lettering',this.scene);m.diffuseTexture=dt;m.emissiveColor=new B.Color3(.3,.3,.3);m.specularColor=B.Color3.Black();m.backFaceCulling=false;
  const p=B.MeshBuilder.CreatePlane(l.text,{width:l.width,height:l.height},this.scene);p.position=vec(l.pos);p.rotation.y=l.yaw;p.material=m;p.isPickable=false;
 }
 staticModels(){
  const groups=new Map();
  for(const o of this.spec.models){const lod=this.containers.has(o.id+':high')?'high':'low',key=`${o.id}:${lod}:${Math.floor(o.pos.x/45)}:${Math.floor(o.pos.z/45)}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);}
  for(const [key,objects] of groups){
   const id=objects[0].id,lod=this.containers.has(id+':high')?'high':'low',container=this.containers.get(id+':'+lod);
   for(const source of container.meshes){
    if(!source.geometry)continue;source.computeWorldMatrix(true);const local=source.getWorldMatrix().clone(),matrices=new Float32Array(objects.length*16);
    objects.forEach((o,i)=>{const world=B.Matrix.Compose(scale(o.scale),rotation(o.rotation||basis(o.yaw||0)),vec(o.pos));local.multiply(world).copyToArray(matrices,i*16);});
    const mesh=source.clone('scenery '+key,null,true);mesh.makeGeometryUnique();mesh.parent=null;mesh.position.setAll(0);mesh.rotation.setAll(0);mesh.rotationQuaternion=B.Quaternion.Identity();mesh.scaling.setAll(1);mesh.setEnabled(true);mesh.thinInstanceSetBuffer('matrix',matrices,16,true);mesh.thinInstanceRefreshBoundingInfo();mesh.isPickable=false;mesh.receiveShadows=true;
    if(id!=='club-meadow')this.shadow.addShadowCaster(mesh);this.staticBatches.push(mesh);
   }
  }
 }
 instantiate(o,lod){
  const c=this.containers.get(o.id+':'+lod)||this.containers.get(o.id+':low');
  const instance=c.instantiateModelsToScene(n=>o.key+':'+n,true,{doNotInstantiate:true}),root=new B.TransformNode(o.key,this.scene);
  instance.rootNodes.forEach(n=>n.parent=root);
  const joints=[];for(const n of root.getDescendants(false)){const part=n.name.split('joint:')[1];if(part&&this.manifest.assets[o.id].joints[part])joints.push({node:n,name:part,base:n.position.clone(),...this.manifest.assets[o.id].joints[part]});}
  const materials=[];for(const mesh of root.getChildMeshes()){
   mesh.isPickable=false;mesh.receiveShadows=true;this.shadow.addShadowCaster(mesh);
   const role=mesh.metadata?.gltf?.extras?.role||mesh.material?.metadata?.gltf?.extras?.role||'';
   if(mesh.material)materials.push({material:mesh.material,role,alpha:mesh.material.alpha,emission:mesh.material.emissiveColor?.clone()});
  }
  // The authored cockpit is open at its top; add only the close cabin fixtures.
  if(o.id==='club-cockpit'){
   const cabin=new B.PBRMaterial('cabin lining',this.scene);cabin.albedoColor=rgb('#243235');cabin.roughness=.95;cabin.metallic=0;
   for(const [name,p,s] of [['headliner',[0,1.60,.54],[1.5,.035,.85]],['header',[0,1.49,-.53],[1.42,.035,.065]],['mirror',[.12,1.29,-.40],[.25,.065,.045]]]){const m=B.MeshBuilder.CreateBox(name,{width:s[0],height:s[1],depth:s[2]},this.scene);m.position.set(...p);m.parent=root;m.material=cabin;m.isPickable=false;}
  }
  let dashboard=null;
  if(o.key==='player-car'&&materials.some(m=>m.role==='dashboard')){
   dashboard=createDashboard();dashboard.texture=new B.DynamicTexture('live GT instruments',dashboard.canvas,this.scene,false);
   for(const m of materials.filter(m=>m.role==='dashboard')){m.material.emissiveTexture=dashboard.texture;m.material.emissiveIntensity=1.4;}
  }
  return {root,instance,joints,materials,dashboard,id:o.id,lod,lastColor:null};
 }
 pose(item,o){
  if(item.dashboard&&paintDashboard(item.dashboard,o.speed,o.nitro))item.dashboard.texture.update(false);
  item.root.setEnabled(true);item.root.position.copyFrom(vec(o.pos));item.root.scaling.copyFrom(scale(o.scale));item.root.rotationQuaternion=rotation(o.rotation||basis(o.yaw||0));
  for(const j of item.joints){const p=jointPose(j.name,j.motion,o);j.node.position.copyFrom(j.base).addInPlace(vec(p.offset));j.node.rotationQuaternion=rotation(p.rotation);}
  const signature=[o.color,o.status,o.alpha].join('/');if(signature!==item.lastColor){
   item.lastColor=signature;for(const m of item.materials){
    const c=m.role==='paint'?o.color:['status','club-target'].includes(m.role)?o.status:null;
    if(c){m.material.albedoColor=rgb(c);if(m.role==='status')m.material.emissiveColor=rgb(c).scale(.8);}
    m.material.alpha=(m.alpha??1)*(o.alpha??1);
   }
  }
 }
 render(snapshot){
  if(!this.scene||!this.containers)return;
  const p=viewCamera(snapshot,this.canvas.clientWidth/this.canvas.clientHeight);this.camera.position.copyFrom(vec(p.eye));this.camera.setTarget(vec({x:p.eye.x+p.dir.x,y:p.eye.y+p.dir.y,z:p.eye.z+p.dir.z}));this.camera.rotation.z=p.roll;this.camera.fov=p.fov;
  const frame=frameScene(snapshot,this.session.track),used=new Set();
  for(const o of frame.models){
   if(dist2(o.pos,p.eye)>220)continue;
   const lod=(o.equipment||dist2(o.pos,p.eye)<35)&&this.settings.quality!=='low'?'high':'low',key=o.key+':'+o.id+':'+lod;used.add(key);
   if(!this.dynamic.has(key))this.dynamic.set(key,this.instantiate(o,lod));this.pose(this.dynamic.get(key),o);
  }
  for(const [key,item] of this.dynamic)if(!used.has(key))item.root.setEnabled(false);
  const liveEffects=new Set();for(const e of frame.effects){
   liveEffects.add(e.key);let item=this.effects.get(e.key);
   if(!item){const mat=new B.StandardMaterial('effect '+e.key,this.scene);mat.disableLighting=true;mat.backFaceCulling=false;const mesh=this.mesh(e.key,primitive(e.shape),mat);item={mesh,mat};this.effects.set(e.key,item);}
   item.mesh.setEnabled(true);item.mesh.position.copyFrom(vec(e.pos));item.mesh.scaling.copyFrom(scale(e.scale));item.mesh.rotationQuaternion=rotation(e.rotation||ID);item.mat.emissiveColor=B.Color3.FromHexString(e.color);item.mat.alpha=e.alpha;
  }
  for(const [key,e] of this.effects)if(!liveEffects.has(key))e.mesh.setEnabled(false);
  this.engine.beginFrame();this.scene.render();this.engine.endFrame();
 }
 async ready(snapshot){this.render(snapshot);await timeout(this.scene.whenReadyAsync(),30000,'光影准备超时，请重试或选择流畅画质。');this.render(snapshot);}
 resize(){if(!this.engine)return;const q=this.settings.quality==='low'?.72:this.settings.quality==='medium'?.88:1,renderScale=clamp(this.settings.resolution*q,.5,1.5);this.engine.setHardwareScalingLevel(1/renderScale);this.engine.resize();}
 setQuality(settings){
  this.settings={...settings};const high=['high','auto'].includes(settings.quality),natural=settings.look!=='classic';
  if(this.scene){this.scene.shadowsEnabled=settings.quality!=='low'&&natural;this.pipeline.bloomEnabled=high&&natural;this.scene.imageProcessingConfiguration.exposure=natural?1.15:1.3;this.scene.environmentIntensity=natural?.9:.75;this.sun.intensity=natural?2.6:2.1;}
  this.resize();
 }
 project(p){const pos=B.Vector3.Project(vec(p),B.Matrix.Identity(),this.scene.getTransformMatrix(),this.camera.viewport.toGlobal(this.engine.getRenderWidth(),this.engine.getRenderHeight()));return {x:pos.x/this.engine.getRenderWidth(),y:pos.y/this.engine.getRenderHeight(),behind:pos.z<0||pos.z>1};}
 stats(){const s=this.scene,e=this.engine;return {engine:'Babylon.js 9.26.0',backend:'WebGL '+e.webGLVersion,width:e.getRenderWidth(),height:e.getRenderHeight(),fps:e.getFps(),activeMeshes:s?.getActiveMeshes().length||0,triangles:(s?.getActiveIndices()||0)/3,drawCalls:e._drawCalls?.current??null,meshes:s?.meshes.length||0,materials:s?.materials.length||0,textures:s?.textures.length||0,dynamicInstances:this.dynamic?.size||0,effectPool:this.effects?.size||0};}
 releaseScene(){this.instrumentation?.dispose();this.instrumentation=null;if(this.containers)for(const c of this.containers.values())c.dispose();this.containers=null;this.scene?.dispose();this.scene=null;}
 dispose(){if(this.disposed)return;this.disposed=true;this.abort.abort();this.releaseScene();this.engine.dispose();}
}
