# 动态赛车数据接口

加载 `telemetry.js`、`vehicle.js` 和项目内 Babylon.js/GLTF loader 后：

```js
const car = PerformanceVehicle.create(scene, BABYLON, './models/');
await car.load('ferrari-458', 'high');
car.setTelemetry({
  speedKph: 123,
  engineRpm: 5500,
  gear: '4',
  powerKw: 175,
  fuelPct: 66,
  lap: 3,
  lapTimeMs: 54321,
  deltaMs: -210,
  throttle: .7,
  brake: 0,
  abs: false,
  tc: false
});
car.setSteering(12); // -30..30 degrees, positive turns left
scene.onBeforeRenderObservable.add(() => car.tick(engine.getDeltaTime() / 1000));
// On scene teardown:
// car.dispose();
```

| 字段 | 单位 / 有效范围 |
| --- | --- |
| speedKph | km/h，0–400 |
| engineRpm | rpm，0–12000 |
| gear | P/R/N/D 或 1–8（字符串或数字输入） |
| powerKw | kW，-400–1000；数据透传，负值不标记为电车能量回收 |
| fuelPct | %，0–100 |
| lap | 1–999，取整 |
| lapTimeMs | 毫秒，0–86400000 |
| deltaMs | 毫秒，-600000–600000 |
| throttle / brake | 0–1 |
| abs / tc | boolean |

非有限数值忽略，越界数值限幅；未传字段保持原值。`setTelemetry` 会停用合成演示。`telemetry.setDemo(true/false)` 启停演示；`reset()` 回到停驻状态。20Hz 动态纹理更新，速度和转速显示平滑，不更改输入原值。

坐标为 glTF 右手系：米、Y 向上、-Z 车头。转向节点 `joint:steer-front-left/right` 绕 Y 转，四轮 `joint:wheel-*` 绕 X 转；卡钳挂在转向节点，不跟轮胎自转。轮胎转速按当前资源尺寸估算，不是车辆物理仿真。

有座舱车型（AMG GT、M4、Centenario、458）绑定 `display:front` 单独材质。911、Veyron 的 `manifest.display.enabled=false`，保持遥测接口可用，创建 0 张仪表纹理。所有显示是本项目原创赛车 UI，并非品牌车机复刻。

换色 `setPaint('#A82128')`、轮组独立演示 `setWheelDemo(true)`；Veyron 保留原始顶点双色，`setPaint` 返回 false。`load(id,'low')` 切换轻量模型。异步加载只接受最后一次请求，丢弃过期结果并释放资源。
