# Dungeon Crawler MMO 3D Migration Plan

> For Hermes: Use subagent-driven-development skill to implement this plan task-by-task.

Goal: Transform the current browser-based 2D canvas prototype into a playable browser-based 3D dungeon crawler while keeping the existing Node.js + Socket.io multiplayer backend alive.

Architecture: Do not rewrite the server or move to a native engine first. Keep the current web stack and replace the 2D canvas renderer with a Three.js client. Treat the current dungeon grid and combat rules as the authoritative gameplay model, then build a 3D presentation layer and movement/camera model on top. Ship in vertical slices so the game remains playable after each milestone.

Tech Stack:
- Frontend rendering: Three.js
- Existing networking: Socket.io
- Existing backend: Node.js + Express
- Packaging: current pkg-based desktop launcher/exe flow
- Testing: node --test for server/runtime, lightweight browser smoke tests later

---

## Recommended product direction

Default interpretation for “make it 3D”:
- Browser-based 3D game, not a Unity/Godot rewrite
- Third-person or over-the-shoulder camera first
- Grid-authored dungeon kept on the server for now
- Stylized primitive geometry first (boxes, capsules, billboards), real art assets later

Why this is the right next step:
- preserves your working MMO/web/exe pipeline
- fastest route to a playable 3D version
- avoids a full-engine rewrite before gameplay is stable

---

## Current repo constraints discovered

Current state in repo:
- `public/game.js` contains rendering, input, UI updates, and socket event handling all in one file
- `public/index.html` is still a 2D canvas shell
- server already exposes dungeon map, player state, enemies, and combat events over Socket.io
- game logic is tile/grid based and therefore suitable as a first 3D prototype backend

Main technical debt blocking 3D:
1. client logic is monolithic
2. render code is tightly coupled to socket/input code
3. there is no asset pipeline yet
4. there is no interpolation/camera/scene abstraction

---

## Phase roadmap

Phase 1: Prepare the client for a renderer swap
Phase 2: Introduce Three.js and a 3D dungeon scene
Phase 3: Replace 2D player/enemy rendering with 3D actors
Phase 4: Add 3D camera, targeting, combat feedback, and movement feel
Phase 5: Add real assets, lighting polish, and packaging updates

---

## Milestone 1: Client refactor for renderer independence

Outcome:
- no visual 3D yet
- game remains playable
- renderer, networking, game state, and UI separated

Files to create:
- `public/src/main.js`
- `public/src/net/socket-client.js`
- `public/src/state/game-state.js`
- `public/src/render/render-interface.js`
- `public/src/render/canvas2d-renderer.js`
- `public/src/input/input-controller.js`
- `public/src/ui/ui-controller.js`

Files to modify:
- `public/index.html`
- `public/game.js` -> either remove later or reduce to bootstrap shim

Tasks:
1. Extract socket event registration from `public/game.js` into `public/src/net/socket-client.js`
2. Move mutable state (`player`, `dungeon`, `enemies`, `lastDrop`) into `public/src/state/game-state.js`
3. Move HUD updates into `public/src/ui/ui-controller.js`
4. Create a renderer interface with methods like:
   - `init(container)`
   - `setWorldState(state)`
   - `render(deltaTime)`
   - `dispose()`
5. Wrap the current 2D canvas logic into `canvas2d-renderer.js`
6. Create `main.js` bootstrap that wires input + socket + state + renderer together
7. Verify the game still plays exactly like before

Acceptance criteria:
- clicking “Spielen” still enters the game
- movement and combat still work
- no gameplay logic moved from server to client
- renderer can be swapped without touching socket code

Commit target:
- `refactor: split client into state network ui and renderer modules`

---

## Milestone 2: Add a 3D renderer alongside the 2D renderer

Outcome:
- same gameplay data, now visible in a basic 3D scene
- temporary debug geometry is acceptable

Dependencies to add:
- `three`

Files to create:
- `public/src/render/three/three-renderer.js`
- `public/src/render/three/scene-factory.js`
- `public/src/render/three/dungeon-mesh-builder.js`
- `public/src/render/three/entity-factory.js`
- `public/src/render/three/camera-controller.js`

Files to modify:
- `package.json`
- `public/index.html`
- `public/src/main.js`

Approach:
- use ES modules in the browser
- build one floor plane per walkable cell or merged floor chunks
- build wall cubes from wall cells
- represent player and enemies as capsules or colored boxes first
- preserve top-down-ish readability at first with an angled camera

Tasks:
1. Add `three` dependency
2. Change client entry to module script loading `public/src/main.js`
3. Create a `ThreeRenderer` with scene, camera, lights, renderer, resize handling
4. Convert dungeon map tiles into 3D geometry:
   - wall tile => cube wall
   - floor tile => floor quad/box
   - start/end => emissive markers
5. Render player as blue capsule/cylinder
6. Render enemies as colored primitive meshes by type
7. Add a config flag to switch between 2D and 3D renderer during migration
8. Verify socket-driven state still updates scene positions

Acceptance criteria:
- dungeon is visible in 3D
- player and enemies appear in correct positions
- no game logic regression
- can switch between old 2D and new 3D renderer during development

Commit target:
- `feat: add initial threejs dungeon renderer`

---

## Milestone 3: Movement, camera, and animation feel

Outcome:
- the game feels like a 3D crawler instead of a tile debugger

Files to create:
- `public/src/render/three/animation-system.js`
- `public/src/render/three/interpolation.js`

