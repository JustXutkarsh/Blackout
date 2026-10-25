# Village reliability and presentation polish

Verified locally before publication on 25 October 2026. The implementation and evidence are included in the accompanying Git commit.

## Reproduced environmental-death cause

There was no existing fall-height damage calculation. The reported short-drop problem was reproducible through the solid-penetration guard instead:

- Drop from feet `(-16.7, 2.7, 8)` beside the balcony ramp. Side collision inflated the wedge by the actor radius, but floor support only tested the feet center. The old solver landed at `y=0`, grounded, with `clearance=false`. After 0.25s of this state, the player was killed for penetration. A 2.5s probe accumulated approximately 2s of invalid grounding.
- A diagonal variant at a test ramp's high corner, `(-2.25,3,-0.25)`, reproduced the same mismatch: grounded at zero inside the inflated side bounds. Floor support now uses the same conservative footprint for straight edges **and corners**. The fixed probes land on the actual wedge support and remain collision-free.

Actor positions already represented feet. Standing/crouch/prone eye offsets, ordinary landing velocity reset and respawn velocity reset were inspected and preserved. The main ground slab was present. The old −8m plane was not the demonstrated short-drop cause; it is now −30m, below all intended terrain (lowest ground 0m).

## Implemented fixes and design changes

`FallState` tracks unsupported feet descent from the airborne peak, independent of camera/stance height. Up to 3m is free; 3–10m uses a smoothstep damage curve from zero to 100 HP; 10m is lethal. Landing damage is consumed once. Grounded steps/ramps do not accumulate a fall; respawn/recovery resets descent and velocity. Player and bots share the policy in `CONFIG.falls`. Damage interrupts healing normally, and environmental deaths never award enemy kills. Persistent invalid penetration remains a diagnostic death path, with a grace period, rather than a live recovery teleport.

Development F3 and `window.__BLACKOUT__.deathLog` expose bounded records with reason, feet/last-supported positions, fall distance/velocity, grounding, floor, clearance and nearby colliders. The log holds at most 24 records, clears on match start and records nothing in production.

Both elevated lookouts, their dedicated stairs, colliders, navigation anchors, cover goals, labels and bot behaviors are removed. Cedar Court has ground-level stone paving, a bench and planters; Co-op Loading has paving, a delivery vehicle and storage cover. Small decorative plants/sign supports do not add frustrating tiny collision. Redundant poles were removed from these approaches. The 72×50m footprint, market, warehouse and three-route layout remain.

Live traversal also exposed a navigation attachment fault: a bot beside the warehouse ramp chose a closer node 0.6m above it, even though it could not climb directly onto that node. The graph edges themselves were valid. Start attachment now checks up to eight nearby candidates using the real movement solver before planning. The formerly failing live route now succeeds without teleporting or privileged target knowledge.

Rifle ADS uses a smaller thin-walled original optic, a short physical mount, clear low-tint glass, adjustment detail and one small red dot. Oversized iron posts below it were reduced. Pistol front/rear sights were floating above the slide; they now attach to it, use a proper rear notch and small inserts, and align at `CONFIG.pistolSight`. A rendered-pixel test proves the optic center is red. Geometry checks align the rifle dot and both pistol sight tips in standing/crouched/prone poses. ADS FOV is modest: 80° → 72° rifle / 74° pistol. Hold RMB / X toggle remains authoritative, including reload return and lifecycle clearing. Grip, reload/ammo timeline and world/barrel occlusion remain intact.

Confirmed enemy firearm damage produces nine localized, depth-tested particles for 0.28s from the actual hit point, with outward motion, a clearer open-center four-tick marker, headshot variation, short confirmation audio and rate-limited directional cosmetic reactions. The pool is capped at 64. Blood Off retains neutral particles, markers and sound. Invalid contacts/misses/shields/friends/knife produce no blood; hitboxes and movement are not stunned. Ejected cases were reduced from oversized 10cm geometry to approximately 3.5cm.

HUD, menus, settings, pause, respawn, scoreboard and results now share charcoal panels, readable white type, restrained team accents and consistent spacing. Settings use a compact two-column layout. Gameplay controls live in help/pause, with no permanent banner. Maps use shared geometry, validated navigation route lines, building outlines, elevation and collision-avoiding labels. Enemy information remains limited to expiring audible-shot pings.

## Automated verification

- **66 unit tests passed**: fall thresholds, single landing/consumption, resets, stair/body-height behavior, straight/diagonal ramp-edge drops, environmental attribution, reachable navigation attachment, plus prior rules, reload, aim assist, character independence, stance and coordinate checks.
- **37 browser integration checks passed**: all 20 spawn candidates, every graph edge, live traversal through all main routes and the market/court, under-map/camera regressions, world-blocked shots/melee, stances/ADS, healing, ammo/reloads, teams, scores/alive counts, respawn, overlays, full matches and repeated lifecycle use.
- **17 tactical browser checks passed**: actual player/bot fall outcomes, diagnostic records, free short drops, sampled node jumping, removed elevated footprints, rifle/pistol alignment and controls, actual red-dot pixel, damage-only/bounded effects, and three 180s AI-seed simulations.
- Production build/type check and `git diff --check` pass. Vite retains its advisory for the main JavaScript chunk exceeding 500kB. All 21 manifest runtime files and SHA-256 hashes match `dist/`.

