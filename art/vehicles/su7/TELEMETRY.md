# SU7 动态赛车仪表

当前提供独立的仪表组件与本地预览演示。两个屏幕都是模型内部的 UV 显示面，有各自的材质和静态停驻纹理。预览加载后使用 Canvas 动态纹理替换，数字不是固定几何，也不是悬浮在网页上的假仪表。

本组件未接入主线游戏、车辆物理、计圈系统或实车数据。演示为合成输入；界面为本项目原创赛车 UI，并非小米车机界面复刻。

## 在当前预览中调用

等待 `window.__su7.ready === true` 后调用：

```js
window.__su7.setTelemetry({
  speedKph: 188.4,
  motorRpm: 16579,
  gear: 'D',
  powerKw: 280,
  batteryPct: 82,
  throttle: 0.78,
  brake: 0,
  lap: 3,
  lapTimeMs: 72911,
  deltaMs: -420,
  abs: false,
  tc: true,
});
```

传入部分字段会保留其余字段。外部更新会自动停止演示，避免模拟输入覆盖游戏数据。非法数值、未知字段和非法挡位会被忽略，超出范围的有效数值会被限制到范围内。

| 字段 | 单位 / 范围 | 含义 |
| --- | --- | --- |
| `speedKph` | km/h，0–400 | 车速大小；速度向量先转换为 km/h |
| `motorRpm` | rpm，0–30,000 | 电机转速，由调用者提供 |
| `gear` | `P` / `R` / `N` / `D` | 行驶状态，不模拟燃油车多挡变速箱 |
| `powerKw` | kW，−300–600 | 正值驱动、负值能量回收 |
| `batteryPct` | 0–100 | 电量百分比 |
| `throttle` / `brake` | 0–1 | 归一化踏板输入 |
| `lap` | 1–999 整数 | 当前圈数 |
| `lapTimeMs` | 毫秒，0–86,400,000 | 当前圈时间，由计圈系统维护 |
| `deltaMs` | 毫秒，−600,000–600,000 | 相对比较圈的时间差，负值更快 |
| `abs` / `tc` | 布尔值 | 对应系统是否正在介入 |

这些上限是显示组件的输入约束，不代表实车性能参数。倒车时传正的车速大小和 `gear: 'R'`。

## 接入其他 Babylon.js 场景

加载 `telemetry.js` 和该 GLB 后：

```js
const instruments = SU7Telemetry.create(scene, BABYLON);
instruments.attach(carAssetContainer);

// 游戏原有帧循环内；车辆物理、计圈和网络同步仍由游戏负责。
instruments.setTelemetry({
  speedKph: Math.abs(vehicle.speedMetersPerSecond) * 3.6,
  motorRpm: vehicle.motorRpm,
  gear: vehicle.driveState,
  powerKw: vehicle.powerKw,
  lapTimeMs: race.currentLapMs,
});
instruments.tick(deltaSeconds);

// 切换精度之前解绑旧模型；同一个组件继续绑定新模型。
instruments.detach();
oldContainer.dispose();
instruments.attach(newContainer);

// 退出场景时释放两个动态纹理与材质。
instruments.dispose();
```

先创建组件，再在每帧提供数据并调用 `tick`。显示刷新上限为 20 Hz，仅在可见数值变化时上传纹理；车速与转速平滑显示，圈速采用调用者给出的时间，不自行累加。每个显示组件使用两张动态纹理，切换高低精度模型不重新创建纹理。

`setDemo(true)` 启动合成演示；`setDemo(false)` 暂停并保留最后一帧输入；`reset()` 回到停驻；`getState()` 返回输入状态副本，`getDisplayed()` 返回平滑后的显示状态副本。`dispose()` 可重复调用。

## 模型约定

| 显示面 | 独立几何节点 | 材质名 | 动态纹理 |
| --- | --- | --- | --- |
| 驾驶仪表 | `geometry:display-cluster` | `40 Instrument dynamic display` | 1024 × 320 |
| 中控屏 | `geometry:display-center` | `41 Center dynamic display` | 1280 × 720 |

约定也保存在 `manifest.json` 的 `dynamicDisplays`。每个显示面都有完整的 0–1 UV。GLB 内置两张自行绘制的停驻 PNG，不需要参考照片。Blender 中可直接编辑屏幕位置和 UV；其他引擎按相同材质或节点约定替换纹理即可。

`python3 art/vehicles/su7/bake_displays.py` 从同一绘图代码重新生成停驻纹理；随后重建模型才能把新纹理嵌入 GLB / Blender。

实现参考：[Babylon.js DynamicTexture 文档](https://doc.babylonjs.com/features/featuresDeepDive/materials/using/dynamicTexture)。
