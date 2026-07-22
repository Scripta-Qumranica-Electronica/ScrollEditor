# Realtime State-Sync Architecture — Design Doc

Status: Draft for review
Audience: SQE maintainers
Scope: ScrollEditor (Vue frontend) primarily, with a small SQE_API appendix.

---

## 1. Context & the problem

SQE supports both HTTP and realtime (SignalR) communication. There is a wide
notification system for collaborative editing **and** for a single user with
multiple tabs open: when data changes on the server, every subscriber in the
edition is notified, and the UI is supposed to update automatically.

It works only partially. Reproducible symptom:

> Two tabs open. Tab A edits an artefact's mask. Tab B shows that artefact in
> the manuscript (scroll) view. Changing the mask in A does **not** update B
> until B is reloaded.

The symptom is real but it is not the disease. The disease is architectural:

**There is no single choke point through which state changes flow into the
client store.** A change can enter the store via (a) the HTTP response to your
own edit, (b) a SignalR broadcast from someone else (or your other tab), or
(c) a direct component mutation. Each entry point re-implements "apply to the
store" with its own idea of how to trigger Vue reactivity. Correctness then
depends on a human remembering, per event, to do the right dance.

Concretely, the two paths for the *same* logical operation diverge:

- **Your own edit (HTTP path)** — `services/artefact.ts:172` calls
  `state().artefacts.update(changed)`, which replaces the collection array and
  triggers the reactivity the manuscript view's `placedArtefacts` computed
  depends on.
- **A remote/other-tab edit (SignalR path)** — `notification-handler.ts:62`
  (`handleUpdatedArtefact`) calls `existing.copyFrom(newArtefact)` to mutate the
  instance in place but **never calls `artefacts.update()`** and **never emits
  an event**. The collection array reference is unchanged, the computed does not
  re-run, and the manuscript view does not repaint. Reload works only because it
  rebuilds the store from scratch.

The transport is fine. The SQE_API broadcasts nearly every mutation as a full
DTO to the edition's SignalR group, including the mask case
(`ArtefactService.cs:267`). The gap is entirely in the client's **reducer
layer**, which is hand-maintained and non-uniform.

### The philosophical debate this resolves

The project's two designers disagreed: one wanted an *organically responsive*
UI (state changes, the view re-derives itself); the other wanted *declarative
control* (each update explicitly orchestrated) and preferred HTTP.

Reframed accurately, the two positions are not opposites:

- "The view is a declared function of state" **is** the reactive/organic model.
  Truly declarative and truly organic are the same destination.
- What the codebase actually implements is neither — it is **manual
  propagation**: per-event handlers that each know which slices to touch. The
  cost of that control is that every new data relationship needs new hand-wired
  code, and any wiring you forget is an invisible gap. This bug is that cost.

The one genuinely defensible part of the "HTTP" position: HTTP request/response
is a fine **command** channel (status codes, idempotency, retries, caching,
trivial debugging). The mistake was never "HTTP vs SignalR." It was using
**both** the HTTP response **and** the SignalR broadcast as *state-application*
paths, which produced two reducers that must be kept in sync by hand — and
aren't. The resolution is: many command channels are fine; there must be
**exactly one inbound state reducer.**

---

## 2. Goals & non-goals

**Weighting:** This is a desktop/office-first tool. The users who matter are in
an office on good bandwidth, all day. The handful of tablet-on-4G users per
month do not get to drive architecture that taxes the majority. Nearly every
argument for the manual/minimize-everything approach (fewer re-renders, minimal
memory, minimal bandwidth, delta patching, offline-first) is a mobile/low-power
argument. We optimize instead for correctness, live responsiveness, and
maintainability, and we spend memory/bandwidth freely.

**Goals**

1. Any server-visible change reaches every subscriber's UI **live**, without
   reload — including the multi-tab single-user case.
2. **One** inbound reducer: exactly one code path writes entities into the store,
   whether the change originates locally or remotely.
3. Coverage is guaranteed by construction, not by remembering to hand-write a
   handler per event.
4. Live manipulation (dragging, mask drawing, rotating) stays smooth — no
   blinking, no jank, no yanking geometry out from under the cursor.
5. Server is the source of truth on conflict; the client renders optimistically
   but always reconciles to server state.

**Non-goals**

- Offline-first / true local-first operation. (Earmarked as a possible future
  for the text surface only; see §5.)
- Bandwidth-minimal delta protocols. Full-DTO broadcasts are fine for us.
- Character-by-character operational-transform merge of concurrent edits to the
  *same* field. Last-write-wins is acceptable for this domain (scholars rarely
  contend over the same polygon in the same second).

