import { test, expect, loginToken, authedContext, API } from './fixtures';
import type { Page } from '@playwright/test';

// UI flows for artefact-editor operations that don't depend on the IIIF image canvas:
//  - rotating the artefact (the toolbar drives $state.artefactEditor.params.rotationAngle);
//  - undo/redo of a real edit (create an ROI, then Undo removes it and Redo restores it via the
//    shared operations manager).
// (Zoom is intentionally not covered here: the zoom control's bounds derive from the artefact
// bounding box, which is only known once the IIIF master image loads — unavailable headless.)

let token: string;
test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    await request.dispose();
});
const auth = () => ({ Authorization: `Bearer ${token}` });

async function newEditionArtefact(page: Page): Promise<{ ed: number; artId: number }> {
    const ed = (await (await page.request.post(`${API}/v1/editions/899`, { headers: auth(), data: { name: `ui-artops-${Date.now()}-${Math.floor(Math.random() * 1e6)}` } })).json()).id;
    const arts = (await (await page.request.get(`${API}/v1/editions/${ed}/artefacts`, { headers: auth() })).json()).artefacts;
    const artId = (arts.find((a: { isPlaced: boolean }) => a.isPlaced) ?? arts[0]).id;
    await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto(`/editions/${ed}/artefacts/${artId}`);
    await expect(page.locator('#popover-adjust')).toBeVisible({ timeout: 40_000 });
    return { ed, artId };
}

const rotationAngle = (page: Page) =>
    page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any)?.__vue_app__?.config?.globalProperties?.$state;
        return st?.artefactEditor?.params?.rotationAngle ?? null;
    });

const roiCount = (page: Page) =>
    page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any)?.__vue_app__?.config?.globalProperties?.$state;
        return st?.interpretationRois?.size ?? 0;
    });

test('FLOW: artefact editor rotate changes the rotation angle', async ({ browser }) => {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    await newEditionArtefact(page);

    const before = (await rotationAngle(page))!;
    await page.getByTitle('Right Rotate', { exact: true }).click();
    await expect.poll(async () => (await rotationAngle(page))!, { timeout: 5_000 }).not.toBe(before);

    await ctx.close();
});

test('FLOW: undo and redo an ROI creation reverses and replays it', async ({ browser }) => {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    await newEditionArtefact(page);

    const boxBtn = page.getByTitle('Box', { exact: true });
    const signs = page.locator('.text-sign');

    await test.step('prepare: load a fragment, select a drawable sign, enter Box mode', async () => {
        await page.locator('#load-fragment input.select-text').fill('frg. 1');
        await expect(signs.first()).toBeVisible({ timeout: 20_000 });
        const n = Math.min(await signs.count(), 6);
        for (let i = 0; i < n; i++) {
            await signs.nth(i).click();
            if (await boxBtn.isEnabled()) break;
        }
        await expect(boxBtn).toBeEnabled({ timeout: 10_000 });
        await boxBtn.click();
    });

    // Helper run inside the page: locate the artefact-editor component (owner of onNewPolygon /
    // its operationsManager) and invoke `fn(comp, $state)`.
    const onEditor = (fn: string) => page.evaluate((body) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cur: any = (document.getElementById('artefact-image') as any)?.__vueParentComponent;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let comp: any;
        while (cur) { if (cur.ctx?.onNewPolygon) { comp = cur.ctx; break; } cur = cur.parent; }
        // eslint-disable-next-line no-new-func
        return new Function('comp', 'st', body)(comp, st);
    }, fn);

    const before = await roiCount(page);
    let canUndoAfterCreate = false;
    await test.step('creating an ROI grows the store and registers an undoable operation', async () => {
        canUndoAfterCreate = await onEditor(`
            const Polygon = st.interpretationRois.getItems().next().value.shape.constructor;
            comp.onNewPolygon(new Polygon('M0 0 L400 0 L400 400 L0 400 Z'));
            return !!comp.operationsManager.canUndo;
        `);
        await expect.poll(async () => roiCount(page), { timeout: 10_000 }).toBe(before + 1);
        expect(canUndoAfterCreate).toBe(true);
    });

    await test.step('Undo reverses it — the ROI is removed', async () => {
        await onEditor('comp.operationsManager.undo();');
        await expect.poll(async () => roiCount(page), { timeout: 10_000 }).toBe(before);
    });

    await test.step('Redo replays it — the ROI is restored', async () => {
        await onEditor('comp.operationsManager.redo();');
        await expect.poll(async () => roiCount(page), { timeout: 10_000 }).toBe(before + 1);
    });

    await ctx.close();
});
