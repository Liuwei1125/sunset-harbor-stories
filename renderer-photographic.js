/* Render-only extension. Simulation, collisions, saves and weapon clocks retain
   their existing owners. All light data is bundled; no runtime network calls. */
const RadianceBase9=Renderer;
const RADIANCE9={exposure:1,enabled:true,stats:{},quality:QUALITY6.map(q=>({...q})),limits:[{ao:0,near:0,bloom:false,reflection:false},{ao:8,near:512,bloom:true,reflection:false},{ao:16,near:2048,bloom:true,reflection:true}]};
// Keep the original 6.2 quality profiles intact, including shadow coverage and
// render scale. The 6.3.1 lighting profile owns its separate quality parameters.
Object.assign(RADIANCE9.quality[1],{shadow:1024,shadowRadius:64});
Object.assign(RADIANCE9.quality[2],{shadow:2048,shadowRadius:94,scale:1.25});

function inverseMatrix9(m){
 // Column-major inverse. Only camera matrices are inverted, once per render.
 const a=[];for(let r=0;r<4;r++)a[r]=[m[r],m[4+r],m[8+r],m[12+r],+(r===0),+(r===1),+(r===2),+(r===3)];
 for(let c=0;c<4;c++){let pivot=c;for(let r=c+1;r<4;r++)if(Math.abs(a[r][c])>Math.abs(a[pivot][c]))pivot=r;
  if(Math.abs(a[pivot][c])<1e-12)throw Error('Invalid camera matrix');[a[c],a[pivot]]=[a[pivot],a[c]];const d=a[c][c];for(let j=0;j<8;j++)a[c][j]/=d;
  for(let r=0;r<4;r++)if(r!==c){const f=a[r][c];for(let j=0;j<8;j++)a[r][j]-=f*a[c][j];}
 }
 const out=new Float32Array(16);for(let r=0;r<4;r++)for(let c=0;c<4;c++)out[c*4+r]=a[r][4+c];return out;
}
const putBeforeRadiance9=InstanceBuilder.prototype.put;
InstanceBuilder.prototype.put=function(shape,...args){const result=putBeforeRadiance9.call(this,shape,...args),g=this.groups.get(shape),p=SHAPE_MATERIALS.get(shape);if(p){const c=p.color;g.data[(g.count-1)*20+19]=p.role==='paint'?4:p.metallic>.45?1:p.roughness>.65&&c[0]>c[2]*1.3?2:p.roughness>.82?3:5;}return result;};

