# V6 implementation map

## Ownership

The release preserves V3-V5 modules for legacy worlds, vehicles and challenges. New responsibilities have explicit owners; some older adapters remain and this is not represented as a full engine rewrite.

| Owner | Responsibility |
| --- | --- |
| `experience-core.js` | Projectile admission limits, render snapshots, quality policy, optional asynchronous GPU timing, diagnostics |
| `harbor-world.js` | Connected coastal extension, static geometry/colliders, multi-height surfaces, piers, fleet spawn |
| `harbor-play.js` | Campaign state machine, payout ledger, guard perception/A* movement/cover scoring/attack slots, procedural avatar animation |
| `experience-input.js` | Campaign and diagnostics UI, input ownership, wheel, latching controls, brief/debrief |
| `experience-runtime.js` | Final update orchestration, model/HUD snapshots, transport adapters, campaign saves and recovery |
| `experience.css` | Responsive hierarchy, action panels, mobile flight/service controls |
| `tools/blender_harbor.py` | Blender authoring, portable GLB export, bounded indexed runtime pack and high/low LOD generation |
| `assets/blender/harbor-pack.js` | Generated offline model data, materials, logical joints, pivots and dimensions |
| `harbor-assets.js` | Lazy geometry decoding, GPU shape/material registration, instanced prop placement, vehicle presentation and reduced shadow meshes |

`build.py` defines module order and emits one inline script and style sheet. Mutable state remains local to the page.

## Harbor Club 6.4.0

`build.py` now emits two independent offline entries: `index.html` / `bundle.js` for the campaign and `arcade.html` / `arcade-bundle.js` for the club. Both inline the shared renderer and existing authored mesh packs. Only the campaign loads `mode-menu.js`; only the club loads its new asset pack and six arcade modules. The shared engine definitions load before the club overrides the delayed `init()` callback. Club initialization never calls the legacy world, actor, input or save initialization; `suppressSave` also prevents the inherited pagehide handler from writing campaign storage.

| Club owner | Responsibility |
| --- | --- |
| `arcade-data.js` | 24 event definitions, effective difficulty, equipment, versioned validated save, bounded records and awards |
| `arcade-world.js` | Four environments, track sampling, static GPU resource disposal, instanced props, first-person equipment and shared rendering |
| `arcade-games.js` | Fixed 120 Hz simulation, racing/AI/checkpoints, shooting/reloads, darts/checkout, ballistic arrows and wind |
| `arcade-ui.js` | Lobby, briefings, HUD, settings, pause, results, next event, records and save import/export |
| `arcade-input.js` | Sole club input owner, pointer lock/drag, keyboard, simultaneous touch, capture cancellation and blur |
| `arcade-bootstrap.js` | Own lifecycle, WebGL/CPU selection, loop and diagnostic surface `__club` |
| `tools/blender_arcade.py` | 10 editable assets, LODs, named rigid joints, standard GLBs and inline mesh pack |

`CLUB` owns gameplay state. Shared `player`, `cam` and `state` are a bridge for existing rendering utilities, not campaign actors. No player, enemy or pedestrian model is drawn. The club renders at up to 60 Hz, the lobby at 30 Hz, and paused/results at 12 Hz. Its 120 Hz accumulator caps catch-up at 18 steps; HUD text updates about every 75 ms. Rendering does not advance score or physics.

Projectile launch origins match visible dart/arrow tips and converge toward the camera aim plane. Prediction uses the same semi-implicit integration term as live physics. Embedded arrows follow moving targets through a local impact offset. Checkpoints require forward plane crossing in order; recovery returns to the previous gate with a penalty. Race ghost traces are playback-only and never participate in collisions or ranking.

Storage key `sunset-harbor-club-v1` is separate from campaign `sunset-run-v6-save`. Run difficulty, equipment and daily record key are frozen when starting. The validator limits records to 800, ghost traces to 24 × 8,000 samples and history to 24 results. Permanent records are retained when pruning old daily records. Runtime pools cap sparks/skids at 90, tracers at 12, embedded arrows at 30 (darts at 9), lap history at 50 and event logs at 600. Scene rebuilds delete replaced static buffers; classic mode deletes photographic targets. Existing shared mesh caches are reused.

`verify_arcade.py` distinguishes arranged rule fixtures, control-driven full event runs and native touch input. `verify_arcade_input.py` finishes four representative events using real mouse/keyboard events with only the clock stepped. `benchmark_arcade.py` runs the unmodified animation loop for wall-clock performance measurements. These tests use isolated browser storage. See `ARCADE_ZH.md` for player rules and editing.

