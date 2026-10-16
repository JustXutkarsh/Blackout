# Himalayan market / stance upgrade

16 October 2026. Upgrade of the existing Mountain Turf repository; original TDM, healing, respawning, weapons, settings, scoreboard and map systems retained.

## Implemented

- Measured the previous ground bounds: 60 × 50m = 3,000m². Added a 12m western strip, giving 72 × 50m = 3,600m² (**20%** larger). Existing buildings were not scaled. Shared boundaries, ground/foundation, navigation, collision, map footprints and labels expand together.
- Nima Fruit Lane, Ridge Harvest and Kora Tea: instanced apples/oranges, curved bananas, striped watermelons, timber trays/crates, baskets, weighing scale, kettle/cups, faded striped awnings and readable price boards. Counters/crates provide solid cover; produce/cloth do not create collision traps or block shots.
- Juniper Court: raised residential court, timber balcony/supports, roof tank, storage and three ramp connections. Market lane and court form a loop from the existing village street, preserving warehouse and hillside routes.
- Repair corner, parked scooters/bicycle, delivery handcart, drain grates, utility poles/cable and bounded dust. Subtle awning movement and occasional sign creaks; no vendor voices or civilian NPCs.
- Existing local stone/plaster/timber/dirt/metal PBR materials reused. New original striped fabric and watermelon textures are generated locally. Muted jackets, scarves, knit caps, pockets and restrained team patches replace the previous helmet emphasis.

## Stance / combat audit and fixes

Previously crouch changed the collision height immediately while only the camera interpolated; third-person posture remained upright. Combat/perception also used standing-height eye offsets. One `Stance` timeline now drives body height, camera, movement, model pose and hitboxes. Foot position remains stable. Crouch takes 0.28s, prone 0.65s; a short cooldown prevents repeated toggles. Movement and attacks pause during the transition.

C toggles crouch/stand, or requests crouch from prone. Z toggles prone/stand. Space from a low stance requests standing and consumes that press, so it does not immediately jump. Shift requests standing before sprinting. Blocked requests preserve the last valid state. Respawn resets standing. Pause freezes simulation and animation timers.

Prone uses a horizontal capsule footprint (0.28m radius, 2.23m total length), sampled along its length/width for support and solid clearance. Turning checks the swept orientation. Crawling cannot cross walls or unsupported ledges. More than 10cm height variation across the body rejects prone support, including unsuitable stairs/ramps. Transitions to/from prone conservatively require the entire swept footprint at the larger body height; this can reject tight spots even when a human could maneuver there.

Camera and firearm origins use the same posture-derived eye position. Low elongated prone head/torso hitboxes replace standing hitboxes; crouch hitboxes shrink with the model. Prone gets slower movement and a modest spread benefit. Bots use the same pose/collision/hit logic; their AI crouches near low cover and stands before moving. Autonomous bot prone selection remains disabled to preserve movement reliability and combat momentum.

Both firearms support ADS in every stance. Sights align to the actual shot axis; idle sway fades out during ADS. Reload/stance transitions leave ADS temporarily, returning if RMB remains held. Switching clears RMB. Existing insertion/ammo-transfer, removal, empty bolt/slide, switch lock, sprint and death rules remain intact. The status HUD adds stance/transition feedback; Field Guide documents the controls. F3 now shows oriented prone body envelopes as well as floors, feet, camera and support state.

The earlier under-map fault stays fixed: a ramp-side overlap plus a zero-distance upward ray had assigned a negative eye height. The new eye timeline never uses that obstruction ray. The exact intrusion regression, validated spawns, movement substeps and environmental-death recovery remain active; no live player recovery teleport was added. [Prior root-cause evidence](../verification/REPORT.md).

## Automated verification

- `npm test`: **39 passed** ([output](unit-checks.txt)). Includes stance directions/timelines, ceiling rejection, unsupported prone entry, swept corner rotation, crawl collision, steep ramps, adjoining floor seams, posture hitboxes, eye containment and all earlier rules/assets/physics regressions.
- `npm run typecheck`: passed.
- `npm run build`: passed. Production JS is approximately 630kB / 171kB gzip. Vite retains its >500kB bundle advisory.
- Browser harness: **31 passed, zero failures** ([output](browser-checks.txt)). All 20 spawn candidates, all 7,592 navigation edges / 1,256 nodes, physical bot trips through market/court/new landing and old routes; C/Z/Space/sprint controls; standing/crouched/prone ADS for both firearms with projected sight alignment; low hitboxes; reload/stance/switch/pause/death interactions; occluded firearm/knife attacks; healing, protection, alive counts, scoring and results; overlays; accelerated 90s and complete matches; three restarts.
- Production UI initialized with eight correct combatants. Play safely paused when embedded-browser mouse capture was rejected. Clicking the paused minimap opened the full map; closing returned to paused state with Resume visible. Updated Field Guide was inspected.
- Production loaded all **15 bundled PBR files**, zero failures and zero captured console warnings/errors. Warm local texture load was **951.2ms**, measured from first texture request to completion, not total startup or cold-network load ([data](production-startup.json)).

