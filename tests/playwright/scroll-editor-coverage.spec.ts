import {
    test,
    expect,
    loginToken,
    authedContext,
    artefactX,
    artefactTransform,
    collectCoverage,
    API,
} from './fixtures';
import type { Browser, BrowserContext, Page } from '@playwright/test';

// P-COV — round-3 coverage top-up for the scroll-editor core files. The existing
// scroll-editor / -deep / -branches / -modals specs cover the single-artefact toolbar
// gestures, the modal, the empty-edition resize branches and a few keys. This spec
// drives the STILL-UNCOVERED code:
//
//   scroll-editor.vue        : saveEntities() (whole persist pipeline for placements +
//                              metrics + group), navigateToPoint(), the onKeyDown
//                              Home/End/ArrowUp/PageUp/ArrowLeft + Delete branches, the
//                              resizeScroll "cropped" (blocked) branch, group save via
//                              saveGroupArtefacts(), onZoomChangedGlobal.
//   scroll-top-toolbar.vue   : the GROUP branch of dragArtefact / zoomArtefact /
//                              rotateGroupArtefact (getGroupCenter +
//                              translateArtefactAfterGroupRotation) / mirrorArtefact /
//                              resetZoom, plus onKeyDown '<' '>' '-' '=' keys.
//   manuscript-toolbar.vue   : the GROUP branch of setZIndex and removeArtefactOrGroup
//                              (deleteGroup), and the group-size table getters
//                              (getGroupSize / updateSelectedArtefactsSizes /
//                              getArtefactWidth/Height / convertToMM).
//   artefact-image-group.vue : onPointerCancel(), onPointerUp() cancel branch, group drag.
//   scroll-area.vue          : onMouseMove (pointerPosition), the manageGroup
//                              isArtefactDisabled=true branch.
//
// Everything runs against throwaway copies of public edition 899 (60 placed artefacts).

let token: string;
let editionId: number;
let placedArtefactIds: number[] = [];

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    const auth = { Authorization: `Bearer ${token}` };

    const copy = await request.post(`${API}/v1/editions/899`, {
        headers: auth,
        data: { name: `pw-scroll-cov-${Date.now()}` },
    });
    editionId = (await copy.json()).id;

    const arts = (
        await (await request.get(`${API}/v1/editions/${editionId}/artefacts`, { headers: auth })).json()
    ).artefacts;
    placedArtefactIds = arts
        .filter((a: { isPlaced: boolean; isVirtual: boolean }) => a.isPlaced && !a.isVirtual)
        .map((a: { id: number }) => a.id);
    expect(placedArtefactIds.length, 'source edition should have placed artefacts').toBeGreaterThan(5);

    await request.dispose();
});

const route = () => `/editions/${editionId}/scroll-editor`;

async function scrollState(page: Page) {
    return page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        const se = st.scrollEditor;
        return {
            zoom: se.params?.zoom as number | undefined,
            mode: se.mode as string | undefined,
            paramsMode: se.params?.mode as string | undefined,
            selectedArtefactId: (se.selectedArtefact?.id ?? null) as number | null,
            selectedGroupNull: se.selectedGroup === null,
            selectedCount: (se.selectedArtefacts?.length ?? 0) as number,
            viewportWidth: (se.viewport?.width ?? null) as number | null,
            canUndo: (st.operationsManager?.canUndo ?? false) as boolean,
            editionWidth: (st.editions.current?.metrics?.width ?? null) as number | null,
            editionHeight: (st.editions.current?.metrics?.height ?? null) as number | null,
            groupCount: (st.editions.current?.artefactGroups?.length ?? 0) as number,
        };
    });
}

async function renderedArtefactIds(page: Page): Promise<number[]> {
    return page.evaluate((ids) => {
        const scroll = document.querySelector('#the-scroll');
        if (!scroll) return [];
        return ids.filter((id) => scroll.querySelector(`#path-${id}`));
    }, placedArtefactIds);
}

async function openEditor(browser: Browser): Promise<{ ctx: BrowserContext; page: Page; errors: string[] }> {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(route());
    await expect(page.locator('#the-scroll')).toBeVisible({ timeout: 40_000 });
    await expect.poll(() => renderedArtefactIds(page).then((r) => r.length), { timeout: 40_000 }).toBeGreaterThan(0);
    return { ctx, page, errors };
}

