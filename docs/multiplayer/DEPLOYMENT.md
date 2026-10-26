# Private multiplayer deployment

The browser is a Vite static build. The authoritative server is a separate persistent Node process. There is no configured hosting provider in this checkout. GitHub origin is source hosting, not evidence of a running game server. GitHub Pages is static-only and cannot run this Node service.

No infrastructure was provisioned and no public game deployment was published by this upgrade. Public friend-to-friend play requires completing the hosting step below.

## Local development (Node 24+)

```sh
npm install
npm run dev:all
```

Frontend: `http://127.0.0.1:5173`. Server: `ws://127.0.0.1:3001/ws`. Health: `http://127.0.0.1:3001/health`.

Separate terminals: `npm run dev` and `npm run server:dev`. Open two separate tabs/windows, create a room in one and join by code or invite in the other. These are separate sessions, not separate human testers. To test with different computers on a trusted LAN, bind both services to the LAN interface, allow the exact frontend origin on the server, and set the frontend public WebSocket URL to that reachable machine. Loopback URLs work only on the same computer.

## Production

```sh
npm run build
npm run server:build
NODE_ENV=production HOST=127.0.0.1 PORT=3001 \
  ALLOWED_ORIGINS=https://game.example.com npm run server:start
```

Build the frontend with `VITE_MULTIPLAYER_URL=wss://multiplayer.example.com/ws`. This value is public configuration, never a secret. HTTPS frontends require WSS. A missing production URL defaults to `/ws` on the frontend host, useful only when a real reverse proxy routes it to this service. No fake successful connection is shown.

Copy `.env.example` to an ignored `.env` locally. `server:start` and `server:dev` load it. Vite reads its own `.env` files. Production requires an explicit comma-separated `ALLOWED_ORIGINS`; do not use `*`. TLS should terminate at a maintained reverse proxy (example: `server/Caddyfile.example`). Pass HTTP Upgrade headers, permit persistent connections, and use a proxy idle timeout longer than the 10-second heartbeat interval.

`Dockerfile.server` builds a non-root Node 24 image and exposes port 3001. Supply `ALLOWED_ORIGINS` at runtime. Bind published container ports to loopback when a host reverse proxy handles TLS. The health check is `/health`. No credentials or session tokens are logged. SIGTERM/SIGINT stop simulation, notify connected clients, close sockets and stop HTTP.

One process owns its rooms in memory. **Active rooms and sessions do not survive restart.** Use one instance or sticky routing to the owning instance; arbitrary load balancing across independent servers will not work. Shared state/migration would be a separate project. Health is readiness for this process, not proof of a public TLS deployment.

## Lifecycle and fairness

- Explicit lobby → three-second countdown → playing → finished → rematch or lobby. Rooms are unlisted, invite-based, not access-controlled accounts. Anyone with the 40-bit code/link can request a lobby slot.
- Server-generated UUID identities and 256-bit reconnection secrets. Names are presentation only. Tokens stay in per-tab session storage, never invite links or logs. Refresh presents an explicit reconnect action.
- Disconnect reserves the slot for 30 seconds; held input is cleared immediately, and input silence times out after 250ms. Reconnect preserves the same actor, HP, ammunition, statistics, and generation.
- Host role transfers to a connected human; it controls lobby settings, never simulation. A whole team with no remaining/reserved participants forfeits after grace. Deliberate Leave gives up that slot immediately. Earned scores remain in the finished scoreboard.
- Every human must be ready and both teams full, unless labeled bot fill was explicitly enabled. No new participant joins a countdown/active match. Rematch needs all remaining humans; if a participant has departed, host returns to lobby to refill.
- Empty rooms close after 60 seconds, lobby disconnected slots after grace, room maximum lifetime four hours. Limits: 64 rooms, 16 sockets per IP, 20 room attempts/min/IP, 100 messages/sec/socket, 4KiB incoming messages, bounded 8-command input queues and slow-consumer disconnects. Deploy behind appropriate network connection/DoS limits for an Internet service. IP limits use the actual TCP peer, not untrusted forwarded headers; reverse-proxy clients therefore share that peer's limits in this initial version.
- Environmental deaths have no enemy point. Shared original fall thresholds: ≤3m safe, smooth damage to 100 at 10m. No live recovery teleport. Friendly fire remains off.
- Eight minutes by default. Formats default to 20/30/40 points. Tied deadline scores draw. Host can select supported score/time values only in lobby; changing them clears readiness.
- Light aim slowdown is a visible-enemy-only client sensitivity aid; a room may turn it off for everyone. No automatic rotation, hit claims, or bullet magnetism. Custom clients can supply aim input; this is not an anti-cheat product.

## Networking

The explicit typed JSON protocol is in `src/net/protocol.ts`. Node uses the maintained `ws` package; the browser uses native WebSocket. Official API references: https://github.com/websockets/ws/blob/master/doc/ws.md and https://github.com/websockets/ws#how-to-detect-and-close-broken-connections . Origin checks, payload caps and ping/pong are enabled; per-message compression is disabled for predictable cost.

The server simulates at 60Hz, publishes 20Hz snapshots and assigns input acknowledgements, server ticks and event IDs. It consumes at most one queued command each tick; bursts cannot speed the clock. Stale/duplicate sequences are ignored. No command contains trusted position, damage or HP.

Local movement predicts with the same `Physics`, `Stance`, `WeaponState`, and input step as the server. A snapshot restores authoritative state, drops acknowledged commands and replays pending ones. Small corrections ease only the visual camera, never collision. Remote actors interpolate a 100ms server-time buffer; extrapolation is intentionally disabled. RTT/clock offset is estimated from ping/pong. F6 in development shows RTT, snapshot age, correction count and pending commands. F3 retains collision/stance diagnostics.

Local muzzle/recoil feedback is immediate; blood, damage markers and eliminations require server events. IDs deduplicate events. Remote footsteps come from visual gait once, magazine sounds from server events once. Hits are evaluated against current authoritative posture and world/muzzle obstruction. **No historical lag compensation is implemented**; higher latency can make moving targets harder to hit. WebSocket is reliable/in-order but can exhibit head-of-line delay under loss. This implementation does not promise zero latency.

The build-time `npm run export:world` generates `src/net/world-data.json` from the actual World construction, including the market, collision, ramps, spawn candidates, pickups, navigation nodes/edges. It does not fetch assets or run WebGL. Re-export after geometry edits, and rebuild both frontend and server together. Map versions must match.

## Verification tools

- `npm test`: original regression tests plus protocol/rules/server room tests.
- `npm run test:network`: real independent WebSocket sessions on an ephemeral local server; physical 1v1 traversal/combat, 2v2/4v4 rosters, reconnect, host transfer, rematch, simulated latency/jitter, origin and payload checks.
- `/tests/network-browser.html`: development source fixture with two real sessions, prediction/stance/ADS/reload/overlay/pause checks and 20-second frame samples. Scripted input bypasses native pointer capture only inside the fixture; it is not manual gameplay.
- `/tests/visual.html`: existing presentation inspection modes. `/tests/browser.html` and `/tests/tactics.html`: existing offline integration suites.

See `REPORT.md` for actual observed results and limitations. Container/TLS configuration is supplied, not claimed deployed.

Optional bots use the same server physics, weapons and health. They patrol the three original routes, remember seen/heard threats briefly, react with delay, and replan rather than teleport. As in the offline version, exhausting rifle reserve switches a bot to pistol, then knife; human firearms never switch automatically. Bot tactics are a simpler initial server implementation than the offline cover/retreat behavior.
