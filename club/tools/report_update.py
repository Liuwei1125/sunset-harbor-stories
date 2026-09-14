"""Assemble the scoped 7.1 release evidence; keep 7.0 soak results historical."""
from browser_common import ROOT, PROJECT, OUT
from benchmark import fingerprint
import hashlib, json, re

def read(name):return json.loads((OUT/name).read_text())
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def yn(value):return '通过' if value else '未通过'

suites={k:read(f) for k,f in [('browser','browser.json'),('native','native-input.json'),('lifecycle','lifecycle.json'),('update','update.json')]}
perf=read('performance-update.json');current=fingerprint();assets=json.loads((ROOT/'assets/manifest.json').read_text());vendor=json.loads((ROOT/'vendor/manifest.json').read_text());baseline=read('baseline.json')
protected={name:info['sha256'] for name,info in baseline['files'].items()}
for asset in assets['assets'].values():
 s=asset['source'];protected[s['file']]=s['sha256']
 if 'lowSource' in s:protected[s['lowSource']]=s['lowSourceSha256']
for t in assets['textures'].values():protected[t['source'].removeprefix('Original ')]=t['sha256']
protected_rows=[{'file':name,'unchanged':sha(PROJECT/name)==value} for name,value in protected.items()]
runtime=[('vendor/'+v['file'],v['sha256']) for v in vendor['dependencies']]+[('assets/'+lod['file'],lod['sha256']) for a in assets['assets'].values() for lod in a['lods'].values()]+[('assets/'+t['file'],t['sha256']) for t in assets['textures'].values()]
intact=all(sha(ROOT/name)==value for name,value in runtime)
log=(OUT/'node-test.log').read_text();node={'passed':int(re.search(r'\bpass (\d+)',log).group(1)),'failed':int(re.search(r'\bfail (\d+)',log).group(1))}
match=perf['sourceFingerprint']==current and suites['update']['sourceFingerprint']==current and perf['sourcesUnchangedDuringRun']
complete=all(s['passed']==s['total'] for s in suites.values()) and node['failed']==0 and intact and all(r['unchanged'] for r in protected_rows) and perf['passed'] and match
release={'version':'7.1.0','scope':'External car and AKM assets, three race cameras, live instruments and touch camera controls','complete':complete,'sourceFingerprint':current,'measurementsMatchCurrentSources':match,'suites':{'node':node,**{k:{'passed':s['passed'],'total':s['total']} for k,s in suites.items()}},'protectedFiles':protected_rows,'runtimeFilesVerified':len(runtime),'runtimeHashesMatch':intact,'performancePassed':perf['passed'],'performanceEvidence':'performance-update.json','soakRerunFor71':False,'historicalBaseline':'7.0-baseline/REPORT.md'}
(OUT/'release.json').write_text(json.dumps(release,ensure_ascii=False,indent=2)+'\n')

lines=['# Harbor Club 7.1 验证记录','',f'本轮素材、视角与触控更新检查：**{yn(complete)}**。性能测量完成于 {perf["timestamp"]}；专项验证、性能测量与当前运行代码哈希一致：{yn(match)}。','',
'## 实际交付','',
'赛车采用含完整座舱的 Car Concept 模型，默认追尾，按 C、点右上角按钮或在设置中切换引擎盖／驾驶舱。选择会保存。玩家、对手和回放车辆使用同一套外观。两套原生引擎中的方向盘、车轮、透明玻璃和车速／氮气仪表均保留。','',
'默认步枪替换为带 PBR 材质的 AKM，保留原有玩法参数，带原生弹匣、枪机、瞄准及枪口效果。原有手枪和狙击枪仍可选。来源、CC BY／CC0 授权、修改说明及重建命令见 [ASSETS.md](../ASSETS.md)，游戏大厅也有「素材鸣谢」。','',
'## 行为与输入','',
'| 检查 | 结果 | 证据 |','| --- | --- | --- |',
f'| 规则、模型、存档、全部赛道相机及确定性 | {node["passed"]} 通过，{node["failed"]} 失败 | [node-test.log](node-test.log) |']
for label,key,file in [('产品流程与 72 次 Babylon 通关、6 次 PlayCanvas 对照','browser','browser.json'),('原生键鼠通关与横竖屏多点触控','native','native-input.json'),('WebGL 恢复、跨日、存储与资源释放','lifecycle','lifecycle.json'),('三视角、仪表、LOD、触控切换与 AKM','update','update.json')]:
 s=suites[key];lines.append(f'| {label} | {s["passed"]}/{s["total"]} | [{file}]({file}) |')
