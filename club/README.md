# Harbor Club 7.1

独立的三维休闲俱乐部：赛车、射击、飞镖、射箭，共 24 关、3 种难度，以及每日挑战和无限练习。所有模型、引擎和纹理都由本地 HTTP 服务提供；运行时不依赖外部 CDN。

在项目的 `club` 目录运行：

```sh
npm run serve
```

打开 [新版俱乐部](http://127.0.0.1:8012/club/)。也可以在项目根目录执行 `python3 -m http.server 8012 --bind 127.0.0.1`，打开同一地址。无需打包或安装 npm 依赖。

新版采用 ES modules 和分开的 GLB 资源，需要 HTTP 服务；浏览器缓存不等于单文件离线包。项目原有 `arcade.html` 仍是完整的单文件离线入口。主线 `index.html`、原版休闲文件及可编辑 Blender 源模型均保持原样。

默认使用 Babylon.js 9.26.0。赛车默认追尾视角，也可点右上角按钮或在设置里切换，选择会保存。设置中可调整画面风格、画质、分辨率比例、音量、瞄准灵敏度、辅助落点及已解锁的装备外观。高级设置提供 PlayCanvas 2.22.1 赛车视图；切换会结束当前场次并重新载入，每个页面只加载一个引擎。其他三个项目使用 Babylon。当前版本以 WebGL 2 为基础，不将尚未验证的 WebGPU 或额外物理引擎作为默认依赖。

赛车使用 WASD 驾驶、空格手刹、Shift 氮气、R 回正、C 切换追尾 / 引擎盖 / 驾驶舱；射击使用鼠标瞄准、左键或空格开火、右键瞄准、R 换弹；射箭与飞镖按住左键或空格蓄力，松手出手。Escape 暂停。触屏有独立摇杆和动作键，可同时按住多个按钮，并在动作键上拖动瞄准。

新版进度保存在 `sunset-harbor-club-v2`。同源首次启动时会验证并复制 `sunset-harbor-club-v1`，原版存档不会被改写。不同浏览器或来源之间，请从设置导出、导入 JSON。主线存档不参与迁移。

## 验证

```sh
npm test
npm run verify
npm run verify:update
npm run verify:input
npm run verify:lifecycle
npm run verify:campaign
npm run benchmark
npm run benchmark:update
npm run soak
npm run report
```

浏览器脚本使用 Python Playwright 和 Chrome。开发测试依赖固定在 `tools/requirements.txt`，可用 `python3 -m pip install -r tools/requirements.txt` 安装；游戏运行不需要这些依赖。脚本自动启动本地服务（若服务尚未启动）。`CHROMIUM` 可指定 Chrome / Chromium 可执行文件，`CLUB_URL` 可指定已有服务。规则通关采用生产 120 Hz 时钟加速验证；性能和 soak 使用正常 RAF 及实际墙钟时间，控制器仅提供游戏输入。`?verify=1` 才会暴露诊断入口，普通入口不启用测试控制器。

汇总见 [验证报告](verification/REPORT.md)，详细结果位于 `verification/`，真实浏览器截图位于 `previews/`。触屏仿真验证输入与布局；不能据此宣称测过实体手机 GPU。

`verify:update` 与 `benchmark:update` 专门检查 7.1 的三视角、仪表、AKM 和触控切换；`report` 汇总本轮证据。7.0 的长时间运行数据保存在 `verification/7.0-baseline/`，本轮未重新运行 20 分钟连续测试。

## 资源与结构

`src/games` 是唯一权威规则模拟，`src/core` 提供数学、赛道、固定时钟与进度验证；`src/presentation` 将同一场景描述和插值快照转换为原生引擎对象。输入、存储、声音、诊断各有独立模块。渲染、物理帧率、画质和评分相互分离。

`assets/manifest.json` 记录 23 种资源的 46 个高低 LOD 标准 GLB、源文件哈希、稳定部件 ID、关节枢轴、单位和碰撞范围。资源包含本项目已有可编辑源资源，以及新增的 Car Concept 跑车和 AKM PBR 步枪；外部素材的作者、授权和调整内容见 [ASSETS.md](ASSETS.md)。生成工具只写 `club/assets`，不会覆盖原始 `.blend` 或 GLB。当前 GLB 未压缩，因此不需要运行时几何解码器。`vendor/manifest.json` 记录固定引擎版本、来源与许可证；没有购买或引入付费模型。

完整迁移约束见 [MIGRATION.md](MIGRATION.md)，后续主线复用顺序见 [GTA-REUSE.md](GTA-REUSE.md)。