Physical fruit-market occupancy after the repairs (not graph reachability):

| AI seed | Blue entries / seconds | Orange entries / seconds |
| --- | --- | --- |
| 90210 | 4 / 17.3 | 7 / 49.1 |
| 17 | 7 / 48.8 | 3 / 22.9 |
| 451 | 6 / 52.5 | 6 / 35.7 |

AI seeds control route decisions, but firearm spread uses additional randomness; exact counts may vary. Both teams enter the market in every recorded run. Raw outputs are stored alongside this report.

## Measured performance and lifecycle

Apple M4 / 16 GiB, verified from this machine; embedded Chromium 156 on macOS, 1280×720. The exact laptop chassis, power/thermal state and background applications were not controlled. These are short local samples during the polish pass, not sustained MacBook Air benchmarks. One owned active test page, eight-actor match, stationary market camera, normal combat/respawns, 20 wall-clock seconds per preset. Intervals include CPU/render scheduling, not isolated GPU timer queries.

| Preset | DPR | Mean interval / FPS | Maximum interval | Frames >33.3ms | Final calls / triangles | Geometries / textures |
| --- | --- | --- | --- | --- | --- | --- |
| high | 1.25 | 17.44ms / 57.35 | 100.0ms | 34 / 1148 | 250 / 148,692 | 679 / 77 |
| low | 1 | 16.98ms / 58.90 | 150.9ms | 11 / 1178 | 307 / 97,154 | 709 / 77 |

These are final-frame draw snapshots, not averaged draw counts or a controlled same-pose comparison; visible actors and effects differ. Stalls are retained in the results. Three warm restarts held **709 geometries / 77 textures**, 8 actors, 32 shot effects, 24 shells and 64 hit particles, with zero active hit particles after reset. A separate regression checks RAF/actor-array reuse.

Cached development asset-readiness intervals: characters 1115.6ms, 15/15 environment maps 1479.0ms; no failures. These are not full startup, cold-download or time-to-interactive measurements.

## Visual inspection and limits

Screenshots and source-driven fixtures are distinct from manual gameplay. Rifle/pistol ADS, repaired courtyard/loading areas, blood/neutral hits, HUD and full map were rendered and inspected. Main menu, two-column settings, pause and full map were inspected in the production preview; respawn/results/scoreboard were inspected through the existing UI in development fixtures. Results use the authoritative time-limit outcome calculation. Production loaded 15/15 material maps and the character rig with no failures or blocking console errors. Off/Blood-disabled settings survived reload, then original preferences were restored. A 1024×768 CSS-viewport check kept the map panel fully within bounds; the temporary override was reset. Closing the paused map returned to pause with ammo unchanged. Embedded pointer lock was rejected and safely retained pause. The captured live market observer frame has no close bot; market occupancy claims come from the physical simulations. The observer fixture alone uses prolonged protection to permit inspection; normal matches retain 2s. Native pointer-lock mouse feel, live audio localization, long-run balance and thermals were not manually played or validated in this embedded browser.

No new third-party model, texture, sound or dependency was added. Existing local CC0 Quaternius and Poly Haven content is reused; optic/sights, courtyard/loading props, UI and effects are original project work. Sources and licenses remain in `ATTRIBUTION.md` and `public/assets/manifest.json`.

The environment and characters remain stylized original/CC0 indie assets. Conservative prop collision, bounded posture hitboxes and procedural prone/reload overlays remain; there is no claim of photorealism, full terrain IK or skinned-mesh shot collision. The persistent-penetration guard can still report genuine invalid geometry states rather than silently relocating living actors. Long-run human playtesting is still needed.

## Capture index

- [Main menu](main-menu.jpg), [settings](settings.jpg), [pause](pause-menu.jpg), [respawn fixture](respawn.jpg), [scoreboard](scoreboard.jpg), [results fixture](results.jpg)
- [Cedar Court](cedar-court.jpg), [Co-op Loading](loading-area.jpg), [market observer](market-live.jpg)
- [Rifle ADS](rifle-ads.jpg), [pistol before](pistol-before.jpg), [pistol ADS](pistol-ads.jpg), [blood hit](blood-hit.jpg), [neutral hit](neutral-hit.jpg)
- [Production map](production-map.jpg), [1024 CSS viewport](full-map-1024.jpg)

Run locally with `npm install`, `npm run dev`; production with `npm run build` then `npm run preview`. This pass added no network dependency or runtime asset service.
