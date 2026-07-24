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

// P5 — the SCROLL EDITOR surface. The realtime + editor-controls specs prove the
// data pipeline and the artefact/imaged-object editors; this spec drives the
// scroll-editor view itself and its many sub-components (top toolbar, manuscript
// toolbar, scroll area, scroll map, scroll ruler, artefact silhouettes, add-artefact
// modal, artefact groups, operations manager / undo-redo) through real user gestures
// and asserts store/DOM outcomes.
//
// Everything runs against throwaway copies of public edition 899 (60 real placed
// artefacts) so it is self-contained and never touches shared data.

let token: string;
let editionId: number;
let placedArtefactIds: number[] = [];

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    const auth = { Authorization: `Bearer ${token}` };

    const copy = await request.post(`${API}/v1/editions/899`, {
        headers: auth,
        data: { name: `pw-scroll-editor-${Date.now()}` },
    });
    editionId = (await copy.json()).id;

    const arts = (
        await (
            await request.get(`${API}/v1/editions/${editionId}/artefacts`, { headers: auth })
        ).json()
    ).artefacts;
    placedArtefactIds = arts
        .filter((a: { isPlaced: boolean; isVirtual: boolean }) => a.isPlaced && !a.isVirtual)
        .map((a: { id: number }) => a.id);
    expect(placedArtefactIds.length, 'source edition should have placed artefacts').toBeGreaterThan(5);

    await request.dispose();
});

const route = () => `/editions/${editionId}/scroll-editor`;

// Read the scroll-editor sub-slice of the live app store.
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
        };
    });
}

// Count how many of our placed artefacts are actually rendered in the scroll area.
// NOTE: `#the-scroll` also contains script-glyph <path id="path-<hebrew-char>"> defs,
// so we must query by NUMERIC artefact ids, not a generic `[id^="path-"]`.
async function renderedArtefactIds(page: Page): Promise<number[]> {
    return page.evaluate((ids) => {
        const scroll = document.querySelector('#the-scroll');
        if (!scroll) return [];
        return ids.filter((id) => scroll.querySelector(`#path-${id}`));
    }, placedArtefactIds);
}

// Open an authed scroll-editor page and wait until at least one placed artefact has
// rendered in the scroll area (the editor loads slowly: edition + full-text + masks).
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

// Select a rendered artefact by dispatching a click on its inner <g @click="onSelect">.
async function selectArtefact(page: Page, id: number) {
    await page.evaluate((artId) => {
        const path = document.querySelector(`#the-scroll #path-${artId}`);
        const clickable = (path?.closest('g[transform]')?.querySelector('g') as SVGElement | null) ??
            (path as unknown as SVGElement);
        clickable.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }, id);
    await expect.poll(() => scrollState(page).then((s) => s.selectedArtefactId), { timeout: 10_000 }).toBe(id);
}

