import { test, expect, loginToken, authedContext, collectCoverage, API } from './fixtures';
import type { Browser, BrowserContext, Page } from '@playwright/test';

// Branch coverage for scroll-editor / navigation components the existing specs miss:
//  - add-artefact-modal (58%): open, search, select (renders the artefact image),
//    the Recto/Verso check-all-side buttons, Clear (uncheckAll) and Add (closeModal
//    emitting the checked ids). Driven on a copy of 811, which has 4 non-placed
//    artefacts (2 recto / 2 verso).
//  - Navbar (68%): the FAQ / EULA / Citation dropdown modals and the goPrivate /
//    goPublic navigation items.
//  - boundary-drawer (68%): BOX mode (before-corner1 -> before-corner2 -> checkPolygon)
//    and the Escape-key cancelOperation branch — the existing polygon test only
//    covers polygon mode.

const SCROLL_SOURCE = 811; // 4 non-placed artefacts, 2 recto + 2 verso

let token: string;

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    await request.dispose();
});

const authHeader = () => ({ Authorization: `Bearer ${token}` });

async function createEdition(ctx: BrowserContext, source: number, name: string): Promise<number> {
    const resp = await ctx.request.post(`${API}/v1/editions/${source}`, { headers: authHeader(), data: { name } });
    expect(resp.ok(), 'edition copy should succeed').toBeTruthy();
    return (await resp.json()).id;
}

async function deleteEdition(ctx: BrowserContext, id: number): Promise<void> {
    await ctx.request
        .delete(`${API}/v1/editions/${id}?optional=archiveForAllEditors`, { headers: authHeader() })
        .catch(() => undefined);
}

function trackErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    return errors;
}

// -------------------------------------------------------------------------
// add-artefact-modal
// -------------------------------------------------------------------------

test('add-artefact-modal: search, select an artefact, Recto/Verso check-all, Clear and Add', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const ed = await createEdition(context, SCROLL_SOURCE, `pw-addart-${Date.now()}`);
    const page = await context.newPage();
    await page.setViewportSize({ width: 1400, height: 900 });
    const errors = trackErrors(page);

    try {
        await page.goto(`/editions/${ed}/scroll-editor/`);
        await expect(page.locator('#the-scroll')).toBeVisible({ timeout: 40_000 });

        // Open the modal via the manuscript-toolbar handler (its @click is bound to it).
        await expect
            .poll(
                () =>
                    page.evaluate(() => {
                        const el = document.querySelector('#secondary-toolbar') || document.querySelector('.manuscript-toolbar') || document.body;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        let cur: any = (el as any)?.__vueParentComponent;
                        while (cur && (!cur.ctx || typeof cur.ctx.openAddArtefactModal !== 'function')) cur = cur.parent;
                        if (!cur) {
                            // Fall back to the mitt modal-bus by walking to any component that can emit it:
                            // dispatch through the global app tree.
                            return false;
                        }
                        cur.ctx.openAddArtefactModal();
                        return true;
                    }),
                { timeout: 15_000 }
            )
            .toBe(true);

        const modal = page.locator('#addArtefactModal');
        await expect(modal).toBeVisible({ timeout: 15_000 });

        // The non-placed artefacts render as checkbox rows (name - side). Wait for them.
        const rows = modal.locator('#cheked-artefact > div');
        await expect.poll(() => rows.count(), { timeout: 20_000 }).toBeGreaterThan(0);
        const totalRows = await rows.count();

        // Selecting a row (selectArtefact) loads its artefact-image on the right.
        await rows.first().click();
        await expect(modal.locator('.selected')).toHaveCount(1, { timeout: 10_000 });

        // Recto check-all-side selects every non-placed recto artefact (checkedAllSide).
        await modal.getByRole('button', { name: 'Recto', exact: true }).click();
        // The Add button enables once at least one artefact is checked.
        const addBtn = modal.getByRole('button', { name: 'Add', exact: true });
        await expect(addBtn).toBeEnabled({ timeout: 10_000 });

        // Verso check-all-side swaps the checked set to the verso artefacts.
        await modal.getByRole('button', { name: 'Verso', exact: true }).click();
        await expect(addBtn).toBeEnabled({ timeout: 10_000 });

        // Typing in the search filter narrows the rows (searchValue -> filteredArtefacts).
        const firstName = (await rows.first().innerText()).trim().split(' - ')[0];
        await modal.locator('#searchValue').fill(firstName.slice(0, 3));
        await expect.poll(() => rows.count(), { timeout: 10_000 }).toBeLessThanOrEqual(totalRows);

        // Clear (uncheckAll) resets the search and unchecks everything -> Add disables.
        await modal.getByRole('button', { name: 'Clear', exact: true }).click();
        await expect(modal.locator('#searchValue')).toHaveValue('', { timeout: 10_000 });
        await expect(addBtn).toBeDisabled({ timeout: 10_000 });

        // Re-check recto, then Add (closeModal) emits the ids and hides the modal.
        await modal.getByRole('button', { name: 'Recto', exact: true }).click();
        await expect(addBtn).toBeEnabled({ timeout: 10_000 });
        await addBtn.click();
        await expect(modal).toBeHidden({ timeout: 10_000 });

        expect(errors, `page errors: ${errors.join(' | ')}`).toEqual([]);
    } finally {
        await collectCoverage(context);
        await deleteEdition(context, ed);
        await context.close();
    }
});

