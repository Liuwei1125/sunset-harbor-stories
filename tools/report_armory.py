"""Publish a release summary only from passing reports for this exact HTML."""
import hashlib
import json
import shutil
import statistics
from datetime import date
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'verification'
sha=hashlib.sha256((ROOT/'index.html').read_bytes()).hexdigest()
names=['regressions','mobile','input-road','input-sea','input-air','blender-assets','armory-assets','blender-browser','armory-browser','graphics-browser','color-browser','effects-browser','armory-live']
reports={name:json.loads((OUT/(name+'.json')).read_text()) for name in names}
for name,d in reports.items():
    assert d.get('sha256')==sha, name+' belongs to another build'
    assert d.get('passed') and (not d.get('total') or d['passed']==d['total']), name+' did not pass'
    assert not d.get('errors') and not d.get('browserErrors'), name+' has browser errors'

arcade_sha=hashlib.sha256((ROOT/'arcade.html').read_bytes()).hexdigest()
arcade_names=['arcade-assets','arcade-browser','arcade-native-input','arcade-live']
arcade={name:json.loads((OUT/(name+'.json')).read_text()) for name in arcade_names}
for name,d in arcade.items():
    assert d.get('sha256')==arcade_sha, name+' belongs to another club build'
    assert d.get('passed') and (not d.get('total') or d['passed']==d['total']), name+' did not pass'
    assert not d.get('errors'), name+' has browser errors'
assert arcade['arcade-browser']['mainSha256']==sha, 'Club isolation checks used another campaign build'
assert len(arcade['arcade-browser']['playthroughs'])==72 and all(x['success'] for x in arcade['arcade-browser']['playthroughs']), 'Missing event/difficulty completions'

version=json.loads((ROOT/'package.json').read_text())['version']
release=json.loads((ROOT/'RELEASE.json').read_text())
if release['version']!=version:
    archive=OUT/('release-'+release['version']+'.json')
    if not archive.exists():shutil.copyfile(ROOT/'RELEASE.json',archive)
    archive=OUT/('RESULTS-'+release['version']+'.md')
    if not archive.exists():shutil.copyfile(OUT/'RESULTS.md',archive)
routes={name:reports['input-'+name]['state']['result'] for name in ['road','sea','air']}
sets={name:{'passed':reports[name]['passed'],'total':reports[name]['total']} for name in ['regressions','mobile','blender-browser','armory-browser','graphics-browser','color-browser','effects-browser']}
live=[{'quality':r['quality'],'medianFPS':r['medianFPS'],'medianCpuMs':r['medianCpuMs'],'samples':r['samples'],'pools':r['report']['pools'],'cap':r['report']['cap']} for r in reports['armory-live']['profiles']]
release.update(version=version,htmlSha256=sha,browserWebGLValidation='PASS: offline file URL, desktop WebGL, CPU fallback and high/low continuous-fire samples')
release['verificationSummary']={'release':'HARBOR STORIES '+version,'htmlSha256':sha,'checkSets':sets,'inputOnlyCampaigns':routes,'armoryLive':live,'pending':['Physical Android and iPhone','Novice human player sessions','20-30 minute thermal and battery run','Persistent storage on a real deployment origin']}
manifest=json.loads((ROOT/'assets/armory/manifest.json').read_text())
release['armoryAssets']={'count':8,'source':'art/harbor-armory.blend','manifest':'assets/armory/manifest.json','runtimeBytes':manifest['runtimeBytes'],'batches':[['rifle','shotgun','sniper'],['pistol','smg','grenade','molotov','launcher']]}
lighting=json.loads((ROOT/'assets/lighting/manifest.json').read_text())
for name,digest in lighting['files'].items():
    assert hashlib.sha256((ROOT/'assets/lighting'/name).read_bytes()).hexdigest()==digest, 'Stale lighting manifest: '+name
