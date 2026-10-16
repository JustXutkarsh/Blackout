# Mountain Turf visual / ground verification

Date: 16 October 2026. Changes preserve the existing 4v4, 40-elimination / eight-minute TDM rules.

## Reproduced fault

At `(-16.5, 0, 4.5)`, the west side of the village balcony ramp, the old solver considered a ground-level body unblocked. The upward camera-clearance ray started inside the solid ramp wedge, returned distance zero, and assigned an eye height of -0.03m. The resulting screenshot reproduces the reported blue lower region, exposed ground surface, raised buildings and visible gun/HUD: [before](before/ground-repro.jpg).

The ramp check now includes body radius; route construction uses that corrected solver. Camera height derives from the collision body's feet and height, with crouch interpolation clamped inside it. Feet-level ray hits no longer move the camera. Public movement calls substep by both 1/120s and 0.12m travel, including unusually fast falls and frame deltas. A continuous ground slab overlaps a deeper foundation. All 20 spawn candidates are checked for footprint support and full standing headroom. Invalid player positions cause environmental death and normal respawn, with the dead camera at the validated last-safe position; no live recovery teleport hides failures.

F3 in development shows solid bounds, ramp tops, actor bounds, feet and camera markers, and numeric grounded/support state. It is excluded from production.

## Automated checks

- `npm test`: 30 passing focused tests (including exact ramp-side reproduction, camera height, fast fall / thin floor, wall tunneling, adjoining floors, support/headroom, original combat/healing/map rules, asset license records and file checksums).
- `npm run typecheck`: passed.
- `npm run build`: passed. Vite reports the usual >500kB single-bundle advisory; no build errors.
- `/tests/browser.html`: 26 passing checks using actual game systems. All 20 spawns, all 6,277 navigation edges, physical bot trips to every zone, ADS/crouch, firearm/melee occlusion, magazine event timing, switching, pause/sprint/death reload behavior, healing/protection/respawn/alive counts, scoring/results, map/scoreboard input, environmental recovery, 90s and full-match accelerated simulation, and three restarts were exercised.

## Visual evidence

Fixed-camera captures are paired in `before/` and `after/` for street, warehouse exterior/interior, hillside, rifle hip, ADS, reload and full map. Baseline images include the old development controls; final captures hide them. Courtyard review was done before expanding the detailing pass. The initial courtyard camera intersected a parked vehicle; final courtyard framing was corrected and is not presented as a matching-angle comparison.

Environment improvements include locally bundled stone/plaster/timber/dirt/metal PBR maps, correct color/data spaces, meter-based tiling, timber wall framing and roof supports, corrugated roof geometry and visible undersides, loading shutters, detailed windows/shutters/doors/awnings, vehicle wheels and trim, retaining-wall detail, grounded vegetation, layered mountain ridges and inexpensive contact shadows. Warm sunlight, sky fill and low-intensity filtered environment lighting preserve shaded visibility.

First-person models now use shaped extruded profiles, rounded parts, cylindrical barrels, a curved magazine, grip/trigger/sight details and gloved/sleeved arms. Reload removal/insertion/bolt events remain driven by the ammunition state. Team characters use articulated limbs, distance-driven gait, idle breathing, aim/recoil/reload poses and a short death collapse. These are original stylized models, not photorealistic humans or motion-capture assets.

The HUD uses compact charcoal panels, a slim team strip, smaller minimap/alive counts/feed/health/ammo, and an onboarding hint that fades after 12 active seconds. Controls remain in the main menu and pause Field Guide. Full map, scoreboard, settings and reduced-motion options remain available.

Five CC0 material sets (15 local JPEGs, approximately 8.9 MiB) are documented in [ATTRIBUTION.md](../../ATTRIBUTION.md) and [the manifest](../../public/assets/manifest.json). No third-party character, weapon, building or animation model is bundled. Core gameplay makes no external asset requests.

## Measurement conditions

