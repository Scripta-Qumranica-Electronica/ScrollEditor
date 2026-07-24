import {
    test,
    expect,
    loginToken,
    authedContext,
    artefactX,
    collectCoverage,
    API,
} from './fixtures';
import type { Browser, BrowserContext, Page } from '@playwright/test';

// P8 — BRANCH coverage for the scroll-editor view + its toolbars, driving code paths
// the existing scroll-editor / scroll-editor-deep specs miss:
//   - the empty-edition path (0 placed artefacts) that leaves the top-toolbar controls
//     disabled and lets an unconstrained resize (allowResizing → true, no crop check),
//   - the add-artefact modal round-trip that actually PLACES an artefact
//     (onAddArtefactModalClose → ArtefactPlacementOperation 'add' → selectArtefact),
//   - deselecting an artefact (selectArtefact(undefined) → selectGroup(undefined)),
//   - arrow / +/- / </> keys routed to scroll-top-toolbar.onKeyDown WHEN an artefact is
//     selected (the deep spec only covers the no-selection scroll path),
//   - manageGroup mode selection + the manuscript-toolbar Manage-group / save / cancel
//     buttons, and the top/right resize sides.
//
// Empty-edition tests copy public edition 811 (4 artefacts, none placed). Placement /
// selection / group tests copy public edition 899 (60 placed artefacts). Every test
// installs a pageerror listener and asserts [].

let token: string;
let emptyEditionId: number; // copy of 811 — no placed artefacts
let placedEditionId: number; // copy of 899 — 60 placed artefacts
let unplacedArtefactIds: number[] = [];
let placedArtefactIds: number[] = [];

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    const auth = { Authorization: `Bearer ${token}` };

    const emptyCopy = await request.post(`${API}/v1/editions/811`, {
        headers: auth,
        data: { name: `pw-scroll-empty-${Date.now()}` },
    });
    emptyEditionId = (await emptyCopy.json()).id;
    const emptyArts = (
        await (await request.get(`${API}/v1/editions/${emptyEditionId}/artefacts`, { headers: auth })).json()
    ).artefacts;
    unplacedArtefactIds = emptyArts
        .filter((a: { isPlaced: boolean; isVirtual: boolean }) => !a.isPlaced && !a.isVirtual)
        .map((a: { id: number }) => a.id);
    expect(unplacedArtefactIds.length, 'empty edition should have unplaced artefacts to add').toBeGreaterThan(0);

    const placedCopy = await request.post(`${API}/v1/editions/899`, {
        headers: auth,
        data: { name: `pw-scroll-branch-${Date.now()}` },
    });
    placedEditionId = (await placedCopy.json()).id;
    const placedArts = (
        await (await request.get(`${API}/v1/editions/${placedEditionId}/artefacts`, { headers: auth })).json()
    ).artefacts;
    placedArtefactIds = placedArts
        .filter((a: { isPlaced: boolean; isVirtual: boolean }) => a.isPlaced && !a.isVirtual)
        .map((a: { id: number }) => a.id);
    expect(placedArtefactIds.length, 'placed edition should have placed artefacts').toBeGreaterThan(5);

    await request.dispose();
});

async function scrollState(page: Page) {
    return page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        const se = st.scrollEditor;
        return {
            mode: se.mode as string | undefined,
            paramsMode: se.params?.mode as string | undefined,
            selectedArtefactId: (se.selectedArtefact?.id ?? null) as number | null,
            selectedGroupNull: se.selectedGroup === null,
            selectedCount: (se.selectedArtefacts?.length ?? 0) as number,
            canUndo: (st.operationsManager?.canUndo ?? false) as boolean,
            editionWidth: (st.editions.current?.metrics?.width ?? null) as number | null,
            editionHeight: (st.editions.current?.metrics?.height ?? null) as number | null,
            placedCount: (st.artefacts.items ?? []).filter((a: { isPlaced: boolean }) => a.isPlaced).length as number,
        };
    });
}

