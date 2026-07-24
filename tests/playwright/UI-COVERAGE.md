# UI-COVERAGE.md — Goal B matrix

Every interactive UI element (click / type / toggle / drag) across the 100 `.vue`
files → is it **rendered**, **reachable** (not behind a dead trigger / not overlapped),
**functional** (its effect asserted), **laid-out** correctly → and the e2e test that
proves it.

Columns per element: `handler` · `reachable?` · `functional? (asserted)` · `layout OK?`
· `covered-by (spec:test)`. Status per row: ✅ done · 🟡 partial · ❌ gap · ⚫ dead trigger.

Surface: **100** `.vue` (77 interactive, 23 display-only) · **~248** interactive
elements · **199** button-like · **168** @click · **126** v-model · **17** routes.

> The `reachable?` / `covered-by` columns are finalised after the `API_AUDIT=1`
> e2e run + a per-route walk. Elements marked ⚫ are blocked on Phase 2 (dead triggers).

---

## Systemic bug classes to check on EVERY control (feeds Phase 2)

1. **Dead right-click popovers** — `this.$root.$emit('bv::show::popover', …)` bus does not
   exist in Vue 3. Whole context menus are unreachable in: `text-line.vue` (edit/add/delete
   line, show variants/parallels), `text-sign.vue` (edit/delete sign, add sign L/R, edit
   virtual artefact, QWB variants), `views/artefact-editor/text-side.vue` (rename fragment),
   `views/edition/components/artefact-card.vue` (rename artefact). **Fix:** per-instance
   boolean `v-model` on each `<b-popover>`.
2. **Dead legacy modal openers** — `$refs.x.show()` / `$root.$bvModal.show` / `bv::modal::hide`:
   Navbar (FAQ/EULA/citation/report/login), `artefact-editor.vue` (Copy-to-Edition),
   `scroll-editor.vue` (add-artefact modal `bv::modal::hide`), `copy-edition-toolbox.vue`.
   **Fix:** boolean `v-model` + `@hide`.
3. **bvn `@input`/`@change` on `<b-form-*>` (likely dead — need `@update:model-value`):**
   `manuscript-toolbar.vue` (Text-mode checkbox), `sign-attribute-modal.vue` (attr-value select),
   `sign-attribute-pane.vue` (reconstructed checkbox), `SingleImageSetting.vue` (visible checkbox),
   `permission-modal.vue` (share/invitation selects), `views/artefact-editor/text-side.vue`
   (fragment select), `views/search/form.vue` (text/artefact reference inputs).
4. **`@click`/native listeners on CUSTOM components** (compat `$listeners` drop). All
   `<toolbar-icon-button>` / `<rotate-button>` `@click` depend on the `$listeners`-forward
   getter in `toolbar-icon-button.vue` — single point of failure for scroll-editor toolbars,
   artefact-editor mode buttons, undo/redo, zoom, font-size. Assert the *effect*, not existence.

---

## Global chrome (all routes)

### src/App.vue
| element | handler | notes | covered-by |
|---|---|---|---|
| corrupted-state-dialog | v-model corruptedStateVisible | opened via eventBus | _TBD_ |
| window resize → screen-size-alert | JS resize listener | | _TBD_ |

### src/components/navigation/Navbar.vue
| element | handler | notes | covered-by |
|---|---|---|---|
| Report-problem icon | @click reportProblemModal | `$refs…show()` legacy | _TBD_ |
| Search icon | to="/search" | router-link | _TBD_ |
| User dropdown: login/logout/changePassword/updateUserDetails | @click each | login/FAQ/EULA/cite via `$refs.show()` (legacy) | _TBD_ |
| Hamburger: home/private/public/about/FAQ/EULA/cite/guide/report/contact | @click each | FAQ/EULA/cite legacy ref openers ⚫ | _TBD_ |