Local `sysctl` identifies Apple M4 and 17,179,869,184 bytes RAM (16 GiB). MacBook Air chassis was not independently identified. Browser: Codex in-app Chromium 155 on macOS. Development server, 1280×720 viewport, stationary player camera, eight-combatant real-time match, sound context uninitialized. Twenty-second samples are RAF wall-frame timing, not GPU timer queries or thermal-soak measurements. Draw calls/triangles/resource counts are the final sampled rendered frame, including the weapon scene and shadow work where enabled. UI automation and other desktop activity can affect results.

Raw measurements: [high](high-sample.json), [low](low-sample.json). See the final table below.


| Preset / final isolated sample | DPR | Frames | Mean frame / FPS | Longest frame | Frames >33.3ms | Final draw calls / triangles | GPU geometries / textures |
| --- | --- | --- | --- | --- | --- | --- | --- |
| High | 1.5 | 1,200 | 16.666ms / 60.003 | 17.8ms | 0 | 498 / 43,890 | 470 / 24 |
| Low | 1.0 | 1,200 | 16.667ms / 60.000 | 17.7ms | 0 | 298 / 28,212 | 483 / 25 |

Final isolated raw data: [high](high-isolated.json), [low](low-isolated.json). These use one running game instance. Earlier samples with another live preview open recorded 55.5 FPS high (49 frames >33.3ms, maximum 133.3ms) and 60.0 FPS low. They are retained in the initial raw files above, rather than omitted. Differences in final resource totals include geometry first entering the frustum, transient effects and high/low shader variants; they are not memory-byte measurements.

After warming both presets, **three restarts retained 483 GPU geometries and 25 textures**, eight actors, 32 effects and 24 shells: [resource evidence](restart-resources.json). Simulation/listener registration occurs once in the constructor; restarts reuse the same actors, scenes and RAF loop.

## Captures

| View | Before | After |
| --- | --- | --- |
| Village street | [image](before/blackout-before-street.jpg) | [image](after/street.jpg) |
| Warehouse exterior | [image](before/blackout-before-exterior.jpg) | [image](after/exterior.jpg) |
| Warehouse interior | [image](before/blackout-before-interior.jpg) | [image](after/interior.jpg) |
| Hillside | [image](before/blackout-before-hillside.jpg) | [image](after/hillside.jpg) |
| Rifle hip | [image](before/blackout-before-hip.jpg) | [image](after/hip.jpg) |
| Rifle ADS | [image](before/blackout-before-ads.jpg) | [image](after/ads.jpg) |
| Reload removal pose | [image](before/blackout-before-reload.jpg) | [image](after/reload.jpg) |
| Full map | [image](before/blackout-before-full-map.jpg) | [image](after/map.jpg) |

[Courtyard](after/courtyard.jpg) and [repaired ramp diagnostics](after/ground-diagnostics.jpg) are additional review views. All comparison captures are 1280×720. The final HUD is shown after onboarding has faded; the baseline retained its controls banner. Shots are actual browser renders, not mockups.

## Manual verification limits

Rendered scenes, hip/ADS/reload poses, full map and diagnostics were visually inspected. The production menu initialized and loaded all local materials without console warnings/errors. Its explicit Play click reached a safe paused state when the embedded browser rejected pointer lock. Consequently, native pointer-lock mouse feel, continuous human aiming, live audio localization, and long-session thermal behavior were **not** manually verified. Automated input/state checks and real-time bot samples are distinguished from those manual gameplay checks. No MacBook Air chassis-specific performance claim is made.

Remaining visual limits: stylized original character/weapon rigs rather than scanned models; no skeletal animation blending or foot IK, no real-time reflections or screen-space ambient occlusion, conservative box collisions on small curved props, and simple layered distant terrain. The supplied third-party media are PBR textures only. The single production JavaScript bundle still triggers Vite's size advisory.

Final production warm-cache smoke run: all 15 texture maps ready in **739.9ms** from first texture request to load completion, zero failed assets and zero captured console warnings/errors. This is local HTTP on this machine, with cached files, not a cold-network loading claim: [startup data](production-startup.json). The earlier concurrent-preview production run took 3,818.4ms.