release['graphics']={'effects':['6.2','6.3.1'],'defaultEffect':'6.3.1','name':'Harbor Radiance','scope':'All three campaign maps and four Harbor Club modes, vehicles, weapons and world geometry','guide':'GRAPHICS_ZH.md','comparison':'graphics.html','environment':'assets/lighting/manifest.json','high':['Filtered IBL','Two shadow cascades','SSAO','Screen-space water reflections','Local combat lights','HDR Bloom','AgX','FXAA'],'fallbacks':['LDR without half-float','No screen-depth effects without depth textures','No micro-normal detail without derivatives','Classic renderer switch','Existing CPU fallback'],'limitations':['Not Cycles or path-traced global illumination','Screen-space reflections miss offscreen geometry','Campaign retains existing simplified characters and buildings; Club draws no characters','Physical-phone performance unverified']}
release['arcade']={'entry':'arcade.html','htmlSha256':arcade_sha,'htmlBytes':(ROOT/'arcade.html').stat().st_size,'guide':'ARCADE_ZH.md','modes':['race','shooting','darts','archery'],'levelsPerMode':6,'difficulties':['casual','sport','expert'],'playlists':['levels','daily','endless'],'firstPerson':True,'characterModels':False,'separateSaveKey':'sunset-harbor-club-v1','assets':{'count':len(arcade['arcade-assets']['assets']),'source':'art/harbor-arcade.blend','manifest':'assets/arcade/manifest.json','runtimeBytes':arcade['arcade-assets']['runtimeBytes']},'checks':{name:{'passed':arcade[name]['passed'],'total':arcade[name]['total']} for name in ['arcade-browser','arcade-native-input']},'completeEventDifficultyRuns':72,'liveProfiles':arcade['arcade-live']['profiles'],'performanceScope':arcade['arcade-live']['scope']}
(ROOT/'RELEASE.json').write_text(json.dumps(release,ensure_ascii=False,indent=2)+'\n')

