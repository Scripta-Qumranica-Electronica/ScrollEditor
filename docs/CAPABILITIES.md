# SQE ScrollEditor — Capability Map

A description of **what the app should be able to do**, derived from the code (routes, views,
toolbars, services, API). Purpose: a shared, checkable spec that end-to-end tests are written
against. Each area lists its purpose, the user actions, the notable multi-step journeys, and
the invariants worth asserting.

> Items marked **⚠ VERIFY** are behaviours inferred from the code that a domain expert should
> confirm before we assert them in tests.

---

## 0. Cross-cutting concepts

- **Edition** — an editable copy of a manuscript's data (artefacts, imaged objects, text,
  metadata, collaborators). You never edit the source; you copy an edition and edit the copy.
- **Imaged object** — a physical plate photograph (e.g. `IAA-648-1`) with a **recto** and/or
  **verso** side, each a stack of images (colour, infrared, …). Imaged-object ids are shared
  across editions.
- **Artefact** — a region of one imaged-object side (a fragment), with a **mask** (polygon) and
  a **side** (recto/verso). Placed onto the virtual scroll with a **placement** (x/y, scale,
  rotate, z-index, mirror).
- **Text**: an edition's transcription is **text-fragments → lines → signs**; a **sign
  interpretation** carries the character, attributes, and commentary. A **ROI** links a sign
  interpretation to a polygon region of an artefact image.
- **Permissions** — per edition: `read | write | admin` (+ `lock`). Write-gated actions are
  hidden in the UI when read-only and rejected by the API.
- **Operations / autosave** — editors record each change as an operation on an
  `OperationsManager` (undo/redo stack); dirty operations autosave ~3s after the last change.
- **Realtime** — while viewing an edition you're subscribed via SignalR; collaborators' changes
  apply live without reload (see §8).

---

## 1. Routes & navigation

| Path | View | Access |
|---|---|---|
| `/` | Welcome | public |
| `/home/:type` (`private`\|`public`) | Home (edition lists) | `private` needs login |
| `/search` | Search | public |
| `/editions/:ed` → `/editions/:ed/artefacts` | Edition (artefact browser) | public (read-only if not a collaborator) |
| `/editions/:ed/imaged-objects` | Imaged-object browser | public |
| `/editions/:ed/metadata` | Edition metadata | public |
| `/editions/:ed/scroll-editor` | Scroll editor | public |
| `/editions/:ed/artefacts/:art` | Artefact editor | public |
| `/editions/:ed/text-fragments/:tf` | Artefact/text editor | public |
| `/editions/:ed/imaged-objects/:io` | Imaged-object editor | public |
| `/search`, `/registration`, `/activateUser/token/:t`, `/changeForgottenPassword/token/:t`, `/accept-invitation/token/:t` | token/modal flows | public |
| `/changePassword`, `/updateUserDetails` | account | **login + activated** (guarded, else → `/`) |

**Navbar:** brand→home; when in an edition: edition name (+Draft/Published badge), Manuscript
(scroll editor), Artefact(s), Imaged Object(s); right side: Report Problem, Search, user menu
(login / logout / change password / update details), hamburger (Home, Personal/Public editions,
About, FAQ, EULA, Cite, User Guide, Report Problem, Contact).

---

## 2. Authentication & account

| Action | Trigger | Expected result | Endpoint |
|---|---|---|---|
| Login | navbar/user menu → login modal | session set, redirect home, reload; wrong password → error, stays logged out | `POST /v1/users/login` |
| Logout | user menu | session cleared, → `/` | client only |
| Register | register modal | validates (all fields, matching passwords, EULA checked); "activation link sent" | `POST /v1/users` |
| Activate account | email link `/activateUser/token/:t` | activates, → `/` | `POST /v1/users/confirm-registration` |
| Forgot password | login modal → "Forgot Password?" | "reset link sent" | `POST /v1/users/forgot-password` |
| Reset forgotten password | email link | new+repeat must match; → `/` | `POST /v1/users/change-forgotten-password` |
| Change password (logged in) | user menu → `/changePassword` | current + new×2; → `/` | `POST /v1/users/change-password` |
| Update user details | user menu → `/updateUserDetails` | requires password; email change re-sends activation | `PUT /v1/users` |
| Report a problem | navbar / hamburger | title + description (+ email if logged out) → GitHub issue | `POST /v1/utils/report-github-issue` |
| Resend activation | **TODO — to build** | a user who registered but never clicked the activation link must be able to re-request it | `POST /v1/users/resend-activation-email` |

