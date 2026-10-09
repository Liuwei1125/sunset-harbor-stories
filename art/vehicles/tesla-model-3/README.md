# Tesla Model 3 Highland · 港湾独立资产

基于公开标注 **CC BY 4.0** 的 2024 Model 3 艺术家模型制作，采用免费资源，保留来源、署名和修改说明。详细记录见 [CREDITS.md](CREDITS.md) 和 [source/provenance.json](source/provenance.json)。这是可继续编辑和接入游戏的模型资产，不是厂家 CAD。

## 查看与编辑

从项目根目录运行 `python3 -m http.server 62597 --bind 127.0.0.1`，然后访问：

<http://127.0.0.1:62597/art/vehicles/tesla-model-3/preview.html>

如果该端口已有项目预览服务，直接打开链接即可。页面必须通过 HTTP 加载，不能直接用 `file://` 打开。

- `preview.html`：六个检查视角、车漆/内饰切换、转向与轮组演示、前后屏幕动态数据、高低精度切换、署名说明。
- `tesla-model-3.blend`：可编辑 Blender 源文件，贴图和环境图已打包，包含四台检查相机和工作室灯光。
- `tesla-model-3.high.glb`：178,189 三角面，7,423,488 字节，适合车辆展示和座舱检查。
- `tesla-model-3.low.glb`：74,211 三角面，4,116,972 字节；相对高精度版减少约 58% 三角面，需按目标设备进一步评估。
- `vehicle.js` / `telemetry.js`：独立 Babylon 接入层与前后屏幕绘制。输入协议和示例见 [TELEMETRY.md](TELEMETRY.md)。
- `manifest.json`：文件校验和、坐标、尺寸、关节和显示面名称。
- `renders/`：实际 Blender 渲染和浏览器检查截图。

预览依赖项目内已有的 `club/vendor/babylon-9.26.0.js`、对应加载器及 `assets/showroom/studio.hdr`；单独搬走预览目录时需要同时处理这些引用。GLB 内嵌贴图，可独立导入支持 glTF 2.0 的工具。

## 本次处理

1. 按 4.720 米车长统一比例、坐标和地面位置，保留原始来源文件。
2. 从原模型分离轮组、方向盘和前后显示面；用独立关节驱动转向和滚动。
3. 调整车漆、轮胎、玻璃和内饰材质；把共用白色材质的座椅与车灯分开，修正座椅法线，并分离外部门把手的材质。
4. 为前后屏幕重新整理 UV，加入原创赛车 UI。离线模型带静态贴图，浏览器版通过两张动态纹理驱动。
5. 导出高、低精度版本，切换模型时保留遥测状态、颜色和动态纹理。

## 坐标与可动部分

Blender 使用米、Z 向上、+Y 车头；GLB 使用米、Y 向上、−Z 车头。根节点为 `tesla-model-3-highland`。

四个轮组关节为 `joint:wheel-front-left`、`joint:wheel-front-right`、`joint:wheel-rear-left`、`joint:wheel-rear-right`；方向盘为 `joint:steering`。前后显示面分别为 `geometry:display-front` 和 `geometry:display-rear`。

所有尺寸和关节坐标以 `manifest.json` 为准。模型长 4.720 米、带后视镜宽约 2.088 米、轴距约 2.873 米。**模型高约 1.411 米，仍低于官方参考高度 1.440 米**；没有为凑齐单个尺寸而强行拉伸全部几何。

## 重新生成与验证

当前工作流使用 Blender 5.2.1 LTS、Python 3、Playwright 和本机 Google Chrome。在项目根目录执行：

```sh
python3 art/vehicles/tesla-model-3/fetch_source.py
python3 art/vehicles/tesla-model-3/bake_displays.py
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --disable-autoexec --python-exit-code 1 --python art/vehicles/tesla-model-3/build_model.py
/Applications/Blender.app/Contents/MacOS/Blender --background art/vehicles/tesla-model-3/tesla-model-3.blend --disable-autoexec --python-exit-code 1 --python art/vehicles/tesla-model-3/render_model.py
python3 art/vehicles/tesla-model-3/verify_asset.py
```

`fetch_source.py` 使用固定版本下载地址，校验源文件 SHA-256，并核对公开发布页的许可证字段。生成脚本会覆盖本目录中的导出模型和 `.blend`；手工编辑前请另存工作副本，或将改动回填到构建脚本。渲染脚本为 macOS Metal 配置了 GPU，并提供 CPU 回退。

验证报告：`verification.json` 检查实际 GLB、动态纹理、数据边界、转向/轮组、精度切换、资源释放和手机触控布局；`blender-verification.json` 检查贴图打包、相机、UV 和关节。手机检查使用 Chromium 390×844 触控模拟，不代表真机性能测试。

## 精度与接入边界

这是基于艺术家网格的 2024 Model 3 焕新版适配，不能作为工程 CAD、测量模型或完全复原实车的证明。座椅轮廓、缝线、小开关与部分内饰近景仍受源模型精度限制；车门和悬架没有独立机构，也没有加入车辆碰撞、轮胎、悬架或驱动力物理。

动态仪表、转向和轮组接口已经实现；演示数据为合成输入。赛车 UI 为港湾原创，不是特斯拉车机复刻。当前只交付此独立资产目录，尚未接入主线游戏或发布到公网。
