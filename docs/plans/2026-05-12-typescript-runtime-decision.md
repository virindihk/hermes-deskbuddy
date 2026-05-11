# TypeScript Runtime Migration Decision

**Date:** 2026-05-12
**Project:** Hermes DeskBuddy optimization
**Stage:** Stage 2 / B3
**Base:** B2 extracted-module typing (`e37a16978ae5f63e0f41920ab5f90c3b2fa4397e`)

## Decision

Keep the runtime as JavaScript for now, with TypeScript used as a check-only safety net through `allowJs`, `checkJs`, and targeted JSDoc.

Do not move Electron runtime entry points to emitted TypeScript build output in this stage. In particular, keep:

- `package.json` `main`: `src/main.js`
- `npm start`: `electron .`
- source files loaded directly by Electron and the browser as `.js`
- package scripts unchanged

A build-output migration can be reconsidered later, after the large runtime files have been split into smaller typed/tested modules and after a separate verification plan proves that development startup, packaged startup, preload exposure, browser globals, and asset loading all behave the same.

## Rationale

### 1. Electron startup is currently intentionally simple

The app starts with `electron .`, and Electron reads `package.json` `main` directly from `src/main.js`. That keeps local development low-friction and avoids a required prestart build step.

Moving runtime files to `.ts` now would force one of these choices:

- add a build step before every Electron launch;
- point `main` at emitted output; or
- add runtime transpilation.

All three change the startup path. That is too much risk for this stage because the hard constraint is to preserve user-visible behavior.

### 2. The renderer is browser-loaded, not bundled

`src/renderer/index.html` loads scripts directly:

- `modules/i18n.js`
- `modules/pet-hit-test.js`
- `modules/panel-layout.js`
- `renderer.js`

Those scripts depend on browser globals such as `window`, `document`, and globals exposed by the preceding script tags. The current B2 approach supports this by keeping UMD/browser-compatible `.js` modules and adding type checking around them.

A full `.ts` runtime migration would likely need bundling, explicit module format decisions, or emitted browser files. That adds ordering, global exposure, and asset-path risk without producing enough immediate value.

### 3. Preload and main-process globals are boundary-sensitive

`src/preload.js` exposes the IPC bridge through `contextBridge.exposeInMainWorld`, and the renderer consumes that bridge as `window.desktopPet`. The main process uses Electron and Node globals directly.

Check-only TypeScript lets us tighten these boundaries with ambient declarations and JSDoc while keeping the runtime surface unchanged. That is safer than changing file extensions, module formats, or emitted paths at the same time.

### 4. Bundling/build-output cost is real for this app

A build-output runtime path would need decisions for:

- CommonJS vs ESM output;
- preload output location and `path.join(__dirname, 'preload.js')` behavior;
- renderer bundle or emitted script order;
- copied HTML/CSS/avatar/build assets;
- source maps/debugging;
- electron-builder `files` entries;
- dev command parity with current `electron .`.

Those are valid future tasks, but they are not low-risk documentation-stage changes.

### 5. The current Stage 2 path already improves safety

B1 added TypeScript check-only tooling. B2 enabled `checkJs` for extracted modules and added JSDoc/ambient declarations while preserving CommonJS and browser compatibility.

Continuing this path gives incremental safety: more runtime behavior can be covered by tests and types before the project pays the cost of changing how Electron loads the app.

## Rejected for now

### Rename runtime files to `.ts` and emit JavaScript immediately

Rejected for this stage because it would change startup and packaging mechanics before the high-churn files are small enough to verify confidently.

### Introduce a renderer bundler immediately

Rejected for this stage because the current renderer relies on direct script loading and browser globals. Bundling should only happen with a dedicated compatibility test plan for script order, exposed globals, CSS/assets, and Electron preload IPC.

### Add runtime transpilation

Rejected because it adds dependency and startup complexity while providing little benefit over `tsc --noEmit` for this codebase.

## Concrete next steps

1. Keep `npm run typecheck` as `tsc --noEmit` and keep `npm test` as `node --test`.
2. Expand `tsconfig.json` coverage gradually, one low-risk slice at a time.
   - Prefer extracted modules first.
   - Add `// @ts-check` and JSDoc to the files being included.
   - Keep each slice green with focused tests and full `npm test`.
3. Continue extracting testable units out of large runtime files before typing them broadly.
   - Main-process candidates: menu/localization helpers, IPC payload validation, Hermes response normalization.
   - Renderer candidates: session selection state, stream rendering helpers, cron form validation, settings form mapping.
4. Grow `src/types/deskbuddy.d.ts` only as needed for stable app boundaries.
   - Model `window.desktopPet` from the preload API.
   - Keep browser globals explicit instead of relying on implicit `any`.
   - Add Node/Electron types only when they reduce noise without forcing a runtime migration.
5. Preserve CommonJS and browser-global compatibility for extracted modules until a bundler/build-output plan is approved.
6. Revisit build-output TypeScript only after most behavior-heavy code is in typed modules with regression tests.
7. When revisiting build-output, create a separate migration card with acceptance criteria:
   - `npm run typecheck` passes.
   - `npm test` passes.
   - `npm start` or its replacement starts Electron from a clean checkout without manual build confusion.
   - packaged app includes the emitted main, preload, renderer, HTML/CSS/assets, and avatar/build assets.
   - `electron .` parity is either preserved or replaced by an explicitly documented dev command.
   - no edits to `dist/` or `node_modules`.

## Package-script impact

No package script changes are needed for this decision.

Leaving scripts unchanged is deliberate: the current check-only TypeScript posture already enforces the useful safety gate while preserving the existing Electron development workflow.
