// Same instrument artwork and values for both renderers. Updated only when a
// displayed integer changes, rather than uploading a canvas on every frame.
export function createDashboard(){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
 return {canvas,last:'',speed:0,nitro:100};
}
export function paintDashboard(display,speed=0,nitro=100){
 speed=Math.round(Math.abs(speed)*3.6);nitro=Math.round(nitro);
 const key=speed+'/'+nitro;if(display.last===key)return false;
 Object.assign(display,{last:key,speed,nitro});
 const ctx=display.canvas.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(0,0,1024,256);
 ctx.strokeStyle='#fff';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(40,238);ctx.lineTo(175,21);ctx.lineTo(845,21);ctx.lineTo(985,238);ctx.closePath();ctx.stroke();
 ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='600 153px monospace';ctx.fillText(String(speed),570,123);
 ctx.font='23px sans-serif';ctx.fillText('KM/H',570,217);
 for(let i=0;i<10;i++){ctx.strokeRect(208,183-i*15,83,10);if(i<nitro/10)ctx.fillRect(208,183-i*15,83,10);}
 ctx.font='19px sans-serif';ctx.fillText('NITRO '+nitro+'%',250,217);
 ctx.font='600 39px sans-serif';ctx.fillText('GT',805,120);ctx.font='16px sans-serif';ctx.fillText('HARBOR',805,160);
 return true;
}