---

## 3. Current architecture (as-is, grounded)

**API (SQE_API) — healthy.**

- Single `MainHub`; clients subscribe per edition to a SignalR group named
  `editionId.ToString()` (`SubscriptionHub.cs`).
- Nearly every mutation broadcasts a **full DTO** to that group:
  `UpdatedArtefact`, `CreatedRoisBatch`, `UpdatedSignInterpretation`, etc.
  Coverage is broad and includes mask + placement (full `ArtefactDTO`).
- Caller exclusion is *intended* (`Clients.GroupExcept(editionId, clientId)`)
  but **inert**: the hubs never pass `Context.ConnectionId`, so `clientId` is
  always `null` and nobody is excluded. Net effect today: broadcasts reach
  everyone including the caller. For multi-tab this is accidentally the behavior
  we want (see §8 — we will make it deliberate).
- **No versioning / sequence numbers / ordering guarantees.** Last-write-wins
  with no way to detect a stale echo.

**Frontend (ScrollEditor) — the problem lives here.**

- Vue **2.6**. No Vuex/Pinia. A custom singleton `StateManager`
  (`state/index.ts`) holds normalized-ish collections of **plain class
  instances** (`Artefact`, `Polygon`). Plain classes on Vue 2 are only
  partially reactive and rely on `Vue.set` in places.
- A real **command layer** already exists: `OperationsManager`
  (`utils/operations-manager.ts`) with undo/redo, *operation uniting* (merging
  consecutive same-type ops), and a **3-second batched auto-save**. Continuous
  gestures run **pure-local** during the drag and commit **one operation on
  mouseup**, then persist on the timer. This is a genuine asset.
- SignalR handlers live in one hand-written file, `notification-handler.ts`.
  This is the single non-generated link in an otherwise generated chain (the API
  hubs and the client's `dtos/sqe-signalr.ts` are both code-generated). It is
  exactly where coverage gaps and reactivity inconsistencies accumulate.

**Edit-interaction inventory** (drives the optimistic/echo policy in §6–§7):

| Interaction | Shape | Local update | Server persist |
|---|---|---|---|
| Artefact move (canvas) | **Continuous** | every `pointermove` | batched op on mouseup → 3s auto-save |
| Artefact rotate | **Continuous** | every angle change | op → auto-save |
| Artefact scale / mirror | **Continuous / toggle** | immediate | with placement batch |
| Mask polygon draw / box | **Continuous gesture** | points added per `pointermove` | polygon emitted on `pointerup` (may be server-repaired) |
| ROI draw | **Continuous gesture** | per gesture | op on gesture-end |
| Artefact rename / status | Discrete | immediate | HTTP on click |
| Sign interpretation / char / attributes | Discrete | immediate | op / HTTP on commit |
| Line add / delete / edit | Discrete | immediate | HTTP on commit |
| Artefact group create / modify / delete | Discrete | immediate | HTTP on "Save Group" |
| Edition metrics / sharing | Discrete | immediate | HTTP on Apply |

Live-manipulation set (must never wait for a server round-trip per frame):
**artefact move, rotate, scale, mask draw, ROI draw.** Note also that the mask
path can be **server-normalized** (`repairPolygon`) — the echoed geometry can
legitimately differ from what the user drew.

---

## 4. Design principles

1. **Single source of truth.** One normalized store keyed by id. Components
   never hold private copies of entity data; they select by id and render.
2. **One inbound reducer.** A single `applyEntity(dto)` is the *only* function
   that writes entities into the store. Local echoes and remote broadcasts both
   flow through it. There is no second path.
3. **Optimistic render, server-authoritative reconcile.** The UI updates
   immediately from local intent; the server's echo is what makes state durable
   and always wins on conflict or normalization. "Server-authoritative echo"
   (your stated preference) is realized as *authoritative reconciliation*, not
   as *waiting* — we never block a render on a round-trip.
4. **Derive, don't cache.** Projections (mask → SVG path, placement → transform
   matrix) are computed from the store, not copied into component state. On
   modern desktop hardware, recomputing on change is free; the caching that
   avoids it is precisely what caused this bug.
5. **Coverage by construction.** The reducer is generic/generated so it tracks
   the API's generated event surface automatically — no per-entity handler to
   forget.

---

## 5. Greenfield exploration, and why Vue 3 + Pinia is the convergent target

You asked me to think greenfield first, then weigh it against Vue 3 + Pinia.

