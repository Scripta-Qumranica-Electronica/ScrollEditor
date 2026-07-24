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

// P6 — DEEP scroll-editor coverage. The existing scroll-editor.spec proves the
// data pipeline + a handful of gestures; this spec goes wide across the toolbars
// and sub-components that were under-covered: scroll-top-toolbar (mode/zoom/rotate/
// move/mirror/reset/by-inputs), manuscript-toolbar (Display-ROIs switch — now fixed,
// side select + Add/Cut, remove artefact, top/down z-index, Group-Actions accordion),
// the zoomer (ctrl-wheel), artefact-image-group (context menu, drag) and the
// scroll-editor keyboard handling. Every test guards against page errors.
//
// Runs against throwaway copies of public edition 899 (60 placed artefacts).

let token: string;
let editionId: number;
let placedArtefactIds: number[] = [];

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    const auth = { Authorization: `Bearer ${token}` };

    const copy = await request.post(`${API}/v1/editions/899`, {
        headers: auth,
        data: { name: `pw-scroll-deep-${Date.now()}` },
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
            paramsScale: se.params?.scale as number | undefined,
            paramsMove: se.params?.move as number | undefined,
            paramsRotate: se.params?.rotate as number | undefined,
            displayRois: se.displayRois as boolean | undefined,
            selectedArtefactId: (se.selectedArtefact?.id ?? null) as number | null,
            selectedGroupNull: se.selectedGroup === null,
            selectedCount: (se.selectedArtefacts?.length ?? 0) as number,
            canUndo: (st.operationsManager?.canUndo ?? false) as boolean,
            editionWidth: (st.editions.current?.metrics?.width ?? null) as number | null,
            editionHeight: (st.editions.current?.metrics?.height ?? null) as number | null,
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

// Select a rendered artefact by dispatching a click on its inner <g @click="onSelect">.
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

test('scroll-top-toolbar: Material mode button keeps material mode active', async ({ browser }) => {
    const { ctx, page, errors } = await openEditor(browser);

    // The editor boots in material mode. Click the Material toolbox button and
    // assert the store mode stays 'material' (the Text button is disabled).
    await page.getByTitle('Material').first().click();
    await expect.poll(() => scrollState(page).then((s) => s.mode), { timeout: 10_000 }).toBe('material');
    // The Material toolbar-icon-button reflects the pressed state.
    await expect
        .poll(
            () =>
                page.evaluate(() => {
                    const b = Array.from(document.querySelectorAll('button')).find(
                        (x) => x.getAttribute('title') === 'Material',
                    );
                    return b ? b.className.includes('active') || b.getAttribute('aria-pressed') === 'true' : null;
                }),
            { timeout: 10_000 },
        )
        .toBe(true);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('scroll-top-toolbar: Zoom Out artefact then Reset restores placement scale', async ({ browser }) => {
    const { ctx, page, errors } = await openEditor(browser);

    const [id] = await renderedArtefactIds(page);
    await selectArtefact(page, id);

    const scaleOf = () =>
        page.evaluate((artId) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
            return st.artefacts.find(artId)?.placement.scale as number;
        }, id);

    // Scope to the "Resize Artefact" toolbox (the manuscript zoom-toolbox also has a
    // "Zoom Out" title, but no "Reset").
    const resizeBox = page
        .locator('.toolbox')
        .filter({ has: page.locator('.description', { hasText: 'Resize Artefact' }) });

    const before = await scaleOf();
    // "Zoom Out" (artefact) shrinks the placement scale.
    await resizeBox.getByTitle('Zoom Out').click();
    await expect.poll(scaleOf, { timeout: 10_000 }).toBeLessThan(before);

    // Reset returns the scale to 1.
    await resizeBox.getByTitle('Reset').click();
    await expect.poll(scaleOf, { timeout: 10_000 }).toBe(1);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('scroll-top-toolbar: Rotate Left and Mirror change the rendered transform', async ({ browser }) => {
    const { ctx, page, errors } = await openEditor(browser);

    const [id] = await renderedArtefactIds(page);
    await selectArtefact(page, id);

    const beforeRotate = await artefactTransform(page, id);
    await page.getByTitle('Rotate Left').first().click();
    await expect.poll(() => artefactTransform(page, id), { timeout: 10_000 }).not.toBe(beforeRotate);

    // Mirror flips the placement.mirrored flag, again changing the <g transform>.
    const beforeMirror = await artefactTransform(page, id);
    await page.getByTitle('Mirror').first().click();
    await expect.poll(() => artefactTransform(page, id), { timeout: 10_000 }).not.toBe(beforeMirror);
    await expect
        .poll(
            () =>
                page.evaluate((artId) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
                    return st.artefacts.find(artId)?.placement.mirrored as boolean;
                }, id),
            { timeout: 10_000 },
        )
        .toBe(true);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('scroll-top-toolbar: Move Up/Down/Left change placement, and the "By mm" input feeds the jump', async ({
    browser,
}) => {
    const { ctx, page, errors } = await openEditor(browser);

    const [id] = await renderedArtefactIds(page);
    await selectArtefact(page, id);

    const yOf = () =>
        page.evaluate((artId) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
            return st.artefacts.find(artId)?.placement.translate.y as number;
        }, id);

    // Set the move step via the "By mm" input in the Move toolbox, then move down.
    const moveInput = page.locator('.by-input').nth(2); // 0=scale%,1=rotate deg,2=move mm
    await moveInput.fill('3');
    await expect.poll(() => scrollState(page).then((s) => Number(s.paramsMove)), { timeout: 10_000 }).toBe(3);

    const beforeY = await yOf();
    await page.getByTitle('Down', { exact: true }).first().click();
    await expect.poll(yOf, { timeout: 10_000 }).toBeGreaterThan(beforeY);

    const midY = await yOf();
    await page.getByTitle('Up', { exact: true }).first().click();
    await expect.poll(yOf, { timeout: 10_000 }).toBeLessThan(midY);

    // Left shifts x negatively.
    const beforeX = await artefactX(page, id);
    await page.getByTitle('Left', { exact: true }).first().click();
    await expect.poll(() => artefactX(page, id), { timeout: 10_000 }).toBeLessThan(beforeX!);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('manuscript-toolbar: the Display ROIs switch toggles scrollEditor.displayRois (now fixed)', async ({
    browser,
}) => {
    const { ctx, page, errors } = await openEditor(browser);

    // Locate the "Display ROIs" switch by its label text and click the input.
    const roiSwitch = page
        .locator('.custom-control, .form-check, label')
        .filter({ hasText: 'Display ROIs' })
        .locator('input')
        .first();
    // Fallback: bootstrap-vue-next renders b-form-checkbox as <input type=checkbox> next to the label text.
    const roiInput = (await roiSwitch.count())
        ? roiSwitch
        : page.getByText('Display ROIs').locator('xpath=preceding::input[1]');

    await expect.poll(() => scrollState(page).then((s) => s.displayRois), { timeout: 10_000 }).toBeFalsy();

    await roiInput.click({ force: true });
    await expect.poll(() => scrollState(page).then((s) => s.displayRois), { timeout: 10_000 }).toBe(true);

    // Toggling again turns it back off.
    await roiInput.click({ force: true });
    await expect.poll(() => scrollState(page).then((s) => s.displayRois), { timeout: 10_000 }).toBe(false);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('manuscript-toolbar: change side to "down" and Add/Cut adjusts edition height', async ({ browser }) => {
    const { ctx, page, errors } = await openEditor(browser);

    const before = (await scrollState(page)).editionHeight!;

    // The side <b-form-select> in the manuscript toolbar; choose "Down" so resize
    // affects height (default "left" affects width, already covered elsewhere).
    const sideSelect = page.locator('select').first();
    await sideSelect.selectOption('down');

    await page.getByRole('button', { name: /^Add$/ }).first().click();
    await expect.poll(() => scrollState(page).then((s) => s.editionHeight), { timeout: 10_000 }).toBeGreaterThan(before);
    await expect.poll(() => scrollState(page).then((s) => s.canUndo), { timeout: 10_000 }).toBe(true);

    // Cut on the "down" side reduces the height again (allowed since we grew it).
    const grown = (await scrollState(page)).editionHeight!;
    await page.getByRole('button', { name: /^Cut$/ }).first().click();
    await expect.poll(() => scrollState(page).then((s) => s.editionHeight), { timeout: 10_000 }).toBeLessThan(grown);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('manuscript-toolbar: top/down z-index buttons re-order the selected artefact', async ({ browser }) => {
    const { ctx, page, errors } = await openEditor(browser);

    const [id] = await renderedArtefactIds(page);
    await selectArtefact(page, id);

    const zOf = () =>
        page.evaluate((artId) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
            return st.artefacts.find(artId)?.placement.zIndex as number;
        }, id);

    const before = await zOf();
    // The manuscript toolbar's z-order "top"/"down" buttons live in the secondary
    // (right-hand) toolbar. Click "top" -> new zIndex is above every placed artefact.
    await page.locator('#secondary-toolbar').getByRole('button', { name: /^top$/ }).first().click();
    await expect.poll(zOf, { timeout: 10_000 }).toBeGreaterThan(before);

    const top = await zOf();
    await page.locator('#secondary-toolbar').getByRole('button', { name: /^down$/ }).first().click();
    await expect.poll(zOf, { timeout: 10_000 }).toBeLessThan(top);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('manuscript-toolbar: remove artefact unplaces the selected artefact', async ({ browser }) => {
    const { ctx, page, errors } = await openEditor(browser);

    const [id] = await renderedArtefactIds(page);
    await selectArtefact(page, id);

    const isPlaced = () =>
        page.evaluate((artId) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
            return st.artefacts.find(artId)?.isPlaced as boolean;
        }, id);

    expect(await isPlaced()).toBe(true);
    await page.getByRole('button', { name: /^Remove$/i }).first().click();
    await expect.poll(isPlaced, { timeout: 10_000 }).toBe(false);
    await expect.poll(() => scrollState(page).then((s) => s.canUndo), { timeout: 10_000 }).toBe(true);

    // Undo restores it (and re-renders in the scroll area).
    await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state.operationsManager.undo();
    });
    await expect.poll(isPlaced, { timeout: 10_000 }).toBe(true);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('manuscript-toolbar: Group Actions accordion reveals Manage group and the "By%" scale input mirrors the store', async ({
    browser,
}) => {
    const { ctx, page, errors } = await openEditor(browser);

    // Select an artefact so the top-toolbar "By" inputs are enabled.
    const [id] = await renderedArtefactIds(page);
    await selectArtefact(page, id);

    // Click the "Group Actions" accordion toggle (renders the manage-group panel markup).
    await page.getByText('Group Actions').first().click();
    // The accordion panel exists in the DOM (its expanded state animates via bootstrap).
    await expect(page.locator('#accordion-manage-group')).toHaveCount(1);

    // Drive the top-toolbar "By %" scale input (Resize Artefact) and confirm the store follows.
    const scaleInput = page.locator('.by-input').first();
    await scaleInput.fill('25');
    await expect.poll(() => scrollState(page).then((s) => Number(s.paramsScale)), { timeout: 10_000 }).toBe(25);

    // The rotate "By degrees" input likewise updates params.rotate.
    const rotateInput = page.locator('.by-input').nth(1);
    await rotateInput.fill('7');
    await expect.poll(() => scrollState(page).then((s) => Number(s.paramsRotate)), { timeout: 10_000 }).toBe(7);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('zoomer: ctrl-wheel over the scroll area changes params.zoom', async ({ browser }) => {
    const { ctx, page, errors } = await openEditor(browser);

    const before = (await scrollState(page)).zoom!;

    // The zoomer wraps #the-scroll; only ctrl+wheel triggers a zoom (plain wheel scrolls).
    await page.evaluate(() => {
        const target = document.querySelector('#the-scroll') as Element;
        const r = target.getBoundingClientRect();
        for (let i = 0; i < 6; i++) {
            target.dispatchEvent(
                new WheelEvent('wheel', {
                    bubbles: true,
                    cancelable: true,
                    ctrlKey: true,
                    deltaY: -100, // wheel up => zoom in
                    clientX: r.x + r.width / 2,
                    clientY: r.y + r.height / 2,
                }),
            );
        }
    });

    await expect.poll(() => scrollState(page).then((s) => s.zoom), { timeout: 10_000 }).toBeGreaterThan(before);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('scroll-editor: "g" keypress enters multipleSelect and keyup clears the mode', async ({ browser }) => {
    const { ctx, page, errors } = await openEditor(browser);

    // onKeyPress('g') sets params.mode='multipleSelect'; onKeyUp('g') resets it to ''.
    await page.evaluate(() => {
        const div = document.querySelector('[tabindex="0"]') as HTMLElement;
        div.focus();
        div.dispatchEvent(new KeyboardEvent('keypress', { key: 'g', bubbles: true }));
    });
    await expect.poll(() => scrollState(page).then((s) => s.paramsMode), { timeout: 10_000 }).toBe('multipleSelect');

    await page.evaluate(() => {
        const div = document.querySelector('[tabindex="0"]') as HTMLElement;
        div.dispatchEvent(new KeyboardEvent('keyup', { key: 'g', bubbles: true }));
    });
    await expect.poll(() => scrollState(page).then((s) => s.paramsMode), { timeout: 10_000 }).toBe('');

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('scroll-editor: arrow keys scroll the container when nothing is selected', async ({ browser }) => {
    const { ctx, page, errors } = await openEditor(browser);

    // With no artefact selected, onKeyDown scrolls #artefact-container.
    const container = () =>
        page.evaluate(() => {
            const c = document.querySelector('#artefact-container')!;
            return c.scrollTop + c.scrollLeft;
        });

    const before = await container();
    await page.evaluate(() => {
        const div = document.querySelector('[tabindex="0"]') as HTMLElement;
        div.focus();
        for (const key of ['ArrowDown', 'PageDown', 'ArrowRight', 'End']) {
            div.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
        }
    });
    await expect.poll(container, { timeout: 10_000 }).not.toBe(before);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});
