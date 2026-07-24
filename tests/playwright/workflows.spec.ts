import { test, expect, loginToken, authedContext, collectCoverage, API, artefactX, artefactTransform } from './fixtures';
import type { BrowserContext, Page } from '@playwright/test';

// Multi-step USER-JOURNEY tests. Unlike the focused specs (one action each), these chain
// several actions ACROSS views on ONE edition, catching integration bugs that only appear
// when state/navigation carries from one screen to the next (the reactivity/routing class
// of Vue-3 migration bug). Persistence isn't always assertable on a copied dev edition
// (some save endpoints 400), so each step asserts the in-app store/DOM effect + no pageerror.

const SOURCE_EDITION = 899; // has placed artefacts + imaged objects

let token: string;
let ed: number;
let artId: number;
let ioId: string;

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    const auth = { Authorization: `Bearer ${token}` };
    const copyText = await (await request.post(`${API}/v1/editions/${SOURCE_EDITION}`, { headers: auth, data: { name: `pw-flow-${Date.now()}` } })).text();
    ed = Number((copyText.match(/"id":\s*(\d+)/) || [])[1]);
    const arts = (await (await request.get(`${API}/v1/editions/${ed}/artefacts`, { headers: auth })).json()).artefacts;
    const withIo = arts.find((a: { isVirtual: boolean; imagedObjectId?: string }) => !a.isVirtual && a.imagedObjectId);
    artId = withIo.id;
    ioId = withIo.imagedObjectId;
    await request.dispose();
});

function trackErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    return errors;
}

test('journey: open edition -> artefact editor -> create ROI -> imaged-object editor -> rename artefact', async ({ browser }) => {
    const context: BrowserContext = await authedContext(browser, token);
    const page = await context.newPage();
    const errors = trackErrors(page);

    try {
        // 1) Edition -> Artefacts tab: the artefact cards render.
        await page.goto(`/editions/${ed}/artefacts`);
        await expect.poll(() => page.locator('#card').count(), { timeout: 25_000 }).toBeGreaterThan(0);

        // 2) Open the artefact editor for our artefact (the full grid loads).
        await page.goto(`/editions/${ed}/artefacts/${artId}`);
        await expect(page.locator('#text-side .text-sign').first()).toBeVisible({ timeout: 40_000 });

        // 3) Create a ROI: select signs until drawing is enabled, enter polygon mode, draw.
        const signs = page.locator('#text-side .text-sign');
        const drawingEnabled = () =>
            page.evaluate(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                () => !!(document.querySelector('#artefact-grid') as any)?.__vueParentComponent?.ctx?.isDrawingEnabled
            );
        const n = await signs.count();
        let enabled = false;
        for (let i = 0; i < Math.min(n, 20); i++) {
            await signs.nth(i).click();
            if (await drawingEnabled()) {
                enabled = true;
                break;
            }
        }
        expect(enabled, 'a drawable sign should be selectable').toBe(true);

        await page.evaluate(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (document.querySelector('#artefact-grid') as any).__vueParentComponent.ctx.onModeClick('polygon');
        });
        await expect(page.locator('#artefact-image svg .draw-boundary').first()).toBeVisible({ timeout: 10_000 });

        const opsBefore = await page.evaluate(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            () => (document.querySelector('#artefact-grid') as any).__vueParentComponent.ctx.operationsManager.undoStack.length as number
        );
        await page.evaluate(() => {
            const g = document.querySelector('#artefact-image svg .draw-boundary') as SVGElement;
            const r = g.getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            const fire = (type: string, x: number, y: number) =>
                g.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, bubbles: true, cancelable: true }));
            fire('pointerdown', cx - 50, cy - 40);
            fire('pointermove', cx + 50, cy - 40);
            fire('pointermove', cx + 50, cy + 40);
            fire('pointermove', cx - 50, cy + 40);
            fire('pointermove', cx - 48, cy - 38);
            fire('pointerup', cx - 48, cy - 38);
        });
        // The ROI became an operation on the artefact editor's own manager.
        await expect
            .poll(
                () =>
                    page.evaluate(
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        () => (document.querySelector('#artefact-grid') as any).__vueParentComponent.ctx.operationsManager.undoStack.length as number
                    ),
                { timeout: 15_000 }
            )
            .toBeGreaterThan(opsBefore);

        // 4) Switch to the imaged-object editor for the SAME imaged object: our artefact is
        //    listed there (state carried across the view change).
        await page.goto(`/editions/${ed}/imaged-objects/${ioId}`);
        const rows = page.locator('#imaged-object-artefacts .select-art-name');
        await expect(rows.first()).toBeVisible({ timeout: 30_000 });
        await expect.poll(() => rows.count(), { timeout: 10_000 }).toBeGreaterThan(0);

        // 5) Change the artefact: select it, Rename, type a new name, and confirm the store
        //    reflects it (onRename updates the artefact model regardless of server persist).
        await rows.first().click();
        await expect(page.locator('#imaged-object-artefacts .selectedRow')).toHaveCount(1, { timeout: 10_000 });
        await page.locator('#imaged-object-artefacts').getByRole('button', { name: /^Rename$/ }).first().click();
        const input = page.locator('#imaged-object-artefacts input').first();
        await expect(input).toBeVisible({ timeout: 10_000 });
        const newName = `pw-flow-renamed-${Date.now()}`;
        await input.fill(newName);
        await page.locator('#imaged-object-artefacts').getByRole('button', { name: /^(Save|Rename)$/ }).first().click().catch(() => undefined);
        await input.press('Enter').catch(() => undefined);

        await expect
            .poll(
                () =>
                    page.evaluate((name) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
                        return st.artefacts.items.some((a: { name: string }) => a.name === name);
                    }, newName),
                { timeout: 15_000 }
            )
            .toBe(true);

        expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
    } finally {
        await collectCoverage(context);
        await context.close();
    }
});

