# Hermes DeskBuddy Architecture Optimization Plan

> For Hermes: use Kanban for durable orchestration. Use subagent-driven-development style inside each Kanban card: TDD first, commit each task, report commit hash and verification output.

Goal: optimize the current Hermes DeskBuddy Electron app in three stages without changing user-visible behavior: (1) modularize the current JavaScript code, (2) introduce TypeScript safely, (3) upgrade tests from source-regex assertions toward behavior/module tests.

Current baseline:
- Repo: /Users/leo/Desktop/hermes-desktop-pet
- Working branch: refactor/hermes-deskbuddy-architecture
- Baseline tests: npm test passes 13/13 after commit 62fcfb9
- Current architecture pressure points:
  - src/main.js is ~821 lines and mixes settings, Hermes CLI, window management, menu, sessions, cron, IPC.
  - src/renderer/renderer.js is ~1778 lines and mixes DOM lookup, i18n, chat, settings, pet state, pet hit-testing, panel layout, resizing, cron, sessions.
  - test/app.test.js mostly asserts source-code regex, which is useful as smoke coverage but brittle and weak for behavior.

Hard constraints:
- Preserve existing behavior unless a card explicitly says otherwise.
- Keep npm test green at every completed card.
- Do not edit dist/ or node_modules.
- Do not delete bugfix1.md; it is an untracked reference note.
- Do not make unrelated product/brand changes beyond existing Hermes DeskBuddy baseline.
- Prefer additive module extraction first; avoid risky big rewrites.
- For parallel Kanban cards, avoid editing the same existing large file unless the card is an explicit integration card.

Kanban execution strategy:
- Planning and pure-module extraction can run in parallel.
- Integration cards are gated behind extraction cards to avoid conflicts in main.js and renderer.js.
- TypeScript comes after the JavaScript modules are separated.
- Test upgrade comes after modules exist, because tests need stable pure functions to target.

Stage 1: JavaScript modularization

Task A1: Extract main settings store
Objective: Move settings normalization and persistence out of src/main.js into a testable CommonJS module.
Files:
- Create: src/main/settings-store.js
- Create: test/settings-store.test.js
- Modify later only if necessary: src/main.js
Expected module API:
- DEFAULT_MODEL
- DEFAULT_SETTINGS
- createSettingsStore({ app, fs, path }) returning { getSettingsPath, normalizeSettings, readSettingsFromDisk, getSettings, saveSettings, resetCache }
Testing:
- normalizeSettings trims model/hermesPath/sessionId and clamps petScale 50..300.
- readSettingsFromDisk returns DEFAULT_SETTINGS on missing/invalid JSON.
- saveSettings writes pet-settings.json under app.getPath('userData') and returns normalized settings.
Verification:
- node --test test/settings-store.test.js
- npm test
Commit message: refactor: extract main settings store

Task A2: Extract Hermes CLI client
Objective: Move Hermes binary discovery, env preparation, chat execution, and output parsing into a testable CommonJS module.
Files:
- Create: src/main/hermes-cli-client.js
- Create: test/hermes-cli-client.test.js
- Do not wire into src/main.js yet unless the card is explicitly changed to integration.
Expected module API:
- createHermesCliClient({ fs, path, os, spawn, getSettings, env }) returning { findHermesBinary, getHermesEnv, runHermesChat, parseHermesChatOutput, checkHealth }
Testing:
- findHermesBinary honors settings.hermesPath first when executable.
- getHermesEnv prepends common bin paths without dropping existing PATH.
- runHermesChat builds args ['chat','-q',text,'-Q'], adds -m for non-default model, adds --resume for session.
- parseHermesChatOutput extracts session_id and reply, skips resumed-session system lines.
Verification:
- node --test test/hermes-cli-client.test.js
- npm test
Commit message: refactor: extract Hermes CLI client

Task A3: Extract renderer pet hit-test logic
Objective: Move pure pet hit-test math out of renderer.js into a browser/test compatible module.
Files:
- Create: src/renderer/modules/pet-hit-test.js
- Create: test/pet-hit-test.test.js
- Do not wire into renderer.js yet.
Module format for Stage 1:
- Use a small UMD-style wrapper so it works in Node tests via module.exports and later in browser via window.DeskBuddyPetHitTest.
Expected functions:
- PET_HIT_ALPHA_THRESHOLD
- pointInRect(x, y, rect)
- mapPointToContainedImage(x, y, rect, imageSize)
- isAlphaHit(alpha, threshold = PET_HIT_ALPHA_THRESHOLD)
- isFallbackShapeHit(x, y, rect)
Testing:
- transparent alpha below threshold returns false.
- contained-image mapping handles letterboxing/pillarboxing.
- fallback ellipse rejects obvious corner transparency and accepts center.
Verification:
- node --test test/pet-hit-test.test.js
- npm test
Commit message: refactor: extract pet hit testing

