from pathlib import Path
import json,gzip,urllib.request,urllib.parse,concurrent.futures,sys
HERE=Path(__file__).resolve().parent
paths=json.loads(gzip.decompress((HERE/'research/object-paths.json.gz').read_bytes()))
def run(q):
 d=json.load(urllib.request.urlopen('https://api.sketchfab.com/v3/search?type=models&downloadable=true&count=40&q='+urllib.parse.quote(q),timeout=30));out=[]
 for r in d['results']:
  if r.get('license',{}).get('label')=='CC Attribution' and r['uid'] in paths:
   m=json.load(urllib.request.urlopen('https://api.sketchfab.com/v3/models/'+r['uid'],timeout=30));out.append({'uid':r['uid'],'name':r['name'],'author':r['user']['username'],'path':paths[r['uid']],'description':m['description'],'license':m['license']})
 (HERE/'research'/(q.replace(' ','-')+'.json')).write_text(json.dumps(out,ensure_ascii=False,indent=2));return q,out
for r in concurrent.futures.ThreadPoolExecutor(max_workers=2).map(run,sys.argv[1:] or ['amg gt','sls amg']):print(json.dumps(r,ensure_ascii=False),flush=True)
