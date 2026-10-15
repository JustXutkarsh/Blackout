# BLACKOUT: Rooftop Hunt

A complete offline browser FPS: one connected neon district, three free-for-all bots, three weapons, and a repeating power failure. All models, signs, effects, and audio are generated locally. No accounts, backend, API keys, remote assets, or runtime internet connection are needed.

## Run

Requires Node.js 20.19+ or 22.12+ and a current desktop browser with WebGL 2. Use a keyboard and mouse. Chrome is recommended for pointer lock; embedded browser previews may reject mouse capture. Open the local address in a normal browser if that happens.

```sh
npm install
npm run dev
```

Open the printed address (normally http://127.0.0.1:5173), then click **Enter the District**. Your click captures the mouse and unlocks audio.

```sh
npm run build
npm run preview
npm run typecheck
npm test
```

`dist/` is a portable static build. Serve it through HTTP; don't open `index.html` with `file://`. Dependency installation requires internet; gameplay does not. The generated `package-lock.json` pins resolved dependencies.

## Controls

| Input | Action |
| --- | --- |
| WASD / mouse | Move / look |
| Left mouse | Attack (hold for rifle; one press per pistol shot) |
| 1 / 2 / 3 | Rifle / pistol / knife |
| R | Reload |
| Shift | Sprint; weapon lowered and firing disabled |
| Space | Jump |
| Q | Echo scanner |
| Escape | Pause and release mouse |

Focus loss or lost mouse capture pauses the simulation and audio. Resume requires a click. Settings persist locally: sensitivity, master volume, high/low quality, reduced motion. Reduced motion disables bob, camera recoil motion, strong flashes, damage vignette, and the large scan pulse.

## Match rules

- Five minutes of active gameplay. Four combatants, 100 HP each. One point per elimination.
- Rank by eliminations, then fewer deaths; equal values share a rank.
- Death costs three seconds, then a spawn chosen for distance and low exposure. A cyan shield protects for two seconds. Attacking ends your own protection immediately.
- Respawning restores weapons and starting ammunition. Falling below the map causes death and normal respawn. The perimeter is enclosed.
- Rifle: 30/120 ammunition, 25 body / 50 head damage, 600 RPM, 2.2s reload.
- Pistol: 12/60 ammunition, 20 body / 40 head damage, semi-auto, 1.4s reload.
- Knife: 50 damage, 2.2m reach, 0.65s cooldown. World geometry blocks every weapon.
- Reloading transfers ammunition only on completion. Switching or death cancels it without consuming reserve. Pausing freezes the reload.
- Accuracy is firearm shots hitting any living opponent divided by firearm shots fired. Each shot counts at most once; hits on spawn shields count as contact. Knife swings are excluded.
- Power: 60s on → 5s flickering warning → 20s blackout → repeat. Active time drives both the match and cycle.
- Q captures fuzzy, stationary enemy echoes within 30m for 1.5s, with a 20s cooldown. It doesn't continuously track targets.
- Green pickups restore up to 40 HP; amber pickups restore up to two magazines per firearm. Pickups return after 20s.

## District routes

Skyline Apartments contains two cover-filled roofs joined by two bridges. A marked 2m optional jump joins north ledges. Cyan ramp edges lead down to Night Market or through the hotel. The market has shuttered stalls, crates and scooters. The hotel has a lobby, combat floor, balcony and roof, connected by two ramp flights. The red-lit Service Passage links the streets under the bridges.

Use footsteps and gunfire to find targets. Blackouts reduce bot vision from 30m (easy) / 37m (normal) to 15m. Moonlight and red emergency lights remain visible. Bots hear approximate sound locations, investigate, search temporary last-known positions, pursue visible rivals, reposition, reload and respawn. They fight each other too. Bots switch to pistol then knife if ammunition is exhausted; pickups can replenish them.

## Architecture and tuning

| File | Responsibility |
| --- | --- |
| `src/config.ts` | Central weapon, player, difficulty, match, scanner and power tuning |
| `src/rules.ts` | Pure weapon state, damage, ranking, life timers and power state |
| `src/physics.ts` | Fixed-step AABB sliding, gravity, ramp support, ray occlusion, navigation and A* |
| `src/world.ts` | Procedural map, collision shapes, lights, pickups, rain, landmarks and spawn positions |
| `src/actors.ts` | Combatant state and original character / first-person models |
| `src/game.ts` | One RAF loop, bounded 120Hz simulation, input, perception, combat, match lifecycle and effect pool |
| `src/audio.ts` | Synthesized sound, HRTF positional audio, distance attenuation and cleanup |
| `src/ui.ts`, `src/style.css` | Menus, HUD and settings |

Adjust weapons and blackout timing in `config.ts`; bot tactics in `game.ts`; map dimensions, cover, lights, pickups and spawns in `world.ts`. Floors and ramps generate navigation candidates. Every graph edge is validated using the **same movement solver** as actors. Stuck detection replans and can recover to a nearby valid waypoint.

Repeated boxes/windows are instanced. Materials and geometry are shared. DPR is capped at 1.5 (1 on low), with drawing-buffer budgets of 2.6M / 1.2M pixels; one 1024px directional shadow map; a bounded 32-shot effect pool; one reusable muzzle point light; 360 rain streaks, disabled on low. The HUD reports a rolling frame-rate sample; it isn't a hardware benchmark. No bloom or reflection passes. Match restarts reuse world resources, actors, audio context, input listeners and RAF. Page teardown/HMR disposes resources and listeners.

## Verification

`npm test` runs focused Node tests for weapon cadence/ammo, reload cancellation, damage, elimination attribution, protection, respawn timing, power boundaries, ranking, match end, wall sliding, ceilings, ramps, ray occlusion and navigation.

With the dev server running, open `/tests/browser.html` for a deterministic browser integration harness. It uses actual game systems, displays individual results, runs physical route checks through all zones and a 90s bot simulation, and verifies weapon hit resolution, scanner snapshots, pickups, death, match end, pause input clearing and restart resource counts. It is not included in the production build. `window.__BLACKOUT__` exposes development diagnostics only on the main Vite development page.

Build and type checks, unit tests, browser integration checks settings persistence, and native pointer-lock startup, movement/scanner input, firing/reloading, pistol/knife switching and explicit pause/resume have been exercised during development. Accelerated simulation tests do not replace manual checks of mouse feel, sound localization or a full real-time match. No verified performance claim is made for the target MacBook Air M4.

## Limitations and future multiplayer

Desktop only. Stylized procedural meshes and synthesized audio; no authored character animation, matchmaking or networking. Collision uses conservative boxes for curved props. Bots use navigation with reaction delays and imperfect aim rather than tactical planning; they traverse ramps and bridges but don't use the optional jump. Spawn recovery may move a stuck bot a short distance to a valid node. The small hotel uses open ramps rather than a full multi-storey interior. Balance and long-session performance would benefit from further human playtesting.

For multiplayer, keep rendering and local input on the client, send timestamped input commands to an authoritative server, and move fixed-step actor state, shot validation, ammunition, scoring, protection, pickups and power timing there. Replicate snapshots keyed by actor ID, interpolate remote actors, and add client prediction/reconciliation. Replace local bot/player decisions with command producers; reuse pure rules and collision. The current version deliberately contains no network infrastructure.

## Attribution

All map geometry, models, sign textures, sound effects and ambient audio are original procedural content generated by this project. No third-party media. Three.js is MIT licensed; see `node_modules/three/LICENSE`. Vite, TypeScript and tsx are development tooling with their respective bundled licenses. System fonts are used; no external font requests.
