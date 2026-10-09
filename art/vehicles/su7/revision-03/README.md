# 小米 SU7 · 第三版外观细化稿

依据小米 SU7 官方多角度照片，在 Blender 中用车身截面、曲面网格和独立零件制作的游戏模型研究稿。参考 2026 SU7 Max 的外观和浅色座舱。它是照片参考下的近似造型，不是厂家 CAD、扫描模型或精确工程复刻。

此目录是独立资产交付，没有替换俱乐部赛车、修改游戏存档或更新公网 Site。

## 第三版改动

在第二版的比例基础上，重新平滑车身截面过渡，细化四单元水滴灯组、横向日行灯、保护罩、带深度的前进气口、后风道、20 英寸梅花轮毂、轮毂螺栓、气门嘴、轮胎侧壁字样、卡钳、黑色后视镜、后扩散器饰件和尾标。通过 Blender 渲染检查并修复开孔导致的网格丢失、轮辐表面折痕和侧壁字样方向问题。

`refine_su7.py` 是第三版入口，复用 `rebuild_su7.py` 的车身基础与 `build_su7.py` 的几何、座舱和导出函数。`comparison.html` 提供整体、侧面、车尾、车尾正面、大灯和轮毂的官方照片对照。

**仍非照片级或工程级精确复刻。** 车身及保险杠曲面、轮辐断面、灯腔结构和光学材质、内饰细节仍是近似；未获得厂家 CAD、正交工程图或实车扫描数据，不能声称 100% 还原，也没有编造相似度分数。结构和交互检查不代表外观验收。

## 查看与文件

- `xiaomi-su7.blend`：可编辑车身、座舱、曲线、材质、摄影棚灯光和零件转轴。
- `xiaomi-su7.high.glb`：展示及近景使用。
- `xiaomi-su7.low.glb`：降低面数的游戏候选版本。
- `preview.html`：使用项目本地 Babylon.js 的三维查看器，支持旋转、缩放、四个视角、换色、车轮转动和转向演示。
- `renders/`：Blender 的前侧、车尾、侧面和座舱渲染，以及浏览器检查截图。
- `manifest.json`：尺寸目标、关节、坐标、相机位置、文件哈希。
- `verification.json`：实际 GLB 三角形数量、关节核对和浏览器检查结果。

在项目根目录启动本地 HTTP 服务，然后打开查看器：

```sh
python3 -m http.server 8768 --bind 127.0.0.1
# http://127.0.0.1:8768/art/vehicles/su7/preview.html
```

## 模型内容

车身具有真实轮拱开口和座舱空间，包含溜背车顶、水滴形灯组、连续尾灯、后尾翼、门缝、门把手、后视镜、轮胎、五组宽轮辐、刹车盘与卡钳。

座舱包含前后排座椅、方向盘、仪表、中控屏、手机托盘、杯架、门板、脚踏和后视镜。显示屏使用自行制作的简单地图图形。所有模型几何与屏幕内容均由建模脚本生成，不使用下载的第三方汽车模型或照片贴图。

以下部分有独立关节：四个车轮、方向盘、后尾翼。`body` 和 `interior` 为静态分组。Blender 源文件中对应 `RIG / ...` 空物体；导出的 GLB 中为 `joint:...` 节点。车轮绕本地 X 轴旋转；GLB 前轮转向为 Y 轴，方向盘为 Z 轴。刹车卡钳当前保留在静态车身分组，完整转向悬架需要后续接入时细化。

Blender 使用米、Z 向上、+Y 向前；GLB 使用米、Y 向上、-Z 向前。车身目标长度 4.997 米、宽度 1.963 米、车顶高度 1.445 米、轴距 3 米；后视镜、雷达和局部装饰会超出车身包围盒。比例和隐藏结构仍属于参考图估计。

## 重建与检查

从项目根目录执行，Blender 5.2.1 LTS 已验证：

```sh
/Applications/Blender.app/Contents/MacOS/Blender \
  --background --factory-startup --disable-autoexec --python-exit-code 1 \
  --python art/vehicles/su7/refine_su7.py -- --render

python3 art/vehicles/su7/verify_asset.py

/Applications/Blender.app/Contents/MacOS/Blender \
  --background art/vehicles/su7/xiaomi-su7.blend --disable-autoexec \
  --python-exit-code 1 --python art/vehicles/su7/verify_blend.py
```

不传 `--render` 可只生成源文件和 GLB。`--views front,rear,headlight,wheel` 可限制渲染视角；`--draft` 只渲染草稿，不覆盖源模型或 GLB。构建仅写入本目录；无需联网、密钥或外部建模插件。检查脚本需要 Python Playwright 和本机 Chrome，使用临时端口并自动关闭测试服务器和浏览器。

几何检查验证 GLB 容器、有限顶点、索引范围、全部关节及轴心、嵌入资源和 LOD 面数下降。浏览器检查验证实际导入两种 GLB、四个视角、换色、车轮和方向盘动作，以及手机尺寸下的触摸控件。手机检查是桌面 Chrome 的触摸模拟，不代表真实手机性能测试。

本版完成 29 项结构、版本与文件哈希检查，并核对 Blender 源文件的四个轮轴、方向盘及 8 个分组转轴。原生浏览器中检查了高低两种 GLB、换色、前后视角、车轮和转向控件，以及细节对照页面。本轮没有重跑手机检查，也没有进行照片相似度打分。近景 GLB 为 144,669 个三角形、3,949,100 字节；轻量 GLB 为 40,497 个三角形、1,298,812 字节。

## 参考资料与当前边界

官方来源：[小米 SU7](https://www.xiaomiev.com/su7)。`references/sources.json` 保留每张参考图的原始链接、下载时间和 SHA-256。参考照片仅放在本地参考目录并供 comparison.html 对照，未作为模型贴图或三维查看器内容；图像文件已由本目录 `.gitignore` 排除。

当前成果用于审阅第一辆样车的第三版外观细化。revision-01/ 和 revision-02/ 保留前两版文件。renders/v3-*.png 为本版 Blender 渲染；v2-*.png 和不带版本号的离线渲染为旧版存档。旧 browser-*.png 截图属于第二版，不能用于代表当前模型。车灯内部、前后保险杠曲面、座椅缝线与真实材质仍有简化；没有实现开门、损毁、完整悬架、车辆物理或动态仪表，也尚未接入正式赛车关卡。后续接入时还需完成车型选择、碰撞体、驾驶舱机位、动力参数与实机性能检查。