Renderer=class extends RadianceBase9{
 constructor(canvas){
  super(canvas);if(!this.inst)throw Error('Instancing is unavailable');
  const g=this.gl;this.classicPrograms9=this.programs;
  this.extensions9={depth:g.getExtension('WEBGL_depth_texture'),half:g.getExtension('OES_texture_half_float'),halfLinear:g.getExtension('OES_texture_half_float_linear'),derivatives:g.getExtension('OES_standard_derivatives')};
  g.getExtension('EXT_color_buffer_half_float');
  const prefix=this.extensions9.derivatives?'#extension GL_OES_standard_derivatives : enable\n#define HAS_DERIVATIVES9\n':'';
  this.photoPrograms9={static:this.photoProgram9(VERTEX_PHOTO_STATIC9,prefix+FRAGMENT_PHOTO9),instance:this.photoProgram9(VERTEX_PHOTO_INSTANCE9,prefix+FRAGMENT_PHOTO9),depth:this.classicPrograms9.depth,depthI:this.classicPrograms9.depthI};
  this.normalPrograms9={static:this.photoProgram9(VERTEX_PHOTO_STATIC9,NORMAL_FRAGMENT9),instance:this.photoProgram9(VERTEX_PHOTO_INSTANCE9,NORMAL_FRAGMENT9),depth:this.classicPrograms9.depth,depthI:this.classicPrograms9.depthI};
  this.screenPrograms9={sky:this.photoProgram9(SCREEN_VERTEX9,SKY_FRAGMENT9),ao:this.photoProgram9(SCREEN_VERTEX9,AO_FRAGMENT9),aoBlur:this.photoProgram9(SCREEN_VERTEX9,AO_BLUR_FRAGMENT9),bloom:this.photoProgram9(SCREEN_VERTEX9,BLOOM_FRAGMENT9),post:this.photoProgram9(SCREEN_VERTEX9,POST_FRAGMENT9)};
  const raw=atob(LIGHTING_PACK9.rgbm),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  this.environment9=this.texture9(LIGHTING_PACK9.width,LIGHTING_PACK9.height,g.UNSIGNED_BYTE,bytes,true);
  this.white9=this.texture9(1,1,g.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]),false);
  this.black9=this.texture9(1,1,g.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]),false);
  this.targets9=null;this.nearShadow9=null;this.opaque9=null;this.active9=false;this.waterResolved9=true;this.resourceGeneration9=0;
  this.lightPositions9=new Float32Array(24);this.lightColors9=new Float32Array(18);this.localLightCount9=0;
  this.capabilities9={depth:!!this.extensions9.depth,hdr:false,derivatives:!!this.extensions9.derivatives,post:false,reason:this.extensions9.half?null:'Half-float textures unavailable; using LDR color'};
  this.programs=this.photoPrograms9;
 }
 photoProgram9(vertex,fragment){
  const p=this.mk(vertex,fragment),g=this.gl;
  for(const name of ['uEnvironment9','uNearShadow9','uAO9','uOpaque9','uNearVP9','uSun9','uSunColor9','uNearOn9','uNearTexel9','uLinearOutput9','uAOOn9','uWaterPass9','uReflection9','uResolution9','uLocalCount9','uInverseVP9','uSceneDepth9','uViewDirection9','uNormal9','uSamples9','uInput9','uDirection9','uThreshold9','uBloom9','uBloomOn9','uExposure9'])p[name]=g.getUniformLocation(p.p,name);
  p.uLocalLights9=g.getUniformLocation(p.p,'uLocalLights9[0]');p.uLocalColors9=g.getUniformLocation(p.p,'uLocalColors9[0]');return p;
 }
 texture9(width,height,type,data=null,linear=true,depth=false){
  const g=this.gl,texture=g.createTexture();g.bindTexture(g.TEXTURE_2D,texture);const format=depth?g.DEPTH_COMPONENT:g.RGBA;
  g.texImage2D(g.TEXTURE_2D,0,format,width,height,0,format,type,data);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,linear?g.LINEAR:g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,linear?g.LINEAR:g.NEAREST);
  g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);return texture;
 }
 target9(width,height,type,depth=false,linear=true){
  const g=this.gl,t={width,height,fb:g.createFramebuffer(),color:this.texture9(width,height,type,null,linear),depth:null,rb:null,type};
  g.bindFramebuffer(g.FRAMEBUFFER,t.fb);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,t.color,0);
  if(depth){if(this.extensions9.depth){t.depth=this.texture9(width,height,g.UNSIGNED_INT,null,false,true);g.framebufferTexture2D(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.TEXTURE_2D,t.depth,0);}else{t.rb=g.createRenderbuffer();g.bindRenderbuffer(g.RENDERBUFFER,t.rb);g.renderbufferStorage(g.RENDERBUFFER,g.DEPTH_COMPONENT16,width,height);g.framebufferRenderbuffer(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.RENDERBUFFER,t.rb);}}
  t.valid=g.checkFramebufferStatus(g.FRAMEBUFFER)===g.FRAMEBUFFER_COMPLETE;g.bindFramebuffer(g.FRAMEBUFFER,null);return t;
 }
 disposeTarget9(t){if(!t)return;const g=this.gl;g.deleteFramebuffer(t.fb);g.deleteTexture(t.color);if(t.depth)g.deleteTexture(t.depth);if(t.rb)g.deleteRenderbuffer(t.rb);}
 releaseTargets9(){if(this.targets9)for(const t of Object.values(this.targets9))this.disposeTarget9(t);this.targets9=null;if(this.opaque9)this.gl.deleteTexture(this.opaque9);this.opaque9=null;}
 prepareTargets9(){
  const g=this.gl,w=this.canvas.width,h=this.canvas.height;
  if(this.targets9?.scene.width===w&&this.targets9?.scene.height===h)return;
  this.releaseTargets9();this.resourceGeneration9++;
  const half=this.extensions9.half?.HALF_FLOAT_OES;let scene=half?this.target9(w,h,half,true,!!this.extensions9.halfLinear):null;
  if(scene&&!scene.valid){this.disposeTarget9(scene);scene=null;this.capabilities9.reason='Half-float framebuffer unavailable; using LDR color';}
  if(!scene)scene=this.target9(w,h,g.UNSIGNED_BYTE,true);
  if(!scene.valid){this.disposeTarget9(scene);this.capabilities9.post=false;this.capabilities9.hdr=false;this.capabilities9.reason='Framebuffer unavailable; rendering directly';return;}
  this.capabilities9.post=true;this.capabilities9.hdr=scene.type===half;
  const aw=Math.max(1,Math.ceil(w/2)),ah=Math.max(1,Math.ceil(h/2)),bw=Math.max(1,Math.ceil(w/4)),bh=Math.max(1,Math.ceil(h/4));
  const normals=this.extensions9.depth?this.target9(w,h,g.UNSIGNED_BYTE,true,false):null;
  if(normals&&!normals.valid){this.disposeTarget9(normals);this.extensions9.depth=null;this.capabilities9.depth=false;}
  this.targets9={scene,ao:this.target9(aw,ah,g.UNSIGNED_BYTE),aoTemp:this.target9(aw,ah,g.UNSIGNED_BYTE),bloom:this.target9(bw,bh,scene.type,false,scene.type===g.UNSIGNED_BYTE||!!this.extensions9.halfLinear),bloomTemp:this.target9(bw,bh,scene.type,false,scene.type===g.UNSIGNED_BYTE||!!this.extensions9.halfLinear)};
  if(normals?.valid)this.targets9.normals=normals;
  for(const [name,t]of Object.entries(this.targets9))if(!t.valid)throw Error('Invalid graphics target: '+name);
  this.opaque9=this.texture9(w,h,scene.type,null,scene.type===g.UNSIGNED_BYTE||!!this.extensions9.halfLinear);
  g.bindFramebuffer(g.FRAMEBUFFER,null);
 }
 bind9(program,name,texture,unit){const g=this.gl;g.activeTexture(g.TEXTURE0+unit);g.bindTexture(g.TEXTURE_2D,texture||null);g.uniform1i(program[name],unit);}
 use(o){
  super.use(o);if(!this.active9)return;const g=this.gl;
  this.bind9(o,'uEnvironment9',this.environment9,1);this.bind9(o,'uNearShadow9',this.nearShadow9?.color||this.white9,2);
  this.bind9(o,'uAO9',this.aoOn9?this.targets9.ao.color:this.white9,3);
  this.bind9(o,'uSceneDepth9',!this.normalPass9?this.targets9?.normals?.depth||this.white9:this.white9,4);
  this.bind9(o,'uOpaque9',this.waterPass9?this.opaque9:this.black9,5);
  g.uniformMatrix4fv(o.uNearVP9,false,this.nearVP9||this.lightVP);g.uniformMatrix4fv(o.uInverseVP9,false,this.inverseVP9);
  g.uniform3fv(o.uSun9,LIGHTING_PACK9.sun);g.uniform3fv(o.uSunColor9,this.sunColor9);g.uniform3f(o.uViewDirection9,this.viewDirection9.x,this.viewDirection9.y,this.viewDirection9.z);
  g.uniform1f(o.uNearOn9,this.nearOn9?1:0);g.uniform1f(o.uNearTexel9,1/(this.nearShadow9?.width||512));g.uniform1f(o.uAOOn9,this.aoOn9&&!this.normalPass9?1:0);
  g.uniform1f(o.uLinearOutput9,this.targets9&&this.capabilities9.hdr?1:0);g.uniform1f(o.uWaterPass9,this.waterPass9?1:this.deferWater9?0:-1);
  g.uniform1f(o.uExposure9,RADIANCE9.exposure);g.uniform1f(o.uReflection9,this.waterPass9&&this.deferWater9?1:0);g.uniform2f(o.uResolution9,this.canvas.width,this.canvas.height);
  g.uniform4fv(o.uLocalLights9,this.lightPositions9);g.uniform3fv(o.uLocalColors9,this.lightColors9);g.uniform1f(o.uLocalCount9,this.localLightCount9);
 }
 screen9(o,target,setup){
  const g=this.gl;g.bindFramebuffer(g.FRAMEBUFFER,target?.fb||null);g.viewport(0,0,target?.width||this.canvas.width,target?.height||this.canvas.height);
  g.disable(g.DEPTH_TEST);g.disable(g.BLEND);g.depthMask(false);g.useProgram(o.p);
  for(let i=0;i<this.maxAttribs;i++){g.disableVertexAttribArray(i);this.inst.vertexAttribDivisorANGLE(i,0);}
  g.bindBuffer(g.ARRAY_BUFFER,this.skyBuf);this.attrib(o.aPosition,2,8,0);
  g.uniformMatrix4fv(o.uInverseVP9,false,this.inverseVP9);g.uniformMatrix4fv(o.uVP,false,this.vp);g.uniform3f(o.uEye,this.eye.x,this.eye.y,this.eye.z);
  g.uniform3f(o.uViewDirection9,this.viewDirection9.x,this.viewDirection9.y,this.viewDirection9.z);g.uniform2f(o.uResolution9,this.canvas.width,this.canvas.height);
  setup?.(o);g.drawArrays(g.TRIANGLES,0,3);telemetry.draws++;telemetry.triangles++;g.depthMask(true);
 }
 shadowMatrix9(center,radius,size){
  const light=V(...LIGHTING_PACK9.sun),vp=matmul(ortho(-radius,radius,-radius,radius,1,370),lookAt(add(center,mul(light,185)),center));
  // Stabilize at shadow-texel granularity in light space, not four-metre jumps.
  vp[12]+=(Math.round(vp[12]*size/2)-vp[12]*size/2)*2/size;vp[13]+=(Math.round(vp[13]*size/2)-vp[13]*size/2)*2/size;return vp;
 }
 renderShadow9(fb,size,matrix,full){
  const g=this.gl;this.lightVP=matrix;this.inShadow=true;this.fullShadowDetail9=full;
  g.bindFramebuffer(g.FRAMEBUFFER,fb);g.viewport(0,0,size,size);g.enable(g.DEPTH_TEST);g.disable(g.BLEND);g.depthMask(true);g.clearColor(1,1,1,1);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);
  this.draw(worldMeshes.static);this.drawBuilder(dynamic);this.inShadow=false;this.fullShadowDetail9=false;
 }
 localLights9(){
  const candidates=[],push=(p,r,c,weight=1)=>{if(length(sub(p,this.eye))<r+45)candidates.push({p,r,c,priority:length(sub(p,this.eye))/weight});};
  if(ARMORY8.shot&&state.t-ARMORY8.shot.time<.075){const pose=weaponPose8();push(pose.muzzle,5,[5,2.1,.55],4);}
  for(const b of ARMORY8.bursts){const age=b.age;if(!b.water&&age<.48)push(b.pos,b.radius||10,[7*(1-age/.5),2*(1-age/.5),.35],3);}
  for(const f of combat.fires)push(add(f.pos,V(0,.75,0)),7,[2.4,.65,.12],1.4);
  candidates.sort((a,b)=>a.priority-b.priority);const limit=RENDER.tier===0?2:6;this.localLightCount9=Math.min(limit,candidates.length);this.lightPositions9.fill(0);this.lightColors9.fill(0);
  for(let i=0;i<this.localLightCount9;i++){const {p,r,c}=candidates[i];this.lightPositions9.set([p.x,p.y,p.z,r],i*4);this.lightColors9.set(c,i*3);}
 }
 begin(vp,eye){
  this.active9=RADIANCE9.enabled!==false;this.programs=this.active9?this.photoPrograms9:this.classicPrograms9;
  if(!this.active9){this.nearOn9=false;this.aoOn9=false;this.deferWater9=false;return super.begin(vp,eye);}
  this.vp=vp;this.eye=eye;this.inverseVP9=inverseMatrix9(vp);const far=this.inverseVP9;const z=V((far[8]+far[12])/(far[11]+far[15]),(far[9]+far[13])/(far[11]+far[15]),(far[10]+far[14])/(far[11]+far[15]));this.viewDirection9=norm(sub(z,eye));
  this.sunColor9=regionId==='canyon'?[3.6,2.8,1.8]:regionId==='islands'?[3.5,3.2,2.7]:[3.5,2.95,2.25];
  this.prepareTargets9();this.limits9=RADIANCE9.limits[RENDER.tier];this.aoOn9=false;this.waterPass9=false;this.normalPass9=false;this.deferWater9=!!(this.limits9.reflection&&this.targets9?.normals&&this.capabilities9.hdr);this.waterResolved9=!this.deferWater9;
  this.localLights9();this.initShadow(RENDER.shadow);const center=state.car?state.car.pos:player.pos;
  this.nearOn9=!!(RENDER.shadow&&this.limits9.near&&this.shadowValid);
  if(this.shadowValid&&RENDER.shadow){
   const farVP=this.shadowMatrix9(center,RENDER.shadowRadius,this.shadowSize);this.renderShadow9(this.shadowFB,this.shadowSize,farVP,false);
   if(this.nearOn9){const size=this.limits9.near;if(this.nearShadow9?.width!==size){this.disposeTarget9(this.nearShadow9);this.nearShadow9=this.target9(size,size,this.gl.UNSIGNED_BYTE,true,false);if(!this.nearShadow9.valid){this.disposeTarget9(this.nearShadow9);this.nearShadow9=null;this.nearOn9=false;}}
    if(this.nearOn9){this.nearVP9=this.shadowMatrix9(center,RENDER.tier===2?12:11,size);this.renderShadow9(this.nearShadow9.fb,size,this.nearVP9,RENDER.tier===2);}
   }this.lightVP=farVP;
  }
  if(this.targets9?.normals&&(this.limits9.ao||this.deferWater9)){
   const g=this.gl,t=this.targets9.normals;g.bindFramebuffer(g.FRAMEBUFFER,t.fb);g.viewport(0,0,t.width,t.height);g.enable(g.DEPTH_TEST);g.disable(g.BLEND);g.depthMask(true);g.clearColor(.5,.5,.5,1);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);
   this.normalPass9=true;this.programs=this.normalPrograms9;this.draw(worldMeshes.static);this.drawBuilder(dynamic);this.normalPass9=false;this.programs=this.photoPrograms9;
   if(this.limits9.ao){
    this.screen9(this.screenPrograms9.ao,this.targets9.ao,o=>{this.bind9(o,'uSceneDepth9',t.depth,0);this.bind9(o,'uNormal9',t.color,1);g.uniform1f(o.uSamples9,this.limits9.ao);});
    this.screen9(this.screenPrograms9.aoBlur,this.targets9.aoTemp,o=>{this.bind9(o,'uInput9',this.targets9.ao.color,0);this.bind9(o,'uSceneDepth9',t.depth,1);g.uniform2f(o.uDirection9,1/this.targets9.ao.width,0);});
    this.screen9(this.screenPrograms9.aoBlur,this.targets9.ao,o=>{this.bind9(o,'uInput9',this.targets9.aoTemp.color,0);this.bind9(o,'uSceneDepth9',t.depth,1);g.uniform2f(o.uDirection9,0,1/this.targets9.ao.height);});this.aoOn9=true;
   }
  }
  const g=this.gl;g.bindFramebuffer(g.FRAMEBUFFER,this.targets9?.scene.fb||null);g.viewport(0,0,this.canvas.width,this.canvas.height);g.depthMask(true);g.clearColor(0,0,0,1);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);
  this.screen9(this.screenPrograms9.sky,this.targets9?.scene,o=>{this.bind9(o,'uEnvironment9',this.environment9,0);g.uniform3fv(o.uSun9,LIGHTING_PACK9.sun);g.uniform3fv(o.uSunColor9,this.sunColor9);g.uniform1f(o.uLinearOutput9,this.capabilities9.hdr?1:0);g.uniform1f(o.uExposure9,RADIANCE9.exposure);});
  g.enable(g.DEPTH_TEST);g.depthMask(true);g.blendFunc(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA);
  RADIANCE9.stats={active:true,hdr:this.capabilities9.hdr,ao:this.aoOn9?this.limits9.ao:0,cascades:RENDER.shadow?(this.nearOn9?2:1):0,reflection:this.deferWater9,bloom:!!(this.limits9.bloom&&this.capabilities9.hdr),resolution:[this.canvas.width,this.canvas.height],resourceGeneration:this.resourceGeneration9,localLights:this.localLightCount9};
 }
 resolveWater9(){
  if(this.waterResolved9||!this.active9)return;this.waterResolved9=true;const g=this.gl;
  g.bindFramebuffer(g.FRAMEBUFFER,this.targets9.scene.fb);g.activeTexture(g.TEXTURE0+5);g.bindTexture(g.TEXTURE_2D,this.opaque9);g.copyTexSubImage2D(g.TEXTURE_2D,0,0,0,0,0,this.canvas.width,this.canvas.height);
  this.waterPass9=true;this.draw(worldMeshes.static);this.waterPass9=false;
 }
 drawBuilder(b,transparent=false){
  if(this.active9&&!this.inShadow&&!this.normalPass9&&transparent)this.resolveWater9();
  return super.drawBuilder(b,transparent);
 }
 end(){
  if(!this.active9){RADIANCE9.stats={active:false,effect:'6.2',resolution:[this.canvas.width,this.canvas.height]};return;}
  this.resolveWater9();if(!this.targets9)return;const g=this.gl,t=this.targets9;let bloom=false;
  if(this.limits9.bloom&&this.capabilities9.hdr){
   this.screen9(this.screenPrograms9.bloom,t.bloomTemp,o=>{this.bind9(o,'uInput9',t.scene.color,0);g.uniform2f(o.uDirection9,1/t.scene.width,0);g.uniform1f(o.uThreshold9,1);});
   this.screen9(this.screenPrograms9.bloom,t.bloom,o=>{this.bind9(o,'uInput9',t.bloomTemp.color,0);g.uniform2f(o.uDirection9,0,1/t.bloom.height);g.uniform1f(o.uThreshold9,0);});bloom=true;
  }
  this.screen9(this.screenPrograms9.post,null,o=>{this.bind9(o,'uInput9',t.scene.color,0);this.bind9(o,'uBloom9',bloom?t.bloom.color:this.black9,1);g.uniform1f(o.uLinearOutput9,this.capabilities9.hdr?1:0);g.uniform1f(o.uBloomOn9,bloom?1:0);g.uniform1f(o.uExposure9,RADIANCE9.exposure);});
  g.enable(g.DEPTH_TEST);g.depthMask(true);g.bindFramebuffer(g.FRAMEBUFFER,null);
 }
};

