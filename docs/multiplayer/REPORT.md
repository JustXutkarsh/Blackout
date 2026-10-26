# Private multiplayer implementation and verification

Verified locally before this commit. No public game server, DNS, TLS service or paid infrastructure was provisioned.

## Functional changes

- Real private 1v1, 2v2 and 4v4 on an authoritative 60Hz Node/WebSocket server; 20Hz snapshots. Original offline mode remains available without a server.
- Server-generated room codes, UUID/session identities, invite/code joining, distinct validation errors, team capacities, readiness, host settings/kick, labeled optional bot fill, countdown, results, shared rematch readiness, return to lobby and leave.
- Commands contain bounded input and sequence IDs, never trusted positions, HP or hits. Shared physical village collision, stances, posture hit regions, weapons, healing, safe falls, shield/respawn rules; server-owned pickups, score and clock.
- Immediate local prediction, acknowledged-command replay/reconciliation, small visual correction smoothing, 100ms remote interpolation, ping/server clock estimation, stale-input clearing, 30-second authenticated slot reservation. Reconnect preserves the original actor and ammunition. F6 development diagnostics.
- Confirmed hits/effects are server events with monotonic IDs; no predicted blood or hit awards. Remote stance, ADS, weapon, reload and death animation use existing independent crew rigs. Navy/rust clothing and first-person sleeves follow team.
- Lobby role transfers independently of simulation authority. Departed actors retain earned statistics; abandoned teams forfeit after grace. Empty rooms expire. Finished rooms stop unnecessary snapshot streaming after the final state, while reconnect can request it again.
- Generated world export comes from actual World construction (160 colliders, 1,245 nav nodes). A map-data hash rejects mismatched frontend/server versions.

## Visual and performance work

Inspected the actual connected scene before changes. Kept the same map and existing CC0 PBR/character assets. Tightened stone tiling from 2m to 1.25m, restrained normal strength on timber/plaster, and adjusted contact shadow bias. Private room panels share the charcoal, blue and orange interface language.

Static opaque detail meshes with compatible attributes/materials/shadow flags are merged at initialization; animated cloth, pickups, instances, particles and actors are excluded. Collision/map data is unchanged. The invisible local full-body character no longer runs a redundant skeletal/IK update; first-person arms retain their animation. Server snapshots encode once per room, transient events stop retransmitting after delivery, and bot planning is staggered. No new runtime assets or textures.

## Automated checks

- 80 unit/regression tests passed, including original physics/ramp corner/small-fall, weapon/reload, stance, healing, damage/team, aim slowdown, map and asset-license tests. Added room/input validation, capacity/readiness/unauthorized action, duplicate-session, reconnect/host transfer, forfeit/cleanup/rematch, server healing/shield/respawn, small-fall and physical bot market traversal tests.
- Real independent WebSocket clients: two clients physically walked from opposite spawns to the fruit-market lane and completed a 1v1 by authoritative bullet damage and score limit. This was not a time-end-only fixture. Four clients filled 2v2 and eight filled 4v4; stance replication was asserted. These are automated sessions, not independent human testers.
- Reconnect retained actor identity, 63 HP and 9 rounds after a deliberate disconnect; host transferred. Rematch restored ammunition/score without new slots. Simulated real-time 20–53ms command delay/jitter and silence confirmed bounded movement and timeout clearing. Invalid code, oversized payload and unapproved Origin rejected. `/health` checked. In-process room tests also cover invalid fields/claims, unauthorized settings/kicks, active-match joins, grace/forfeit and single attribution.
- Browser source fixture against the real local server passed: two socket sessions, rendered team actors, prediction/reconciliation, crouch/stand, weapon switch, pistol ADS, firing/reload ammunition, map/scoreboard and online pause continuing server time.

## Measurements

Actual machine: Apple M4, 16GiB RAM (read with sysctl); exact chassis/power/thermal state not controlled. Embedded Chromium 156, macOS arm64 Node 25.3.0, 1280×720 CSS viewport. Other applications/background work were uncontrolled. This is a short local sample, not a sustained target-device certification. CPU render timing includes animation/matrix/render submission, not separately measured GPU duration. GC pauses were not independently instrumented.

Comparable stationary 1v1 connected view, two actors, audio not initialized in fixture, 2s warm-up plus 20s sample:

| Sample | Mean frame ms | P95 / P99 ms | >33.3ms | Render CPU mean ms | Calls / triangles | Geometry / textures |
|---|---:|---:|---:|---:|---:|---:|
| Before / High, DPR1.25 | 17.952 | 33.3 / 33.7 | 44/1115 | 7.817 | 326 / 82,946 | 676 / 81 |
| Batching only / High | 17.872 | 32.9 / 33.4 | 29/1120 | 8.408 | 261 / 83,848 | 620 / 81 |
| Final / High | 18.672 | 33.3 / 34.3 | 71/1072 | 7.489 | 261 / 83,848 | 620 / 81 |
| Final / Low, DPR1 | 16.765 | 17.6 / 17.8 | 5/1194 | 4.995 | 191 / 63,894 | 620 / 81 |

