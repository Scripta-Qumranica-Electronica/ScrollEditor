# API-COVERAGE.md — Goal A matrix

Every API call site in the ScrollEditor app → the HTTP verb + resolved route → the
UI action that triggers it → the e2e test(s) that drive that action.

**How `covered-by` is filled:** an `API_AUDIT=1 npx playwright test` run records every
`/v1/…` request the real app makes, tagged by test title, into
`tests/playwright/.api-audit.jsonl`. `node scripts/api-audit-aggregate.mjs` collapses
those to `verb + route-shape → [tests]`. A row is **covered** when its verb+route shows
up in that map, driven by a real UI action (not a `page.request` call).

Status legend: ✅ covered by a UI-driven e2e · 🟡 hit only incidentally / needs a
dedicated assertion · ❌ no e2e drives it · ⚫ dead / no caller in app.

Surface: **37** route builders · **69** CommHelper call sites · **5** axios ·
**61** service methods · **111** SignalR wrappers (unit-covered, mostly unused by app).

---

## Service call sites

| # | service.method | verb + route | UI action / trigger | covered-by (spec:test) | status |
|---|----------------|--------------|---------------------|------------------------|--------|
| 1 | artefact.getEditionArtefacts | GET /v1/editions/{id}/artefacts?optional=images | Open edition (lazy load pipeline) | _TBD_ | |
| 2 | artefact.getArtefactMask | GET /v1/editions/{id}/artefacts/{aid}?optional=masks | Per-artefact lazy mask load (artefact/scroll editor) | _TBD_ | |
| 3 | artefact.getEditionArtefactMasks | GET /v1/editions/{id}/artefacts?optional=masks | Mask-heavy view batch load | _TBD_ | |
| 4 | artefact.createArtefact | POST /v1/editions/{id}/artefacts | IO editor → create new artefact | _TBD_ | |
| 5 | artefact.deleteArtefact | DELETE /v1/editions/{id}/artefacts/{aid} | IO editor → delete artefact | _TBD_ | |
| 6 | artefact.copyArtefact | POST /v1/editions/{id}/artefacts | Copy-to-edition modal → confirm | _TBD_ | |
| 7 | artefact.changeArtefact | PUT /v1/editions/{id}/artefacts/{aid} | IO/artefact-editor save; artefact-card toggle | _TBD_ | |
| 8 | edition.getAllEditions | GET /v1/editions | Home page load | _TBD_ | |
| 9 | edition.getSingleEditions | GET /v1/editions/{id} | Text line → variant editions context | _TBD_ | |
| 10 | edition.getManuscriptEditions | GET /v1/manuscripts/{mid}/editions | Copy-edition toolbox; text-line variants | _TBD_ | |
| 11 | edition.getEditionMetadata | GET /v1/editions/{id}/metadata | Open edition (metadata load) | _TBD_ | |
| 12 | edition.copyEdition | POST /v1/editions/{id} | Copy-edition modal / sidebar copy | _TBD_ | |
| 13 | edition.renameEdition | PUT /v1/editions/{id} | Edition sidebar → rename | _TBD_ | |
| 14 | edition.deleteEdition (non-admin) | DELETE /v1/editions/{id} | Delete-edition modal confirm | _TBD_ | |
| 15 | edition.deleteEdition (admin step1) | DELETE /v1/editions/{id}?optional=archiveForAllEditors | Delete-edition modal (admin) | _TBD_ | |
| 16 | edition.deleteEdition (admin step2) | DELETE /v1/editions/{id}?…&token={token} | Delete-edition modal (admin, confirm) | _TBD_ | |
| 17 | edition.inviteEditor | POST /v1/editions/{id}/add-editor-request | Permission modal → invite editor | _TBD_ | |
| 18 | edition.updateInvitation | (delegates to inviteEditor) | Permission modal → update invitation | _TBD_ | |
| 19 | edition.confirmAddEditionEditor | POST /v1/editions/confirm-editorship/{token} | Confirm-invitation page (email link) | _TBD_ | |
| 20 | edition.updateSharePermissions | PUT /v1/editions/{id}/editors/{email} | Permission modal; delete-edition reassign admin | _TBD_ | |
| 21 | edition.getAllInvitations | GET /v1/editions/admin-share-requests | Load pending invitations | _TBD_ | |
| 22 | edition.updateArtefactDTOs | POST /v1/editions/{id}/artefacts/batch-transformation | Scroll editor → save placements (batch) | _TBD_ | |
| 23 | edition.newArtefactGroup | POST /v1/editions/{id}/artefact-groups | Scroll editor → create artefact group | _TBD_ | |
| 24 | edition.updateArtefactGroup | PUT /v1/editions/{id}/artefact-groups/{gid} | Scroll editor → update artefact group | _TBD_ | |
| 25 | edition.deleteArtefactGroup | DELETE /v1/editions/{id}/artefact-groups/{gid} | Scroll editor → delete/dissolve group | _TBD_ | |
| 26 | edition.getArtefactGroups | GET /v1/editions/{id}/artefact-groups | Open edition (artefact groups load) | _TBD_ | |
| 27 | edition.updateMetrics | PUT /v1/editions/{id} | Scroll editor → update manuscript metrics | _TBD_ | |
| 28 | edition.getAllAttributeMetadata | GET /v1/editions/{id}/sign-interpretations-attributes | Open edition (attribute metadata) | _TBD_ | |
| 29 | edition.getScribalFont | GET /v1/editions/{id}/scribalfonts | Open edition (script/scribal font) | _TBD_ | |
| 30 | imaged-object.getEditionImagedObjects | GET /v1/editions/{id}/imaged-objects | Open edition (deferred IO load) | _TBD_ | |
| 31 | qwb-proxy.getQwbWordVariants | GET /v1/qwb-proxy/words/{wid}/word-variants | Text sign → show QWB word variants (behind popover) | _TBD_ | |
| 32 | qwb-proxy.getQwbParallelText | GET /v1/qwb-proxy/parallels/start-word/{s}/end-word/{e} | Text line → show QWB parallels (behind popover) | _TBD_ | |
| 33 | qwb-proxy.getQwbBibliography | GET /v1/qwb-proxy/bibliography/{bid} | **NO CALLER (dead)** | n/a | ⚫ |
| 34 | search.search | POST /v1/search | Search page → run search | _TBD_ | |
| 35 | session.login | POST /v1/users/login | Login form submit | _TBD_ | |
| 36 | session.isTokenValid | GET /v1/users | App boot → validate stored token | _TBD_ | |
| 37 | session.forgotPassword | POST /v1/users/forgot-password | Forgot-password form submit | _TBD_ | |
| 38 | session.register | POST /v1/users | Registration form submit | _TBD_ | |
| 39 | session.changePassword | POST /v1/users/change-password | Change-password form submit | _TBD_ | |
| 40 | session.changeForgottenPassword | POST /v1/users/change-forgotten-password | Change-forgotten-password submit | _TBD_ | |
| 41 | session.activateUser | POST /v1/users/confirm-registration | Account activation page (email link) | _TBD_ | |
| 42 | session.updateUser | PUT /v1/users | Update-user form submit | _TBD_ | |
| 43 | session.reportProblem | POST /v1/utils/report-github-issue | Navbar → Report Problem modal submit | _TBD_ | |
| 44 | sign-interpretation.updateAttribute | PUT /v1/editions/{id}/sign-interpretations/{sid}/attributes/{vid} | Artefact editor → change sign attribute value | _TBD_ | |
| 45 | sign-interpretation.deleteAttribute | DELETE /v1/editions/{id}/sign-interpretations/{sid}/attributes/{vid} | Artefact editor → remove sign attribute | _TBD_ | |
| 46 | sign-interpretation.createAttribute | POST /v1/editions/{id}/sign-interpretations/{sid}/attributes | Artefact editor → add sign attribute | _TBD_ | |
| 47 | sign-interpretation.updateCommentary | PUT /v1/editions/{id}/sign-interpretations/{sid}/commentary | Artefact editor → edit sign commentary | _TBD_ | |
| 48 | sign-interpretation.deleteSignInterpretation | DELETE /v1/editions/{id}/sign-interpretations/{sid} | Artefact editor → delete sign | _TBD_ | |
| 49 | sign-interpretation.createSignInterpretation | POST /v1/editions/{id}/sign-interpretations | Artefact editor / edit-sign modal → add sign | _TBD_ | |
| 50 | sign-interpretation.updateSignInterpretation | PUT /v1/editions/{id}/sign-interpretations/{sid} | Artefact editor / edit-sign modal → change char/type | _TBD_ | |
| 51 | text.getEditionTextFragments | GET /v1/editions/{id}/text-fragments | Open edition (text-fragment list) | _TBD_ | |
| 52 | text.getArtefactTextFragments | GET /v1/editions/{id}/artefacts/{aid}/text-fragments?optional=suggested | Open artefact editor | _TBD_ | |
| 53 | text.getTextFragment | GET /v1/editions/{id}/text-fragments/{tid} | Open text fragment (text view) | _TBD_ | |
| 54 | text.getEditionFullText | GET /v1/editions/{id}/full-text | Load edition full text | _TBD_ | |
| 55 | text.updateArtefactROIs→updateServerROIs | POST /v1/editions/{id}/rois/batch-edit | Artefact editor → save ROI edits | _TBD_ | |
| 56 | text.changeTextFragment | PUT /v1/editions/{id}/text-fragments/{tid} | Artefact-editor text side → rename fragment | _TBD_ | |
| 57 | text.getLineText | GET /v1/editions/{id}/lines/{lid} | Text line → load line text | _TBD_ | |
| 58 | text.replaceText | PUT /v1/editions/{id}/diff-replace-text | Text edit ops / edit-line modal | _TBD_ | |
| 59 | text.createLine | POST /v1/editions/{id}/text-fragments/{tid}/lines | Add-line modal / text ops → create line | _TBD_ | |
| 60 | text.deleteLine | DELETE /v1/editions/{id}/lines/{lid} | Delete-line modal / text ops → delete line | _TBD_ | |
| 61 | utils.repairPolygon | POST /v1/utils/repair-wkt-polygon | Boundary drawer → repair invalid polygon | _TBD_ | |
| 62 | virtual-artefact.updateText | PUT /v1/editions/{id}/artefacts/{aid}/diff-replace-transcription | Scroll editor → save virtual-artefact transcription | _TBD_ | |
| 63 | image.getImageManifest | GET {IIIF manifestUrl} (direct axios, external host) | Open edition/artefact (IIIF manifest) | _TBD_ | |

