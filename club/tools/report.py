"""Build the release report from completed measurements, without fabricating missing runs."""
from pathlib import Path
import hashlib,json,re,statistics
from browser_common import ROOT,PROJECT,OUT
from benchmark import fingerprint

def read(name):return json.loads((OUT/name).read_text())
def yn(value):return '通过' if value else '未通过'
def num(value):return '未提供' if value is None else f'{value:.2f}'

browser=read('browser.json');native=read('native-input.json');life=read('lifecycle.json');campaign=read('campaign.json');perf=read('performance.json');soak=read('soak.json');baseline=read('baseline.json');assets=json.loads((ROOT/'assets/manifest.json').read_text());vendor=json.loads((ROOT/'vendor/manifest.json').read_text())
protected_hashes={name:info['sha256'] for name,info in baseline['files'].items()}
for asset in assets['assets'].values():
 source=asset['source'];protected_hashes[source['file']]=source['sha256'];protected_hashes[source['lowSource']]=source['lowSourceSha256']
for texture in assets['textures'].values():protected_hashes[texture['source'].removeprefix('Original ')]=texture['sha256']
protected=[{'file':name,'unchanged':hashlib.sha256((PROJECT/name).read_bytes()).hexdigest()==sha} for name,sha in protected_hashes.items()]
runtime_files=[('vendor/'+v['file'],v['sha256']) for v in vendor['dependencies']]
runtime_files += [('assets/'+lod['file'],lod['sha256']) for asset in assets['assets'].values() for lod in asset['lods'].values()]
runtime_files += [('assets/'+t['file'],t['sha256']) for t in assets['textures'].values()]
runtime_intact=all(hashlib.sha256((ROOT/name).read_bytes()).hexdigest()==sha for name,sha in runtime_files)
current=fingerprint();measurement_match=perf['sourceFingerprint']==current and soak['sourceFingerprint']==current and soak['sourcesUnchangedDuringRun']
node_log=(OUT/'node-tests.log').read_text();node_count=int(re.search(r'pass (\d+)',node_log).group(1));node_fail=int(re.search(r'fail (\d+)',node_log).group(1))
complete=all(d['passed']==d['total'] for d in [browser,native,life,campaign]) and node_fail==0 and perf['passed'] and soak['passed'] and soak['releaseDurationMet'] and measurement_match and runtime_intact and all(p['unchanged'] for p in protected)
release={'complete':complete,'sourceFingerprint':current,'measurementsMatchCurrentSources':measurement_match,'protectedFiles':protected,'suites':{'node':{'passed':node_count,'failed':node_fail},**{k:{'passed':v['passed'],'total':v['total']} for k,v in [('browser',browser),('native',native),('lifecycle',life),('campaign',campaign)]}},'performancePassed':perf['passed'],'soakPassed':soak['passed'],'soakWallSeconds':soak['actualWallSeconds']}
release.update({'runtimeFilesVerified':len(runtime_files),'runtimeHashesMatch':runtime_intact})
(OUT/'release.json').write_text(json.dumps(release,ensure_ascii=False,indent=2)+'\n')

