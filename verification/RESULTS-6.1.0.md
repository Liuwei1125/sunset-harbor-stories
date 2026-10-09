# Harbor Workshop 6.1 verification

Tested 2026-09-10. HTML SHA-256: `a8d596fc29c0c7ba2572eabaa32c3542a7caf186e5355794eb154a7cd5444fe7`

## Accepted results

| Check set | Result | Evidence |
| --- | --- | --- |
| Build / bundled JavaScript syntax | PASS | `python3 build.py`, `node --check bundle.js` |
| Blender geometry and independent GLBs | 14 models PASS | `blender-assets.json`: finite unit normals, index ranges, bounds, high/low budgets, materials and joint pivots |
| Existing controlled regressions | 29 / 29 | `regressions.json` |
| Native CDP emulated touch interactions | 15 / 15 | `mobile.json`; not a physical phone |
| Full campaign input replays | 3 / 3 | `input-road.json`, `input-sea.json`, `input-air.json` |
| Workshop browser checks | 14 / 14 | `blender-browser.json`: offline file URL, real WebGL, CPU fallback, LOD/material/animation checks, world rebuilds |
| Legacy editing-sample export | 20 assets PASS | `node tools/export_assets.cjs`; separate from the Blender pack |

All seven current JSON reports carry the exact HTML hash above. No current pass is inferred from the previous release's report.

## Three complete routes

| Route | Result | Simulated seconds | Cargo | Reward |
| --- | --- | --- | --- | --- |
| road | PASS | 90.3 | 100% | 3150 |
| sea | PASS | 159.4 | 100% | 3150 |
| air | PASS | 115.4 | 100% | 3150 |

These drivers send keyboard/mouse events and advance fixed simulation steps. They do not edit actors, health or mission stages after public scenario selection. Guard behavior is stochastic. These are automated regressions, not first-time human completion times.

## Live desktop WebGL sample

The final build ran a real requestAnimationFrame loop for approximately 20 seconds in desktop Chrome at 1280 × 800, starting the road campaign at the base. There were 20 recorded samples, no page/runtime errors, median sampled FPS **60.0**, median CPU time **1.66 ms**, and median available GPU-query time **4.72 ms**. Automatic quality remained at tier 2 with resolution [1280, 800] at the last sample.

This is a short local desktop sample, not a whole-game frame-rate guarantee, sustained combat benchmark, physical-phone qualification or thermal test. The earlier 120-second CPU sample belongs to 6.0 and was not reused as 6.1 evidence.

## Asset and visual evidence

The offline asset pack is 2,556,035 bytes; the final standalone HTML is 3,068,524 bytes. Both high and low geometry are included. Repeated mesh data is shared, normal/position values are quantized, and high-detail instances use reduced meshes when casting shadows.

- `previews/blender-workshop.png`: Blender studio overview, rendered from the editable source.
- `previews/workshop-sport.png`, `workshop-jeep.png`, `workshop-helicopter.png`, `workshop-boat.png`: actual in-game WebGL views.
- `previews/workshop-quay.png`, `workshop-cargo.png`, `workshop-forklift.png`: actual harbor scenes.
- `previews/workshop-software.png`: forced CPU compatibility view using the low models.
- `previews/workshop-before-sport.png`, `workshop-before-helicopter.png`, `workshop-before-quay.png`: original-build captures at the same fixed cameras.

These visual fixtures deliberately set the camera and pause the simulation; they are separate from input-only mission evidence. Studio lighting is separate from game lighting and is labeled accordingly. Visual inspection corrected inward-facing car panels and cabin glass that intersected the helicopter body.

## Verification harness correction

The deterministic tests disable requestAnimationFrame so only their driver advances time. Initial readiness polling previously also depended on requestAnimationFrame and could time out before the deferred initialization, particularly after the larger asset pack was parsed. Readiness checks now use an explicit 20 ms polling interval. Assertions and input replay criteria were not weakened. The final suite was rerun successfully.

## Re-run

```sh
python3 build.py
node --check bundle.js
node tools/verify_blender_assets.cjs
python3 tools/verify_all.py
python3 tools/verify_workshop_browser.py
```

`CHROMIUM` selects a browser explicitly; the standard macOS Chrome path is detected automatically, otherwise Playwright's installed Chromium is used. Blender is only needed to regenerate model assets. Physical Android/iPhone runs, long thermal/battery runs, deployed-origin persistence and novice-player evaluation remain pending under `QA_REAL_DEVICE.md`.
