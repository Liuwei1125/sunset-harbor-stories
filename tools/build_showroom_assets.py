"""Local AR-7 lighting fixtures and reproducible, fixed-camera render references.

python3 tools/build_showroom_assets.py
Requires Blender only for the Cycles reference; Playwright for the game reference.
Does not rewrite the armory source, GLB, asset pack, or game build.
"""
from pathlib import Path
import hashlib
import json
import math
import os
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'showroom'
CAMERA = {'theta':75, 'phi':70, 'radius':2.65, 'fov':30,
          'target':[0,-.027,-.267], 'width':1296, 'height':810}


def lightmaps():
    """Analytical linear-radiance softboxes; original lighting data, no stock image."""
    def normalized(v):
        size = math.sqrt(sum(x*x for x in v))
        return tuple(x/size for x in v)
    def dot(a,b): return sum(x*y for x,y in zip(a,b))
    def cross(a,b): return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
    fixtures = {
        'studio': [((-.8,1,.6), .85,.52,(11,10.5,9.5)), ((.8,.65,-.5),.40,.95,(6,7.7,9)), ((-.1,.6,-1),.55,.25,(9,10,11))],
        'sunset': [((-.8,.25,.6),.18,.13,(22,11,4.5)), ((.5,.85,-.3),1.1,.9,(1.5,2.3,3.6))]
    }
    width,height=512,256
    for name,boxes in fixtures.items():
        prepared=[]
        for axis,w,h,power in boxes:
            axis=normalized(axis);right=normalized(cross((0,1,0),axis));up=cross(axis,right)
            prepared.append((axis,right,up,w,h,power))
        output=bytearray(f'#?RADIANCE\n# Original Harbor Stories analytical lighting\nFORMAT=32-bit_rle_rgbe\n\n-Y {height} +X {width}\n'.encode())
        for row in range(height):
            phi=(row+.5)/height*math.pi;sy=math.cos(phi);radius=math.sin(phi)
            channels=[bytearray() for _ in range(4)]
            for column in range(width):
                theta=((column+.5)/width-.5)*2*math.pi
                ray=(radius*math.cos(theta),sy,radius*math.sin(theta))
                hemisphere=max(0,sy)
                rgb=[.10+.22*hemisphere,.12+.25*hemisphere,.14+.29*hemisphere] if name=='studio' else [.10+.18*hemisphere,.09+.29*hemisphere,.08+.51*hemisphere]
                for axis,right,up,w,h,power in prepared:
                    front=dot(ray,axis)
                    if front<=.05: continue
                    u=dot(ray,right)/front/w;v=dot(ray,up)/front/h
                    if abs(u)>1.5 or abs(v)>1.5: continue
                    strength=math.exp(-(u**8+v**8)*1.8)
                    rgb=[a+b*strength for a,b in zip(rgb,power)]
                mantissa,exponent=math.frexp(max(rgb));scale=mantissa*256/max(rgb)
                for i in range(3): channels[i].append(min(255,int(rgb[i]*scale)))
                channels[3].append(exponent+128)
            output.extend((2,2,width>>8,width&255))
            for channel in channels:
                for start in range(0,width,128):
                    chunk=channel[start:start+128];output.append(len(chunk));output.extend(chunk)
        (OUT/f'{name}.hdr').write_bytes(output)
        print(f'Generated {name}.hdr: {len(output):,} bytes',flush=True)