test('journey: scroll editor -> select placed artefact -> move + rotate -> undo reverts', async ({ browser }) => {
    const context: BrowserContext = await authedContext(browser, token);
    const page = await context.newPage();
    const errors = trackErrors(page);

    // Find a PLACED artefact in our edition (the scroll editor only renders placed ones).
    const arts = (await (await context.request.get(`${API}/v1/editions/${ed}/artefacts`, { headers: { Authorization: `Bearer ${token}` } })).json()).artefacts;
    const placed = arts.find((a: { isPlaced: boolean; id: number }) => a.isPlaced);
    expect(placed, 'edition should have a placed artefact').toBeTruthy();
    const id = placed.id as number;

    try {
        await page.goto(`/editions/${ed}/scroll-editor`);
        // Wait until the artefact is rendered in the scroll area.
        await expect.poll(() => artefactTransform(page, id), { timeout: 40_000 }).not.toBeNull();

        // Select it by clicking its rendered group.
        await page.evaluate((artId) => {
            const path = document.querySelector(`#path-${artId}`);
            const g = (path?.closest('g[transform]')?.querySelector('g') as SVGElement | null) ?? (path as unknown as SVGElement);
            g?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }, id);
        await expect
            .poll(
                () =>
                    page.evaluate(() => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
                        return (st.scrollEditor.selectedArtefact?.id ?? null) as number | null;
                    }),
                { timeout: 10_000 }
            )
            .toBe(id);

        // Move Right -> placement.x changes.
        const x0 = await artefactX(page, id);
        await page.getByTitle('Right', { exact: true }).first().click();
        await expect.poll(() => artefactX(page, id), { timeout: 10_000 }).not.toBe(x0);

        // Rotate Right -> the rendered transform changes.
        const t1 = await artefactTransform(page, id);
        await page.getByTitle('Rotate Right').first().click();
        await expect.poll(() => artefactTransform(page, id), { timeout: 10_000 }).not.toBe(t1);

        // Undo (twice) reverts back toward the original x (the op reached the manager).
        const xAfter = await artefactX(page, id);
        await page.evaluate(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const om = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state.operationsManager;
            om.undo();
            om.undo();
        });
        await expect.poll(() => artefactX(page, id), { timeout: 10_000 }).not.toBe(xAfter);

        expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
    } finally {
        await collectCoverage(context);
        await context.close();
    }
});

