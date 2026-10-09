import {roadX,roadY,roadDX,clamp} from '../shared/simulation.js';
const B=window.BABYLON,V=B.Vector3,C=B.Color3;
export class Renderer{
 constructor(canvas,rules,models,world){
  this.rules=rules;this.engine=new B.Engine(canvas,true,{preserveDrawingBuffer:true,stencil:true,powerPreference:'high-performance'});this.engine.setHardwareScalingLevel(1);
  const scene=this.scene=new B.Scene(this.engine);scene.clearColor=new B.Color4(.67,.78,.85,1);scene.fogMode=B.Scene.FOGMODE_LINEAR;scene.fogStart=230;scene.fogEnd=650;scene.fogColor=new C(.68,.78,.83);scene.skipPointerMovePicking=true;
  scene.imageProcessingConfiguration.toneMappingEnabled=true;scene.imageProcessingConfiguration.toneMappingType=B.ImageProcessingConfiguration.TONEMAPPING_ACES;scene.imageProcessingConfiguration.exposure=1.10;scene.imageProcessingConfiguration.contrast=1.05;
  const camera=this.camera=new B.FreeCamera('driver',new V(0,1.25,0),scene);camera.minZ=.035;camera.maxZ=750;camera.fov=.98;camera.inputs.clear();
  const environment=new B.EquiRectangularCubeTexture('../shared/textures/sky.png',scene,256,false,true);scene.environmentTexture=environment;scene.environmentIntensity=.65;const sky=scene.createDefaultSkybox(environment,true,1500,0,false);sky.applyFog=false;
  this.sun=new B.DirectionalLight('late morning',new V(.54,-.72,-.49),scene);this.sun.position=new V(-70,100,70);this.sun.intensity=2.9;this.sun.diffuse=new C(1,.92,.79);
  const hemi=new B.HemisphericLight('sky fill',new V(0,1,0),scene);hemi.intensity=.26;hemi.diffuse=new C(.71,.83,1);hemi.groundColor=new C(.28,.27,.19);
  this.shadow=new B.CascadedShadowGenerator(2048,this.sun);this.shadow.numCascades=2;this.shadow.lambda=.75;this.shadow.shadowMaxZ=180;this.shadow.cascadeBlendPercentage=.12;this.shadow.usePercentageCloserFiltering=true;this.shadow.filteringQuality=B.ShadowGenerator.QUALITY_MEDIUM;this.shadow.bias=.001;this.shadow.normalBias=.02;this.shadow.stabilizeCascades=true;
  const pipeline=this.pipeline=new B.DefaultRenderingPipeline('finish',true,scene,[camera]);pipeline.fxaaEnabled=true;pipeline.bloomEnabled=true;pipeline.bloomThreshold=.92;pipeline.bloomWeight=.13;pipeline.bloomKernel=32;pipeline.samples=1;
  this.materials={};this.chunks=[];this.carRoots=[];this.worldRoot=new B.TransformNode('world',scene);
  this.makeMaterials();this.buildRoad();this.buildScenery(world);this.templates=new Map();for(const model of models.models)this.templates.set(model.name,model);
  this.player=this.makeCar('comet-sport','#b9d456','player');this.cockpit=this.makeCar('club-cockpit','#b9d456','cockpit');this.cockpit.scaling.setAll(1);this.player.scaling.setAll(.84);
  this.pbr('headliner','#172027',.95);this.pbr('mirror','#798792',.04,1);this.box('roof lining',[0,1.48,-.27],[1.42,.06,1.65],'headliner',this.cockpit);this.box('windshield header',[0,1.455,.52],[1.40,.055,.1],'headliner',this.cockpit);this.box('rear view mirror',[.12,1.30,.4],[.25,.074,.045],'mirror',this.cockpit);
  this.traffic=[];this.cameraMode=0;this.wheelAngle=0;
  addEventListener('resize',()=>this.engine.resize());
 }
 pbr(name,color,rough=1,metal=0,texture){const m=new B.PBRMaterial(name,this.scene);m.albedoColor=C.FromHexString(color).toLinearSpace();m.roughness=rough;m.metallic=metal;if(texture)m.albedoTexture=new B.Texture('../shared/textures/'+texture,this.scene);this.materials[name]=m;return m;}
 makeMaterials(){
  const road=this.pbr('road','#ffffff',.92,0,'road.png');road.bumpTexture=new B.Texture('../shared/textures/road-normal.png',this.scene);road.bumpTexture.level=.28;road.bumpTexture.gammaSpace=false;road.usePhysicalLightFalloff=true;
  this.pbr('grass','#ffffff',1,0,'grass.png');this.pbr('rock','#ffffff',.96,0,'rock.png');this.pbr('foliage','#ffffff',1);this.pbr('bark','#ffffff',1);this.pbr('rail','#a7adb0',.44,.63);this.pbr('post','#77817d',.75,.3);this.pbr('edge','#aba794',.97);this.pbr('sign','#285b44',.75);
  const sea=this.pbr('sea','#3e7e91',.19,.25);sea.alpha=.98;
 }
 mesh(name,g,material){const m=new B.Mesh(name,this.scene),d=new B.VertexData();d.positions=g.positions;d.indices=g.indices;d.normals=g.normals?.length?g.normals:[];if(!d.normals.length)B.VertexData.ComputeNormals(d.positions,d.indices,d.normals);if(g.uvs)d.uvs=g.uvs;if(g.colors)d.colors=g.colors;d.applyToMesh(m);m.material=material;m.receiveShadows=true;m.isPickable=false;return m;}
 ribbon(name,z0,z1,xs,material,terrain=false){
  const g={positions:[],indices:[],uvs:[],normals:[]},steps=20;
  for(let i=0;i<=steps;i++)for(let j=0;j<xs.length;j++){
   const z=z0+(z1-z0)*i/steps,x=xs[j],offset=terrain?-.06+Math.max(0,Math.abs(x)-9)*.065+Math.sin(z/34+x*.15)*Math.max(0,Math.abs(x)-12)*.023:0;
   g.positions.push(roadX(z)+x,roadY(z)+offset,z);g.uvs.push(terrain?x/14:(x+7.7)/15.4,terrain?z/14:z/12);
   if(i<steps&&j<xs.length-1){const a=i*xs.length+j,b=a+xs.length;g.indices.push(a,a+1,b,a+1,b+1,b);}
  }
  return this.mesh(name,g,material);
 }
 box(name,p,size,mat,parent,shadow=false){const m=B.MeshBuilder.CreateBox(name,{width:size[0],height:size[1],depth:size[2]},this.scene);m.position.copyFromFloats(...p);m.material=this.materials[mat];m.parent=parent||this.worldRoot;m.isPickable=false;m.receiveShadows=true;if(shadow)this.shadow.addShadowCaster(m);return m;}
 buildRoad(){
  for(let z=-100;z<8000;z+=100){
   const root=new B.TransformNode('section '+z,this.scene);root.parent=this.worldRoot;
   this.ribbon('asphalt',z,z+100,[-7.7,7.7],this.materials.road).parent=root;
   this.ribbon('terrain',z,z+100,[-140,-90,-45,-20,-10,-7.8,7.8,10,20,45,90,140],this.materials.grass,true).parent=root;
   for(const side of [-1,1]){
    for(let dz=0;dz<100;dz+=10){const s=z+dz+5,x=roadX(s)+side*8.2,y=roadY(s),yaw=Math.atan(roadDX(s));
     const rail=this.box('steel barrier',[x,y+.68,s],[.10,.30,10.15],'rail',root,true);rail.rotation.y=yaw;
     const edge=this.box('curb',[x-side*.17,y+.035,s],[.30,.10,10.16],'edge',root);edge.rotation.y=yaw;
     this.box('rail post',[x,y+.3,s],[.14,.8,.13],'post',root,true);
     if(dz%20===0)this.box('reflector',[x-side*.073,y+.7,s],[.014,.09,.13],'edge',root);
    }
   }
   if(z>0&&z%600===0){
    this.box('sign post',[roadX(z)-10,roadY(z)+2.5,z],[.12,5,.12],'rail',root,true);
    const sign=this.box('coast route',[roadX(z)-10,roadY(z)+4.5,z],[3,1.4,.08],'sign',root);
    const dt=new B.DynamicTexture('route label',{width:512,height:256},this.scene,false);const ctx=dt.getContext();ctx.fillStyle='#245843';ctx.fillRect(0,0,512,256);ctx.strokeStyle='#f3f4da';ctx.lineWidth=5;ctx.strokeRect(10,10,492,236);ctx.fillStyle='#f3f4da';ctx.textAlign='center';ctx.font='bold 55px sans-serif';ctx.fillText('COAST  01',256,100);ctx.font='35px sans-serif';ctx.fillText('NORTH ↑  '+(8-z/1000).toFixed(1)+' km',256,177);dt.update();const sm=new B.StandardMaterial('sign lettering',this.scene);sm.diffuseTexture=dt;sm.specularColor=C.Black();sign.material=sm;
   }
   this.chunks.push({z,root});
  }
  const sea=B.MeshBuilder.CreateGround('Pacific',{width:1900,height:10000},this.scene);sea.position.copyFromFloats(-1040,-5,4000);sea.material=this.materials.sea;sea.parent=this.worldRoot;sea.isPickable=false;
 }
 buildScenery(world){
  const templates={};for(const g of world.meshes){const m=this.mesh(g.name,g,this.materials[g.material]);m.setEnabled(false);templates[g.name]=m;}
  this.scenery=[];
  for(const o of world.objects){const m=templates[o.mesh].createInstance(o.mesh);m.position.copyFromFloats(...o.position);m.scaling.copyFromFloats(...o.scale);m.rotation.y=o.yaw;m.parent=this.worldRoot;m.isPickable=false;this.shadow.addShadowCaster(m);this.scenery.push({z:o.position[2],mesh:m});}
 }
 makeCar(id,paint,name){
  const model=this.templates.get(id),root=new B.TransformNode(name,this.scene);root.parts=[];
  for(const p of model.parts){
   const data=Uint8Array.from(atob(p.vertices),v=>v.charCodeAt(0)),verts=new Int16Array(data.buffer),idx=new Uint16Array(Uint8Array.from(atob(p.indices),v=>v.charCodeAt(0)).buffer),g={positions:[],normals:[],indices:Array.from(idx),uvs:[]};
   // Existing authored meshes are right-handed with -Z forward. Mirror positions and winding.
   for(let i=0;i<verts.length;i+=6){g.positions.push(verts[i]*.001+p.pivot[0],verts[i+1]*.001+p.pivot[1],-(verts[i+2]*.001+p.pivot[2]));g.normals.push(verts[i+3]/32767,verts[i+4]/32767,-verts[i+5]/32767);g.uvs.push(verts[i]*.001,verts[i+2]*.001);}
   const mat=new B.PBRMaterial(name+' finish',this.scene);mat.albedoColor=p.paint?C.FromHexString(paint).toLinearSpace():new C(...p.color).toLinearSpace();mat.metallic=p.paint?.65:p.metallic;mat.roughness=p.paint?.23:p.roughness;mat.backFaceCulling=false;
   if(p.paint){mat.clearCoat.isEnabled=true;mat.clearCoat.intensity=1;mat.clearCoat.roughness=.12;}
   if(p.roughness<.2){mat.metallic=.5;mat.albedoColor=new C(.035,.065,.085);mat.roughness=.11;}
   if(p.emissive){mat.emissiveColor=new C(...p.color).scale(1.6);mat.albedoColor=C.Black();}
   const m=this.mesh(name+'/'+p.part,g,mat);m.parent=root;const pivot=new V(p.pivot[0],p.pivot[1],-p.pivot[2]);if(p.part==='steering'||p.part.endsWith('needle'))m.setPivotPoint(pivot);root.parts.push({mesh:m,part:p.part,pivot});this.shadow.addShadowCaster(m);
  }
  return root;
 }
 setQuality(level){const high=level==='high';this.engine.setHardwareScalingLevel(high?1:1.5);this.pipeline.bloomEnabled=high;this.shadow.shadowMaxZ=high?180:100;}
 render(sim,dt){
  const z=sim.progress,center=roadX(z),y=roadY(z),yaw=Math.atan(roadDX(z)),slope=Math.atan((roadY(z+1)-roadY(z-1))*.5);
  this.worldRoot.position.copyFromFloats(-center,-y,-z);
  for(const c of this.chunks)c.root.setEnabled(c.z>z-150&&c.z<z+750);
  for(const o of this.scenery)o.mesh.setEnabled(o.z>z-100&&o.z<z+680);
  const colors=['#a5bd53','#bfd0df','#ba4934','#d9d4c5','#3f687e'];
  for(let i=0;i<sim.traffic.length;i++){
   const car=sim.traffic[i];if(!this.traffic[i]){const root=this.makeCar(car.type?'trail-jeep':'comet-sport',colors[car.color],'traffic '+i);root.scaling.setAll(car.type?.80:.84);this.traffic[i]=root;}
   const root=this.traffic[i];root.setEnabled(car.z-z<680&&car.z-z> -80);root.position.copyFromFloats(roadX(car.z)+car.x-center,roadY(car.z)-y,car.z-z);root.rotation.y=Math.atan(roadDX(car.z));
  }
  for(let i=sim.traffic.length;i<this.traffic.length;i++)this.traffic[i].setEnabled(false);
  const bodyYaw=yaw+sim.vx*.015,lean=-sim.steer*.035*(sim.speed/45),bob=Math.sin(z*1.1)*.004*Math.min(1,sim.speed/40),shake=sim.hit*Math.sin(performance.now()*.10)*.027;
  this.player.position.copyFromFloats(sim.x,.01+bob,0);this.player.rotation.copyFromFloats(-slope,bodyYaw,lean);this.cockpit.position.copyFrom(this.player.position);this.cockpit.rotation.copyFrom(this.player.rotation);
  this.player.setEnabled(this.cameraMode!==0);this.cockpit.setEnabled(this.cameraMode===0);
  for(const p of this.cockpit.parts){if(p.part==='steering')p.mesh.rotation.z=-sim.steer*.65;if(p.part==='speed-needle'||p.part==='rpm-needle')p.mesh.rotation.z=2.2-sim.speed/77*4.4;}
  let pos,target;
  if(this.cameraMode===2){pos=new V(sim.x-Math.sin(yaw)*7,3.3,-7);target=new V(sim.x+Math.sin(bodyYaw)*12,1.1,12);}
  else if(this.cameraMode===1){pos=new V(sim.x,1.22,1.15);target=new V(sim.x+Math.sin(bodyYaw)*35,1.15+slope*35,36);}
  else{pos=new V(sim.x-.37*Math.cos(bodyYaw)-.82*Math.sin(bodyYaw)+shake,1.17+bob,-.82*Math.cos(bodyYaw)+.37*Math.sin(bodyYaw));target=pos.add(new V(Math.sin(bodyYaw)*40,-.075+slope*40,Math.cos(bodyYaw)*40));}
  this.camera.position.copyFrom(pos);this.camera.setTarget(target);this.camera.rotation.z=lean*.55+shake;this.camera.fov+=(.98+clamp((sim.speed-30)/220,0,.22)+(sim.boosting?.04:0)-this.camera.fov)*Math.min(1,dt*4);
  this.sun.position.copyFromFloats(-70,100,70);this.scene.render();
 }
 async ready(sim){this.render(sim,0);await this.scene.whenReadyAsync();this.render(sim,0);}
 startLoop(callback){this.engine.runRenderLoop(callback);}
 stats(){return{fps:this.engine.getFps(),meshes:this.scene.getActiveMeshes().length,triangles:this.scene.getActiveIndices()/3,width:this.engine.getRenderWidth(),height:this.engine.getRenderHeight(),webgl:this.engine.webGLVersion};}
}
