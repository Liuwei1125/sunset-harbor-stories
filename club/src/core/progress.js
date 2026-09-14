import {clamp} from './math.js';
import {MODES, LEVELS, DIFFICULTIES, SKINS} from '../games/catalog.js';

export const SAVE_KEY='sunset-harbor-club-v2';
export const LEGACY_KEY='sunset-harbor-club-v1';
export const defaultSettings=()=>({quality:'auto',look:'natural',volume:.65,sensitivity:1,assist:true,skin:0,tune:0,weapon:1,difficulty:'casual',engine:'babylon',resolution:1,camera:'chase'});
export const emptyProgress=()=>({version:2,xp:0,records:{},ghosts:{},history:[],settings:defaultSettings(),migration:null});
const finite=(value,min,max,fallback)=>Number.isFinite(value)?clamp(value,min,max):fallback;
export const localDay=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function hash(text){let s=2166136261;for(const c of String(text))s=Math.imul(s^c.charCodeAt(0),16777619);return s>>>0;}
export function lowerIsBetter(mode,level,playlist='levels'){
  return playlist!=='endless'&&(mode==='race'||mode==='darts'&&['around','301','501'].includes(LEVELS.darts[level].rule));
}
export function formatTime(seconds){return `${Math.floor(seconds/60)}:${(seconds%60).toFixed(2).padStart(5,'0')}`;}
export function scoreLabel(value,mode,level,playlist='levels'){
  return mode==='race'&&playlist!=='endless'?formatTime(value):Math.round(value)+' '+(mode==='race'?'米':mode==='darts'&&lowerIsBetter(mode,level,playlist)?'镖':MODES[mode].unit);
}
export function recordKey(mode,level,difficulty,playlist,day){return `${mode}:${level}:${difficulty}:${playlist==='daily'?'daily-'+day:playlist}`;}

export function validateProgress(raw){
  const src=typeof raw==='string'?JSON.parse(raw):raw;
  if(!src||![1,2].includes(src.version))throw Error('不支持这份存档版本。请选择港湾休闲俱乐部的进度文件。');
  const out=emptyProgress(),s=src.settings||{};
  out.xp=Math.floor(finite(src.xp,0,1e8,0));
  out.settings={
    ...defaultSettings(),quality:['auto','high','medium','low'].includes(s.quality)?s.quality:'auto',
    look:s.look==='classic'||s.effect==='classic'?'classic':'natural',
    volume:finite(s.volume,0,1,.65),sensitivity:finite(s.sensitivity,.3,2.5,1),assist:s.assist!==false,
    skin:Math.floor(finite(s.skin,0,3,0)),tune:Math.floor(finite(s.tune,0,2,0)),weapon:Math.floor(finite(s.weapon,0,2,1)),
    difficulty:DIFFICULTIES.some(d=>d.id===s.difficulty)?s.difficulty:'casual',
    engine:s.engine==='playcanvas'?'playcanvas':'babylon',resolution:finite(s.resolution,.6,1.5,1),
    camera:['chase','hood','cockpit'].includes(s.camera)?s.camera:'chase'
  };
  if(out.xp<SKINS[out.settings.skin].xp)out.settings.skin=0;
  for(const [k,v] of Object.entries(src.records||{}).slice(0,800)){
    if(!/^(race|shooting|darts|archery):[0-5]:(casual|sport|expert):(levels|endless|daily-\d{4}-\d{2}-\d{2})$/.test(k)||!v||!Number.isFinite(v.best))continue;
    out.records[k]={best:finite(v.best,0,1e7,0),medal:Math.floor(finite(v.medal,0,3,0)),plays:Math.floor(finite(v.plays,1,1e6,1)),date:String(v.date||'').slice(0,24)};
  }
  for(const [k,trace] of Object.entries(src.ghosts||{}).slice(-24)){
    if(!out.records[k]||!k.startsWith('race:')||!Array.isArray(trace))continue;
    const valid=trace.slice(0,8000).filter(p=>Array.isArray(p)&&p.length===5&&p.every(Number.isFinite)&&p.every(n=>Math.abs(n)<1e5));
    if(valid.length>1&&valid.every((p,i)=>i===0||p[0]>valid[i-1][0]))out.ghosts[k]=valid;
  }
  out.history=Array.isArray(src.history)?src.history.slice(-24).filter(h=>h&&MODES[h.mode]&&Number.isFinite(h.score)).map(h=>({mode:h.mode,level:Math.floor(finite(h.level,0,5,0)),score:finite(h.score,0,1e7,0),medal:Math.floor(finite(h.medal,0,3,0)),date:String(h.date||'').slice(0,24)})):[];
  if(src.version===1)out.migration={from:1,method:'copy',note:'原版存档保留'};
  else if(src.migration?.from===1)out.migration={from:1,method:'copy',note:'原版存档保留'};
  return out;
}

export function awardProgress(progress,result){
  const {mode,level,playlist,difficulty,key,day,success,score,medal,elapsed}=result;
  const old=progress.records[key],lower=lowerIsBetter(mode,level,playlist);
  const isBest=!old||(lower?score<old.best:score>old.best);
  const xp=success?50+medal*30+(difficulty==='expert'?35:difficulty==='sport'?15:0):Math.min(30,Math.max(5,Math.floor(elapsed/8)));
  if(success||!lower){
    progress.records[key]={best:isBest?score:old.best,medal:Math.max(medal,old?.medal||0),plays:(old?.plays||0)+1,date:day};
    if(mode==='race'&&success&&isBest&&playlist!=='endless'&&result.trace){
      progress.ghosts[key]=result.trace.slice(0,8000).map(p=>p.slice());
      while(Object.keys(progress.ghosts).length>24)delete progress.ghosts[Object.keys(progress.ghosts)[0]];
    }
  }
  progress.xp+=xp;
  progress.history.push({mode,level,score,medal,date:day});progress.history=progress.history.slice(-24);
  const entries=Object.entries(progress.records);
  if(entries.length>800){
    const permanent=entries.filter(([k])=>!k.includes(':daily-'));
    const daily=entries.filter(([k])=>k.includes(':daily-')).sort((a,b)=>b[1].date.localeCompare(a[1].date));
    progress.records=Object.fromEntries([...permanent,...daily.slice(0,800-permanent.length)]);
  }
  return {...result,isBest:isBest&&success,xp,trace:undefined};
}
