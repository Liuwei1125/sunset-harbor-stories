from pathlib import Path
from contextlib import contextmanager
from urllib.request import urlopen
import os, shutil, subprocess, sys, time

ROOT=Path(__file__).resolve().parents[1]
PROJECT=ROOT.parent
OUT=ROOT/'verification'
PREVIEW=ROOT/'previews'
BASE=os.environ.get('CLUB_URL','http://127.0.0.1:8012/club/')
CHROME=os.environ.get('CHROMIUM') or shutil.which('chromium') or '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
OUT.mkdir(exist_ok=True);PREVIEW.mkdir(exist_ok=True)

GPU_TRACKER='''(()=>{
 const live={Buffer:new Set(),Texture:new Set(),Framebuffer:new Set(),Renderbuffer:new Set(),VertexArray:new Set()};
 const proto=WebGL2RenderingContext.prototype;
 for(const kind of Object.keys(live))for(const prefix of ['create','delete']){const name=prefix+kind,original=proto[name];if(!original)continue;proto[name]=function(...args){const value=original.apply(this,args);if(prefix==='create'&&value)live[kind].add(value);if(prefix==='delete')live[kind].delete(args[0]);return value;};}
 window.__gpuLive=()=>Object.fromEntries(Object.entries(live).map(([k,v])=>[k,v.size]));
})()'''

@contextmanager
def server():
 process=None
 try:
  try:urlopen(BASE,timeout=2).close()
  except Exception:
   process=subprocess.Popen([sys.executable,'-m','http.server','8012','--bind','127.0.0.1','--directory',str(PROJECT)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
   for _ in range(30):
    try:urlopen(BASE,timeout=1).close();break
    except Exception:time.sleep(.1)
  yield
 finally:
  if process:process.terminate();process.wait(timeout=5)

def wait_ready(page):
 page.wait_for_function('window.__club && !__club.app.loading && __club.app.diagnostics.firstInteractive>0',timeout=90000)
 if page.locator('#loading').is_visible():raise RuntimeError(page.locator('#error-text').inner_text())

def boot(browser,mobile=False,engine='babylon',track_gpu=False,viewport=None,legacy=None):
 context=browser.new_context(viewport=viewport or ({'width':390,'height':844} if mobile else {'width':1440,'height':900}),device_scale_factor=1,is_mobile=mobile,has_touch=mobile,accept_downloads=True)
 page=context.new_page()
 if track_gpu:page.add_init_script(GPU_TRACKER)
 if engine=='playcanvas':page.add_init_script("if(location.protocol==='http:'&&!localStorage.getItem('sunset-harbor-club-v2'))localStorage.setItem('sunset-harbor-club-v2',JSON.stringify({version:2,xp:0,settings:{engine:'playcanvas',volume:0},records:{}}))")
 if legacy is not None:
  import json
  page.add_init_script('if(location.protocol==="http:"&&!localStorage.getItem("sunset-harbor-club-v1"))localStorage.setItem("sunset-harbor-club-v1",'+json.dumps(json.dumps(legacy))+')')
 page.add_init_script("if(location.protocol==='http:')localStorage.setItem('sunset-run-v6-save','campaign-sentinel-do-not-touch')")
 page.goto(BASE+'?verify=1');wait_ready(page)
 page.evaluate('__club.app.audio.setVolume(0)')
 return context,page

def tick(page,seconds):page.evaluate('(seconds)=>__club.tick(seconds)',seconds)

def select(page,mode,level=0,playlist='levels'):
 page.evaluate('(selection)=>__club.select(selection)',{'mode':mode,'level':level,'playlist':playlist});wait_ready(page)

def native_start(page,mode,level=0,playlist='levels',mobile=False):
 if page.locator('#lobby').is_hidden():page.evaluate('__club.select({})');wait_ready(page)
 locator=page.locator('[data-mode="'+mode+'"]');locator.tap() if mobile else locator.click();wait_ready(page)
 locator=page.locator('[data-playlist="'+playlist+'"]');locator.tap() if mobile else locator.click();wait_ready(page)
 if playlist!='daily':
  locator=page.locator('[data-level="'+str(level)+'"]');locator.tap() if mobile else locator.click();wait_ready(page)
 locator=page.locator('#start');locator.tap() if mobile else locator.click()
 locator=page.locator('[data-action="go"]');locator.tap() if mobile else locator.click();page.wait_for_function('__club.sim.state.phase==="countdown"')
 tick(page,3.1)

def runtime_info(page):return page.evaluate('''()=>{const r=__club.renderer,canvas=document.getElementById('view'),gl=canvas.getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return {userAgent:navigator.userAgent,platform:navigator.platform,cores:navigator.hardwareConcurrency,memory:navigator.deviceMemory||null,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,renderer:r.stats(),gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null,remoteScripts:[...document.scripts].map(s=>s.src).filter(Boolean),live:window.__gpuLive?.()};}''')