**Invariants:** submit buttons disabled until valid; mismatched passwords show an error; account
routes redirect to `/` when not activated.

**⚠ TODO (feature to build):** the API endpoint `POST /v1/users/resend-activation-email` exists
but has **no UI**. Registered-but-unactivated users need a "resend activation email" button
(e.g. on the login modal / when a login fails due to an inactive account).

---

## 3. Home & edition management

**Browse:** Personal (login) vs Public tabs; filter by name (case-insensitive); sort by name or
last-edit; personal editions grouped Draft/Published; public list is virtualized. Cards show
thumbnail, title, date, status badge, and Edit/View + Copy buttons. Right-click Edit = open in
new tab.

| Action | Trigger | Expected result | Endpoint |
|---|---|---|---|
| Open edition | card Edit/View | loads edition, → `/editions/:ed/artefacts` | `GET /v1/editions/:ed` |
| **Copy edition** | card Copy → modal, name, Copy | new edition created; navigates to it — **preserving the imaged-object view when copied from one** (ids are shared); other views → new edition overview | `POST /v1/editions/:ed` |
| Copy modal display | (in modal) | shows a clean **Copyright** text + **Collaborators** email list (no raw JSON); requires login to copy | — |
| View metadata | "Manuscript Information" | modal of manuscript/composition/site/period/language/script/material/copyright… | `GET /v1/editions/:ed/metadata` |
| Delete/archive edition | "Delete Edition" (drafts only) | confirm modal; non-admin archives for self; admin archives for all via 2-step token; admin-with-editors is prompted | `DELETE /v1/editions/:ed[?optional=archiveForAllEditors&token=…]` |
| Publish | "Publish" | **Planned — not yet enabled.** Button is intentionally disabled for now; when enabled it will freeze the edition (read-only) and move it to the public list. Tests should assert it's disabled, not that it publishes. |
| Rename / edit copyright | metadata / PUT | updates fields + lastEdit | `PUT /v1/editions/:ed` |

**Collaboration (admins only — "Collaborators" modal):** invite by email with read/write/admin;
update a collaborator's permission; revoke (set None); resend / update / revoke pending
invitations; you cannot change your own row. Invitee opens the emailed link
`/accept-invitation/token/:t`, logs in, Accepts → edition appears in their list.

| Action | Endpoint |
|---|---|
| Invite editor | `POST /v1/editions/:ed/add-editor-request` |
| Update/revoke permission | `PUT /v1/editions/:ed/editors/:email` |
| Accept invitation | `POST /v1/editions/confirm-editorship/:token` |

**Journeys:** ① copy → land in the editor. ② invite → invitee accepts → appears in Collaborators
(as a share) and in their edition list. ③ admin deletes an edition that has other editors → is
prompted to delete-for-all or transfer admin and leave.

---

## 4. Imaged-object editor

**Purpose:** view a plate side (recto/verso) and define artefacts on it by drawing mask polygons.

| Action | Trigger | Expected result | Write? |
|---|---|---|---|
| Open | route | loads object, both sides' image manifests, selects first artefact of the active side | — |
| Switch side (Recto/Verso) | Side dropdown | `visibleArtefacts` re-filters to that side; image + layers refresh | — |
| New artefact | "New" → name → Create | created on the **current side**, appears in the side's list, **selected**, enters DRAW mode | ✎ |
| Rename / Delete artefact | row buttons | name updates / removed from list (reselects first) | ✎ |
| Select artefact | click row | becomes selected (`.selectedRow`), drawing targets its mask | — |
| Draw / erase mask | DRAW/ERASE mode, draw polygon/box on image | polygon added/subtracted from the selected artefact's mask; queues an operation; invalid polygons auto-repaired; overlap with another artefact is blocked | ✎ |
| Adjust image | opacity slider, layer visibility, zoom, rotate, background/highlight | display-only changes | — |
| Copy to variant edition | copy toolbox | copies the artefact to another edition | ✎ |
| Undo/redo, autosave | toolbar / automatic | reverts/reapplies mask ops; autosaves ~3s after last change | ✎ |

