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
              ├─ TopBar                  brand + progress + settings
              ├─ WorldCanvas             <Canvas> + input + interaction layer
              │   ├─ GreenhavenScene     the island
              │   │   ├─ TimeBasedLighting
              │   │   ├─ SkyDome / Water / Terrain / IslandPath / Vegetation
              │   │   ├─ InteractiveObjects   raycast selection + models
              │   │   ├─ PlayerAvatar
              │   │   └─ CameraRig       movement + follow camera
              │   └─ RendererBridge      exposes the renderer to photo mode
              ├─ SettingsDialog / JournalDialog / OnboardingDialog
              └─ ToastHost
```

| Layer             | Location                         | Responsibility                                                   |
| ----------------- | -------------------------------- | ---------------------------------------------------------------- |
| Presentation      | `src/components`, `src/features` | DOM UI. Every control performs a real action.                    |
| Application state | `src/store`                      | Zustand stores for game, settings, UI shell and world effects.   |
| 3D world          | `src/world`                      | Rendering, geometry, lighting, camera, animation.                |
| Game systems      | `src/game`                       | Input mapping, collision, interaction dispatch, discovery rules. |
| Data              | `src/data`                       | Typed world and object definitions. Pure; no rendering.          |
| Persistence       | `src/lib/storage.ts`             | Namespaced, validated, failure-tolerant localStorage.            |

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

`src/data/objects.ts` declares every landmark once:

```
WorldObjectDef
  ├─ id           stable, never renamed without a migration
  ├─ visual       key into src/world/objects/visual-registry.ts
  ├─ position     world coordinates (y is derived from the terrain)
  ├─ radius       proximity reach and selection halo size
  └─ interactable + actionLabel
```

Adding a landmark therefore touches exactly two files: the data array and a new
component in `ObjectVisual.tsx`. A unit test fails the build if a declared
object has no registered visual.

`src/data/world.ts` holds the coastline function, the footpath, obstacle
radii and the decoration scatter clusters. `coastlineRadius` lives here rather
than in the terrain module so that collision and rendering share one boundary
and can never disagree about where the island ends.

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
older save cannot break a newer build.

## Performance

- Repeated props are `InstancedMesh` — a few hundred trees cost a handful of
  draw calls.
- Geometry and materials are cached once per session in
  `src/world/objects/geometry.ts` and `materials.ts`.
- Quality presets change device pixel ratio, shadow type, shadow map size and
  decoration density.
- Nothing calls `setState` from `useFrame`.

## Adding a landmark

1. Add an entry to `WORLD_OBJECTS` in `src/data/objects.ts`.
2. Build the model as a component in `src/world/objects/ObjectVisual.tsx`,
   with its base at `y = 0`, and register it in `src/world/objects/visual-registry.ts`.
3. If it should block movement, add a radius to `OBSTACLES` in `src/data/world.ts`.
4. Run `npm test`. A missing visual fails the suite.

The scene, journal, directory, interaction prompt, progress and persistence all
pick it up with no further changes.
