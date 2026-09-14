# Physical-device and first-player acceptance / NOT YET EXECUTED

This checklist is a deliverable, not a claim that these devices have been tested. Browser emulation verifies event handling and layout only. Use the in-game H > Performance recording panel to start/export a run. Record exact game SHA-256, OS/browser version, device model, viewport, orientation, chosen quality/FPS, power mode and whether the renderer says WebGL or CPU COMPATIBILITY. Do not enter personal identifiers.

## Device matrix to fill in

| Device | Target | Status |
| --- | --- | --- |
| Desktop integrated GPU, current desktop browser | stable 60 FPS as a target, not a guarantee | pending |
| Mid-range Android Chrome, landscape and portrait | stable 30 FPS first | pending |
| Recent iPhone Safari, landscape and portrait | stable 30 FPS first | pending |
| Optional high-end desktop/mobile | compare high tier and 60 FPS | pending |

## Normal play, no debug API

Start with no manual, select a route, locate and board the vehicle, reach the warehouse, use the terminal, take cargo and return to settle. Run at least two alternatives, including one road/sea route and one flight route. Do not move actors using DevTools, change health/ammo, kill enemies via functions or advance task stages manually. Record route, attempts, first confusion, deaths and whether the player can explain why delivery failed or damage happened.

## Touch and accessibility

Move/aim/fire simultaneously. Cancel touches by opening pause and switching apps; nothing should remain held. Hold the weapon selector, choose/cancel, crouch/vault and interact. Tap fighter lock, release the finger, adjust throttle once and verify it stays set while steering/firing. Toggle flight mode and free look. Rotate the phone during menu and gameplay. Check cutouts/safe areas, controls blocking the view, text readability, tap sizes, screen shake disabled, and visibility of non-color warning cues. This is not a WCAG compliance certificate.

## Continuous 20-30 minute run

Capture a cool-start baseline, then a road mission, a combat challenge, an air challenge, boat travel and three map switches. Repeat enough to observe sustained load. Export periodic records at 5, 15 and 25 minutes. Compare slow-frame distributions, long tasks, heap/scene counts and resolution drops; watch heat, browser tab reloads, touch responsiveness and battery impact. Avoid confusing heap changes caused by collection with a leak. A two-minute idle browser run is not a substitute.

## Persistence and recovery on a real origin

Serve from one stable HTTP/HTTPS origin. Save at each mission stage, reload that URL, verify route, guards, car/boat position and cargo state. Confirm the same delivery cannot pay twice. Test denied storage/private mode and JSON export/import. Test old supported V5 import. Switch away/back, lose focus, change orientation, restore an interrupted mission. If WebGL context is lost, document behavior rather than labeling it recovered without observation.

## Pass gates

No task blocker; no input stuck after release/cancel; two normally played approaches completed; no duplicate payout; geometry/HUD stay aligned; no projectile disappears due to the visual-effect budget; the quality mode does not change damage or navigation rules. Judge timing against the chosen device/tier and report actual measurements. Any blank page, context loss, recurring long stall, broken save or inaccessible action remains a release blocker for that environment.

## Evidence

Keep exported diagnostic JSON, a short screen recording with consent, device/config metadata, and observed failures. Do not upload recordings or telemetry automatically. No background analytics are implemented. Report measured results and pending cells separately.
