# Harbor Club 7 / migration contract

The new HTTP entry is `club/index.html`. Existing `arcade.html` remains the complete single-file offline fallback. Existing campaign code, saves, research site, racing experiments and editable Blender scenes are protected by the hashes in `verification/baseline.json`.

Version 7.1 adds licensed external car and AKM models, persistent chase/hood/cockpit racing cameras, live instruments and simultaneous touch camera switching. See [ASSETS.md](ASSETS.md) and the current [verification report](verification/REPORT.md). Its scoped performance measurements do not replace or extend the historical 7.0 soak evidence.

## Milestones and exit conditions

1. **A — Independent foundation.** Port all 24 definitions and existing rules into DOM-free modules. Explicit owners: fixed-step simulation, input commands, progress/storage, resource loading, audio, UI, presentation and diagnostics. The new entry must boot into a real rendered lobby; dependency versions and assets must be self-hosted. Exit: a deterministic simulation works in Node without loading any engine or campaign global.
2. **B — Complete racing.** Lobby → brief → race → pause → result → next/retry → reload; all six tracks and three difficulties; checkpoints, penalties, nitro, AI, tunes and ghosts. Babylon is primary. A PlayCanvas adapter runs the same scene description and authoritative simulation for racing only. Exit: native controls complete a race, both adapters render it, and score/physics traces match.
3. **C — All four games.** Migrate shooting, darts and archery into the same lifecycle while retaining mode-specific rules. Exit: all 72 event/difficulty combinations complete through gameplay controls; representative events finish through native mouse/keyboard actions; rules do not depend on rendering or quality.
4. **D — Product and verification.** Daily/endless, settings, unlocks, records, first-load progress/retry, input cancellation, save migration/isolation, resource disposal, responsive touch and repeatable diagnostics. Exit: complete UI loops, same-origin v1 save migration/import, desktop/live/touch tests, 20-minute soak, actual screenshots and a GTA reuse checklist. Physical phones are explicitly unmeasured when unavailable.

Every milestone leaves the old entry usable and the new entry playable. No paid asset purchase is part of this migration. No main-campaign rewrite is part of this release.

## Ownership

| Module | Owns | Must not own |
| --- | --- | --- |
| `src/core/math.js`, `track.js`, `clock.js` | Engine-neutral coordinates, spatial queries and 120 Hz stepping | Browser or engine objects |
| `src/games/` | Rules, car/ballistic state, authoritative targets, scoring and event transitions | Mesh picking, frame timing or storage IO |
| `src/core/progress.js` | Validated versioned progress, records, ghosts and migration | Campaign keys or live physics |
| `src/presentation/` | Scene descriptions, GLB models, interpolated poses and effect budgets | Hit/score adjudication |
| `src/platform/` | Input, storage, audio, loading and diagnostics | A second physics world |
| `src/app.js`, `src/ui.js` | Application lifecycle and product UI | Engine-specific gameplay branches |

Coordinates: right-handed, meters, Y up, -Z forward, yaw 0 facing -Z. GLB joint nodes use explicit local pivots and stable asset IDs. New runtime GLBs derive from existing originals and retain high/low LODs; conversion never modifies the original .blend or GLB. No decoder is needed for the initial uncompressed GLB pipeline. If compression is later enabled, its decoder must be pinned and self-hosted too.

Rendering consumes snapshots, including interpolated previous/current dynamic poses. Simulation uses only its fixed 1/120-second clock and input commands. One authoritative arcade physics implementation serves both renderers; Havok/Ammo are not initialized. Future physics implementations must satisfy the same query/body contract before they can replace it.

Engine choices appear only in advanced settings, only for supported modes. Switching banks an endless session if appropriate, exits the current event, disposes the renderer and reinitializes the application. Each page lifetime loads only its selected renderer dependency. Quality/exposure options remain prominent and independent of engine selection.

## Progress compatibility

The new key is `sunset-harbor-club-v2`; the original `sunset-harbor-club-v1` is read only for migration. The campaign key is never written. Migration validates v1 data and copies it once when there is no v2 save; it does not delete or update the original. Different origins can use explicit JSON export/import. New HTTP assets are not a single-file offline package; existing `arcade.html` is the offline fallback.

## Verification policy

Record cold/HTTP-cache conditions, first interactive time, actual renderer dimensions, browser/device, workload, P95/P99 frame intervals and memory/resource trends. Test performance with the normal animation loop and real elapsed time. Control-driven fixed-step tests prove behavior, not FPS. A driver may choose controls from observed state but may not teleport vehicles, award hits or manufacture results. Pixel-perfect engine parity and engine performance rankings are not claimed.

## Historical 7.0 foundation delivery status

- A complete: independent native Babylon lobby; 103 Node checks include all 72 event/difficulty completions, render independence and protected source hashes.
- B complete: native keyboard/mouse race completion; six rendered PlayCanvas results exactly match Babylon for time, score, checkpoints and collisions.
- C complete: all 72 combinations rendered to results and recorded; all four native input flows reach results and next event. Eight portrait/landscape touch flows and four cancellation cases pass.
- D complete for 7.0: 56 browser checks, 24 native input/touch checks and 8 lifecycle checks pass. All 13 sequential normal-RAF performance cases pass. A real 1200.2-second, 16-segment soak completes with all banks successful, stable matched-scene GPU resources, intact campaign saves and unchanged runtime fingerprints. Six protected-entry smoke/regression checks also pass, including 29 existing campaign assertions. These historical conditions and limits are recorded in [the 7.0 baseline](verification/7.0-baseline/REPORT.md).

### Pinned PlayCanvas lifetime compatibility

`playcanvas-lifetime.js` keeps the original vendor bundle byte-for-byte intact and applies cleanup corrections only to this renderer's graphics device. The 2.22.1 [vertex buffer destructor](https://github.com/playcanvas/engine/blob/v2.22.1/src/platform/graphics/webgl/webgl-vertex-buffer.js) does not delete a single-buffer VAO. The [render target destructor](https://github.com/playcanvas/engine/blob/v2.22.1/src/platform/graphics/webgl/webgl-render-target.js) does not delete an unshared MSAA depth buffer and calls a renderbuffer deletion function on MRT framebuffer pairs. The adapter completes those releases and clears the native instancing VAO cache when replacing a venue. Three repeated four-circuit rebuilds now produce the same live Buffer, Texture, Framebuffer, Renderbuffer and VertexArray counts. Keep the compatibility module tied to this exact engine version; reevaluate it when upgrading.