def cycles_reference():
    import bpy
    from mathutils import Vector
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/'assets/armory/ar7-rifle.glb'))
    scene=bpy.context.scene
    scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=True
    scene.render.resolution_x=CAMERA['width'];scene.render.resolution_y=CAMERA['height'];scene.render.resolution_percentage=100
    scene.render.film_transparent=True
    scene.world=bpy.data.worlds.new('Showroom studio');scene.world.use_nodes=True
    nodes=scene.world.node_tree.nodes;env=nodes.new('ShaderNodeTexEnvironment');env.image=bpy.data.images.load(str(OUT/'studio.hdr'))
    scene.world.node_tree.links.new(env.outputs['Color'],nodes.get('Background').inputs['Color'])
    nodes.get('Background').inputs['Strength'].default_value=1
    # glTF Y-up maps to Blender Z-up at import.
    target=Vector(CAMERA['target']);theta=math.radians(CAMERA['theta']);phi=math.radians(CAMERA['phi'])
    eye=target+Vector((math.sin(theta)*math.sin(phi),math.cos(phi),math.cos(theta)*math.sin(phi)))*CAMERA['radius']
    convert=lambda p:Vector((p.x,-p.z,p.y))
    bpy.ops.object.camera_add(location=convert(eye));cam=bpy.context.object
    cam.rotation_euler=(convert(target)-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.sensor_fit='VERTICAL';cam.data.sensor_height=36;cam.data.lens=36/(2*math.tan(math.radians(CAMERA['fov'])/2));cam.data.clip_start=.01
    scene.camera=cam;scene.view_settings.view_transform='AgX';scene.view_settings.look='None';scene.view_settings.exposure=0
    # Keep alpha: the reference image uses the same CSS backdrop as the live viewer.
    scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
    scene.render.filepath=str(OUT/'ar7-blender.png')
    bpy.ops.render.render(write_still=True)


def game_reference():
    from playwright.sync_api import sync_playwright
    sys.path.insert(0,str(ROOT/'tools'))
    from verify_config import CHROMIUM
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path=CHROMIUM)
        page=browser.new_page(viewport={'width':CAMERA['width'],'height':CAMERA['height']},device_scale_factor=1)
        page.add_init_script('window.requestAnimationFrame=()=>0')
        page.goto((ROOT/'index.html').as_uri());page.wait_for_function('!!window.__experience',polling=20)
        result=page.evaluate('''config=>{
          setGraphicsQuality('high');state.car=null;state.t=10;player.pos=V();
          const target=V(...config.target),th=config.theta*PI/180,ph=config.phi*PI/180;
          const eye=add(target,mul(V(Math.sin(th)*Math.sin(ph),Math.cos(ph),Math.cos(th)*Math.sin(ph)),config.radius));
          cam.eye=eye;cam.dir=norm(sub(target,eye));cam.vp=matmul(perspective(config.fov*PI/180,config.width/config.height,.01,50),lookAt(eye,target));
          canvas.width=config.width;canvas.height=config.height;canvas.style.cssText='width:100vw;height:100vh;position:fixed;inset:0;z-index:99999';
          renderer.gl.viewport(0,0,canvas.width,canvas.height);
          worldMeshes={static:renderer.upload(new Builder())};dynamic=new InstanceBuilder();drawWorkshop7(dynamic,'ar7-rifle',V(),0,{lod:'high'});
          renderer.begin(cam.vp,eye);const g=renderer.gl;
          // The clear color is in scene-linear space when rendering into HDR.
          // AgX maps this neutral backdrop close to the showroom's CSS grey.
          const bg=renderer.capabilities9?.hdr?[.64,.77,.82]:[213/255,221/255,224/255];
          g.clearColor(...bg,1);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);renderer.drawBuilder(dynamic);renderer.end?.();g.finish();
          document.body.replaceChildren(canvas);
          return {software:!!renderer.software,glError:g.getError(),triangles:telemetry.triangles};
        }''',CAMERA)
        if result['software'] or result['glError']: raise RuntimeError(result)
        page.screenshot(path=str(OUT/'ar7-game.png'))
        browser.close()
    print('Captured current game renderer',result,flush=True)


if __name__=='__main__':
    OUT.mkdir(parents=True,exist_ok=True)
    if '--cycles-reference' in sys.argv:
        cycles_reference()
    else:
        lightmaps()
        blender=os.environ.get('BLENDER') or shutil.which('blender') or '/Applications/Blender.app/Contents/MacOS/Blender'
        subprocess.run([blender,'--background','--python',str(Path(__file__).resolve()),'--','--cycles-reference'],check=True)
        game_reference()
        manifest={'camera':CAMERA,'model':'assets/armory/ar7-rifle.glb','modelSha256':hashlib.sha256((ROOT/'assets/armory/ar7-rifle.glb').read_bytes()).hexdigest(),
          'gameSha256':hashlib.sha256((ROOT/'index.html').read_bytes()).hexdigest(),'lighting':'Original analytical HDR radiance softboxes, studio and sunset',
          'blenderReference':'Exact GLB; Cycles 64 samples, studio HDR, AgX; transparent PNG on CSS background #d5dde0; no added ground plane',
          'gameReference':'Same camera and source high LOD, Harbor Radiance 6.3.1 materials, outdoor IBL and sunlight, AgX; neutral linear backdrop [.64,.77,.82]',
          'files':{f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in OUT.iterdir() if f.suffix in ['.hdr','.png']}}
        (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