## Simulation and presentation

The inherited fixed 60 Hz accumulator and eight-step catch-up ceiling remain. V6's update owner invokes movement, traffic, reload, camera, weapons, world tasks, combat and campaign once per step. The final render owner creates one interpolation snapshot for actors and camera. All models and target-label projections are generated inside it. Original simulation state is restored in `finally`; rendering must not accidentally move a collider. Camera shake applies only to the temporary render eye and is separate from ballistic recoil. It can be disabled.

## Gameplay capacity vs effects

Admission reserves up to 96 grenade/molotov/rocket/missile objects independently of up to 256 bullets/cannon rounds. No live gameplay projectile is evicted to make room for a new one. Player weapon admission is checked before ammo or heat is spent. When saturated, new fire is rejected until capacity returns. Visual smoke/particles remain disposable and never remove an existing damage object.

## Harbor

The harbor is connected to the coast near x=65..204, z=174..365. The base is near (94,345), terminal (111,254), cargo (124,241), sea berths x=187 at z=345/236 and helipads (76,344)/(80,205). Warehouse walls have real door gaps; ramp/catwalk surfaces include vertical collision bounds and an underpass. Geometry is uploaded during world construction before the collision index is built.

Guards separate facing/range/LOS perception from noisy positional hints. Hearing quantizes the location instead of leaking the exact player coordinate. A small bounded local A* graph handles route finding; cover scoring rejects exposed/unreachable candidates. Limited attack slots and readable windups create intervals to react. This is deliberately local AI, not arbitrary-city navmesh generation.

Campaign: approach -> terminal hold -> cargo hold -> extract. Terminal shutdown suppresses further alarm reinforcement. Quiet time is based on actual guard sight; delivery checks speed and landing state. Completion changes the service-point state and reward ledger. Free exploration and instant challenges remain distinct.

## Animation

The avatar is built from articulated procedural parts. Step length, knee/elbow IK, crouch and aim/reload pose blends use simulation state. Vaulting is a short clear-landing transition. This does not constitute an imported skeletal animation pack or motion matching. The Workshop vehicle assemblies use named Blender mesh groups and local pivots: front/rear wheels, the right entry door, main/tail rotors and outboard. Those rigid parts are driven by the existing simulation fields, not a new physics owner. The original 20 editing samples and the 14 portable Workshop GLBs remain static assemblies.

## Blender asset boundary

The Blender source has one scene per asset and a separate studio overview. Each high LOD is evaluated with modifiers and normals, then exported as both standard GLB and quantized indexed data; low LODs omit small details and simplify meshes while clamping vertices to each source object's bounds. Runtime positions use signed 16-bit millimeters, normals use signed normalized 16-bit values, and indices use unsigned 16-bit values. The build inlines the data so `file://` does not depend on fetch permissions. A mesh is expanded to the renderer's vertex layout only on first use, and then remains cached.

`harbor-assets.js` is loaded after the existing simulation modules but before the deferred `init()`. The four replaced vehicle kinds pass through the existing physics/collision/save paths. Custom imported car models retain priority. Harbor containers, crates and barriers preserve their original collider footprints. New forklift/drum props have bounded colliders away from mission entry routes. Static prop placements reset on every region build and are culled/instanced at render time. The cargo case remains tied to mission pickup state.

Authored surfaces bypass color-based roughness/metalness guessing in `InstanceBuilder`. Their material flag also excludes procedural wall/road grain. High-LOD mesh groups map to matching low-LOD casters for the shadow pass. Software rendering always selects the low models. A small distance hysteresis prevents repeated LOD switching near the boundary. None of these decisions changes damage, mission timing or collision state.

## Armory 6.2

`assets/armory/armory-pack.js` adds eight weapon assets via the Workshop mesh decoder and material/LOD registry. Its editable source is separate from the harbor scene. `armory.js` provides a shared pose for the held model, hand IK, muzzle and casing sockets. Receiver/grip placement, recoil and reload part offsets use the same fixed simulation clock. Enemy poses tolerate guards that have never fired. Cosmetic death snapshots are bounded and have no collision or reward authority.

`combat-sim.js` remains the owner of firing, collision, damage and live projectiles. It checks the segment from the player to the muzzle before converging with the camera aim ray. Pellet hits are grouped per actor and body/head region; the shotgun has distance attenuation. `updateReload8` owns reload ammo transactions: magazines commit at completion; shotgun shells commit individually and can be interrupted. Weapon switching cancels the active reload record. Region/encounter cleanup clears all cosmetic pools.

