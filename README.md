# HARBOR STORIES / Sunset Frontiers VI

An original, offline, single-player, land/sea/air action prototype with a connected harbor campaign, three maps, twelve vehicles, eight weapons and standalone challenges. The 6.3.1 Harbor Radiance update brings environment lighting, contact occlusion, detailed shadows, water reflections and AgX to the whole game. The existing 22 Blender weapon, vehicle and prop assets use the new pipeline. No Rockstar game content is included.

## Harbor Club 6.4.0 / 独立休闲模式

[进入休闲俱乐部](arcade.html) — 赛车竞技、射击训练、飞镖、射箭，各有 **6 个关卡 × 3 档难度**。赛车使用完整驾驶舱，其他项目显示第一人称装备；休闲模式不创建人物角色。三种车辆调校、三种训练枪械、每日固定挑战、无限练习、奖牌、个人纪录、赛车幽灵与四套可解锁外观支持反复挑战。主线首页与工具栏也有独立入口。

新增 10 个 Blender 模型：驾驶舱、反曲弓、箭、飞镖、飞镖盘、射箭靶、机械靶、赛道门架、树木与草丛。继续使用两版可切换光影（6.2 / 6.3.1）、现有精细车辆和武器。两种游戏分别运行、分别存档；每个 HTML 都能离线独立启动。详见 [关卡、操作、规则和编辑说明](ARCADE_ZH.md)、[模型总览](previews/blender-arcade.png) 和 [验证报告](verification/RESULTS.md)。这是原创单人休闲竞技玩法，没有外部游戏的资源或联网排名。

```sh
python3 build.py
node --check arcade-bundle.js
python3 tools/verify_arcade.py
python3 tools/verify_arcade_input.py
python3 tools/benchmark_arcade.py
```

All eight handheld weapons now use authored meshes. Muzzle sockets and hand poses share one transform; guns have separate moving magazines, bolts, slides or pump parts, differentiated recoil and synthesized audio. The shotgun loads individual shells and loses damage with distance. Metal, wood, masonry and water produce different impacts. Explosions, smoke trails, fire and fading marks use bounded local geometry. See [the weapon update and editing guide](ARMORY_ZH.md), [weapon overview](previews/blender-armory.png), and `art/harbor-armory.blend`. Rebuild with `python3 tools/build_blender_assets.py --armory --render`; use `--armory --export-only` after manual Blender edits.

The Comet sports car, Trail jeep, Osprey helicopter and Stingray speedboat now use authored meshes with moving wheels, a hinged entry door and separate rotors. The harbor uses matching freight containers, wooden crates, pallets, drums, bollards, lamps, a relay terminal, cargo case, concrete barriers and a **stationary** forklift. Blender material roughness/metalness reaches the WebGL shader directly. Near/far meshes, reduced shadow meshes and instancing control rendering cost; the CPU compatibility renderer uses the low LODs.

See [the project analysis and model guide](ART_DIRECTION_ZH.md), [Blender model overview](previews/blender-workshop.png), and [in-game harbor screenshot](previews/workshop-quay.png). Editable source: `art/harbor-workshop.blend`; individual portable GLBs: `assets/blender/`. These are actual runtime geometry, compiled from the Blender source into the single HTML file.

## Global graphics upgrade

6.3.2 adds a saved, live **6.2 / 6.3.1** effect selector in Settings. The classic effect retains the original renderer and quality parameters; the natural effect retains the 6.3.1 calibration: less sky whitening, brighter warm surfaces, blue-green water and more neutral shadow fill. Its exposure setting is preserved while using classic mode. The screenshot comparison uses 6.3 and 6.3.1 at the same exposure.

The new renderer applies to all three maps. High quality enables filtered HDR environment lighting, two shadow cascades, SSAO, screen-space water reflections, local combat lights, HDR Bloom and FXAA. Medium/low tiers reduce the cost; devices without optional extensions retain a compatible GPU path, and the CPU renderer remains available. Settings include a classic-view switch and saved exposure control.

See [six matching before/after scenes](graphics.html), [the implementation and limits](GRAPHICS_ZH.md), and [the current water scene](previews/graphics-after-boat.png). This improves real-time lighting; it is not Cycles-quality path tracing. Existing simplified character/building shapes and missing full material textures remain visible.