// -------------------------------------------------------------------------
// Navbar — FAQ / EULA / Citation modals + goPrivate / goPublic
// -------------------------------------------------------------------------

test('Navbar: FAQ, EULA and Citation modals open, and goPrivate/goPublic navigate', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    await page.setViewportSize({ width: 1400, height: 900 });
    const errors = trackErrors(page);

    try {
        await page.goto('/home/private');
        await expect(page.getByText(/currently working on/i)).toBeVisible({ timeout: 20_000 });

        // Drive the Navbar's modal openers on its instance (the hamburger dropdown items
        // are @click-bound to these; the FA icons/tooltips overlap the click targets).
        const callNav = (method: string) =>
            page.evaluate((m) => {
                const el = document.querySelector('#main-nav-bar');
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let cur: any = (el as any)?.__vueParentComponent;
                while (cur && (!cur.ctx || typeof cur.ctx[m] !== 'function')) cur = cur.parent;
                cur?.ctx?.[m]();
            }, method);

        // These modals are ok-only (custom header slot, no × button); dismiss via the
        // footer OK button, falling back to the header × if present.
        const openAndClose = async (method: string) => {
            await callNav(method);
            const shown = page.locator('.modal.show').first();
            await expect(shown).toBeVisible({ timeout: 10_000 });
            const ok = shown.getByRole('button', { name: /^ok$/i });
            if (await ok.count()) await ok.first().click();
            else await shown.locator('.btn-close').first().click();
            await expect(page.locator('.modal.show')).toHaveCount(0, { timeout: 10_000 });
        };

        await openAndClose('showFAQModal'); // FAQ (faqModal.show())
        await openAndClose('showEulaModal'); // EULA
        await openAndClose('showCitation'); // Citation

        // goPublic / goPrivate navigate the router.
        await callNav('goPublic');
        await page.waitForURL(/\/home\/public/, { timeout: 15_000 });
        await callNav('goPrivate');
        await page.waitForURL(/\/home\/private/, { timeout: 15_000 });

        expect(errors, `page errors: ${errors.join(' | ')}`).toEqual([]);
    } finally {
        await collectCoverage(context);
        await context.close();
    }
});

// -------------------------------------------------------------------------
// boundary-drawer — BOX mode + Escape cancel
// -------------------------------------------------------------------------

async function openArtefactEditorWithDrawing(browser: Browser): Promise<{ ctx: BrowserContext; page: Page; errors: string[]; ed: number }> {
    const ctx = await authedContext(browser, token);
    const ed = await createEdition(ctx, SCROLL_SOURCE, `pw-boxdraw-${Date.now()}`);
    const page = await ctx.newPage();
    await page.setViewportSize({ width: 1400, height: 900 });
    const errors = trackErrors(page);

    const arts = await (await ctx.request.get(`${API}/v1/editions/${ed}/artefacts`, { headers: authHeader() })).json();
    const artId = arts.artefacts[0].id;
    await page.goto(`/editions/${ed}/artefacts/${artId}`);
    await expect(page.locator('#artefact-image svg').first()).toBeVisible({ timeout: 40_000 });
    await expect(page.locator('#text-side .text-sign').first()).toBeVisible({ timeout: 40_000 });

    // Select signs until drawing is enabled (a non-reconstructed sign must be selected).
    const signs = page.locator('#text-side .text-sign');
    const count = await signs.count();
    const drawingEnabled = () =>
        page.evaluate(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            () => !!(document.querySelector('#artefact-grid') as any)?.__vueParentComponent?.ctx?.isDrawingEnabled
        );
    for (let i = 0; i < Math.min(count, 20); i++) {
        await signs.nth(i).click();
        if (await drawingEnabled()) break;
    }
    expect(await drawingEnabled(), 'a selectable non-reconstructed sign should exist').toBe(true);

    return { ctx, page, errors, ed };
}

