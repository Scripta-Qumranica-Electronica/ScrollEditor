# ScrollEditor Vue-2→3 Migration — Completion Plan

**Purpose:** finish the migration by proving, with automated tests, that (A) every
API call site is exercised by an e2e test, and (B) every interactive UI element is
present, correctly laid out, reachable, and functional — with an e2e test per item.
This doc is self-contained: a fresh session should be able to run everything below
without prior context.

Branch: `vue3-migration` (ScrollEditor). Nothing is committed yet — all work is in the
working tree. Related deep context lives in the agent memory files
`realtime-state-sync.md` and `sqe-local-dev-stack.md`.

---

## 0. How to run the stack + tests (READ FIRST)

Three processes are needed: **DB (:3307)**, **API (:5000)**, **frontend (:8080, instrumented)**.

- **DB:** MariaDB in the `SQE_Database` OrbStack container (data in a volume; test data
  is disposable). `docker start SQE_Database` if stopped.
- **API:** `SQE_HTTP_API` **container** on :5000. IMPORTANT GOTCHA (2026-07-24): the
  host `dotnet run` API often CANNOT auth to MariaDB — OrbStack's :3307 port-forward makes
  MariaDB (skip_name_resolve=ON) see host TCP as `root@'localhost'` and reject all password
  auth (reproduce: `mysql -h127.0.0.1 -P3307 -uroot -pnone` → 1045; socket + container→container
  work). The **dockerized `SQE_HTTP_API` connects container-to-container and works** — prefer it.
  Health check: `curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:5000/v1/users/login -H 'Content-Type: application/json' -d '{"email":"test@1.com","password":"test"}'` → expect `200`.
- **Frontend (instrumented for coverage):** from ScrollEditor:
  `COVERAGE=true npx vite --port 8080 --strictPort` (run in background). Restart it after ANY
  `src/**` edit — the fsevents watcher does NOT reliably pick up changes on this `/Volumes`
  external drive. Health: `curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/` → `200`.

Test commands (from ScrollEditor):
- Unit: `npm run test:unit` (Vitest, 636 tests) — fast, no stack needed.
- E2e: `npx playwright test --config playwright.config.mts [<spec>]` (needs all 3 processes).
  Serial (`workers:1`) — e2e mutate shared backend state.
- Combined coverage: `npm run coverage:combined` (reads `coverage-unit/` from a unit `--coverage`
  run + `.nyc_output/` from an e2e run; unions e2e per-file — DO NOT take a single snapshot).
  `--exclude-vendored` additionally drops generated DTOs.

Test creds: `test@1.com` / `test` (also `test@2.com` for collaborator flows). JWT in
`localStorage['token']`. Small edition to copy: **811** (1Q9, 4 artefacts / 2 two-sided
imaged objects, real metadata); scroll-editor needs placed artefacts → copy **899** (60 placed).
Copy: `POST /v1/editions/<id>` with `{name}`; clean up with `DELETE /v1/editions/<id>?optional=archiveForAllEditors`.

Fixtures (`tests/playwright/fixtures.ts`): `loginToken(request)`, `authedContext(browser, token)`
(injects token pre-boot — REQUIRED for protected routes; a plain `goto` races the session-restore
guard and bounces to `/`), `artefactX(page,id)` (store), `artefactTransform(page,id)` (rendered
`<g transform>` above `#path-<id>`), `collectCoverage(ctx)`.

---

## 1. What is already DONE (do not redo)

### Test infrastructure
- Playwright (`playwright.config.mts`) + Vitest (`vitest.config.mts`, istanbul provider,
  `all:true`, Potrace excluded). Combined-coverage script `scripts/coverage-combined.mjs`.
- **30 e2e spec files / 193 e2e cases; 42 unit spec files / 636 unit cases. All green.**
- Combined coverage last measured **~80.8%** of code (Potrace + 2 dead components excluded).

