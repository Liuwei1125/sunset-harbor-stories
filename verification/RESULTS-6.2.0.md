# Harbor Armory 6.2.0 verification

Tested 2026-09-10. HTML SHA-256: `000b0ffe96902f1415213538cd380f5fb4a7b07f191d3c45901b2538572057fc`

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
| Complete campaign input replays | 3 / 3 | `input-road.json`, `input-sea.json`, `input-air.json` |
| Sustained high/low combat effects | 2 / 2 | `armory-live.json` |

The four browser check sets contain **79 passing checks**. All ten JSON reports listed above carry the current HTML hash. Asset checks and route replays are counted separately. No result is copied from an earlier build.

## Combat contracts

The armory checks verify one-round consumption and cooldowns for all eight weapons; rendered muzzle alignment while crouched and aiming up/down; cover stopping a protruding barrel; shotgun range attenuation, shell insertion and firing interruption; cancelled and completed magazine reloads; moving magazine/bolt/pump geometry; distinct material impacts; finite unfired/dead guard geometry; single death rewards; blast/fire occlusion; water extinguishing; grenade surface-normal reflection; scope easing; bounded low-quality visual pools; pause/reset behavior; the actual WebGL feathered-effect stream; and a phone-sized CPU fallback.

The controlled test scene must update the spatial index when it inserts or removes cover, as the real world builder does. A visual check also caught feathered vertices being written into an instanced-only builder; a separate reusable vertex stream now draws them, with its own regression assertion. No collision or damage assertion was weakened to pass these checks.

## Complete input-driven routes

| Route | Simulated seconds | Cargo | Reward |
| --- | --- | --- | --- |
| road | 90.3 | 100% | 3150 |
| sea | 162.9 | 100% | 3150 |
| air | 122.5 | 100% | 3150 |

These use keyboard/mouse input and fixed simulation stepping without changing actors, health or mission stages after public route selection. They are automated regressions; their timings are not first-time human completion times.

## Live desktop combat load

| Quality | Samples | Median sampled FPS | Median CPU ms |
| --- | --- | --- | --- |
| high | 20 | 60.0 | 1.91 |
| low | 20 | 60.0 | 0.85 |

Each profile ran for approximately 20 real seconds in desktop Chrome WebGL at a 1280 × 800 viewport. The controlled load continuously fires the rifle with replenished ammunition and creates overlapping burst/fire effects. Quality is explicitly selected. Both profiles report no GL/runtime errors and all visual pools stay within their tier budgets. This load is intentionally synthetic and is separate from the input-only campaigns.

The Workshop checks additionally include a 20-second real animation-loop sample at the harbor base. Desktop low quality and emulated touch do not establish physical-phone performance, thermals or battery life. Physical Android/iPhone tests and novice-player sessions remain pending.

## Artifacts and visual inspection

- `art/harbor-armory.blend`: editable source with 8 individual model scenes and a studio overview.
- `assets/armory/*.glb`: standalone source geometry; the offline mesh pack is 523,172 bytes.
- `previews/blender-armory.png`: Blender studio render, with all eight models inside the frame.
- `previews/armory-rifle.png`, `armory-shotgun.png`, `armory-sniper.png`, `armory-pistol.png`, `armory-smg.png`, `armory-launcher.png`: actual game WebGL fixtures.
- `previews/armory-blast-flash.png`, `armory-blast-smoke.png`, `armory-fire.png`: staged effect fixtures.
- `previews/armory-mobile-software.png`: actual forced CPU fallback, phone-sized viewport.

Visual fixtures deliberately fix cameras and pause time. Studio and game lighting are different. Inspection corrected grip placement, arm reach, overview cropping, and the missing feathered GPU stream. The final standalone HTML is 3,613,769 bytes and requires no network at runtime.

## Re-run

```sh
python3 build.py
node --check bundle.js
node tools/verify_blender_assets.cjs
node tools/verify_blender_assets.cjs --armory
python3 tools/verify_all.py
python3 tools/verify_workshop_browser.py
python3 tools/benchmark_armory.py
python3 tools/report_armory.py
```

`report_armory.py` refuses to publish a summary if a required report fails or belongs to another HTML hash. See `ARMORY_ZH.md` for the two batches, controls, asset editing and visual budgets.