const settingsPanelBefore9=renderSettingsPanel;
function syncGraphicsEffect9(){
 const compatible=!!renderer?.software,photo=RADIANCE9.enabled;
 if($('s-radiance9')){$('s-radiance9').value=photo?'photo':'classic';$('s-radiance9').disabled=compatible;}
 if($('s-exposure9')){$('s-exposure9').value=RADIANCE9.exposure;$('s-exposure9').disabled=compatible||!photo;}
 if($('s-effect-note9'))$('s-effect-note9').textContent=compatible?'当前使用 CPU 兼容渲染，效果切换需要硬件加速':photo?'环境反射、接触阴影与校准后的自然色彩':'原版天空、水面、光照与阴影';
 if($('s-exposure-note9'))$('s-exposure-note9').textContent=photo?'调整 6.3.1 的亮度，切换效果后保留':'6.2 使用原版亮度，切回 6.3.1 后可调整';
 if($('render-info'))$('render-info').textContent=compatible?'CPU COMPATIBILITY':photo?'6.3.1 · 自然光影 / 环境反射 / AgX':'6.2 · 经典效果';
}
function setGraphicsEffect9(effect){
 RADIANCE9.enabled=effect!=='classic';experience.options.radiance9=RADIANCE9.enabled;
 if(!RADIANCE9.enabled&&renderer?.releaseTargets9){renderer.releaseTargets9();renderer.disposeTarget9(renderer.nearShadow9);renderer.nearShadow9=null;}
 applyQuality6();syncGraphicsEffect9();
}
renderSettingsPanel=function(){
 settingsPanelBefore9();
 document.querySelector('#panel-content .settings-grid').insertAdjacentHTML('afterbegin','<label class="setting-row"><span>画面效果<small id="s-effect-note9"></small></span><select id="s-radiance9"><option value="classic">6.2 · 经典效果</option><option value="photo">6.3.1 · 自然光影</option></select></label><label class="setting-row"><span>画面亮度<small id="s-exposure-note9"></small></span><input id="s-exposure9" type="range" min="0.7" max="1.4" step="0.05" aria-label="画面亮度"></label>');
 syncGraphicsEffect9();
 $('s-radiance9').onchange=e=>{setGraphicsEffect9(e.target.value);render(1);saveProgress();};
 $('s-exposure9').oninput=e=>{RADIANCE9.exposure=Number(e.target.value);experience.options.exposure9=RADIANCE9.exposure;render(1);};$('s-exposure9').onchange=()=>saveProgress();
};
const applySaveBefore9=applySave;applySave=function(d){const result=applySaveBefore9(d),o=d.experience?.options||{};RADIANCE9.exposure=finite(o.exposure9,.7,1.4,1);experience.options.exposure9=RADIANCE9.exposure;setGraphicsEffect9(o.radiance9===false?'classic':'photo');return result;};
const diagnosticBefore9=diagnosticReport6;diagnosticReport6=function(){return {...diagnosticBefore9(),graphics:{...RADIANCE9.stats,effect:renderer.software?'compatibility':RADIANCE9.enabled?'6.3.1':'6.2',capabilities:renderer.capabilities9||null}};};
const initBefore9=init;init=function(){initBefore9();if(renderer){
 document.querySelector('.topbtns').insertAdjacentHTML('afterbegin','<button id="graphics-open9" class="tiny">效果 / 设置</button>');
 $('graphics-open9').onclick=()=>openPanel('settings');syncGraphicsEffect9();window.__radiance9=RADIANCE9;
}};
