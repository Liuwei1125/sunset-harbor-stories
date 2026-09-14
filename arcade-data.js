/* Harbor Club: independent rules, authored events and versioned local progress. */
const CLUB_VERSION='1.0.0',CLUB_SAVE='sunset-harbor-club-v1';
const CLUB_MODES={
 race:{name:'赛车竞技',en:'APEX / MOTOR CLUB',tag:'抓住下一个弯',description:'坐进驾驶舱，在海岸、林道与货港赛道上挑战三位对手。刹车入弯，漂移蓄能，氮气冲线。',accent:'#e8aa61',icon:'01',unit:'秒'},
 shooting:{name:'射击训练',en:'PRECISION / RANGE',tag:'让每一发都有意义',description:'钢靶反应、移动追踪、敌我辨识与综合考核。控制后坐力，保持连击，在弹匣间隙换弹。',accent:'#91cbc0',icon:'02',unit:'分'},
 darts:{name:'飞镖俱乐部',en:'FLIGHT / SOCIAL CLUB',tag:'三支镖，无数可能',description:'从靶心练习到 501 双倍收尾。读懂扇区，稳定出手，和俱乐部对手轮流完成结镖。',accent:'#e5ab91',icon:'03',unit:'分'},
 archery:{name:'林间射箭',en:'WINDSONG / ARCHERY',tag:'听风，然后松弦',description:'拉满反曲弓，留意距离与侧风，让箭沿真实弹道飞向十环。每一支箭都会留在靶上。',accent:'#b9c986',icon:'04',unit:'环'}
};
const CLUB_DIFFICULTIES=[
 {id:'casual',name:'休闲',description:'较宽容的时限、稳定辅助与温和对手',time:1.4,size:1.15,ai:.79,wind:.45,sway:.35},
 {id:'sport',name:'进阶',description:'标准时限、完整风偏与更快对手',time:1,size:1,ai:.94,wind:1,sway:.72},
 {id:'expert',name:'专家',description:'更小目标、更短窗口与竞技对手',time:.85,size:.84,ai:1.08,wind:1.45,sway:1.1}
];
const CLUB_LEVELS={
 race:[
  {name:'港湾热身',sub:'港湾短环 / 1 圈',rx:55,rz:80,wave:.03,width:13,laps:1,theme:'coast',pace:21},
  {name:'海岸长弯',sub:'高速海岸 / 2 圈',rx:84,rz:110,wave:.12,width:12,laps:2,theme:'coast',pace:24},
  {name:'林间技术',sub:'复合弯道 / 2 圈',rx:62,rz:82,wave:.24,width:10,laps:2,theme:'forest',pace:19},
  {name:'峡谷冲刺',sub:'高低起伏 / 2 圈',rx:78,rz:114,wave:.20,width:11,laps:2,theme:'canyon',pace:22},
  {name:'货港穿梭',sub:'集装箱技术赛 / 2 圈',rx:66,rz:98,wave:.30,width:10,laps:2,theme:'dock',pace:20},
  {name:'俱乐部决赛',sub:'全长综合 / 3 圈',rx:88,rz:122,wave:.23,width:11,laps:3,theme:'coast',pace:24}
 ],
 shooting:[
  {name:'第一发',sub:'静态精度 / 8 靶',quota:8,duration:90,distance:12,window:9,moving:false,friends:false},
  {name:'反应速射',sub:'弹出靶 / 16 靶',quota:16,duration:85,distance:15,window:3.8,moving:false,friends:false},
  {name:'横向追踪',sub:'移动轨道 / 18 靶',quota:18,duration:105,distance:18,window:5,moving:true,friends:false},
  {name:'辨识与克制',sub:'黄色可射 / 青色禁射',quota:18,duration:100,distance:16,window:4.5,moving:false,friends:true},
  {name:'近远转换',sub:'12—40 米 / 20 靶',quota:20,duration:120,distance:28,window:5,moving:true,friends:false,mixed:true},
  {name:'综合考核',sub:'全项目 / 28 靶',quota:28,duration:145,distance:24,window:3.8,moving:true,friends:true,mixed:true}
 ],
 darts:[
  {name:'找到靶心',sub:'9 镖 / 累计得分',rule:'score',throws:9,goal:120},
  {name:'环游数字',sub:'依次命中 1—10',rule:'around',throws:30,goal:10},
  {name:'三倍时刻',sub:'12 镖 / 三倍区加成',rule:'triple',throws:12,goal:180},
  {name:'301 起点',sub:'301 分 / 任意收尾',rule:'301',throws:45,goal:301},
  {name:'501 精准结镖',sub:'501 分 / 双倍收尾',rule:'501',throws:60,goal:501,double:true},
  {name:'俱乐部对决',sub:'501 / 与 AI 轮流投掷',rule:'501',throws:75,goal:501,double:true,opponent:true}
 ],
 archery:[
  {name:'初次满弓',sub:'10 米 / 6 箭',distance:10,arrows:6,goal:26,wind:0},
  {name:'二十米线',sub:'20 米 / 9 箭',distance:20,arrows:9,goal:38,wind:.3},
  {name:'风的方向',sub:'25 米 / 9 箭',distance:25,arrows:9,goal:36,wind:1.5},
  {name:'远处的金心',sub:'40 米 / 12 箭',distance:40,arrows:12,goal:42,wind:1},
  {name:'林间移动靶',sub:'20 米 / 横向移动',distance:20,arrows:12,goal:42,wind:.7,moving:true},
  {name:'巡回决赛',sub:'15—45 米 / 15 箭',distance:30,arrows:15,goal:55,wind:1.3,moving:true,mixed:true}
 ]
};
const CLUB_TUNES=[{name:'均衡 GT',max:44,accel:12,grip:7,nitro:16},{name:'弯道 RS',max:40,accel:13.5,grip:9,nitro:14},{name:'极速 LM',max:50,accel:10.5,grip:5.8,nitro:19}];
const CLUB_WEAPONS=[{name:'9MM / 轻型手枪',id:0,mag:12,delay:.25,reload:1.05,kick:.008},{name:'AR7 / 竞技步枪',id:3,mag:30,delay:.11,reload:1.65,kick:.012},{name:'LONGWATCH / 精密步枪',id:4,mag:5,delay:.8,reload:2.1,kick:.020}];
const CLUB_SKINS=[{name:'海港原色',color:'#e5ae67',xp:0},{name:'薄荷竞速',color:'#6fbaa9',xp:300},{name:'珊瑚日落',color:'#d78067',xp:900},{name:'冠军银',color:'#b8c8cc',xp:1800}];
const clubDefault=()=>({version:1,xp:0,records:{},ghosts:{},history:[],settings:{effect:'photo',quality:'auto',volume:.65,sensitivity:1,assist:true,skin:0,tune:0,weapon:1,difficulty:'casual'}});
function clubFinite(x,min,max,fallback){return Number.isFinite(x)?clamp(x,min,max):fallback;}
function clubValidate(raw){
 const src=typeof raw==='string'?JSON.parse(raw):raw;if(!src||src.version!==1)throw Error('无法读取这份休闲存档');const out=clubDefault(),s=src.settings||{};
 out.xp=Math.floor(clubFinite(src.xp,0,1e8,0));out.settings={effect:s.effect==='classic'?'classic':'photo',quality:['auto','high','medium','low'].includes(s.quality)?s.quality:'auto',volume:clubFinite(s.volume,0,1,.65),sensitivity:clubFinite(s.sensitivity,.3,2.5,1),assist:s.assist!==false,skin:Math.floor(clubFinite(s.skin,0,3,0)),tune:Math.floor(clubFinite(s.tune,0,2,0)),weapon:Math.floor(clubFinite(s.weapon,0,2,1)),difficulty:CLUB_DIFFICULTIES.some(d=>d.id===s.difficulty)?s.difficulty:'casual'};
 if(out.xp<CLUB_SKINS[out.settings.skin].xp)out.settings.skin=0;
 for(const [k,v]of Object.entries(src.records||{}).slice(0,800)){if(!/^(race|shooting|darts|archery):[0-5]:(casual|sport|expert):(levels|endless|daily-\d{4}-\d{2}-\d{2})$/.test(k)||!v||!Number.isFinite(v.best))continue;out.records[k]={best:clubFinite(v.best,0,1e7,0),medal:Math.floor(clubFinite(v.medal,0,3,0)),plays:Math.floor(clubFinite(v.plays,1,1e6,1)),date:String(v.date||'').slice(0,24)};}
 for(const [k,v]of Object.entries(src.ghosts||{}).slice(-24)){if(!out.records[k]||!k.startsWith('race:')||!Array.isArray(v))continue;out.ghosts[k]=v.slice(0,8000).filter(p=>Array.isArray(p)&&p.length===5&&p.every(Number.isFinite)&&p.every(n=>Math.abs(n)<1e5));}
 out.history=Array.isArray(src.history)?src.history.slice(-24).filter(h=>h&&CLUB_MODES[h.mode]&&Number.isFinite(h.score)).map(h=>({mode:h.mode,level:Math.floor(clubFinite(h.level,0,5,0)),score:clubFinite(h.score,0,1e7,0),medal:Math.floor(clubFinite(h.medal,0,3,0)),date:String(h.date||'').slice(0,24)})):[];return out;
}
function clubLoad(){try{const raw=localStorage.getItem(CLUB_SAVE);return raw?clubValidate(raw):clubDefault();}catch(e){console.info('休闲存档已恢复为可用默认值：',e.message);return clubDefault();}}
const CLUB={version:CLUB_VERSION,save:clubLoad(),mode:'race',level:0,playlist:'levels',phase:'lobby',run:null,time:0,seed:1,events:[],held:new Set(),look:{yaw:0,pitch:0},touch:{active:matchMedia('(pointer:coarse)').matches,steer:0,x:0,y:0},frame:{fps:60,cpu:0,frames:0,errors:[]},decor:[],last:0,accum:0,hitUntil:0,message:'',messageUntil:0};
const clubConfiguredDiff=()=>CLUB_DIFFICULTIES.find(d=>d.id===CLUB.save.settings.difficulty)||CLUB_DIFFICULTIES[0];
const clubDiff=()=>CLUB.run&&CLUB.phase!=='lobby'?CLUB.run.difficulty:clubConfiguredDiff();
const clubDate=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
function clubHash(text){let s=2166136261;for(const c of text)s=Math.imul(s^c.charCodeAt(0),16777619);return s>>>0;}
function clubRandom(){CLUB.seed=(Math.imul(CLUB.seed,1664525)+1013904223)>>>0;return CLUB.seed/4294967296;}
const clubRecordKey=()=>CLUB.run?.key&&CLUB.phase!=='lobby'?CLUB.run.key:`${CLUB.mode}:${CLUB.level}:${clubDiff().id}:${CLUB.playlist==='daily'?'daily-'+clubDate():CLUB.playlist}`;
function clubPersist(){try{const entries=Object.entries(CLUB.save.records);if(entries.length>800){const permanent=entries.filter(([k])=>!k.includes(':daily-')),daily=entries.filter(([k])=>k.includes(':daily-')).sort((a,b)=>b[1].date.localeCompare(a[1].date));CLUB.save.records=Object.fromEntries([...permanent,...daily.slice(0,Math.max(0,800-permanent.length))]);}localStorage.setItem(CLUB_SAVE,JSON.stringify(CLUB.save));return true;}catch(e){clubMessage('浏览器存储已满，可在设置导出进度');return false;}}
function clubEvent(type,data={}){CLUB.events.push({type,t:+CLUB.time.toFixed(3),...data});if(CLUB.events.length>600)CLUB.events.splice(0,100);}
function clubMessage(text,duration=2.2){CLUB.message=text;CLUB.messageUntil=CLUB.time+duration;}
function clubFormatTime(s){return `${Math.floor(s/60)}:${(s%60).toFixed(2).padStart(5,'0')}`;}
const clubLowerIsBetter=(mode=CLUB.mode,level=CLUB.level,playlist=CLUB.playlist)=>playlist!=='endless'&&(mode==='race'||mode==='darts'&&['around','301','501'].includes(CLUB_LEVELS.darts[level].rule));
function clubScoreLabel(score,mode=CLUB.mode,level=CLUB.level,playlist=CLUB.playlist){return mode==='race'&&playlist!=='endless'?clubFormatTime(score):Math.round(score)+' '+(mode==='race'?'米':mode==='darts'&&clubLowerIsBetter(mode,level,playlist)?'镖':CLUB_MODES[mode].unit);}
function clubAward(success,score,medal,details=[]){
 if(CLUB.phase==='result')return;const r=CLUB.run,key=clubRecordKey(),old=CLUB.save.records[key];medal=success?clamp(medal,1,3):0;
 const lower=clubLowerIsBetter(),isBest=!old||(lower?score<old.best:score>old.best),xp=success?50+medal*30+(clubDiff().id==='expert'?35:clubDiff().id==='sport'?15:0):Math.min(30,Math.max(5,Math.floor(r.elapsed/8)));
 // Failed races cannot overwrite a completed time record.
 if(success||!lower){CLUB.save.records[key]={best:isBest?score:old.best,medal:Math.max(medal,old?.medal||0),plays:(old?.plays||0)+1,date:clubDate()};if(CLUB.mode==='race'&&isBest&&CLUB.playlist!=='endless'){CLUB.save.ghosts[key]=r.trace.slice(0,8000);const all=Object.keys(CLUB.save.ghosts);while(all.length>24)delete CLUB.save.ghosts[all.shift()];}}
 CLUB.save.xp+=xp;CLUB.save.history.push({mode:CLUB.mode,level:CLUB.level,score,medal,date:clubDate()});CLUB.save.history=CLUB.save.history.slice(-24);CLUB.result={success,score,medal,details,isBest:isBest&&success,xp};CLUB.phase='result';state.paused=true;clubClearInput();document.exitPointerLock?.();clubPersist();clubEvent('result',{success,score,medal,key});clubRenderResult();tone(success?620:180,.3,.14,'triangle',success?940:90);
}