**Option A — Local-first / CRDT (Yjs, Automerge).** A shared CRDT document is
the state; every client holds a replica; edits merge without conflict; a
provider syncs over WebSocket; the library even supplies undo/redo. This would
*dissolve* the notification-handler, the reconciliation logic, and the
conflict question into a library. But it demands a backend paradigm shift: SQE's
authority is a relational DB exposed as DTOs over REST/SignalR, whereas CRDT
wants the document to be authoritative and the DB to be a projection. Our actual
pain is "changes don't propagate," not "we have unsolvable merge conflicts."
CRDT over-solves the problem and is the single most expensive path. **Verdict:
not the foundation. Earmark it narrowly for the text-editing surface later**,
where concurrent character-level merge genuinely earns its keep.

**Option B — Normalized reactive store + event-sourced sync.** One normalized
client store; a single command pipeline: gesture → optimistic local apply +
enqueue command → server → server broadcasts authoritative event → single
reducer applies + reconciles the pending command. Keeps the relational/REST/DTO
backend, keeps last-write-wins, keeps full-DTO broadcasts. This is the current
app's *intent*, done coherently. **This is the pragmatic greenfield sweet spot
for this backend and this audience.**

**Option C — Query-cache library (TanStack Query / Vue Query).** Components
subscribe to queries; mutations are optimistic with built-in rollback; SignalR
events call `setQueryData` / `invalidate`. This is Option B largely provided by
a library, with excellent devtools. The wrinkle: it is shaped for
page/entity-cache data, while SQE keeps a big always-resident normalized graph
(the whole edition in memory, ~2.8 MB post the imaged-object perf work) that a
spatial canvas reads derived geometry from. Great as a *transport/cache* layer,
not as the whole architecture. **Adopt selectively inside B, not instead of it.**

**Option D — Fine-grained/signals reactivity.** Make derived geometry
fine-grained computeds so an incoming change touches only the minimal DOM. This
is an anti-jank/rendering concern that *composes* with B; it is not a separate
sync architecture.

**Weighing against Vue 3 + Pinia.** The realistic greenfield design is **B, with
D for rendering and C where convenient — and Vue 3 + Pinia is precisely the
materialization of B + D.** Pinia *is* a normalized reactive store; Vue 3's
Proxy reactivity gives fine-grained derived projections (D) for free and removes
the Vue 2 caveats (`Vue.set`, array-index writes, plain-class fragility) that
make the current hand-rolled store unreliable. In other words, **"what I would
build greenfield" and "Vue 3 + Pinia" converge** — and that convergence is the
argument *for* Vue 3 + Pinia rather than a bespoke rewrite. The only greenfield
fork that is *materially different* from Pinia is CRDT (A), and we are
deliberately declining it as the foundation.

**Conclusion:** Target **Vue 3 + Pinia**, and treat it as Option B + D, adding
the single-reducer and the optimistic/reconcile policy as first-class design
elements (they are the parts a framework does not hand you).

---

## 6. Target architecture

### 6.1 Normalized Pinia store

One store per aggregate (`useEditionStore`, `useArtefactStore`, `useRoiStore`,
…), each holding entities in an id-keyed map plus any index arrays the views
need (e.g. placed-artefact ordering). Entities are plain reactive objects, not
opaque class instances, so Vue 3 tracks them fully. Behavior currently on the
model classes (`Artefact.applyMask`, geometry helpers) moves to pure functions
or store getters.

### 6.2 The single reducer — the only writer

```ts
// The ONE function that writes an entity into the store.
// Called by BOTH the local command pipeline and the SignalR handler.
applyEntity(kind, dto, meta): void
```

Rules inside `applyEntity`:

- **Diff-before-write.** Compare the incoming value to what's in the store
  (structural compare on geometry). If equal, write nothing — no reactive
  mutation, no re-render, no SVG re-emit. This alone removes most self-echo
  "blink."
- **Version guard (see §9).** Apply only if `dto.version` ≥ stored version.
  Drop stale/out-of-order echoes.
- **Reactive write.** On a real change, mutate the reactive entity fields (Vue 3
  Proxy tracks this) — never rebuild-and-replace unless a field actually
  changed.

The generated `sqe-signalr.ts` events are wired to `applyEntity` *generically*
(one small adapter per DTO kind, generated alongside the DTOs), so adding a new
broadcast on the API automatically has a client reducer. No more hand-written
per-event handler drift.

### 6.3 Command pipeline (build on OperationsManager)

Keep the existing command/undo/auto-save layer; give it a formal contract:

