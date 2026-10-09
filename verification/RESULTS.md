# Harbor Stories 6.4.0 verification

Tested 2026-09-11. HTML SHA-256: `ede949002126c7765e0a00201a4440fbab07d2469af9a59eadf081d60e2f01c4`

## Results

| Check set | Result | Evidence |
| --- | --- | --- |
| Build and bundled JavaScript syntax | PASS | `python3 build.py`, `node --check bundle.js` |
| Weapon meshes, GLBs, normals, indices, LODs and sockets | 8 models PASS | `armory-assets.json` |
| Original vehicle and harbor meshes | 14 models PASS | `blender-assets.json` |
| Existing controlled regressions | 29 / 29 | `regressions.json` |
| Emulated native touch interactions | 15 / 15 | `mobile.json` |
| Armory browser checks | 21 / 21 | `armory-browser.json` |
| Workshop browser checks | 14 / 14 | `blender-browser.json` |
| Global graphics and degraded GPU paths | 16 / 16 | `graphics-browser.json` |
| Palette, illumination and color regression | 7 / 7 | `color-browser.json` |
| Preserved 6.2 / 6.3.1 effects, switching and persistence | 16 / 16 | `effects-browser.json` |
| Complete campaign input replays | 3 / 3 | `input-road.json`, `input-sea.json`, `input-air.json` |
| Sustained high/low combat effects | 2 / 2 | `armory-live.json` |
| Club meshes, GLBs, materials, LODs and joints | 10 models PASS | `arcade-assets.json` |
| Club rules, 72 complete runs, saves, rendering, resource lifetime and touch | 84 / 84 | `arcade-browser.json` |
| Complete Club events through native mouse / keyboard input | 4 / 4 | `arcade-native-input.json` |
| Live Club gameplay rendering | 5 / 5 | `arcade-live.json` |

The campaign has **118 passing browser checks**. Club adds **84 checks and 4 native event completions**, for **206 passing browser checks/completions**. The 32 asset checks and three campaign routes are counted separately. All thirteen campaign reports carry the current campaign HTML hash; the four Club reports carry its current HTML hash. No result is copied from an earlier build.

## Harbor Club

Club HTML SHA-256: `365c5786084ff445a7cf8b212091ea49d9c81079a686788838fe3b0b915c0079`; 6,504,112 bytes, fully offline.

Four independent first-person modes provide 24 events and three effective difficulty settings. Tests complete all 72 event/difficulty combinations by steering, aiming and pressing the production control state while advancing the fixed 120 Hz physics clock. No car positions, checkpoints, hits or scores are injected in those runs. Separate native input runs use real mouse drags, right button, Space/Shift and WASD to complete one representative event per mode; they also advance the clock deterministically. Neither test method measures human learning time.

Arranged rule fixtures cover all 60 dart scoring sectors, bulls, checkout routes, full-turn bust rollback, invalid single finishes, legal bull checkout and all archery ring boundaries. Shooting checks cover no-shoot penalties, reloads, movement limits and all three weapon/scoped views. Race checks cover ordered gates, recovery penalties, throttle, braking and nitro. Difficulty changes actual AI pace, time windows, size and wind. Daily seeds reproduce scene conditions; 100-second endless runs in all modes remain playable and bank their progress.

Campaign initialization and actor arrays remain unused; instrumented rendering confirms no character draw calls. A campaign storage sentinel survives every mode, pagehide, Club export/import, reload and damaged-Club-slot recovery. Native simultaneous touch contacts exercise portrait and landscape movement/aiming, firing/charge release, pause, bank and retry. Pointer-lock handling is checked against the browser's actual response: when accepted, losing the lock must pause; when rejected, native right-drag must aim and Escape must pause and release actions. The JSON records which branch ran; this Chrome environment rejected pointer lock even on a minimal button page, so the acquired-lock branch is not claimed as verified here. A recorded personal-best ghost visibly advances through its actual drawing path.

