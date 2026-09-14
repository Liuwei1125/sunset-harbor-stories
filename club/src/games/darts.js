import {PI,TAU,V,add,sub,mul,dot,norm,length,dist2,forward,right,mix,clamp,lerpAngle,basis,bx,bmul} from '../core/math.js';
import {formatTime} from '../core/progress.js';
import {trackAt,trackNearest} from '../core/track.js';
import {LEVELS,TUNES,WEAPONS,SKINS} from './catalog.js';

export const DART_ORDER=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
export function dartScore(x,y){
 const radius=Math.hypot(x,y);if(radius>.170)return {score:0,number:0,multiplier:0,label:'脱靶',double:false};if(radius<=.00635)return {score:50,number:25,multiplier:2,label:'内靶心 50',double:true};if(radius<=.0159)return {score:25,number:25,multiplier:1,label:'外靶心 25',double:false};
 const angle=((Math.atan2(x,y)+TAU+PI/20)%TAU),sector=Math.floor(angle/(TAU/20))%20,number=DART_ORDER[sector];let multiplier=1;if(radius>=.162)multiplier=2;else if(radius>=.099&&radius<=.107)multiplier=3;
 return {score:number*multiplier,number,multiplier,label:(multiplier===3?'T':multiplier===2?'D':'')+number,double:multiplier===2};
}
export function checkout(remaining,darts=3,double=true){
 if(!Number.isInteger(remaining)||remaining<2&&double||remaining<1)return null;const all=[];for(let i=20;i>=1;i--){all.push({score:i*3,label:'T'+i,double:false},{score:i*2,label:'D'+i,double:true},{score:i,label:String(i),double:false});}all.unshift({score:50,label:'BULL',double:true},{score:25,label:'25',double:false});
 function search(n,left){for(const v of all)if(v.score===n&&(!double||v.double))return [v.label];if(left===1)return null;for(const v of all){if(n-v.score<(double?2:1))continue;const next=search(n-v.score,left-1);if(next)return [v.label,...next];}return null;}return remaining>180?null:search(remaining,Math.max(1,darts));
}

