# 小米 SU7 · 第六版外观与座舱修订

参考 2026 SU7 Max、卡布里蓝、20 英寸梅花轮毂及浅色座舱。当前版本 0.6，是依据官方照片制作的独立模型，没有厂家 CAD 或实车扫描数据。结构检查通过不等于完全还原实车。

## 本轮修改

- 车顶、前后风挡使用连续曲面，移除重叠底板，补足玻璃厚度和黑色陶瓷遮蔽边。
- 修正尾部中心曲面，重做后下饰板、车身色嵌件与扁平尾灯导光带。
- 调整车门分缝位置和凹槽暗线，让尾门底部分缝连贯。
- 重做仪表台截面，增加手机托盘、实际下凹杯架、实体按键、门板缝线与车窗按键、遮阳板、内侧 A 柱饰板和方向盘细部。
- 保留第五版灯组、轮毂与胎纹细节；重复微小曲线按部件归组，缩短导出过程。
- 网页补充玻璃吸收距离，调整环境光与阴影；源文件打包 HDR 和参考背景图。

详细说明及剩余差距见 [REVISION-06.md](REVISION-06.md)，汽车曲面、拓扑和相机方法见 [RESEARCH-05.md](RESEARCH-05.md)。

## 文件

| 文件 | 内容 |
| --- | --- |
| `xiaomi-su7.blend` | 可编辑模型、材质、灯光、活动零件转轴和检查相机，外部图片已打包 |
| `xiaomi-su7.high.glb` | 网页高精度展示模型 |
| `xiaomi-su7.low.glb` | 较远视角的简化模型 |
| `preview.html` | 旋转、换色、车轮与转向演示 |
| `comparison.html` | 官方照片 / 第五版对照与前侧透明叠加 |
| `renders/v6-*.png` | 第六版 Blender 正式渲染，`reference-front` 为透明背景 |
| `renders/browser-v6-*.png` | 第六版网页导出检查截图 |
| `reference-camera-fit.json` | 参考相机参数、人工标记及投影残差 |
| `headlamp-reference-trace.json` | 灯组照片投射诊断和有限修正量 |
| `surface-fit.json` | 曲面定位与轮辐三角化面积检查 |
| `manifest.json` | 版本、转轴、GLB 大小与哈希 |
| `verification.json` / `blender-verification.json` | 模型、网页和源文件检查结果 |
| `revision-05/` | 本轮修改前的第五版模型、脚本及验证记录 |

更早版本保留在 `revision-01/` 至 `revision-04/`，旧渲染保留原版本文件名。本轮修改仅限这个独立资产目录。

在项目根目录运行本机查看服务：

```sh
python3 -m http.server 8768 --bind 127.0.0.1
# http://127.0.0.1:8768/art/vehicles/su7/preview.html
# http://127.0.0.1:8768/art/vehicles/su7/comparison.html
```

## 重建

`atelier_su7.py` 为第六版入口，`atelier_parts.py` 补充细部，`reference_camera.py` 负责参考相机，`export_su7.py` 负责逐零件减面及法线恢复。旧版辅助模块仍由当前入口导入，需保留整个资产目录中的脚本。

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --disable-autoexec --python-exit-code 1 --python art/vehicles/su7/atelier_su7.py -- --render --views front,rear,side,front-flat,rear-flat,headlight,wheel,cockpit,cabin-wide,clay-front,clay-side,reflection-rear,reference-front

python3 art/vehicles/su7/verify_asset.py

/Applications/Blender.app/Contents/MacOS/Blender --background art/vehicles/su7/xiaomi-su7.blend --disable-autoexec --python-exit-code 1 --python art/vehicles/su7/verify_blend.py
```

网页检查需要 Python Playwright 与本机 Chrome。`--draft --render --views headlight,wheel` 不覆盖最终 `.blend` 或 GLB，但会写参考拟合记录并覆盖对应的低采样渲染；交付前须重新生成正式渲染。

## 检查结果与边界

2026-09-18：完成 13 张正式 Blender 渲染，检查整车、灯组、轮毂、驾驶舱、座舱全景、灰模、反射及参考叠加。网页/GLB 的 73 项检查通过；Blender 源文件的 10 项检查通过，包括玻璃表面方向和厚度、杯架凹陷、资源打包、微小曲线保留及转轴。手机部分为 Chrome 触控模拟。

| 导出 | 三角形 | 文件大小 | 用途 |
| --- | ---: | ---: | --- |
| 高精度 GLB | 636,925 | 16.21 MiB | 近景与细节查看 |
| 简化 GLB | 259,382 | 6.49 MiB | 较远视角展示 |

两档各有 63 个绘制图元；尚未针对游戏中的多车同屏做性能预算。Blender 源文件约 15.53 MiB，HDR 与参考图片已经打包。GLB 自带几何数据和材质，不嵌入官方参考照片。

参考相机没有校准镜头畸变。标记残差只描述相机拟合，不代表整车几何精度。保险杠转角、尾部开口、座椅曲面、顶棚与 A 柱收边、仪表界面及灯具内部结构仍有近似。没有经过厂家曲面容差验证，不能称为完美复刻。

Blender 使用米、Z 向上、+Y 向前；GLB 使用米、Y 向上、-Z 向前。名义建模约束为车长 4.997 米、车身宽 1.963 米、车顶高 1.445 米和轴距 3 米，不是逐顶点的工程测量认证。车轮、方向盘、尾翼有独立转轴；未实现完整悬架、车门动画、车辆物理或动态仪表。

Blender 使用灯光、HDR 与程序化微观漆面，GLB 保留可移植材质参数，网页实时折射与离线渲染存在差别。未进行手机实机性能认证。

参考来源：[小米 SU7 官方页面](https://www.xiaomiev.com/su7)。本轮未修改主线游戏、俱乐部或公网 Site。