### src/components/navigation/Login.vue
| element | handler | notes | covered-by |
|---|---|---|---|
| modal | v-model visible / @show | via registerModalListener | _TBD_ |
| email / password inputs | v-model | | _TBD_ |
| container | @keyup.enter login | submit-on-enter | _TBD_ |
| forgot-password link | @click forgotPassword | opens passwordModal | _TBD_ |
| Login button | @click login | | _TBD_ |
| Sign-up link | @click register | | _TBD_ |

### report-problem-modal.vue
| element | handler | notes | covered-by |
|---|---|---|---|
| modal | v-model visible | legacy ref open | _TBD_ |
| username / title / description | v-model | | _TBD_ |
| Report / Close buttons | @click reportProblem / close | | _TBD_ |

### CitationModal / Eula-modal / Faq-modal
| element | handler | notes | covered-by |
|---|---|---|---|
| each modal | v-model visible | display content; opened by Navbar `$refs.show()` ⚫ | _TBD_ |

### CorruptedStateDialog.vue
| element | handler | notes | covered-by |
|---|---|---|---|
| dialog / Reload-page btn | v-model / @click reloadPage | | _TBD_ |

### misc/resizeBar.vue
| element | handler | notes | covered-by |
|---|---|---|---|
| resize bar | @mousedown startDrag | native drag-to-resize | _TBD_ |

---

## `/` welcome — src/components/welcome/welcome.vue
| element | handler | notes | covered-by |
|---|---|---|---|
| Login / Register buttons | @click login / register | modal-bus | _TBD_ |
| Enter-as-guest | :to="/home" | router-link | _TBD_ |

---

## `/home/:editionType`
| file | element | handler | notes | covered-by |
|---|---|---|---|---|
| Home.vue | tabs | v-model:index activeTab | personal/public panes | _TBD_ |
| personal-editions / public-editions | search-bar | @search onEditionsSearch | custom @-listener | _TBD_ |
| public-editions | child | @show-copy-modal | opens copy modal | _TBD_ |
| edition-list | copy-edition-modal / edition-card | v-model / @edition-copy-click | | _TBD_ |
| edition-public-list | scroller / public-card | @scroll.passive onScroll / @show-copy-modal | infinite scroll | _TBD_ |
| edition-public-row | edition-public-card | @edition-copy-click | | _TBD_ |
| edition-card | card body / Edit / Copy / @contextmenu | @click ×3 + right-click | | _TBD_ |
| edition-public-card | card body / View / Copy | @click ×3 | | _TBD_ |
| copy-edition-modal | modal / name input / Copy / Login / Register / form | v-model, @keyup.enter, @click.once, @submit | | _TBD_ |
| copy-to-edition-modal | modal / search / per-edition item / Copy | v-model, @click, @click.once | also used in artefact editor | _TBD_ |

---

## `/search`
| file | element | handler | notes | covered-by |
|---|---|---|---|---|
| main.vue | search-form | @search onSearch | | _TBD_ |
| form.vue | textDesignation / imageDesignation inputs | v-model | | _TBD_ |
| form.vue | exact* checkboxes ×4 | v-model | b-form-checkbox | _TBD_ |
| form.vue | textReference / artefactDesignation | @input textToArray | ⚠ bvn @input risk (no v-model) | _TBD_ |
| form.vue | Search button | @click search | | _TBD_ |
| results panes (5) | router-link only | | display-only navigation | _TBD_ |

---