**Invariants:** `visibleArtefacts == artefacts.filter(side == currentSide)`; exactly one selected;
a **new artefact appears on the current side and is selected** (not vanished to the other side);
a drawn/erased polygon changes the selected mask and grows the undo stack; **the side is
persisted from the master image on the first mask write** (a mask-less artefact reads back as
recto until then). Write actions (New/Rename/Delete/draw/erase) are hidden when read-only.

**Journey:** switch to Verso → New artefact → draw mask → reload → still on verso, once.

---

## 5. Artefact editor

**Purpose:** link transcribed **signs** to **regions (ROIs)** of the artefact image, and edit sign
attributes. Right pane = the text (fragments→lines→signs); centre = the image.

| Action | Trigger | Expected result | Write? |
|---|---|---|---|
| Open | route | image + text load; existing ROIs overlay | — |
| Select a sign | click sign in text | sign highlights; drawing becomes enabled; attribute pane populates | — |
| Draw a ROI | polygon/box mode → draw | new ROI links the selected sign to that region; adds an operation | ✎ |
| Select / delete a ROI | click ROI / trash | highlights / marks deleted (undoable) | ✎ (delete) |
| Rotate / zoom image | toolbar / ctrl-scroll | rotation persists as an operation; zoom recenters | ✎ (rotate) |
| Edit sign attributes | attribute pane +/× | add/remove attribute; commentary; "Reconstructed" toggle | ✎ |
| Auto character-select | checkbox | after each ROI, advance to next sign | ✎ |
| Copy to edition | button → modal | copies artefact (+ROIs/text links) to another edition | ✎ |
| Change font size | toolbar slider | text resizes; persisted to localStorage | — |
| Undo/redo | toolbar / ctrl-z/y | reverses/reapplies ROI, rotation, attribute, comment ops | ✎ |

**Invariants:** drawing is **disabled until a single non-reconstructed sign is selected**; the
delete button is disabled with no ROI selected; a drawn ROI adds an operation; a selected ROI
highlights and cross-highlights its sign; polygons need ≥3 vertices and close within a threshold.
Draw/box/delete/attribute controls are hidden when read-only.

**Journey:** select sign → polygon mode → draw ROI → operation on the undo stack (→ autosaves).

---

## 6. Scroll editor

**Purpose:** arrange placed artefacts on a virtual scroll to reconstruct the manuscript layout.

| Action | Trigger | Expected result | Write? |
|---|---|---|---|
| Open | route | placed artefacts render in the SVG canvas | — |
| Add artefact(s) | "Add artefact" modal → search/select → Add | placed at offset positions, auto z-index, first selected | ✎ |
| Select / deselect | click artefact / empty canvas | selection toggles; toolbar enables | — |
| Move | drag, or nudge Left/Right/Up/Down (buttons/arrows) | `placement.translate` changes by the drag / `params.move` mm | ✎ |
| Scale / reset | +/− / Reset | `placement.scale` changes / resets to 1 | ✎ |
| Rotate / mirror | rotate buttons / Mirror | `placement.rotate` (0–360) / `placement.mirrored` toggles | ✎ |
| Z-index | top / bottom | `placement.zIndex` = max+1 / min−1 | ✎ |
| Remove | Remove / Delete key | `isPlaced=false`, leaves the canvas | ✎ |
| Group | Manage group → pick members → Save Group | 2+ artefacts grouped (moved/rotated together) | ✎ |
| Resize scroll | side + mm → Add/Cut | edition metrics change (blocked if it would crop artefacts) | ✎ |
| Toggle Display ROIs / Text | checkboxes | overlays show/hide | — |
| Pan / zoom / minimap | arrows / wheel / scroll-map click | viewport moves | — |
| Undo/redo, autosave | toolbar / automatic | reverts/reapplies placement & group ops; autosaves | ✎ |

**Invariants:** only `isPlaced` artefacts render; a move changes `placement.x`; a rotate changes
the rendered transform; **undo restores the prior placement**; `selectedArtefact` XOR
`selectedGroup`; rendered in z-index order. Write controls disabled when read-only.

**Journey:** add artefact → select → Move Right + Rotate Right (state changes) → undo reverts.

---

## 7. Text-fragment editor

**Purpose:** transcribe/annotate the text — fragments, lines, signs, attributes, commentary.

