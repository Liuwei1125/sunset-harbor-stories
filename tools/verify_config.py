from pathlib import Path
import os, shutil
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'verification'
PREVIEW = ROOT / 'previews'
OUT.mkdir(exist_ok=True)
PREVIEW.mkdir(exist_ok=True)
CHROMIUM = os.environ.get('CHROMIUM') or shutil.which('chromium') or shutil.which('chromium-browser')
if not CHROMIUM:
    chrome = Path('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    if chrome.is_file(): CHROMIUM = str(chrome)
