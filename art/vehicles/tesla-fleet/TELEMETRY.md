# 动态屏幕与车辆接口

这四款车共用 `vehicle.js` / `telemetry.js`。显示的是港湾原创赛车 UI，而不是 Tesla 原厂车机；演示速度/功率曲线为合成数据。预览没有接入主游戏物理系统。

## 接入

载入工程本地 Babylon.js、glTF 加载器，然后载入 `telemetry.js`、`vehicle.js`。场景使用 `scene.useRightHandedSystem = true`，模型单位米，Y 向上、-Z 为车头。

```js
const car = FleetVehicle.create(scene, BABYLON, './art/vehicles/tesla-fleet/models/');
await car.load('model-y', 'high'); // model-y | model-s | roadster | cybertruck
car.setTelemetry({
  speedKph: 128, motorRpm: 10500, gear: 'D', powerKw: 220,
  batteryPct: 83, lap: 2, lapTimeMs: 73420, deltaMs: -180,
  throttle: 0.65, brake: 0, abs: false, tc: false
});
car.setSteering(12); // degrees, clamped to -30..30
// Call once per render frame, with seconds since the last frame:
car.tick(deltaSeconds);
// Removing the vehicle:
car.dispose();
```

显示输入为局部更新，未传字段保留旧值。无效数字（NaN、Infinity、字符串）被忽略，有限数字限制到下面范围。`setTelemetry` 自动退出演示模式。

| 字段 | 单位 / 可用范围 |
|---|---|
| speedKph | km/h，0–400 |
| motorRpm | rpm，0–30000 |
| gear | P / R / N / D |
| powerKw | kW，-400–1000；负值显示 REGEN |
| batteryPct | 0–100 |
| lap | 整数 1–999 |
| lapTimeMs | ms，0–86400000 |
| deltaMs | ms，-600000–600000 |
| throttle / brake | 0–1 |
| abs / tc | boolean |

## 运行行为

- `car.load(id, 'high' | 'low')`：异步替换车型。最后一次请求生效，未接纳的加载返回 `false`；失败抛出错误并保留已加载模型。
- 遥测状态在切换车型和 LOD 时保留。同车型切换 LOD 保留车漆；不同车型恢复对应默认车漆。
- `car.setPaint('#A82128')`、`car.setInterior(true)`、`car.setWheelDemo(true)` 控制外观或独立轮组展示。
- 前轮转向与车轮滚动分属两个关节，前轮角度做近似 Ackermann 展示；卡钳跟随转向、不跟随车轮自转。这里不是完整车辆物理模拟。
- 每辆车一个显示面、一个动态纹理，约 20 Hz 按变化更新；车速和电机转速平滑显示。Model Y / Cybertruck 横屏，Model S / Roadster 竖屏。
- `car.telemetry.setDemo(true)` 开始一轮合成驾驶演示；`setDemo(false)` 暂停，`reset()` 回到停驻。
- `car.telemetry.getState()`、`stats()` 和 `car.info()` 可用于调试。
- 只单独加载 GLB 时显示内嵌静态 READY 贴图；调用运行时后才有动态 UI。Blender 内的屏幕也是静态贴图。
- 摄像机和车轮参数可在各车型 `manifest.json` 中读取；运行时显示只替换名为 `display:front` 的材质，不重建整个模型。
