import { test, expect, loginToken, authedContext, collectCoverage, API } from './fixtures';
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
