# Dependency Audit + Vue 3 / Pinia Migration Plan

Status: living plan. Branch `realtime-state-sync-redesign`.
Grounded in two full code inventories (UI-lib + Vue-2→3 surface; HTTP/SignalR
mutation paths) run 2026-07-22.

---

## 1. Dependency audit (Task 4)

### Done + live-verified
- **`@microsoft/signalr` `^5.0` → `^10` (10.0.0)** — the client was **five majors
  behind** the .NET 10 server. Bumped, `tsc` clean, and **verified live**: the v10
  client connects to the .NET 10 hub and broadcasts propagate. Only code change
  needed was dropping an unused default import in `signalr-connection.ts` (the
  `signalR.` default is used only in a comment; all named imports — `LogLevel`,
  `HubConnection`, `HubConnectionBuilder`, `TimeoutError` — are stable v5→v10). No
  MessagePack / custom-transport usage, so the surface was tiny.

### Dead dependencies — remove (verified unused in the inventory)
- **`element-ui`** — no `<el-*>` usage, no `$message/$notify/$msgbox`. Pure dead weight.
- **`vue-gtag`** — declared, imported nowhere.
- **`vue-shortcuts`** — registered in `main.ts`, no shortcut definitions found.
- Re-verify before deleting: **`vue-toasted`** (registered, no direct calls found),
  **`vue2-hammer`** (registered, no `$hammer` usage found), **`vue-virtual-scroller`**
  (registered + CSS imported, no explicit template usage found).

### Safe modernizations (framework-agnostic; do alongside the Vite move)
- `axios ^0.21` → `^1.x` (breaking: interceptor/response typing — small, contained
  in `comm-helper.ts`), `core-js`, `sass`/`sass-loader`, `typescript ^4.3` → current,
  `cypress` already 14.

### Vue-3-coupled (upgraded as part of the migration, §2)
`vue 2.6→3.x`, `vue-router 3→4`, `vue-i18n 8→9`, `bootstrap-vue 2 →
bootstrap-vue-next`, `@fortawesome/vue-fontawesome 2→3`, `vue-lazyload 1→2`,
`vue-virtual-scroller 1→2`, `@ckeditor/ckeditor5-vue 1→5` (+ build 23→current),
`vue-class-component`/`vue-property-decorator` → **`vue-facing-decorator`** (see §2).

---

## 2. Vue 3 + Pinia migration plan (Task 1)

**Empirical scope (from the inventory): ~100 `.vue` files (all class components),
68 files using bootstrap-vue (44 component types), ~10 coupled libs, toolchain
swap. This is a genuine 3–4 week migration — it is NOT a single-session task.**
It will be executed on its own track with checkpoints; the app cannot run
half-migrated without the compat build (below).

### What makes it tractable (key decisions)
1. **Keep the class components.** `vue-facing-decorator` is the maintained Vue-3
   successor to `vue-class-component`+`vue-property-decorator` with a near-identical
   `@Component/@Prop/@Watch/@Emit` API. This avoids rewriting 100 components into
   `<script setup>` — the single biggest risk-reducer. (Composition/`<script setup>`
   can be adopted incrementally later.)
2. **`@vue/compat` (migration build).** Run the app on Vue 3 in Vue-2 compatibility
   mode first, then burn down compat warnings file-by-file — so we always have a
   running app, never a big-bang rewrite.
3. **The state layer is already a hand-rolled singleton (no Vuex)** → it ports to
   **Pinia** cleanly; the collections' array-replacement reactivity maps directly to
   Pinia state, and Vue 3 Proxy reactivity removes the `StateMap` non-reactivity and
   the 8 `Vue.set` calls.
4. **Low breakage surface:** the inventory found **no** filters, `$children`,
   `$listeners`, `.native`, or functional components. The real work is UI-lib remap,
   v-model rename, the EventBus, and global API.

### Blocking prerequisites (do first)
- **EventBus** (`state/event-bus.ts`) is built on `new Vue()` instance events —
  removed in Vue 3. Replace internals with **`mitt`** (same `on/off/emit` facade, so
  call sites are unchanged). *This is Vue-2-compatible and can land before the
  migration as a no-regret step.*
- **`main.ts` global API:** `new Vue().$mount` → `createApp().mount`; `Vue.use` →
  `app.use`; `Vue.prototype.$state` → `app.config.globalProperties.$state` (or inject
  the Pinia store); `Vue.component` → `app.component`.
- **Toolchain → Vite:** `vue.config.js` is minimal (dev source-map + `/v1` proxy with
  `ws:true`); maps directly to `vite.config.ts` (`server.proxy`). Rename
  `VUE_APP_*` → `VITE_*` (3 vars) or use an env-compat shim. Convert 4 `require()`
  calls to ESM. Drops the `--openssl-legacy-provider` hack.

### UI library
- **bootstrap-vue → `bootstrap-vue-next`** (Bootstrap 5). 44 component types across
  68 files; mostly mechanical (`<b-col/row/button/form-*/modal/...>`). Directives
  `v-b-tooltip` (14) and `v-b-modal` (3) have `bootstrap-vue-next` equivalents.
- **Remove `element-ui`** (dead).

### Phased execution
1. **P-prep (Vue-2-safe):** swap EventBus to `mitt`; remove dead deps; convert
   `require()`→ESM. Ships on Vue 2, de-risks.
2. **P-toolchain:** stand up Vite + Vue 3 + `@vue/compat` + `vue-facing-decorator`;
   get a compat build booting.
3. **P-state:** port `StateManager`/collections/maps → Pinia stores; this is where
   the realtime work folds in (the notification reducer + `applyArtefactUpdate` become
   store actions; `StateMap` non-reactivity disappears).
4. **P-ui:** bootstrap-vue → bootstrap-vue-next, file-by-file; fix `v-model`
   (`value/input`→`modelValue/update:modelValue`, 77 uses) and `.sync` (2).
5. **P-libs:** vue-router 3→4, vue-i18n 8→9, font-awesome 2→3, ckeditor 1→5,
   lazyload/virtual-scroller.
6. **P-finish:** remove `@vue/compat`, delete `Vue.set` calls, drop
   `vue-template-compiler`, final type-check + e2e.

### Interaction with Tasks 2 & 3
- **Task 2** (unify HTTP+SignalR via one reducer + opId) is done first on the current
  code; under Pinia its reducer becomes a store action — a **relocation, not a redo**
  (the opId/server-authoritative logic transfers verbatim).
- **Task 3** (strict typing + coverage guard) is framework-agnostic and transfers.
