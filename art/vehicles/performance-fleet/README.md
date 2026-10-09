# Performance Fleet / 港湾性能车资源

已整理六款免费、允许署名使用和改编的艺术家模型，并实现独立预览、Blender 工程、两档 GLB、转向与动态赛车显示。资源是开放许可网格，不是奔驰、宝马等厂家公开的 CAD，也不等同于工程级实车复原。

打开 [交互预览](preview.html)。在项目根目录启动 HTTP 服务后访问 `/art/vehicles/performance-fleet/preview.html`；不要用 `file://` 打开。

| 用户范围 | 本次实现 | 网格许可 | 当前细节 / 局限 |
| --- | --- | --- | --- |
| 奔驰 AMG | Mercedes-AMG GT | CC BY 4.0 | 灯组、轮毂、外形与简化座舱；保留原作造型，调整内饰材质并添加赛车屏 |
| 宝马 M | BMW M4 2015 / F82 | CC BY 4.0 | 外观与座舱；清理原始重叠正反面并整理法线；内饰是游戏展示精度 |
| 保时捷 911 | 911 Carrera 4S | CC BY-SA 4.0 | 外观细节较多；原作没有完整可用座舱，关闭驾驶舱/赛车屏视角 |
| 布加迪 | Veyron | CC BY 4.0 | 保留原作双色顶点颜色；外观展示模型，无完整可用座舱 |
| 兰博基尼 | Centenario LP 770 | CC BY 4.0 | 碳纤维车身、黄色饰条、座舱；作者明确说明内饰与实车有差异 |
| 法拉利 | Ferrari 458 | CC BY 4.0 | 采用 Three.js 示例整理的模型；原始标题是 Italia，但实际网格为开顶展示状态 |

作者、原始页面、镜像来源、许可与改编记录见 [CREDITS.md](CREDITS.md)。选择具体代表车型的依据是可用的免费资源及其许可，并非已经覆盖各品牌全系。

## 已实现

- 六车切换，前/侧/后视角，四款座舱及赛车屏视角。
- 每款一个可编辑 `.blend`，纹理打包；两档 `.high.glb` / `.low.glb` 和 `manifest.json`。
- 四轮独立旋转，前轮阿克曼转向；可辨识卡钳与轮胎分开挂接。
- 已有座舱的四款各一块原创赛车显示面，运行时动态纹理显示速度、发动机转速、挡位、功率、燃油、圈速、圈时差、油门/刹车与 ABS/TC 状态。
- 911/Veyron 仍接收统一数据并驱动车轮，但不虚构原作不存在的座舱。
- GLB 导出含作者、来源与许可元数据。车型切换、LOD 切换会释放旧运行时材质/纹理，保留遥测数据。

最终检查：239 项 GLB/来源/层级检查及 130 项实际浏览器检查通过。分别见 `verification.json`、`browser-verification.json`；Blender 工程重新打开与打包纹理检查见各车型的 `blender-verification.json`。

## 接入与验证

运行接口见 [TELEMETRY.md](TELEMETRY.md)。交互预览用项目现有 Babylon.js 本地依赖，无额外 CDN。

`python3 art/vehicles/performance-fleet/verify_assets.py` 检查二进制完整性、来源哈希、许可、纹理、索引、法线、轮组层级及两档面数。结果写入 `verification.json`。浏览器开发检查在 `browser_checks.js`，仅供本地 DevTools 运行，不随预览自动执行。

`build_assets.py` 从 `models/<id>/source/normalized.blend` 重建资产；`inspect_sources.py` 从保留的来源 GLB 生成归一化工程；`render_assets.py` 重新打开交付的 Blender 工程生成验证图。所有 Blender 脚本均以 `--disable-autoexec` 打开下载数据。

显示尺度按车长统一为米，用于游戏展示；没有逐件扫描标定。控制演示使用合成数据，不代表实车动力、变速箱、赛道或品牌官方 UI。高精度模型也保留了原作者网格的细节上限。

本目录是独立车辆资源交付；没有将六车接入主线游戏的车辆选择、驾驶物理或公网发布流程。
