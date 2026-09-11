"""Assemble the authored report and static, downloadable catalog. No dependencies."""
from pathlib import Path
import csv
import html
import json
import re
import shutil

root = Path(__file__).resolve().parent
dist = root / 'dist'
sources = json.loads((dist / 'sources.json').read_text())
models = json.loads((dist / 'models.json').read_text())
by_id = {s['id']: s for s in sources}
escape = html.escape

def cite(match):
    s = by_id[match.group(1)]
    number = int(s['id'][1:])
    return f'<a class="cite" href="{escape(s["url"])}" target="_blank" rel="noopener" aria-label="来源 {number}：{escape(s["title"])}">[{number}]</a>'

rows = []
cockpits = {'candidate': '座舱候选 · 待验收', 'unknown': '座舱未核实', 'outside': '仅供车外观看'}
for m in models:
    rows.append(f'''<tr>
    <td><a class="model-name" href="{escape(m['url'])}" target="_blank" rel="noopener">{escape(m['name'])}</a><small>{escape(m['creator'])}</small><span class="model-tag">{cockpits[m['cockpit']]}</span></td>
    <td><p>{escape(m['price'])}</p><p class="small">{escape(m['license'])}</p></td>
    <td><p>{escape(m['formats'])}</p><p class="small">{escape(m['quantity'])}</p></td>
    <td><p>{escape(m['use'])}</p><p class="caution">{escape(m['caution'])}[[{m['source']}]]</p></td></tr>''')

bibliography = []
for s in sources:
    bibliography.append(f'''<li id="source-{s['id']}">{escape(s['publisher'])}，<a href="{escape(s['url'])}" target="_blank" rel="noopener">{escape(s['title'])}</a>。{escape(s['date'])}；访问：{s['accessed']}。<p>{escape(s['note'])}</p></li>''')

page = (root / 'report.template.html').read_text()
page = page.replace('{{MODEL_ROWS}}', '\n'.join(rows)).replace('{{SOURCES}}', '\n'.join(bibliography))
page = re.sub(r'\[\[(S\d+)\]\]', cite, page)
assert '{{' not in page and '[[' not in page
(dist / 'index.html').write_text(page)
(dist / 'catalog-data.js').write_text('window.MODEL_CATALOG = ' + json.dumps(models, ensure_ascii=False) + ';\n')
labels = [('name','名称'),('creator','作者'),('price','页面价_美元_2026-09-11'),('license','许可'),('formats','格式'),('quantity','数量与复杂度'),('use','建议用途'),('caution','待验收与限制'),('url','原始链接')]
with (dist / 'models.csv').open('w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f)
    w.writerow([label for _, label in labels])
    w.writerows([[m[key] for key, _ in labels] for m in models])
benchmark = root.parents[1] / 'racing-comparison/verification/comparison.json'
shutil.copyfile(benchmark, dist / 'benchmark.json')
print(json.dumps({'models':len(models),'sources':len(sources),'html_bytes':(dist/'index.html').stat().st_size}, ensure_ascii=False))
