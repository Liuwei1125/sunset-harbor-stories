# Tesla 系列模型来源与许可

本目录为港湾项目的独立车辆素材。仅使用已核对为 CC BY 4.0 的第三方网格，以及本项目自建几何。未使用付费、仅限非商业、禁止修改或从游戏提取的模型。下载日期：2026-09-18。下列许可适用于模型作者的作品；车型名称、商标与产品外形不因此获得官方授权，本项目无官方背书。

使用或发布这些改编资产时，请保留对应作者、作品链接、CC BY 4.0 链接及修改说明。发布页面可直接沿用预览中的署名入口。

## Model Y — 2021 初代造型

This work is based on **“Tesla Model Y 2021”** by **763468712**, licensed under **CC BY 4.0**.

- 原作：https://sketchfab.com/3d-models/tesla-model-y-2021-c0a86cac582d4b33aba0fb1b1912d970
- 作者：https://sketchfab.com/763468712
- 许可：https://creativecommons.org/licenses/by/4.0/
- 使用公开整理副本：Tina2088/tina-3d-tesla，提交 `5f81eea9d6ed050389958b6aad82be8e589adcc9`，`public/models/model-y.glb`。
- Tina 3D Tesla 的既有修改：归一化、连接网格分离、减面、演示材质。这些网格片段不是经核实的汽车维修零件。
- 港湾修改：统一米制坐标、平滑和材质、前后灯修正、轮组与方向盘关节、独立显示平面和原创赛车 UI、高低精度 GLB、Blender 展示场景。保留原作主要座舱几何。

## Roadster — 第二代概念车

This work is based on **“Tesla Roadster 2020”** by **metarex.4d**, licensed under **CC BY 4.0**.

- 原作：https://sketchfab.com/3d-models/tesla-roadster-2020-1fbf29e297bd4a17ac39a00a378441d8
- 作者：https://sketchfab.com/metarex.4d
- 许可：https://creativecommons.org/licenses/by/4.0/
- 使用公开副本：gwesseling/Tesla-app，提交 `a03a55533adcf0f45a610b7bc4e1a9e03277c13c`，`assets/test4.glb`；该仓库 README 署名 metarex4d。保存的原作 API 记录确认该作品 CC BY。
- 港湾修改：近似米制缩放、材质与平滑、原方向盘独立绑定、轮组关节、中控台局部退让、原创可更新显示平面、两档 GLB 与 Blender 场景。
- “2020”是作者作品名称，不表示已验证的量产年款。本目录未使用另一个限制非商业的 `roadster_interior` 资源。

## Cybertruck — 2019 概念造型

This work is based on **“Tesla Cybertruck”** by **PolyDucky** (original profile `salphytheunemployed`, currently **A Certain Duck / TheOminousDuck**), licensed under **CC BY 4.0**.

- 原作：https://sketchfab.com/3d-models/tesla-cybertruck-1ab0c3f248fa47019c4311abce9731a0
- 原作者链接：https://sketchfab.com/salphytheunemployed
- 当前作者链接：https://sketchfab.com/TheOminousDuck
- 许可：https://creativecommons.org/licenses/by/4.0/
- 使用公开副本：MigrantCaravan/Tesla-CyberTruck-Model3-Paint-Selector，提交 `6616e4a5eb5b6944f13e4b4ebcfc3d9ec9cc74ed`，`public/tesla_cybertruck/scene.gltf` 及其依赖。
- 港湾修改：归一化坐标、分离前后轴上的左右车轮、轮组和方向盘关节、材质、补建门板/座椅/仪表台/方向盘/中控屏、原创赛车 UI 与两档 GLB。
- 作者原作明确是快速制作的近似外形；本模型不是现款量产 Cybertruck 的精准复原，新增内饰也是视觉近似。

## Model S — 2016 风格自建研究版

几何由本项目 `author_model_s.py` 与 `build_fleet.py` 自建，无第三方网格。参考 Tesla 2012–2020 Model S 官方手册的总体尺寸：
https://www.tesla.com/ownersmanual/2012_2020_models/en_us/GUID-5FB8FC1E-0B1D-4ECC-99D6-4EEE2B8FB725.html

这是一款可编辑的外形研究模型，不是官方 CAD、扫描件或下载的精细模型。曲面、灯组、内饰存在明显近似，其精细度低于 Model Y / Roadster。备用精细资源需用户登录下载，目前未纳入交付文件。

## 共用新增内容

- 赛车屏幕、遥测接口、预览页及新增座舱部件：本项目原创。
- Babylon.js 及 HDR 沿用工程已有文件，其原有许可保持不变。
- 每辆车的 `source/provenance.json` 记录来源、固定提交、原作者许可证据和下载文件 SHA-256；`source/upstream-license.txt` 保留可用的上游署名。
- 全部 Blender 文件已打包使用的贴图和环境图，导出 GLB 内嵌显示贴图，不依赖远程模型资源。