1. User gesture produces an **Operation** with a client-generated `opId`.
2. Operation applies **optimistically** to the store via `applyEntity`
   (marking the entity `pending`), and enters the undo stack.
3. Continuous gestures stay pure-local during the drag; the Operation is created
   on `pointerup`, united with adjacent same-type ops, and persisted on the
   existing 3-second batched auto-save.
4. On persist, the command carries its `opId` to the server.
5. The server echo returns (with the `opId`, per §9). Reconciliation:
   - **Echo matches the pending op** → clear `pending`, mark the op saved. The
     store already equals the echo, so diff-before-write makes this a no-op
     render. No flash.
   - **Echo differs** (server normalized it, e.g. `repairPolygon`; or someone
     else also edited) → apply server value (last-write-wins) and clear
     `pending`. This is the one legitimate visible correction; keep it and, if
     jarring, settle it (§8).

### 6.4 Reconciliation for remote (not-mine) changes

A broadcast whose `opId` we don't own is a genuine remote change → `applyEntity`
directly. Guard: if the target entity is **under an active local gesture**
(being dragged / mask-edited *right now*), buffer the remote change and apply it
on gesture-end, optionally surfacing a subtle "changed by X" indicator, rather
than yanking geometry from under the cursor.

### 6.5 Derived projections

`maskSvgPath(artefact)` and `placementTransform(artefact)` become store getters /
component computeds reading the reactive entity. When `applyEntity` mutates the
mask, the computed re-derives and the manuscript view repaints — automatically,
through one path, for local and remote alike. The §1 bug cannot recur because
there is no second path that forgets to trigger it.

---

## 7. Per-interaction policy

The unifying model is **optimistic apply + server-authoritative reconcile for
everything.** This satisfies "server is the authority" (the echo always wins on
conflict/normalization) while never blocking a render on a round-trip (no jank).
Pure wait-for-echo is rejected even for discrete edits: on a click it adds a
perceptible lag, and for continuous edits it is unusable.

| Interaction class | Render | Persist | Reconcile |
|---|---|---|---|
| **Continuous** (move, rotate, scale, mask draw, ROI draw) | optimistic, pure-local during gesture | op on gesture-end → 3s batch | on echo; buffer remote changes during active gesture; accept server-normalized geometry |
| **Discrete** (rename, status, attributes, lines, groups, metrics, sharing) | optimistic on commit | HTTP/op immediately | on echo (confirm or correct); rollback on reject |

"Almost all edits are server-authoritative echo" (your words) holds: the echo is
always the authority. We simply render optimistically in the interim so the
office user never watches a spinner after a drag.

---

## 8. Anti-jank / anti-blink specifics (the key constraint)

Because the caller stays in the broadcast group, you **will** receive your own
change back. The following make that invisible:

1. **Diff-before-write** (§6.2): a self-echo equal to current state writes
   nothing → zero re-render.
2. **`opId` correlation** (§9): recognize your own echo and treat it as
   *confirmation*, not as a fresh value to slam into the store.
3. **Pending-entity guard**: while an entity has an unconfirmed local op, do not
   let a broadcast for it replace the object wholesale; reconcile against the
   pending op instead.
4. **Active-gesture buffer** (§6.4): never mutate an entity the user is mid-drag
   on; apply queued remote changes on gesture-end.
5. **Server normalization is legitimate** (`repairPolygon`): when the echo
   *does* differ, that is the server correcting the user and the update should
   land. Apply it on gesture-idle; if the snap is visually jarring, settle it
   with a short transition. Do not fight it — that would desync from truth.
6. **Ordering** (§9): a late echo must not resurrect stale geometry over a newer
   state. Version guard drops it.

---

## 9. Required SQE_API changes

Small, additive, backward-compatible where possible.

1. **Per-entity version / monotonic marker.** Add a version (or authoritative
   `updated` timestamp) to the mutable DTOs (`ArtefactDTO`,
   `InterpretationRoiDTO`, sign-interpretation DTOs). The client's version guard
   needs it to drop stale/out-of-order broadcasts. This is the one change
   without which correct last-write-wins ordering is impossible; today there is
   no such field.
2. **Correlation id echo.** Accept a client `opId` on mutating hub/HTTP calls and
   include it in the corresponding broadcast, so a client can recognize its own
   echo (enables confirm-vs-correct and clean rollback). If threading `opId`
   end-to-end is too invasive initially, the client can fall back to
   diff-before-write + value matching; `opId` is the more robust long-term form.
