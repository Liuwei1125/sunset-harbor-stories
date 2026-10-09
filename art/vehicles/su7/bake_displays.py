"""Bake the same original Canvas artwork used by the live telemetry module.

These parked fallbacks make the GLBs and Blender source self-contained.
Requires Python Playwright and local Chrome; no network access is used.
"""
from pathlib import Path
import base64
from playwright.sync_api import sync_playwright

HERE=Path(__file__).resolve().parent

def main():
    folder=HERE/'textures';folder.mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless=True)
        page=browser.new_page();page.set_content('<canvas id="screen"></canvas>')
        page.add_script_tag(path=str(HERE/'telemetry.js'))
        for key,width,height,draw in [('cluster',1024,320,'drawCluster'),('center',1280,720,'drawCenter')]:
            data=page.evaluate('''({width,height,draw})=>{const c=document.querySelector('canvas');c.width=width;c.height=height;SU7Telemetry[draw](c.getContext('2d'),SU7Telemetry.defaults);return c.toDataURL('image/png').split(',')[1];}''',{'width':width,'height':height,'draw':draw})
            (folder/(key+'-parked.png')).write_bytes(base64.b64decode(data))
        browser.close()
    print('Baked two original parked display textures.')

if __name__=='__main__':main()