`armory-effects.js` renders staged bursts, ground flames, smoke trails and feathered marks. Vertex-alpha fans use `InstanceBuilder.soft`, a reusable ordinary vertex stream drawn alongside instanced transparent geometry; this is needed because the instanced material color has one alpha per instance. The CPU path writes the same fans directly into its ordinary builder. The extra stream is cleared per frame and excluded from shadow rendering. That effects module adds no image fetches or graphics library dependency; the subsequent 6.3 renderer adds full-screen post-processing.

Harbor container and crate colliders carry explicit `surface` values. Surface effects use hit normals and independently bounded particles/marks; reducing visual quality never deletes gameplay projectiles or fire damage. See `ARMORY_ZH.md` for part names, controls, geometry counts and re-export commands.

## Radiance 6.3.1

The 6.3.2 settings update keeps `QUALITY6` as the original 6.2 profile and stores the Radiance quality parameters separately in `RADIANCE9.quality`. The shared quality policy chooses by effect without resetting the adaptive tier or resolution. `setGraphicsEffect9` applies the choice, releases unused photographic targets when entering classic mode, and synchronizes the controls. Existing `radiance9` and `exposure9` save fields preserve compatibility; effect selection changes no simulation state.

`renderer-photographic-shaders.js` and `renderer-photographic.js` load after the armory. They extend the existing Renderer API, preserving the simulation owner, instance layout, mesh cache, quality policy and snapshot lifecycle. The spare per-instance material channel selects subtle authored-surface detail without changing exported roughness/metalness. Near shadow passes use full nearby geometry; far passes keep reduced casters.

Frame order: far/near shadow maps -> opaque normal/depth prepass -> half-resolution AO with bilateral blur -> HDR sky and opaque PBR scene -> opaque scene copy and water reflections -> existing transparent effects -> quarter-resolution bloom -> FXAA and AgX/sRGB output. AO attenuates indirect light only. Reflection rays use the opaque depth/color image with environment fallback. Small combat-light arrays are read from existing effects and have no gameplay authority.

The 6.3.1 calibration separates restrained sky color from stronger, more neutral diffuse fill, retaining reflection direction and material color. A mild display look preserves neutral greys and compresses out-of-gamut chroma. Water scattering/haze are calibrated separately.

The original analytical sky is baked to a six-roughness RGBM atlas plus diffuse convolution. It is embedded into the single-file build; raw HDR is retained only as an editing artifact. Half-float and depth extensions are optional. An LDR fallback applies exposure and AgX in the surface/sky shaders; unsupported depth effects are disabled. Classic rendering remains selectable. The graphics options round-trip through the existing V6 options payload with defaults for older saves.

Targets are reused until the canvas size changes, then explicitly deleted. High quality renders at a 1.25 scale under the existing pixel cap, while medium/low retain their previous scale. Render-only near planes improve depth precision without changing aim-ray directions or simulation cameras. `diagnosticReport6().graphics` records capabilities, actual active effects, local-light counts and target generations. See `GRAPHICS_ZH.md` and `tools/verify_graphics.py` for the tested compatibility branches and pixel-level checks.

## Quality and profiling

One quality policy selects per-tier land/air draw distance, primitive detail, shadows, resolution and visual effect budget. The V4 minimum-air-distance override no longer defeats V6 policy. Slow downgrade/recovery timers reduce oscillation. Rules, hit tests and task conditions do not depend on quality tier.

GPU elapsed queries are asynchronous and optional; unsupported or disjoint samples remain N/A. CPU compatibility has no GPU result. Recording stores samples, slow frames, long tasks, counts, errors, input counts and campaign events locally; export is explicitly user initiated. A bounded frame ring and capped history avoid unbounded diagnostic storage. This is instrumentation, not a frame-rate guarantee.

## Persistence and lifecycle

Versioned payload includes campaign/fleet/guard state and prior inventory/progression. Validation clamps imported values and checks recognized route/stage and checksum. It is a local prototype, not a security boundary. Storage failures back off for twelve simulation seconds rather than throwing every frame. World switches clear transient encounters; campaign switching is explicit. Low-speed disembarkation at harbor berths assists mooring so the original boat can be boarded for the return route.

## Limitations

No full engine migration, texture streaming, authored skeletal assets, multiplayer or professional vehicle simulation. Existing static-map travel remains. Desktop WebGL picture quality, offline rendering, rigid-part motion and short live frame sampling are covered by the Workshop checks. Physical phones, real deployed storage, 20-30 minute thermal runs and novice-human walkthroughs remain separate acceptance tasks.
