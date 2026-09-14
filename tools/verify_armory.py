"""Real offline browser: ammo, cover, materials, animation, budgets and visual QA."""
import hashlib
import json
from playwright.sync_api import sync_playwright
from verify_config import ROOT, OUT, PREVIEW, CHROMIUM

checks=[];errors=[]
def check(name,value):
    ok=bool(value.get('ok')) if isinstance(value,dict) else bool(value)
    checks.append({'name':name,'pass':ok,'detail':value})
    print(('PASS ' if ok else 'FAIL ')+name,flush=True)

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=CHROMIUM)
    ctx=browser.new_context(viewport={'width':1440,'height':900},offline=True)
    page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script('window.requestAnimationFrame=()=>0')
    page.goto((ROOT/'index.html').as_uri());page.wait_for_function('!!window.__experience',polling=20)
    page.locator('#start').click();page.locator('[data-route="road"]').click()
    check('Offline game starts with authored armory',page.evaluate('state.started&&Object.keys(ARMORY_ASSET_PACK8.assets).length===8'))
    page.evaluate('''()=>{
      window.cleanRange8=()=>{clearCombatEncounter();experience.mission=null;experience.action=null;state.car=null;state.paused=false;state.dead=false;state.started=true;
        colliders.length=0;collisionIndex.cells.clear();cars.length=0;enemies.length=0;player.pos=V(110,.24,330);player.prevPos={...player.pos};player.phase=0;player.yaw=0;player.hp=100;experience.movement=0;experience.crouching=false;
        cam.yaw=0;cam.pitch=0;cam.recoil=0;cam.eye=V(110,1.59,334);cam.dir=V(0,0,-1);state.t=10;state.nextShot=0;mouse.left=mouse.right=false;keys.clear();};window.rangeWall8=b=>{colliders.push(b);collisionIndex.insert(b);};cleanRange8();
    }''')
    check('Each weapon spends one round and observes cooldown',page.evaluate('''()=>{
      const out=[];for(let i=0;i<weapons.length;i++){cleanRange8();state.weapon=i;weapons[i].ammo=weapons[i].mag;const before=weapons[i].ammo;shoot();shoot();out.push({id:weapons[i].id,spent:before-weapons[i].ammo});}
      return {ok:out.every(x=>x.spent===1),weapons:out};
    }'''))
    check('Scope / crouch / pitched muzzle matches rendered model root',page.evaluate('''()=>{
      cleanRange8();state.weapon=3;mouse.right=true;const cases=[];
      for(const crouch of [false,true])for(const pitch of [-.6,0,.6]){
        experience.crouching=crouch;cam.pitch=pitch;const pose=weaponPose8(),b=new Builder(),old=weaponModel;let measured;
        weaponModel=function(builder,i,x,y,z){measured=add(builder.origin,bx(builder.parent,add(V(x,y,z),V(...WORKSHOP7.assets['ar7-rifle'].joints.muzzle.pivot))));};
        drawHumanoid6(b,player.pos,player.yaw,0,3);weaponModel=old;cases.push(length(sub(pose.muzzle,measured)));
      }return {ok:cases.every(d=>d<.000001),errors:cases};
    }'''))
    check('Near wall stops protruding barrel and does not damage target behind it',page.evaluate('''()=>{
      cleanRange8();state.weapon=3;weapons[3].ammo=30;const enemy=spawnCombatUnit('rifle',V(110,.24,324)),hp=enemy.hp;
      rangeWall8({minx:109,maxx:111,minz:329.3,maxz:329.7,miny:0,h:4,surface:'metal'});
      const pose=weaponPose8(player.pos,0,0,3,{forceAim:true}),trace=traceWeapon8(pose,cam.dir,200);shoot();
      return {ok:trace.blocked&&enemy.hp===hp,blocked:trace.blocked,health:enemy.hp};
    }'''))
    check('Shotgun range attenuation and aggregate pellet hits',page.evaluate('''()=>{
      cleanRange8();state.weapon=2;weapons[2].ammo=6;const e=spawnCombatUnit('heavy',V(110,.24,325));const hp=e.hp;shoot();
      const near=weaponDamage8(weapons[2],5),far=weaponDamage8(weapons[2],45);
      return {ok:e.hp<hp&&far<near*.3&&near===20,damage:hp-e.hp,near,far};
    }'''))
    check('Shotgun inserts actual shells and firing can interrupt without free ammo',page.evaluate('''()=>{
      cleanRange8();state.weapon=2;const w=weapons[2];w.ammo=0;w.reserve=4;reload();for(let i=0;i<16;i++)updateReload8(.04);
      const loaded=w.ammo,reserve=w.reserve;shoot();return {ok:loaded===1&&reserve===3&&w.ammo===0&&w.reserve===3&&state.reload===0,loaded,reserve};
    }'''))
    check('Magazine reload cancellation and completion conserve ammunition',page.evaluate('''()=>{
      cleanRange8();state.weapon=3;const w=weapons[3];w.ammo=7;w.reserve=50;reload();updateReload8(.7);switchWeapon(0);const cancelled=w.ammo===7&&w.reserve===50;
      switchWeapon(3);state.nextShot=0;reload();for(let i=0;i<60;i++)updateReload8(.04);
      return {ok:cancelled&&w.ammo===30&&w.reserve===27,ammo:w.ammo,reserve:w.reserve};
    }'''))
    check('Magazine, bolt and pump visibly move while meshes remain finite',page.evaluate('''()=>{
      cleanRange8();setGraphicsQuality('high');const samples=[];
      for(const [i,age,reloading]of [[3,.04,false],[4,.4,false],[2,.28,false],[3,0,true]]){
        state.weapon=i;state.t=10;ARMORY8.shot=null;state.reload=0;const a=new Builder(),b=new Builder();weaponModel(a,i,0,0,0);
        if(reloading){state.reloadTotal=1.8;state.reload=1.0;}else{ARMORY8.shot={index:i,time:10-age};}
        weaponModel(b,i,0,0,0);let changed=0,finite=a.n===b.n;
        for(let j=0;j<b.n;j+=10)for(let k=0;k<3;k++){finite=finite&&Number.isFinite(b.data[j+k]);if(Math.abs(a.data[j+k]-b.data[j+k])>.003)changed++;}
        samples.push({i,reloading,finite,changed});
      }return {ok:samples.every(x=>x.finite&&x.changed>0),samples};
    }'''))
    check('Metal, wood, concrete, water and armor produce different hit responses',page.evaluate('''()=>{
      cleanRange8();const kinds=[];
      for(const surface of ['metal','wood','concrete']){ARMORY8.motes.length=0;impact8({type:'wall',object:{surface,minx:109,maxx:111,minz:320,maxz:322,h:3}},V(110,1,322),V(0,0,-1));kinds.push(ARMORY8.motes[0].kind);}
      ARMORY8.motes.length=0;impact8({type:'ground'},V(220,0,340),V(0,-1,0));kinds.push(ARMORY8.motes[0].kind);
      ARMORY8.motes.length=0;impact8({type:'soldier',object:{role:'heavy'}},V(110,1,320),V(0,0,-1));kinds.push(ARMORY8.motes[0].kind);
      return {ok:JSON.stringify(kinds)===JSON.stringify(['spark','chip','dust','drop','spark']),kinds};
    }'''))
    check('Death feedback leaves collision disabled and rewards only once',page.evaluate('''()=>{
      cleanRange8();const e=spawnCombatUnit('rifle',V(110,.24,325)),cash=state.cash;damageUnit(e,1000);const payout=state.cash-cash;damageUnit(e,1000);
      return {ok:!e.alive&&ARMORY8.bodies.length===1&&payout>0&&state.cash-cash===payout,payout};
    }'''))
    check('Unfired guards and collapsing bodies render finite vertices',page.evaluate('''()=>{
      cleanRange8();const e=spawnCombatUnit('rifle',V(110,.24,325)),b=new Builder();drawCombatUnit(b,e,state.t);damageUnit(e,1000);updateArmory8(.3);drawArmory8(b,new Builder());
      return Array.from(b.data.subarray(0,b.n)).every(Number.isFinite);
    }'''))
    check('Blast damage respects cover while smoke outlives the flash',page.evaluate('''()=>{
      cleanRange8();const e=spawnCombatUnit('heavy',V(110,.24,320)),hp=e.hp;
      rangeWall8({minx:108,maxx:112,minz:322,maxz:323,miny:0,h:6});blastAt(V(110,.4,325),8,140);const covered=e.hp===hp;
      colliders.length=0;collisionIndex.cells.clear();blastAt(V(110,.4,325),8,140);updateArmory8(.7);
      return {ok:covered&&e.hp<hp&&ARMORY8.bursts.length===2&&ARMORY8.bursts.every(p=>p.age>.55),covered,damage:hp-e.hp};
    }'''))
    check('Incendiaries extinguish in water and fire cannot damage through cover',page.evaluate('''()=>{
      cleanRange8();igniteAt(V(220,0,340));const extinguished=combat.fires.length===0;
      const e=spawnCombatUnit('rifle',V(110,.24,322));rangeWall8({minx:108,maxx:112,minz:323,maxz:323.5,miny:0,h:5});igniteAt(V(110,.24,324));const hp=e.hp;
      updateCombatProjectiles(.04);const blocked=e.hp===hp;colliders.length=0;collisionIndex.cells.clear();updateCombatProjectiles(.3);
      return {ok:extinguished&&blocked&&e.hp<hp,extinguished,blocked};
    }'''))
    check('Grenade wall bounce reflects its normal without reversing tangential travel',page.evaluate('''()=>{
      cleanRange8();rangeWall8({minx:110.8,maxx:111.3,minz:325,maxz:335,miny:0,h:6});const g=spawnProjectile('grenade',V(110.7,2,330),V(8,0,-3));updateCombatProjectiles(.04);
      return {ok:g.vel.x<0&&g.vel.z<0,velocity:g.vel};
    }'''))
    check('Sniper scope zoom eases toward 4x and 8x',page.evaluate('''()=>{
      cleanRange8();state.weapon=4;mouse.right=true;cam.armoryFov8=66*PI/180;combat.scopeZoom=4;updateCamera(.016);const first=cam.armoryFov8;
      for(let i=0;i<30;i++)updateCamera(.016);const four=cam.armoryFov8;combat.scopeZoom=8;for(let i=0;i<30;i++)updateCamera(.016);
      return {ok:first>four&&four>cam.armoryFov8&&cam.armoryFov8>.1,first,four,eight:cam.armoryFov8};
    }'''))
    check('Low quality bounds all cosmetic pools without removing projectiles',page.evaluate('''()=>{
      cleanRange8();setGraphicsQuality('low');spawnProjectile('grenade',V(110,2,320),V());
      for(let i=0;i<100;i++){impact8({type:'ground'},V(110,.24,321),V(0,-1,0));ARMORY8.casings.push({pos:V(110,2,321),vel:V(),age:0,life:2,angle:0,bounces:0});}
      updateArmory8(.016);const c=budget8();return {ok:ARMORY8.motes.length<=c.motes&&ARMORY8.marks.length<=c.marks&&ARMORY8.casings.length<=c.casings&&combat.projectiles.length===1,cap:c};
    }'''))
    check('Pause freezes cosmetic physics; reset clears transient effects',page.evaluate('''()=>{
      state.paused=true;const before=JSON.stringify(ARMORY8.casings);update(.04);const frozen=before===JSON.stringify(ARMORY8.casings);clearCombatEncounter();
      return {ok:frozen&&ARMORY8.casings.length===0&&ARMORY8.motes.length===0&&ARMORY8.bodies.length===0};
    }'''))
    # Show the actual runtime models, not the Blender studio render.
    page.evaluate("loadRegionSync('coast');startHarbor6('road');clearCombatEncounter();setGraphicsQuality('high');player.pos=V(110,.24,319);player.prevPos={...player.pos};player.yaw=0;player.phase=0;experience.movement=0;mouse.right=true;cam.pitch=.02;")
    for index,name in [(3,'rifle'),(2,'shotgun'),(4,'sniper'),(0,'pistol'),(1,'smg'),(7,'launcher')]:
        page.evaluate('''i=>{state.weapon=i;state.paused=false;state.nextShot=0;state.reload=0;weapons[i].ammo=weapons[i].mag;state.t=10;state.damage=0;combat.hitUntil=0;shoot();state.t+=.018;
          cam.eye=V(112.4,2.2,319.8);cam.prevEye={...cam.eye};cam.dir=norm(sub(V(110,1.5,318.8),cam.eye));cam.prevDir={...cam.dir};cam.fov6=44*PI/180;cam.armoryFov8=null;mouse.right=false;state.paused=true;render(1);}
        ''',index)
        page.screenshot(path=str(PREVIEW/('armory-'+name+'.png')))
    for name,age in [('blast-flash',.05),('blast-smoke',.7),('fire',.8)]:
        page.evaluate('''({name,age})=>{clearCombatEncounter();state.paused=false;state.car=null;state.weapon=3;state.t=20;
          state.damage=0;combat.hitUntil=0;tracers.length=0;updateHUD();const pos=V(118,.24,313);if(name==='fire'){igniteAt(pos);combat.fires[0].life=7-age;}else combatBurst(pos,8);updateArmory8(age);state.t+=age;
          cam.eye=V(125,4.8,321);cam.prevEye={...cam.eye};cam.dir=norm(sub(V(117,1,312),cam.eye));cam.prevDir={...cam.dir};cam.armoryFov8=null;cam.fov6=55*PI/180;state.paused=true;render(1);}
        ''',{'name':name,'age':age})
        page.screenshot(path=str(PREVIEW/('armory-'+name+'.png')))
    check('Feathered effects reach the WebGL vertex stream',page.evaluate('fx.soft?.n>0&&Array.from(fx.soft.data.subarray(0,fx.soft.n)).every(Number.isFinite)'))
    check('WebGL armory draws without GL errors',page.evaluate('renderer.gl.getError()===0'))
    ctx.close()
    # A separate low-quality phone-sized browser uses the actual compatibility path.
    ctx=browser.new_context(viewport={'width':844,'height':390},offline=True,is_mobile=True,has_touch=True)
    page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script("window.requestAnimationFrame=()=>0;const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl|experimental-webgl/.test(type)?null:get.call(this,type,...args);};")
    page.goto((ROOT/'index.html').as_uri());page.wait_for_function('!!window.__experience',polling=20)
    check('Phone-sized CPU renderer draws authored weapons and effects',page.evaluate('''()=>{
      startHarbor6('road');setGraphicsQuality('low');state.weapon=3;state.nextShot=0;mouse.right=true;shoot();state.t+=.03;updateCamera(.016);render(1);
      return renderer.software&&renderer.faceCount>0&&ARMORY8.shot?.index===3;
    }'''))
    page.screenshot(path=str(PREVIEW/'armory-mobile-software.png'));ctx.close();browser.close()

check('No browser errors',not errors)
result={'sha256':hashlib.sha256((ROOT/'index.html').read_bytes()).hexdigest(),'passed':sum(c['pass'] for c in checks),'total':len(checks),'checks':checks,'errors':errors,'scope':'Offline desktop WebGL and phone-sized CPU fallback; automated scenes, not a physical phone thermal benchmark.'}
(OUT/'armory-browser.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
raise SystemExit(0 if result['passed']==result['total'] else 1)
