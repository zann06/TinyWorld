# Architecture

This document explains how TinyWorld is put together and, more importantly, why
it is put together that way.

## Design principles

1. **React renders the scene graph; the frame loop drives it.** Anything that
   changes every frame — movement, camera damping, animation, pulsing selection
   rings — lives in a `useFrame` callback or in a module-level mutable object.
   React state is only updated when a human-scale fact changes (selection,
   discovery, settings).
2. **Data is separated from rendering.** Landmarks live in `src/data/*.ts` as
   plain typed objects. The 3D scene, the DOM directory, the journal and the
   interaction system all read the same array.
3. **The DOM is a first-class interface.** A `<canvas>` cannot be made
   accessible with ARIA. Every landmark is therefore also a real HTML card with
   its text, category, status and actions.
4. **Fail soft and visibly.** Storage can be blocked, WebGL can be missing,
   screenshots can fail. Each has a designed outcome rather than a crash.

## Layer map

```
main.tsx
  └─ hydrateStores()                      persist state loaded before first render
  └─ AppProviders                        reduced-motion → document element
      └─ ErrorBoundary
          └─ App                         shell, WebGL detection, overlays
              ├─ TopBar                  brand + island switcher + progress + settings
              ├─ Suspense                falls back while the 3D chunk downloads
              │   └─ WorldCanvas         <Canvas> + input + interaction layer
              │       ├─ IslandScene     one island, keyed on the island id
              │       │   ├─ TimeBasedLighting
              │       │   ├─ SkyDome / Water / Terrain / IslandPath / Vegetation
              │       │   ├─ InteractiveObjects   raycast selection + models
              │       │   ├─ PlayerAvatar
              │       │   └─ CameraRig       movement + follow camera
              │       └─ RendererBridge      exposes the renderer to photo mode
              ├─ SettingsDialog / JournalDialog / OnboardingDialog
              └─ ToastHost
```

| Layer             | Location                         | Responsibility                                                   |
| ----------------- | -------------------------------- | ---------------------------------------------------------------- |
| Presentation      | `src/components`, `src/features` | DOM UI. Every control performs a real action.                    |
| Application state | `src/store`                      | Zustand stores for game, settings, UI shell and world effects.   |
| 3D world          | `src/world`                      | Rendering, geometry, lighting, camera, animation.                |
| Game systems      | `src/game`                       | Input mapping, collision, interaction dispatch, discovery rules. |
| Data              | `src/data`                       | Island definitions and landmarks. Pure; no rendering.            |
| Persistence       | `src/lib/storage.ts`             | Namespaced, validated, failure-tolerant localStorage.            |

## Islands

TinyWorld has more than one island, and **nothing outside `src/data/islands.ts`
branches on which one is active**. An `IslandDefinition` carries everything
needed to stand on one island: radius, spawn point, coastline harmonics, terrain
shape, palette, footpath, obstacles, decorative scatter and its landmarks.

Two rules keep that honest:

- **Terrain is built by a factory, not a global.** `createTerrain(island)`
  returns functions bound to that island in a closure. Nothing reads module-level
  "current island" state, so two terrains can coexist and every function stays
  pure and unit-testable.
- **Scene components take the island as a prop.** `IslandScene` is rendered with
  `key={island.id}`, so travelling remounts it and the terrain geometry and
  instanced vegetation are regenerated rather than left over from the island you
  just left.

Progress and the saved player position are both keyed by island id. Stored
progress moved to version 2 (`{ version: 2, islands: { … } }`); a version 1 save
is migrated by bucketing each entry under the island that owns it.

## State

Four stores, deliberately split so that unrelated changes do not invalidate
unrelated selectors:

- **`game-store`** — selection, nearby target, panel visibility, discoveries,
  photo mode, toasts. Owns the interaction dispatcher (`interact`).
- **`settings-store`** — quality, camera sensitivity, volume, reduced motion,
  time of day. Persisted on every change.
- **`ui-store`** — which blocking overlay is open. `blocking` freezes world
  input while a dialog owns the screen.
- **`world-effects`** — transient scene state produced by interactions (a lit
  lantern, a stoked fire).

Per-frame state deliberately does **not** live in any store. `movementState`
in `src/game/input/useKeyboardControls.ts` is a plain mutable object read and
written by the frame loop. Writing to it causes no renders.

## World data flow

Each island's landmarks live in one file under `src/data/islands/`. A landmark
declares exactly this:

