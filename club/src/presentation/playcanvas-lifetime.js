// Compatibility for the pinned PlayCanvas 2.22.1 WebGL backend. Keep vendor bytes intact.
// Upstream webgl-vertex-buffer.js omits the single-buffer VAO deletion; the
// webgl-render-target.js destructor omits non-shared MSAA depth deletion and
// uses deleteRenderbuffer for MRT framebuffer pairs. Apply only to this device.
// https://github.com/playcanvas/engine/tree/v2.22.1/src/platform/graphics/webgl
export function installWebGLLifetimeFixes(device){
 const patched=new WeakSet();
 const vertex=impl=>{
  if(patched.has(impl))return impl;patched.add(impl);const destroy=impl.destroy;
  impl.destroy=function(d){if(this.vao){d.unbindVertexArray();d.gl.deleteVertexArray(this.vao);this.vao=null;}return destroy.call(this,d);};return impl;
 };
 const target=impl=>{
  if(patched.has(impl))return impl;patched.add(impl);const destroy=impl.destroy;
  impl.destroy=function(d){
   if(this._glMsaaDepthBuffer&&!this.msaaDepthBufferKey){d.gl.deleteRenderbuffer(this._glMsaaDepthBuffer);this._glMsaaDepthBuffer=null;}
   for(const pair of this.colorMrtFramebuffers||[]){if(pair.msaaFB)d.gl.deleteFramebuffer(pair.msaaFB);if(pair.resolveFB)d.gl.deleteFramebuffer(pair.resolveFB);pair.msaaFB=null;pair.resolveFB=null;}
   return destroy.call(this,d);
  };return impl;
 };
 const createVertex=device.createVertexBufferImpl,createTarget=device.createRenderTargetImpl;
 device.createVertexBufferImpl=function(...args){return vertex(createVertex.apply(this,args));};
 device.createRenderTargetImpl=function(...args){return target(createTarget.apply(this,args));};
 for(const buffer of device.buffers)if('vao' in buffer.impl)vertex(buffer.impl);
 for(const t of device.targets)target(t.impl);
}