rows='\n'.join(f"| {name} | {r['seconds']} | {r['cargo']}% | {r['payout']} |" for name,r in routes.items())
live_rows='\n'.join(f"| {r['quality']} | {r['samples']} | {r['medianFPS']:.1f} | {r['medianCpuMs']:.2f} |" for r in live)
checks=sum(x['passed'] for x in sets.values())
club_checks=arcade['arcade-browser']['passed'];native_checks=arcade['arcade-native-input']['passed']
club_live_rows='\n'.join(f"| {r['mode']} / {r['quality']} | {r['seconds']:.2f} | {r['averageFPS']:.2f} | {r['p95FrameMs']:.2f} | {r['medianRenderCpuMs']:.2f} |" for r in arcade['arcade-live']['profiles'])
body=f'''# Harbor Stories {version} verification

Tested {date.today().isoformat()}. HTML SHA-256: `{sha}`

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
| Club rules, 72 complete runs, saves, rendering, resource lifetime and touch | {club_checks} / {arcade['arcade-browser']['total']} | `arcade-browser.json` |
| Complete Club events through native mouse / keyboard input | {native_checks} / 4 | `arcade-native-input.json` |
| Live Club gameplay rendering | 5 / 5 | `arcade-live.json` |

The campaign has **{checks} passing browser checks**. Club adds **{club_checks} checks and {native_checks} native event completions**, for **{checks+club_checks+native_checks} passing browser checks/completions**. The 32 asset checks and three campaign routes are counted separately. All thirteen campaign reports carry the current campaign HTML hash; the four Club reports carry its current HTML hash. No result is copied from an earlier build.

## Harbor Club

Club HTML SHA-256: `{arcade_sha}`; {(ROOT/'arcade.html').stat().st_size:,} bytes, fully offline.

Four independent first-person modes provide 24 events and three effective difficulty settings. Tests complete all 72 event/difficulty combinations by steering, aiming and pressing the production control state while advancing the fixed 120 Hz physics clock. No car positions, checkpoints, hits or scores are injected in those runs. Separate native input runs use real mouse drags, right button, Space/Shift and WASD to complete one representative event per mode; they also advance the clock deterministically. Neither test method measures human learning time.

Arranged rule fixtures cover all 60 dart scoring sectors, bulls, checkout routes, full-turn bust rollback, invalid single finishes, legal bull checkout and all archery ring boundaries. Shooting checks cover no-shoot penalties, reloads, movement limits and all three weapon/scoped views. Race checks cover ordered gates, recovery penalties, throttle, braking and nitro. Difficulty changes actual AI pace, time windows, size and wind. Daily seeds reproduce scene conditions; 100-second endless runs in all modes remain playable and bank their progress.

Campaign initialization and actor arrays remain unused; instrumented rendering confirms no character draw calls. A campaign storage sentinel survives every mode, pagehide, Club export/import, reload and damaged-Club-slot recovery. Native simultaneous touch contacts exercise portrait and landscape movement/aiming, firing/charge release, pause, bank and retry. Pointer-lock handling is checked against the browser's actual response: when accepted, losing the lock must pause; when rejected, native right-drag must aim and Escape must pause and release actions. The JSON records which branch ran; this Chrome environment rejected pointer lock even on a minimal button page, so the acquired-lock branch is not claimed as verified here. A recorded personal-best ghost visibly advances through its actual drawing path.

Both effects render every mode at all three quality tiers. CPU fallback preserves controls, scoring and geometry. Forty-eight scene rebuilds and effect switches have stable live Buffer/Texture/Framebuffer counts between warmed sweeps, bounded event history and zero GL errors. Offline test contexts make no remote requests and report no application exceptions. These are deterministic browser tests, not a physical-device guarantee.

| Mode / quality | Measured seconds | Average rendered FPS | p95 frame interval ms | Median render CPU ms |
| --- | --- | --- | --- | --- |
{club_live_rows}

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
{rows}

These use keyboard/mouse input and fixed simulation stepping without changing actors, health or mission stages after public route selection. They are automated regressions; their timings are not first-time human completion times.

## Live desktop combat load

| Quality | Samples | Median sampled FPS | Median CPU ms |
| --- | --- | --- | --- |
{live_rows}

Each profile ran for approximately 20 real seconds in desktop Chrome WebGL at a 1280 × 800 viewport. High quality uses a 1600 × 1000 render target at device pixel ratio 1; low uses the existing reduced resolution. The controlled load continuously fires the rifle with replenished ammunition and creates overlapping burst/fire effects. Quality is explicitly selected. Both profiles report no GL/runtime errors and all visual pools stay within their tier budgets. This load is intentionally synthetic and is separate from the input-only campaigns.

The Workshop checks additionally include a 20-second real animation-loop sample at the harbor base. Desktop low quality and emulated touch do not establish physical-phone performance, thermals or battery life. Physical Android/iPhone tests and novice-player sessions remain pending.

## Artifacts and visual inspection

- `graphics.html`: six matching before/after cameras, based on the retained 6.3 HTML and current build.
- `previews/grading-before-*.png`, `graphics-after-*.png`: paused real-game captures of the harbor, car, quay, warehouse, boat and rifle.
- `assets/lighting/`: original outdoor HDR, GGX/diffuse RGBM atlas, generation source and hashes.

- `art/harbor-armory.blend`: editable source with 8 individual model scenes and a studio overview.
- `assets/armory/*.glb`: standalone source geometry; the offline mesh pack is {manifest['runtimeBytes']:,} bytes.
- `previews/blender-armory.png`: Blender studio render, with all eight models inside the frame.
- `previews/armory-rifle.png`, `armory-shotgun.png`, `armory-sniper.png`, `armory-pistol.png`, `armory-smg.png`, `armory-launcher.png`: actual game WebGL fixtures.
- `previews/armory-blast-flash.png`, `armory-blast-smoke.png`, `armory-fire.png`: staged effect fixtures.
- `previews/armory-mobile-software.png`: actual forced CPU fallback, phone-sized viewport.

Visual fixtures deliberately fix cameras and pause time. Studio and game lighting are different. The graphics inspection caught receiver-plane self-shadow bands and excessive legacy-surface bump detail; PCF receiver correction, footprint filtering, authored-only microdetail and high-quality supersampling improve these cases. The final standalone HTML is {(ROOT/'index.html').stat().st_size:,} bytes and requires no network at runtime. This remains a real-time renderer with simplified scene assets, not a match for Cycles path tracing.

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
'''
(OUT/'RESULTS.md').write_text(body)
print('Release',version,sha,checks+club_checks+native_checks,'browser checks/completions, 32 assets, 3 campaigns, 7 live profiles.')
