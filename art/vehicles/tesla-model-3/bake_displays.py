from pathlib import Path
import base64
from playwright.sync_api import sync_playwright

HERE=Path(__file__).resolve().parent
(HERE/'textures').mkdir(exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless=True)
    page=browser.new_page()
    page.set_content('<canvas id="front" width="1536" height="960"></canvas><canvas id="rear" width="1024" height="600"></canvas>')
    page.add_script_tag(path=str(HERE/'telemetry.js'))
    for name in ['front','rear']:
        data=page.evaluate('''name=>{const c=document.getElementById(name);Model3Telemetry[name==='front'?'drawFront':'drawRear'](c.getContext('2d'),Model3Telemetry.defaults);return c.toDataURL('image/png').split(',')[1]}''',name)
        (HERE/'textures'/f'display-{name}.png').write_bytes(base64.b64decode(data))
    browser.close()
print('Baked both original Harbor display textures')
