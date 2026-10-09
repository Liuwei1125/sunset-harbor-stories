(function(root){'use strict';
 function create(scene,B=root.BABYLON,base='./models/'){
  const telemetry=FleetTelemetry.create(scene,B);let current=null,config=null,key=null,lod=null,request=0,disposed=false,steering=0,spin=0,paint=null,dark=false,wheelDemo=false;
  function materials(){if(!current)return;for(const m of current.materials){if(m.name==='Body paint')m.albedoColor=B.Color3.FromHexString(paint||'#'+config.paint).toLinearSpace();if(m.name==='Upholstery')m.albedoColor=B.Color3.FromHexString(dark?'#303841':'#B7BEC3').toLinearSpace();}}
  const api={telemetry,async load(id,level='high'){
   if(disposed)throw Error('Vehicle disposed');if(!['model-y','model-s','roadster','cybertruck'].includes(id)||!['high','low'].includes(level))throw Error('Invalid asset selection');const token=++request;
   const r=await fetch(`${base}${id}/manifest.json`);if(!r.ok)throw Error(`${id}: manifest ${r.status}`);const cfg=await r.json();const next=await B.SceneLoader.LoadAssetContainerAsync(`${base}${id}/`,`${id}.${level}.glb`,scene);
   if(disposed||token!==request){next.dispose();return false;}
   try{telemetry.attach(next,cfg);}catch(e){next.dispose();throw e;}
   if(current){current.removeAllFromScene();current.dispose();}if(key!==id){paint=null;spin=0;}current=next;config=cfg;key=id;lod=level;current.addAllToScene();materials();api.tick(0);return true;
  },setTelemetry:p=>telemetry.setTelemetry(p),setSteering(deg){if(Number.isFinite(deg))steering=Math.max(-30,Math.min(30,deg))*Math.PI/180;},setPaint(hex){if(!/^#[\da-f]{6}$/i.test(hex))return false;paint=hex;materials();return true;},setInterior(v){dark=Boolean(v);materials();},setWheelDemo(v){wheelDemo=Boolean(v);},
  tick(dt){if(disposed)return;const d=Number.isFinite(dt)?Math.max(0,Math.min(dt,.1)):0;telemetry.tick(d);if(!current)return;const s=telemetry.getState(),speed=s.gear==='P'||s.source==='demo'&&!s.demo?0:s.speedKph/3.6*(s.gear==='R'?-1:1);spin=(spin-d*(wheelDemo?2.4:speed/config.radius))% (Math.PI*2);for(const n of current.transformNodes){if(n.name.startsWith('joint:wheel-'))n.rotationQuaternion=B.Quaternion.RotationAxis(B.Axis.X,spin);else if(n.name.startsWith('joint:steer-')){let a=0;if(n.name.includes('front')&&Math.abs(steering)>.00001){const wb=config.wheelFront-config.wheelRear,r=wb/Math.tan(Math.abs(steering)),inner=(steering>0)===n.name.endsWith('left');a=Math.sign(steering)*Math.atan(wb/(r+(inner?-config.track:config.track)));}n.rotationQuaternion=B.Quaternion.RotationAxis(B.Axis.Y,a);}else if(n.name==='joint:steering')n.rotationQuaternion=B.Quaternion.RotationAxis(new B.Vector3(0,.18,.984).normalize(),-steering*10);}},
  info:()=>({key,lod,config,paint:paint||'#'+(config?.paint||'FFFFFF'),dark,spin,steering:steering*180/Math.PI,triangles:current?.meshes.reduce((n,m)=>n+(m.getTotalIndices?.()||0)/3,0)||0,disposed}),getContainer:()=>current,pose:()=>current?.transformNodes.filter(n=>n.name.startsWith('joint:')).map(n=>({name:n.name,q:n.rotationQuaternion?.asArray()}))||[],
  dispose(){if(disposed)return;disposed=true;request++;telemetry.dispose();if(current){current.removeAllFromScene();current.dispose();}current=null;}
  };return api;
 }
 root.FleetVehicle=Object.freeze({create});
})(globalThis);