test('journey: text-fragment editor -> select a sign -> edit-sign modal -> add-line modal', async ({ browser }) => {
    // A text edition with real signs (1Q9). Copy it fresh.
    const setup = await authedContext(browser, token);
    const auth = { Authorization: `Bearer ${token}` };
    const copyText = await (await setup.request.post(`${API}/v1/editions/811`, { headers: auth, data: { name: `pw-flowtext-${Date.now()}` } })).text();
    const tEd = Number((copyText.match(/"id":\s*(\d+)/) || [])[1]);
    const tfs = (await (await setup.request.get(`${API}/v1/editions/${tEd}/text-fragments`, { headers: auth })).json()).textFragments;
    const tfIdLocal = tfs[0].id;
    await setup.close();

    const context: BrowserContext = await authedContext(browser, token);
    const page = await context.newPage();
    await page.setViewportSize({ width: 1400, height: 900 });
    const errors = trackErrors(page);

    try {
        await page.goto(`/editions/${tEd}/text-fragments/${tfIdLocal}`);
        await expect(page.locator('#text-side .text-sign').first()).toBeVisible({ timeout: 40_000 });

        // Select a sign, then open the edit-sign modal (as the sign context-menu does).
        await page.locator('#text-side .text-sign').first().click();
        await page.evaluate(() => {
            const el = document.querySelector('#text-side .text-sign');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let cur: any = (el as any)?.__vueParentComponent;
            while (cur && (!cur.ctx || typeof cur.ctx.openEditSignModal !== 'function')) cur = cur.parent;
            cur?.ctx?.openEditSignModal();
        });
        const editSign = page.locator('#editSignModal');
        await expect(editSign).toBeVisible({ timeout: 10_000 });
        await expect(editSign.getByRole('button', { name: 'Apply' })).toBeVisible();
        // Cancel out (header close), staying in the editor.
        await editSign.locator('.btn-close').first().click();
        await expect(editSign).toBeHidden({ timeout: 10_000 });

        // Continue the journey: open the add-line modal from the first line's handler
        // (walk up from the .text-line node to the component and call addLineAfter(line)).
        const opened = await page.evaluate(() => {
            const lines = document.querySelectorAll('#text-side .text-line');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let cur: any = (lines[0] as any)?.__vueParentComponent;
            while (cur && (!cur.ctx || typeof cur.ctx.addLineAfter !== 'function')) cur = cur.parent;
            if (!cur) return false;
            cur.ctx.addLineAfter(cur.ctx.line);
            return true;
        });
        expect(opened, 'found a text-line with addLineAfter').toBe(true);
        await expect(page.locator('#addLineModal')).toBeVisible({ timeout: 10_000 });

        expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
    } finally {
        await collectCoverage(context);
        await context.close();
    }
});

test('journey: search -> open an edition result -> browse its artefacts', async ({ browser }) => {
    const context: BrowserContext = await authedContext(browser, token);
    const page = await context.newPage();
    const errors = trackErrors(page);

    try {
        // Search a manuscript designation and open the results accordion.
        await page.goto('/search');
        await page.getByPlaceholder(/Manuscript\/text number/i).fill('1Q9');
        await page.getByRole('button', { name: /^Search$/i }).click();
        const header = page.getByRole('tab', { name: /Editions \(\d+\)/ });
        await expect(header).toBeVisible({ timeout: 20_000 });
        await expect(header).not.toHaveText(/Editions \(0\)/);
        await header.click(); // expand

        // Navigate into the first result edition.
        const firstCard = page.locator('#edition-results-main .card-title, #edition-results-main .edition-card-grid').first();
        await expect(firstCard).toBeVisible({ timeout: 15_000 });
        await firstCard.click();

        // We land on an edition view; browse to its artefacts tab and see cards.
        await page.waitForURL(/\/editions\/\d+/, { timeout: 20_000 });
        const m = page.url().match(/\/editions\/(\d+)/);
        expect(m, 'navigated into an edition').not.toBeNull();
        await page.goto(`/editions/${m![1]}/artefacts`);
        await expect.poll(() => page.locator('#card').count(), { timeout: 25_000 }).toBeGreaterThan(0);

        expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
    } finally {
        await collectCoverage(context);
        await context.close();
    }
});