### `.ts` API/service layer — heavily unit-tested already
- `src/services/*` unit specs (`tests/unit/services-*.spec.ts`, `services-misc.spec.ts`): api-routes 100%,
  comm-helper 100%, edition/artefact/imaged-object/session/sign-interpretation ~95-100%, search/qwb/image/utils/error
  covered. `virtual-artefact` ~86%. `text` ~68% (private ROI reconcilers uncovered).
- The 111 generated SignalR wrappers (`src/dtos/sqe-signalr.ts` `SignalRUtilities`) covered by
  `tests/unit/dtos-signalr-utilities.spec.ts` (data-driven over the prototype).
- Models/state/operations/utils unit-tested (`tests/unit/models-*`, `state-*`, `operations-*`, `utils-*`).

### Bugs fixed this migration (each has a regression test — see the spec noted)
- Global reactivity gap (`$state` not reactive) → `state/state-manager.ts` returns one shared
  `reactive()` proxy; state getters use `currentState()`. `realtime.spec.ts` proves DOM propagation.
- De-cycled StateManager (`state/current.ts` + `state-manager.ts`, `import type` erased at runtime).
- `/editions/:id` router redirect (static `:editionId` not interpolated) → function redirect. `route-coverage.spec.ts`, `regression-fixes.spec.ts`.
- Public-list virtualization (45s→4s), template-privacy. `home-editions.spec.ts`, `smoke.spec.ts`.
- Toolbar buttons dead (compat MODE-2 `$listeners` not forwarded) → `toolbar-icon-button.vue` forwards listeners; `rotate-button.vue` triggers on `@click`. `editor-controls.spec.ts`.
- Toolbar overflow (bootstrap `.row > *`) → `toolbar.vue` is a flex `div`. `editor-controls.spec.ts`.
- `@input`/`@change` on bvn form components dead → `@update:model-value`: Display-ROIs checkbox
  (`manuscript-toolbar.vue`), home filter/sort (`search-bar.vue`), opacity slider (`SingleImageSetting.vue`).
  `scroll-editor-deep.spec.ts`, `home-filter.spec.ts`, `functional-regressions.spec.ts`.
- `UpdateUser.vue` crashed (`$state` in field initializers) → moved to `created()`. `regression-fixes.spec.ts`.
- "New Artefact" `<b-btn>` (unregistered) → `<b-button>`.
- Thumbnails blank (`v-lazy`, vue-lazyload disabled) → native `:src` + `loading="lazy"` in
  edition-public-card, edition-card, imaged-object-card, search/imaged-object-results. `functional-regressions.spec.ts`.
- `misc.cancel` mislabeled `'Delete ROI'` → `'Cancel'` + new `deleteRoi` key. `functional-regressions.spec.ts`.
- Artefact create/delete didn't update `imagedObject.artefacts` (the listing) → `artefact.ts` create/delete
  add/remove there (dedup-safe). Autosave `saveEntities` crash (`this.$state` undefined) → `currentState()`
  across all 3 editors. `functional-regressions.spec.ts`.

### KNOWN-BROKEN / DEAD (found, NOT yet fixed — fix as their area is covered)
- **Right-click context menus dead** — `bv::show::popover` / `$root.$emit` bus (~20 sites in
  `text-line.vue`, `text-sign.vue`, `views/artefact-editor/text-side.vue`, `views/edition/components/artefact-card.vue`).
  Fix: per-instance boolean `v-model` on each `<b-popover>`. Modals themselves work via `modal-bus`/`showModal`.
- **`$root.$bvModal.show` no-ops** — `copyToEdtion()` (artefact editor "Copy To Edition"), and the
  imaged-object slot "New Artefact" button in some spots. Reach via `showModal(...)`/instance for now.
- **Dead components (excluded from coverage)** — `views/scroll-editor/artefact-toolbox.vue` (registered in
  `scroll-area.vue` but no `<artefact-toolbox>` tag anywhere) and `views/edition/components/sidebar.vue`
  (registered in `Edition.vue`, not in its template). Decide: wire up or delete.
