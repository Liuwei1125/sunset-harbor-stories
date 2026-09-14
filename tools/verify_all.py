"""Optional verification. No remote pages or user accounts are accessed."""
from pathlib import Path
import subprocess,sys,json
from verify_config import ROOT,OUT
suite=[('run_regression.py','regressions.json'),('mobile_checks.py','mobile.json'),('input_run.py','input-road.json'),('input_sea.py','input-sea.json'),('input_air.py','input-air.json'),('verify_armory.py','armory-browser.json'),('verify_graphics.py','graphics-browser.json'),('verify_color.py','color-browser.json'),('verify_effects.py','effects-browser.json')]
suite.extend([('verify_arcade.py','arcade-browser.json'),('verify_arcade_input.py','arcade-native-input.json')])
if '--soak' in sys.argv:suite.append(('live_soak.py','live-120s.json'))
passed=True
for script,report in suite:
    print('RUN',script,flush=True)
    with (OUT/(script+'.log')).open('w') as log:
        p=subprocess.run([sys.executable,str(ROOT/'tools'/script)],stdout=log,stderr=subprocess.STDOUT)
    try:
        d=json.loads((OUT/report).read_text())
        ok=p.returncode==0 and bool(d['passed']) and (not d.get('total') or d['passed']==d['total']) and not d.get('browserErrors') and not d.get('errors')
    except (OSError,KeyError,ValueError):ok=False
    print(('PASS' if ok else 'FAIL'),script,flush=True);passed=passed and ok
sys.exit(0 if passed else 1)
