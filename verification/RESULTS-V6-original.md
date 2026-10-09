Historical 6.0 report. Current regression JSON and screenshots have since been regenerated for 6.1; the original 120-second CPU soak remains historical evidence only.

# V6 verification results

HTML SHA-256: `8376fade52fbe31d9b340cb240f78de5af948376c76b83ed23feee089fa426f5`

## Current accepted results

| Check set | Result | Method |
| --- | --- | --- |
| Targeted regressions | 29 / 29 | Deliberately controlled fixtures; not playthroughs |
| Mobile interactions/layout | 15 / 15 | Chromium mobile viewport + native CDP two-finger touch; not physical phones |
| Whole road/sea/air campaign | 3 / 3 | Keyboard/mouse event driver; fixed-step advancement; no actor/HP/task-stage edits after initial scenario selection |
| Live requestAnimationFrame | PASS | 121.05 wall-clock seconds, 120 samples, idle exploration with view turns; no runtime errors |
| Build and syntax | PASS | Python build and Node syntax checks |
| Original static GLB export | PASS | 20 assets generated and parsed with source exporter |

## Input-only route outcomes

| Route | Result | Simulated time | Cargo | Reward |
| --- | --- | --- | --- | --- |
| road | PASS | 90.2 s | 100% | 3150 |
| sea | PASS | 161.2 s | 100% | 3150 |
| air | PASS | 115.4 s | 100% | 3150 |

The script aims using observations and normal input events and can execute faster than a human. Simulation time, wall time and first-player completion time are different. The reports preserve inputs and actual game events. They do not assert that a first-time player could reproduce the route without instruction. Guard behavior is stochastic, so automated paths are useful regressions, not an exhaustive proof of all behaviors.

## Live-loop scope

Renderer: **CPU software compatibility**. GPU timer: unavailable. Viewport: [1280, 800]. Sampled rolling FPS median 48.5, range 20-53.1. These are rolling sample values, not a claim of target desktop/mobile performance. Auto quality reduced resolution during the run. See full JSON for resolution, frame-p95, CPU time and long tasks. The live run is idle exploration with view turns, not a combat endurance or thermal test.

## Corrections and retest

An initial mobile check read cancellation before its native events had fully propagated. The assertion now waits for the released input state with an explicit polling interval (the deterministic suite disables requestAnimationFrame). The final suite was re-run and its latest report passes. No game state is reset to make that assertion pass. `suite-latest.log` is the accepted full suite excluding the separate live soak; all JSON records carry the tested hash.

## Still pending

Physical Android/iPhone runs, WebGL image quality and GPU performance in a browser, 20-30 minute heat/battery runs, new human players, and persistence on an actual deployed origin. `QA_REAL_DEVICE.md` is the procedure, not completed evidence. The test page is isolated via Playwright set_content; it does not verify attachment preview policies, file URL access or real localStorage persistence.

## Re-run

```sh
python3 tools/verify_all.py --soak
```

See README for optional Playwright setup. There is no network telemetry or automatic upload.