- **`operations-manager` savingAgent holds stale `editionId=0`** → autosave can target edition 0.
- **Remaining `@input` on bvn components — AUDIT each** (some are native `<input>` and fine):
  `edit-virtual-artefact-text.vue:25`, `text-line.vue:12`, `views/artefact-editor/text-side.vue:8`,
  `manuscript-toolbar.vue:49` (onTextMode), `views/search/form.vue:46,67`. `comment.vue:27` is ckeditor (different).
- **Save endpoints reject copied editions on this dev DB** (metric `PUT /v1/editions/{id}` → 404,
  artefact `batch-transformation` → 400) — persistence round-trips aren't e2e-assertable here; assert the
  handler ran + no pageerror instead.

---

## 2. GOAL A — every API call site has an e2e test

### The universe (enumerate, then build a matrix)
- **37 endpoints** = URL builders in `src/services/api-routes.ts` (`grep -oE '[a-zA-Z]+Url' src/services/api-routes.ts | sort -u`).
- **69 HTTP call sites**: `grep -rn 'CommHelper\.\(get\|put\|post\|delete\)' src --include='*.ts'`.
- **5 direct axios**: `grep -rn 'axios\.' src --include='*.ts' | grep -v import` (image manifest, IIIF).
- **61 service methods**: `grep -rn 'public async' src/services/*.ts` — the public surface that call sites use.
- **111 SignalR server-method wrappers** in `src/dtos/sqe-signalr.ts` (most unused by the app; the app uses
  HTTP + subscribes to broadcasts via `state/signalr-connection.ts`).

### Method
1. Build `tests/playwright/API-COVERAGE.md` — a table: `service.method` → `HTTP verb + ApiRoutes url` →
   `covered-by (spec:test)` → `status`. Generate the left two columns by grepping the service files.
2. For "covered-by", run the full e2e suite once with a **network log** to capture which `/v1/...` endpoints
   were actually hit, and map back. Fast way: add a temporary `page.on('request')` recorder in a throwaway
   spec, OR parse Playwright traces. Simpler: reason per service method → find the UI action that triggers it
   → confirm a spec drives that action.
3. For each uncovered call site, write an e2e test that drives the **real UI action** that makes the call
   (not a direct `page.request` — that tests the API, not the app). Assert the resulting store/DOM change.
   Where the UI trigger is dead (see KNOWN-BROKEN), FIX the trigger first, then test it.
4. Services already at ~100% unit coverage still need an **e2e** that exercises the call THROUGH the UI to
   satisfy "every call site has an e2e test" — unit tests mock the network and don't prove the wiring.

### High-value uncovered call sites to check first (likely gaps)
- `services/text.ts` ROI/sign reconcilers (68% unit); QWB proxy (`qwb-proxy.ts`) — the "Show QD Variants/Parallels"
  UI is behind the dead popover menus. `services/virtual-artefact.ts` (virtual artefact text editing).
  `sign-interpretation.ts` attribute/comment writes. `imaged-object.ts` and the edition metadata/script/fulltext loaders.

---

## 3. GOAL B — every interactive UI element: aligned, reachable, functional, e2e-tested

### The universe
- **199 button-like elements** (`grep -rhoE '<b-button|<b-btn|<button|<toolbar-icon-button|<b-form-checkbox|<b-form-select|<b-dropdown-item' src --include='*.vue'`).
- **168 `@click`, 126 `v-model`, 15 `@update:model`, 11 `@input`, 7 `@change`, 9 `@shown`, 4 `@ok`, 6 `@hide`,
  7 `@keyup`, 2 `@mousedown`, 2 `@pointerdown`** across 100 `.vue` files.
- Routes to walk (`src/router.ts`): `/`, `/home/:editionType`, `/home`, `/search`, `/editions/:id`
  (+ `/artefacts`, `/imaged-objects`, `/metadata` tabs), `/editions/:id/scroll-editor`,
  `/editions/:id/artefacts/:artefactId`, `/editions/:id/text-fragments/:tfId`,
  `/editions/:id/imaged-objects/:ioId`, `/accept-invitation/token/:token`, `/registration`,
  `/changePassword`, `/updateUserDetails`, `/changeForgottenPassword/token/:token`, `/activateUser/token/:token`.