```
WorldObjectDef
  ├─ id           stable, never renamed without a migration, unique across islands
  ├─ visual       key into src/world/objects/visual-registry.ts
  ├─ position     world coordinates (y is derived from the terrain)
  ├─ radius       proximity reach and selection halo size
  └─ interactable + actionLabel
```

Adding a landmark therefore touches exactly two files: the island's landmark
list and a new component in `ObjectVisual.tsx`. Three unit tests guard the edges:
a declared object with no registered visual fails, a landmark placed below the
waterline fails, and an object id claimed by two islands fails.

`src/data/islands.ts` holds the island definitions. `src/data/world.ts` holds
only the coastline maths, parameterised by a `CoastShape`. `coastlineRadius`
lives there rather than in the terrain module so that collision and rendering
share one boundary and can never disagree about where an island ends — which is
also why `resolvePosition` takes the coastline as an argument rather than
importing one.

The three shared hazards that come with parameterising all of this, and what
stops each:

| Hazard                                            | Guard                                                   |
| ------------------------------------------------- | ------------------------------------------------------- |
| A landmark ends up under water after a shape tweak | Test: every landmark and path point must be above 0.     |
| A coastline clamp silently uses the wrong island    | `resolvePosition` requires the coastline; no default.   |
| A cached material from island A leaks into island B | `matteMaterial` takes a `scope`; per-island callers pass the island id. |

## Input model

`src/game/input/input.ts` contains pure mapping functions (key → movement
vector, key → action, focus-target guards). They are unit tested without a DOM.

`src/game/input/useKeyboardControls.ts` wires them to `window` listeners and
owns the pointer/wheel listeners for drag-look and zoom. Listeners are removed
on unmount, and keys are released on `window.blur` so the explorer cannot walk
forever after an alt-tab.

The camera uses **drag-to-look, not pointer lock**. This is a deliberate
choice: pointer lock makes click-to-select ambiguous and is hostile to touch and
to assistive technology. Dragging keeps pointer events, hover and tap available.

## Collision

`resolvePosition` is a pure function: given a proposed position, a player radius
and the obstacle list, it returns a corrected position. The player is first
clamped inside the real (wobbled) coastline, then pushed out of every circular
obstacle. `findNearest` resolves the interactable object within reach, breaking
ties deterministically by ID so the interaction prompt never flickers.

## Persistence

All storage goes through `src/lib/storage.ts`, which:

- namespaces every key under `tinyworld:`,
- rejects non-object and array payloads,
- validates every field independently on read, so one corrupt key cannot poison
  the rest,
- falls back to an in-memory map when `localStorage` is unavailable, blocked or
  over quota, and reports that state so the UI can say settings will not persist.

Discovery entries for landmarks that no longer exist are dropped on load, so an
older save cannot break a newer build. The stored progress schema is version 2,
keyed by island; version 1 saves migrate by bucketing each entry under the island
that owns it. The resume position is versioned the same way, so travelling
between islands never loses either one's position.

## Performance

- Repeated props are `InstancedMesh` — a few hundred trees cost a handful of
  draw calls.
- Geometry and materials are cached once per session in
  `src/world/objects/geometry.ts` and `materials.ts`. Materials whose colour
  varies per island pass a `scope` so the cache cannot hand island A's water to
  island B.
- Quality presets change device pixel ratio, shadow type, shadow map size and
  decoration density.
- The 3D world is a lazy chunk (`React.lazy` in `App.tsx`), so the interface
  paints from a ~133 kB gzipped shell while Three.js streams in separately.
- Nothing calls `setState` from `useFrame`.

## Adding a landmark

1. Add an entry to the island's list in `src/data/islands/<island>-objects.ts`.
2. Build the model as a component in `src/world/objects/ObjectVisual.tsx`,
   with its base at `y = 0`, and register it in `src/world/objects/visual-registry.ts`.
3. If it should block movement, add a radius to that island's `obstacles` in
   `src/data/islands.ts`.
4. Run `npm test`. A missing visual, a landmark below the waterline, or an id
   claimed by two islands all fail the suite.

The scene, journal, directory, interaction prompt, progress and persistence all
pick it up with no further changes.

## Adding an island

Add one entry to `ISLANDS` in `src/data/islands.ts`. It must supply a unique id,
a coastline, a height field, a palette, a spawn point, a footpath, obstacles,
scatter clusters and at least one landmark. Nothing outside that file — and the
new landmark file — needs to change: the switcher, storage, the directory and the
scene all read from the island definition.
