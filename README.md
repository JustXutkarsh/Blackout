# BLACKOUT: Mountain Turf — Version 2

An offline and private online team deathmatch FPS in an original, bright Himalayan village. Blue is the human plus three bots; Orange is four bots. Locally bundled CC0 skinned crew models and authored animation clips are combined with original clothing/weapon details, signs, mountains, audio and PBR materials. Private online 1v1/2v2/4v4 uses a separate authoritative Node/WebSocket server. Offline play needs no account. Online play uses Supabase Auth/Postgres profiles and a separate authenticated game server; gameplay assets remain locally bundled. The forced blackout/scanner mode has been replaced with daylight team combat and temporary gunfire intel.

## Run

Use Node.js 24+ and a desktop browser supporting WebGL 2, with keyboard and mouse. Chrome supports native pointer lock reliably; embedded previews may reject mouse capture. If capture fails, open the address in a normal desktop browser.

```sh
npm install
npm run dev
```

Open the printed local URL (normally http://127.0.0.1:5173) and click **Play Offline**. This explicit click captures the mouse and initializes audio. Installation requires internet; gameplay runs offline afterward.

```sh
npm run build
npm run preview
npm run typecheck
npm test
```

`dist/` is a static production build. Serve over HTTP rather than opening `file://`. `package-lock.json` pins dependencies.

## Private online rooms

```sh
npm run dev           # frontend + authoritative server (accounts need local setup below)
npm run test:network  # independent real-socket integration checks
npm run server:build
npm run server:start
```

Create Room → choose 1v1 / 2v2 / 4v4 → copy invite/code → friends join → choose teams → all Ready → host starts. Bot fill is off by default and always labeled. Default targets are 20/30/40 with eight minutes. Hold RMB / X toggle: Aim. Online pause releases controls; the match continues. Reconnect preserves the original slot/state for 30 seconds. Results support shared rematch readiness and host return to lobby.

Open separate browser windows/tabs at the local URL to test multiple independent sessions on this machine. Friends on other computers need a reachable server, not a loopback invite. Frontend and persistent server hosting are separate; no public game deployment has been published by this upgrade. See [account/database setup, friends and deployment](docs/multiplayer/ACCOUNTS.md), [deployment, security, protocol and limitations](docs/multiplayer/DEPLOYMENT.md) and [observed verification](docs/multiplayer/REPORT.md). `VITE_MULTIPLAYER_URL` is public frontend configuration; `.env.example` contains placeholders/local defaults only. Server `/health` reports process health. Rooms are in memory and do **not** survive a server restart.

## Controls

| Input | Action |
| --- | --- |
| WASD / mouse | Move / look |
| Left mouse | Attack; hold rifle, press once per pistol shot |
| Hold RMB / X toggle | Aim; rifle and pistol |
| R | Reload |
| 1 / 2 / 3 | Rifle / pistol / knife |
| Shift | Request standing, then sprint; lowers weapon, cancels ADS and blocks fire |
| C | Stand → crouch; crouch → stand; prone → crouch (requires clearance) |
| Z | Toggle prone / standing on supported, sufficiently level ground |
| Space | Jump standing; request standing from crouch/prone without jumping |
| M | Toggle north-up full map while retaining mouse capture |
| Hold Tab | Team scoreboard; releasing Tab closes it |
| Escape | Close overlay first, otherwise pause / release mouse |
| F3 (development only) | Collision / feet / camera diagnostic view |

Opening/closing tactical overlays clears held controls and suppresses attacks. The match continues while the locked map or scoreboard is open. Mouse look is held still in overlays. Browsers can intercept physical Escape to release pointer lock regardless of page code; loss of capture always pauses, and resuming requires a click.

When paused, click the minimap to open an interactive map. Its close button returns to the pause screen, never automatically to combat. Focus/tab loss pauses simulation, healing, reloads and positional audio. Settings persist locally: mouse/ADS sensitivity, volume, high/low quality, reduced motion, Auto Reload, Off/Light aim slowdown and Blood Effects. Reduced motion removes head bob, camera recoil motion, strong flashes and the damage vignette while retaining essential weapon actions.

## Rules

- Everyone has 100 maximum HP. First team to 40 eliminations wins. Eight minutes of active time; higher score wins at expiry, equality is a draw.
- Every elimination and death is attributed once. Team scores derive from combatant elimination totals, the same data used by the HUD, kill feed and scoreboard. The first score-limit outcome is latched before later attacks in that simulation step.
- Friendly fire is disabled. Teammates can intercept a bullet without taking damage. Environmental deaths count as deaths and never award enemy points; there is no recent-attacker credit or assist system.
- Respawn after three seconds, with full HP, starting weapons/ammunition and reset healing timers. Team-specific candidates prefer distance and low exposure to enemies and reject occupied or obstructed positions. If all are occupied, retry after 0.1s rather than overlap actors.
- A visible two-second shield blocks damage. Any valid attack ends the attacker's shield immediately. Dead actors are excluded from the clearly labeled **Alive / 4** counts.
- Taking damage resets healing. After five uninterrupted seconds, restore 5 HP/s, capped at 100. Dead actors cannot heal. A subtle healing label and smoothly updating bar show regeneration.
- Rifle: 30/120 ammo, 25 body / 50 head damage, 600 RPM, 2.2s reload. Pistol: 12/60, 20 / 40, semi-auto, 1.4s reload. Knife: 50 damage, 2.2m range, 0.65s cooldown. World geometry blocks all attacks; barrel-to-eye and barrel-to-hit checks prevent close-wall exploits.
- Accuracy is firearm shots that damage an enemy divided by firearm shots fired; shield/friendly contacts and knife attacks are excluded. Each shot counts once.
- Amber ammunition caches replenish up to two magazines per firearm, with a 20s cooldown.

## Reloads and first-person animation

Both procedural hands/forearms move with the weapon. Idle, walk, sprint, switch, fire, knife, ADS and reload poses use the active simulation clock. Hold RMB / X toggle: Aim. Aim in every stance; ADS reduces FOV, sensitivity, movement speed and spread. Reload/stance transitions temporarily exit ADS and restore it afterward if held or toggled aim intent remains; switching clears aim intent. ADS sensitivity is tunable in `CONFIG.view.adsSensitivity`. Idle sway fades out while aiming; the front sights align to the camera's shot direction. One timed stance state drives collision height, eye position, movement speed, character pose and hitboxes. Feet remain fixed through transitions. Crouch takes 0.28s; prone takes 0.65s, followed by a short request cooldown. Transitions stop movement and attacks. Prone uses an oriented 2.23m-long capsule footprint, checked across its width and ends for support and clearance. Rotation is swept against nearby walls; unsuitable ramps/steps and unsupported ledges reject crawling or prone entry. Standing from prone conservatively requires full height over that entire footprint. Blocked requests preserve the last valid pose. Space requests standing without jumping; sprint starts only after standing completes. Death cancels transitions; respawn resets standing. The camera never uses a feet-level obstruction ray. First-person forearms and individual gloved fingers come from the same skinned human rig, with cropped/capped sleeve ends and two-hand grip constraints. Crew characters use independent skeletons and mixers, authored locomotion/jump/landing/death clips, blended posture correction and upper-body weapon constraints. Their style remains stylized; it is not a scanned-human or motion-capture presentation.

Reload progress is authoritative in `WeaponState`: removal at 20%, insertion/ammo transfer at 68%, and bolt/slide motion at 84% for empty reloads. Ammo is transferred once at insertion. Switching before insertion consumes no reserve; switching afterward keeps the transferred ammunition. Either switch cancels remaining animation. Death cancels safely; pause freezes it. Per-weapon cooldowns persist through switching, with an additional global switch lock. Holding automatic fire resumes only after reload and switch locks finish. Tactical reloads omit the empty bolt action.

## Original arena: Kora Valley

- **Kora Co-op Warehouse:** pitched corrugated roof, four entrances, interior cover and an elevated deck with two ramp approaches. Courtyards outside have utility vehicles and crates.
- **Village Street:** colorful plaster/stone shops, wood doors, shutters, alleys, an accessible corner room with two entrances, and a small ramp-accessed balcony. The warehouse limits its coverage.
- **Terraced Hillside:** retaining walls, broad raised paths, end ramps and a middle cross-connection, sheds, trees, rock cover and exits toward both spawns.
- **Nima Fruit Lane:** apple/orange crates, curved banana bunches, striped watermelons, a weighing scale and baskets beneath faded striped awnings. Ridge Harvest and Kora Tea include storage, a kettle/cups, sturdy counter cover and side passages. Parked scooters, a bicycle, a repair corner, delivery handcart, drains and cables give the lane a civilian purpose.
- **Juniper Court / Market Steps:** a raised residential courtyard, wooden balcony and rooftop tank, connected by two gentle ramps and an eastern cross-connection. The balcony is decorative, not a bot navigation destination.
- **Cedar Court / Co-op Loading:** ground-level stone paving, seating and planters on the Blue-side village flank; a delivery vehicle and storage cover on the Orange side. Both areas have connected ground approaches. No elevated lookout structure remains.
- **Snowline / Ridgeback camps:** opposite ends, multiple spawn positions and screening walls that block direct spawn-to-spawn shots. Village retaining walls form intentional boundaries; decorative snowy mountains stay outside play.

The ground footprint grows from 60 × 50m (3,000m²) to 72 × 50m (3,600m²), exactly **20%** by adding a 12m western strip. Existing landmarks retain their scale. The three main routes remain, with the western route looping through the market and residential court.

The lightweight charcoal canvas minimap is generated from the same floor, ramp and solid geometry data as the world. Route lines follow physics-validated navigation paths. Building outlines, green elevation areas, quiet terrain and collision-avoiding full-map labels establish the hierarchy. It shows north-up lanes, building footprints, elevation, spawn zones, your rotating arrow and teammates. The full map adds location names and a legend. No ordinary enemy nameplates or permanent enemy map dots exist. Audible enemy firearm shots within 34m create fuzzy stationary pings for 1.5s; they do not follow the shooter, and knife attacks create none.

## Bots, architecture and tuning

Bots use line of sight, reaction delays, imperfect aim, finite magazines/reserves and temporary sound/last-known positions. They target enemies only, split across three assigned routes, sometimes advance toward a nearby teammate's path, seek reachable cover for reloads/low health, and return to combat. Separation steering and stuck replanning reduce doorway piles. Bots sometimes crouch near suitable low cover and stand before moving; autonomous prone selection is deliberately disabled to keep their routes reliable and combat moving. Their shared posture solver and hitboxes support prone when posed by the development harness. All bots heal and respawn by the player's rules. Easy/normal change reaction, accuracy and aggression, never HP or wall vision.

| File | Responsibility |
| --- | --- |
| `src/aiming.ts` | Shared RMB/X intent and bounded visibility-gated sensitivity slowdown |
| `src/config.ts` | Match, healing, weapon, reload-event, movement, ADS, intel and difficulty tuning |
| `src/rules.ts` | Pure ammunition, damage, healing, life timers, team scores/counts and results |
| `src/physics.ts`, `src/stance.ts` | Bounded collision, swept prone footprint/rotation, timed shared stance/eye/hitboxes, ramps, world ray tests and A* navigation |
| `src/world.ts`, `src/village.ts` | Village/market geometry, instanced produce/props, collisions, routes, spawns, cover, material tags and shared map features |
| `src/materials.ts` | Local PBR texture loading, color spaces, meter-based projected UVs and shared contact detail |
| `src/diagnostics.ts` | Dev-only F3 collision bounds, feet/camera/support readout and bounded environmental-death log; F4 bot routes |
| `src/actors.ts`, `src/characters.ts`, `src/motion.ts` | Skinned crew/first-person arms, independent mixers, motion/footstep phase, grip/foot constraints, weapon presentation and animation blends |
| `src/game.ts` | One RAF loop, 120Hz bounded simulation, input/overlays, AI, combat, lifecycle and effect pools |
| `src/tactical-map.ts` | Aspect-correct world-to-map conversion, cached canvas geometry and expiring pings |
| `src/audio.ts` | Positional Web Audio synthesis, wind ambience, surface steps/impacts and reload event sounds |
| `src/ui.ts`, `src/style.css` | Daylight menus, HUD, healing, kill feed, maps, scoreboards and settings |

Navigation samples shared walkable surfaces and validates **every edge with the actual actor movement solver**. Physics and hit tests are reused from V1. Shared/instanced static geometry, cached ramp bounds/map backgrounds, staggered perception/path updates, one directional shadow light, pooled 32-shot impacts/tracers, 64 hit particles and 24 shells keep cost bounded. DPR is capped at 1.25 high / 1 low, with 1.8M / 1.2M drawing-buffer pixel budgets (`CONFIG.render`). Low disables shadows while preserving visibility and information. The minimap updates at HUD cadence, not with a second world render.

## Verification and limits

`npm test` covers healing delay/rate/interruption/cap, dead actors, team scoring/friendly fire, attribution, protection/respawn timing, alive counts, score/time results/draws, reload insertion/cancellation/cadence, map conversion, ping expiry and collision/ramp/ceiling behavior.

With the dev server running, `/tests/browser.html` runs integration checks using actual game systems: spawn safety, connected lanes and physical bot traversal, damage/occlusion, ADS/crouch, magazine pose/ammo synchronization, overlay keyboard events, death/respawn/healing, team AI, a 90s accelerated match and a full score/time-limit match, results and repeated lifecycle restarts. Development-only pose and performance controls support visual inspection and a real-time 20s eight-actor sample. They are excluded from the production entry point. `window.__BLACKOUT__` provides diagnostics only on the main dev page; `snapshot()` includes rendering frame statistics.

Current market/stance checks and measurements are in [the market upgrade report](docs/market-upgrade/REPORT.md). The earlier ground fix and visual baseline are in [the prior verification report](docs/verification/REPORT.md), with comparable before/after screenshots. The visual harness `/tests/visual.html` provides fixed Street, Exterior, Interior, Hillside, Hip, ADS, Reload, Market, Court, MarketSteps, Crouch, Prone, CrouchADS, ProneADS and Full map views; `?view=Street&clean=1` hides its tools. Neither harness is in the production build.

Automated simulation and screenshot inspection do not prove mouse feel, competitive balance, live audio localization or sustained thermal performance. Characters use a stylized Quaternius CC0 body with original clothing/boots/accessories, authored clips and bounded foot/arm placement. Strafe/backward motion is derived from calibrated locomotion with leg steering; prone/crawl and rifle upper-body/reload constraints are procedural overlays. Foot placement is lightweight, not full terrain adaptation or motion capture. Small curved props use conservative box collision. Decorative produce, cloth and bicycle frames do not create tiny invisible obstacles; counters, substantial crates and scooter bodies are cover. Prone movement intentionally rejects slopes with more than 10cm height variation across the body, rather than floating over stairs. Character crawl remains a restrained procedural pose without terrain IK. Actors use separation steering rather than hard body blocking. Bot stuck recovery uses physical sidesteps and replanning; neither player nor bots receive an alive recovery teleport.

## Ground/camera regression fix

The fault was reproduced at the balcony ramp's west side (`x=-16.5, z=4.5`). Ramp collision tested a shrunken center rectangle, allowing a standing body to overlap its solid wedge. The old upward ray began 5cm above the feet, inside that wedge. Its legitimate zero-distance hit was incorrectly treated as ceiling clearance and changed eye height to **-0.03m**, exposing the ground underside/sky while the HUD and separate weapon scene remained visible. Original team spawn feet were correctly at supported floor level; the rendered main slab was not missing.

Ramp-side collision now uses the actor radius, and navigation uses that same corrected solver. Eye height derives from crouch/standing body height and is bounded inside the body. Movement substeps are bounded by time **and travel distance**, including public solver calls outside the 120Hz game loop. All 20 spawn candidates require a supported footprint and full headroom before use. A continuous solid ground slab plus an overlapping deeper foundation gives the village solid visible ground.

Grounded, fully supported positions update the player's last-safe position. Falling out, non-finite/out-of-bounds positions, or persistent solid penetration cause an environmental death with no enemy credit and the regular three-second respawn. Only the dead camera is placed at the validated safe position; failures are not concealed by teleporting a live player. F3 displays collider boxes, ramp top boundaries, actor bounds, feet, camera and grounded/supported state in development. Production omits this module.


Private multiplayer shares the original physics, posture hitboxes and weapon/life rules with a 60Hz authoritative Node server. `src/net/` contains the typed protocol, shared movement, transport, prediction/reconciliation, remote interpolation and room UI. `server/` owns rooms, bots, damage and match lifecycle. Static and persistent-service deployment instructions are in `docs/multiplayer/DEPLOYMENT.md`. Offline remains browser-local and requires no running backend.

## Attribution

See [ATTRIBUTION.md](ATTRIBUTION.md) and [the asset manifest](public/assets/manifest.json). Five Poly Haven CC0 texture sets provide stone, plaster, timber, dirt and worn metal, with base-color/normal/roughness maps at 1K. Runtime assets are local; there are no paid assets or downloaded weapon models. The character pass adds the Quaternius CC0 Universal Base Character and 16 compatible animation clips, plus CC0 Poly Haven denim maps. Original geometry and audio remain project content. Three.js and addons are MIT licensed. Fonts are system-local.

## Character and animation polish

Auto Reload is **on by default**, with a persisted Settings toggle. An empty active firearm with reserve starts the same normal reload as R on the simulation tick after the last shot resolves. It waits for weapon/stance transitions; sprint exits over a short 0.15s delay. Zero reserve gives empty feedback and never switches the player's weapon. Rifle fire resumes if LMB remains held; the pistol requires a fresh press after reloading. Switching cancels before insertion without consuming reserve, or keeps already inserted ammunition. Death cancels; pause freezes timers. Maps do not skip reload events, and pause/focus loss clears held attacks. Bots retain their documented pistol/knife fallback only after exhausting reserve.

Hold RMB / X toggle: Aim. RMB temporarily overrides the toggle; releasing it returns to the toggle state. X key repeats are ignored. Sprint clears the toggle; switching, death, respawn, pause, focus/capture loss and tactical overlays clear all aim intent. Its sensitivity now has its own persisted slider (0.2–1.0 multiplier). ADS exits near solid cover, during reload or sprint, and returns after a valid reload if valid aim intent remains. The viewmodel lowers near walls; authoritative world/barrel occlusion still blocks hits. Reduced Motion removes unnecessary breathing/bob, landing bounce, flashes and hit flinches. Stance height remains gameplay-relevant.

Locomotion phase and footsteps derive from actual ground travel. Stationary actors stop stepping; backward/strafe input does not choose forward sprint. Authored clips are retargeted offline to the body bind pose, not blindly copied from the mannequin. The pelvis, upper body, hands and feet use bounded pose constraints; visual root motion never moves the collision actor. Bot turns are rate-limited and shots wait for facing alignment. Arm grips remain attached to the active rifle/pistol/knife and magazine events. Skeletons, skin/cloth tint instances and animation weights are independent per actor; geometry, texture maps and clip data are shared. Distant accessories are hidden and visual pose updates drop to 15Hz beyond 24m, without changing simulation or hit tests.

`/tests/characters.html` is a **development-only orbit workshop**, not third-person gameplay. It shows teammate/enemy variations and controls for idle, forward/back/strafe, run/sprint, turns, crouch/crawl, aim/fire, reload, switch, air/land, hit and death. Drag to orbit, wheel to zoom, use Front/Side/Back/Close Face, or freeze a pose. The 2m ruler helps judge scale.

The locally bundled body is approximately 1.75m tall, with original skinned jackets/jeans, boots, gloves, scarves, zipper/pocket details and navy/light-scarf and rust/dark-scarf team patterns. Texture maps are 256px for eye/hair details and 1K for skin/denim. `scripts/prepare-characters.py` optimizes downloaded source files; then `node scripts/retarget-characters.mjs` calibrates the selected motions. These optional asset-build scripts are not needed for installation or gameplay. See [character verification](docs/character-polish/REPORT.md) for actual tests, screenshots, timings and limitations.

Earlier character-pass evidence: [verification report](docs/character-polish/REPORT.md).

## Combat and field presentation

**Hold RMB / X toggle: Aim.** RMB is temporary and does not change X intent; releasing it returns to the toggle. Keyboard repeats are ignored. Sprint clears toggled aim; switching, death, respawn, pause, focus/capture loss and tactical overlays clear intent. Reload temporarily exits and restores only valid remaining aim intent. Rifle ADS uses a compact, thin-walled original optic with a clear lens and small red dot; pistol ADS uses attached rear/front iron sights and a two-handed grip. Both align with camera aim in standing, crouched and prone poses. World FOV changes modestly from 80° to 72° rifle / 74° pistol. Tune `CONFIG.rifleSight`, `CONFIG.pistolSight` and `CONFIG.view`.

Light aim slowdown defaults on: ADS firearms only, 38m range, 2.6° cone, at most 18% reduction with exponential smoothing. Living, unshielded enemies with a visible head/upper-body region qualify; distance-ordered world/actor hits reject occlusion. It never changes camera angles, bullets, recoil, spread or damage. Off fades smoothly to normal. Tune `CONFIG.aimAssist`.

Confirmed enemy bullet damage produces a localized 0.28s puff, a rate-limited directional cosmetic reaction, a clear four-tick hit marker and shooter confirmation sound. Headshots have a restrained gold marker and sound variation; elimination confirmation remains separate. Blood Effects Off uses neutral particles. Walls, teammates, shields, dead actors and knife contacts produce no blood. Depth testing remains enabled. A 64-particle pool and existing shell/impact pools reset on match restart; tune `CONFIG.hitEffects`.

The HUD and all menus use translucent charcoal, readable white text and restrained team colors. The minimap and full map share world geometry, validated route paths, elevation and non-overlapping label placement. Controls remain in Field Guide/pause; no permanent gameplay controls banner is displayed.

Market routing preserves the prior fix: outer patrol endpoints lead through the fruit market and residential court; distant muffled/cross-lane sounds do not repeatedly divert committed flank bots, and crowding discourages stacking a team on one route. Visible and nearby threats still take priority. Both main routes and market occupancy are physically tested after map edits.

## Forgiving falls and environmental diagnostics

Drops of **up to 3m cause zero damage**. From 3–10m, `100 × smoothstep((distance−3)/7)` increases damage smoothly; 10m or more is lethal. Physics measures unsupported **feet descent from its highest airborne position**, once per landing. Camera bob, crouch and prone height never enter that calculation. Grounded stair/ramp snaps do not accumulate descent. Respawn/recovery clears fall state and velocity. All actors use these rules; environmental deaths award no enemy elimination.

A short balcony-side fall previously exposed a solver mismatch: side collision used body radius, while ramp floor support only tested the feet center. The actor fell beside the wedge, became grounded inside its side, and the 0.25s penetration guard killed it. Ramp support now uses the same physical footprint at edges. A separate persistent-penetration guard remains diagnostic protection, not normal fall damage. It never teleports living actors to conceal a floor failure. The kill plane is −30m, safely below the lowest intended ground at 0m. All thresholds are in `CONFIG.falls`.

F3 shows support, oriented body/camera positions, fall state and the last environmental death. Development-only `window.__BLACKOUT__.deathLog` holds at most 24 records: reason, actor/last supported positions, descent/velocity, floor, clearance and nearby colliders. Production records none. F4 shows bot paths and zone arrivals.

`/tests/tactics.html` covers fall regressions, optic/pistol controls, hit effects, repaired ground areas and three 180s AI-seed market visit simulations; `?quick` skips the long simulations. `/tests/visual.html` provides StoneCourt, Loading, rifle/pistol ADS, full-map and existing village/stance poses. H toggles its inspection toolbar. These tools are absent from the production entry.

Current checks, screenshots, measurements and limitations: [village polish report](docs/village-polish/REPORT.md). Earlier [tactical evidence](docs/tactical-upgrade/REPORT.md) is historical and describes the now-replaced elevated structures.
