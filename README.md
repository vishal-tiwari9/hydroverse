# Hydroverse

A browser-based 3D multiplayer boat battle game built with Next.js, React Three Fiber, and custom GLSL shaders.

## Overview

Hydroverse drops players into a cel-shaded ocean arena to compete in boat combat. The game features hand-crafted water and sky shaders, AI opponents, projectile physics, and a lobby with NPC boats before jumping into a match.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 |
| 3D Rendering | React Three Fiber + Three.js |
| Shaders | Custom GLSL (water + sky) |
| State | Zustand |
| Styling | Tailwind CSS |
| Language | TypeScript |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Other Scripts

```bash
npm run build   # Production build
npm run start   # Serve production build
```

## Project Structure

```
hydroverse/
├── app/                    # Next.js app router
│   ├── page.tsx            # Root page (dynamic import, no SSR)
│   └── layout.tsx          # Root layout
├── components/
│   ├── HydroApp.tsx        # Screen router (lobby ↔ game)
│   ├── AnimeWater.tsx      # Water surface mesh + ripple system
│   ├── SkyDome.tsx         # Sky sphere with procedural shader
│   ├── BoatMesh.tsx        # Boat 3D model
│   ├── PalmTree.tsx        # Palm tree decoration
│   ├── WorldDecorations.tsx # Stage, buoys, fireworks, crowd
│   ├── lobby/
│   │   ├── LobbyScene.tsx  # Lobby world setup
│   │   ├── LobbyHUD.tsx    # Lobby UI
│   │   ├── LobbyDock.tsx   # Dock decorations
│   │   ├── NpcBoats.tsx    # Idle NPC boats
│   │   └── PlayerAvatar.tsx# Player character in lobby
│   └── game/
│       ├── GameScene.tsx   # Game world setup + game loop
│       ├── GameHUD.tsx     # In-game HUD (health, ammo, boost)
│       ├── GameWorld.tsx   # Inner game world component
│       ├── PlayerController.tsx # Player input + boat physics
│       └── EndScreen.tsx   # Match end / results screen
├── shaders/
│   ├── waterShader.ts      # Cel-shaded water (Voronoi + ripples)
│   └── skyShader.ts        # Procedural sky (gradient + clouds + sun)
├── lib/
│   ├── aiBoat.ts           # AI pathfinding and behavior
│   ├── projectiles.ts      # Projectile physics and collision
│   ├── scoreManager.ts     # Score tracking
│   ├── sfx.ts              # Sound effects
│   ├── weapons.ts          # Weapon definitions
│   ├── socket.ts           # Socket.IO client singleton
│   └── multiplayer.ts      # Shared multiplayer type definitions
├── components/game/
│   └── RemotePlayer.tsx    # Networked remote player (interpolation)
├── store/
│   └── gameStore.ts        # Zustand global state (incl. multiplayer)
└── server.js               # Custom Node.js + Socket.IO room server
```

## Shaders

### Water (`shaders/waterShader.ts`)

Custom GLSL fragment shader using dual Voronoi layers for cel-shaded ocean water:

- **Voronoi cells** — two blended layers create the animated water pattern
- **3-stop cel ramp** — deep ocean blue → ocean blue → bright highlight
- **Foam edges** — hard-edged white borders between cells
- **Ripple rings** — up to 8 concurrent concentric ripple sources (triggered by boats and collisions)
- **Surface sparkles** — random glints for detail
- **Horizon fade** — distance-based transparency blend

### Sky (`shaders/skyShader.ts`)

Procedural GLSL sky dome rendered on a sphere with `BackSide` material:

- **5-stop gradient** — sea haze → pale horizon → mid blue → deep blue → zenith
- **Sun + corona** — sharp disc with soft glow
- **Atmospheric haze** — blue-white horizon scatter
- **Fractal clouds** — 3-octave FBM noise in a mid-sky band with soft undersides

## Game Systems

- **Player controller** — WASD/arrow key movement, boost, aiming
- **AI boats** — pathfinding with configurable difficulty
- **Weapons** — multiple weapon types with cooldowns
- **Projectile physics** — collision detection against boats and world geometry
- **Ripple system** — water ripples spawned by boat wakes and projectile impacts
- **Match timer** — configurable time limits with kill feed and score tracking