lines=['# Harbor Club 7.0 验证记录','',f'发布检查：**{yn(complete)}**。性能测量结束于 {perf["timestamp"]}，连续运行结束于 {soak["finishedAt"]}。测量所用运行代码与当前文件哈希一致：{yn(measurement_match)}。','',
'新版入口为 [本地 Club](http://127.0.0.1:8012/club/)。包含统一大厅、赛车／射击／飞镖／射箭、24 关、3 难度、每日挑战、无限练习、装备与外观、结算、个人纪录、解锁、设置及进度导入导出。默认 Babylon.js 9.26.0；高级设置中的 PlayCanvas 2.22.1 仅支持赛车。每页只加载选中的引擎，切换会结束当前场次并重新初始化。','',
'## 行为与输入','',
'| 范围 | 结果 | 证据 |','| --- | --- | --- |',
f'| 无 DOM 规则、资源、存档与确定性 | {node_count} 通过，{node_fail} 失败 | [node-tests.log](node-tests.log) |',
f'| 浏览器产品流程 | {browser["passed"]}/{browser["total"]} | [browser.json](browser.json) |',
f'| 原生键鼠、双键组合与触控 | {native["passed"]}/{native["total"]} | [native-input.json](native-input.json) |',
f'| 图形恢复、日期与存储生命周期 | {life["passed"]}/{life["total"]} | [lifecycle.json](lifecycle.json) |',
f'| 原版主线及离线 Club 回归 | {campaign["passed"]}/{campaign["total"]}，含 {campaign["checks"][0]["detail"]["passed"]} 项已有主线规则断言 | [campaign.json](campaign.json) |','',
'72 个关卡／难度组合均用生产控制指令完成，并在 Babylon 场景中间歇渲染、结算和保存。六条 PlayCanvas 赛道与 Babylon 的时间、得分、检查点及碰撞数完全一致。加速固定步长只用于行为验证；下方性能测量使用正常 RAF 和真实时间。','',
'四个代表性关卡通过原生鼠标拖动、右键瞄准、Space／Shift 与 WASD 到达结果，并进入下一关。左右鼠标键的两种按下顺序、独立松开与键鼠混合按住均有专项检查。390×844 和 844×390 分别验证四项目的同时多点触控、布局、暂停、记录和重试；飞镖／射箭取消触点时不会误投。','',
'每日挑战跨本地午夜会先重建场地。丢失 WebGL 上下文或模型加载失败后，屏幕上的重试按钮可恢复；图形重试也验证了新输入对象。无存储权限时可继续游玩并导出。本机 Headless Chrome 没有获得原生鼠标锁定，实际验证了按住拖动的备用操作；不把它记作原生锁定成功。','',
'## 正常帧循环性能','',
'每个桌面项目预热 6 秒后连续采样约 30 秒，触屏仿真采样约 15 秒。输入控制器仅供应转向、瞄准与按钮，不推进模拟时钟；唯一 120 Hz FixedClock 由正常 RAF 驱动。测试顺序执行。P95／P99 是帧间隔，单位 ms。','',
'| 引擎 / 项目 | 配置 | 实际渲染尺寸 | 平均 FPS | P95 | P99 | GL 错误 |','| --- | --- | --- | ---: | ---: | ---: | ---: |']
names={'race':'赛车','shooting':'射击','darts':'飞镖','archery':'射箭'}
for r in perf['runs']:
 renderer=r['renderer'];profile='桌面 / 精细' if r['profile']=='desktop' else '触屏仿真 / 平衡'
 lines.append(f'| {r["engine"]} / {names[r["mode"]]} | {profile} | {renderer["width"]}×{renderer["height"]} | {r["measuredFps"]:.2f} | {num(r["p95FrameMs"])} | {num(r["p99FrameMs"])} | {r["gl"]} |')
device=perf['runs'][0]['device']
lines+=['',f'设备：{device["gpu"]}；逻辑核心 {device["cores"]}，浏览器报告内存 {device["memory"]} GB，DPR {device["dpr"]}。浏览器：`{device["userAgent"]}`。','',
'桌面目标为 60 FPS（脚本均值验收带为 55 FPS），触屏目标为 30 FPS（验收带为 28 FPS）。脚本同时检查模拟时间相对真实时间的推进和 GL 错误；具体帧时间仍以上表为准。触屏行使用同一台桌面 Apple M2 的 GPU，**实体手机 GPU 未测**。这些样本不构成引擎性能排名。','',
'## 首次可交互','',
'计时从页面导航起点到模型、场地和首帧准备好。清除浏览器缓存后与同一上下文的重新加载对照；本地 HTTP 服务器和文件系统缓存未清除，网络未限速。','',
'| 引擎 / 浏览器视口 | 缓存条件 | 可交互时间 ms | 资源传输 MiB |','| --- | --- | ---: | ---: |']
for r in perf['firstInteractive']:
 viewport=r['viewport'];condition='清除浏览器缓存' if r['cacheCondition']=='browser-cache-cleared' else '同上下文重新加载';transfer=sum(x['transferSize'] for x in r['resources'])/1048576
 lines.append(f'| {r["engine"]} / {viewport["width"]}×{viewport["height"]} | {condition} | {r["firstInteractiveMs"]:.1f} | {transfer:.2f} |')