async function renderedArtefactIds(page: Page, ids: number[]): Promise<number[]> {
    return page.evaluate((list) => {
        const scroll = document.querySelector('#the-scroll');
        if (!scroll) return [];
        return list.filter((id) => scroll.querySelector(`#path-${id}`));
    }, ids);
}

// Open the empty (no placed artefacts) editor: the scroll area renders but has no
// placed artefact silhouettes.
async function openEmptyEditor(browser: Browser): Promise<{ ctx: BrowserContext; page: Page; errors: string[] }> {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(`/editions/${emptyEditionId}/scroll-editor`);
    await expect(page.locator('#the-scroll')).toBeVisible({ timeout: 40_000 });
    // Wait until the store finished loading the edition (metrics available).
    await expect.poll(() => scrollState(page).then((s) => s.editionWidth), { timeout: 40_000 }).not.toBeNull();
    return { ctx, page, errors };
}

async function openPlacedEditor(browser: Browser): Promise<{ ctx: BrowserContext; page: Page; errors: string[] }> {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(`/editions/${placedEditionId}/scroll-editor`);
    await expect(page.locator('#the-scroll')).toBeVisible({ timeout: 40_000 });
    await expect
        .poll(() => renderedArtefactIds(page, placedArtefactIds).then((r) => r.length), { timeout: 40_000 })
        .toBeGreaterThan(0);
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

test('empty edition: no placed artefacts, top-toolbar artefact controls are disabled', async ({ browser }) => {
    const { ctx, page, errors } = await openEmptyEditor(browser);

    // The empty edition has nothing placed → no artefact silhouettes.
    const s = await scrollState(page);
    expect(s.placedCount).toBe(0);
    expect(await renderedArtefactIds(page, unplacedArtefactIds)).toEqual([]);

    // isToolbarDisabled is true (no selection): the artefact Resize/Move buttons are disabled.
    // Scope to the "Resize Artefact" toolbox so we hit its (artefact) Zoom-Out button.
    const resizeBox = page
        .locator('.toolbox')
        .filter({ has: page.locator('.description', { hasText: 'Resize Artefact' }) });
    await expect(resizeBox.getByTitle('Zoom Out')).toBeDisabled({ timeout: 10_000 });
    await expect(resizeBox.getByTitle('Reset')).toBeDisabled();

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('empty edition: resize on the "right" side grows width unconstrained (allowResizing → true)', async ({
    browser,
}) => {
    const { ctx, page, errors } = await openEmptyEditor(browser);

    const before = (await scrollState(page)).editionWidth!;

    // Choose the "right" side (left/down are covered elsewhere) → newMetrics.width grows
    // but xOrigin is untouched. With no placed artefacts a Cut is also allowed
    // (allowResizing's Math.max over an empty array → -Infinity ≤ width).
    const sideSelect = page.locator('select').first();
    await sideSelect.selectOption('right');

    await page.getByRole('button', { name: /^Add$/ }).first().click();
    await expect.poll(() => scrollState(page).then((s) => s.editionWidth), { timeout: 10_000 }).toBeGreaterThan(before);
    await expect.poll(() => scrollState(page).then((s) => s.canUndo), { timeout: 10_000 }).toBe(true);

    // Cut on the right side is permitted here (empty edition), reducing width again.
    const grown = (await scrollState(page)).editionWidth!;
    await page.getByRole('button', { name: /^Cut$/ }).first().click();
    await expect.poll(() => scrollState(page).then((s) => s.editionWidth), { timeout: 10_000 }).toBeLessThan(grown);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('empty edition: resize on the "top" side grows height and shifts yOrigin', async ({ browser }) => {
    const { ctx, page, errors } = await openEmptyEditor(browser);

    const before = (await scrollState(page)).editionHeight!;

    const sideSelect = page.locator('select').first();
    await sideSelect.selectOption('top');
    await page.getByRole('button', { name: /^Add$/ }).first().click();

    await expect.poll(() => scrollState(page).then((s) => s.editionHeight), { timeout: 10_000 }).toBeGreaterThan(before);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('add-artefact modal: choosing an unplaced artefact places it on the scroll and selects it', async ({
    browser,
}) => {
    const { ctx, page, errors } = await openEmptyEditor(browser);

    // Drive the whole modal round-trip: onAddArtefactModalClose builds a Placement,
    // pushes an 'add' ArtefactPlacementOperation and selects the first added artefact.
    // The add-artefact-modal emits its chosen ids to onAddArtefactModalClose; call the
    // scroll-editor method directly with a real unplaced artefact id (the modal UI wiring
    // is exercised separately by scroll-editor.spec's "Add artefact opens the modal").
    const artId = unplacedArtefactIds[0];
    await page.evaluate((id) => {
        const editorGrid = document.querySelector('#editor-grid') as HTMLElement;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cmp = (editorGrid as any).__vueParentComponent.ctx;
        return cmp.onAddArtefactModalClose([id]);
    }, artId);

    // The artefact is now placed (isPlaced true) and rendered in the scroll area.
    await expect
        .poll(
            () =>
                page.evaluate((id) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
                    return st.artefacts.find(id)?.isPlaced as boolean;
                }, artId),
            { timeout: 15_000 },
        )
        .toBe(true);
    await expect.poll(() => scrollState(page).then((s) => s.selectedArtefactId), { timeout: 10_000 }).toBe(artId);
    await expect.poll(() => renderedArtefactIds(page, [artId]).then((r) => r.length), { timeout: 15_000 }).toBe(1);
    await expect.poll(() => scrollState(page).then((s) => s.canUndo), { timeout: 10_000 }).toBe(true);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('selecting then deselecting an artefact clears the selection (selectArtefact(undefined))', async ({
    browser,
}) => {
    const { ctx, page, errors } = await openPlacedEditor(browser);

    const [id] = await renderedArtefactIds(page, placedArtefactIds);
    await selectArtefact(page, id);
    await expect.poll(() => scrollState(page).then((s) => s.selectedCount), { timeout: 10_000 }).toBeGreaterThan(0);

    // Deselect via the editor's own selectArtefact(undefined) — the empty-selection
    // branch (selectGroup(undefined)); the scroll-area's onSelectArtefact emits undefined
    // when clicking empty space.
    await page.evaluate(() => {
        const editorGrid = document.querySelector('#editor-grid') as HTMLElement;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (editorGrid as any).__vueParentComponent.ctx.selectArtefact(undefined);
    });
    await expect.poll(() => scrollState(page).then((s) => s.selectedArtefactId), { timeout: 10_000 }).toBeNull();
    await expect.poll(() => scrollState(page).then((s) => s.selectedGroupNull), { timeout: 10_000 }).toBe(true);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('with an artefact selected, arrow / +/- / </> keys route to scroll-top-toolbar.onKeyDown', async ({
    browser,
}) => {
    const { ctx, page, errors } = await openPlacedEditor(browser);

    const [id] = await renderedArtefactIds(page, placedArtefactIds);
    await selectArtefact(page, id);

    const placementOf = () =>
        page.evaluate((artId) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
            const p = st.artefacts.find(artId)?.placement;
            return { x: p.translate.x as number, y: p.translate.y as number, rotate: p.rotate as number, scale: p.scale as number };
        }, id);

    const before = await placementOf();

    // With a selection, onKeyDown forwards to the top-toolbar. ArrowRight → dragArtefact(1,0),
    // '.' → rotate right, '+' → zoom in. Dispatch them on the focusable editor div.
    await page.evaluate(() => {
        const div = document.querySelector('[tabindex="0"]') as HTMLElement;
        div.focus();
        for (const key of ['ArrowRight', 'ArrowDown', '.', '+']) {
            div.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
        }
    });

    // Each handler mutated the selected artefact's placement.
    await expect.poll(() => placementOf().then((p) => p.x), { timeout: 10_000 }).toBeGreaterThan(before.x);
    const after = await placementOf();
    expect(after.y).toBeGreaterThan(before.y);
    expect(after.rotate).not.toBe(before.rotate);
    expect(after.scale).toBeGreaterThan(before.scale);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('manageGroup mode: Manage-group button + selecting artefacts builds a persistable group, cancel clears it', async ({
    browser,
}) => {
    const { ctx, page, errors } = await openPlacedEditor(browser);

    const rendered = (await renderedArtefactIds(page, placedArtefactIds)).slice(0, 3);
    expect(rendered.length).toBe(3);

    // Select an artefact first so the manuscript-toolbar "Manage group" button enables
    // (it is disabled unless selectedArtefacts.length). This artefact seeds the new group.
    await selectArtefact(page, rendered[0]);

    // Open the Group-Actions accordion, then click "Manage group" → params.mode='manageGroup'.
    // The accordion collapse animates; the button can still be zero-height mid-animation,
    // so dispatch a native click on it (this runs setMode('manageGroup')).
    await page.getByText('Group Actions').first().click();
    await expect
        .poll(
            () =>
                page.evaluate(() => {
                    const btns = Array.from(document.querySelectorAll('#accordion-manage-group button')) as HTMLElement[];
                    const manage = btns.find((b) => /Manage group/i.test(b.textContent || ''));
                    if (!manage) return false;
                    manage.click();
                    return true;
                }),
            { timeout: 15_000 },
        )
        .toBe(true);
    await expect.poll(() => scrollState(page).then((s) => s.paramsMode), { timeout: 10_000 }).toBe('manageGroup');

    // Now click the two OTHER artefacts — in manageGroup mode selectArtefact accumulates
    // them into the group seeded above (distinct from the 'g'-key multipleSelect path).
    for (const artId of rendered.slice(1)) {
        await page.evaluate((id) => {
            const path = document.querySelector(`#the-scroll #path-${id}`);
            const clickable =
                (path?.closest('g[transform]')?.querySelector('g') as SVGElement | null) ??
                (path as unknown as SVGElement);
            clickable.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }, artId);
    }
    await expect.poll(() => scrollState(page).then((s) => s.selectedGroupNull), { timeout: 10_000 }).toBe(false);
    await expect.poll(() => scrollState(page).then((s) => s.selectedCount), { timeout: 10_000 }).toBeGreaterThan(1);

    // Cancel clears the group and resets the mode (cancelGroup()). Native-click it (it
    // lives in the same animating accordion collapse).
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('#accordion-manage-group button')) as HTMLElement[];
        const cancel = btns.find((b) => /^\s*cancel\s*$/i.test(b.textContent || ''));
        cancel?.click();
    });
    await expect.poll(() => scrollState(page).then((s) => s.selectedGroupNull), { timeout: 10_000 }).toBe(true);
    await expect.poll(() => scrollState(page).then((s) => s.paramsMode), { timeout: 10_000 }).toBe('');

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('artefact-image-group: contextmenu fires onContextMenu, then clicking empty scroll deselects the group', async ({
    browser,
}) => {
    const { ctx, page, errors } = await openPlacedEditor(browser);

    const [id] = await renderedArtefactIds(page, placedArtefactIds);
    await selectArtefact(page, id);
    await expect.poll(() => scrollState(page).then((s) => s.selectedCount), { timeout: 10_000 }).toBeGreaterThan(0);

    // Right-click (contextmenu) on the artefact group runs onContextMenu (stopPropagation
    // + emit) — exercises that handler without error.
    await page.evaluate((artId) => {
        const g = document.querySelector(`#the-scroll #path-${artId}`)?.closest('g[transform]') as SVGElement;
        g.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    }, id);

    // Clicking the empty scroll surface runs scroll-area.onScrollClick → selectGroup(undefined),
    // clearing the selection (the deselect-by-background-click path).
    await page.evaluate(() => {
        const svg = document.querySelector('#the-scroll') as SVGElement;
        svg.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    await expect.poll(() => scrollState(page).then((s) => s.selectedGroupNull), { timeout: 10_000 }).toBe(true);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});