### Method — per component, produce a checklist
1. Build `tests/playwright/UI-COVERAGE.md` — one section per `.vue` with an interactive element; for each
   element record: `handler` → `reachable? (rendered + not overlapped)` → `functional? (state/DOM asserted)` →
   `layout OK?` → `covered-by (spec:test)`.
2. **Functional test per element:** drive the real control (click/type/toggle) and assert the store/DOM
   result. Two systemic bug classes to check on EVERY control:
   - `@click`/native listeners on a **custom component** may be dropped (compat `$listeners`) — verify the
     handler actually fires (assert its effect, not just that the element exists).
   - `@input`/`@change` on a **bvn form component** may not fire — must be `@update:model-value`.
3. **Reachability:** many controls are behind dead triggers (popover context menus, `$bvModal.show`). A control
   that exists in the DOM but can't be opened via the UI is a FAIL — fix the trigger.
4. **Layout audit** (compare to production `https://sqe.deadseascrolls.org.il/`):
   - Screenshot each route at 1280 and 1440 width; check for overflow, mis-alignment, clipped/stacked toolbars,
     invisible-but-present controls. The known offender pattern was bootstrap `.row > *` forcing width:100%
     and fixed-height toolbars (fixed in `toolbar.vue`) — grep for other `height:` on flex containers and
     `<b-row>` wrapping non-`.col` children.
   - Add layout assertions where cheap: `toolbar scrollHeight ≈ clientHeight` (no vertical overflow), controls
     content-sized (not full-row-width), `img.naturalWidth > 0` (images decode), no `pageerror`.
   - For alignment/flow that's hard to assert numerically, capture screenshots into `test-results/` and review
     against prod; encode the few load-bearing invariants as assertions.

### Suggested spec organization (extend existing, don't duplicate)
Per route/area there's already a family of specs (e.g. `scroll-editor*.spec.ts`, `artefact-editor*.spec.ts`,
`text-*.spec.ts`, `edition-*.spec.ts`, `home-*.spec.ts`). Add the missing element/endpoint tests into the
matching family. Keep `functional-regressions.spec.ts` for cross-cutting "it actually works" guards.

---

## 4. Phased execution (recommended order)

- **Phase 1 — Inventories.** Generate `API-COVERAGE.md` and `UI-COVERAGE.md` matrices from the greps above.
  This is the backlog. (A parallel-agent sweep can fill the "covered-by" column by reading existing specs.)
- **Phase 2 — Fix the systemic dead triggers** so their controls become reachable/testable: the
  `bv::show::popover` context menus (per-instance b-popover v-model), the `$bvModal.show` open buttons, and
  audit the remaining `@input` handlers. Each fix gets a functional regression test.
- **Phase 3 — Fill API-call e2e gaps** (Goal A) driving real UI actions.
- **Phase 4 — Fill interactive-element e2e gaps + layout audit** (Goal B), route by route.
- **Phase 5 — Dead code decision:** wire up or delete `artefact-toolbox.vue` and `sidebar.vue`; fix the
  savingAgent stale `editionId`.
- **Phase 6 — Green + measure.** Full serial e2e run + `npm run coverage:combined`; every route/element/endpoint
  in the two matrices marked covered. Commit.

### Parallelization
Read-only inventory building and spec authoring parallelize well across agents, but **e2e runs are serial
against one shared backend** — have agents author + self-verify their own spec file, then do ONE final serial
full run. Warn: heavy edition-copy load can degrade the DB (§0 gotcha).

## 5. Definition of done
1. `API-COVERAGE.md`: every service method / call site → an e2e test that drives its UI trigger. ✅ per row.
2. `UI-COVERAGE.md`: every interactive element → rendered, reachable, functional, layout-OK, e2e-tested. ✅ per row.
3. Zero known dead triggers (popovers, `$bvModal.show`); remaining `@input` audited/fixed.
4. Full suite green (unit + e2e); combined coverage reported. Layout reviewed vs production for all routes.
5. Everything committed on `vue3-migration`.
