# Harbor Club 7.1 验证记录

本轮素材、视角与触控更新检查：**通过**。性能测量完成于 2026-09-11T17:01:04+0800；专项验证、性能测量与当前运行代码哈希一致：通过。

## 实际交付

赛车采用含完整座舱的 Car Concept 模型，默认追尾，按 C、点右上角按钮或在设置中切换引擎盖／驾驶舱。选择会保存。玩家、对手和回放车辆使用同一套外观。两套原生引擎中的方向盘、车轮、透明玻璃和车速／氮气仪表均保留。

默认步枪替换为带 PBR 材质的 AKM，保留原有玩法参数，带原生弹匣、枪机、瞄准及枪口效果。原有手枪和狙击枪仍可选。来源、CC BY／CC0 授权、修改说明及重建命令见 [ASSETS.md](../ASSETS.md)，游戏大厅也有「素材鸣谢」。

## 行为与输入

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| 规则、模型、存档、全部赛道相机及确定性 | 107 通过，0 失败 | [node-test.log](node-test.log) |
| 产品流程与 72 次 Babylon 通关、6 次 PlayCanvas 对照 | 56/56 | [browser.json](browser.json) |
| 原生键鼠通关与横竖屏多点触控 | 24/24 | [native-input.json](native-input.json) |
| WebGL 恢复、跨日、存储与资源释放 | 8/8 | [lifecycle.json](lifecycle.json) |
| 三视角、仪表、LOD、触控切换与 AKM | 24/24 | [update.json](update.json) |

键盘和按钮切换视角前后，运行状态、按住的控制、时间及轨迹保持一致。390×844 与 844×390 通过 CDP 同时触点验证：第一根手指持续踩油门，第二根手指切换视角；单指轻点只切换一次。手机 HUD 按钮在可见范围内且互不重叠。

两套引擎都验证了高／低 LOD 的实时仪表与 HUD 一致，以及加速和使用氮气后的更新。反复重建赛道并生成两档仪表，预热后 WebGL 资源计数稳定。AKM 瞄具检查使用相机局部坐标，开火和换弹检查读取实际原生关节。

## 正常 RAF 性能

Nine sequential cases, normal requestAnimationFrame and production FixedClock. A pilot supplies only inputs at ordinary physics steps. No synthetic time. Each case has 6 seconds of countdown/shader warm-up and 12 seconds of measured real time. Single benchmark browser; no concurrent graphics tests. Touch profiles use desktop Apple M2 graphics and do not measure phone hardware. Local HTTP with normal filesystem/browser caches; this report does not measure cold network loading.

| 引擎 / 项目 / 视角 | 视口与画质 | 实际渲染尺寸 | 平均 FPS | P95 / P99 帧耗时 | 实测秒数 |
| --- | --- | --- | ---: | ---: | ---: |
| babylon / 追尾 | 1440×900 / high | 1440×900 | 59.92 | 16.80 / 16.80 ms | 12.01 |
| babylon / 引擎盖 | 1440×900 / high | 1440×900 | 60.00 | 16.70 / 16.80 ms | 12.00 |
| babylon / 驾驶舱 | 1440×900 / high | 1440×900 | 60.00 | 16.70 / 16.80 ms | 12.01 |
| playcanvas / 追尾 | 1440×900 / high | 1440×900 | 57.67 | 16.80 / 16.80 ms | 12.00 |
| playcanvas / 引擎盖 | 1440×900 / high | 1440×900 | 60.00 | 16.80 / 16.80 ms | 12.01 |
| playcanvas / 驾驶舱 | 1440×900 / high | 1440×900 | 59.92 | 16.80 / 16.80 ms | 12.01 |
| babylon / 追尾 | 390×844 / medium | 343×742 | 60.00 | 16.70 / 16.80 ms | 12.01 |
| babylon / 追尾 | 844×390 / medium | 742×343 | 59.92 | 16.70 / 16.80 ms | 12.00 |
| babylon / AKM 射击 | 1440×900 / high | 1440×900 | 60.00 | 16.70 / 16.80 ms | 12.01 |

详细设备：ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)。所有案例使用生产 FixedClock，正常运行 6 秒预热，再测量 12 秒；每次物理更新前控制器只提供输入。FPS 来自正常 RAF 的平均帧间隔，不使用加速验证的帧数或引擎启动时的瞬时读数。桌面平均目标带为 ≥55 FPS，触屏仿真 ≥28 FPS；P95/P99 单独列出卡顿。所有案例持续处于比赛中且 GL 错误为 0。原始数据见 [performance-update.json](performance-update.json)。

**范围限制：** 本轮没有在实体手机上测 GPU，也没有重新运行 20 分钟连续测试；触屏是本机 Chrome 仿真，性能采样是九个场景各约 12 秒。本轮没有测量冷网络加载。7.0 的性能、连续运行及主线浏览器回归保存在 [历史基线](7.0-baseline/REPORT.md)，不作为 7.1 的长时间运行证明。

## 资源与原版保护

| 新资源 | 高 LOD 三角形 / 大小 | 低 LOD 三角形 / 大小 |
| --- | --- | --- |
| GT 概念跑车 | 41,548 / 3.60 MiB | 14,161 / 1.96 MiB |
| AKM / 木饰步枪 | 5,322 / 1.09 MiB | 2,925 / 0.89 MiB |

共 23 种资源、46 个标准 GLB。运行模型、纹理与固定版本引擎的 54 个文件哈希检查：通过。主线文件、原版离线入口及模型源文件保护检查：通过。详细清单见 [release.json](release.json)。运行时通过本地 HTTP 读取素材，不依赖外部 CDN 或几何解码器。

## 实际浏览器截图

- [Babylon 追尾](../previews/7.1/babylon-chase.png)、[引擎盖](../previews/7.1/babylon-hood.png)、[驾驶舱](../previews/7.1/babylon-cockpit.png)
- [PlayCanvas 追尾](../previews/7.1/playcanvas-chase.png)、[驾驶舱](../previews/7.1/playcanvas-cockpit.png)
- [竖屏追尾](../previews/7.1/touch-390-chase.png)、[横屏驾驶舱](../previews/7.1/touch-844-cockpit.png)
- [AKM 持枪](../previews/7.1/akm-hip.png)、[瞄准](../previews/7.1/akm-aim.png)、[换弹](../previews/7.1/akm-reload.png)