| Action | Trigger | Expected result | Endpoint / op |
|---|---|---|---|
| Navigate fragments | dropdown / tabs | fragment's lines+signs render; selection clears on switch | `GET …/text-fragments/:tf` |
| Rename fragment | right-click name → Rename | name updates | `PUT …/text-fragments/:tf` |
| Select sign(s) | click / ctrl-click (same fragment only) | sign(s) highlight; attribute pane populates | — |
| Edit sign | right-click → Edit Sign | character + type + Reconstructed; Apply (LETTER needs a char) | update-sign op |
| Add sign left/right, delete sign | sign context menu | insert/remove sign | create/delete op |
| Edit line | right-click line → Edit Line | contenteditable diff-replace of the whole line | `PUT …/diff-replace` |
| Add line before/after | line menu | auto-named new empty line inserted at the right position | `POST …/text-fragments/:tf/lines` |
| Delete line | line menu → Confirm | line removed | `DELETE …/lines/:id` |
| Sign attributes / commentary / reconstructed | attribute pane / modal | add/remove; highlight-comments mode | attribute/comment ops |
| Show QD parallels / variant editions / QWB variants | line/sign menu | reference modals (read-only) | proxy services |

**Invariants:** selected signs are all from one fragment; switching fragments clears selection;
Apply is gated (LETTER requires a character); add/edit/delete line operations are undoable and
keep line ordering consistent; all context menus are hidden when read-only.

**Journey:** select sign → Edit Sign modal → apply attribute; add line after → new line appears.

---

## 8. Search & realtime collaboration

**Search** (`/search`): four fields — Manuscript/text number, Imaged object (IAA plate), Text
reference (multi-line), Artefact (multi-line) — each with an exact-match checkbox; Search is
disabled until at least one field is filled. Results group into Editions / Imaged Objects / Text
Fragments / Artefacts accordions; empty → "no results"; each card links into the right editor
route. `POST /v1/search`.

**Realtime (SignalR):** on entering an edition you subscribe; on leaving you unsubscribe;
login/logout re-subscribes. A second connected client sees these **without reload**: artefact
created/updated/deleted, ROIs created/edited/deleted, sign interpretations created/updated/
deleted, editor added/permission-changed, artefact group created/updated/deleted, edition
metadata updated. Guards: your own unsaved edits aren't clobbered (pending-op guard), your own
change's echo is reconciled by operation id, identical updates are skipped (no flicker).
**🐞 BUG (to fix):** line & text-fragment create/update/delete events are **not** applied live
(the broadcast payload lacks `textFragmentId`), so a text collaborator's structural edits
currently require a reload. This is a **bug, not intended behaviour** — realtime text editing
should work like the artefact/ROI paths. Fixing it needs the API to include `textFragmentId` in
the line / text-fragment broadcast DTOs, then the frontend handlers wired up (they're currently
logged-and-ignored in `notification-coverage.ts`).

**Journeys:** search "1Q9" → open a result → browse its artefacts. Client A creates an artefact /
draws a ROI / makes a group → client B sees it appear live.

---

## Coverage today vs. gaps

Already guarded by tests (unit + Playwright): edition load/thumbnails, imaged-object master
image render, create/delete artefact in the listing, mask-draw autosave, opacity slider, copy
navigation + display, verso side persistence, the four workflow journeys, layout/visibility
sweeps, logged-out & in-app modal sweeps.

Biggest untested areas (candidates for the next test pass): **collaboration/permissions**
(invite→accept, permission changes, read-only gating actually blocking writes), **text editing**
(add/edit/delete line, edit sign, attributes), **scroll-editor grouping & resize**, **realtime**
(two-client sync), **search field/exact-match behaviour**, and the **account flows**
(register/activate/reset/change/update). Plus the two generic invariant sweeps discussed
separately: a **data-leak/i18n scanner** (no raw objects/undefined/missing translations rendered
anywhere) and **mutation round-trips** (every create/update survives a reload).

### Known work items (product, not just tests)

- **🐞 Fix realtime text editing** — wire line/text-fragment SignalR events (needs `textFragmentId`
  in the broadcast DTOs; see §8). Until fixed, a two-client text-sync test should be written to
  **fail** (documenting the bug) or skipped with a reference here.
- **✨ Build "resend activation email"** — add the UI for `POST /v1/users/resend-activation-email`
  (see §2), for users who registered but never activated.
- **⏸ Publishing** — planned but intentionally disabled (see §3); no functional test until enabled.