export function createDarts(core){
 const session=core.session;
function apply(hit){
 const r=session.run,d=r.def;r.throws++;r.shots++;r.lastDart=hit;r.turn.push(hit);r.history.push(hit.label);r.history=r.history.slice(-12);if(hit.score>0)r.hits++;
 let bust=false,won=false;
 if(d.rule==='301'||d.rule==='501'){
  const next=r.remaining-hit.score;if(next<0||(d.double&&next===1)||(next===0&&d.double&&!hit.double)){bust=true;r.remaining=r.turnStart;r.busts++;core.message('爆镖 · 本轮得分作废，回到 '+r.remaining,2);core.tone(150,.13,.07,'triangle',85);}
  else{r.remaining=next;r.score=r.bankedScore+d.goal-next;won=next===0;core.message(`${hit.label} · 剩余 ${next}`,1.5);}
 }else if(d.rule==='around'){
  if(hit.number===r.around){r.around++;r.score=r.bankedScore+r.around-1;core.message(`命中 ${hit.number} · 下一个 ${r.around>10?'完成':r.around}`,1.5);}else core.message(`${hit.label} · 目标数字 ${r.around}`,1.5);won=r.around>10;
 }else{const points=hit.score*(d.rule==='triple'&&hit.multiplier===3?2:1);r.score+=points;core.message(hit.label+(points?' +'+points:''),1.5);}
 if(bust)r.score=r.bankedScore+d.goal-r.remaining;
 core.emit('dart',{...hit,remaining:r.remaining,turn:r.turn.length,bust,won});
 if(won&&session.playlist!=='endless'){r.bestTurn=Math.max(r.bestTurn,r.turn.reduce((s,h)=>s+h.score,0));const pace=r.throws/(d.rule==='around'?30:Math.ceil(d.throws*core.difficulty().time));core.award(true,r.throws,pace<.45?3:pace<.72?2:1,[[r.throws+' 镖','完成用镖'],[r.bestTurn+' 分','最佳轮分'],[r.busts+' 次','爆镖'],[r.def.opponent?r.aiRemaining+' 分':'—','对手剩余']]);return;}
 const turnEnded=r.turn.length===3||bust;
 if(turnEnded){r.bestTurn=Math.max(r.bestTurn,bust?0:r.turn.reduce((s,h)=>s+h.score,0));r.turn=[];r.turnStart=r.remaining;r.round++;r.cooldown=1.5;if(d.opponent){r.aiTurn=true;r.aiAt=r.elapsed+1.5;r.aiThrows=0;r.aiTurnStart=r.aiRemaining;r.aiLast=[];}}
 if(session.playlist==='endless'&&won){r.completedSets++;r.bankedScore+=d.goal;r.score=r.bankedScore;r.remaining=d.goal;r.turnStart=d.goal;r.around=1;r.bestTurn=Math.max(r.bestTurn,r.turn.reduce((s,h)=>s+h.score,0));r.turn=[];if(!turnEnded)r.round++;r.cooldown=1.5;r.aiRemaining=501;r.aiTurnStart=501;r.aiTurn=false;r.aiThrows=0;core.message('完成第 '+r.completedSets+' 局 · 新的一局开始',2);}
 if(session.playlist!=='endless'&&r.throws>=r.limit){const goal=d.goal*(core.difficulty().id==='casual'?.7:core.difficulty().id==='expert'?1.15:1),success=['score','triple'].includes(d.rule)&&r.score>=goal,medal=r.score>=goal*1.65?3:r.score>=goal*1.2?2:1;core.award(success,core.lowerIsBetter()?r.throws:r.score,medal,[[r.throws+' 镖','投掷次数'],[r.bestTurn+' 分','最佳轮分'],[Math.round(r.hits/r.shots*100)+'%','上靶率'],[d.double?'双倍收尾':d.rule==='around'?'数字 1—10':'累计得分','本关规则']]);}
}
function stepAI(){
 const r=session.run;if(!r.aiTurn||r.elapsed<r.aiAt)return;let target={number:20,multiplier:3},route=checkout(r.aiRemaining,3-r.aiThrows,true);
 if(route){const label=route[0];target=label==='BULL'?{number:25,multiplier:2}:label==='25'?{number:25,multiplier:1}:{number:parseInt(label.replace(/[TD]/,'')),multiplier:label[0]==='T'?3:label[0]==='D'?2:1};}
 const skill=core.difficulty().id==='casual'?.22:core.difficulty().id==='sport'?.48:.68;if(core.random()>skill){target.multiplier=1;if(core.random()>.65)target.number=[1,5,12,18][Math.floor(core.random()*4)];}
 const hit={score:target.number*target.multiplier,double:target.multiplier===2,label:(target.multiplier===3?'T':target.multiplier===2?'D':'')+target.number},next=r.aiRemaining-hit.score,bust=next<0||next===1||(next===0&&!hit.double);r.aiThrows++;r.aiLast.push(hit.label);
 if(bust){r.aiRemaining=r.aiTurnStart;r.aiThrows=3;r.aiLast.push('爆镖');}else r.aiRemaining=next;
 core.message(`对手：${r.aiLast.join(' / ')}\n剩余 ${r.aiRemaining}`,1.4);core.emit('ai-dart',{remaining:r.aiRemaining,hit:hit.label,bust});
 if(r.aiRemaining===0&&session.playlist!=='endless'){core.award(false,r.throws,0,[[r.remaining+' 分','你的剩余'],['0 分','对手完成'],[r.bestTurn+' 分','最佳轮分']]);return;}
 if(r.aiRemaining===0){r.aiWins++;r.bankedScore+=r.def.goal-r.remaining;r.score=r.bankedScore;r.remaining=r.turnStart=r.def.goal;r.turn=[];r.aiRemaining=501;r.aiThrows=3;core.message('对手完成一局 · 双方重新开始',2);}
 if(r.aiThrows>=3){r.aiTurn=false;r.cooldown=1.1;}else r.aiAt=r.elapsed+1.15;
}

 return {apply,stepAI};
}