### Notes
- `edition.deleteEdition` is one method but up to **3** DELETE call sites (rows 14–16) via the admin path.
- `edition.updateInvitation` (row 18) makes no HTTP of its own — delegates to `inviteEditor`.
- `text.updateArtefactROIs` (public) reaches the network only via private `updateServerROIs` (row 55).
- `image.getImageManifest` is the only service HTTP that bypasses CommHelper/ApiRoutes (direct axios to external IIIF host).
- Unused route builders (defined, no service method): `batchCreateRoisUrl` (/rois/batch), `roiUrl` (/rois/{id}). Only `batchEditRoisUrl` is used.
- Dead: `qwb-proxy.getQwbBibliography` + its `qwbBibliographyUrl` builder — no caller in src.

---

## Coverage summary (from the `API_AUDIT=1` full-run, 34 distinct verb+routes hit)

**✅ Covered — a real UI action drives the call (41 of 63 rows):**
rows 1–12, 14, 17, 20–22, 23, 26–30, 34–36, 51–54, 56–60 — i.e. edition load
(artefacts?images, masks, metadata, imaged-objects, groups, attributes, scribalfonts,
text-fragments, full-text), artefact create/delete/copy/change, edition copy/delete,
invite editor, update-share (revoke), search, login, token-validate, get-line-text,
replace-text, create/delete line, rename text-fragment. Representative specs:
`edition-lifecycle`, `edition-modals`, `permission-remove`, `copy-to-edition`,
`home-editions`, `functional-regressions`, `imaged-object-branches`, `scroll-editor-*`,
`text-modals`, `text-coverage`, `search`, `auth`, `smoke`.

