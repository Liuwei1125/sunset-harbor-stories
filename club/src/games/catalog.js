// Ported from the verified 6.4 catalog. All events remain available.
export const MODES={
 race:{name:'赛车竞技',en:'APEX / MOTOR CLUB',tag:'抓住下一个弯',description:'驾驶 GT 跑车，在海岸、林道与货港赛道上挑战三位对手。三种视角，随时切换。刹车入弯，漂移蓄能，氮气冲线。',accent:'#e8aa61',icon:'01',unit:'秒'},
 shooting:{name:'射击训练',en:'PRECISION / RANGE',tag:'让每一发都有意义',description:'钢靶反应、移动追踪、敌我辨识与综合考核。控制后坐力，保持连击，在弹匣间隙换弹。',accent:'#91cbc0',icon:'02',unit:'分'},
 darts:{name:'飞镖俱乐部',en:'FLIGHT / SOCIAL CLUB',tag:'三支镖，无数可能',description:'从靶心练习到 501 双倍收尾。读懂扇区，稳定出手，和俱乐部对手轮流完成结镖。',accent:'#e5ab91',icon:'03',unit:'分'},
 archery:{name:'林间射箭',en:'WINDSONG / ARCHERY',tag:'听风，然后松弦',description:'拉满反曲弓，留意距离与侧风，让箭沿真实弹道飞向十环。每一支箭都会留在靶上。',accent:'#b9c986',icon:'04',unit:'环'}
};
export const DIFFICULTIES=[
 {id:'casual',name:'休闲',description:'较宽容的时限、稳定辅助与温和对手',time:1.4,size:1.15,ai:.79,wind:.45,sway:.35},
 {id:'sport',name:'进阶',description:'标准时限、完整风偏与更快对手',time:1,size:1,ai:.94,wind:1,sway:.72},
 {id:'expert',name:'专家',description:'更小目标、更短窗口与竞技对手',time:.85,size:.84,ai:1.08,wind:1.45,sway:1.1}
];
export const LEVELS={
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
export const TUNES=[{name:'均衡 GT',max:44,accel:12,grip:7,nitro:16},{name:'弯道 RS',max:40,accel:13.5,grip:9,nitro:14},{name:'极速 LM',max:50,accel:10.5,grip:5.8,nitro:19}];
export const WEAPONS=[{name:'9MM / 轻型手枪',id:0,mag:12,delay:.25,reload:1.05,kick:.008},{name:'AKM / 木饰步枪',id:3,mag:30,delay:.11,reload:1.65,kick:.012},{name:'LONGWATCH / 精密步枪',id:4,mag:5,delay:.8,reload:2.1,kick:.020}];
export const SKINS=[{name:'海港原色',color:'#e5ae67',xp:0},{name:'薄荷竞速',color:'#6fbaa9',xp:300},{name:'珊瑚日落',color:'#d78067',xp:900},{name:'冠军银',color:'#b8c8cc',xp:1800}];

export const FIXED_DT=1/120;
export const SUPPORTED_ENGINES={babylon:["race","shooting","darts","archery"],playcanvas:["race"]};
export const WEAPON_ASSETS=["sidearm-pistol","field-akm","longwatch-sniper"];