## Play

**AR-7 model showroom:** serve this folder locally and open `http://127.0.0.1:8000/showroom.html` for interactive rotation, zoom, three lighting presets, exposure / tone mapping controls, and fixed-camera Blender versus game references. All viewer dependencies are vendored locally. Unlike the single-file game, the showroom requires HTTP rather than a direct file URL. See [the showroom guide](SHOWROOM_ZH.md).

Open `index.html` in a desktop browser. No package install, CDN, account or API key is needed at runtime. On mobile use a regular browser, preferably landscape. Attachment previews may not execute HTML. To serve the folder on a trusted LAN:

```sh
python3 -m http.server 8000 --bind 0.0.0.0
```

Visit `http://localhost:8000` on the computer, or `http://<computer-LAN-IP>:8000` from a phone on the same Wi-Fi. Only expose the folder on a trusted network; stop with Ctrl+C when finished. A normal HTTPS static host is also suitable. Storage is scoped to the browser/origin and can be blocked, especially in previews or private browsing.

Click **Start harbor action** and choose road, sea or air. H opens the briefing. The base provides a sports car, an off-road vehicle, a helicopter and a boat at the east pier. You can change approach using vehicles already in the world; mission-time fleet teleportation is disabled.

## One objective, three approaches

Reach the north harbor using a vehicle. Disembark, enter the warehouse, hold E at the terminal for 2.1 seconds, then hold E at the crate for 3.4 seconds. Stop moving and firing during either interaction. Return the cargo to the base, quay or helipad matching your current/last transport. Stop, land if necessary, break enemy sight and remain at the delivery marker to settle. Killing every guard is not required.

Road: use the western access road, park south of the warehouse and take its open south door. Sea: walk to the east pier, board the speedboat, travel north to the quay and disembark at low speed. Low-speed harbor disembarkation automatically moors the boat in a reboardable berth. Air: walk west to the helicopter, take off, fly north and land on the west harbor pad; cargo collection is on foot.

The route choice recommends a starting vehicle, not a forced chain of transport modes. Cargo can be damaged by vehicle impacts. A detected player may trigger bounded reinforcements until the terminal is disabled. The reward combines cargo condition, transports used and a quiet completion bonus. Successful delivery unlocks service points; completing the air approach also records the helipad milestone. Rewards have transaction IDs to avoid repeat settlement. There is no calibrated claim that a mission lasts 12-15 minutes: scripted runs are much shorter than first-time exploration.

## Controls

| Input | Function |
| --- | --- |
| WASD / mouse | Move or drive; look; left fire, right aim |
| H | Harbor briefing, control settings and performance recording |
| E | Enter/leave vehicle; **hold** at mission terminals and cargo |
| Ctrl on foot | Crouch |
| Space on foot | Jump or vault a nearby low obstacle with a clear landing |
| Z | Previous weapon |
| 1-8 / wheel / R / Tab | Select weapon / cycle / reload / full armory |
| B / J / T / V / G | Combat / exploration tasks / worlds / fleet / garage |
| M / Esc or P / F3 | Map / pause / performance overlay |
| Fighter W/S | Increase/decrease persistent throttle |
| Fighter A/D, Space/Ctrl | Turn/pitch in assisted mode; roll/pitch in advanced mode |
| Fighter right click | Toggle target tracking by default (hold mode is selectable) |
| Fighter left click / X / C / Shift | Cannon / locked missile / flares / afterburner |
| Fighter Alt | Free look; Q/E fine yaw in advanced mode |

Mobile: left stick and right drag area, contextual interaction button, crouch, short-tap previous weapon and long-press weapon wheel. The fighter has persistent throttle, click-toggle tracking, cannon/missile/flare buttons and a More menu for occasional actions. Top service shortcuts collapse behind MENU. Touch cancellation, lost capture, pause and blur release held actions. Scope zoom and the original eight weapons remain available.

Advanced flight permits more attitude control but still constrains pitch and roll. It is not a full inverted-flight/six-degree-of-freedom simulator. Helicopters and boats retain arcade controls.

## Five deliverables: software and evidence