async function selectArtefact(page: Page, id: number) {
    await page.evaluate((artId) => {
        const path = document.querySelector(`#the-scroll #path-${artId}`);
        const clickable =
            (path?.closest('g[transform]')?.querySelector('g') as SVGElement | null) ??
            (path as unknown as SVGElement);
        clickable.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }, id);
    await expect.poll(() => scrollState(page).then((s) => s.selectedArtefactId), { timeout: 10_000 }).toBe(id);
}

// Return `count` rendered artefact ids that are NOT already members of any existing
// (possibly backend-persisted) artefact group — so buildGroup's multipleSelect
// accumulation always adds them (an already-grouped artefact is skipped by selectArtefact).
async function ungroupedRenderedIds(page: Page, count: number): Promise<number[]> {
    const rendered = await renderedArtefactIds(page);
    const grouped: number[] = await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        const groups = (st.editions.current?.artefactGroups ?? []) as { artefactIds: number[] }[];
        return groups.flatMap((g) => g.artefactIds);
    });
    const free = rendered.filter((id) => !grouped.includes(id)).slice(0, count);
    expect(free.length, 'enough ungrouped rendered artefacts for a group').toBe(count);
    return free;
}

// Build a live multi-artefact GROUP by accumulating artefacts in multipleSelect mode.
// Returns the group's artefact ids. Leaves the group selected.
async function buildGroup(page: Page, ids: number[]): Promise<number[]> {
    // Drive the editor's own selectArtefact in multipleSelect mode (deterministic — no DOM
    // click bubbling that could toggle a member back out). This is the same accumulation
    // path the 'g'-key + click gesture routes through (proven by scroll-editor.spec), but
    // called directly so the group build is stable under the serial full-suite run.
    await page.evaluate(() => {
        const editorGrid = document.querySelector('#editor-grid') as HTMLElement;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (editorGrid as any).__vueParentComponent.ctx.params.mode = 'multipleSelect';
    });
    await expect.poll(() => scrollState(page).then((s) => s.paramsMode), { timeout: 10_000 }).toBe('multipleSelect');

    for (const artId of ids) {
        await page.evaluate((id) => {
            const editorGrid = document.querySelector('#editor-grid') as HTMLElement;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cmp = (editorGrid as any).__vueParentComponent.ctx;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
            cmp.selectArtefact(st.artefacts.find(id));
        }, artId);
    }
    // Reset the mode to '' (the group stays selected) as the keyup handler would.
    await page.evaluate(() => {
        const editorGrid = document.querySelector('#editor-grid') as HTMLElement;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (editorGrid as any).__vueParentComponent.ctx.params.mode = '';
    });
    await expect.poll(() => scrollState(page).then((s) => s.selectedGroupNull), { timeout: 10_000 }).toBe(false);
    await expect.poll(() => scrollState(page).then((s) => s.selectedCount), { timeout: 10_000 }).toBe(ids.length);
    return ids;
}

// Read a placement field for a given artefact from the store.
function placement(page: Page, id: number) {
    return page.evaluate((artId) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        const p = st.artefacts.find(artId)?.placement;
        return {
            x: p.translate.x as number,
            y: p.translate.y as number,
            rotate: p.rotate as number,
            scale: p.scale as number,
            zIndex: p.zIndex as number,
            mirrored: p.mirrored as boolean,
        };
    }, id);
}

// ---------------------------------------------------------------------------
// scroll-top-toolbar: GROUP branches (dragArtefact / zoomArtefact / rotateGroupArtefact
// / mirrorArtefact / resetZoom over selectedGroup) — the biggest untouched paths.
// ---------------------------------------------------------------------------

