# ScrollEditor e2e test build-out plan (Playwright)

## Why Playwright, why now

SQE's reason to exist is **realtime, multi-session collaboration** on the same
edition. That is exactly what the old Cypress suite could not exercise: it drives
one browser tab, so it can never prove that an edit in session A reaches session B.
The Vue 2→3 migration also broke several flows *silently* (login modal never
opened; guest flow crashed in `edition-public-list`) because nothing asserted that
those pages mount without throwing.

Playwright gives us, first-class:
- **multiple independent browser contexts per test** → true multi-tab realtime tests;
- **`page.on('pageerror')`** → we can fail a test on any uncaught exception, which
  is how we catch silent migration breakage;
- **`page.request`** → drive the API directly (login, edition copy, mutations) so
  tests are self-contained and don't depend on seeded UI state;
- **istanbul coverage** via `window.__coverage__` (the app is served with
  `COVERAGE=true` → `vite-plugin-istanbul`), collected in `fixtures.ts`.

Vitest stays for unit/reducer tests (`tests/unit`). Playwright owns e2e.

## Ground truth for expected behaviour

Production — <https://sqe.deadseascrolls.org.il/> — is the oracle for "what should
this flow do". When a spec's expectation is ambiguous, check prod. (Local test
creds: `test@1.com` / `test`; see the `sqe-local-dev-stack` memo for ports.)

## What exists today (green)

- `fixtures.ts` — `loginToken`, `authedContext`, `artefactX` (reads the live
  `$state` store), `collectCoverage`, and a coverage-collecting default `test`.
- `smoke.spec.ts` — landing mounts; **login modal opens** (guards the
  `COMPONENT_V_MODEL` linchpin); **guest → public list renders** without pageerror
  (guards the `edition-public-list` crash).
- `realtime.spec.ts` — **flagship**: two authed sessions on one edition's
  scroll-editor; session A PUTs an artefact placement; session B's store converges
  on the new value purely from the SignalR broadcast. This is the core-feature proof.

Baseline coverage from these 4 tests: ~26% statements (`npm run test:e2e:cov`).

## Running

```
# terminal 1: instrumented frontend
COVERAGE=true npx vite --port 8080 --strictPort
# terminal 2: API on :5000, DB on :3307  (sqe-local-dev-stack memo)
# terminal 3:
npm run test:e2e         # all specs
npm run test:e2e:cov     # + nyc text-summary & html report
```

## Build-out roadmap (priority order)

Each phase is TDD: write the spec against prod-verified behaviour, watch it fail on
the migrated app, fix the app, watch it pass. Every spec that loads a page installs
`trackPageErrors` and asserts zero uncaught errors — that assertion alone is our
regression net for silent migration breakage.

### P1 — Auth & account (fast, high-traffic, currently unproven)
- login (valid → lands authed, nav shows account), invalid → error message
- register / activate / forgot-password modal flows *open and validate* (no send)
- logout clears token and returns to landing
- **guard**: token in `localStorage` survives reload; expired/absent → guest

### P2 — Edition lifecycle (the entry funnel)
- home: personal vs public tabs, filter, sort by date/name
- open a public edition → edition view (artefacts / imaged-objects / metadata tabs)
- **copy edition** → appears under personal; delete edition → gone
- permissions modal: add/remove collaborator (drives realtime multi-user later)

### P3 — Scroll editor (the heart) — realtime-first
Extend the flagship into a matrix. For each artefact mutation, assert the *observer*
session converges (this is where the notification reducer earns its keep):
- move / rotate / scale / mirror / z-index placement change
- add artefact to scroll, remove from scroll
- group create / edit / delete
- rename artefact, change ROI/mask
- **opId self-echo**: the *acting* session must not double-apply its own broadcast
  (assert no churn / stable identity — the unit test covers the reducer; here prove
  it over the wire)
- **late joiner**: session B opens *after* A's edit → sees current state (initial
  load path, not broadcast)

### P4 — Artefact editor & imaged-object editor
- `/editions/:id/artefacts/:artefactId`: mask drawing, ROI, boundary ops
- `/editions/:id/imaged-objects/:ioId`: multispectral image switching (the flow the
  reverted "master-only imaged-objects" perf change broke — regression-guard it)
- text-fragment editor `/editions/:id/text-fragments/:tfId`: sign/line editing
  (blocked on API payload carrying `textFragmentId` for the line/text SignalR
  handlers — see notification-coverage `UNHANDLED_EVENTS`)

### P5 — Search & cross-cutting
- `/search` returns results, navigates into an edition
- i18n language switch; deep-link/reload of every route mounts (loop the router
  table in one data-driven spec asserting no pageerror per route)

## Conventions

- **Self-contained data**: never assert against a specific seeded edition's mutable
  state. Copy a public edition in `beforeAll`, drive that throwaway, let it be.
- **Realtime assertions** use `expect.poll(() => artefactX(observerPage, id))` — the
  observer must converge without a reload; a passing poll *is* the SignalR proof.
- **Every navigation asserts zero `pageerror`.** Non-negotiable — it's the migration net.
- **Coverage** is collected automatically for the default context; multi-context
  specs call `collectCoverage(ctx)` before closing each context.
- Keep the suite serial (`workers: 1`) while specs mutate shared backend state;
  revisit once specs are isolated to their own copied editions.

## Known issues surfaced (fix as their phase lands)

- Guest → public list takes ~45s to render (1369 editions, un-virtualised after the
  DynamicScroller removal). Perf, not correctness. Ties into the `sqe-edition-load-perf`
  work. Consider re-introducing virtualisation with a Vue-3-compatible scroller.
- Stale HMR reload errors accumulate in the long-running dev server
  (`Cannot access 'X' before initialization` on modal components) — circular-import
  TDZ under HMR only; not seen on a cold load. Worth de-cycling the modal imports.
