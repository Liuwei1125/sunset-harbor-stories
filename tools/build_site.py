"""Prepare the public Harbor Site from current source without overwriting offline releases."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote, quote
import hashlib, json, shutil, subprocess, sys, tempfile

ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'dist'
REPORT=ROOT/'site-verification'
ICON='data:image/svg+xml,'+quote('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="#203c36"/><text x="32" y="46" text-anchor="middle" font-family="Georgia,serif" font-size="46" fill="#f3eee0">H</text></svg>',safe='')

def copy_file(source,destination):
 destination.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,destination)

def icon(html):
 tag='<link rel="icon" type="image/svg+xml" href="'+ICON+'">'
 if '<link rel="icon" href="data:,">' in html:return html.replace('<link rel="icon" href="data:,">',tag)
 if '</head>' in html:return html.replace('</head>',tag+'</head>',1)
 return html.replace('<title>',tag+'<title>',1)

def main():
 REPORT.mkdir(exist_ok=True)
 protected={f:hashlib.sha256((ROOT/f).read_bytes()).hexdigest() for f in ['index.html','arcade.html','bundle.js','arcade-bundle.js']}
 with tempfile.TemporaryDirectory(prefix='harbor-site-') as temp:
  staging=Path(temp)/'source';staging.mkdir();public=Path(temp)/'public';public.mkdir()
  # Run the established offline builder in an isolated copy so every future
  # publication includes source edits, while the checked-out offline files stay intact.
  for pattern in ['*.js','*.css','*.html','build.py']:
   for path in ROOT.glob(pattern):copy_file(path,staging/path.name)
  for path in (ROOT/'assets').rglob('*-pack.js'):copy_file(path,staging/path.relative_to(ROOT))
  subprocess.run([sys.executable,str(staging/'build.py')],cwd=staging,check=True,capture_output=True,text=True)
  main_html=(staging/'index.html').read_text()
  old="link.href='arcade.html?v=6.4.0'"
  if main_html.count(old)!=1:raise RuntimeError('Campaign Club navigation changed; review the public navigation mapping.')
  (public/'index.html').write_text(icon(main_html.replace(old,"link.href='club/'")))
  (public/'arcade.html').write_text(icon((staging/'arcade.html').read_text()))
  for name in ['showroom.html','showroom.css','showroom.js','graphics.html','GRAPHICS_ZH.md','NOTICE.md']:
   copy_file(ROOT/name,public/name)
  for name in ['showroom.html','graphics.html']:(public/name).write_text(icon((public/name).read_text()))
  # Publish only web assets. Editable Blender originals, test reports and the
  # separately registered research Site are not part of this public output.
  for path in (ROOT/'assets').rglob('*'):
   if path.is_file() and path.suffix.lower() in ['.glb','.png','.jpg','.jpeg','.webp','.hdr','.json','.md','.txt','.js'] and not path.name.endswith('-pack.js'):copy_file(path,public/path.relative_to(ROOT))
   elif path.is_file() and path.name.startswith('LICENSE'):copy_file(path,public/path.relative_to(ROOT))
  for directory in ['club/src','club/vendor','club/assets/models','club/assets/textures','club/circuit/src','club/circuit/assets']:
   for path in (ROOT/directory).rglob('*'):
    if path.is_file() and not path.name.startswith('.') and '__pycache__' not in path.parts:copy_file(path,public/path.relative_to(ROOT))
  for name in ['club/index.html','club/style.css','club/assets/manifest.json','club/assets/external-manifest.json','club/ASSETS.md','club/circuit/index.html','club/circuit/style.css','club/circuit/CREDITS.html']:
   copy_file(ROOT/name,public/name)
  club=(public/'club/index.html').read_text();marker='<footer class="lobby-footer">'
  if club.count(marker)!=1:raise RuntimeError('Club footer changed; review the public return link.')
  (public/'club/index.html').write_text(icon(club.replace(marker,marker+'<a href="../">返回港湾主线 ↗</a>')))
  for path in (ROOT/'club/assets/source/third-party').rglob('*'):
   if path.is_file() and path.suffix in ['.md','.txt','.json']:copy_file(path,public/path.relative_to(ROOT))
  for scene in ['boat','sport','quay','warehouse','rifle','harbor']:
   for prefix in ['graphics-after','grading-before']:copy_file(ROOT/'previews'/f'{prefix}-{scene}.png',public/'previews'/f'{prefix}-{scene}.png')
  # Revalidate mutable pages/scripts/assets, so publishing the same paths can
  # update an existing visitor without a stale immutable cache policy.
  (public/'_headers').write_text('/*\n  Cache-Control: public, max-age=0, must-revalidate\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n')
  validate(public)
  if OUTPUT.exists():shutil.rmtree(OUTPUT)
  shutil.copytree(public,OUTPUT)
 assert all(hashlib.sha256((ROOT/f).read_bytes()).hexdigest()==value for f,value in protected.items()),'Offline output changed'
 files=[p for p in OUTPUT.rglob('*') if p.is_file()]
 report={'files':len(files),'bytes':sum(p.stat().st_size for p in files),'largestFileBytes':max(p.stat().st_size for p in files),'offlineOutputsUnchanged':True,'routes':['/','/club/','/club/circuit/','/arcade.html','/showroom.html','/graphics.html'],'sha256':{str(p.relative_to(OUTPUT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(files)}}
 (REPORT/'build.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print(f'Public output: {report["files"]} files, {report["bytes"]/1024/1024:.2f} MiB; offline releases preserved.')

def validate(public):
 class References(HTMLParser):
  def __init__(self):super().__init__();self.refs=[];self.inline=[];self.script=None
  def handle_starttag(self,tag,attrs):
   a=dict(attrs)
   for key in ['href','src','environment-image']:
    if a.get(key):self.refs.append(a[key])
   if tag=='script' and 'src' not in a:self.script=''
  def handle_data(self,data):
   if self.script is not None:self.script+=data
  def handle_endtag(self,tag):
   if tag=='script' and self.script is not None:self.inline.append(self.script);self.script=None
 for file in public.rglob('*.html'):
  parser=References();parser.feed(file.read_text())
  for ref in parser.refs:
   url=urlsplit(ref)
   if url.scheme or url.netloc or not url.path:continue
   target=(public/url.path.lstrip('/')) if url.path.startswith('/') else file.parent/unquote(url.path)
   if target.is_dir():target=target/'index.html'
   if not target.is_file():raise RuntimeError(f'Missing {ref} referenced by {file.relative_to(public)}')
  for script in parser.inline:
   subprocess.run(['node','--check','--input-type=commonjs'],input=script,text=True,check=True,capture_output=True)
 for file in (public/'club/src').rglob('*.js'):
  subprocess.run(['node','--check','--input-type=module'],input=file.read_text(),text=True,check=True,capture_output=True)
 for file in (public/'club/circuit/src').rglob('*.js'):
  subprocess.run(['node','--check','--input-type=module'],input=file.read_text(),text=True,check=True,capture_output=True)
 for file in (public/'club/circuit/assets').glob('*/manifest.json'):
  for lod in json.loads(file.read_text())['runtimeFiles']:
   if hashlib.sha256((file.parent/lod['file']).read_bytes()).hexdigest()!=lod['sha256']:raise RuntimeError('Circuit model hash mismatch: '+lod['file'])
 manifest=json.loads((public/'club/assets/manifest.json').read_text())
 for asset in manifest['assets'].values():
  for lod in asset['lods'].values():
   path=public/'club/assets'/lod['file']
   if hashlib.sha256(path.read_bytes()).hexdigest()!=lod['sha256']:raise RuntimeError('Model hash mismatch: '+str(path))
 for path in public.rglob('*'):
  if path.is_file() and (path.stat().st_size>25*1024*1024 or path.suffix.startswith('.blend')):raise RuntimeError('Non-web or oversized asset: '+str(path))

if __name__=='__main__':main()