## `/editions/:id` (+ tabs)
| file | element | handler | notes | covered-by |
|---|---|---|---|---|
| Edition.vue | Manuscript Info / Permissions / Delete | @click openMetadata / openPermissionModal / deleteEdition | Publish btn disabled | _TBD_ |
| Edition.vue | artefacts/imaged-objects tab buttons | :to/@click | route tab switches | _TBD_ |
| artefacts.vue / imaged-objects.vue | search-bar | @search | filters cards | _TBD_ |
| metadata.vue | modal | v-model visible | | _TBD_ |
| artefact-card.vue | @contextmenu → popover; rename input; Save; Close | right-click + @click | ⚫ popover DEAD (bv::show::popover) | _TBD_ |
| permission-modal.vue | modal / email / permission select / Invite | v-model, @click invite | | _TBD_ |
| permission-modal.vue | share select @change; Update; invitation select @change; Update | @change + @click | ⚠ bvn @change risk | _TBD_ |
| sidebar.vue | Rename open/confirm; copy modal; Permissions | @click, v-model, @submit | **DEAD COMPONENT (not in Edition template)** | _TBD_ |
| delete-edition-modal.vue | modal / confirmation input / Delete | v-model, @click | | _TBD_ |
| copyright.vue | modal | v-model | display | _TBD_ |
| confirm-invitation.vue | Confirm button | @click change | /accept-invitation route | _TBD_ |
| imaged-object-card.vue | router-link | → IO editor | | _TBD_ |

---

## `/editions/:id/scroll-editor`
| file | element | handler | notes | covered-by |
|---|---|---|---|---|
| scroll-editor.vue | root keydown/keyup/keypress; zoom v-model; add-artefact modal | keyboard + v-model | ⚫ `bv::modal::hide` dead (TODO) | _TBD_ |
| scroll-top-toolbar.vue | material/text mode toggles; zoom ±/reset; rotate ±; mirror; drag ×4; sliders | @click (custom) + v-model | all @click via $listeners forward | _TBD_ |
| manuscript-toolbar.vue | Text-mode checkbox | @input onTextMode | ⚠ bvn @input LIKELY DEAD | _TBD_ |
| manuscript-toolbar.vue | Display-ROIs / reconstructed / text checkboxes | @update:model-value | correct pattern | _TBD_ |
| manuscript-toolbar.vue | Add-artefact / Remove; side select; metrics input; resize ±; group manage/save/cancel; z-index ± | @click + v-model | | _TBD_ |
| artefact-toolbox.vue | move/scale/rotate/mirror modes; move ×4; zoom ±/reset; rotate ±; group; z-index | @click + v-model | **DEAD COMPONENT (no `<artefact-toolbox>` tag)** | _TBD_ |
| add-artefact-modal.vue | modal; search; checkbox-group; per-artefact row/checkbox; check-all recto/verso; Close; Uncheck | v-model + @click | | _TBD_ |
| artefact-image-group.vue | @pointerdown/move/up/cancel; @click; @contextmenu; inner @click | pointer drag + click (native SVG) | | _TBD_ |
| scroll-area.vue | @click onScrollClick; @mousemove | native | | _TBD_ |
| scroll-map.vue | svg minimap @click | navigate viewport | | _TBD_ |
| text-toolbar.vue | edit-virtual-artefact-text @close | custom @-listener | | _TBD_ |

---

## Artefact editor — `/editions/:id/artefacts/:id` + `/text-fragments/:id`
| file | element | handler | notes | covered-by |
|---|---|---|---|---|
| artefact-editor.vue | Polygon/Box/Select/Delete-ROI mode btns | @click onModeClick / onDeleteRoi | custom @click | _TBD_ |
| artefact-editor.vue | Highlight-comment / Auto checkboxes | @update:modelValue | correct | _TBD_ |
| artefact-editor.vue | Copy-to-edition btn | @click openCopyToEdtion | ⚫ `$bvModal.show` gone (TODO) | _TBD_ |
| artefact-editor.vue | Report-mask btn; artefact select | @click / @update:modelValue | | _TBD_ |
| artefact-editor-toolbar.vue | zoom / rotation / font-size | v-model (toolboxes) | | _TBD_ |
| roi-layer.vue | ROI path @click | select (native SVG) | | _TBD_ |
| text-side.vue | fragment select @input | ⚠ bvn @input risk | | _TBD_ |
| text-side.vue | position up/down; line-menu @contextmenu; rename input/btn; Close | @click + right-click | ⚫ popover DEAD | _TBD_ |

---

