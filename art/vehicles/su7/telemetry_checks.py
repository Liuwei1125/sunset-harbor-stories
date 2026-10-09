"""Behavioral tests against the real Babylon renderer and exported GLB screens."""
import hashlib

def telemetry_checks(page,check,folder):
    page.locator('[data-view=instruments]').click()
    page.wait_for_timeout(500)
    check('Telemetry / two live display bindings',page.evaluate('__su7.telemetry.stats().bindings')==2)
    def pixels():
        return page.evaluate('''()=>__su7.scene.textures.filter(t=>t.name.endsWith(' / live')).map(t=>{
            const c=t.getContext(),d=c.getImageData(0,0,c.canvas.width,c.canvas.height).data;
            let h=2166136261;for(let i=0;i<d.length;i+=4)h=Math.imul(h^d[i],16777619);
            return {name:t.name,hash:h>>>0};
        })''')
    regions=page.evaluate('''()=>__su7.scene.meshes.filter(m=>m.name.includes('geometry:display-')).map(m=>{
        const scene=__su7.scene,engine=__su7.engine,canvas=engine.getRenderingCanvas();
        const viewport=scene.activeCamera.viewport.toGlobal(engine.getRenderWidth(),engine.getRenderHeight());
        const points=m.getBoundingInfo().boundingBox.vectorsWorld.map(v=>BABYLON.Vector3.Project(v,BABYLON.Matrix.Identity(),scene.getTransformMatrix(),viewport));
        const scale=canvas.clientWidth/engine.getRenderWidth();
        const left=Math.min(...points.map(p=>p.x))*scale,top=Math.min(...points.map(p=>p.y))*scale;
        return {x:left,y:top,width:Math.max(...points.map(p=>p.x))*scale-left,height:Math.max(...points.map(p=>p.y))*scale-top};
    })''')
    def screen_pixels():return [hashlib.sha256(page.screenshot(clip=region)).hexdigest() for region in regions]
    before=pixels();before_screens=screen_pixels()
    expected={'speedKph':188.4,'motorRpm':16579,'gear':'D','powerKw':280,'batteryPct':82,'throttle':.78,'brake':0,'lap':3,'lapTimeMs':72911,'deltaMs':-420,'abs':False,'tc':True}
    page.evaluate('(s)=>__su7.setTelemetry(s)',expected)
    page.wait_for_function('Math.abs(__su7.telemetry.getDisplayed().speedKph-188.4)<.25')
    after=pixels()
    check('Telemetry / both in-world screen textures change',len(after)==2 and all(a['hash']!=b['hash'] for a,b in zip(before,after)))
    check('Telemetry / rendered screen regions actually change',all(a!=b for a,b in zip(before_screens,screen_pixels())))
    current=page.evaluate('__su7.telemetry.getState()')
    check('Telemetry / external packet and units preserved',all(current[k]==v for k,v in expected.items()) and current['source']=='external')
    page.screenshot(path=str(folder/'renders'/'browser-v7-instruments-live.png'))
    page.evaluate("__su7.setTelemetry({gear:'R',speedKph:12,powerKw:-42,brake:.6,throttle:0,abs:true,tc:false})")
    page.wait_for_function('Math.abs(__su7.telemetry.getDisplayed().speedKph-12)<.25')
    state=page.evaluate('__su7.telemetry.getState()')
    check('Telemetry / reverse and regenerative braking',state['gear']=='R' and state['powerKw']==-42 and state['brake']==.6 and state['lapTimeMs']==72911)
    page.evaluate("__su7.setTelemetry({speedKph:NaN,motorRpm:Infinity,batteryPct:150,brake:-3,gear:'INVALID',lap:5.9,unknownField:'ignored'})")
    invalid=page.evaluate('__su7.telemetry.getState()')
    check('Telemetry / invalid and partial packets stay finite',invalid['speedKph']==12 and invalid['gear']=='R' and invalid['batteryPct']==100 and invalid['brake']==0 and invalid['lap']==5 and 'unknownField' not in invalid)
    page.evaluate("__su7.setTelemetry({speedKph:999,motorRpm:999999})")
    state=page.evaluate('__su7.telemetry.getState()')
    check('Telemetry / range limits',state['speedKph']==400 and state['motorRpm']==30000)
    page.locator('#telemetry-demo').click();page.wait_for_timeout(250)
    before=page.evaluate('__su7.telemetry.getState().lapTimeMs');page.wait_for_timeout(250)
    check('Telemetry / synthetic demo advances',page.evaluate('__su7.telemetry.getState().lapTimeMs')>before and page.evaluate('__su7.telemetry.getState().demo'))
    page.locator('#telemetry-demo').click();before=page.evaluate('__su7.telemetry.getState()');page.wait_for_timeout(250)
    check('Telemetry / pause holds all input values',page.evaluate('__su7.telemetry.getState()')==before and not before['demo'])
    page.locator('#telemetry-demo').click();page.evaluate('__su7.setTelemetry({speedKph:84,gear:"D"})')
    check('Telemetry / external packet takes over demo',not page.evaluate('__su7.telemetry.getState().demo') and page.evaluate('__su7.telemetry.getState().speedKph')==84)
    page.locator('#telemetry-speed').fill('96');page.locator('#telemetry-speed').dispatch_event('input')
    check('Telemetry / manual input drives the component',page.evaluate('__su7.telemetry.getState().speedKph')==96)
    page.locator('#telemetry-reset').click();state=page.evaluate('__su7.telemetry.getState()')
    check('Telemetry / reset restores parked state',state['speedKph']==0 and state['gear']=='P' and state['lapTimeMs']==0 and not state['demo'])
    before=page.evaluate('__su7.telemetry.stats().updates');page.wait_for_timeout(200)
    check('Telemetry / parked screens avoid redundant uploads',page.evaluate('__su7.telemetry.stats().updates')==before)
    # Independent consumers can release the renderer without leaking textures.
    result=page.evaluate('''()=>{
      const before=__su7.scene.textures.length,controller=SU7Telemetry.create(__su7.scene);
      controller.dispose();controller.dispose();controller.tick(.1);
      return {before,after:__su7.scene.textures.length,stats:controller.stats()};
    }''')
    check('Telemetry / disposal releases textures',result['before']==result['after'] and result['stats']['disposed'])
