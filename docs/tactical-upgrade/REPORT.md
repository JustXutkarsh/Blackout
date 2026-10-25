# Tactical upgrade verification

Historical intermediate-version evidence collected on 17–25 October 2026, before publication. The elevated structures shown here have since been replaced; see ../village-polish/REPORT.md for the finished version.

## Market cause and physical fix

Market nodes already existed and were reachable. Patrol endpoints led back toward the warehouse, distant gunfire continuously replaced flank patrols with central last-known positions, and cross-route buddy following pulled bots off the market route. Baseline live-controller 180s simulations had zero market entries for seeds 90210 and 17; seed 451 had one Blue visit (6.7s), no Orange visits. See `market-before.json`.

Outer endpoints now traverse the market/residential court. Covered sounds have reduced hearing range; distant cross-lane sound memories do not repeatedly replace committed flanks. Buddy following stays within the same route. Destination scoring penalizes teammate crowding. Nearby/visible threats still override patrols. Stuck recovery uses physical sidesteps and replanning, with no live-actor teleport.

Final live-controller simulations (180 active seconds per seed; ordinary combat, deaths and respawns):

| Seed | Blue entries / seconds in market | Orange entries / seconds in market |
| --- | --- | --- |
| 90210 | 4 / 19.5 | 7 / 74.3 |
| 17 | 5 / 26.7 | 5 / 39.7 |
| 451 | 2 / 10.5 | 6 / 53.4 |

The simulation counts physical occupancy, not graph reachability. The AI seed is fixed, but combat uses additional random spread, so exact counts vary between runs. Roles remain distributed; results do not mean every bot visits each zone. F4 shows current paths and per-zone arrivals.

## Implemented features

- Navy jackets/light scarves with vertical accents for Blue; rust jackets/dark scarves with horizontal accents for Orange. Shared local fabric maps retain their shading; independent material clones prevent recoloring leaks. Restrained LOS-gated teammate diamonds supplement color. No permanent enemy outline.
- **Hold RMB / X toggle: Aim.** RMB temporarily overrides without changing X intent. Releasing returns to the toggle. X repeat is ignored. Sprint clears toggled aim; switching/death/respawn/pause/focus/capture loss and overlays clear intent. Reload temporarily exits and restores only valid remaining intent.
- Original compact rifle optic: clear lightly tinted glass and a small centered red dot; pistol sights remain separate. Geometry projection checks pass in all three stances. Hip crosshair hides in ADS. Existing barrel/camera world occlusion remains authoritative.
- Off/Light aim slowdown, Light default: ADS firearms, 38m range, 2.6° cone, up to 18% reduction. At most two target regions per actor, queried at 20Hz with frame-independent smoothing. Living, unshielded enemies only; distance-ordered LOS rejects walls/other actors. No camera rotation, shot magnetism, recoil or damage changes. F3 displays target/angle/visibility/factor.
- Confirmed enemy bullet damage emits six short-lived, depth-tested particles from the authoritative hit location. Their outward velocity keeps them visible outside clothing. Blood Off uses neutral particles; marker/audio remain. Headshots differ from body hits; elimination confirmation stays separate. Cosmetic flinches are rate-limited without changing hitboxes or stunning actors. The reusable pool is capped at 48 particles and resets on restart.
- Snowline and Ridgeback Lookouts: mirrored 2.4m platforms, timber supports, roof, rails, cover screens, main stairs and western escape stairs. Floors, collision, map footprints and labels share coordinates. Bots visit opportunistically with an approach timeout and short hold.

A live bot test caught a missing descending connection at a narrow tower landing despite the hand path itself being physically traversable. Hand-authored stair/landing anchors now join the grid only through physics-validated links. The actual bot controller climbs and descends both routes of both towers. Sampled deck-to-opposing-spawn rays showed zero exposed candidates (6 deck positions per tower × 10 opposing spawns). This is sampled protection verification, not proof of every possible exploit angle.

## Automated checks

- `npm test`: **58 passed / 0 failed**. Includes aim eligibility/cone/range/occlusion/smoothing/no-rotation, independent team material tinting, physical navigation links, plus existing rules/stance/reload tests.
- `npm run build` and TypeScript: pass. Vite retains its advisory about the main JS chunk exceeding 500kB. `git diff --check`: pass.
- `/tests/browser.html`: **37 passed / 0 failed**. All 20 spawn candidates, every navigation edge, physical main-route traversal, prior under-map regression, wall-blocked shots/melee, stance/ADS/reload, healing, scoring, respawning, overlays, full match and restart checks.
- `/tests/tactics.html`: **16 passed / 0 failed**, including the three seeded 180s simulations, RMB/X/lifecycle interaction, valid/invalid hit effects, bounded expiry, non-stunlock flinches, optic alignment, physical stair routes/deck stances/ceilings/rails, spawn sightlines and live bot ascent/descent.
- Warm restart: three cycles retained **689 geometries / 77 textures**, 8 actors, 32 shot effects, 24 shells and 48 hit particles; no active hit particles after reset. The gameplay regression also checks a single RAF and actor array reuse.