## Imaged-object editor — `/editions/:id/imaged-objects/:id`
| file | element | handler | notes | covered-by |
|---|---|---|---|---|
| imaged-object-editor.vue | Add-artefact; artefact list item; Edit-name; rename input; Rename-save; Delete; new-artefact modal/form/name | @click + v-model + @submit | | _TBD_ |
| imaged-object-editor-toolbar.vue | zoom / rotation; Background / HighLight checkboxes; side-filter dropdown; editing-mode btn | v-model + @click | editing-mode custom @click | _TBD_ |

---

## Shared text/sign editing components
| file | element | handler | notes | covered-by |
|---|---|---|---|---|
| text-line.vue | @contextmenu → popover; editable @input; edit/add-before/after/delete line; show variants/parallels; variant+parallel modals | right-click + @click + v-model | ⚫ popover DEAD | _TBD_ |
| text-sign.vue | sign @click; @contextmenu → popover; edit/delete sign; add L/R sign; edit virtual artefact; QWB variants; QWB modal | @click + right-click + v-model | ⚫ popover DEAD | _TBD_ |
| add-line-modal.vue | modal; line-name @input (native); Save | v-model + @click | native input OK | _TBD_ |
| delete-line-modal.vue | modal; Delete | v-model + @click | | _TBD_ |
| edit-line-modal.vue | modal @shown; check-difference; all-reconstructed checkbox | @click + @update:modelValue | correct | _TBD_ |
| edit-sign-modal.vue | modal @shown; new-character; attr-value select; reconstructed checkbox; status-mode | v-model + @update:modelValue + @click | | _TBD_ |
| edit-virtual-artefact-text.vue | Hide; text textarea @input | @click + v-model | native textarea | _TBD_ |
| comment/comment.vue | @click view/edit/delete; view+edit modals; ckeditor @input | @click + v-model | ckeditor Vue-2 value/input pattern | _TBD_ |

---

## Sign-attribute components
| file | element | handler | notes | covered-by |
|---|---|---|---|---|
| sign-attribute-modal.vue | modal @update:model-value/@hide; attr-value select @change; comment v-model; Delete; Save | @change + @click | ⚠ bvn @change LIKELY DEAD | _TBD_ |
| sign-attribute-pane.vue | reconstructed checkbox @change; attributes/values dropdown @hide; add-attributes open; add-attribute item; comment | @change + @click | ⚠ bvn @change LIKELY DEAD | _TBD_ |
| sign-attribute.vue | attribute chip @click | native div | | _TBD_ |

---

## Toolbar building blocks (shared)
| file | element | handler | notes | covered-by |
|---|---|---|---|---|
| toolbar-icon-button.vue | inner b-button `v-on="listeners"` | forwards parent listeners | **$listeners-forward mitigation — all @click depend on it** | _TBD_ |
| undo-redo-toolbox.vue | Undo / Redo | @click (custom) | | _TBD_ |
| zoom-toolbox.vue | Zoom-out/in (custom); slider; Reset (native) | @click + v-model | | _TBD_ |
| rotation-toolbox.vue | Rotate-left/right (rotate-button); slider | @click (custom) | | _TBD_ |
| rotate-button.vue | icon button @click + @mousedown | re-emits click | single rotation via @click | _TBD_ |
| font-size-button-toolbox.vue | Font-size up/down | @click (custom) | | _TBD_ |
| edition-toolbox.vue | Metadata / Copyright-info | @click (native b-button) | | _TBD_ |
| copy-edition-toolbox.vue | Copy-edition btn; dropdown copy | @click | ⚫ copy-edition-modal not migrated (TODO) | _TBD_ |
| adjust-image-toolbox.vue | Adjust popover trigger | @click (popover target) | verify popover fires in bvn | _TBD_ |
| polygons/boundary-drawer.vue | drawing surface @pointerdown | draw ROI (native SVG) | | _TBD_ |
| image-settings/ImageSettings.vue | single-image-setting @change | custom @-listener (component emits change → OK) | | _TBD_ |
| image-settings/SingleImageSetting.vue | visible checkbox @change; opacity slider @update:model-value | ⚠ bvn @change on checkbox risk | opacity correct | _TBD_ |
| misc/zoomer.vue | zoom surface @wheel | native scroll-to-zoom | | _TBD_ |
| images/IIIFImage.vue | bg/tile img @error | load-error handlers | not user-interactive | _TBD_ |

