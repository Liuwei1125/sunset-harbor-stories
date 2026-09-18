# 港湾赛道俱乐部

入口 `/club/circuit/`，从原俱乐部的“赛道驾驶”进入。电脑优先，支持键盘及标准映射手柄。

## 玩法

- 试车场：直线加速／制动测量、40 米定圆、蛇形桩、路肩与碰撞区域。
- 自由练圈：有效圈、三段时间、相同配置个人最佳幽灵、出弯速度对比、薄弱分段重试。
- 同车短赛：玩家与三名 AI，港湾 4 圈／海岸 3 圈，约 6–8 分钟。最终用时包括罚时。
- 三站锦标赛：三个有效圈解锁，港湾 → 海岸 → 港湾，12/9/7/5 分，未完赛 0 分；自动保存站间进度。
- M4、458、SU7：后驱／四驱、质量、扭矩、转速、换挡与回收不同。均衡／稳定／灵活调校有取舍，熟练度只解锁赛事与涂装。

WASD 或方向键驾驶；C 切视角；Esc 暂停；R 重开；F 返回赛道并罚 5 秒；Q + 油门倒车。手柄左摇杆、RT、LT，Y 切视角，X 返回赛道，Start 暂停。车库支持方向键选车／赛事、LB/RB 换赛道、A 开始。

## 实现边界

所有位姿来自同一 Rapier 刚体世界：简化车身碰撞体、四轮射线弹簧与阻尼、接地点轮胎力和合并抓地预算。ABS 减少过量制动，TC 减少驱动轮过量牵引；这不是工程级轮胎模型。轮速由接地速度、驱动滑移及抱死状态生成，既有展厅的演示轮速不参与驾驶。渲染只插值 120 Hz 物理快照。

AI 使用同一配置与驾驶输入；反应时间影响交通决策，目标路线精度、过弯余量和失误改变难度，不修改质量、马力或抓地。冲线后车身不再与参赛车碰撞。碰撞规则按冲击计罚，不进行真实赛车责任裁定。赛道是原创虚构场地。

计时键包含车型、赛道和物理版本、调校、ABS/TC/回收。新存档键 `sunset-harbor-circuit-v1`，不迁移或覆盖原俱乐部／主线键。分段从静止起步，其时间明确区别于飞驰完整圈中的分段，不能替代整圈纪录。

仅按当前比赛车型加载：玩家高档 GLB，对手低档 GLB；轻量设置让玩家也使用低档。原始资源位于 `art/vehicles/`，从未改写。`tools/build_assets.py` 在 Blender 中派生运行 LOD，保留关节、材质与署名，输出来源哈希和运行哈希。普通构建／发布不依赖原始模型。

## 本地验证

项目根目录启动 HTTP 服务后访问 `/club/circuit/`。

```sh
node --test club/circuit/tools/physics.test.mjs
python3 club/circuit/tools/verify_browser.py
python3 club/circuit/tools/verify_events.py
python3 club/circuit/tools/benchmark.py
python3 club/circuit/tools/benchmark_variants.py
npm run site:prepare
npm run site:verify
```

性能脚本使用正常 RAF 完成一场比赛；手柄输入经标准 Gamepad API 仿真，不代表已测试实体手柄。键盘全赛用合成按键状态，另测 Chromium 原生按键、暂停与相机。连续十圈是控制器脚本的学习数据完整性验收，不是人类学习效果实验。报告在 `verification/`，不进入公开包。

框架与汽车来源见公开 `CREDITS.html`。统一沿用根 `.openai/hosting.json` 的 Harbor Site；`research/web-game-engines` 不参加构建。
