# Character and animation polish — October 17, 2026

## Implemented

The audit found working collision/stance hitboxes, ADS and reload insertion logic, but characters were primitive articulated meshes without skeletons or authored animation. Those gameplay systems remain authoritative. The new rendering layer uses independently cloned Quaternius skinned humans and calibrated authored clips; root motion never moves collision bodies.

Clothing uses locally bundled denim base-color, OpenGL normal and roughness maps, muted jacket/jean variations, gloves, skinned boots, hair, face/eye textures and original scarves/team motifs. Forearm-only geometry supplies first-person hands without a visible head/torso. Rifle, pistol and knife retain the project's detailed original geometry; static weapon pieces are merged by material.

Locomotion phase follows actual travel, with separate backward/strafe classification, smooth clip weights, start/stop blending, capped bot turns, leg/torso steering, authored jump/landing/hit/death and bounded arm/foot placement. Stationary actors do not continue walking. Prone/crawl, rifle grips and reload poses use procedural constraints over the shared skeleton. Team variants share geometry/textures but own bones, mixer/actions and tint materials. Distant visual poses update at 15Hz beyond 24m; simulation and hits remain full-rate.

Automatic reload defaults on and is persisted in Settings. The last shot resolves first; the next eligible simulation tick starts the same reload used by R. It waits for weapon/stance readiness and exits sprint over 0.15s. Magazine insertion at 68% transfers ammunition once. Cancellation before insertion preserves reserve; cancellation afterward preserves inserted ammo. Empty reloads operate the bolt/slide, with the firing hand reaching the action after the support hand inserts the magazine. Death cancels; pause freezes; overlay/focus changes clear held attack. The automatic rifle can resume held fire after completion; pistol requires a new press. No player weapon auto-switch occurs. Bots retain their existing reserve-exhaustion fallback.

ADS has its own sensitivity slider. Sight alignment remains tested in all stances; nearby pitched cover lowers the weapon and exits ADS. Existing wall/barrel occlusion remains authoritative. Reduced Motion removes incidental visual motion while preserving stance/reload information.

Visual review corrected mismatched rest-pose retargeting at the ankles, open fingers, garment shader cloning, a restart lookup for the armed action, crouch/prone head alignment, boot/pant seams and bolt hand placement. The workshop keeps the final death pose visible for inspection.

## Automated verification

- `npm test`: **53 passed**, including automatic/manual reload equivalence, zero/partial reserve, insertion boundaries, sprint/pause/switch/death constraints, motion cadence, independent skeletons, restart/death action restoration, first-person wrist targets, posture head regions and asset checksums.
- `npm run build`: passed TypeScript and production bundling. Vite reports a 500kB chunk-size advisory (Three.js and game bundle); no build failure.
- `/tests/browser.html`: **37 passed**, using actual game systems. Includes 20 spawn candidates, 1,256 navigation nodes / 7,592 directed edges, physical bot route traversal, previous under-map regression, stance/collision/ADS, blocked shots, healing, scoring, alive counts, overlays/focus loss, automatic reload, 90-second and complete accelerated matches, and restart resources.
- Raw results and timing samples are beside this report. Production smoke results are in `production-checks.txt`.

## Visual inspection and limits

Actual rendered workshop views were inspected from multiple angles for idle, walking, backward movement, strafing, running/sprint, turning, crouch, prone, airborne, hit, reload and death. First-person rifle/pistol ADS, magazine removal, empty-reload action reach and crouch/prone ADS were inspected. Saved JPEGs are evidence from the application, not concept art.

This remains a stylized indie character treatment. One body/face is varied through materials/accessories; it is not a bespoke photoreal character roster. Strafe/backward clips are derived; prone/crawl and firearm upper-body poses are constrained procedural work, not a complete authored rifle animation library. Foot placement is bounded and does not solve every uneven-slope contact. The original procedural fallback remains if local rig loading fails. No new map or networking was added.

No native pointer-lock mouse-feel or live audio-localization playtest was completed in the embedded browser. Automated simulation and visual captures are reported separately from manual gameplay. Short embedded-browser performance samples do not establish sustained thermals or a verified MacBook Air chassis benchmark.

Sources, licenses, modifications and file hashes: [attribution](../../ATTRIBUTION.md), [asset manifest](../../public/assets/manifest.json). Quaternius Standard characters/animations and Poly Haven denim are CC0. All runtime files are local; no paid assets or additional npm dependency.

## Measured performance

Apple M4, 16 GiB RAM (processor/memory read from this machine), embedded Chromium 155 on macOS. Laptop chassis, power mode and thermal conditions were not established. Single active test tab, live eight-actor match, stationary market camera with normal deaths/respawns, two 20-second samples at 1280×720. Frame intervals include simulation/render scheduling, rather than isolated GPU timer queries.

| Sample | DPR | Mean interval | Mean FPS | Largest interval | Frames over 33.3ms | Final-frame calls / triangles | GPU geometries / textures |
|---|---:|---:|---:|---:|---:|---:|---:|
| high | 1.25 | 16.67 ms | 60.00 | 17.8 ms | 0 | 226 / 146,772 | 575 / 75 |
| low | 1 | 16.74 ms | 59.75 | 99.9 ms | 1 | 338 / 138,534 | 624 / 75 |

Final-frame counts vary with visible actors, shields, shots and respawns; they are snapshots, not average draw counts or a controlled same-pose comparison. Character GLB/maps readiness: 682.9 ms; environment maps: 864.2 ms in this local cached development run. Production smoke reported 569.6 ms for characters and 933.8 ms for environment maps. These are asset-promise times, not cold internet download or full time-to-interactive measurements.

Three warm restarts held GPU resource counts at 624 geometries / 75 textures, with 8 actors, 32 impact/tracer slots and 24 shells. The roughly 3.5 MiB character bundle is local.
