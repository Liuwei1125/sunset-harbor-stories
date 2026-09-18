import {lerp,clamp} from './math.js';
export class Renderer {
 constructor(canvas){this.B=globalThis.BABYLON;this.engine=new this.B.Engine(canvas,true,{preserveDrawingBuffer:true,stencil:true},true);this.engine.setHardwareScalingLevel(Math.max(1,devicePixelRatio/1.5));this.resize=()=>this.engine.resize();window.addEventListener('resize',this.resize);this.scene=null;this.generation=0;this.containers=[];this.models=[];this.frameTimes=[];this.elapsed=0;}
 async load(session,progress){const generation=++this.generation;this.clear();const B=this.B;const scene=this.scene=new B.Scene(this.engine);scene.useRightHandedSystem=true;scene.clearColor=new B.Color4(.62,.73,.77,1);scene.fogMode=B.Scene.FOGMODE_EXP2;scene.fogDensity=.0012;scene.fogColor=new B.Color3(.62,.73,.77);scene.ambientColor=new B.Color3(.4,.44,.43);
  const camera=this.camera=new B.FreeCamera('driving',new B.Vector3(0,4,10),scene);camera.minZ=.035;camera.maxZ=1800;camera.fov=.9;camera.inputs.clear();
  const ambient=new B.HemisphericLight('sky',new B.Vector3(0,1,0),scene);ambient.intensity=1.05;ambient.groundColor=new B.Color3(.3,.28,.25);
  const sun=this.sun=new B.DirectionalLight('late sun',new B.Vector3(-.55,-.8,-.24),scene);sun.intensity=2.2;sun.diffuse=new B.Color3(1,.84,.63);sun.shadowMinZ=1;sun.shadowMaxZ=90;sun.orthoLeft=-17;sun.orthoRight=17;sun.orthoTop=17;sun.orthoBottom=-17;sun.autoUpdateExtends=false;
  this.shadow=new B.ShadowGenerator(1024,sun);this.shadow.usePercentageCloserFiltering=true;this.shadow.bias=.0004;this.shadow.normalBias=.025;
  scene.imageProcessingConfiguration.exposure=1.05;scene.imageProcessingConfiguration.toneMappingEnabled=true;scene.imageProcessingConfiguration.toneMappingType=B.ImageProcessingConfiguration.TONEMAPPING_ACES;
  this.makeWorld(session.track);progress('正在载入车辆',.35);
  const id=session.settings.car,response=await fetch(`./assets/${id}/manifest.json`);if(!response.ok)throw Error('车辆清单加载失败');this.manifest=await response.json();
  for(let i=0;i<session.entries.length;i++){
   const lod=i?'low':session.settings.quality==='low'?'low':'high';const container=await B.SceneLoader.LoadAssetContainerAsync(`./assets/${id}/`,`${id}.${lod}.glb`,scene);
   if(generation!==this.generation){container.dispose();return false;}container.addAllToScene();this.containers.push(container);const root=new B.TransformNode('vehicle-'+i,scene);for(const n of container.rootNodes)n.parent=root;
   const joints=new Map(container.transformNodes.filter(n=>n.name.startsWith('joint:')).map(n=>[n.name,{node:n,origin:n.position.clone()}]));
   for(const mesh of container.meshes){mesh.receiveShadows=true;if(mesh.getTotalVertices()>0)this.shadow.addShadowCaster(mesh);}
   const color=i?['','#e2bd66','#dedad0','#855c5b'][i]:['#'+(this.manifest.paint||'3696ad'),'#e7e1d1','#bb5946'][session.settings.paint%3];
   for(const material of container.materials)if(material.name==='Body paint'||id==='su7'&&material.name.startsWith('01 ')){material.albedoColor=B.Color3.FromHexString(color).toLinearSpace();material.environmentIntensity=.65;}
   const model={root,joints,container};this.models.push(model);
   if(i===0){this.telemetry=id==='su7'?globalThis.SU7Telemetry.create(scene,B):globalThis.PerformanceTelemetry.create(scene,B);this.telemetry.attach(container,this.manifest);}
   progress(`车辆就绪 ${i+1}/${session.entries.length}`,.35+.55*(i+1)/session.entries.length);
  }
  const ghostMat=new B.StandardMaterial('ghost',scene);ghostMat.diffuseColor=new B.Color3(.2,.95,.85);ghostMat.emissiveColor=new B.Color3(.15,.5,.4);ghostMat.alpha=.18;ghostMat.disableLighting=true;
  this.ghost=B.MeshBuilder.CreateBox('personal best',{width:1.85,height:1.15,depth:4.5},scene);this.ghost.material=ghostMat;this.ghost.isPickable=false;
  this.followPosition=null;this.followTarget=null;this.elapsed=0;return true;
 }
 material(name,color){const B=this.B;if(['asphalt','dry grass'].includes(name)){const m=new B.PBRMaterial(name,this.scene);m.albedoColor=B.Color3.FromHexString(color).toLinearSpace();m.metallic=0;m.roughness=1;return m;}const m=new B.StandardMaterial(name,this.scene);m.diffuseColor=B.Color3.FromHexString(color).toLinearSpace();m.specularColor=new B.Color3(.06,.06,.06);return m;}
 mesh(name,data,material,lift=0){const B=this.B,m=new B.Mesh(name,this.scene),vd=new B.VertexData();vd.positions=data.positions.map((x,i)=>i%3===1?x+lift:x);vd.indices=data.indices;vd.normals=[];B.VertexData.ComputeNormals(vd.positions,vd.indices,vd.normals);if(vd.normals.filter((x,i)=>i%3===1).reduce((a,b)=>a+b,0)<0)vd.normals=vd.normals.map(x=>-x);vd.applyToMesh(m);material.backFaceCulling=false;m.material=material;m.receiveShadows=true;return m;}
 makeWorld(track){const B=this.B;this.mesh('runoff',track.surface,this.material('dry grass','#747d5d'),-.015);const asphalt=this.material('asphalt','#3b4140');this.mesh('asphalt',track.road,asphalt,.015);
  const sea=B.MeshBuilder.CreateGround('sea',{width:5000,height:5000},this.scene);sea.position.y=-5.2;sea.material=this.material('sea','#417b88');
  const stripes=this.material('white markings','#d6d5c6'),kerbRed=this.material('kerb red','#b84d3c'),kerbWhite=this.material('kerb white','#dad5c6'),wall=this.material('barrier','#b6bcb4');const groups=new Map();
  const box=(name,p,scale,rotation,mat)=>{let prototype=groups.get(name),m;if(!prototype){m=B.MeshBuilder.CreateBox(name,{size:1},this.scene);m.material=mat;groups.set(name,m);}else m=prototype.createInstance(name+'-i');m.position.set(p.x,p.y,p.z);m.scaling.set(...scale);m.rotation.y=rotation;return m;};
  if(track.id!=='test')for(let i=0;i<track.samples.length;i+=4){const a=track.samples[i],b=track.samples[(i+4)%track.samples.length],len=Math.hypot(b.p.x-a.p.x,b.p.z-a.p.z),yaw=Math.atan2(b.p.x-a.p.x,b.p.z-a.p.z),mid={x:(a.p.x+b.p.x)/2,y:(a.p.y+b.p.y)/2,z:(a.p.z+b.p.z)/2};for(const sign of [-1,1]){
    const point=(dist,y)=>({x:mid.x+a.side.x*dist*sign,y:mid.y+y,z:mid.z+a.side.z*dist*sign});
    box('line',point(track.width/2-.14,.029),[.1,.025,len],yaw,stripes);
    if(Math.abs(a.curvature)>.009)box(i%8?'red kerb':'white kerb',point(track.width/2+.35,.05),[.7,.08,len],yaw,i%8?kerbRed:kerbWhite);
    box('wall',point(track.width/2+10,.6),[.6,1.2,len+.1],yaw,wall);
  }}
  const start=track.sample(0);for(let i=0;i<12;i++)for(let j=0;j<2;j++)box('start'+((i+j)%2),{x:start.p.x+(i-5.5)*track.width/12,y:start.p.y+.04,z:start.p.z+j*1.2},[track.width/12,.03,1.2],0,(i+j)%2?stripes:this.material('checker'+i+j,'#222b2b'));
  const muted=this.material('harbor warehouse','#879890'),brick=this.material('shipping containers','#a86042');
  if(track.id!=='test')for(let i=0;i<32;i++){const a=track.sample(i*track.length/32),dist=track.width/2+24+(i%5)*8,sign=i%2?1:-1;box(i%3?'warehouse':'container',{x:a.p.x+a.side.x*dist*sign,y:a.p.y+((i%3)?4:1.4),z:a.p.z+a.side.z*dist*sign},i%3?[14,8,20]:[2.5,2.8,12],a.yaw,i%3?muted:brick);}
  const post=this.material('sign post','#334c48');if(track.id!=='test')for(const s of [0,track.length/3,track.length*2/3]){const a=track.sample(s);box('gate',{x:a.p.x,y:a.p.y+5.7,z:a.p.z},[track.width+1,.7,.5],a.yaw,post);for(const sign of [-1,1])box('post',{x:a.p.x+a.side.x*sign*(track.width/2+.4),y:a.p.y+2.8,z:a.p.z+a.side.z*sign*(track.width/2+.4)},[.3,5.6,.3],a.yaw,post);}
  const board=(label,p,yaw=0)=>{const tex=new B.DynamicTexture('sign '+label,{width:512,height:128},this.scene,false),ctx=tex.getContext();ctx.fillStyle='#153b39';ctx.fillRect(0,0,512,128);ctx.fillStyle='#f2e8ca';ctx.font='bold 60px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,256,64);tex.update();const mat=new B.StandardMaterial('sign '+label,this.scene);mat.diffuseTexture=tex;mat.emissiveColor=B.Color3.White();mat.disableLighting=true;mat.backFaceCulling=false;const m=B.MeshBuilder.CreatePlane('sign',{width:5,height:1.25},this.scene);m.material=mat;m.position.set(p.x,p.y,p.z);m.rotation.y=yaw;};
  if(track.id==='test'){
   for(const [x,z,sx,sz] of [[-120,-150,1.2,500],[260,-150,1.2,500],[70,100,380,1.2],[70,-400,380,1.2]])box('test boundary',{x,y:.6,z},[sx,1.2,sz],0,wall);
   for(let i=0;i<10;i++){const cone=B.MeshBuilder.CreateCylinder('slalom cone',{diameterTop:.05,diameterBottom:.7,height:.8,tessellation:12},this.scene);cone.material=brick;cone.position.set(65+(i%2?3:-3),.4,-i*20);}
   const points=[];for(let i=0;i<=100;i++)points.push(new B.Vector3(150+40*Math.cos(i/100*Math.PI*2),.04,-150+40*Math.sin(i/100*Math.PI*2)));B.MeshBuilder.CreateLines('40 m skidpad',{points},this.scene).color=new B.Color3(.9,.8,.5);
   for(let i=0;i<5;i++)box('test kerb',{x:30,y:.06,z:-30-i*3},[4,.12,.9],0,kerbRed);
   box('braking barrier',{x:0,y:.7,z:-380},[30,1.4,1.2],0,wall);
   for(const [label,x,z] of [['ACCEL / BRAKE',-10,12],['SLALOM',65,25],['40m SKIDPAD',150,-80],['KERB',30,-20],['150',-9,-150],['100',-9,-200],['50',-9,-250]])board(label,{x,y:2,z});
  }else{
   let previous=-150;for(let i=20;i<track.samples.length-20;i++){const a=track.samples[i];if(Math.abs(a.curvature)>.025&&a.s-previous>130){previous=a.s;for(const d of [100,50]){const m=track.sample(a.s-d,track.width/2+1.5);board(String(d),{x:m.p.x,y:m.p.y+1.2,z:m.p.z},m.yaw);}}}
   for(let i=0;i<4;i++){const x=-80-i*55,z=-120-i*75;box('crane leg',{x,y:12,z},[2,24,2],0,post);box('crane jib',{x:x+12,y:24,z},[35,1.6,1.6],0,post);box('crane line',{x:x+27,y:16,z},[.18,16,.18],0,post);}
  }
  // Baked colour environment supplies reflections without network requests.
  const env=new B.DynamicTexture('environment',{width:512,height:256},this.scene,false),ctx=env.getContext(),gradient=ctx.createLinearGradient(0,0,0,256);gradient.addColorStop(0,'#92b5c6');gradient.addColorStop(.46,'#e2c49b');gradient.addColorStop(.55,'#84968c');gradient.addColorStop(1,'#303b32');ctx.fillStyle=gradient;ctx.fillRect(0,0,512,256);env.update();env.coordinatesMode=B.Texture.EQUIRECTANGULAR_MODE;this.scene.environmentTexture=env;
 }
 render(session,alpha,dt){if(!this.scene||!this.models.length)return;const B=this.B;this.elapsed+=dt;this.frameTimes.push(dt*1000);if(this.frameTimes.length>3600)this.frameTimes.shift();
  for(let i=0;i<this.models.length;i++){const model=this.models[i],car=session.entries[i].car,now=car.pose(),prev=car.previous||now;const p=B.Vector3.Lerp(new B.Vector3(...Object.values(prev.p)),new B.Vector3(...Object.values(now.p)),alpha),q=B.Quaternion.Slerp(new B.Quaternion(prev.q.x,prev.q.y,prev.q.z,prev.q.w),new B.Quaternion(now.q.x,now.q.y,now.q.z,now.q.w),alpha);model.root.position.copyFrom(p);model.root.rotationQuaternion=q;
   for(const [key,part] of model.joints){const node=part.node;let idx=-1;if(key.includes('front-right'))idx=0;if(key.includes('front-left'))idx=1;if(key.includes('rear-right'))idx=2;if(key.includes('rear-left'))idx=3;
    if(idx>=0){const w=now.wheels[idx],old=prev.wheels[idx],turn=lerp(old.steer,w.steer,alpha),spin=lerp(old.spin,w.spin,alpha),dy=lerp(old.dy,w.dy,alpha);node.position.copyFrom(part.origin);if(key.startsWith('joint:steer-')){node.position.y+=dy;node.rotationQuaternion=B.Quaternion.RotationAxis(B.Axis.Y,turn);}else if(key.startsWith('joint:wheel-')){const hasSteer=model.joints.has(key.replace('wheel-','steer-'));if(!hasSteer)node.position.y+=dy;node.rotationQuaternion=(hasSteer?B.Quaternion.Identity():B.Quaternion.RotationAxis(B.Axis.Y,turn)).multiply(B.Quaternion.RotationAxis(B.Axis.X,spin));}}
    if(key==='joint:steering')node.rotationQuaternion=B.Quaternion.RotationAxis(new B.Vector3(0,.18,.984).normalize(),-lerp(prev.steer,now.steer,alpha)*10);
   }
  }
  const root=this.models[0].root,garage=session.phase==='garage',view=session.settings.camera,eye=garage?[-5.8,2.25,-6.8]:view===2?(this.manifest.views?.cockpit.eye||this.manifest.cameraSockets?.cockpit):view===1?[0,1.2,-1.35]:[0,2.5,7.3];const aim=garage?[0,.65,0]:view===2?(this.manifest.views?.cockpit.target||[-.43,1.05,-8]):view===1?[0,1,-20]:[0,.9,-7];root.computeWorldMatrix(true);const position=B.Vector3.TransformCoordinates(B.Vector3.FromArray(eye),root.getWorldMatrix()),target=B.Vector3.TransformCoordinates(B.Vector3.FromArray(aim),root.getWorldMatrix());
  const smoothing=view===0?1-Math.exp(-dt*12):1;if(!this.followPosition||this.lastCamera!==view){this.followPosition=position;this.followTarget=target;}else{this.followPosition=B.Vector3.Lerp(this.followPosition,position,smoothing);this.followTarget=B.Vector3.Lerp(this.followTarget,target,smoothing);}this.lastCamera=view;this.camera.viewport=new B.Viewport(garage?.24:0,0,garage?.76:1,1);this.camera.position.copyFrom(this.followPosition);this.camera.setTarget(this.followTarget);this.camera.fov=view===2?1.13:.87+clamp(Math.abs(session.player.speed)/100,0,.1);
  this.sun.position.copyFrom(root.position.add(new B.Vector3(22,34,14)));
  const e=session.entries[0];this.telemetry?.setTelemetry({...session.player.telemetry(),lap:e.lapNumber+1,lapTimeMs:(session.elapsed-e.lapStart)*1000,deltaMs:(session.liveDelta()||0)*1000});this.telemetry?.tick(dt);
  const t=session.elapsed-e.lapStart,trace=session.ghost;this.ghost.setEnabled(!!trace&&e.active&&session.mode==='practice');if(trace&&e.active){const i=Math.min(trace.length-2,Math.max(0,Math.floor(t*10)));if(trace[i]&&trace[i+1]){const a=trace[i],b=trace[i+1],f=clamp((t-a[0])/(b[0]-a[0]||.1));this.ghost.position.set(lerp(a[1],b[1],f),lerp(a[2],b[2],f)+.6,lerp(a[3],b[3],f));this.ghost.rotationQuaternion=B.Quaternion.Slerp(B.Quaternion.FromArray(a.slice(4,8)),B.Quaternion.FromArray(b.slice(4,8)),f);}}
  this.scene.render();
 }
 stats(){const a=[...this.frameTimes].sort((x,y)=>x-y);return {fps:1000/(a.reduce((s,n)=>s+n,0)/a.length),p95:a[Math.floor(a.length*.95)],meshes:this.scene?.meshes.length,textures:this.scene?.textures.length,materials:this.scene?.materials.length,drawCalls:this.engine._drawCalls?.current,frames:a.length};}
 clear(){this.telemetry?.dispose();this.telemetry=null;this.containers.forEach(c=>c.dispose());this.containers=[];this.models=[];this.scene?.dispose();this.scene=null;this.frameTimes=[];}
 dispose(){this.generation++;this.clear();window.removeEventListener('resize',this.resize);this.engine.dispose();}
}