1. Foundation: facing-aware vision, quantized hearing, protected projectile capacity, shared interpolated render snapshots, centralized quality policy, storage-error retry backoff.
2. Harbor and animation: real open warehouse, covers, ramp/catwalk, piers and helipads; procedural articulated locomotion, crouch/vault, IK limbs, aim/reload poses and existing vehicle transitions.
3. Campaign: one persistent objective with land/sea/air alternatives, interaction holds, alarm/guard response, cargo damage, delivery, service unlocks and guarded reward transactions.
4. Flight/mobile: bank-linked steering, assisted/advanced control, sticky lock target, persistent throttle, compact responsive controls and quick weapon selector.
5. Verification: regression checks, input-driven route replays, native two-finger browser emulation, live animation-loop run, diagnostic export and a separate physical-device acceptance protocol.

**Physical Android/iPhone testing and first-time human player validation are NOT completed by these scripts.** See `QA_REAL_DEVICE.md`. The software deliverables and their tests must not be confused with completed hardware qualification.

## Build and optional verification

```sh
python3 build.py
node --check bundle.js
node tools/export_assets.cjs
```

Python's standard library is sufficient to rebuild the game from the checked-in asset pack. Node is optional for syntax checks and exporting the 20 legacy **static** procedural GLB samples in `assets/`; those samples remain separate from the new pack. Neither pack contains skeletal animation clips. The new vehicles' rigid parts animate from the game's existing simulation state.

To regenerate the Blender models and both export formats (Blender 5.2 was used):

```sh
python3 tools/build_blender_assets.py --render
node tools/verify_blender_assets.cjs
python3 tools/verify_workshop_browser.py
```

Set `BLENDER` to the Blender executable if it is not on PATH or at the standard macOS application path. The command above regenerates the authored source. To preserve manual edits, open an individual asset scene in `art/harbor-workshop.blend`, edit/save it, then export with:

```sh
python3 tools/build_blender_assets.py --export-only
```

Keep mesh object custom properties `part_id` / `detail`, the collection's `asset_id` / `joints`, and the material's `role`. The exporter applies modifiers, converts coordinates, removes collapsed faces, normalizes normals, produces LODs and packs indexed millimeter-scale positions. `assets/blender/harbor-pack.js` is generated; do not edit its encoded mesh strings. Runtime does not fetch GLBs, use a CDN, or require Blender. Geometry/material changes are picked up by `--export-only`; structural joint/pivot changes also require updating the collection's `joints` metadata. Portable GLBs keep their node transforms, so they are intended for a 3D editor; the legacy garage importer still requires flattened static meshes.

Browser verification is optional and uses Python Playwright:

```sh
python3 -m pip install playwright
python3 -m playwright install chromium
python3 tools/verify_all.py --soak
```

The scripts use `CHROMIUM` if set, a system Chromium if found, or Playwright's installed browser. They load the local HTML bytes into an isolated page; they do not access accounts or remote websites. UI replays advance the fixed simulation using input events. Fixture tests intentionally set state and are labeled separately. No test silently infers phone performance from an emulated viewport. Each report stores the tested HTML hash. See `verification/RESULTS.md`.

## Saves

V6 uses `sunset-run-v6-save`, separate from the previous slot, and accepts supported V5 save data. Existing V5 slots are not overwritten. Export/import JSON in the original settings panel for backups or cross-device transfer. The new data includes campaign stage, guards, harbor fleet, unlocks and reward ledger. Transient bullets/fire and exact world traffic are not persisted. Checksums detect accidental damage; they are not security or anti-cheat. If storage is unavailable, use explicit JSON export. Real deployed-origin persistence still requires validation.

## Scope

Still a custom WebGL renderer with CPU compatibility fallback, a mix of Blender-authored and procedural artwork, and simplified arcade physics. There is no Babylon/Havok migration, texture/skeletal animation pipeline, network multiplayer or streaming seamless world in this release. The three maps use explicit travel. The Workshop update was checked in desktop Chrome WebGL and forced CPU compatibility, including offline file URLs and a short live render run. Existing character animation and most architecture remain procedural. Physical-phone thermals, battery, long-duration frame pacing and novice-player experience remain pending; the verification report records what was actually measured.
