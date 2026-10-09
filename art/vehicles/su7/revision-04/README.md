# 小米 SU7 · 第四版曲面与轮廓校正

依据小米 SU7 官方多角度照片制作的独立 Blender 模型，参考 2026 SU7 Max、卡布里蓝、20 英寸梅花轮毂及浅色座舱。当前版本为 0.4。

本轮集中修正车身和零件的形状、连接及反射。它仍是照片参考下的视觉近似模型，没有厂家 CAD 或实车扫描数据；未声称工程尺寸精确复刻，也没有给出未经验证的相似度分数。

## 本轮改动

- 重新生成连续肩部和侧面曲面，调整前翼子板隆起，减少生硬截面过渡。
- 根据官方侧面图描绘圆角侧窗。使用完整侧面薄壳切出窗洞，修正旧边框在端点挤成尖片及下沿与车身脱开的情况。
- 灯组、进气口、侧面接缝和尾部饰板以实际车身网格定位，替换独立的近似平面定位。
- 灯孔和风道使用平面封闭切割体，并将未切割车身的连续表面法线传递到外表面，修正切口周围的锯齿高光。
- 重做四单元灯腔、灯罩及前进气口连接件；调整后保险杠向下收拢的曲面、凹形饰板、牌照和圆角后风挡。
- 后饰板使用凹多边形三角化，修正扇形网格跨越凹口造成的重叠面。
- 增加固定检查相机、灰模及窄条灯反射图；对照页支持官方照片与第三版切换。
- GLB 改为逐零件减面，在合并前恢复各自源曲面法线；车身、玻璃和灯组保留更高网格预算，避免整车统一减面产生破碎高光或法线误采样附近饰条。

## 打开与文件

- `xiaomi-su7.blend`：当前可编辑源文件，含车身、座舱、材质、灯光、活动零件转轴、固定检查相机。
- `xiaomi-su7.high.glb`：展示及近景候选模型。
- `xiaomi-su7.low.glb`：轻量候选模型。
- `preview.html`：本地 Babylon.js 三维查看器，支持四个视角、换色、车轮与转向演示。
- `comparison.html`：官方照片 / 第三版与第四版对照，含灰模与反射检查。
- `renders/v4-*.png`：第四版正式 Blender 渲染。
- `renders/browser-v4-*.png`：第四版浏览器检查截图。
- `manifest.json`：版本、目标尺寸、关节、文件大小和 SHA-256。
- `surface-fit.json`：表面定位记录、侧窗参考点和固定相机参数。定位成功不等于实车相似度通过。
- `verification.json`、`blender-verification.json`：模型结构、浏览器和 Blender 源文件检查结果。
- `revision-03/`：本轮修改前的第三版源文件、GLB、说明和验证记录。

`revision-01/`、`revision-02/` 与 `renders/v2-*`、`renders/v3-*` 保留更早成果。不带版本号的旧截图不代表当前模型。

在项目根目录启动本地服务后查看：

```sh
python3 -m http.server 8768 --bind 127.0.0.1
# http://127.0.0.1:8768/art/vehicles/su7/preview.html
# http://127.0.0.1:8768/art/vehicles/su7/comparison.html
```

## 重建与检查

第四版入口为 `sculpt_su7.py`，复用此前脚本中的基础几何、轮毂、座舱和导出工具。在项目根目录执行：

```sh
/Applications/Blender.app/Contents/MacOS/Blender \
  --background --factory-startup --disable-autoexec --python-exit-code 1 \
  --python art/vehicles/su7/sculpt_su7.py -- --render \
  --views front,rear,side,front-flat,rear-flat,headlight,wheel,cockpit,clay-front,clay-side,reflection-rear

python3 art/vehicles/su7/verify_asset.py

/Applications/Blender.app/Contents/MacOS/Blender \
  --background art/vehicles/su7/xiaomi-su7.blend --disable-autoexec \
  --python-exit-code 1 --python art/vehicles/su7/verify_blend.py
```

`--draft --render --views rear,side` 只生成较低采样的检查渲染，不覆盖模型和源文件。草稿与正式渲染使用相同文件名；交付前须重新运行正式渲染。Blender 源文件中的 `REFERENCE / fixed review cameras` 保存各视角；`CONSTRUCTION / uninterrupted surface normals` 为隐藏的曲面法线参考，不进入 GLB。

## 结构与边界

2026-09-18 最终验证：`verify_asset.py` 的 64 项检查全部通过，Blender 源文件转轴检查通过。人工复看正式 Blender 渲染、浏览器高精度前后视角和轻量模型截图，确认本轮导出修复消除了轮拱、灯口及尾部的大块破碎高光。此结论针对已检查视角的显示缺陷，不是对实车复原度的认证。

| 导出 | 三角形 | 文件大小 | 用途 |
| --- | ---: | ---: | --- |
| high | 151,020 | 4,226,824 字节（4.03 MiB） | 外观查看与近景 |
| low | 64,226 | 1,937,832 字节（1.85 MiB） | 较远视角；徽标、小倒角和座舱有更多简化 |

为保留车身轮廓与表面反射，本版没有沿用旧版的整车减面比例。高低档分别从源零件生成；`export_su7.py` 负责逐零件减面和法线恢复。两档均为 60 个材质绘制单元，手机表现尚未实机测试。

Blender 使用米、Z 向上、+Y 向前；GLB 使用米、Y 向上、-Z 向前。目标车身长 4.997 米、宽 1.963 米、车顶高 1.445 米、轴距 3 米；这些是建模约束，不是整车每个顶点的测量认证。后视镜、雷达等附件会超出车身包围盒。

四个车轮、方向盘、尾翼拥有独立转轴；`body` 和 `interior` 为静态分组。GLB 中车轮绕本地 X 轴滚动，前轮绕 Y 轴转向，方向盘绕 Z 轴转动。刹车卡钳仍固定在车身分组；尚未实现完整悬架、开门、损毁、车辆物理或动态仪表。

本轮重点为外观曲面，座舱基本沿用旧版。前翼子板和保险杠的精确曲率、灯具的光学结构、轮辐断面与座舱细节仍有近似。官方照片和检查相机没有进行摄影测量级标定，不能将并排展示当作像素级配准。前侧、后侧新旧渲染使用相同相机参数；第四版正侧面改为水平正交相机。

参考来源：[小米 SU7 官方页面](https://www.xiaomiev.com/su7)。`references/sources.json` 记录原始图片地址与哈希。照片仅用于本地参考和对照，未嵌入模型材质，也未随本轮发布到公网。

本目录仍是独立资产交付，本轮没有修改正式赛车关卡、游戏存档或公网 Site。手机检查为桌面浏览器触控模拟，不代表实机性能测试。
