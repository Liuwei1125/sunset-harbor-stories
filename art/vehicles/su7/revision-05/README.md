# 小米 SU7 · 第五版外观与细节校正

参考 2026 SU7 Max、卡布里蓝、20 英寸梅花轮毂及浅色座舱。当前版本 0.5，是依据官方照片制作的独立模型，没有厂家 CAD 或实车扫描数据。

本轮阅读了 Autodesk 汽车曲面教程、Blender 曲面与相机文档、CG Cookie 拓扑指南，具体来源与采用方法见 [RESEARCH-05.md](RESEARCH-05.md)。没有把渲染检查或程序检查当作实车相似度评分。

## 本轮修改

- 主车身先细分平顺，再切轮拱、灯孔及面板分缝；调整肩部凸起、门板内收和尾部收拢。
- 门缝、机盖缝和充电口边缘改为毫米级凹槽，槽内有独立暗线。
- 大灯分为深色壳体、四个反射碗、凸透镜、抛光边缘、导光条微棱镜、透明外罩和密封边框。
- 轮毂重做较宽的五组分叉轮辐与黑色饰面，补足中心盖、螺栓窝、刹车盘刻线和轮胎肩部细纹。
- 修正凹多边形三角化的法线初始化顺序；以面积检查防止轮辐被错误填面，再让饰面与轮辐贴合同一凹曲面。
- 添加浅嵌的停车传感器，重做雷达罩；车尾侧面风口按纵向/高度轮廓开孔，避免向车尾投射时横向拉伸。
- 根据官方前侧照片的人工轮心、轮胎边缘等标记拟合近似相机，提供真实透明渲染的叠加对照。

## 文件

| 文件 | 内容 |
| --- | --- |
| `xiaomi-su7.blend` | 当前可编辑模型、材质、灯光、活动零件转轴和检查相机 |
| `xiaomi-su7.high.glb` | 网页高精度展示模型 |
| `xiaomi-su7.low.glb` | 较远视角的简化模型 |
| `preview.html` | 旋转、换色、车轮与转向演示 |
| `comparison.html` | 官方照片 / 第四版对照与前侧透明叠加 |
| `renders/v5-*.png` | 第五版 Blender 渲染；`reference-front` 为透明背景 |
| `renders/browser-v5-*.png` | 第五版网页导出检查截图 |
| `reference-camera-fit.json` | 参考相机参数、人工标记及投影残差 |
| `headlamp-reference-trace.json` | 灯组照片投射诊断和有限修正量 |
| `surface-fit.json` | 曲面定位与轮辐三角化面积检查 |
| `manifest.json` | 版本、转轴、GLB 大小与哈希 |
| `verification.json` / `blender-verification.json` | 模型、网页和源文件检查结果 |
| `revision-04/` | 本轮修改前的第四版模型、脚本及验证记录 |

更早版本保留在 `revision-01/` 至 `revision-03/`。本轮所有修改限于这个独立资产目录。

在项目根目录运行本机查看服务：

```sh
python3 -m http.server 8768 --bind 127.0.0.1
# http://127.0.0.1:8768/art/vehicles/su7/preview.html
# http://127.0.0.1:8768/art/vehicles/su7/comparison.html
```

## 重建

`precision_su7.py` 负责第五版车身、材质和渲染，`precision_parts.py` 负责细部，`reference_camera.py` 负责参考相机，`export_su7.py` 负责逐零件减面及法线恢复。

```sh
/Applications/Blender.app/Contents/MacOS/Blender \
  --background --factory-startup --disable-autoexec --python-exit-code 1 \
  --python art/vehicles/su7/precision_su7.py -- --render \
  --views front,rear,side,front-flat,rear-flat,headlight,wheel,cockpit,clay-front,clay-side,reflection-rear,reference-front

python3 art/vehicles/su7/verify_asset.py

/Applications/Blender.app/Contents/MacOS/Blender \
  --background art/vehicles/su7/xiaomi-su7.blend --disable-autoexec \
  --python-exit-code 1 --python art/vehicles/su7/verify_blend.py
```

`--draft --render --views headlight,wheel` 不覆盖最终 `.blend` 或 GLB，但会写参考拟合记录并覆盖对应的低采样渲染；交付前须重新生成正式渲染。

## 检查与边界

2026-09-18：已完成 12 张正式 Blender 渲染，检查灯组、轮毂、前后与侧面、灰模、反射及参考照片叠加；网页/GLB 的 69 项检查通过，Blender 源文件的 6 项转轴与参考相机检查通过。手机部分为 Chrome 触控模拟。检查报告记录的是结构和可用性，不是还原度分数。

| 导出 | 三角形 | 文件大小 | 用途 |
| --- | ---: | ---: | --- |
| 高精度 GLB | 572,694 | 14.78 MiB | 近景与细节查看 |
| 简化 GLB | 227,298 | 5.76 MiB | 较远视角展示 |

两档各有 63 个绘制图元；本轮优先保留灯组、轮辐和曲面细节，尚未针对游戏中的多车同屏做性能预算。源文件约 11.13 MiB，使用项目内的 HDR 与参考图片路径，并非打包全部外部资源的独立文件。

人工检查包括前后视角、正侧面、灯组与轮毂近景、灰模、反射图和官方照片叠加。结构检查验证 GLB、转轴、有限顶点/法线、材质透射、浏览器操作及参考相机实现；这些检查不证明与实车完全一致。

参考相机未校准镜头畸变。标记残差只描述相机拟合，不代表整车几何精度。灯组的单张照片投射仅用于诊断，最终采用侧面和近照约束下的有限修正。保险杠、玻璃曲率和内部光学结构仍有近似；座舱基本沿用原有简化版本。

Blender 使用米、Z 向上、+Y 向前；GLB 使用米、Y 向上、-Z 向前。名义建模约束为车长 4.997 米、车身宽 1.963 米、车顶高 1.445 米和轴距 3 米，不是逐顶点的工程测量认证。车轮、方向盘、尾翼有独立转轴；未实现完整悬架、车门动画、车辆物理或动态仪表。

Blender 使用灯光、HDR 与程序化微观漆面，GLB 保留可移植的材质参数，网页呈现与离线渲染会有差别。手机检查属于桌面浏览器触控模拟，没有进行实机性能认证。

参考来源：[小米 SU7 官方页面](https://www.xiaomiev.com/su7)。照片只作本机参考，未嵌入 GLB 材质。本轮未修改主线游戏、俱乐部或公网 Site。
