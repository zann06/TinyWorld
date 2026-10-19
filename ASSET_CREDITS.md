# Asset credits

TinyWorld is MIT licensed. The MIT licence applies to **source code only**.

## 3D models, textures and images

**TinyWorld ships with no third-party 3D models, textures or image files.**

Every object in Greenhaven Island is generated procedurally at runtime from
Three.js primitive geometry:

| Asset group                                                                                       | Where it is built                                   | How                                                                                                                     |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Island terrain, hills, beach, vertex colours                                                      | `src/world/terrain/terrain.ts`                      | Displaced `PlaneGeometry` with baked vertex colours                                                                     |
| Coastline shape                                                                                   | `src/data/world.ts` (`coastlineRadius`)             | Pure maths, shared by the mesh and collision                                                                            |
| Water, shallow shelf, foam line                                                                   | `src/world/scenes/Environment.tsx`                  | `PlaneGeometry` + `RingGeometry`                                                                                        |
| Sky gradient                                                                                      | `src/world/scenes/Environment.tsx` (`SkyDome`)      | `ShaderMaterial` on a `SphereGeometry`                                                                                  |
| Trees, rocks, grass, flowers                                                                      | `src/world/objects/geometry.ts` + `Environment.tsx` | Shared `CylinderGeometry` / `ConeGeometry` / `DodecahedronGeometry` / `IcosahedronGeometry`, drawn with `InstancedMesh` |
| Landmarks (lighthouse, cottage, windmill, dock, signpost, watchtower, garden, camp, arch, spring) | `src/world/objects/ObjectVisual.tsx`                | Composed from primitives                                                                                                |
| Explorer avatar                                                                                   | `src/world/characters/PlayerAvatar.tsx`             | Composed from primitives                                                                                                |
| Interface icon                                                                                    | `public/favicon.svg`                                | Hand-authored SVG                                                                                                       |
| Screenshots in `docs/screenshots/`                                                                | `scripts/capture-screenshots.mjs`                   | Captured from this repository's own production build                                                                    |

Because no external assets are bundled, TinyWorld has no third-party asset
redistribution obligations.

## Audio

**No audio files are bundled.** The ambient soundscape is synthesised at runtime
with the Web Audio API — pink noise shaped by filters and slow LFOs into surf,
wind and occasional bird calls. See `src/lib/audio.tsx`.

## Fonts

No web fonts are downloaded or bundled. The interface uses the system font
stack, declared in `src/styles/index.css` (`--font-display`, `--font-sans`).

## NPM dependencies

Runtime dependencies are listed in `package.json` and are separately licensed
by their respective authors. Run `npm ls --depth=0` to see the exact versions
used, which are pinned by `package-lock.json`.

## If you contribute an asset

If you add a third-party model, texture, image or sound to the repository:

1. Add an entry to this file with the asset name, creator, source URL, licence
   and a description of the modifications you made.
2. Include the licence text alongside the asset.
3. Do not add assets whose licence forbids redistribution, or assets taken from
   commercial games without permission.
4. Prefer a procedurally generated equivalent where one is reasonable.

Place redistributable assets under `public/assets/{models,textures,audio,icons}/`.
