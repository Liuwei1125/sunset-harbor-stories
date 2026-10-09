/* Babylon adapter for the independent Highland asset. No game or network state. */
(function(root){
 'use strict';
 function create(scene,B=root.BABYLON,base='./'){
  const telemetry=Model3Telemetry.create(scene,B);let container=null,joints=[],paint='#94252C',interior='#C8C9C7',steering=0,spin=0,wheelDemo=false,request=0,disposed=false,lod=null;
  function applyMaterials(){if(!container)return;for(const m of container.materials){if(m.name==='Body paint')m.albedoColor=B.Color3.FromHexString(paint).toLinearSpace();if(m.name==='Ceramic upholstery')m.albedoColor=B.Color3.FromHexString(interior).toLinearSpace();}}
  const api={telemetry,
   async load(level='high'){
    if(disposed)throw new Error('Vehicle is disposed');if(!['high','low'].includes(level))throw new Error('Unknown LOD');const id=++request;
    const next=await B.SceneLoader.LoadAssetContainerAsync(base,`tesla-model-3.${level}.glb`,scene);
    if(disposed||id!==request){next.dispose();return false;}
    // Validate both display bindings before disposing the currently visible car.
    try{telemetry.attach(next);}catch(e){next.dispose();if(container)telemetry.attach(container);throw e;}
    if(container){container.removeAllFromScene();container.dispose();}
    container=next;container.addAllToScene();lod=level;joints=container.transformNodes.filter(n=>n.name.startsWith('joint:'));applyMaterials();api.tick(0);return true;
   },
   setPaint(hex){if(!/^#[0-9a-f]{6}$/i.test(hex))return false;paint=hex;applyMaterials();return true;},
   setInterior(hex){if(!/^#[0-9a-f]{6}$/i.test(hex))return false;interior=hex;applyMaterials();return true;},
   setSteering(degrees){if(Number.isFinite(degrees))steering=Math.max(-30,Math.min(30,degrees))*Math.PI/180;},
   setWheelDemo(enabled){wheelDemo=Boolean(enabled);},setTelemetry:p=>telemetry.setTelemetry(p),
   tick(dt){if(disposed)return;const seconds=Number.isFinite(dt)?Math.max(0,Math.min(dt,.1)):0;telemetry.tick(seconds);const t=telemetry.getState();const speed=t.gear==='P'||t.source==='demo'&&!t.demo?0:t.speedKph/3.6*(t.gear==='R'?-1:1);spin=(spin-seconds*(wheelDemo?2.4:speed/.3451))%(Math.PI*2);
    for(const node of joints){const name=node.name.slice(6);if(name.startsWith('wheel')){let angle=0;if(name.includes('front')&&Math.abs(steering)>1e-5){const radius=2.87322/Math.tan(Math.abs(steering)),inner=(steering>0)===name.endsWith('left');angle=Math.sign(steering)*Math.atan(2.87322/(radius+(inner?-.799:.799)));}node.rotationQuaternion=B.Quaternion.RotationAxis(B.Axis.Y,angle).multiply(B.Quaternion.RotationAxis(B.Axis.X,spin));}else if(name==='steering')node.rotationQuaternion=B.Quaternion.RotationAxis(new B.Vector3(0,.309,.951).normalize(),-steering*12);}
   },
   info(){return {lod,paint,interior,steeringDegrees:steering*180/Math.PI,spin,triangles:container?.meshes.reduce((n,m)=>n+(m.getTotalIndices?.()||0)/3,0)||0,ready:!!container,disposed};},
   getContainer:()=>container,pose:()=>joints.map(n=>({name:n.name,q:n.rotationQuaternion?.asArray()||[0,0,0,1]})),
   dispose(){if(disposed)return;disposed=true;request++;telemetry.dispose();if(container){container.removeAllFromScene();container.dispose();}container=null;joints=[];}
  };return api;
 }
 root.Model3Vehicle=Object.freeze({create});
})(globalThis);