Files to modify:
- `public/src/input/input-controller.js`
- `public/src/render/three/camera-controller.js`
- `public/src/render/three/three-renderer.js`

Tasks:
1. Add client-side interpolation between server tile positions
2. Smooth actor movement rather than teleporting one tile visually
3. Add camera follow with configurable offset and damping
4. Add facing/rotation updates from movement direction
5. Add simple attack feedback:
   - flash mesh color
   - small scale punch animation
   - floating damage text later if desired
6. Add death/respawn visual feedback
7. Keep movement rules server-authoritative

Acceptance criteria:
- movement looks smooth
- camera follows player cleanly
- attacks and enemy turns are visually readable
- network jitter does not break presentation

Commit target:
- `feat: add smooth 3d movement and camera follow`

---

## Milestone 4: 3D-ready UX and gameplay adjustments

Outcome:
- controls and UI fit a 3D game better

Files to modify:
- `public/index.html`
- `public/src/ui/ui-controller.js`
- `public/src/input/input-controller.js`
- optionally server combat/range tuning files in `server/app.js`

Tasks:
1. Replace 2D-specific canvas assumptions in UI text
2. Add crosshair/reticle or target highlight
3. Re-evaluate weapon ranges in 3D readability terms
4. Add minimap overlay using dungeon grid for navigation
5. Add on-screen controls/help for camera mode and interaction
6. Add pause/settings panel with quality toggles

Acceptance criteria:
- UI does not feel like a leftover 2D prototype
- navigation remains readable in larger dungeons
- users can understand controls without guesswork

Commit target:
- `feat: adapt ui and controls for 3d gameplay`

---

## Milestone 5: Assets, audio, and visual identity

Outcome:
- prototype becomes presentation-worthy

Recommended early art strategy:
- use primitives first
- then replace with low-poly packs or custom assets
- keep collision and gameplay on grid even if visuals become richer

Files/folders to add:
- `public/assets/models/`
- `public/assets/textures/`
- `public/assets/audio/`
- `public/src/render/three/asset-loader.js`

Tasks:
1. Add asset loader for GLTF models and textures
2. Replace primitive meshes with low-poly player/enemy/environment assets
3. Add baked or simple dynamic lighting/fog
4. Add ambient dungeon audio and combat SFX
5. Add material variants for rarity, exits, and dungeon themes
6. Verify EXE packaging includes new assets

Acceptance criteria:
- game looks intentionally 3D, not debug-only
- assets load correctly in browser and packaged exe
- performance remains acceptable on mid-range hardware

Commit target:
- `feat: add low poly 3d assets and dungeon atmosphere`

---

## Server-side changes likely needed later

These are not required for the first 3D milestone but should be planned:
- send actor animation hints (`isAttacking`, `isDead`, `tookDamage`)
- include per-enemy visual archetype metadata
- optionally send deterministic dungeon seeds instead of whole maps later
- add world object layer for torches, loot pedestals, doors, traps
- add server timestamps for better interpolation/reconciliation

---

## Minimum viable 3D slice

The fastest playable 3D version should be this exact slice:
1. Keep all current backend logic
2. Add Three.js
3. Render dungeon as blocks and floors
4. Render player/enemies as primitives
5. Add angled follow camera
6. Keep same movement/combat/loot rules
7. Ship browser + exe build

That gets you from “2D prototype” to “playable 3D prototype” without blowing up scope.

---

## Risks and mitigations

Risk: full rewrite impulse
- Mitigation: keep backend and game rules intact for first 3D pass

Risk: poor frame rate from one mesh per tile
- Mitigation: merge geometry or use instancing after first scene works

Risk: networked movement feels bad in 3D
- Mitigation: keep server authority, add interpolation only on client visuals

Risk: asset pipeline breaks exe packaging
- Mitigation: expand `pkg.assets` coverage as each asset folder is added

Risk: monolithic client slows iteration
- Mitigation: do Milestone 1 before any serious 3D work

---

## Concrete next implementation step

The best immediate next step is not “build all of 3D now.”
The best immediate next step is:

Step A: refactor the client into modules
Step B: introduce Three.js behind a renderer switch
Step C: render the existing dungeon grid in 3D with primitive geometry

That is the lowest-risk path.

---

## Suggested first execution batch

Batch 1:
- modularize client bootstrap/state/socket/ui
- preserve current 2D behavior

Batch 2:
- add Three.js dependency and basic scene boot
- render walls/floors in 3D

Batch 3:
- add player/enemy meshes and follow camera
- verify packaged build still works

---

## Definition of done for “3D transformation started successfully”

This project can honestly be called “now becoming a 3D game” once all of the following are true:
- dungeon is rendered in a Three.js scene
- player and enemies are visible as 3D objects
- camera follows the player
- movement/combat remain playable
- browser build and exe build both still run

---

## Recommended commit sequence

1. `refactor: split web client into modules`
2. `feat: add threejs scene bootstrap`
3. `feat: render dungeon grid in 3d`
4. `feat: render networked actors in 3d`
5. `feat: add camera follow and interpolation`
6. `feat: adapt hud and controls for 3d`
7. `feat: add 3d assets and lighting polish`

---

## Execution recommendation

I can implement this incrementally.
Recommended starting scope for the next coding pass:
- Milestone 1 completely
- then the smallest possible Milestone 2 slice

That means: first I turn the current `public/game.js` into a modular client foundation, then I add a switchable Three.js renderer.