3. **Make "caller stays in the group" deliberate.** Today `clientId` is `null`
   so `GroupExcept` excludes nobody — accidentally correct for multi-tab. Decide
   this on purpose: keep the caller in the group so that self, other-tab, and
   other-user all arrive through the **one** client reducer, and rely on `opId`
   (not exclusion) to avoid double-apply. This unifies multi-tab and multi-user
   into a single mechanism.
4. **Coverage parity check** (tooling, not runtime): a test/script that diffs the
   hub's broadcast surface (`ISQEClient`) against the client's reducer adapters
   and fails CI if an event has no handler. Closes the class of gap that hid
   this bug.

No change needed to the full-DTO broadcast shape — full DTOs are correct for our
weighting.

---

## 10. Migration plan (phased, each phase shippable)

**Phase 0 — Stop the bleeding (Vue 2, hours).**
In `handleUpdatedArtefact`, call `state().artefacts.update(existingArtefact)`
after `copyFrom`, and emit an event-bus signal (matching the ROI handlers). Masks
update live again. This is a patch, not the architecture.

**Phase 1 — One reducer, still Vue 2 (days).**
Introduce a single `applyEntity` in the current `StateManager` and route *both*
the HTTP-response path and every `notification-handler` case through it. Add
diff-before-write. Remove the divergent `copyFrom`-vs-`update` split. This kills
the *bug class* without a framework jump and is valuable even if Vue 3 slips.

**Phase 2 — Vue 3 + Pinia (the real move).**
Port the store to Pinia; entities become plain reactive objects; `applyEntity`
becomes the store action; projections become getters/computeds. Proxy reactivity
removes the `Vue.set`/plain-class fragility. Migrate views to read from the store
by id. (Also unblocks dropping the `--openssl-legacy-provider` / webpack-4
toolchain constraints noted in the build docs.)

**Phase 3 — Reconciliation + versioning (with API §9).**
Add `opId` correlation, the version guard, the pending-entity guard, and the
active-gesture buffer. This is what makes "server-authoritative echo" fully
correct and jank-free under real concurrency.

**Phase 4 (optional, later) — CRDT for the text surface only.**
If concurrent text editing becomes a first-class need, introduce Yjs *scoped to
text*, leaving the spatial/relational model on the Phase 2–3 architecture.

Phases 0–1 are worth doing immediately regardless of the Vue 3 timeline;
2–3 are the durable fix; 4 is speculative.

---

## 11. Risks & open questions

- **Undo stack vs remote changes.** After a remote edit to an entity, part of
  your local undo history for that entity may no longer be safe to replay
  (it would undo *through* someone else's change). Simplest sound policy:
  a remote change invalidates the portion of the undo stack targeting that
  entity. Needs a decision; do not over-engineer.
- **Version field cost.** Adding a version/updated marker touches DTOs and
  possibly DB reads. Confirm it can be produced cheaply (an existing `updated`
  column may suffice).
- **`opId` plumbing depth.** End-to-end correlation touches hubs, controllers,
  services, and broadcasts. Phase 3 can start with value-diff matching and add
  `opId` incrementally.
- **Migration surface.** Vue 2 → 3 + Pinia is a large diff across views. Phase 1
  deliberately delivers the correctness win *before* that risk.
- **Scope confirmation.** This doc assumes we do not need offline-first and do
  not need OT/CRDT for the spatial model. If either assumption is wrong, §5
  reopens.

---

## Appendix A — Files referenced

Frontend (ScrollEditor):
- `src/state/index.ts` — `StateManager` singleton store
- `src/state/notification-handler.ts:62` — `handleUpdatedArtefact` (the bug)
- `src/state/utilities.ts` — collection `update()` / reactivity plumbing
- `src/services/artefact.ts:172` — HTTP-path `update()` (the *other* path)
- `src/utils/operations-manager.ts` — command / undo / 3s auto-save
- `src/views/scroll-editor/scroll-area.vue:215` — `placedArtefacts` computed
- `src/views/scroll-editor/artefact-image-group.vue` — drag handlers, transform
- `src/components/polygons/boundary-drawer.vue` — mask/ROI polygon gestures
- `src/dtos/sqe-signalr.ts` — generated SignalR event surface

API (SQE_API):
- `sqe-api-server/RealtimeHubs/SubscriptionHub.cs` — per-edition groups
- `sqe-api-server/RealtimeHubs/HubInterface.cs` — `ISQEClient` broadcast surface
- `sqe-api-server/Services/ArtefactService.cs:267` — `UpdatedArtefact` broadcast
