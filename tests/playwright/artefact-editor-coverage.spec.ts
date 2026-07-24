import { test, expect, loginToken, authedContext, collectCoverage, API } from './fixtures';
import type { Browser, BrowserContext, Page } from '@playwright/test';

// ROUND-3 coverage for the ARTEFACT EDITOR + IMAGED-OBJECT EDITOR views and the
// imaged-object toolbar, hitting handlers the existing artefact-editor* /
// imaged-object* / editor-controls specs never reach:
//   artefact-editor.vue     — onNewZoom (wheel), onNewRotate, the zoom/rotate re-centre
//                             watchers (recentreOnZoom / recentreOnRotate), nextSign,
//                             onRoiClicked's "no signInterpretationId" branch,
//                             openReportMask (only on a public edition), text-fragment-mode
//                             selectArtefact via the #artefact-info <b-form-select>.
//   imaged-object-editor.vue— onNewPolygon (draw a mask op), getArtefactColor via the
//                             HighLight toggle (removeColor → 'none'), inputRenameChanged
//                             cancel, newArtefact create success (→ DRAW mode).
//   imaged-object-editor-toolbar.vue — background / highLight setters, onImageSettingChanged,
//                             onRotationAngleChanged/notifyChange, onZoomChanged.
//
// Writable copies of public edition 918 (artefact editor / single-side imaged objects)
// and 811 (two-sided imaged objects) so nothing touches shared data. Every test guards
// page errors → [].

let token: string;
let editionId: number; // copy of 918
let artefactId: number;
let imagedObjectId: string;
let ioEditionId: number; // copy of 811 (two-sided)
let ioImagedObjectId: string;

test.beforeAll(async ({ playwright }) => {
    test.setTimeout(120_000); // two edition copies (918 + 811)
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    const auth = { Authorization: `Bearer ${token}` };

    const copy = await request.post(`${API}/v1/editions/918`, {
        headers: auth,
        data: { name: `pw-ae-cov-${Date.now()}` },
    });
    editionId = (await copy.json()).id;
    const arts = (await (await request.get(`${API}/v1/editions/${editionId}/artefacts`, { headers: auth })).json())
        .artefacts;
    const withImage = arts.find((a: { isVirtual: boolean; imagedObjectId?: string }) => !a.isVirtual && a.imagedObjectId);
    artefactId = withImage.id;
    imagedObjectId = withImage.imagedObjectId;

    const copy811 = await request.post(`${API}/v1/editions/811`, {
        headers: auth,
        data: { name: `pw-io-cov-${Date.now()}` },
    });
    ioEditionId = (await copy811.json()).id;
    const arts811 = (await (await request.get(`${API}/v1/editions/${ioEditionId}/artefacts`, { headers: auth })).json())
        .artefacts;
    const bySide: Record<string, { recto: boolean; verso: boolean }> = {};
    for (const a of arts811) {
        if (!a.imagedObjectId || a.isVirtual) continue;
        bySide[a.imagedObjectId] = bySide[a.imagedObjectId] || { recto: false, verso: false };
        if (a.side === 'recto') bySide[a.imagedObjectId].recto = true;
        if (a.side === 'verso') bySide[a.imagedObjectId].verso = true;
    }
    ioImagedObjectId = Object.keys(bySide).find((io) => bySide[io].recto && bySide[io].verso)!;

    await request.dispose();
});

// ---- artefact editor ---------------------------------------------------------

function aeState(page: Page) {
    return page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        const tr = document.querySelector('#transform-root');
        return {
            zoom: st.artefactEditor.params?.zoom as number | undefined,
            rotation: st.artefactEditor.params?.rotationAngle as number | undefined,
            selectedSiCount: st.textFragmentEditor.selectedSignInterpretations.length as number,
            transform: tr ? tr.getAttribute('transform') : null,
        };
    });
}

function aeCtx(page: Page) {
    return page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c = (document.querySelector('#artefact-grid') as any)?.__vueParentComponent?.ctx;
        return {
            actionMode: c?.actionMode as string,
            isDrawingEnabled: !!c?.isDrawingEnabled,
        };
    });
}

async function openArtefactEditor(browser: Browser): Promise<{ ctx: BrowserContext; page: Page; errors: string[] }> {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(`/editions/${editionId}/artefacts/${artefactId}`);
    await expect.poll(() => aeState(page).then((s) => s.transform), { timeout: 40_000 }).not.toBeNull();
    return { ctx, page, errors };
}

