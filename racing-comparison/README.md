# Coast Rush：Babylon.js / PlayCanvas / Unity WebGL 对比原型

这是独立的公路穿车实验，不改动原游戏的代码、资源或发布文件。

## 当前交付状态

- **Babylon.js：可运行并已验证。** 90 秒驾驶挑战，3 档难度，座舱 / 引擎盖 / 追车视角，自动油门、转向惯性、刹车、氮气、擦车连击、碰撞与重开。
- **PlayCanvas 2.22.1：可运行并已验证。** 与 Babylon 直接共用 `shared/simulation.js`、`shared/game.js`、音效、模型、纹理与环境布局；引擎独立负责场景、材质、阴影、镜头和后处理。本次使用本地独立引擎，没有创建 PlayCanvas 云端项目。
- **Unity：C# 工程源码、资源和 WebGL 构建脚本已提供，尚未编译验证。** 此机器未安装 Unity Editor / Web Build Support，也未发现已激活许可证；检查时可用磁盘约 5.6 GB。没有伪造 Unity loader 或 WebAssembly 构建。
- **Babylon 与 PlayCanvas 已可实测；三引擎的完整实测尚未完成。** Unity 的帧率、加载时间及画面结果保持“未测”。

## 运行

在本目录运行：

```sh
npm run serve
```

然后打开：

- 对比入口：<http://127.0.0.1:8011/racing-comparison/>
- Babylon 试玩：<http://127.0.0.1:8011/racing-comparison/babylon/>
- PlayCanvas 试玩：<http://127.0.0.1:8011/racing-comparison/playcanvas/>
- PlayCanvas 固定场景自动驾驶：<http://127.0.0.1:8011/racing-comparison/playcanvas/?benchmark=1>
- Babylon 固定场景自动驾驶：<http://127.0.0.1:8011/racing-comparison/babylon/?benchmark=1>

页面通过 HTTP 读取资源，请勿双击 HTML 使用 `file://`。Babylon.js 9.26.0、PlayCanvas 2.22.1 和所有运行资源均随项目提供，运行时不请求外部 CDN。

键盘：A/D 或左右方向键转向，S / 下方向键刹车，空格使用氮气，C 切换视角，R 重开，Esc 暂停，M 切换声音。自动油门默认开启；刹车时油门关闭。触屏设备显示方向、刹车和氮气按钮。切到其他页面会暂停。

## Unity 构建