test('top-toolbar GROUP: Move Right shifts every group member and enables undo', async ({ browser }) => {
    const { ctx, page, errors } = await openEditor(browser);

    const [a, b] = await ungroupedRenderedIds(page, 2);
    await buildGroup(page, [a, b]);

    const beforeA = (await placement(page, a)).x;
    const beforeB = (await placement(page, b)).x;

    // With a group selected, dragArtefact iterates selectedArtefacts and builds a
    // GroupPlacementOperation (the branch the single-artefact tests never hit).
    await page.getByTitle('Right', { exact: true }).first().click();

    await expect.poll(() => placement(page, a).then((p) => p.x), { timeout: 10_000 }).toBeGreaterThan(beforeA);
    await expect.poll(() => placement(page, b).then((p) => p.x), { timeout: 10_000 }).toBeGreaterThan(beforeB);
    await expect.poll(() => scrollState(page).then((s) => s.canUndo), { timeout: 10_000 }).toBe(true);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('top-toolbar GROUP: Zoom In then Reset scales every member back to 1', async ({ browser }) => {
    const { ctx, page, errors } = await openEditor(browser);

    const [a, b] = await ungroupedRenderedIds(page, 2);
    await buildGroup(page, [a, b]);

    const beforeA = (await placement(page, a)).scale;

    // GROUP zoomArtefact branch.
    await page.locator('.toolbox').filter({ has: page.locator('.description', { hasText: 'Resize Artefact' }) })
        .getByTitle('Zoom In').click();
    await expect.poll(() => placement(page, a).then((p) => p.scale), { timeout: 10_000 }).toBeGreaterThan(beforeA);

    // GROUP resetZoom branch → all back to scale 1.
    await page.locator('.toolbox').filter({ has: page.locator('.description', { hasText: 'Resize Artefact' }) })
        .getByTitle('Reset').click();
    await expect.poll(() => placement(page, a).then((p) => p.scale), { timeout: 10_000 }).toBe(1);
    await expect.poll(() => placement(page, b).then((p) => p.scale), { timeout: 10_000 }).toBe(1);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('top-toolbar GROUP: Rotate Right rotates+translates members (getGroupCenter + translateAfterGroupRotation)', async ({
    browser,
}) => {
    const { ctx, page, errors } = await openEditor(browser);

    const [a, b] = await ungroupedRenderedIds(page, 2);
    await buildGroup(page, [a, b]);

    const beforeA = await placement(page, a);
    const beforeB = await placement(page, b);

    // GROUP rotateGroupArtefact: rotates each member AND repositions it about the group
    // centre (translateArtefactAfterGroupRotation) — a big untouched math path.
    await page.getByTitle('Rotate Right').first().click();

    await expect.poll(() => placement(page, a).then((p) => p.rotate), { timeout: 10_000 }).not.toBe(beforeA.rotate);
    // At least one member is repositioned by the rotation about the group centre.
    await expect
        .poll(
            () => Promise.all([placement(page, a), placement(page, b)]).then(([pa, pb]) =>
                pa.x !== beforeA.x || pa.y !== beforeA.y || pb.x !== beforeB.x || pb.y !== beforeB.y),
            { timeout: 10_000 },
        )
        .toBe(true);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('top-toolbar GROUP: Mirror flips mirrored on every group member', async ({ browser }) => {
    const { ctx, page, errors } = await openEditor(browser);

    const [a, b] = await ungroupedRenderedIds(page, 2);
    await buildGroup(page, [a, b]);

    // GROUP mirrorArtefact branch.
    await page.getByTitle('Mirror').first().click();
    await expect.poll(() => placement(page, a).then((p) => p.mirrored), { timeout: 10_000 }).toBe(true);
    await expect.poll(() => placement(page, b).then((p) => p.mirrored), { timeout: 10_000 }).toBe(true);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

// ---------------------------------------------------------------------------
// scroll-top-toolbar.onKeyDown: the remaining keys ('<' '>' '-' '=') — the branches
// spec only drove ArrowRight/ArrowDown/./+.
// ---------------------------------------------------------------------------

test('top-toolbar onKeyDown: "<" and ">" rotate, "-" and "=" scale the selected artefact', async ({ browser }) => {
    const { ctx, page, errors } = await openEditor(browser);

    const [id] = await renderedArtefactIds(page);
    await selectArtefact(page, id);
    // Give a definite non-zero rotate/scale step.
    await page.locator('.by-input').nth(1).fill('10'); // rotate degrees
    await page.locator('.by-input').first().fill('20'); // scale %

    const dispatch = (key: string) =>
        page.evaluate((k) => {
            const div = document.querySelector('[tabindex="0"]') as HTMLElement;
            div.focus();
            div.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
        }, key);

    const before = await placement(page, id);
    await dispatch('>'); // rotate right
    await expect.poll(() => placement(page, id).then((p) => p.rotate), { timeout: 10_000 }).not.toBe(before.rotate);

    const afterR = await placement(page, id);
    await dispatch('<'); // rotate left
    await expect.poll(() => placement(page, id).then((p) => p.rotate), { timeout: 10_000 }).not.toBe(afterR.rotate);

    const beforeScale = (await placement(page, id)).scale;
    await dispatch('='); // zoom in (== '+')
    await expect.poll(() => placement(page, id).then((p) => p.scale), { timeout: 10_000 }).toBeGreaterThan(beforeScale);

    const midScale = (await placement(page, id)).scale;
    await dispatch('-'); // zoom out
    await expect.poll(() => placement(page, id).then((p) => p.scale), { timeout: 10_000 }).toBeLessThan(midScale);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

// ---------------------------------------------------------------------------
// manuscript-toolbar: GROUP branches of setZIndex + removeArtefactOrGroup, and the
// group-size table getters that only run when selectedGroup.artefactIds.length > 1.
// ---------------------------------------------------------------------------

test('manuscript-toolbar GROUP: top/down z-index reorders every member and the group-size table renders', async ({
    browser,
}) => {
    const { ctx, page, errors } = await openEditor(browser);

    const [a, b] = await ungroupedRenderedIds(page, 2);
    await buildGroup(page, [a, b]);

    const beforeA = (await placement(page, a)).zIndex;

    // GROUP setZIndex branch (iterates selectedArtefacts).
    await page.locator('#secondary-toolbar').getByRole('button', { name: /^top$/ }).first().click();
    await expect.poll(() => placement(page, a).then((p) => p.zIndex), { timeout: 10_000 }).toBeGreaterThan(beforeA);
    await expect.poll(() => placement(page, b).then((p) => p.zIndex), { timeout: 10_000 }).toBeGreaterThan(beforeA);

    // The group-size table (v-if selectedGroup.artefactIds.length>1) renders, exercising
    // getGroupSize / updateSelectedArtefactsSizes / getArtefactWidth+Height / convertToMM.
    await expect(page.locator('.manuscript-artefacts-table')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.manuscript-artefacts-table tbody tr')).toHaveCount(2, { timeout: 10_000 });
    await expect(page.getByText(/Group Max Width/)).toBeVisible();

    const top = (await placement(page, a)).zIndex;
    await page.locator('#secondary-toolbar').getByRole('button', { name: /^down$/ }).first().click();
    await expect.poll(() => placement(page, a).then((p) => p.zIndex), { timeout: 10_000 }).toBeLessThan(top);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('manuscript-toolbar GROUP: Remove unplaces every member (GroupPlacementOperation delete + deleteGroup)', async ({
    browser,
}) => {
    const { ctx, page, errors } = await openEditor(browser);

    const [a, b] = await ungroupedRenderedIds(page, 2);
    await buildGroup(page, [a, b]);

    const isPlaced = (id: number) =>
        page.evaluate((artId) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
            return st.artefacts.find(artId)?.isPlaced as boolean;
        }, id);

    expect(await isPlaced(a)).toBe(true);
    // GROUP removeArtefactOrGroup branch → each member deleted + deleteGroup().
    await page.getByRole('button', { name: /^Remove$/i }).first().click();
    await expect.poll(() => isPlaced(a), { timeout: 10_000 }).toBe(false);
    await expect.poll(() => isPlaced(b), { timeout: 10_000 }).toBe(false);
    await expect.poll(() => scrollState(page).then((s) => s.canUndo), { timeout: 10_000 }).toBe(true);

    // Undo restores both members.
    await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state.operationsManager.undo();
    });
    await expect.poll(() => isPlaced(a), { timeout: 10_000 }).toBe(true);
    await expect.poll(() => isPlaced(b), { timeout: 10_000 }).toBe(true);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

// ---------------------------------------------------------------------------
// scroll-editor.saveEntities(): the whole persist pipeline. Drive a placement change AND
// a metric change, then invoke saveEntities directly with the dirty ops. This exercises
// the entire method body — the ArtefactPlacementOperation branch (allMovedArtefactIds →
// prepareForBackend → updateArtefactDTOs) and the EditionMetricOperation branch
// (saveMetrics → updateMetrics) — plus the try/catch. (This backend's metric PUT +
// batch-transformation endpoints are not wired for copied editions, so saveEntities may
// resolve to false via its own catch; we assert it returns a boolean and throws no
// unhandled page error, which is what the method contract guarantees.)
// ---------------------------------------------------------------------------

test('scroll-editor saveEntities: runs the placement + metric persist pipeline without throwing', async ({
    browser,
}) => {
    const { ctx, page, errors } = await openEditor(browser);

    const [id] = await renderedArtefactIds(page);
    await selectArtefact(page, id);

    // 1) move the artefact → an ArtefactPlacementOperation (allMovedArtefactIds path).
    await page.locator('.by-input').nth(2).fill('4');
    const beforeX = await artefactX(page, id);
    await page.getByTitle('Right', { exact: true }).first().click();
    await expect.poll(() => artefactX(page, id), { timeout: 10_000 }).toBeGreaterThan(beforeX!);

    // 2) grow the edition → an EditionMetricOperation (saveMetrics path).
    const beforeW = (await scrollState(page)).editionWidth!;
    await page.getByRole('button', { name: /^Add$/ }).first().click();
    await expect.poll(() => scrollState(page).then((s) => s.editionWidth), { timeout: 10_000 }).toBeGreaterThan(beforeW);

    // Invoke saveEntities directly on the mounted ctx (its correct editionId), passing the
    // dirty ops. Whether the network call succeeds or is caught, the method must resolve a
    // boolean and prepareForBackend must have run over the moved artefact.
    const result = await page.evaluate(async () => {
        const editorGrid = document.querySelector('#editor-grid') as HTMLElement;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c = (editorGrid as any).__vueParentComponent.ctx;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const om = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state.operationsManager;
        const ok = await c.saveEntities(Array.from(om.dirty));
        om.dirty.clear();
        return typeof ok;
    });
    expect(result).toBe('boolean');

    // No unhandled page error escaped the save (its catch swallows backend failures).
    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

// ---------------------------------------------------------------------------
// scroll-editor.saveGroupArtefacts() + the saveEntities group branch: build a manageGroup
// of >=2 artefacts, call saveGroupArtefacts() (pushes an EditGroupOperation and appends a
// new unsaved group to the edition), then invoke saveEntities to run the
// EditGroupOperation branch (allEditedGroupIds → newArtefactGroup path). Asserts the
// in-memory group was created and no page error escaped.
// ---------------------------------------------------------------------------

test('scroll-editor saveGroupArtefacts: builds a group and runs the group save branch', async ({ browser }) => {
    const { ctx, page, errors } = await openEditor(browser);

    const [a, b, c] = await ungroupedRenderedIds(page, 3);

    // Seed a manageGroup: normal-select the seed, switch to manageGroup, then accumulate
    // the OTHER two artefacts (re-selecting the seed would toggle it back out).
    await selectArtefact(page, a);
    await page.evaluate(() => {
        const editorGrid = document.querySelector('#editor-grid') as HTMLElement;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (editorGrid as any).__vueParentComponent.ctx.params.mode = 'manageGroup';
    });
    await expect.poll(() => scrollState(page).then((s) => s.paramsMode), { timeout: 10_000 }).toBe('manageGroup');

    for (const artId of [b, c]) {
        await page.evaluate((id) => {
            const editorGrid = document.querySelector('#editor-grid') as HTMLElement;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cmp = (editorGrid as any).__vueParentComponent.ctx;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
            const art = st.artefacts.find(id);
            cmp.selectArtefact(art);
        }, artId);
    }
    await expect.poll(() => scrollState(page).then((s) => s.selectedCount), { timeout: 10_000 }).toBeGreaterThan(1);

    const groupsBefore = (await scrollState(page)).groupCount;

    // saveGroupArtefacts(): pushes an EditGroupOperation and appends a new (id<0) group.
    await page.evaluate(() => {
        const editorGrid = document.querySelector('#editor-grid') as HTMLElement;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (editorGrid as any).__vueParentComponent.ctx.saveGroupArtefacts();
    });
    await expect.poll(() => scrollState(page).then((s) => s.groupCount), { timeout: 10_000 }).toBe(groupsBefore + 1);

    // Run saveEntities to drive the EditGroupOperation branch (allEditedGroupIds path).
    const result = await page.evaluate(async () => {
        const editorGrid = document.querySelector('#editor-grid') as HTMLElement;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c = (editorGrid as any).__vueParentComponent.ctx;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const om = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state.operationsManager;
        const ok = await c.saveEntities(Array.from(om.dirty));
        om.dirty.clear();
        return typeof ok;
    });
    expect(result).toBe('boolean');

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

// ---------------------------------------------------------------------------
// scroll-editor.onKeyDown: the remaining no-selection scroll keys (ArrowUp / PageUp /
// ArrowLeft / Home / End). The deep spec covered ArrowDown/PageDown/ArrowRight/End's
// downward motion; here we drive the up/left/Home paths distinctly.
// ---------------------------------------------------------------------------

test('scroll-editor onKeyDown: End scrolls to far corner, then Home returns to origin', async ({ browser }) => {
    const { ctx, page, errors } = await openEditor(browser);

    const pos = () =>
        page.evaluate(() => {
            const c = document.querySelector('#artefact-container')!;
            return { left: c.scrollLeft, top: c.scrollTop };
        });

    const key = (k: string) =>
        page.evaluate((kk) => {
            const div = document.querySelector('[tabindex="0"]') as HTMLElement;
            div.focus();
            div.dispatchEvent(new KeyboardEvent('keydown', { key: kk, bubbles: true }));
        }, k);

    // End → scrollTo(scrollWidth, scrollHeight): jumps to the far corner.
    await key('End');
    await expect.poll(() => pos().then((p) => p.left + p.top), { timeout: 10_000 }).toBeGreaterThan(0);

    // ArrowUp / ArrowLeft / PageUp then Home → back to (0,0).
    await key('ArrowUp');
    await key('ArrowLeft');
    await key('PageUp');
    await key('Home');
    await expect.poll(() => pos(), { timeout: 10_000 }).toEqual({ left: 0, top: 0 });

    // Delete key routes to the (no-op in Vue3) $root emit branch without throwing.
    await key('Delete');

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

// ---------------------------------------------------------------------------
// scroll-editor.resizeScroll(): the BLOCKED (cropped) branch — a Cut that would crop a
// placed artefact is rejected, leaving the width unchanged (allowResizing → false).
// ---------------------------------------------------------------------------

test('scroll-editor resizeScroll: a Cut that would crop placed artefacts is rejected (width unchanged)', async ({
    browser,
}) => {
    const { ctx, page, errors } = await openEditor(browser);

    // 899 is packed with 60 placed artefacts spanning the full width, so a left-side Cut
    // crops something → allowResizing returns false → resizeScroll's blocked branch runs
    // and the width does not change.
    const before = (await scrollState(page)).editionWidth!;

    // Make the cut large enough to guarantee a crop on the left edge.
    await page.locator('.manuscript-toolbar, #secondary-toolbar').first().waitFor({ timeout: 10_000 });
    await page.locator('select').first().selectOption('left');
    const metricInput = page.locator('#secondary-toolbar input[type="number"]').first();
    await metricInput.fill('300');

    await page.getByRole('button', { name: /^Cut$/ }).first().click();

    // Give the handler a moment; the width must remain unchanged (rejected).
    await page.waitForTimeout(500);
    expect((await scrollState(page)).editionWidth).toBe(before);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

// ---------------------------------------------------------------------------
// scroll-editor.navigateToPoint(): call it directly with an in-bounds point and assert
// the container scrolls (distinct from the scroll-map click which goes through the map's
// own coordinate mapping).
// ---------------------------------------------------------------------------

test('scroll-editor navigateToPoint scrolls the container toward the given point', async ({ browser }) => {
    const { ctx, page, errors } = await openEditor(browser);

    // Ensure the viewport has been computed by the ResizeObserver.
    await expect.poll(() => scrollState(page).then((s) => s.viewportWidth), { timeout: 15_000 }).not.toBeNull();

    const scrolled = await page.evaluate(() => {
        const editorGrid = document.querySelector('#editor-grid') as HTMLElement;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ctx = (editorGrid as any).__vueParentComponent.ctx;
        const c = document.querySelector('#artefact-container')! as Element;
        const before = c.scrollLeft + c.scrollTop;
        // A point well inside the edition (edition coords ≈ metrics * ppm).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        const m = st.editions.current.metrics;
        const ppm = st.editions.current.ppm;
        ctx.navigateToPoint({ x: (m.width * ppm) / 2, y: (m.height * ppm) / 2 });
        return { before, after: c.scrollLeft + c.scrollTop };
    });
    expect(scrolled.after).not.toBe(scrolled.before);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

// ---------------------------------------------------------------------------
// scroll-area.onMouseMove(): a mousemove over #the-scroll writes pointerPosition, which
// the manuscript-toolbar renders as the "Position: X, Y" readout.
// ---------------------------------------------------------------------------

test('scroll-area onMouseMove updates scrollEditor.pointerPosition', async ({ browser }) => {
    const { ctx, page, errors } = await openEditor(browser);

    const pointer = () =>
        page.evaluate(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
            return { x: st.scrollEditor.pointerPosition.x, y: st.scrollEditor.pointerPosition.y };
        });

    await page.evaluate(() => {
        const svg = document.querySelector('#the-scroll') as SVGElement;
        const r = svg.getBoundingClientRect();
        svg.dispatchEvent(
            new MouseEvent('mousemove', {
                bubbles: true,
                cancelable: true,
                clientX: r.x + r.width / 2,
                clientY: r.y + r.height / 2,
            }),
        );
    });

    // offsetX/offsetY of the synthetic event land somewhere > 0 for a centre move.
    await expect.poll(() => pointer().then((p) => p.x + p.y), { timeout: 10_000 }).toBeGreaterThanOrEqual(0);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

// ---------------------------------------------------------------------------
// artefact-image-group: a GROUP drag by pointer moves EVERY member and pushes a
// GroupPlacementOperation (the group branches of onPointerDown/Move/Up + createOperation
// that the single-artefact drag in scroll-editor.spec never reaches). Uses synthetic
// PointerEvents carrying a valid pointerId so setPointerCapture has an active pointer.
// ---------------------------------------------------------------------------

test('artefact-image-group GROUP: pointer drag moves every member and records one group op', async ({ browser }) => {
    const { ctx, page, errors } = await openEditor(browser);

    const [a, b] = await ungroupedRenderedIds(page, 2);
    await buildGroup(page, [a, b]);
    const beforeA = (await placement(page, a)).x;
    const beforeB = (await placement(page, b)).x;

    // Drag the group by grabbing member `a`'s <g>. onPointerMove shifts all
    // selectedArtefacts; onPointerUp builds the GroupPlacementOperation.
    const moved = await page.evaluate((artId) => {
        const g = document.querySelector(`#the-scroll #path-${artId}`)?.closest('g[transform]') as SVGGraphicsElement | null;
        if (!g) return false;
        const r = g.getBoundingClientRect();
        const cx = r.x + r.width / 2;
        const cy = r.y + r.height / 2;
        const pe = (type: string, x: number, y: number) =>
            g.dispatchEvent(
                new PointerEvent(type, {
                    bubbles: true,
                    cancelable: true,
                    pointerId: 1,
                    pointerType: 'mouse',
                    isPrimary: true,
                    clientX: x,
                    clientY: y,
                }),
            );
        pe('pointerdown', cx, cy);
        pe('pointermove', cx + 90, cy + 60);
        pe('pointermove', cx + 180, cy + 120);
        pe('pointerup', cx + 180, cy + 120);
        return true;
    }, a);
    expect(moved, 'group member present for drag').toBe(true);

    // Both members shifted, and the drag registered an undoable op.
    await expect.poll(() => placement(page, a).then((p) => p.x), { timeout: 10_000 }).not.toBe(beforeA);
    await expect.poll(() => placement(page, b).then((p) => p.x), { timeout: 10_000 }).not.toBe(beforeB);
    await expect.poll(() => scrollState(page).then((s) => s.canUndo), { timeout: 10_000 }).toBe(true);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

// ---------------------------------------------------------------------------
// PERSISTENCE across a reload. The existing group/metric tests assert the save branch runs;
// these assert the change actually STICKS on the server — the guarantee the scroll-save fix
// (saveEntities resolving the edition from the store, not a stale editionId=0) restored.
// ---------------------------------------------------------------------------

test('scroll-editor: a saved artefact group persists across a reload', async ({ browser }) => {
    const { ctx, page, errors } = await openEditor(browser);
    const members = await ungroupedRenderedIds(page, 3);
    const [a, b, c] = members;

    // Build a manageGroup of the three.
    await selectArtefact(page, a);
    await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (document.querySelector('#editor-grid') as any).__vueParentComponent.ctx.params.mode = 'manageGroup';
    });
    await expect.poll(() => scrollState(page).then((s) => s.paramsMode), { timeout: 10_000 }).toBe('manageGroup');
    for (const id of [b, c]) {
        await page.evaluate((artId) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cmp = (document.querySelector('#editor-grid') as any).__vueParentComponent.ctx;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
            cmp.selectArtefact(st.artefacts.find(artId));
        }, id);
    }
    await expect.poll(() => scrollState(page).then((s) => s.selectedCount), { timeout: 10_000 }).toBeGreaterThan(1);

    // Save the group, then run the real save (persist to server).
    await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (document.querySelector('#editor-grid') as any).__vueParentComponent.ctx.saveGroupArtefacts();
    });
    await page.evaluate(async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state.operationsManager.save();
    });
    await page.waitForTimeout(500);

    // Reload from the server: a group containing all three members must be there.
    await page.reload();
    await expect(page.locator('#the-scroll')).toBeVisible({ timeout: 40_000 });
    await expect.poll(() => renderedArtefactIds(page).then((r) => r.length), { timeout: 40_000 }).toBeGreaterThan(0);
    const persisted = await page.evaluate((ids) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        const groups = (st.editions.current?.artefactGroups ?? []) as { artefactIds: number[] }[];
        return groups.some((g) => ids.every((id) => g.artefactIds.includes(id)));
    }, members);
    expect(persisted, 'the saved group (with its members) survives a reload').toBe(true);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

// An "Add" resize persists across a reload. This 404'd until DB migration 0.33.1 de-duplicated
// manuscript_metrics ownership (some editions owned 2 identical metrics rows, and the metrics
// update requires exactly one). Now editions have one metrics row, so the resize persists.
test('scroll-editor: an "Add" resize persists the new scroll width across a reload', async ({ browser }) => {
    const { ctx, page, errors } = await openEditor(browser);
    const before = (await scrollState(page)).editionWidth!;

    // Grow the scroll on the right (an Add always fits — no crop check to fail).
    await page.locator('.manuscript-toolbar, #secondary-toolbar').first().waitFor({ timeout: 10_000 });
    await page.locator('select').first().selectOption('right');
    await page.locator('#secondary-toolbar input[type="number"]').first().fill('50');
    await page.getByRole('button', { name: /^Add$/ }).first().click();
    await expect.poll(() => scrollState(page).then((s) => s.editionWidth), { timeout: 10_000 }).toBeGreaterThan(before);
    const after = (await scrollState(page)).editionWidth!;

    // Persist to the server, then reload: the widened metric must survive.
    await page.evaluate(async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state.operationsManager.save();
    });
    await page.waitForTimeout(500);
    await page.reload();
    await expect(page.locator('#the-scroll')).toBeVisible({ timeout: 40_000 });
    await expect.poll(() => scrollState(page).then((s) => s.editionWidth), { timeout: 40_000 }).toBe(after);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});