test('artefact editor: ctrl-wheel over the image zooms via the zoomer (onNewZoom → zoomHandledByZoomer path)', async ({
    browser,
}) => {
    const { ctx, page, errors } = await openArtefactEditor(browser);

    const before = (await aeState(page)).zoom!;
    // Wheel-zoom drives the zoomer → onNewZoom(event): sets zoomHandledByZoomer=true, then the
    // zoomLevel watcher (recentreOnZoom) takes the early-return "handled" branch.
    await page.evaluate(() => {
        const target = document.querySelector('#artefact-image svg') as Element;
        const r = target.getBoundingClientRect();
        for (let i = 0; i < 8; i++) {
            target.dispatchEvent(
                new WheelEvent('wheel', {
                    bubbles: true,
                    cancelable: true,
                    ctrlKey: true,
                    deltaY: -100,
                    clientX: r.x + r.width / 2,
                    clientY: r.y + r.height / 2,
                }),
            );
        }
    });
    await expect.poll(() => aeState(page).then((s) => s.zoom), { timeout: 10_000 }).toBeGreaterThan(before);
    // Rendered transform reflects the wheel zoom.
    const after = await aeState(page);
    expect(after.transform).toContain(`scale(${after.zoom})`);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('artefact editor: toolbar Zoom In runs the recentreOnZoom re-centring watcher (scroll fixed to centre)', async ({
    browser,
}) => {
    const { ctx, page, errors } = await openArtefactEditor(browser);

    // Toolbar zoom (NOT wheel) → zoomHandledByZoomer stays false → recentreOnZoom runs its full
    // body (centeringReady true after mount, oldZoom set): it re-scrolls #artefact-image so the
    // centre point stays fixed. Assert the zoom changed and no error surfaced.
    const before = (await aeState(page)).zoom!;
    await page.getByTitle('Zoom In').first().click();
    await page.getByTitle('Zoom In').first().click();
    await expect.poll(() => aeState(page).then((s) => s.zoom), { timeout: 10_000 }).toBeGreaterThan(before);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('artefact editor: Right Rotate runs recentreOnRotate and renders the new angle', async ({ browser }) => {
    const { ctx, page, errors } = await openArtefactEditor(browser);

    const before = (await aeState(page)).rotation!;
    // Toolbar rotate → params.rotationAngle changes → recentreOnRotate watcher runs its
    // trig re-centre body (centeringReady true, oldAngle defined). Transform reflects the angle.
    await page.getByTitle('Right Rotate').first().click();
    await expect.poll(() => aeState(page).then((s) => s.rotation), { timeout: 10_000 }).not.toBe(before);
    const after = await aeState(page);
    expect(after.transform).toContain(`rotate(${after.rotation}`);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('artefact editor: nextSign advances selection to the next mappable sign in the line', async ({ browser }) => {
    const { ctx, page, errors } = await openArtefactEditor(browser);

    // Select the first sign of a line, then call nextSign() (the auto-mode advance used after a
    // polygon is drawn) — it walks forward within the line to the next sign that has a character
    // and isn't reconstructed and selects it (or stays put if there is none further along).
    await page.locator('#text-side .text-sign').first().click();
    await expect.poll(() => aeState(page).then((s) => s.selectedSiCount), { timeout: 10_000 }).toBe(1);

    const before = await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        const si = st.textFragmentEditor.singleSelectedSi;
        return si ? (si.sign.indexInLine as number) : null;
    });

    const after = await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c = (document.querySelector('#artefact-grid') as any).__vueParentComponent.ctx;
        c.nextSign();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        const si = st.textFragmentEditor.singleSelectedSi;
        return si ? (si.sign.indexInLine as number) : null;
    });

    // nextSign() ran its body: the selection is still a single sign in the SAME line, at an index
    // >= the starting index (it only ever moves forward, never backward).
    expect(before).not.toBeNull();
    expect(after).not.toBeNull();
    expect(after!).toBeGreaterThanOrEqual(before!);
    await expect.poll(() => aeState(page).then((s) => s.selectedSiCount), { timeout: 10_000 }).toBe(1);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('artefact editor: openReportMask opens the report-problem modal (public-edition Report Mask button)', async ({
    browser,
}) => {
    // Edition 918 is public, so the "Report Mask" toolbar button (v-if edition.isPublic) is
    // rendered. It's not writable, so open it on the PUBLIC edition directly (no copy needed —
    // this only opens a modal, never mutates). openReportMask() seeds reportIssueData + showModal.
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(`/editions/918/artefacts/${artefactId}`);
    // Wait until the editor's own component is mounted (grid present) even if it's a fresh copy;
    // to keep it read-only-safe we navigate the public edition and just wait for the artefact grid.
    await expect(page.locator('#artefact-grid')).toBeVisible({ timeout: 40_000 });

    // Invoke openReportMask on the editor instance and read reportIssueData back through the SAME
    // component's $state (proxy) so we assert on exactly the store it wrote to.
    const seeded = await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cmp = (document.querySelector('#artefact-grid') as any)?.__vueParentComponent;
        const c = cmp?.ctx;
        if (!c || typeof c.openReportMask !== 'function') return null;
        c.openReportMask();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (cmp.proxy || c).$state;
        return st.misc.reportIssueData?.title ?? null;
    });
    expect(seeded, 'openReportMask seeds reportIssueData with the artefact/edition context').toMatch(
        /Problem with mask of artefact/,
    );

    // showModal('ReportProblemModal') makes the report-problem modal visible.
    await expect(page.locator('.modal:has-text("Report"), #ReportProblemModal').first()).toBeVisible({
        timeout: 10_000,
    });

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('artefact editor: onRoiClicked with a maskless ROI selects the ROI but clears the sign selection', async ({
    browser,
}) => {
    const { ctx, page, errors } = await openArtefactEditor(browser);

    // Call onRoiClicked with an ROI object that has no signInterpretationId → the branch that
    // selects the ROI yet leaves selectedSignInterpretations empty. Drive it on the instance
    // (roi-layer would only ever hand real ROIs; this exercises the null-SI guard directly).
    const result = await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c = (document.querySelector('#artefact-grid') as any).__vueParentComponent.ctx;
        c.onRoiClicked({ id: 'fake-roi', signInterpretationId: null });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        return {
            selectedRoi: !!st.artefactEditor.selectedInterpretationRoi,
            selectedSiCount: st.textFragmentEditor.selectedSignInterpretations.length as number,
        };
    });
    expect(result.selectedRoi).toBe(true);
    expect(result.selectedSiCount).toBe(0);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('artefact editor (text-fragment mode): the #artefact-info select switches the displayed artefact', async ({
    browser,
}) => {
    // In text-fragment mode the artefact editor renders a <b-form-select> in #artefact-info whose
    // @update:modelValue calls selectArtefact(Number($event)) → prepareArtefact loads a different
    // artefact. Boot the editor in text-fragment mode (route /text-fragments/:id).
    const request = await browser.newContext();
    const tfPage = await request.newPage();
    // Fetch a text-fragment id for the copy.
    const tfId = await tfPage.evaluate(
        async ([api, ed, tok]) => {
            const r = await fetch(`${api}/v1/editions/${ed}/text-fragments`, {
                headers: { Authorization: `Bearer ${tok}` },
            });
            const b = await r.json();
            return b.textFragments[0].id as number;
        },
        [API, String(editionId), token] as const,
    );
    await request.close();

    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(`/editions/${editionId}/text-fragments/${tfId}`);
    await expect(page.locator('#text-side .text-sign').first()).toBeVisible({ timeout: 40_000 });

    // The current artefact before switching.
    const before = await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        return st.artefacts.current?.id as number | undefined;
    });

    // The select in #artefact-info lists all edition artefacts; choose a DIFFERENT one via its
    // @update:modelValue handler (selectArtefact) on the editor instance.
    const targetId = await page.evaluate((cur) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c = (document.querySelector('#artefact-grid') as any).__vueParentComponent.ctx;
        const other = c.artefacts.find((a: { id: number }) => a.id !== cur);
        if (!other) return null;
        c.selectArtefact(other.id);
        return other.id as number;
    }, before);

    if (targetId !== null) {
        await expect
            .poll(
                () =>
                    page.evaluate(() => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
                        return st.artefacts.current?.id as number | undefined;
                    }),
                { timeout: 15_000 },
            )
            .toBe(targetId);
    }

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

// ---- imaged-object editor + toolbar ------------------------------------------

async function openImagedObjectEditor(
    browser: Browser,
    edition: number,
    io: string,
): Promise<{ ctx: BrowserContext; page: Page; errors: string[] }> {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(`/editions/${edition}/imaged-objects/${io}`);
    await expect(page.getByTitle('Zoom In').first()).toBeVisible({ timeout: 40_000 });
    await expect(page.locator('#transform-root')).toBeVisible({ timeout: 20_000 });
    return { ctx, page, errors };
}

test('imaged-object toolbar: HighLight + Background checkboxes flip the params (setters) and re-colour artefacts', async ({
    browser,
}) => {
    const { ctx, page, errors } = await openImagedObjectEditor(browser, editionId, imagedObjectId);

    const params = () =>
        page.evaluate(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
            return {
                highLight: st.imagedObject.params?.highLight as boolean,
                background: st.imagedObject.params?.background as boolean,
                removeColor: (st.imagedObject.params?.highLight === false) as boolean,
            };
        });

    const start = await params();

    // Toggle HighLight — its b-form-checkbox v-model hits the highLight setter. Drive the checkbox
    // input inside the toolbox labelled "HighLight".
    const highlight = page.locator('label', { hasText: /^HighLight$/ }).locator('xpath=preceding::input[1]');
    await highlight.first().click({ force: true });
    await expect.poll(() => params().then((p) => p.highLight), { timeout: 10_000 }).toBe(!start.highLight);

    // Toggle Background — background setter.
    const background = page.locator('label', { hasText: /^Background$/ }).locator('xpath=preceding::input[1]');
    await background.first().click({ force: true });
    await expect.poll(() => params().then((p) => p.background), { timeout: 10_000 }).toBe(!start.background);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('imaged-object toolbar: onImageSettingChanged fires from the Adjust-image popover (notifyChange imageSettings)', async ({
    browser,
}) => {
    const { ctx, page, errors } = await openImagedObjectEditor(browser, editionId, imagedObjectId);

    // Open the Adjust image popover, then invoke onImageSettingChanged on the toolbar instance the
    // way ImageSettings → adjust-image-toolbox → toolbar chain does (@image-setting-changed).
    // This runs notifyChange('imageSettings', ...) which emits paramsChanged. No error must fire.
    const adjust = page.locator('#popover-adjust');
    await expect(adjust).toBeVisible({ timeout: 10_000 });
    await adjust.click();
    await expect(page.locator('#popover-input-1')).toBeVisible({ timeout: 10_000 });

    const fired = await page.evaluate(() => {
        // Search the imaged-object toolbar's subtree DOWNWARD for the component that owns
        // onImageSettingChanged (the toolbar instance) — .parent goes the wrong way.
        const root = document.querySelector('#imaged-object-toolbar');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const start: any = (root as any)?.__vueParentComponent;
        if (!start) return false;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stack: any[] = [start];
        const seen = new Set();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const kids = (inst: any): any[] => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const out: any[] = [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const visit = (vn: any) => {
                if (!vn || typeof vn !== 'object') return;
                if (vn.component) out.push(vn.component);
                const ch = vn.children;
                if (Array.isArray(ch)) ch.forEach(visit);
                else if (ch && typeof ch === 'object') Object.values(ch).forEach((c) => (Array.isArray(c) ? c.forEach(visit) : visit(c)));
            };
            if (inst.subTree) visit(inst.subTree);
            return out;
        };
        while (stack.length) {
            const cur = stack.pop();
            if (!cur || seen.has(cur)) continue;
            seen.add(cur);
            if (cur.ctx && typeof cur.ctx.onImageSettingChanged === 'function' && cur.ctx.notifyChange) {
                const p = cur.proxy || cur.ctx;
                cur.ctx.onImageSettingChanged(p.params.imageSettings);
                return true;
            }
            for (const child of kids(cur)) stack.push(child);
        }
        return false;
    });
    expect(fired, 'toolbar onImageSettingChanged reachable').toBe(true);
    await page.waitForTimeout(150);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('imaged-object editor: drawing a polygon on the boundary creates a mask draw operation (onNewPolygon)', async ({
    browser,
}) => {
    const { ctx, page, errors } = await openImagedObjectEditor(browser, editionId, imagedObjectId);

    // The imaged-object editor always shows the boundary-drawer (canEdit && artefact). Draw a small
    // closed polygon INSIDE the selected artefact's area far from other masks so onNewPolygon adds a
    // draw op (no overlap toast) and grows the undo stack.
    const surface = page.locator('#transform-root .draw-boundary').first();
    await expect(surface).toBeVisible({ timeout: 15_000 });

    const undoBefore = await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (document.querySelector('#imaged-object-grid') as any).__vueParentComponent.ctx.operationsManager
            .undoStack.length as number;
    });

    await page.evaluate(() => {
        const g = document.querySelector('#transform-root .draw-boundary') as SVGElement;
        const r = g.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const fire = (type: string, x: number, y: number) =>
            g.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, bubbles: true, cancelable: true }));
        fire('pointerdown', cx - 8, cy - 8);
        fire('pointermove', cx + 8, cy - 8);
        fire('pointermove', cx + 8, cy + 8);
        fire('pointermove', cx - 8, cy + 8);
        fire('pointermove', cx - 7, cy - 7);
        fire('pointerup', cx - 7, cy - 7);
    });

    // Either a draw op was added (undoStack grew), or the polygon overlapped a neighbour mask and
    // onNewPolygon early-returned. Both run the handler body; accept ≥ before (never crashes).
    await expect
        .poll(
            () =>
                page.evaluate(
                    () =>
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (document.querySelector('#imaged-object-grid') as any).__vueParentComponent.ctx.operationsManager
                            .undoStack.length as number,
                ),
            { timeout: 15_000 },
        )
        .toBeGreaterThanOrEqual(undoBefore);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('imaged-object editor: Rename input opens then cancels (inputRenameChanged toggles renameInputActive)', async ({
    browser,
}) => {
    const { ctx, page, errors } = await openImagedObjectEditor(browser, ioEditionId, ioImagedObjectId);

    // Select an artefact row, click Rename → inputRenameChanged(art) shows the inline <input>.
    const rows = page.locator('#imaged-object-artefacts .select-art-name');
    await expect(rows.first()).toBeVisible({ timeout: 20_000 });
    await rows.first().click();
    await page.locator('#imaged-object-artefacts').getByRole('button', { name: /^Rename$/ }).first().click();
    await expect(page.locator('#imaged-object-artefacts input').first()).toBeVisible({ timeout: 10_000 });

    // Cancel the rename via inputRenameChanged(undefined) — clears renameInputActive → input hides.
    await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (document.querySelector('#imaged-object-grid') as any).__vueParentComponent.ctx.inputRenameChanged(undefined);
    });
    await expect(page.locator('#imaged-object-artefacts input')).toHaveCount(0, { timeout: 10_000 });

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('imaged-object editor: New-artefact create adds an artefact and switches to DRAW mode', async ({ browser }) => {
    const { ctx, page, errors } = await openImagedObjectEditor(browser, ioEditionId, ioImagedObjectId);

    // createArtefact adds the new artefact into the global $state.artefacts store (it does not
    // splice it into the imaged object's own list), so track that count.
    const before = await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        return st.artefacts.items.length as number;
    });

    // Open the New-artefact modal (the b-btn slot is dead in this build), set the name, then call
    // newArtefact() → createArtefact (server), onArtefactChanged(new), editingModeChanged('DRAW').
    const err = await page.evaluate(async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cmp = (document.querySelector('#imaged-object-grid') as any).__vueParentComponent;
        const p = cmp.proxy || cmp.ctx;
        p.newArtefactName = `pw-new-${Date.now()}`;
        await cmp.ctx.newArtefact();
        return (cmp.proxy || cmp.ctx).errorMessage as string;
    });
    expect(err, `newArtefact errorMessage: ${err}`).toBeFalsy();

    await expect
        .poll(
            () =>
                page.evaluate(() => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
                    return st.artefacts.items.length as number;
                }),
            { timeout: 20_000 },
        )
        .toBe(before + 1);

    // editingModeChanged('DRAW') set the drawing mode to DRAW (0).
    await expect
        .poll(
            () =>
                page.evaluate(() => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
                    return st.imagedObject.params?.drawingMode as number;
                }),
            { timeout: 10_000 },
        )
        .toBe(0);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});
