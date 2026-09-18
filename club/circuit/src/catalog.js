export const PHYSICS_VERSION='circuit-1';
export const DT=1/120;
export const CARS={
 'bmw-m4':{id:'bmw-m4',name:'BMW M4',edition:'2015 F82 · 双离合',kind:'ice',description:'前置后驱。低转速扭矩充足，慢弯出弯要逐渐踩下油门。',mass:1701,power:317000,torque:550,redline:7500,idle:850,ratios:[4.806,2.593,1.701,1.277,1,.844,.671],finalDrive:3.462,frontWeight:.523,frontDrive:0,com:.55,radius:.358,axles:[1.558,1.318],halfTrack:.789,mu:1.08,cornering:9.8,drag:.75,downforce:.11,spring:36000,damping:3600,maxSteer:.48,fuel:60,paint:'#287aa0',engineOrder:3},
 'ferrari-458':{id:'ferrari-458',name:'Ferrari 458',edition:'458 动力参考 · 开顶外观',kind:'ice',description:'中置后驱。轻快、高转速动力；转向响应快，入弯前完成大部分制动。',mass:1560,power:419000,torque:540,redline:9000,idle:1100,ratios:[3.077,2.185,1.626,1.286,1.028,.839,.693],finalDrive:5.143,frontWeight:.42,frontDrive:0,com:.48,radius:.3575,axles:[1.153,1.493],halfTrack:.823,mu:1.17,cornering:11.2,drag:.69,downforce:.2,spring:39000,damping:3300,maxSteer:.46,fuel:86,paint:'#b8292b',engineOrder:4},
 'su7':{id:'su7',name:'Xiaomi SU7',edition:'2026 Max · 独立外观模型',kind:'ev',description:'双电机四驱。起步与牵引力强，车重大；提早刹车，用能量回收稳定入弯。',mass:2355,power:508000,torque:838,redline:22000,idle:0,ratios:[9.5],finalDrive:1,frontWeight:.5,frontDrive:.43,com:.43,radius:.355,axles:[1.55,1.45],halfTrack:.841,mu:1.07,cornering:10.5,drag:.55,downforce:.1,spring:47000,damping:4600,maxSteer:.47,battery:101.7,paint:'#3696ad',engineOrder:1}
};
export const SETUPS={balanced:{name:'均衡',grip:1,drag:1,spring:1,bias:.63},stable:{name:'稳定',grip:.99,drag:1.04,spring:.92,bias:.68},agile:{name:'灵活',grip:1,drag:.97,spring:1.1,bias:.58}};
export const DIFFICULTIES={club:{name:'俱乐部',pace:.76,reaction:.25,error:.22},sport:{name:'竞技',pace:.88,reaction:.17,error:.12},expert:{name:'挑战',pace:.97,reaction:.1,error:.06}};
export const DEFAULTS={car:'bmw-m4',track:'harbor',event:'practice',setup:'balanced',abs:true,tc:2,regen:1,difficulty:'club',camera:0,volume:.25,quality:'auto',paint:0,hints:true};
export const POINTS=[12,9,7,5];
