import {basis,ID,clamp,dist2} from '../core/math.js';
import {buildScene} from './scene.js';
import {frameScene,jointPose,modeAssets,viewCamera} from './frame.js';
import {createDashboard,paintDashboard} from './dashboard.js';
import {primitive} from './geometry.js';
import {installWebGLLifetimeFixes} from './playcanvas-lifetime.js';

const pc=window.pc,vec=p=>new pc.Vec3(p.x,p.y,p.z),color=h=>new pc.Color().fromString(h),degrees=180/Math.PI;
const rotation=a=>{const m=new pc.Mat4();m.set([a[0],a[3],a[6],0,a[1],a[4],a[7],0,a[2],a[5],a[8],0,0,0,0,1]);return new pc.Quat().setFromMat4(m);};
const scale=s=>Array.isArray(s)?new pc.Vec3(...s):new pc.Vec3(s||1,s||1,s||1);
const walk=(node,fn)=>{fn(node);node.children.forEach(n=>walk(n,fn));};

// Racing is the only supported PlayCanvas view. It consumes exactly the same world and snapshots.
export class PlayCanvasRenderer{
 constructor(canvas,settings,progress){
  this.canvas=canvas;this.settings={...settings};this.progress=progress;this.kind='playcanvas';this.disposed=false;this.lastFrame=null;
  this.app=new pc.Application(canvas,{graphicsDeviceOptions:{antialias:true,alpha:false,preserveDrawingBuffer:false,powerPreference:'high-performance',deviceTypes:['webgl2']}});
  installWebGLLifetimeFixes(this.app.graphicsDevice);
  this.app.graphicsDevice.maxPixelRatio=1;
  if(this.app.graphicsDevice.deviceType!=='webgl2'){this.app.destroy();throw Error('赛车增强视图需要 WebGL 2。');}
  this.abort=new AbortController();addEventListener('resize',()=>this.resize(),{signal:this.abort.signal});
  this.resize();
 }
 async texture(name,srgb=true){const image=new Image();image.src='./assets/textures/'+name;await image.decode();const t=new pc.Texture(this.app.graphicsDevice,{name,width:image.width,height:image.height,srgb,mipmaps:true,anisotropy:4,addressU:pc.ADDRESS_REPEAT,addressV:pc.ADDRESS_REPEAT});t.setSource(image);this.textures.push(t);return t;}
 async setScene(session,progress=this.progress){
  if(session.mode!=='race')throw Error('PlayCanvas 当前只支持赛车。');this.releaseScene();this.session=session;this.spec=buildScene(session);
  this.sceneRoot=new pc.Entity('club venue');this.app.root.addChild(this.sceneRoot);this.materials=new Map();this.textures=[];this.meshes=[];this.buffers=[];this.assets=new Map();this.dynamic=new Map();this.effects=new Map();this.dynamicMaterials=[];this.staticInstances=[];
  const app=this.app,scene=app.scene;
  const [asphalt,normal,grass,rock,panorama]=await Promise.all(['road.png','road-normal.png','grass.png','rock.png','sky.png'].map(name=>this.texture(name,name!=='road-normal.png')));
  panorama.projection=pc.TEXTUREPROJECTION_EQUIRECT;const source=pc.EnvLighting.generateLightingSource(panorama,{size:128}),atlas=pc.EnvLighting.generateAtlas(source,{size:512,numReflectionSamples:128,numAmbientSamples:256}),sky=pc.EnvLighting.generateSkyboxCubemap(panorama,128);this.textures.push(source,atlas,sky);scene.envAtlas=atlas;scene.skybox=sky;scene.skyboxIntensity=.9;scene.ambientLight=new pc.Color(.25,.30,.33);scene.exposure=1.15;scene.fog.type=pc.FOG_LINEAR;scene.fog.color=new pc.Color(.70,.79,.82);scene.fog.start=140;scene.fog.end=410;
  this.camera=new pc.Entity('first-person');this.camera.addComponent('camera',{nearClip:.025,farClip:800,fov:60,clearColor:new pc.Color(.67,.78,.85),toneMapping:pc.TONEMAP_ACES});this.sceneRoot.addChild(this.camera);
  this.pipeline=new pc.CameraFrame(app,this.camera.camera);this.pipeline.rendering.toneMapping=pc.TONEMAP_ACES;this.pipeline.rendering.samples=2;this.pipeline.bloom.intensity=.03;this.pipeline.bloom.blurLevel=4;this.pipeline.grading.enabled=true;this.pipeline.grading.contrast=1.04;this.pipeline.update();
  this.sun=new pc.Entity('morning sun');this.sun.addComponent('light',{type:'directional',color:new pc.Color(1,.94,.83),intensity:2.6,castShadows:true,shadowResolution:1536,shadowDistance:100,numCascades:2,cascadeDistribution:.8,shadowType:pc.SHADOW_PCF3_32F,shadowBias:.1,normalOffsetBias:.018});this.sun.setLocalRotation(new pc.Quat().setFromDirections(new pc.Vec3(0,-1,0),new pc.Vec3(.48,-.78,-.42).normalize()));this.sceneRoot.addChild(this.sun);
  for(const name of ['solid','road','grass','rock','sea','glow']){const m=this.material(name,'#ffffff',name==='sea'?.25:.9,name==='sea'?.35:0);m.diffuseVertexColor=true;if(name==='road'){m.diffuseMap=asphalt;m.normalMap=normal;m.bumpiness=.18;}if(name==='grass')m.diffuseMap=grass;if(name==='rock')m.diffuseMap=rock;if(name==='glow'){m.useLighting=false;m.emissive=new pc.Color(1,1,1);m.emissiveVertexColor=true;}m.update();}
  for(const g of this.spec.meshes)this.entity(g.name,this.geometry(g),this.materials.get(g.material));
  this.spec.labels.forEach(l=>this.label(l));
  progress('正在载入赛车装备',.24);const res=await fetch('./assets/manifest.json');if(!res.ok)throw Error('模型清单加载失败');this.manifest=await res.json();
  const ids=[...new Set([...this.spec.models.map(o=>o.id),...modeAssets.race])];let done=0;
  const loaded=await Promise.allSettled(ids.map(async id=>{for(const lod of modeAssets.race.includes(id)||id==='club-race-gate'?['high','low']:['low']){
    const url='./assets/'+this.manifest.assets[id].lods[lod].file;
    const asset=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('模型加载超时：'+id)),30000);app.assets.loadFromUrl(url,'container',(error,asset)=>{clearTimeout(timer);error?reject(Error('模型加载失败：'+id)):resolve(asset);});});this.assets.set(id+':'+lod,asset);
   }progress('场地与赛车 '+(++done)+' / '+ids.length,.24+.57*done/ids.length);
  }));
  const failed=loaded.find(result=>result.status==='rejected');if(failed)throw failed.reason;
  this.staticModels();this.setQuality(this.settings);progress('正在准备赛车光影',.89);
 }
 material(name,hex,roughness=1,metalness=0){const m=new pc.StandardMaterial();m.name=name;m.diffuse=color(hex);m.useMetalness=true;m.metalness=metalness;m.gloss=1-roughness;m.update();this.materials.set(name,m);return m;}
 geometry(g){const m=new pc.Mesh(this.app.graphicsDevice);m.setPositions(g.positions);m.setNormals(g.normals?.length?g.normals:pc.calculateNormals(g.positions,g.indices));m.setIndices(g.indices);if(g.uvs)m.setUvs(0,g.uvs);if(g.colors)m.setColors(g.colors);m.update();this.meshes.push(m);return m;}
 entity(name,mesh,material,parent=this.sceneRoot,shadows=false){const entity=new pc.Entity(name),mi=new pc.MeshInstance(mesh,material,entity);entity.addComponent('render',{meshInstances:[mi],castShadows:shadows,receiveShadows:true});parent.addChild(entity);return entity;}
 label(l){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#254b43';ctx.fillRect(0,0,1024,128);ctx.strokeStyle='#c9d7b9';ctx.lineWidth=4;ctx.strokeRect(8,8,1008,112);ctx.fillStyle='#f3e9ce';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='600 58px sans-serif';ctx.fillText(l.text,512,64,976);
  const texture=new pc.Texture(this.app.graphicsDevice,{name:l.text,width:1024,height:128,srgb:true});texture.setSource(canvas);this.textures.push(texture);const mat=this.material('lettering '+l.text,'#ffffff',1);mat.diffuseMap=texture;mat.cull=pc.CULLFACE_NONE;mat.update();
  const data={positions:[-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0],normals:[0,0,1,0,0,1,0,0,1,0,0,1],uvs:[0,0,1,0,1,1,0,1],indices:[0,1,2,0,2,3]},entity=this.entity(l.text,this.geometry(data),mat);entity.setLocalPosition(vec(l.pos));entity.setLocalScale(l.width,l.height,1);entity.setLocalEulerAngles(0,l.yaw*degrees,0);
 }
 staticModels(){
  const groups=new Map();for(const o of this.spec.models){const lod=this.assets.has(o.id+':high')?'high':'low',key=`${o.id}:${lod}:${Math.floor(o.pos.x/45)}:${Math.floor(o.pos.z/45)}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);}
  for(const [key,objects] of groups){
   const id=objects[0].id,lod=this.assets.has(id+':high')?'high':'low',template=this.assets.get(id+':'+lod).resource.instantiateRenderEntity();
   for(const component of template.findComponents('render'))for(const source of component.meshInstances){
    const local=source.node.getWorldTransform().clone(),data=new Float32Array(objects.length*16);let bounds=null;
    objects.forEach((o,i)=>{const world=new pc.Mat4().setTRS(vec(o.pos),rotation(o.rotation||basis(o.yaw||0)),scale(o.scale)),combined=new pc.Mat4().mul2(world,local);data.set(combined.data,i*16);const b=new pc.BoundingBox();b.setFromTransformedAabb(source.mesh.aabb,combined);if(bounds)bounds.add(b);else bounds=b;});
    const vb=new pc.VertexBuffer(this.app.graphicsDevice,pc.VertexFormat.getDefaultInstancingFormat(this.app.graphicsDevice),objects.length,{data});this.buffers.push(vb);const e=this.entity('scenery '+key,source.mesh,source.material,this.sceneRoot,id!=='club-meadow'),mi=e.render.meshInstances[0];mi.setInstancing(vb,true);mi.setCustomAabb(bounds);this.staticInstances.push(mi);
   }template.destroy();
  }
 }
 instantiate(o,lod){
  const asset=this.assets.get(o.id+':'+lod)||this.assets.get(o.id+':low'),root=new pc.Entity(o.key),entity=asset.resource.instantiateRenderEntity({castShadows:true,receiveShadows:true});root.addChild(entity);this.sceneRoot.addChild(root);
  const joints=[];walk(root,n=>{const part=n.name.split('joint:')[1];if(part&&this.manifest.assets[o.id].joints[part])joints.push({node:n,name:part,base:n.getLocalPosition().clone(),...this.manifest.assets[o.id].joints[part]});});
  const roleMap=new Map((asset.resource.data?.gltf?.materials||[]).map(m=>[m.name,m.extras?.role||''])),materials=[],clones=new Map();
  for(const c of root.findComponents('render'))for(const mesh of c.meshInstances){
   const source=mesh.material;if(!clones.has(source)){const material=source.clone();clones.set(source,material);this.dynamicMaterials.push(material);materials.push({material,role:roleMap.get(source.name)||'',alpha:material.opacity,blend:material.blendType});}mesh.material=clones.get(source);
  }
  if(o.id==='club-cockpit'){
   const cabin=this.material(o.key+' cabin','#243235',.95);for(const [name,p,s] of [['headliner',[0,1.60,.54],[1.5,.035,.85]],['header',[0,1.49,-.53],[1.42,.035,.065]],['mirror',[.12,1.29,-.40],[.25,.065,.045]]]){const e=this.entity(name,this.geometry(primitive('box')),cabin,root);e.setLocalPosition(...p);e.setLocalScale(...s);}
  }
  let dashboard=null;
  if(o.key==='player-car'&&materials.some(m=>m.role==='dashboard')){
   dashboard=createDashboard();dashboard.texture=new pc.Texture(this.app.graphicsDevice,{name:'live GT instruments',width:1024,height:256,srgb:true,mipmaps:false,minFilter:pc.FILTER_LINEAR,magFilter:pc.FILTER_LINEAR});this.textures.push(dashboard.texture);
   for(const m of materials.filter(m=>m.role==='dashboard')){m.material.emissiveMap=dashboard.texture;m.material.emissiveIntensity=1.4;m.material.update();}
  }
  return {root,joints,materials,dashboard,id:o.id,lod,lastColor:null};
 }
 pose(item,o){if(item.dashboard&&paintDashboard(item.dashboard,o.speed,o.nitro))item.dashboard.texture.setSource(item.dashboard.canvas);item.root.enabled=true;item.root.setLocalPosition(vec(o.pos));item.root.setLocalScale(scale(o.scale));item.root.setLocalRotation(rotation(o.rotation||basis(o.yaw||0)));for(const j of item.joints){const p=jointPose(j.name,j.motion,o);j.node.setLocalPosition(j.base.clone().add(vec(p.offset)));j.node.setLocalRotation(rotation(p.rotation));}const signature=[o.color,o.status,o.alpha].join('/');if(signature!==item.lastColor){item.lastColor=signature;for(const m of item.materials){const c=m.role==='paint'?o.color:['status','club-target'].includes(m.role)?o.status:null;if(c){m.material.diffuse=color(c);if(m.role==='status')m.material.emissive=color(c);}m.material.opacity=(m.alpha??1)*(o.alpha??1);m.material.blendType=o.alpha<1?pc.BLEND_NORMAL:m.blend;m.material.update();}}}
 render(snapshot){
  if(!this.sceneRoot)return;const camera=viewCamera(snapshot,this.canvas.clientWidth/this.canvas.clientHeight),p=vec(camera.eye),target=p.clone().add(vec(camera.dir));this.camera.setLocalPosition(p);this.camera.lookAt(target);this.camera.rotateLocal(0,0,camera.roll*degrees);this.camera.camera.fov=camera.fov*degrees;
  const frame=frameScene(snapshot,this.session.track),used=new Set();
  for(const o of frame.models){if(dist2(o.pos,camera.eye)>220)continue;const lod=(o.equipment||dist2(o.pos,camera.eye)<35)&&this.settings.quality!=='low'?'high':'low',key=o.key+':'+o.id+':'+lod;used.add(key);if(!this.dynamic.has(key))this.dynamic.set(key,this.instantiate(o,lod));this.pose(this.dynamic.get(key),o);}
  for(const [key,item] of this.dynamic)if(!used.has(key))item.root.enabled=false;
  const liveEffects=new Set();for(const e of frame.effects){liveEffects.add(e.key);let item=this.effects.get(e.key);if(!item){const mat=this.material('effect '+e.key,e.color);mat.useLighting=false;mat.emissive=color(e.color);mat.cull=pc.CULLFACE_NONE;const entity=this.entity(e.key,this.geometry(primitive(e.shape)),mat);item={entity,mat};this.effects.set(e.key,item);}item.entity.enabled=true;item.entity.setLocalPosition(vec(e.pos));item.entity.setLocalScale(scale(e.scale));item.entity.setLocalRotation(rotation(e.rotation||ID));item.mat.emissive=color(e.color);item.mat.opacity=e.alpha;item.mat.blendType=e.alpha<1?pc.BLEND_NORMAL:pc.BLEND_NONE;item.mat.update();}
  for(const [key,item] of this.effects)if(!liveEffects.has(key))item.entity.enabled=false;
  const now=performance.now(),ms=this.lastFrame?now-this.lastFrame:16.67;this.lastFrame=now;
  this.app.stats.updateBasic(now,ms/1000,ms,this.app.renderer,this.app.graphicsDevice);this.app.update(0);this.app.render();this.app.fire('frameend');this.app.stats.frameEnd();
 }
 async ready(snapshot){this.render(snapshot);await new Promise(resolve=>requestAnimationFrame(resolve));this.render(snapshot);}
 setQuality(settings){this.settings={...settings};const natural=settings.look!=='classic',high=['auto','high'].includes(settings.quality);if(this.pipeline){this.pipeline.bloom.intensity=natural&&high?.03:0;this.pipeline.rendering.samples=settings.quality==='low'?1:2;this.pipeline.update();this.sun.light.castShadows=settings.quality!=='low'&&natural;this.app.scene.exposure=natural?1.15:1.3;}this.resize();}
 resize(){if(!this.app)return;const q=this.settings.quality==='low'?.72:this.settings.quality==='medium'?.88:1,s=clamp(this.settings.resolution*q,.5,1.5);this.app.setCanvasResolution(pc.RESOLUTION_FIXED,Math.round(innerWidth*s),Math.round(innerHeight*s));}
 project(p){const q=this.camera.camera.worldToScreen(vec(p));return {x:q.x/this.canvas.clientWidth,y:q.y/this.canvas.clientHeight,behind:q.z<0};}
 stats(){const d=this.app.graphicsDevice,s=this.app.stats;return {engine:'PlayCanvas 2.22.1',backend:d.deviceType,width:d.width,height:d.height,fps:s.frame.fps||0,activeMeshes:null,triangles:s.frame.triangles||null,triangleNote:'Pinned production build omits triangle profiling counters',drawCalls:s.drawCalls.total||0,meshes:(this.staticInstances?.length||0)+(this.dynamic?.size||0),materials:(this.materials?.size||0)+(this.dynamicMaterials?.length||0),textures:this.textures?.length||0,dynamicInstances:this.dynamic?.size||0,effectPool:this.effects?.size||0};}
 releaseScene(){
  // Instanced geometry VAOs are device-cached and must leave with this venue.
  this.app.graphicsDevice.unbindVertexArray();this.app.graphicsDevice.clearVertexArrayObjectCache();
  this.pipeline?.destroy();this.pipeline=null;this.sceneRoot?.destroy();this.sceneRoot=null;
  if(this.assets)for(const a of this.assets.values()){a.unload();this.app.assets.remove(a);}this.assets=null;
  this.app.scene.envAtlas=null;this.app.scene.skybox=null;
  this.buffers?.forEach(b=>b.destroy());this.meshes?.forEach(m=>m.destroy());this.materials?.forEach(m=>m.destroy());this.dynamicMaterials?.forEach(m=>m.destroy());this.textures?.forEach(t=>t.destroy());
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.abort.abort();this.releaseScene();this.app.destroy();}
}