---

## Auth routes
| file | element | handler | notes | covered-by |
|---|---|---|---|---|
| Registration.vue | modal; @keyup.enter; 6 inputs; terms checkbox; terms link; Register | v-model + @click | | _TBD_ |
| ChangePassword.vue | 3 password inputs; Change | v-model + @click | | _TBD_ |
| ChangeForgottenPassword.vue | 2 password inputs; Change (disabled binding) | v-model + @click | | _TBD_ |
| UpdateUser.vue | 5 inputs; Change | v-model + @click | | _TBD_ |
| ForgotPassword.vue | modal @shown; @keyup.enter; email; Submit | v-model + @click | modal-bus passwordModal | _TBD_ |
| Activation.vue | Activate | @click change | | _TBD_ |

---

## Display-only files (23 — no user-operable control; render/layout only)
artefact-image, artefact-svg, cues/edition-icons, misc/Waiting, sign-attribute-badge,
text-fragment, toolbars/toolbar, toolbars/toolbox, artefact-editor/image-layer,
artefact-editor/sign-wheel, screen-size-alert, imaged-object-editor/artefact-layer,
imaged-object-editor/image-layer, scroll-editor/artefact-sillhouette, scroll-editor/scroll-ruler,
search/results, search/artefact-results, search/edition-results, search/imaged-object-results,
search/text-fragment-results (+ container shells artefacts.vue / imaged-objects.vue whose only
control is a child `<search-bar>`).

---

## Layout audit (per route, vs production https://sqe.deadseascrolls.org.il/)
Screenshot each route at **1280** and **1440** width; assert the load-bearing invariants:
toolbar `scrollHeight ≈ clientHeight` (no vertical overflow), controls content-sized (not
full-row width), `img.naturalWidth > 0` (images decode), no `pageerror`. Known offender
pattern: bootstrap `.row > *` width:100% + fixed-height toolbars (fixed in `toolbar.vue`).

**Implemented in `layout-audit.spec.ts`** — each route × {1280, 1440}: screenshot to
`test-results/layout/`, assert (a) no horizontal overflow (`documentElement.scrollWidth ≤
clientWidth + 2`), (b) no `.toolbar` overflows its bar vertically (`scrollHeight ≈
clientHeight`), (c) no `pageerror`. Images are dropped (this env's IIIF host cert is invalid).

| route | 1280 | 1440 | notes |
|---|---|---|---|
| / | ✅ | ✅ | |
| /home/public | ✅ | ✅ | |
| /home/private | ✅ | ✅ | |
| /search | ✅ | ✅ | |
| /editions/:id/artefacts | ✅ | ✅ | |
| /editions/:id/imaged-objects | ✅ | ✅ | |
| /editions/:id/scroll-editor | ⚠️ | ⚠️ | **KNOWN ISSUE (found by this audit):** top toolbar sits in a fixed-height CSS-grid row; at 1280–1440 its controls wrap to a 2nd row but grid sizes the `auto` track by the flex bar's *unwrapped* max-content (1 row), so **~55px of buttons spill onto the canvas**. Partial mitigation applied (`grid-template-rows: minmax($toolbar-height,auto)`); the real fix is to lift the toolbar out of the fixed grid row (re-assign the row-2 grid children + `resize-bar`). Test asserts it doesn't regress past 90px until fixed. |
| /editions/:id/artefacts/:id | ✅ | ✅ | |
| /editions/:id/imaged-objects/:id | ✅ | ✅ | |
| /editions/:id/text-fragments/:id | ✅ | ✅ | |

Screenshots in `test-results/layout/` are for manual comparison against production
(`https://sqe.deadseascrolls.org.il/`). Auth routes (registration/change-password/etc.) are
modal/simple-form views already covered by public-user-flows / user-account specs.
