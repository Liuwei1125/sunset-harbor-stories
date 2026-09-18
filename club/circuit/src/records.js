import {PHYSICS_VERSION} from './catalog.js';
export const STORAGE_KEY='sunset-harbor-circuit-v1';
export const recordKey=(s,track)=>[s.car,track.id,track.version,PHYSICS_VERSION,s.setup,Number(s.abs),s.tc,s.regen].join(':');
export function freshSave(){return {version:1,settings:{},records:{},laps:[],xp:0,wins:0,championship:null};}
export function loadSave(storage=globalThis.localStorage){try{const value=JSON.parse(storage.getItem(STORAGE_KEY));if(value?.version!==1||typeof value.records!=='object')return freshSave();return {...freshSave(),...value,laps:Array.isArray(value.laps)?value.laps.slice(-30):[]};}catch{return freshSave();}}
export function storeSave(save,storage=globalThis.localStorage){try{storage.setItem(STORAGE_KEY,JSON.stringify(save));return true;}catch{return false;}}
export function addLap(save,key,lap){save.laps.push({...lap,trace:undefined,key});save.laps=save.laps.slice(-30);if(!lap.valid)return false;save.xp+=15;const best=save.records[key];if(!best||lap.time<best.time){save.records[key]=lap;const keys=Object.keys(save.records);if(keys.length>18)delete save.records[keys[0]];return true;}return false;}
export function feedback(lap,best,track){
 if(!lap.valid)return {sector:lap.badSector??0,title:'这一圈没有计入纪录',text:lap.reason||'四轮越过赛道边线。先减小入弯速度，保持整圈有效。'};
 if(!best||!best.sectors?.length)return {sector:0,title:'已建立你的参考圈',text:'再跑一圈即可比较每段用时和出弯速度。优先保持路线一致，再逐步推迟刹车点。'};
 let index=0,loss=-Infinity;lap.sectors.forEach((s,i)=>{const d=s.time-best.sectors[i].time;if(d>loss){loss=d;index=i;}});const current=lap.sectors[index],reference=best.sectors[index];const speedLoss=reference.exitSpeed-current.exitSpeed;
 return {sector:index,title:`${track.sectors[index]} · ${loss>=0?'慢':'快'} ${Math.abs(loss).toFixed(2)} 秒`,text:`出段速度 ${current.exitSpeed.toFixed(0)} km/h，参考 ${reference.exitSpeed.toFixed(0)} km/h。${speedLoss>3?'出弯速度较低：尝试更早完成制动，逐渐回正方向并加油。':current.brake>reference.brake+.8?'本段刹车时间较长：先稳定入弯，再尝试缩短拖刹。':'保持当前路线，重点观察弯前刹车点与加速时机。'}`};
}
export function classify(entries){return [...entries].sort((a,b)=>{if(a.finished&&b.finished)return a.finishTime+a.penalty-b.finishTime-b.penalty;if(a.finished!==b.finished)return a.finished?-1:1;return b.progress-a.progress;}).map((e,i)=>({...e,place:i+1,classifiedTime:e.finished?e.finishTime+e.penalty:null}));}
