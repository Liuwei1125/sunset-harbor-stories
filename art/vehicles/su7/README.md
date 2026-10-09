# 小米 SU7 · 第七版座舱与动态赛车仪表

参考 2026 SU7 Max、卡布里蓝、20 英寸梅花轮毂及浅色座舱。当前版本 0.7，是依据官方照片制作的独立模型，没有厂家 CAD 或实车扫描数据。结构检查通过不等于完全还原实车。

## 本轮修改

- 前排座椅改为连续靠背、独立头枕和承托坐垫，增加微小打孔、包边、导轨和安全带卡扣。
- 补充窗沿内衬、A 柱包覆、顶棚前横梁、遮阳板和化妆镜盖。
- 增加扬声器格栅、门把手凹槽、踏板防滑条、手套箱分缝和扶手细部。
- 仪表与中控拆成两个独立 UV 显示面，支持实时车速、电机转速、行驶挡位、驱动/回收功率、电量、圈速及踏板输入。
- 本地预览新增「仪表」视角、动态演示、暂停、车速滑杆和复位。组件支持外部数据接入，并在高低精度切换时保留状态。

动态接口和使用示例见 [TELEMETRY.md](TELEMETRY.md)，本轮说明见 [REVISION-07.md](REVISION-07.md)。当前为独立组件及合成数据演示，尚未接入赛车游戏的物理与计圈系统。仪表是原创赛车 UI，不是小米车机界面复刻。

## 文件

新增 `telemetry.js`（动态组件）、`TELEMETRY.md`（接口约定）、`bake_displays.py`（静态屏幕纹理生成）、`telemetry_checks.py`（动态行为验证）。

| 文件 | 内容 |
| --- | --- |
| `xiaomi-su7.blend` | 可编辑模型、材质、灯光、活动零件转轴和检查相机，外部图片已打包 |
| `xiaomi-su7.high.glb` | 网页高精度展示模型 |
| `xiaomi-su7.low.glb` | 较远视角的简化模型 |
| `preview.html` | 旋转、换色、转向、动态赛车仪表演示 |
| `comparison.html` | 官方照片 / 第六版对照与前侧透明叠加 |
| `renders/v7-*.png` | 第七版 Blender 正式渲染，`reference-front` 为透明背景 |
| `renders/browser-v7-*.png` | 第七版网页导出检查截图 |
| `reference-camera-fit.json` | 参考相机参数、人工标记及投影残差 |
| `headlamp-reference-trace.json` | 灯组照片投射诊断和有限修正量 |
| `surface-fit.json` | 曲面定位与轮辐三角化面积检查 |
| `manifest.json` | 版本、转轴、GLB 大小与哈希 |
| `verification.json` / `blender-verification.json` | 模型、网页和源文件检查结果 |
| `revision-06/` | 本轮修改前的第六版模型、脚本及验证记录 |

更早版本保留在 `revision-01/` 至 `revision-05/`，旧渲染保留原版本文件名。本轮修改仅限这个独立资产目录。

在项目根目录运行本机查看服务：

```sh
python3 -m http.server 8768 --bind 127.0.0.1
# http://127.0.0.1:8768/art/vehicles/su7/preview.html
# http://127.0.0.1:8768/art/vehicles/su7/comparison.html
```

## 重建

`cockpit_su7.py` 为第七版入口，`cockpit_parts.py` 补充座舱及显示面细部，`reference_camera.py` 负责参考相机，`export_su7.py` 负责逐零件减面及法线恢复。旧版辅助模块仍由当前入口导入，需保留整个资产目录中的脚本。

```sh
python3 art/vehicles/su7/bake_displays.py

/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --disable-autoexec --python-exit-code 1 --python art/vehicles/su7/cockpit_su7.py -- --render --views front,rear,side,front-flat,rear-flat,headlight,wheel,cockpit,cabin-wide,instruments,clay-front,clay-side,reflection-rear,reference-front

python3 art/vehicles/su7/verify_asset.py

/Applications/Blender.app/Contents/MacOS/Blender --background art/vehicles/su7/xiaomi-su7.blend --disable-autoexec --python-exit-code 1 --python art/vehicles/su7/verify_blend.py
```

网页检查需要 Python Playwright 与本机 Chrome。`--draft --render --views headlight,wheel` 不覆盖最终 `.blend` 或 GLB，但会写参考拟合记录并覆盖对应的低采样渲染；交付前须重新生成正式渲染。

## 检查结果与边界

2026-09-18：完成 14 张正式渲染，检查整车、灯组、轮毂、驾驶舱、座舱全景、仪表近景、灰模、反射及参考叠加。网页/GLB 的 99 项检查通过，Blender 源文件的 13 项检查通过，包括玻璃表面方向和厚度、杯架凹陷、资源打包、微小曲线保留及转轴。手机部分为 Chrome 触控模拟。

| 导出 | 三角形 | 文件大小 | 用途 |
| --- | ---: | ---: | --- |
| 高精度 GLB | 704,821 | 17.97 MiB | 近景与细节查看 |
| 简化 GLB | 285,157 | 7.23 MiB | 较远视角展示 |

两档各有 68 个绘制图元；尚未针对游戏中的多车同屏做性能预算。Blender 源文件约 16.13 MiB，HDR、参考背景和两张停驻屏幕图片已经打包。GLB 自带几何、材质和两张自行绘制的停驻屏幕纹理，不嵌入官方参考照片。

参考相机没有校准镜头畸变。标记残差只描述相机拟合，不代表整车几何精度。保险杠转角、尾部开口、座椅曲面、顶棚与 A 柱收边、仪表界面及灯具内部结构仍有近似。没有经过厂家曲面容差验证，不能称为完美复刻。

Blender 使用米、Z 向上、+Y 向前；GLB 使用米、Y 向上、-Z 向前。名义建模约束为车长 4.997 米、车身宽 1.963 米、车顶高 1.445 米和轴距 3 米，不是逐顶点的工程测量认证。车轮、方向盘、尾翼有独立转轴；未实现完整悬架、车门动画、车辆物理。动态仪表已有独立接口，游戏端仍需接入实时输入。

Blender 使用灯光、HDR 与程序化微观漆面，GLB 保留可移植材质参数，网页实时折射与离线渲染存在差别。未进行手机实机性能认证。

参考来源：[小米 SU7 官方页面](https://www.xiaomiev.com/su7)。本轮未修改主线游戏、俱乐部或公网 Site。