Raw outputs are stored beside this report. Production smoke: menus/daylight scene and match initialization render; Light/Blood defaults and Off/Blood-disabled persistence were verified through settings, then restored. Updated controls appear in Field Guide. No blocking console errors were observed. The embedded browser rejects native pointer lock and correctly remains paused. All 21 manifest runtime asset paths and SHA-256 hashes match the production copy. Closing the interactive paused map returns to pause with ammunition unchanged (30/120). A paused minimap/menu overlap found in screenshots was corrected by moving the interactive minimap to the right while menus are open.

## Rendered inspection versus manual gameplay

Actual rendered screenshots cover team clothing in sun/shade at useful distances, rifle ADS, blood/neutral hits, both lookout exteriors, both deck sightlines, the full map and running market/tower fixtures. These are source-driven inspection fixtures and actual controller simulation, not native pointer-lock gameplay. Native mouse feel, live audio localization, prolonged balance and sustained thermals have not been manually validated.

No new third-party assets or dependencies were added. Existing bundled CC0 Quaternius characters/animations and Poly Haven materials are reused. The optic, towers, patterns and effects are original. See `ATTRIBUTION.md` and `public/assets/manifest.json` for existing source/license/hash records.

## Measured performance

Apple M4 / 16 GiB (read from this machine), embedded Chromium 156 on macOS, 1280×720. Chassis, power mode, thermals and other applications were not controlled. One active owned test page, stationary market camera, eight-actor match with normal combat/respawns. Each sample runs for 20 wall-clock seconds. Frame intervals include CPU simulation, rendering and browser scheduling; these are not GPU timer queries.

| Quality | DPR | Mean interval | Mean FPS | Largest interval | Frames >33.3ms | Final-frame calls / triangles | Geometries / textures |
| --- | --- | --- | --- | --- | --- | --- | --- |
| high | 1.25 | 20.83ms | 48.01 | 383.4ms | 126 / 961 | 557 / 266,032 | 679 / 77 |
| low | 1 | 16.85ms | 59.35 | 34.1ms | 9 / 1188 | 360 / 133,954 | 690 / 77 |

High included a 383.4ms stall; raw results are retained rather than claiming locked 60 FPS. Final draw/resource values vary with visible actors, shields and effects and are snapshots, not averages or a controlled same-pose comparison. Geometry counts grow lazily as different character/effect poses are first rendered; the separate warm restart test checks repeated-use stability.

Cached local development asset-promise times: characters 1082.8ms; 15/15 environment maps 1691.1ms, no failures. These are asset-readiness intervals, not total app startup, cold-download or time-to-interactive measurements.

## Remaining limitations

- Short embedded-browser samples do not establish a sustained target-laptop benchmark. Low is the safer preset when High encounters frame stalls.
- Existing stylized human assets, procedural prone/reload overlays and bounded posture hitboxes remain; this update does not claim photorealism, full terrain IK or skinned-mesh hit collision.
- Bot route distribution is simple role/crowding logic. Market/tower camping balance needs human playtesting; three seeds are not exhaustive coverage.
- Decorative diagonal stair stringers/handrails sit outside the walking width; physical treads, posts and stepped guard colliders provide the traversable/solid structure. Prone is supported on decks and intentionally rejected across steep stair height changes.

## Captures

- [Teams in sunlight](teams-sun.jpg), [10m shade](teams-10m-shade.jpg), [20m shade](teams-20m-shade.jpg)
- [Red-dot ADS](rifle-red-dot.jpg), [confirmed blood hit](blood-hit.jpg), [neutral hit](neutral-hit.jpg)
- [Snowline exterior](snowline-tower.jpg), [Ridgeback exterior](ridgeback-tower.jpg), [Snowline deck](snowline-deck.jpg), [Ridgeback deck](ridgeback-deck.jpg)
- [Live bot stair ascent](tower-bot-start.jpg), [later stair frame](tower-bot-progress.jpg), [market fixture](market-live.jpg), [full map](full-map.jpg), [production pause](production-smoke.jpg)