## Visually inspected

Actual 1280×720 browser renders, captured from the development pose harness:

| View | Evidence |
| --- | --- |
| Market / hip weapon | [image](market.jpg) |
| Residential court / balcony / tank | [image](court.jpg) |
| Connecting market terrace | [image](marketsteps.jpg) |
| Original hillside | [image](hillside.jpg) |
| Crouched ADS | [image](crouchads.jpg) |
| Prone hip / ADS | [hip](prone.jpg), [ADS](proneads.jpg) |
| Standing / crouched / prone team models | [image](stances.jpg) |
| Reload magazine removal | [image](reload.jpg) |
| Updated full map | [image](map.jpg) |
| Production paused map | [image](production-map.jpg) |

Inspection prompted a balcony railing/support correction, clearer stall signage, fabric stripes, less distracting drain color, stance-sized contact shadows and removal of a duplicate coplanar ground slab. Ground remains visible beneath crouched/prone viewpoints. These are paused pose captures; their HUD FPS may include startup and is not a benchmark.

## Performance measurements

Local `sysctl`: Apple M4, 17,179,869,184 bytes RAM (16 GiB). Chassis was not independently identified as a MacBook Air. Codex in-app Chromium 155 on macOS, development server, 1280×720. One game tab, eight-combatant real-time match, player starts at the market with no movement input; normal damage/respawn remains enabled, so camera location and final-frame geometry can change. Audio context uninitialized. Samples measure RAF wall-frame timing, not GPU timer queries or sustained thermal performance.

| Final 20s sample | DPR | Frames | Mean frame / FPS | Maximum | Frames >33.3ms | Final calls / triangles | Geometries / textures |
| --- | --- | --- | --- | --- | --- | --- | --- |
| High | 1.25 | 1,200 | 16.6665ms / 60.0006 | 17.8ms | 0 | 654 / 75,148 | 504 / 35 |
| Low | 1.0 | 1,200 | 16.6664ms / 60.0009 | 17.8ms | 0 | 110 / 34,464 | 438 / 32 |

Raw: [high](high-sample.json), [low](low-sample.json). Counts include shadow/weapon rendering; resources first entering view and shader variants explain differences between samples. They are counts, not memory bytes. Three warm restarts retained **505 geometries / 35 textures**, eight actors, 32 effects and 24 shells ([data](restart-resources.json)). Constructor listeners and the RAF loop are reused, not registered on restart.

Initial high at DPR 1.5 measured **39.45 FPS**, 25.35ms mean, 134.3ms maximum, 224 frames >33.3ms ([raw](high-initial.json)). An initial low run measured 55.86 FPS with 51 frames >33.3ms and 82.5ms maximum. High DPR was reduced to 1.25, and the final samples above were collected afterward. Desktop activity, cache/shader warming and changing encounters also affect these results; this is not a controlled proof that resolution alone caused the improvement. High/low preserve target readability. Configured drawing-buffer budgets are 1.8M / 1.2M pixels.

## Assets and remaining limits

Five existing Poly Haven **CC0** PBR sets remain bundled. All market meshes, produce, fabric/melon canvas textures and clothing/posture changes are original project content. No new downloaded model, paid dependency or remote runtime asset was added. [Attribution](../../ATTRIBUTION.md) and [manifest](../../public/assets/manifest.json) record provenance and modifications.

Manual human gameplay was **not performed**. Embedded browser pointer lock was rejected; automated game-system/input checks and real rendered inspection do not establish mouse feel, live audio localization, balance or long-session thermals. Characters/weapons remain stylized procedural models; prone/crawl uses joint poses rather than terrain IK or motion-capture blending. Prone can feel conservative near walls/ramps; small curved cover uses simple collision. No networking or civilian NPCs.
