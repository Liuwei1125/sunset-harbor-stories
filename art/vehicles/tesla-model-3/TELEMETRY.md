# Model 3 动态座舱接入

前屏为 1536×960，后屏为 1024×600。两张 Babylon DynamicTexture 复用到对应显示面，最高约每秒 20 次提交变化；车速和电机转速经过显示平滑，圈速保持调用方传入值。

## Babylon 场景示例

在 Babylon 和 glTF 加载器之后加载 `telemetry.js`、`vehicle.js`，并使用右手坐标场景：

```js
scene.useRightHandedSystem = true;
const car = Model3Vehicle.create(
  scene,
  BABYLON,
  '/art/vehicles/tesla-model-3/'
);
await car.load('high'); // 或 'low'

car.setTelemetry({
  speedKph: 126.5,
  motorRpm: 10400,
  gear: 'D',
  powerKw: 185,
  batteryPct: 73,
  throttle: 0.7,
  brake: 0,
  lap: 3,
  lapTimeMs: 72911,
  deltaMs: -420,
  abs: false,
  tc: false
});
car.setSteering(12); // 虚拟前轮中心转角，度；不是方向盘转角

engine.runRenderLoop(() => {
  car.tick(engine.getDeltaTime() / 1000); // 秒；每帧调用一次
  scene.render();
});

// 卸载车辆时执行；可重复调用。
// car.dispose();
```

游戏中应每帧或在遥测数据更新时调用 `car.setTelemetry()`，由自己的物理系统提供数据。不要同时额外调用 `car.telemetry.tick()`，否则会重复推进显示和演示时间。

## 输入字段

| 字段 | 单位 / 范围 | 行为 |
| --- | --- | --- |
| `speedKph` | km/h，0–400 | 速度大小；倒车由 `gear` 表示 |
| `motorRpm` | rpm，0–30,000 | 电机转速显示 |
| `gear` | `P` / `R` / `N` / `D` | P 停止轮组，R 反向滚动，N 可滑行 |
| `powerKw` | kW，−400–1,000 | 负数显示能量回收 |
| `batteryPct` | %，0–100 | 剩余电量 |
| `throttle` / `brake` | 0–1 | 踏板条 |
| `lap` | 整数，1–999 | 圈数 |
| `lapTimeMs` | ms，0–86,400,000 | 当前圈用时，由调用方维护 |
| `deltaMs` | ms，−600,000–600,000 | 比较圈差，负值为更快 |
| `abs` / `tc` | 布尔值 | 辅助状态指示 |

范围用于保护渲染输入，不表示实车性能。每次调用为局部更新，未传字段保持原值；非有限数和无效挡位被忽略，超界有效数值被截断。`setTelemetry()` 会退出合成演示。

## 外观、演示与生命周期

```js
car.setPaint('#94252C');
car.setInterior('#32383F');
car.setSteering(-8);            // 限制到 ±30°
car.setWheelDemo(true);         // 固定轮速检查；会覆盖遥测轮速
car.setWheelDemo(false);
car.telemetry.setDemo(true);    // 合成 30 秒循环，非实车数据
car.telemetry.setDemo(false);   // 暂停演示数据和对应轮速
car.telemetry.reset();          // 回到 P 挡、0 km/h；不重置转向
await car.load('low');          // 保留数据和外观，复用两张动态纹理
const state = car.telemetry.getState();
const info = car.info();
car.dispose();
```

`load()` 成功返回 `true`；被更新的加载请求取代时返回 `false`，失败则抛错。销毁车辆后不能再次加载。场景调用方负责相机、灯光、渲染循环和场景销毁。

转向采用近似 Ackermann 内外轮角，方向盘按 12 倍视觉转角跟随；轮速按约 0.3451 米轮胎半径换算。这些用于视觉联动，不构成车辆动力学。时间步长最多接受 0.1 秒，以减少页面挂起后的跳变。

## 在现有预览中验证外部数据

打开预览后，可以在开发者控制台执行：

```js
window.__model3.setTelemetry({
  speedKph: 188.4,
  gear: 'D',
  powerKw: -95,
  lap: 3,
  lapTimeMs: 72911,
  deltaMs: -420,
  brake: 0.5,
  abs: true
});
```

前后屏幕会同时更新。GLB 在未接入 JavaScript 的查看器或 Blender 中显示的是打包的静态赛车画面。