lines += ['', '键盘和按钮切换视角前后，运行状态、按住的控制、时间及轨迹保持一致。390×844 与 844×390 通过 CDP 同时触点验证：第一根手指持续踩油门，第二根手指切换视角；单指轻点只切换一次。手机 HUD 按钮在可见范围内且互不重叠。','',
'两套引擎都验证了高／低 LOD 的实时仪表与 HUD 一致，以及加速和使用氮气后的更新。反复重建赛道并生成两档仪表，预热后 WebGL 资源计数稳定。AKM 瞄具检查使用相机局部坐标，开火和换弹检查读取实际原生关节。','',
'## 正常 RAF 性能','',
perf['conditions'],'',
'| 引擎 / 项目 / 视角 | 视口与画质 | 实际渲染尺寸 | 平均 FPS | P95 / P99 帧耗时 | 实测秒数 |','| --- | --- | --- | ---: | ---: | ---: |']
names={'chase':'追尾','hood':'引擎盖','cockpit':'驾驶舱'}
for r in perf['runs']:
 d=r['device'];v=d['viewport'];render=r['renderer'];kind=names[r['camera']] if r['camera'] else 'AKM 射击';lines.append(f'| {r["engine"]} / {kind} | {v[0]}×{v[1]} / {r["quality"]} | {render["width"]}×{render["height"]} | {r["measuredFps"]:.2f} | {r["p95FrameMs"]:.2f} / {r["p99FrameMs"]:.2f} ms | {r["wallElapsedMs"]/1000:.2f} |')
lines += ['',f'详细设备：{perf["runs"][0]["device"]["gpu"]}。所有案例使用生产 FixedClock，正常运行 6 秒预热，再测量 12 秒；每次物理更新前控制器只提供输入。FPS 来自正常 RAF 的平均帧间隔，不使用加速验证的帧数或引擎启动时的瞬时读数。桌面平均目标带为 ≥55 FPS，触屏仿真 ≥28 FPS；P95/P99 单独列出卡顿。所有案例持续处于比赛中且 GL 错误为 0。原始数据见 [performance-update.json](performance-update.json)。','',
'**范围限制：** 本轮没有在实体手机上测 GPU，也没有重新运行 20 分钟连续测试；触屏是本机 Chrome 仿真，性能采样是九个场景各约 12 秒。本轮没有测量冷网络加载。7.0 的性能、连续运行及主线浏览器回归保存在 [历史基线](7.0-baseline/REPORT.md)，不作为 7.1 的长时间运行证明。','',
'## 资源与原版保护','',
'| 新资源 | 高 LOD 三角形 / 大小 | 低 LOD 三角形 / 大小 |','| --- | --- | --- |']
for key in ['touring-gt','field-akm']:
 a=assets['assets'][key];h=a['lods']['high'];l=a['lods']['low'];lines.append(f'| {a["label"]} | {h["triangles"]:,} / {h["bytes"]/1024/1024:.2f} MiB | {l["triangles"]:,} / {l["bytes"]/1024/1024:.2f} MiB |')
lines += ['', f'共 {len(assets["assets"])} 种资源、{sum(len(a["lods"]) for a in assets["assets"].values())} 个标准 GLB。运行模型、纹理与固定版本引擎的 {len(runtime)} 个文件哈希检查：{yn(intact)}。主线文件、原版离线入口及模型源文件保护检查：{yn(all(r["unchanged"] for r in protected_rows))}。详细清单见 [release.json](release.json)。运行时通过本地 HTTP 读取素材，不依赖外部 CDN 或几何解码器。','',
'## 实际浏览器截图','',
'- [Babylon 追尾](../previews/7.1/babylon-chase.png)、[引擎盖](../previews/7.1/babylon-hood.png)、[驾驶舱](../previews/7.1/babylon-cockpit.png)','- [PlayCanvas 追尾](../previews/7.1/playcanvas-chase.png)、[驾驶舱](../previews/7.1/playcanvas-cockpit.png)','- [竖屏追尾](../previews/7.1/touch-390-chase.png)、[横屏驾驶舱](../previews/7.1/touch-844-cockpit.png)','- [AKM 持枪](../previews/7.1/akm-hip.png)、[瞄准](../previews/7.1/akm-aim.png)、[换弹](../previews/7.1/akm-reload.png)','']
(OUT/'REPORT.md').write_text('\n'.join(lines));print('7.1 release checks:',complete)
if not complete:raise SystemExit(1)
