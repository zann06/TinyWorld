# Contributing to TinyWorld

Thanks for considering a contribution. TinyWorld is small on purpose; the goal
is a polished exploration experience, not a large feature count.

## Getting set up

Requires **Node.js 22.12+** (Node 22 or 24 LTS recommended). Check with:

```bash
node --version
npm --version
```

Then:

```bash
npm ci        # install exactly what package-lock.json pins
npm run dev   # http://localhost:5173
```

Useful commands:

| Command             | What it does                                         |
| ------------------- | ---------------------------------------------------- |
| `npm run dev`       | Vite dev server with hot reload                      |
| `npm run build`     | Type-check and produce a production build in `dist/` |
| `npm run preview`   | Serve the production build locally                   |
| `npm run lint`      | ESLint (typescript-eslint strict type-checked)       |
| `npm run typecheck` | `tsc -b --noEmit`                                    |
| `npm test`          | Vitest unit and component tests                      |
| `npm run test:e2e`  | Playwright end-to-end tests                          |
| `npm run verify`    | format + lint + typecheck + unit tests + build        |
| `npm run format`    | Prettier                                             |
| `npm run screenshots` | Re-capture the README screenshots (needs `npm run preview` running) |

The end-to-end suite needs a browser once: `npx playwright install chromium`.

## Before you open a pull request

```bash
npm run verify
npm run test:e2e
```

CI runs exactly these. All three gates must be green: lint, type-check and
tests. Do not disable a rule, weaken an assertion or skip a test to get there —
if a rule is wrong, change the rule and explain why in the pull request.

## House style

- **Strict TypeScript.** No `any`, no non-null assertions, no `@ts-ignore`.
  Every declared type must mean something.
- **No `setState` from `useFrame`.** Per-frame work belongs in the frame loop or
  in `movementState`. React re-renders on human-scale changes only.
- **Pure logic lives outside React.** If it can be a plain function, make it one.
  That is what makes the game systems unit testable.
- **Every button does something real.** No placeholder handlers, no fake success
  messages, no TODOs left in shipped code.
- **The DOM is an alternative, not an afterthought.** Any action available via
  raycasting must also be available from the keyboard through the DOM.
- **Add a test with the feature.** Pure logic goes in `tests/unit`, components in
  `tests/components`, journeys in `tests/e2e`.
- **Comments explain why, not what.** The code already says what it does.

## Adding a landmark

The short version (full detail in `docs/ARCHITECTURE.md`):

1. Add an entry to the island's list in `src/data/islands/<island>-objects.ts`
   with a stable `id`, a `visual` key, a position, a radius and an action label.
2. Build the model as a component in `src/world/objects/ObjectVisual.tsx`, base
   at `y = 0`, in the palette from `src/world/objects/materials.ts`.
3. Register it in `src/world/objects/visual-registry.ts`.
4. Add a radius to that island's `obstacles` in `src/data/islands.ts` if it
   should block movement, and clear the surrounding vegetation automatically
   happens.
5. Verify with `npm test` and a screenshot.

## Adding an island

Add one entry to `ISLANDS` in `src/data/islands.ts` and give it a landmark list
under `src/data/islands/`. The switcher, per-island storage, the directory and
the scene all read from that definition, so nothing else needs to change.

## Assets

TinyWorld currently ships **no third-party assets** — everything is procedural.
If you add a model, texture, image or sound:

- only use material you are allowed to redistribute,
- record it in `ASSET_CREDITS.md` with name, creator, source URL, licence and
  your modifications,
- keep it under `public/assets/{models,textures,audio,icons}/`,
- do not hotlink from a third-party host at runtime.

## Reporting a bug

Open an issue with:

- what you did, what you expected, what happened,
- your browser and OS,
- the output of `npm run verify` if it fails,
- a screenshot if it is a visual problem.

Accessibility issues are treated as bugs, not enhancements. Please say which
assistive technology or input method you were using.

## Licence

By contributing you agree that your work is licensed under the MIT licence that
covers this repository.