1. 安装 [Unity Hub](https://unity.com/download)，准备足够的编辑器、Web 模块与构建缓存空间。
2. 登录 Hub 并激活可用许可证。免费 Personal 的申请条件及条款由用户自行确认；参见 [Unity 许可证管理](https://docs.unity.com/en-us/hub/manage-license)。
3. 安装 Unity 6.0；工程记录版本是 **6000.0.73f1**，安装时包含 **Web Build Support**。
4. 通过 Hub 打开本目录的 `unity` 文件夹。菜单 **Coast Rush → Prepare scene** 可创建场景并在 Editor 里按 Play；**Coast Rush → Build WebGL** 可编译。

也可在本目录用命令行构建：

```sh
zsh tools/build_unity.sh
```

非默认安装位置可指定：

```sh
UNITY_EDITOR='/完整路径/Unity.app/Contents/MacOS/Unity' zsh tools/build_unity.sh
```

成功后输出到 `unity-webgl/`。校验脚本必须发现真实的 `loader.js`、`framework.js`、`.data`、`.wasm`（含压缩后缀）及构建成功状态，才报告成功；对比页面随后启用 Unity 试玩。当前该目录只有明确的 `not-built` 状态文件。

Unity 使用内置渲染管线的 Standard PBR，C# 负责模拟、资源加载、场景和镜头；浏览器脚本只处理 HUD、输入传递和声音。WebGL 页面采用和 Babylon 相同的 HTML / CSS 界面。工程还提供 Editor 内的简易操作界面。所有 Unity 代码、Shader、桥接和构建 API 仍需用实际编辑器编译与浏览器运行来验证。

## 比较条件和已有证据

三版读取同源的模型、沥青及法线、草地、岩石、天空贴图和 1,669 个环境物体的放置数据，固定种子为 731。Babylon 与 PlayCanvas 直接共用道路曲线、交通生成、车辆规则和更新顺序；Unity 端对应 C# 移植仍待执行一致性检查，模拟步长为 1/120 秒。原车辆模型来自此项目已有的 Blender 作品；画面仍是原创几何模型风格，并非复刻 MR RACER 的商业素材。

三种渲染管线并非像素一致：Babylon 的 PBR 清漆、环境滤波、级联阴影、FXAA 和默认泛光，PlayCanvas 的 Standard PBR、环境光照图集、2× MSAA 和 CameraFrame 泛光，以及 Unity 的 Standard 材质、反射立方体、阴影、MSAA 和自定义后处理有差别。该实验用于比较各自的可玩体验和实现成本，不用于宣称某引擎天然更好。

已保存的完整运行记录位于 `verification/babylon-benchmark.json` 和 `verification/playcanvas-benchmark.json`，相同模拟最终状态的比较结果位于 `verification/comparison.json`：

| 项目 | Babylon.js 9.26.0 | PlayCanvas 2.22.1 | Unity WebGL |
| --- | --- | --- | --- |
| 可玩状态 | 已验证 | 已验证 | 未编译，未实测 |
| 平均帧率 | 56.70 FPS | 55.26 FPS | — |
| 第 95 百分位帧耗时 | 21.0 ms | 24.0 ms | — |
| 页面打开至场景可用 | 1.62 秒 | 2.99 秒 | — |
| 引擎脚本体积，未压缩 | 8.33 MB | 2.47 MB | 待构建 |
| 完成距离 | 4603.93 m | 4603.93 m | — |
| 超车 / 车况 | 52 / 100 | 52 / 100 | — |

两次运行均使用本机 Codex 内置浏览器（Chrome 152）、WebGL 2、1280 × 720、高画质、座舱视角、90 秒模拟时间，统计排除前 3 秒。记录时间分别为 `2026-09-11T04:55:47.565Z` 和 `2026-09-11T04:53:05.661Z`。运行中未捕获 error / warn。

这是各一次顺序前台测试；工作站后台负载未隔离，显示刷新率也会影响上限。加载采用新的统一口径：从浏览器导航开始，包含引擎脚本读取和解析、资源准备、初始渲染；本地 HTTP 缓存未清除，**不是公网冷启动**。此前 1.11 秒的 Babylon 记录只计入模块开始后的场景准备，不能与新记录直接比较。引擎文件体积只指本次随项目提供的发行脚本，不含共用资源，也未进行按需裁剪；更小的脚本不保证更快的场景初始化。

本轮中 Babylon 的平均帧率略高、尾部帧耗时较低、场景启动较快；PlayCanvas 的发行脚本约小 70.4%。材质、光照滤波、阴影算法和抗锯齿设置存在差异（FXAA 与 2× MSAA），不能据此做引擎整体排名。

测试包含 10 项自动检查：固定种子复现、转向和回正惯性、氮气平顺退出、刹车优先、碰撞保护、擦车计分、结束锁定、重开复位、三档难度状态边界、模型索引完整性。浏览器另验证了启动、实际键盘转向、R 重开、Esc 暂停、C 视角切换和完整挑战结算；PlayCanvas 还检查了极限难度和流畅画质（853 × 480）确实生效。

自动对比必须逐个运行、保持前台、使用相同窗口大小和画质；不要同时打开两版跑分。数据保存在此站点的浏览器本地存储，对比页可导出 JSON。实际 WebGL 完成后，Unity 需要执行相同流程，再补上结论。当前结果只代表本机每引擎一次原型测试，不代表所有设备。相机、画质、窗口尺寸、暂停或前后台状态变化会使该轮跑分失效；有效记录才会覆盖本地保存值。

运行 `npm run compare` 可校验保存记录的条件和完整模拟结果；该检查不会模拟或伪造浏览器性能。

## 选型观察

- **Babylon**：沿用现有代码驱动的场景，开发链路短。当前曝光和环境反射配置整体偏深。
- **PlayCanvas**：这次独立引擎实现已经能复用全部玩法；原型画面较明亮。脚本发行文件更小，但本例运行时还要生成环境光照图集，初始化成本需以实测为准。官方另提供浏览器中的场景编辑、实时协作与资源工作流；本次未接入这些 Editor 功能。[PlayCanvas 独立引擎](https://developer.playcanvas.com/user-manual/engine/standalone/)、[Editor 官方说明](https://developer.playcanvas.com/user-manual/editor/)
- **Unity**：已有 Unity 资产、团队经验或多平台计划时值得评估；本机尚不具备完整构建环境，此时不能判断它的帧率、加载与视觉优劣。[Unity Web 开发流程](https://docs.unity3d.com/6000.0/Documentation/Manual/webgl-gettingstarted.html)

对于继续做这个网页原型，两套浏览器引擎都已可用。优先完善车辆与环境美术、交通挑战和长期目标，再根据页面体积、实际帧耗时以及团队编辑方式选择。亮暗差异来自当前材质、环境滤波与曝光配置，不能当作某引擎画质上限的证据。

## 开发文件

- `shared/game.js`：两个浏览器版本的输入、HUD、音效驱动、定时循环与跑分。
- `shared/simulation.js` 与 `unity/Assets/Scripts/RacerSimulation.cs`：浏览器共用模拟与 Unity 的 C# 移植。
- `shared/rules.json`、`models.json`、`world.json`、`textures/`：相同输入数据。
- `babylon/renderer.js`、`game.js`：Babylon 渲染器与共用界面入口。
- `playcanvas/renderer.js`、`game.js`：PlayCanvas 原生 Entity / Mesh / StandardMaterial / CameraFrame 实现。
- `unity/Assets/Scripts/`：Unity 场景、模拟、Shader、WebGL 桥接。
- `unity/Assets/Editor/RacerBuild.cs`：资源导入配置、场景和构建。
- `tools/build_assets.py`：Blender 批处理生成贴图，提取并按材质合并既有模型。
- `tools/build_world.mjs`：生成原创树木、岩石和确定性环境布局。
- `tools/prepare_unity_template.py`：同步两版网页界面。

Unity 构建前还会运行 C# / JavaScript 模拟一致性检查：三档难度共 30 个时间点。预期数据已经生成，但该原生 C# 检查目前尚未执行。

修改资源后：

```sh
node tools/build_world.mjs
'/Applications/Blender.app/Contents/MacOS/Blender' --background --factory-startup --python tools/build_assets.py
python3 tools/prepare_unity_template.py
node tools/build_conformance.mjs
npm test
```

使用的 Babylon.js 按 Apache-2.0 授权，原始许可证位于 `babylon/vendor/LICENSE.md`；PlayCanvas 按 MIT 授权，原始许可证位于 `playcanvas/vendor/LICENSE`。固定版本脚本大小和 SHA-256 记录于 `verification/package-sizes.json`。未使用 MR RACER / Poki 的模型、贴图、音频或代码。
