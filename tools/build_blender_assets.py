"""Locate Blender and build the editable pack, then the offline game."""
from pathlib import Path
import os
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
binary = os.environ.get('BLENDER') or shutil.which('blender')
if not binary and Path('/Applications/Blender.app/Contents/MacOS/Blender').is_file():
    binary = '/Applications/Blender.app/Contents/MacOS/Blender'
if not binary:
    sys.exit('Blender is required. Set BLENDER to its executable path.')
args = [binary, '--background']
armory = '--armory' in sys.argv
arcade = '--arcade' in sys.argv
if '--export-only' in sys.argv:
    args += [str(ROOT / 'art' / ('harbor-arcade.blend' if arcade else 'harbor-armory.blend' if armory else 'harbor-workshop.blend'))]
args += ['--python-exit-code', '1', '--python', str(ROOT / 'tools' / ('blender_arcade.py' if arcade else 'blender_armory.py' if armory else 'blender_harbor.py')), '--']
args += [arg for arg in sys.argv[1:] if arg in ('--export-only', '--render')]
subprocess.run(args, check=True, cwd=ROOT)
subprocess.run([sys.executable, str(ROOT / 'build.py')], check=True, cwd=ROOT)
