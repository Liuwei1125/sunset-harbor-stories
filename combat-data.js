/* Combat V5: fictional arcade rules. No external assets or real organizations. */
const COMBAT_VERSION=5;
const WEAPON_META=[
 {id:'pistol',label:'',tag:'SIDEARM',color:'#a8cfcb',desc:'Reliable close-range sidearm.'},
 {id:'smg',label:'',tag:'AUTOMATIC',color:'#91c7d0',desc:'Fast automatic fire; spread increases while moving.'},
 {id:'shotgun',label:'',tag:'CLOSE QUARTERS',color:'#d7b184',desc:'Seven pellets, strongest at close range.'}
];
WEAPON_META[0].label='\u624b\u67aa';WEAPON_META[1].label='\u51b2\u950b\u67aa';WEAPON_META[2].label='\u9730\u5f39\u67aa';
const EXTRA_WEAPONS=[
 {id:'rifle',name:'AR-7 / RIFLE',cn:'\u7a81\u51fb\u6b65\u67aa',mag:30,ammo:30,reserve:210,maxReserve:300,damage:31,delay:.12,spread:.013,pellets:1,range:200,reloadTime:1.8,color:'#a3c2b2',tag:'ASSAULT',desc:'\u4e2d\u8ddd\u79bb\u7a33\u5b9a\u70b9\u5c04\uff1b\u6301\u7eed\u5c04\u51fb\u6269\u5927\u6563\u5e03\u3002'},
 {id:'sniper',name:'LONGWATCH / SNIPER',cn:'\u72d9\u51fb\u6b65\u67aa',mag:5,ammo:5,reserve:30,maxReserve:45,damage:115,delay:1.15,spread:.016,pellets:1,range:650,reloadTime:2.3,color:'#d7c197',tag:'4x / 8x OPTIC',desc:'\u53f3\u952e\u5f00\u955c\uff0cQ \u5207\u6362 4x / 8x\u3002Shift \u77ed\u6682\u5c4f\u606f\u3002'},
 {id:'grenade',name:'PULSE / GRENADE',cn:'\u624b\u96f7',mag:4,ammo:4,reserve:8,maxReserve:16,damage:140,delay:.75,spread:0,pellets:1,range:45,reloadTime:.65,throwable:true,color:'#b3bf87',tag:'BOUNCE / BLAST',desc:'\u5f27\u7ebf\u629b\u51fa\u3001\u78b0\u649e\u53cd\u5f39\u3001\u5ef6\u65f6\u8303\u56f4\u4f24\u5bb3\uff1b\u6ce8\u610f\u81ea\u8eab\u5b89\u5168\u3002'},
 {id:'molotov',name:'EMBER / INCENDIARY',cn:'\u71c3\u70e7\u74f6',mag:3,ammo:3,reserve:6,maxReserve:12,damage:20,delay:.85,spread:0,pellets:1,range:35,reloadTime:.7,throwable:true,color:'#e1a470',tag:'IMPACT / FIRE',desc:'\u843d\u5730\u7834\u88c2\u5f62\u6210\u77ed\u6682\u706b\u533a\u3002\u6c34\u9762\u4f1a\u7184\u706d\uff0c\u4e0d\u4f1a\u7a7f\u5899\u4f24\u5bb3\u3002'},
 {id:'launcher',name:'COMET / LAUNCHER',cn:'\u706b\u7bad\u53d1\u5c04\u5668',mag:1,ammo:1,reserve:7,maxReserve:12,damage:175,delay:1.2,spread:.003,pellets:1,range:500,reloadTime:2.2,color:'#caa7a0',tag:'PROJECTILE / BLAST',desc:'\u53ef\u89c1\u706b\u7bad\u5f39\u4e0e\u7206\u70b8\u51b2\u51fb\u3002\u5f39\u836f\u6709\u9650\uff0c\u907f\u514d\u8fd1\u8ddd\u79bb\u4f7f\u7528\u3002'}
];
for(const w of EXTRA_WEAPONS){weapons.push({...w});WEAPON_META.push({id:w.id,label:w.cn,tag:w.tag,color:w.color,desc:w.desc});}
for(let i=0;i<weapons.length;i++){weapons[i].id=WEAPON_META[i].id;weapons[i].initialReserve=weapons[i].reserve;}
const ENEMY_TYPES={
 rifle:{name:'\u6b65\u67aa\u624b',hp:110,speed:2.4,range:70,damage:7,interval:.32,mag:8,reload:2.2,color:'#546778',accent:'#e49876',spread:.035},
 heavy:{name:'\u91cd\u88c5\u5b88\u536b',hp:235,speed:1.35,range:62,damage:9,interval:.22,mag:12,reload:3.1,color:'#3c4f56',accent:'#e5b170',spread:.048},
 marksman:{name:'\u7cbe\u786e\u5c04\u624b',hp:85,speed:1.8,range:140,damage:23,interval:2.1,mag:3,reload:2.8,color:'#727761',accent:'#ddb08b',spread:.014}
};
const combat={
 units:[],jets:[],projectiles:[],fires:[],bursts:[],loot:[],covers:[],decoys:[],job:null,result:null,
 scopeZoom:4,breath:4,throwUntil:0,bloom:0,hitText:'',hitUntil:0,scopePulse:0,
 lock:null,lockProgress:0,lockToneAt:0,missileAt:0,cannonAt:0,heat:0,overheated:false,
 flares:6,missiles:8,flareAt:0,incoming:0,boost:1,nextHUD:0,nextId:1,mutating:false,
 mouseMissile:false,center:null,hudNodes:new Map(),lastFire:false,
 score:{kills:0,airKills:0,headshots:0,groundWins:0,airWins:0,survivalBest:0},
 controls:{cannon:false,lock:false,boost:false,steady:false},menuTab:'operations',difficulty:'normal'
};
const OPS={
 ground:{cn:'\u7070\u9e26\u636e\u70b9',en:'IRON HARBOR',sub:'GROUND ASSAULT',desc:'\u7a81\u5165\u865a\u6784\u654c\u5bf9\u6b66\u88c5\u636e\u70b9\uff0c\u6e05\u9664 3 \u8f6e\u589e\u63f4\uff0c\u56de\u6536\u60c5\u62a5\u540e\u64a4\u79bb\u3002',reward:4200},
 air:{cn:'\u593a\u56de\u5236\u7a7a\u6743',en:'SKY SENTINEL',sub:'AIR SUPERIORITY',desc:'\u9a7e\u9a76 FALCON-X \u6218\u6597\u673a\uff0c\u4f7f\u7528\u673a\u70ae\u3001\u9501\u5b9a\u5bfc\u5f39\u4e0e\u5e72\u6270\u5f39\uff0c\u51fb\u843d 3 \u8f6e\u654c\u673a\u3002',reward:5200},
 survival:{cn:'\u6781\u9650\u5b88\u536b',en:'LAST LIGHT',sub:'ENDLESS DEFENSE',desc:'\u6301\u7eed\u8fce\u6218\u66f4\u5f3a\u7684\u654c\u4eba\u3002\u6bcf\u8f6e\u7ed3\u7b97\u5956\u91d1\uff0c\u6ce2\u6b21\u95f4\u53ef\u8865\u7ed9\u4e0e\u6362\u6b66\u5668\u3002',reward:600}
};
FLEET.fighter={name:'FALCON-X',cn:'\u730e\u96bc\u6218\u6597\u673a',medium:'air',color:'#a2b4bf',tag:'AIR COMBAT',detail:'\u673a\u70ae / \u9501\u5b9a\u5bfc\u5f39 / \u52a0\u529b / \u5e72\u6270\u5f39',top:125,lift:23};
CAR_NAMES.fighter='FALCON-X';AIR_KEYS.add('fighter');profile.garage.fighter={owned:true,color:FLEET.fighter.color,mods:{}};
const isFighter=()=>state.car?.kind==='fighter';
const scopeActive=()=>state.started&&!state.paused&&!state.car&&weapons[state.weapon]?.id==='sniper'&&isAiming();
const inputAimScale=()=>scopeActive()?1.15/combat.scopeZoom:1;
const fighterDirection=c=>norm(V(-Math.sin(c.yaw)*Math.cos(c.pitch||0),Math.sin(c.pitch||0),-Math.cos(c.yaw)*Math.cos(c.pitch||0)));
const combatVec=p=>V(p.x,p.y,p.z);
const combatDistance=(a,b)=>length(sub(a,b));