test('boundary-drawer: drawing a BOX creates an ROI operation (box internalMode path)', async ({ browser }) => {
    const { ctx, page, errors, ed } = await openArtefactEditorWithDrawing(browser);

    try {
        // Enter BOX mode (onModeClick('box') — the pen/box toolbar buttons are overlapped).
        await page.evaluate(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (document.querySelector('#artefact-grid') as any).__vueParentComponent.ctx.onModeClick('box');
        });
        const surface = page.locator('#artefact-image svg .draw-second-corner, #artefact-image svg .draw-first-corner').first();
        await expect(surface).toBeVisible({ timeout: 10_000 });

        const opsBefore = await page.evaluate(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            () => (document.querySelector('#artefact-grid') as any).__vueParentComponent.ctx.operationsManager.undoStack.length as number
        );

        // Box mode: pointerdown (before-corner1 -> before-corner2), pointermove builds
        // the 4-corner box (closedPolygon=true), pointerup -> checkPolygon -> new ROI.
        await page.evaluate(() => {
            const g = document.querySelector('#artefact-image svg g[pointer-events="all"]') as SVGElement;
            const rect = g.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const fire = (type: string, x: number, y: number) =>
                g.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, bubbles: true, cancelable: true }));
            fire('pointerdown', cx - 60, cy - 45);
            fire('pointermove', cx - 20, cy - 20);
            fire('pointermove', cx + 60, cy + 45);
            fire('pointerup', cx + 60, cy + 45);
        });

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

        expect(errors, `page errors: ${errors.join(' | ')}`).toEqual([]);
    } finally {
        await collectCoverage(ctx);
        await deleteEdition(ctx, ed);
        await ctx.close();
    }
});

test('boundary-drawer: Escape during a polygon cancels the in-progress drawing', async ({ browser }) => {
    const { ctx, page, errors, ed } = await openArtefactEditorWithDrawing(browser);

    try {
        await page.evaluate(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (document.querySelector('#artefact-grid') as any).__vueParentComponent.ctx.onModeClick('polygon');
        });
        await expect(page.locator('#artefact-image svg .draw-boundary').first()).toBeVisible({ timeout: 10_000 });

        // Begin a polygon, then send Escape -> keyPress() -> cancelOperation() clears
        // polygonPoints so no ROI is created (the pointer sequence is abandoned).
        const opsBefore = await page.evaluate(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            () => (document.querySelector('#artefact-grid') as any).__vueParentComponent.ctx.operationsManager.undoStack.length as number
        );

        const cleared = await page.evaluate(() => {
            const g = document.querySelector('#artefact-image svg g[pointer-events="all"]') as SVGElement;
            const rect = g.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const fire = (type: string, x: number, y: number) =>
                g.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, bubbles: true, cancelable: true }));
            fire('pointerdown', cx - 40, cy - 30);
            fire('pointermove', cx + 40, cy - 30);
            fire('pointermove', cx + 40, cy + 30);
            // Escape mid-draw -> keyPress cancels.
            g.dispatchEvent(new KeyboardEvent('keypress', { key: 'Escape', bubbles: true, cancelable: true }));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let cur: any = (g as any).__vueParentComponent;
            while (cur && !(cur.ctx && Array.isArray(cur.ctx.polygonPoints))) cur = cur.parent;
            return cur ? cur.ctx.polygonPoints.length : -1;
        });
        // After Escape, the in-progress polygon points are cleared.
        expect(cleared).toBe(0);

        // No ROI operation was pushed by the abandoned drawing.
        const opsAfter = await page.evaluate(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            () => (document.querySelector('#artefact-grid') as any).__vueParentComponent.ctx.operationsManager.undoStack.length as number
        );
        expect(opsAfter).toBe(opsBefore);

        expect(errors, `page errors: ${errors.join(' | ')}`).toEqual([]);
    } finally {
        await collectCoverage(ctx);
        await deleteEdition(ctx, ed);
        await ctx.close();
    }
});
