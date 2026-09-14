# AR-7 武器检视页

入口：`showroom.html`。这是独立的 model-viewer 展示页，复用游戏现有的 `assets/armory/ar7-rifle.glb`，不改写模型、战斗逻辑、存档或游戏构建。

## 打开

在项目目录启动静态服务器：

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

浏览器访问 `http://127.0.0.1:8000/showroom.html`。组件、模型、灯光和参考图均保存在项目中，运行时无需互联网。由于浏览器的模块与模型加载限制，本页需要本地 HTTP；双击文件会显示启动指引。原游戏 `index.html` 仍可直接离线打开。

## 可以操作的内容

- 拖动旋转，滚轮或双指缩放；整体、侧面、机匣细节三个视角。
- 自动旋转开关，切到后台时停止，初始状态保持静止。
- 摄影棚、均匀中性光、港口日落三种灯光。
- 曝光、AgX / Neutral / ACES 色调映射、落地阴影强度。
- 重置全部设置，以及恢复参考视角。
- 同视角的 Blender Cycles 和当前游戏 WebGL 渲染参考图。

竖屏会根据实际视野角度调整相机距离，以保留整个枪身。模型或组件加载失败时显示具体提示和重试按钮。

## 对照口径

Blender 参考直接导入同一份 GLB，使用同一张摄影棚 HDR、AgX 和 64 次 Cycles 采样。游戏参考使用来自相同 Blender 源模型的高细节运行时网格和现有着色器。三者在桌面默认 8:5 展示区域中使用相同相机目标、角度、距离及 30° 垂直视野。

参考图固定不动，切换展示页灯光或视角后不会更新。游戏参考已更新为 6.3.1 的室外环境光、阳光与 AgX，背景使用中性灰；model-viewer 和 Blender 仍采用展示用的摄影棚 HDR。展示页的柔和落地阴影由组件生成，参考图不附加这个阴影。它们用于观察最终渲染差异，不是隔离单一算法变量的性能基准，整套游戏的 6.3 光影改造另见 `GRAPHICS_ZH.md`，该截图只展示单把武器的结果。

## 文件与重建

- `showroom.html`、`showroom.css`、`showroom.js`：页面、样式和交互。
- `assets/vendor/model-viewer/`：固定版本 4.3.1、本地组件、许可证及来源 / SHA-256 清单。压缩包内上游版权注释保留。
- `assets/showroom/studio.hdr`、`sunset.hdr`：本项目生成的线性 HDR 光照数据，512 × 256；没有使用第三方照片。
- `assets/showroom/ar7-blender.png`、`ar7-game.png`：实际渲染参考。
- `assets/showroom/manifest.json`：相机参数、参考图来源、模型与游戏哈希。

生成灯光并重做参考图（需要 Blender 和 Python Playwright）：

```sh
python3 tools/build_showroom_assets.py
```

验证（脚本自行启动临时本地服务器）：

```sh
node --check showroom.js
python3 tools/verify_showroom.py
```

报告位于 `verification/showroom-browser.json`。脚本检查真实模型像素、曝光与灯光变化、原生鼠标交互、模拟触控、竖横屏构图、资源失败与恢复，并拦截所有外部网络请求。浏览器触控模拟不代表真实手机 GPU、温度或续航测试。

官方资料：[灯光与环境](https://modelviewer.dev/examples/lightingandenv/)、[相机控制](https://modelviewer.dev/examples/stagingandcameras/)、[API](https://modelviewer.dev/docs/index.html)。
