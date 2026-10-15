# BLACKOUT: Mountain Turf — Version 2

An offline 4v4 team deathmatch FPS in an original, bright Himalayan village. Blue is the human plus three bots; Orange is four bots. Original procedural models, signs, mountains and audio are bundled locally. No backend, accounts, keys, networking or remote gameplay assets. The forced blackout/scanner mode has been replaced with daylight team combat and temporary gunfire intel.

## Run

Use Node.js 20.19+ or 22.12+ and a desktop browser supporting WebGL 2, with keyboard and mouse. Chrome supports native pointer lock reliably; embedded previews may reject mouse capture. If capture fails, open the address in a normal desktop browser.

```sh
npm install
npm run dev
```

Open the printed local URL (normally http://127.0.0.1:5173) and click **Join Blue Team**. This explicit click captures the mouse and initializes audio. Installation requires internet; gameplay runs offline afterward.

```sh
npm run build
npm run preview
npm run typecheck
npm test
```

`dist/` is a static production build. Serve over HTTP rather than opening `file://`. `package-lock.json` pins dependencies.

## Controls

| Input | Action |
| --- | --- |
| WASD / mouse | Move / look |
| Left mouse | Attack; hold rifle, press once per pistol shot |
| Hold right mouse | Aim down sights; rifle and pistol |
| R | Reload |
| 1 / 2 / 3 | Rifle / pistol / knife |
| Shift | Sprint; lowers weapon, cancels ADS and blocks fire |
| C | Toggle crouch; cannot stand under a low ceiling |
| Space | Jump |
| M | Toggle north-up full map while retaining mouse capture |
| Hold Tab | Team scoreboard; releasing Tab closes it |
| Escape | Close overlay first, otherwise pause / release mouse |

Opening/closing tactical overlays clears held controls and suppresses attacks. The match continues while the locked map or scoreboard is open. Mouse look is held still in overlays. Browsers can intercept physical Escape to release pointer lock regardless of page code; loss of capture always pauses, and resuming requires a click.

When paused, click the minimap to open an interactive map. Its close button returns to the pause screen, never automatically to combat. Focus/tab loss pauses simulation, healing, reloads and positional audio. Settings persist locally: sensitivity, volume, high/low quality and reduced motion. Reduced motion removes head bob, camera recoil motion, strong flashes and the damage vignette while retaining essential weapon actions.

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

Both procedural hands/forearms move with the weapon. Idle, walk, sprint, switch, fire, knife, ADS and reload poses use the active simulation clock. ADS reduces FOV, sensitivity, movement speed and spread; the front sights align to the camera's shot direction. Crouching changes collision height immediately and smoothly changes camera height.

Reload progress is authoritative in `WeaponState`: removal at 20%, insertion/ammo transfer at 68%, and bolt/slide motion at 84% for empty reloads. Ammo is transferred once at insertion. Switching before insertion consumes no reserve; switching afterward keeps the transferred ammunition. Either switch cancels remaining animation. Death cancels safely; pause freezes it. Per-weapon cooldowns persist through switching, with an additional global switch lock. Holding automatic fire resumes only after reload and switch locks finish. Tactical reloads omit the empty bolt action.

## Original arena: Kora Valley

- **Kora Co-op Warehouse:** pitched corrugated roof, four entrances, interior cover and an elevated deck with two ramp approaches. Courtyards outside have utility vehicles and crates.
- **Village Street:** colorful plaster/stone shops, wood doors, shutters, alleys, an accessible corner room with two entrances, and a small ramp-accessed balcony. The warehouse limits its coverage.
- **Terraced Hillside:** retaining walls, broad raised paths, end ramps and a middle cross-connection, sheds, trees, rock cover and exits toward both spawns.
- **Snowline / Ridgeback camps:** opposite ends, multiple spawn positions and screening walls that block direct spawn-to-spawn shots. Village retaining walls form intentional boundaries; decorative snowy mountains stay outside play.

The lightweight canvas minimap is generated from the same floor, ramp and solid geometry data as the world. It shows north-up lanes, building footprints, elevation, spawn zones, your rotating arrow and teammates. The full map adds location names and a legend. No ordinary enemy nameplates or permanent enemy map dots exist. Audible enemy firearm shots within 34m create fuzzy stationary pings for 1.5s; they do not follow the shooter, and knife attacks create none.

## Bots, architecture and tuning

Bots use line of sight, reaction delays, imperfect aim, finite magazines/reserves and temporary sound/last-known positions. They target enemies only, split across three assigned routes, sometimes advance toward a nearby teammate's path, seek reachable cover for reloads/low health, and return to combat. Separation steering and stuck replanning reduce doorway piles. All bots heal and respawn by the player's rules. Easy/normal change reaction, accuracy and aggression, never HP or wall vision.

| File | Responsibility |
| --- | --- |
| `src/config.ts` | Match, healing, weapon, reload-event, movement, ADS, intel and difficulty tuning |
| `src/rules.ts` | Pure ammunition, damage, healing, life timers, team scores/counts and results |
| `src/physics.ts` | Bounded fixed-step collision, crouch dimensions, ramps, world ray tests and A* navigation |
| `src/world.ts` | Village geometry, collisions, routes, spawns, cover, material tags and shared map features |
| `src/actors.ts` | Team character models and hands/weapon procedural animation |
| `src/game.ts` | One RAF loop, 120Hz bounded simulation, input/overlays, AI, combat, lifecycle and effect pools |
| `src/tactical-map.ts` | Aspect-correct world-to-map conversion, cached canvas geometry and expiring pings |
| `src/audio.ts` | Positional Web Audio synthesis, wind ambience, surface steps/impacts and reload event sounds |
| `src/ui.ts`, `src/style.css` | Daylight menus, HUD, healing, kill feed, maps, scoreboards and settings |

Navigation samples shared walkable surfaces and validates **every edge with the actual actor movement solver**. Physics and hit tests are reused from V1. Shared/instanced static geometry, cached ramp bounds/map backgrounds, staggered perception/path updates, one directional shadow light, pooled 32-shot impacts/tracers and 24 shells keep cost bounded. DPR is capped at 1.5 high / 1 low, with 2.6M / 1.2M drawing-buffer pixel budgets. Low disables shadows while preserving visibility and information. The minimap updates at HUD cadence, not with a second world render.

## Verification and limits

`npm test` covers healing delay/rate/interruption/cap, dead actors, team scoring/friendly fire, attribution, protection/respawn timing, alive counts, score/time results/draws, reload insertion/cancellation/cadence, map conversion, ping expiry and collision/ramp/ceiling behavior.

With the dev server running, `/tests/browser.html` runs integration checks using actual game systems: spawn safety, connected lanes and physical bot traversal, damage/occlusion, ADS/crouch, magazine pose/ammo synchronization, overlay keyboard events, death/respawn/healing, team AI, a 90s accelerated match and a full score/time-limit match, results and repeated lifecycle restarts. Development-only pose and performance controls support visual inspection and a real-time 20s eight-actor sample. They are excluded from the production entry point. `window.__BLACKOUT__` provides diagnostics only on the main dev page; `snapshot()` includes rendering frame statistics.

Development verification passed 23 unit tests and 23 browser integration checks. The production menu, full map, scoreboard, high/low quality and reduced-motion settings, ADS and shared reload poses were visually inspected. Native V2 pointer-lock/input checks were not completed because the desktop browser was in use; mouse feel and live audio localization remain manual validation items. A 20-second silent eight-actor browser sample on the local Apple M4 / 16 GB machine at 1280×800, high quality, DPR 1 recorded 1,200 frames, mean 16.67 ms (60 FPS), maximum 17.8 ms, and no sampled frame over 33.3 ms. This is a short development sample, not a sustained-performance guarantee or an audio-heavy benchmark.

Automated simulation is distinct from manual gameplay inspection. It does not prove mouse feel, competitive balance, audio localization or sustained long-session performance. The character and hand models remain stylized procedural geometry. Bots use local state machines rather than squad tactics, and recovery can move a stuck bot a short distance onto a nearby valid waypoint. Small curved props use conservative box collision bounds. Actors use separation steering instead of hard body blocking. No human-vs-human networking is included.

For future multiplayer, move input commands, collision, hits, ammunition, healing, score and timers to an authoritative server; replicate actor snapshots, interpolate remote actors and add local prediction/reconciliation. Keep the existing rendering and menus on the client. This version deliberately has no network infrastructure.

## Attribution

Map, signs, models and synthesized audio are original procedural content. No third-party media or copied maps/interfaces. Three.js is MIT licensed (`node_modules/three/LICENSE`); Vite, TypeScript and tsx retain their bundled licenses. Fonts are system-local, with no remote font or asset requests.
