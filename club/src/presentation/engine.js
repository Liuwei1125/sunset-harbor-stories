const scripts=new Map();
export async function loadScript(url){
 if(scripts.has(url))return scripts.get(url);
 const ready=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.onload=resolve;s.onerror=()=>{s.remove();scripts.delete(url);reject(Error('引擎文件加载失败：'+url));};document.head.append(s);});scripts.set(url,ready);return ready;
}
let loadedEngine=null;
export async function createRenderer(canvas,engine,settings,progress){
 if(loadedEngine&&loadedEngine!==engine)throw Error('切换引擎需要重新载入页面。');
 progress('正在载入画面引擎',.08);loadedEngine=engine;
 if(engine==='playcanvas'){
  await loadScript('./vendor/playcanvas-2.22.1.js');
  const {PlayCanvasRenderer}=await import('./playcanvas.js');return new PlayCanvasRenderer(canvas,settings,progress);
 }
 await loadScript('./vendor/babylon-9.26.0.js');await loadScript('./vendor/babylonjs.loaders-9.26.0.min.js');
 const {BabylonRenderer}=await import('./babylon.js');return new BabylonRenderer(canvas,settings,progress);
}