## Multiplayer

Hydroverse runs on a **Socket.IO** transport (WebSocket primary, HTTP polling fallback) with a custom Node.js relay server. The model is **client-authoritative**: each client simulates its own physics and broadcasts state at ~20 Hz; the server validates rooms but does not perform hit detection.

### Architecture

| Component | Role |
|---|---|
| [server.js](server.js) | Custom Node + Socket.IO server. In-memory `Map<roomCode, Room>`; relays state and events; 5-minute grace period for empty rooms (reconnect tolerance) |
| [lib/socket.ts](lib/socket.ts) | Singleton Socket.IO client. `autoConnect: false`, 3 reconnect attempts, env-aware URL resolution |
| [lib/multiplayer.ts](lib/multiplayer.ts) | Shared TypeScript interfaces (`RemotePlayerState`, `PlayerCustomization`, `PlayerInventory`) |
| [components/game/RemotePlayer.tsx](components/game/RemotePlayer.tsx) | Renders networked players with interpolation |
| [components/game/GameScene.tsx](components/game/GameScene.tsx) | Wires socket listeners into the game loop |
| [store/gameStore.ts](store/gameStore.ts) | Holds `isOnline`, `roomCode`, `remotePlayers`, customization state |

### Rooms & Matchmaking

- 4-character alphanumeric room codes generated server-side on `room:create`
- No global matchmaker — players share a code to join (`room:join`)
- Mid-lobby customization (hull color, neon, name) syncs in real time via `room:update_customization`
- Creator triggers `room:start` → all clients transition to the game scene
- Match timer is authoritative via `serverElapsed` to prevent end-of-match desync

### Socket Events

| Event | Direction | Payload | Notes |
|---|---|---|---|
| `room:create` / `room:join` | Client → Server | code, name, customization | Server returns full player roster |
| `room:update_customization` | Bidirectional | partial `PlayerCustomization` | Live lobby preview |
| `room:start` / `room:started` | Creator → All | settings | Switches scene |
| `game:state` | Client → Server → Others | x, z, ry, health, dead | ~20 Hz; server replies with `serverElapsed` |
| `game:shoot` | Client → All others | origin, dir, weaponId | Visual-only — no server damage |
| `game:hit` | Shooter → Victim | toId, damage | Victim applies damage locally |
| `game:kill` | Victim → All | killerName, victimName | Drives kill feed + score |
| `game:powerup_collected` | Client → All | powerupId | Removes pickup for everyone |

### Interpolation

Remote players do **not** use prediction or reconciliation. Instead, [components/game/RemotePlayer.tsx](components/game/RemotePlayer.tsx) lerps toward the latest network target each frame:

- Position: `THREE.MathUtils.lerp(current, target, 12 * dt)`
- Rotation: shortest-path angle wrap before lerp (avoids 360° spins across the ±π seam)
- A decorative `sin(time)` vertical bob is local-only and not synced

### Configuration

Multiplayer is opt-in via environment variables. With none set in a non-localhost environment, the game runs offline (vs. AI bots only).

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SOCKET_URL` | Frontend (build-time) | Production Socket.IO server URL |
| `ALLOWED_ORIGINS` | Server | Comma-separated CORS allowlist |
| `PORT` | Server | Listening port (defaults to 3000 locally) |

For local dev, `server.js` serves both Next.js and Socket.IO on the same port. In production the frontend (e.g. Vercel) connects to a separately-hosted server (e.g. Railway, Render, Fly.io).

### Trust Model & Known Limitations

- **Client-authoritative damage**: a malicious client could fake hit reports. Acceptable for a casual arena game; would need server-side validation for ranked play.
- **No server-side projectile sim**: remote shots are spawned visually from the broadcast origin/direction, so high latency can produce slight visual offset from the actual hit decision.
- **No lag compensation or rollback**: shots resolve in the shooter's local time.

## State Management

Global state lives in a single Zustand store (`store/gameStore.ts`) covering:

- Current screen (`lobby` | `game`)
- Match settings (game mode, difficulty, bot count, limits)
- Player stats (health, ammo, boost, speed)
- Match state (timer, running, ended, kill feed)