Batching cut this view's calls by 19.9% and rendered geometry resource count by 56, with unchanged textures. Final render CPU was slightly lower than baseline, but **the high-quality frame distribution did not improve consistently**. No substantial FPS gain is claimed. Merged bounds expose slightly more triangles in this view. Low quality remains the smoother measured option. Raw JSON files accompany the report.

Server integration timing is recorded in `socket-integration.log`: accelerated scripted tests rather than a sustained real-time hosting load benchmark. It reports tick mean/P50/P95/P99/max, encoded snapshot size and actual bytes sent. No zero-latency or loss-free Internet claim. Full snapshots intentionally favor a simple auditable protocol over delta encoding.

## Limits

No public multi-device connection was tested; a persistent host, exact origins, WSS/TLS and the frontend URL remain to configure. The Docker/reverse-proxy files were supplied, not deployed. Rooms do not survive server restarts. No historical rewind/lag compensation, anti-cheat certification, voice, accounts or database. Optional server bots use simpler tactics than offline bots.

Native pointer-lock mouse feel and audio localization were not manually playtested in the embedded browser. Scripted controls are labeled and do not establish subjective aiming/animation quality. High quality still has frame-time outliers; no guaranteed 60 FPS. Existing procedural vehicles/vegetation/weapon detail remain stylized; this is not a realistic-asset replacement pass. Vite still advises that the main JS chunk exceeds 500kB. Internet-scale proxy/IP limiting and multi-instance room routing need a hosting-specific review.

Active 4v4 client sample (two socket-controlled humans and six explicitly labeled server bots), same viewport and warm-up, actual fighting/respawns:

| Quality | Mean / P95 / P99 frame ms | >33.3ms | Simulation / render CPU mean ms | Calls / triangles snapshot |
|---|---|---:|---|---|
| High | 19.211 / 33.4 / 34.3 | 82/1042 | 0.361 / 11.841 | 508 / 262,216 |
| Low | 17.108 / 17.7 / 33.4 | 19/1170 | 0.337 / 9.448 | 360 / 150,724 |

These are different moments in a live match, not identical camera/entity distributions for a controlled quality comparison. The observer was subsequently killed by a real server bot, the alive count dropped, a named death screen appeared and respawning restored health/ammo. Full raw samples are `frame-eight-high.json` and `frame-eight-low.json`.

The final real-socket suite recorded 1,560 ticks, mean 0.109ms, P95 0.375ms, P99 0.569ms, max 1.786ms. Largest snapshot 9,371 bytes; 9,432,758 bytes across 1,704 recipient snapshots during the accelerated test. A full 8-actor snapshot at that observed maximum and 20Hz would be about 187kB/s per recipient, excluding WebSocket/TCP/TLS overhead. This is intentionally not a claim about Internet bandwidth or sustained loaded-server latency.

## Final browser and production checks

- All 37 existing offline browser checks passed after fixing a stale teammate-marker roster key exposed by match restart. Their actual DOM report is saved in `offline-browser.txt`.
- All 17 existing tactical browser checks passed, including three physical market-traversal seeds and GPU red-dot/sight checks (`tactical-browser.txt`).
- A real 30-second browser match reached a server-timed draw and rendered both result tables. Both sessions readied for rematch. Actor objects and the existing 32 shot / 24 shell / 64 blood pools were reused; rendered resources stayed at 620 geometries and 81 textures across that rematch (`browser-rematch.json`).
- The built frontend on port 4173 connected to the built Node server on port 3002. Two independent browser sessions joined via a real invite, opposite teams and readiness propagated, Copy Invite reported success, and the synchronized countdown appeared. These remained loopback-only checks.
- Reloading an active production client retained its per-tab token and offered explicit Reconnect. Verified reconnect restored the active-match HUD/paused controls screen rather than leaving the initial reconnect prompt. One initial smoke run exposed and fixed that transition. The server match continued, including a bot scoring kills and normal respawns while controls were released.
- Production asset status showed 15 material files loaded, zero failures and character state ready. In one reload, character preparation took 3,541ms and material completion 5,160ms; competing tabs/apps/cache state were uncontrolled.
- Native pointer lock was rejected by the embedded browser; Resume showed a clear capture-failure state and controls remained released. Manual mouse feel and audio localization remain unverified. The scripted network/rematch browser fixture reported no console errors or warnings.
- Reconnect/input timeouts now incorporate elapsed server wall time, independently of bounded simulation catch-up. A regression check verifies grace expiry after a server stall without fast-forwarding match gameplay.

Final presentation audit also restored authoritative local tracers/world impacts and client wall-lowering online; predicted muzzle/audio remains separate from confirmed shot endpoints and damage. World-impact metadata is server-generated. Lobby durations display minutes and seconds, including supported short rounds.

A life-generation guard rejects delayed normal-client commands from before respawn/rematch. Dead input is not queued, and kills clear held fire. A focused regression covers the stale-life boundary; real-socket traversal/shooting tests also send generation-tagged inputs.

The final matching development client/server smoke run passed all seven scripted online checks with no browser console errors/warnings. Shot presentation is predicted; authoritative ammunition and damage can differ at a held-trigger release boundary under network timing.

Orange-team clients now receive matching orange teammate map symbols/legend and blue enemy-shot pings; a canvas regression verifies filtering/color consistency. Replicated shot effects use the incoming authoritative snapshot time so remote flashes are not already aged out when displayed.
