# 外部素材与再生成

7.1 接入两项外部模型，实际运行仍全部读取本地文件。

| 使用位置 | 模型与作者 | 许可 | 原始来源 |
| --- | --- | --- | --- |
| 玩家、对手及回放车辆，含完整座舱 | Car Concept — Eric Chadwick / Darmstadt Graphics Group GmbH，2024 | CC BY 4.0 | [Khronos glTF Sample Assets](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept) |
| 默认竞技步枪 | AKM — LonesomeDucky，2025 | CC0 1.0 | [OpenGameArt 作者页](https://opengameart.org/content/weathered-akm-rifle) |

Car Concept 原始基础模型出自 Unity Fan；Khronos 发布版由 Eric Chadwick 优化和制作材质。本项目沿用发布版的 CC BY 4.0 许可，保留作者、来源及变更说明。游戏大厅底部可打开「素材鸣谢」。请在后续发布和主线复用时一并保留鸣谢。

改动包含：统一米制、Y 向上、负 Z 为前方；车身旋转与缩放、车轮枢轴、移除车牌和方向盘徽章、移除高面数雨刷、优化车漆及玻璃、按关节合并网格、减少三角形、缩小贴图。车内显示屏改为俱乐部自绘仪表，实时显示车速与氮气。AKM 从原模型的分离网格中划分弹匣和枪机，保留原始 UV 和 PBR 材质；基础色使用 JPEG，法线和金属／粗糙度／遮蔽贴图使用 PNG。

原始模型、原始授权及来源信息保存在 `assets/source/third-party/`。下载文件的 SHA-256、运行 GLB 的 SHA-256、尺寸和关节数据写入 `assets/external-manifest.json`，并合并到 `assets/manifest.json`。已有港湾原创资源及其 Blender 源文件没有被覆盖。

## 可重复构建

需要 Blender 5.2。运行时不需要 Blender、额外 npm 包或 Draco 解码器。

```sh
# 在 club 目录；可将 Blender 路径替换为本机安装位置。
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --disable-autoexec --python tools/build_external_assets.py
python3 tools/build_assets.py
```

导入外部 `.blend` 时禁用内嵌脚本。构建只读取源模型；所有修改写入新的标准 GLB。外部资源可独立重建，原有构建命令会保留外部模型清单。

## 本轮选材

也核对了 [Kenney Car Kit](https://kenney.nl/assets/car-kit)、[Quaternius Ultimate Guns](https://quaternius.com/packs/ultimategun.html) 和 [Stein Games Classic Weapons Pack](https://stein-indie.itch.io/classic-weapons-pack)。前两者更偏低模风格；Stein 的写实素材包授权合适，但本机下载站连接超时，因此没有接入或声称已使用该包。最终采用上表中已实际下载、转换和显示的模型，没有采购付费素材。
