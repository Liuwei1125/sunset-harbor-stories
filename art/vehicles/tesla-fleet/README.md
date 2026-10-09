# Tesla 系列 · 港湾车辆工坊

本目录新增 Model Y、Model S、Roadster 与 Cybertruck 的独立可编辑素材和交互预览。所有修改限于本目录。

| 车型 | 本次范围 | 精度说明 |
|---|---|---|
| Model Y | 2021 初代外形、原座舱、独立中控与运动关节 | 基于 CC BY 艺术家网格 |
| Model S | 2016 风格自建车身、座舱与关节 | 外形研究版，曲面与内饰精度明显较低 |
| Roadster | 第二代概念外形、座舱、原方向盘绑定、动态中控 | 基于 CC BY 艺术家网格，非量产 CAD |
| Cybertruck | 早期概念车身、补建座舱与动态中控 | 基于 CC BY 近似网格，非现款精准复原 |

模型外形与尺寸均不能当作厂家 CAD、扫描数据或工程测量值。Model S 精细替代模型仍需用户登录资源网站后下载。

## 打开

从项目根目录运行 HTTP 静态服务器，再打开 `/art/vehicles/tesla-fleet/preview.html`。当前工作区已启动的地址：
http://127.0.0.1:62597/art/vehicles/tesla-fleet/preview.html

预览支持四车型切换、前侧/侧面/车尾/驾驶舱/屏幕视角、换色、深浅内饰、车轮滚动、转向、轻量模型、仪表演示及外部数据更新。右下角可直接下载当前车型的 Blender 或 GLB。窄屏默认加载轻量模型。

这次交付是本地车辆素材，没有修改主游戏、俱乐部、SU7 或 Model 3，也没有发布到公网。之后接入赛车逻辑使用 [TELEMETRY.md](TELEMETRY.md)。

## 文件

每辆车位于 `models/<id>/`：

- `<id>.blend`：含材质、完整几何、运动关节、四个检查相机的 Blender 5.2 文件；贴图已打包。
- `<id>.high.glb` / `<id>.low.glb`：两档运行时模型，静态显示贴图内嵌。
- `manifest.json`：实际尺寸、关节坐标、视角、屏幕规格、文件大小及 SHA-256。
- `renders/`：直接从交付的 Blender 场景渲染的前侧、后侧、座舱、中控图片。
- `source/`：原始文件、许可证据、固定来源和归一化中间场景。

全部第三方作者及改编记录见 [CREDITS.md](CREDITS.md)。使用和发布时保留对应署名。

## 重建与检查

以下命令从项目根目录运行。Blender 路径按本机安装位置；`bake_displays.py` 需要 Pillow，其余素材脚本使用 Python 标准库或 Blender 自带模块。

```sh
python3 art/vehicles/tesla-fleet/fetch_sources.py
python3 art/vehicles/tesla-fleet/bake_displays.py
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --disable-autoexec --python-exit-code 1 --python art/vehicles/tesla-fleet/inspect_sources.py -- model-y roadster cybertruck
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --disable-autoexec --python-exit-code 1 --python art/vehicles/tesla-fleet/author_model_s.py
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --disable-autoexec --python-exit-code 1 --python art/vehicles/tesla-fleet/build_fleet.py -- model-y model-s roadster cybertruck
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --disable-autoexec --python-exit-code 1 --python art/vehicles/tesla-fleet/render_fleet.py -- model-y model-s roadster cybertruck
python3 art/vehicles/tesla-fleet/verify_fleet.py
```

`verification.json` 保存 GLB 实际结构检查；各车型 `blender-verification.json` 检查打包贴图、相机、UV 和关节。浏览器运行检查单独记录在 `browser-verification.json`。

本次验证：171 项 GLB 结构检查通过；84 项桌面浏览器交互检查通过。浏览器未记录错误，四辆车均从交付 Blender 文件渲染并做了视觉检查。测试验证功能与文件结构，不代表车型外形达到厂家精度。