Both effects render every mode at all three quality tiers. CPU fallback preserves controls, scoring and geometry. Forty-eight scene rebuilds and effect switches have stable live Buffer/Texture/Framebuffer counts between warmed sweeps, bounded event history and zero GL errors. Offline test contexts make no remote requests and report no application exceptions. These are deterministic browser tests, not a physical-device guarantee.

| Mode / quality | Measured seconds | Average rendered FPS | p95 frame interval ms | Median render CPU ms |
| --- | --- | --- | --- | --- |
| race / high | 19.98 | 60.00 | 18.40 | 0.80 |
| shooting / high | 20.00 | 60.00 | 18.30 | 0.80 |
| darts / high | 19.98 | 60.00 | 18.40 | 0.40 |
| archery / high | 20.00 | 60.00 | 18.40 | 0.70 |
| race / low | 19.98 | 60.01 | 18.30 | 0.40 |

Each profile uses the normal, unmodified animation loop for 20 wall-clock seconds after warm-up at a 1280 × 800 desktop Chrome viewport, DPR 1, natural-lighting effect. High quality renders at 1600 × 1000; low uses the reduced-resolution profile. The controller drives real physics while steering, shooting or charging. FPS counts actual render intervals. CPU values measure render submission only and exclude GPU time. All profiles remain in live gameplay with bounded pools and no GL/runtime errors. Physical-phone FPS, thermals and battery life are not inferred from these samples.

Actual game captures: `previews/club-*-gameplay.png`, `club-*-live-high.png`, and `club-*-touch-390.png` / `club-*-touch-844.png`. The 10 new models are editable in `art/harbor-arcade.blend`; `previews/blender-arcade.png` is the separately lit studio overview. Player rules, complete event catalog and editing commands are in `ARCADE_ZH.md`.

## Preserved effects

Version 6.3.2 exposes the retained 6.2 and 6.3.1 effects in Settings. Three fixed cameras at each of three quality tiers match the archived builds in raw RGBA hashes, byte sums, canvas sizes and shadow parameters. Switching releases unused photographic targets, preserves game state and photo exposure, and persists through page reload and save import. Both effects render all three maps. Phone-sized native touch navigation reaches the same controls.

## Color calibration

Version 6.3.1 rebalances the original environment: a lower-radiance blue sky, warmer ground bounce, stronger diffuse fill with a restrained sky tint, less grey water scattering and a mild contrast/saturation look with gamut compression. Exposure remains 1 for the comparison. The seven palette checks measure matching canvas regions against the retained 6.3 build and check sky whitening, vehicle-panel brightness/color, water color, shadow tint, clipping and a neutral HDR grey ramp. These display-RGB samples are regression indicators, not a complete aesthetic score. All six views were also inspected visually.

## Global rendering checks

The new checks verify actual occlusion pixels in the AO target and visible output changes when toggling AO, reflection, Bloom and explosion lights. Exposure is measured from the final rendered pixels. Repeated rendering preserves actor poses, ammunition, simulation time and mission state. Canvas resizing deletes old GPU targets; stable frames reuse them. Public settings switch between classic and Radiance rendering, and the graphics options survive save restoration with defaults for older saves.

Separate browser contexts mask half-float, depth-texture and derivative extensions to exercise degraded GPU paths. Each still renders visible output and responds to exposure without GL errors. All three maps are checked. Existing Workshop/Armory checks separately force the real CPU renderer. These are browser compatibility tests, not a hardware compatibility guarantee.

## Combat contracts

The armory checks verify one-round consumption and cooldowns for all eight weapons; rendered muzzle alignment while crouched and aiming up/down; cover stopping a protruding barrel; shotgun range attenuation, shell insertion and firing interruption; cancelled and completed magazine reloads; moving magazine/bolt/pump geometry; distinct material impacts; finite unfired/dead guard geometry; single death rewards; blast/fire occlusion; water extinguishing; grenade surface-normal reflection; scope easing; bounded low-quality visual pools; pause/reset behavior; the actual WebGL feathered-effect stream; and a phone-sized CPU fallback.