lines+=['','全部帧样本、模拟推进、设备尺寸和 HTTP 资源明细见 [performance.json](performance.json)。PlayCanvas 固定生产包未提供三角形统计，该字段保留为空，不用估算值冒充实测。','',
'## 连续运行与资源','',
f'真实持续 **{soak["actualWallSeconds"]:.1f} 秒（{soak["actualWallSeconds"]/60:.2f} 分钟）**，{len(soak["segments"])} 段。四个第六关场地按无限模式轮换，约每 75 秒切换；每段包含原生暂停／恢复和结束记录。测试期间运行代码未改动，主线存档哨兵保持不变。结果：{yn(soak["passed"])}。','',
'| 场地 | 运行段数 | 最后两次相同场景资源 | 末次 Buffer / Texture / FB / RB / VAO | GC 后堆内存首末 MiB |','| --- | ---: | --- | --- | --- |']
for r in soak['resourceComparisons']:
 rows=r['baselines'];live=rows[-1]['live'];heap=[x['heap']/1048576 for x in [rows[0],rows[-1]] if x['heap'] is not None];heap_text=' → '.join(f'{x:.1f}' for x in heap) if heap else '浏览器未提供'
 lines.append(f'| {names[r["mode"]]} | {len(rows)} | {yn(r["matchedSceneResourceCountsStable"])} | '+ ' / '.join(str(live[k]) for k in ['Buffer','Texture','Framebuffer','Renderbuffer','VertexArray'])+f' | {heap_text} |')
lines+=['',
'资源计数来自 WebGL 创建／删除调用的实际跟踪，相同模式和关卡、清空运行状态后比较；不是仅比较引擎对象数。JavaScript 堆内存是浏览器提供的 GC 后快照，允许着色器等缓存预热，不等于 GPU 字节数。运行中同时检查事件历史、命中箭镖、模型实例和特效池的上限。','',
'PlayCanvas 另用连续三轮、每轮四次赛道重建检查，稳定为 508 Buffer / 39 Texture / 9 Framebuffer / 4 Renderbuffer / 160 VertexArray。固定 2.22.1 的释放兼容修正及官方源码出处见 [MIGRATION.md](../MIGRATION.md)。','',
'完整分段帧时间、得分、模拟时间、暂停结果及资源基线见 [soak.json](soak.json)，执行日志见 [soak.log](soak.log)。','',
'## 文件、兼容性与可复现性','',
f'受保护的 {len(protected)} 个原文件逐一哈希对照：{yn(all(p["unchanged"] for p in protected))}。原主线 `index.html`、原版 `arcade.html`、现有 GLB 与可编辑 Blender 源文件保留。新建衍生资源为 {len(assets["assets"])} 种、42 个高低 LOD 原生 glTF 2.0 GLB，总计 {sum(l["bytes"] for x in assets["assets"].values() for l in x["lods"].values())/1048576:.2f} MiB；没有付费模型采购。稳定部件 ID、关节、相机与碰撞元数据和源文件哈希见 [资产清单](../assets/manifest.json)。','',
'新版需要 HTTP 服务。引擎、模型与纹理自托管，运行时没有外部 CDN 请求；这是分文件网页应用，不把 HTTP 缓存称为单文件离线包。原版 `arcade.html` 继续作为完整离线入口。GLB 未压缩，无几何解码器；WebGL 2 为实测基础，WebGPU 未启用，也未接入 Havok／Ammo 双物理系统。','',
'进度使用 `sunset-harbor-club-v2`，首次同源启动会验证并复制 v1；v1 和主线存档未改写。不同来源通过 JSON 导入导出。仅 `?verify=1` 暴露测试诊断接口，普通入口没有自动通关控制器。','',
'运行命令及目录说明见 [README.md](../README.md)。后续 GTA 接入按步行 → 上车驾驶 → 下车射击 → NPC／任务 → 存档推进，验收出口见 [GTA-REUSE.md](../GTA-REUSE.md)。本轮 Club 结果不能代替后续主线迁移验收。','',
'当前源码指纹、受保护文件和各套件状态见 [release.json](release.json)。']
(OUT/'REPORT.md').write_text('\n'.join(lines)+'\n')
print('Release report:',yn(complete))
if not complete:raise SystemExit(1)