Task A4: Extract renderer panel layout logic
Objective: Move scaled-pet panel/window sizing math out of renderer.js into a pure module.
Files:
- Create: src/renderer/modules/panel-layout.js
- Create: test/panel-layout.test.js
- Do not wire into renderer.js yet.
Module format:
- UMD-style wrapper for Node tests and browser global window.DeskBuddyPanelLayout.
Expected constants/functions:
- PET_BASE_SIZE, PET_RIGHT_OFFSET, PET_BOTTOM_OFFSET, PANEL_LEFT_MARGIN, PANEL_TOP_MARGIN, PANEL_GAP, MIN_PANEL_BOTTOM
- getPetVisualSize(scale)
- getDesiredPanelBottom(scale)
- getPanelLayout({ scale, panelWidth, panelHeight })
- clampPanelSize({ panelWidth, panelHeight, targetWidth, targetHeight, desiredBottom })
- getWindowResizePlan({ bounds, requiredWidth, requiredHeight, screen })
Testing:
- scale=2 gives desiredBottom = 328 and requiredHeight = 736 for panelHeight 390.
- resize plan expands upward/leftward while preserving bottom/right anchor.
- clampPanelSize respects min panel size and available screen space.
Verification:
- node --test test/panel-layout.test.js
- npm test
Commit message: refactor: extract panel layout math

Task A5: Integrate main modules
Objective: Wire settings-store.js and hermes-cli-client.js into src/main.js, reducing duplication without changing IPC behavior.
Parents: A1, A2
Files:
- Modify: src/main.js
- Maybe update: test/app.test.js if source-regex assertions need to point at modules instead of inline functions.
Required behavior:
- All existing IPC handlers still exist and return same shapes.
- Hermes chat/session/model behavior unchanged.
- Settings path remains app.getPath('userData')/pet-settings.json.
Verification:
- node --check src/main.js src/main/settings-store.js src/main/hermes-cli-client.js
- node --test test/settings-store.test.js test/hermes-cli-client.test.js
- npm test
Commit message: refactor: wire main modules

Task A6: Integrate renderer modules
Objective: Load pet-hit-test.js and panel-layout.js from index.html and use them from renderer.js, reducing inline math while preserving behavior.
Parents: A3, A4
Files:
- Modify: src/renderer/index.html
- Modify: src/renderer/renderer.js
- Maybe update: test/app.test.js if source-regex assertions need to point at modules instead of inline functions.
Required behavior:
- Transparent pet image pixels still do not capture clicks.
- Scaled pet panels still expand BrowserWindow and do not clip.
- Chat resize still batches window bounds and avoids flicker.
Verification:
- node --check src/renderer/renderer.js src/renderer/modules/pet-hit-test.js src/renderer/modules/panel-layout.js
- node --test test/pet-hit-test.test.js test/panel-layout.test.js
- npm test
Commit message: refactor: wire renderer modules

Stage 2: TypeScript introduction

Task B1: Add TypeScript tooling in check-only mode
Objective: Add TypeScript as a dev dependency and configure it without changing runtime packaging yet.
Parents: A5, A6
Files:
- Modify: package.json
- Modify: package-lock.json if npm install updates it
- Create: tsconfig.json
- Maybe create: src/types/deskbuddy.d.ts
Scripts:
- Add npm script typecheck: tsc --noEmit
Recommended tsconfig:
- allowJs: true
- checkJs: true initially
- noEmit: true
- target: ES2022
- module: commonjs initially
- strict: false initially, noImplicitAny: false initially
Verification:
- npm install if needed
- npm run typecheck
- npm test
Commit message: chore: add TypeScript check tooling

Task B2: Add JSDoc/types for extracted modules
Objective: Make the extracted modules type-check cleanly while still running as JS.
Parents: B1
Files:
- Modify: src/main/settings-store.js
- Modify: src/main/hermes-cli-client.js
- Modify: src/renderer/modules/pet-hit-test.js
- Modify: src/renderer/modules/panel-layout.js
- Modify/create: src/types/deskbuddy.d.ts if useful
Verification:
- npm run typecheck
- npm test
Commit message: refactor: type extracted modules

Task B3: Decide TS migration path for runtime files
Objective: Produce a short decision note and minimal config update for whether to keep JS+checkJs or move to build output.
Parents: B2
Files:
- Create: docs/plans/2026-05-12-typescript-runtime-decision.md
- Modify package scripts only if the decision is low-risk and verified.
Decision criteria:
- Electron runtime startup simplicity.
- Whether renderer browser globals make TS build worthwhile.
- Cost of introducing bundling.
- Preserve simple `electron .` dev workflow if possible.
Verification:
- npm test
- npm run typecheck
Commit message: docs: record TypeScript migration decision

Stage 3: Test upgrade

Task C1: Replace brittle source regex tests with module behavior tests where modules now exist
Objective: Reduce reliance on regex assertions in test/app.test.js for extracted behavior.
Parents: A5, A6, B1
Files:
- Modify: test/app.test.js
- Add/modify module tests as needed.
Guidance:
- Keep a small smoke test for IPC bridge names and file existence.
- Move settings behavior into test/settings-store.test.js.
- Move Hermes CLI args/output behavior into test/hermes-cli-client.test.js.
- Move pet hit-testing into test/pet-hit-test.test.js.
- Move panel layout into test/panel-layout.test.js.
Verification:
- npm test
- npm run typecheck if available
Commit message: test: replace source regex coverage with behavior tests

Task C2: Final integration review
Objective: Review the whole refactor for behavior preservation, maintainability, and test quality.
Parents: C1, B2, B3
Files:
- No implementation unless fixing review findings.
Checks:
- npm test passes.
- npm run typecheck passes if present.
- git diff is scoped to source/tests/docs/package files, not dist/node_modules.
- main.js and renderer.js have materially fewer responsibilities.
- No task left only half-wired.
Output:
- Summary of final architecture.
- Remaining technical debt list.
- Recommendation whether to continue toward full TS/bundler conversion later.
Commit message if fixes are made: fix: address architecture review findings