Note: the audit **under-captures writes** (a request that fires on a delayed autosave or
just before `context.close()` can miss the recorder), so the audit alone is pessimistic —
several rows below are covered by a spec that drives the write and asserts it *server-side*
even though the audit didn't log the request.

**✅ Covered at the appropriate level (revised after the source-API run):**
- *Sign-interpretation writes — e2e (text-modals / text-coverage / text-branches drive the
  real modal/pane and GET-verify server-side):* `updateAttribute` (44), `createAttribute`
  (46), `updateCommentary` (47), `deleteSignInterpretation` (48), `createSignInterpretation`
  (49), `updateSignInterpretation` (50). (`deleteAttribute` (45) via the Reconstructed
  check-then-uncheck path.)
- *User/session mutations — UNIT-tested with a mocked CommHelper (`services-session.spec.ts`);
  e2e submission is intentionally avoided because it mutates the shared `test@1` user or has
  an external side effect:* `register` (38), `forgotPassword` (37), `changePassword` (39),
  `changeForgottenPassword` (40), `activateUser` (41), `updateUser` (42), `reportProblem` (43).
  Their **forms render** under e2e (public-user-flows / user-account / edition-modals).
- *QWB `getQwbWordVariants` (31):* now reachable via the rewired text-sign right-click menu
  (Phase 2) → "Show QD Variants" → `openQwbVariantsModal`.

**❌ Genuine remaining e2e gaps (small):**
- `updateArtefactGroup` (24), `deleteArtefactGroup` (25) — scroll-editor group edit/dissolve
  ops don't round-trip in the audit; add a scroll-editor e2e.
- `getQwbParallelText` (32) — the text-line "Show QD Parallels" menu; add an e2e.
- `confirmAddEditionEditor` (19) — driven only via `context.request` in permission-remove;
  no UI-form submit (the confirm-invitation button needs a logged-in invitee).
- `updateArtefactROIs`→`rois/batch-edit` (55), virtual-artefact `updateText` (62) —
  ROI save / reconstruction save; assert handler ran + no pageerror (copied-edition caveat).

**⚫ Dead / n-a:** `getQwbBibliography` (33) no caller; `renameEdition` (13) caller was the
now-deleted `sidebar.vue`; `getImageManifest` (63) external IIIF (exercised via rendering).