The controlled test scene must update the spatial index when it inserts or removes cover, as the real world builder does. A visual check also caught feathered vertices being written into an instanced-only builder; a separate reusable vertex stream now draws them, with its own regression assertion. No collision or damage assertion was weakened to pass these checks.

## Complete input-driven routes

| Route | Simulated seconds | Cargo | Reward |
| --- | --- | --- | --- |
| road | 91.1 | 100% | 3150 |
| sea | 158.1 | 100% | 3150 |
| air | 122.5 | 100% | 3150 |

These use keyboard/mouse input and fixed simulation stepping without changing actors, health or mission stages after public route selection. They are automated regressions; their timings are not first-time human completion times.

## Live desktop combat load

| Quality | Samples | Median sampled FPS | Median CPU ms |
| --- | --- | --- | --- |
| high | 20 | 50.5 | 19.37 |
| low | 20 | 60.0 | 0.95 |

Each profile ran for approximately 20 real seconds in desktop Chrome WebGL at a 1280 × 800 viewport. High quality uses a 1600 × 1000 render target at device pixel ratio 1; low uses the existing reduced resolution. The controlled load continuously fires the rifle with replenished ammunition and creates overlapping burst/fire effects. Quality is explicitly selected. Both profiles report no GL/runtime errors and all visual pools stay within their tier budgets. This load is intentionally synthetic and is separate from the input-only campaigns.

The Workshop checks additionally include a 20-second real animation-loop sample at the harbor base. Desktop low quality and emulated touch do not establish physical-phone performance, thermals or battery life. Physical Android/iPhone tests and novice-player sessions remain pending.

## Artifacts and visual inspection

- `graphics.html`: six matching before/after cameras, based on the retained 6.3 HTML and current build.
- `previews/grading-before-*.png`, `graphics-after-*.png`: paused real-game captures of the harbor, car, quay, warehouse, boat and rifle.
- `assets/lighting/`: original outdoor HDR, GGX/diffuse RGBM atlas, generation source and hashes.

- `art/harbor-armory.blend`: editable source with 8 individual model scenes and a studio overview.
- `assets/armory/*.glb`: standalone source geometry; the offline mesh pack is 523,172 bytes.
- `previews/blender-armory.png`: Blender studio render, with all eight models inside the frame.
- `previews/armory-rifle.png`, `armory-shotgun.png`, `armory-sniper.png`, `armory-pistol.png`, `armory-smg.png`, `armory-launcher.png`: actual game WebGL fixtures.
- `previews/armory-blast-flash.png`, `armory-blast-smoke.png`, `armory-fire.png`: staged effect fixtures.
- `previews/armory-mobile-software.png`: actual forced CPU fallback, phone-sized viewport.

Visual fixtures deliberately fix cameras and pause time. Studio and game lighting are different. The graphics inspection caught receiver-plane self-shadow bands and excessive legacy-surface bump detail; PCF receiver correction, footprint filtering, authored-only microdetail and high-quality supersampling improve these cases. The final standalone HTML is 5,050,257 bytes and requires no network at runtime. This remains a real-time renderer with simplified scene assets, not a match for Cycles path tracing.

## Re-run

```sh
python3 build.py
node --check bundle.js
node --check arcade-bundle.js
node tools/verify_blender_assets.cjs
node tools/verify_blender_assets.cjs --armory
node tools/verify_blender_assets.cjs --arcade
python3 tools/verify_all.py
python3 tools/verify_workshop_browser.py
python3 tools/benchmark_armory.py
python3 tools/benchmark_arcade.py
python3 tools/report_armory.py
```

`report_armory.py` refuses to publish a summary if a required report fails or belongs to another HTML hash. Its original filename is retained as the release-report entry point. See `GRAPHICS_ZH.md` for the global rendering change and `ARMORY_ZH.md` for weapon behavior and editing.