test('top toolbar: manuscript Zoom In raises params.zoom and re-scales the scroll area', async ({ browser }) => {
    const { ctx, page, errors } = await openEditor(browser);

    const before = (await scrollState(page)).zoom!;
    await page.getByTitle('Zoom In').first().click();

    await expect.poll(() => scrollState(page).then((s) => s.zoom), { timeout: 10_000 }).toBeGreaterThan(before);
    // The scroll area root <g id="root"> reflects the zoom as scale(...).
    const zoom = (await scrollState(page)).zoom!;
    await expect
        .poll(() => page.evaluate(() => document.querySelector('#root')?.getAttribute('transform')), { timeout: 10_000 })
        .toBe(`scale(${zoom})`);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('top toolbar: manuscript Zoom Out lowers params.zoom', async ({ browser }) => {
    const { ctx, page, errors } = await openEditor(browser);

    // Zoom in twice so there is room to zoom back out.
    await page.getByTitle('Zoom In').first().click();
    await page.getByTitle('Zoom In').first().click();
    const mid = (await scrollState(page)).zoom!;
    await page.getByTitle('Zoom Out').first().click();

    await expect.poll(() => scrollState(page).then((s) => s.zoom), { timeout: 10_000 }).toBeLessThan(mid);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('scroll editor renders the ruler, scroll map and artefact silhouettes', async ({ browser }) => {
    const { ctx, page, errors } = await openEditor(browser);

    // Ruler: horizontal + vertical tick lists exist and have ticks.
    await expect(page.locator('.ruler .ruler-bar-horizontal')).toBeVisible();
    await expect
        .poll(() => page.locator('.ruler .ruler-bar-horizontal li').count(), { timeout: 10_000 })
        .toBeGreaterThan(0);
    await expect
        .poll(() => page.locator('.ruler .ruler-bar-vertical li').count(), { timeout: 10_000 })
        .toBeGreaterThan(0);

    // Scroll map: SVG present with silhouette paths (one per placed artefact).
    await expect(page.locator('#scroll-map svg')).toBeVisible({ timeout: 10_000 });
    await expect
        .poll(() => page.locator('#scroll-map svg path.sillhouette').count(), { timeout: 10_000 })
        .toBeGreaterThan(0);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('selecting an artefact in the scroll area updates selectedArtefact', async ({ browser }) => {
    const { ctx, page, errors } = await openEditor(browser);

    const [id] = await renderedArtefactIds(page);
    expect(id, 'a placed artefact should be rendered').toBeDefined();
    await selectArtefact(page, id);

    // A selection enables the artefact-resize/rotate toolbar controls.
    await expect.poll(() => scrollState(page).then((s) => s.selectedCount), { timeout: 10_000 }).toBeGreaterThan(0);
    // Its rendered <g> gains a `path.selected` overlay.
    await expect
        .poll(
            () =>
                page.evaluate(
                    (artId) => !!document.querySelector(`#the-scroll #path-${artId}`)?.closest('g[transform]')?.querySelector('path.selected'),
                    id,
                ),
            { timeout: 10_000 },
        )
        .toBe(true);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('top toolbar: with an artefact selected, Rotate Right changes its rendered transform', async ({ browser }) => {
    const { ctx, page, errors } = await openEditor(browser);

    const [id] = await renderedArtefactIds(page);
    await selectArtefact(page, id);

    const before = await artefactTransform(page, id);
    await page.getByTitle('Rotate Right').first().click();

    // The placement rotation changed, so the rendered <g transform> differs.
    await expect.poll(() => artefactTransform(page, id), { timeout: 10_000 }).not.toBe(before);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('top toolbar: Move Right shifts the selected artefact placement.x', async ({ browser }) => {
    const { ctx, page, errors } = await openEditor(browser);

    const [id] = await renderedArtefactIds(page);
    await selectArtefact(page, id);

    const before = await artefactX(page, id);
    await page.getByTitle('Right', { exact: true }).first().click();

    await expect.poll(() => artefactX(page, id), { timeout: 10_000 }).not.toBe(before);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('manuscript toolbar: resize scroll "Add" grows the edition and enables undo, which reverts it', async ({ browser }) => {
    const { ctx, page, errors } = await openEditor(browser);

    const before = (await scrollState(page)).editionWidth!;
    // Side defaults to "left", metricsInput=1, so "Add" grows the edition width.
    await page.getByRole('button', { name: /^Add$/ }).first().click();

    await expect.poll(() => scrollState(page).then((s) => s.editionWidth), { timeout: 10_000 }).toBeGreaterThan(before);
    // The operation reached the operations manager (undo-redo-toolbox now enabled).
    await expect.poll(() => scrollState(page).then((s) => s.canUndo), { timeout: 10_000 }).toBe(true);

    // Undo reverts the metric change. The top toolbar's Undo button can be overlaid
    // by the now-wider scroll container, so drive the operations manager it wraps.
    await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state.operationsManager.undo();
    });
    await expect.poll(() => scrollState(page).then((s) => s.editionWidth), { timeout: 10_000 }).toBe(before);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('manuscript toolbar: Add artefact opens the choose-artefacts modal', async ({ browser }) => {
    const { ctx, page, errors } = await openEditor(browser);

    await page.getByRole('button', { name: /add artefact/i }).first().click();

    // The modal titled "Choose Artefacts" appears with its search box + side buttons.
    await expect(page.getByText('Choose Artefacts')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#searchValue')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /^Recto$/ })).toBeVisible();

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('dragging a selected artefact by pointer moves its placement', async ({ browser }) => {
    const { ctx, page, errors } = await openEditor(browser);

    const [id] = await renderedArtefactIds(page);
    await selectArtefact(page, id);
    const before = await artefactX(page, id);

    // Drive a native pointerdown -> pointermove -> pointerup drag on the artefact
    // group (the component listens for PointerEvents with a stable pointerId).
    const moved = await page.evaluate((artId) => {
        const g = document.querySelector(`#the-scroll #path-${artId}`)?.closest('g[transform]') as SVGGraphicsElement | null;
        if (!g) return false;
        const r = g.getBoundingClientRect();
        const cx = r.x + r.width / 2;
        const cy = r.y + r.height / 2;
        const pe = (type: string, x: number, y: number) =>
            new PointerEvent(type, {
                bubbles: true,
                cancelable: true,
                pointerId: 1,
                pointerType: 'mouse',
                isPrimary: true,
                clientX: x,
                clientY: y,
            });
        g.dispatchEvent(pe('pointerdown', cx, cy));
        g.dispatchEvent(pe('pointermove', cx + 80, cy + 50));
        g.dispatchEvent(pe('pointermove', cx + 160, cy + 100));
        g.dispatchEvent(pe('pointerup', cx + 160, cy + 100));
        return true;
    }, id);
    expect(moved, 'artefact group present for drag').toBe(true);

    await expect.poll(() => artefactX(page, id), { timeout: 10_000 }).not.toBe(before);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('multiple-select mode ("g" key) forms a group from two artefact clicks', async ({ browser }) => {
    const { ctx, page, errors } = await openEditor(browser);

    const rendered = (await renderedArtefactIds(page)).slice(0, 2);
    expect(rendered.length, 'need two rendered artefacts for a group').toBe(2);

    // Enter multiple-select mode: a 'g' keypress on the editor sets params.mode.
    // (A held key resets on keyup, so drive the keypress directly and keep it set.)
    await page.evaluate(() => {
        const div = document.querySelector('[tabindex="0"]') as HTMLElement;
        div.focus();
        div.dispatchEvent(new KeyboardEvent('keypress', { key: 'g', bubbles: true }));
    });
    await expect.poll(() => scrollState(page).then((s) => s.paramsMode), { timeout: 10_000 }).toBe('multipleSelect');

    for (const artId of rendered) {
        await page.evaluate((id) => {
            const path = document.querySelector(`#the-scroll #path-${id}`);
            const clickable = (path?.closest('g[transform]')?.querySelector('g') as SVGElement | null) ??
                (path as unknown as SVGElement);
            clickable.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }, artId);
    }

    // A group is now selected containing the clicked artefacts.
    await expect.poll(() => scrollState(page).then((s) => s.selectedGroupNull), { timeout: 10_000 }).toBe(false);
    await expect.poll(() => scrollState(page).then((s) => s.selectedCount), { timeout: 10_000 }).toBeGreaterThan(1);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('scroll map click navigates the scroll area (scrolls the container)', async ({ browser }) => {
    const { ctx, page, errors } = await openEditor(browser);

    // Give the viewport a moment to be computed by the ResizeObserver.
    await expect.poll(() => scrollState(page).then((s) => s.viewportWidth), { timeout: 15_000 }).not.toBeNull();

    const beforeScroll = await page.evaluate(() => {
        const c = document.querySelector('#artefact-container')!;
        return c.scrollLeft + c.scrollTop;
    });

    // Click near the bottom-right of the scroll map to navigate there.
    const map = page.locator('#scroll-map svg');
    const mbox = await map.boundingBox();
    expect(mbox).not.toBeNull();
    await map.click({ position: { x: mbox!.width * 0.8, y: mbox!.height * 0.8 } });

    await expect
        .poll(
            () =>
                page.evaluate(() => {
                    const c = document.querySelector('#artefact-container')!;
                    return c.scrollLeft + c.scrollTop;
                }),
            { timeout: 10_000 },
        )
        .not.toBe(beforeScroll);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});
