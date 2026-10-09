"""Compare completed real-browser runs without inventing missing engine results."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
reports = {}
for engine in ('babylon', 'playcanvas'):
    report = json.loads((ROOT / 'verification' / f'{engine}-benchmark.json').read_text())
    assert report['schemaVersion'] == 2, f'{engine}: legacy timing definition'
    assert report['comparable'] and report['visibility'] == 'visible', f'{engine}: interrupted run'
    assert report['game']['phase'] == 'finished' and report['game']['elapsed'] >= 90
    assert report['samples'] > 1000 and 0 < report['averageFps'] < 1000
    reports[engine] = report

babylon, playcanvas = reports.values()
for key in ('loadDefinition', 'seed', 'fixture', 'quality', 'camera', 'userAgent'):
    assert babylon[key] == playcanvas[key], f'Different condition: {key}'
for key in ('width', 'height', 'webgl'):
    assert babylon['render'][key] == playcanvas['render'][key], f'Different render condition: {key}'
assert babylon['game'] == playcanvas['game'], 'Shared simulation produced different final states'

comparison = {
    'conditionsMatch': True,
    'gameplayFinalStatesEqual': True,
    'reports': reports,
    'unity': {'compiled': False, 'runtimeVerified': False, 'performance': None},
    'limits': [
        'One foreground run per engine; workstation background load not controlled.',
        'Local HTTP with cache retained; not an internet cold-load benchmark.',
        'Rendering pipelines and antialiasing differ; results are for these implementations.',
        'The display refresh rate can cap frame rates; no engine-wide ranking is implied.'
    ]
}
(ROOT / 'verification' / 'comparison.json').write_text(json.dumps(comparison, ensure_ascii=False, indent=2) + '\n')
for engine, report in reports.items():
    print(f"{engine}: {report['averageFps']:.2f} FPS; p95 {report['p95FrameMs']:.2f} ms; navigation-to-ready {report['loadMs'] / 1000:.2f} s")
print('PASS: matched conditions and identical final gameplay state; Unity remains unmeasured.')
