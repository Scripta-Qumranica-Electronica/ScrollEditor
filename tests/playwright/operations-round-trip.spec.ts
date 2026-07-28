import { test, expect, loginToken, authedContext, collectCoverage, API } from './fixtures';
import type { Page } from '@playwright/test';

// OPERATIONAL round-trip tests: perform a real editing operation through the app's ACTUAL
// code path (its services + models + state reducers, not a hand-built HTTP call) and then
// assert the RESULT — that the server persisted the correct value and that it survives a
// reload into a fresh app. This is the layer that verifies the manipulation logic, not just
// "the element rendered". Each test spins up a disposable owned edition so it is safe to mutate.

let token: string;
test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    await request.dispose();
});
const auth = () => ({ Authorization: `Bearer ${token}` });

async function newEdition(page: Page): Promise<number> {
    const res = await page.request.post(`${API}/v1/editions/899`, { headers: auth(), data: { name: `op-rt-${Date.now()}-${Math.floor(Math.random() * 1e6)}` } });
    return (await res.json()).id;
}
async function serverArtefact(page: Page, ed: number, artId: number) {
    const arts = (await (await page.request.get(`${API}/v1/editions/${ed}/artefacts`, { headers: auth() })).json()).artefacts;
    return arts.find((a: { id: number }) => a.id === artId);
}

test('OPERATION: setting an artefact placement persists the exact transform and survives reload', async ({ browser }) => {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    const ed = await newEdition(page);
    const artId = (await (await page.request.get(`${API}/v1/editions/${ed}/artefacts`, { headers: auth() })).json()).artefacts[0].id;

    await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
    await page.setViewportSize({ width: 1500, height: 950 });
    await page.goto(`/editions/${ed}/artefacts/${artId}`);
    await expect(page.locator('#popover-adjust')).toBeVisible({ timeout: 40_000 });

    // A transform that could never be the seed default, so a pass proves OUR write landed.
    const target = { x: 1234, y: 5678, rotate: 37, scale: 0.9 };

    // Perform the operation through the app's REAL artefact service + Placement model.
    const local = await page.evaluate(async (t) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cur: any = (document.getElementById('artefact-image') as any)?.__vueParentComponent;
        let svc: any; // eslint-disable-line @typescript-eslint/no-explicit-any
        while (cur) { if (cur.ctx?.artefactService?.changeArtefact) { svc = cur.ctx.artefactService; break; } cur = cur.parent; }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        const art = st.artefacts.current;
        art.placement.translate.x = t.x;
        art.placement.translate.y = t.y;
        art.placement.rotate = t.rotate;
        art.placement.scale = t.scale;
        await svc.changeArtefact(st.editions.current.id, art);
        return { x: art.placement.translate.x, y: art.placement.translate.y, rotate: art.placement.rotate, scale: art.placement.scale };
    }, target);

    // 1) local state holds the new transform.
    expect(local).toEqual(target);

    // 2) the SERVER persisted the exact transform (fetched independently of the app).
    const onServer = await serverArtefact(page, ed, artId);
    expect(onServer.placement.translate.x).toBe(target.x);
    expect(onServer.placement.translate.y).toBe(target.y);
    expect(onServer.placement.rotate).toBeCloseTo(target.rotate, 5);
    expect(onServer.placement.scale).toBeCloseTo(target.scale, 5);

    // 3) it survives a full reload (re-fetched from the server into a fresh app instance).
    await page.reload();
    await expect(page.locator('#popover-adjust')).toBeVisible({ timeout: 40_000 });
    const afterReload = await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        const a = st.artefacts.current;
        return { x: a.placement.translate.x, rotate: a.placement.rotate };
    });
    expect(afterReload.x).toBe(target.x);
    expect(afterReload.rotate).toBeCloseTo(target.rotate, 5);

    await collectCoverage(ctx);
    await ctx.close();
});

test('OPERATION: renaming an artefact persists the new name and survives reload', async ({ browser }) => {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    const ed = await newEdition(page);
    const artId = (await (await page.request.get(`${API}/v1/editions/${ed}/artefacts`, { headers: auth() })).json()).artefacts[0].id;

    await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
    await page.setViewportSize({ width: 1500, height: 950 });
    await page.goto(`/editions/${ed}/artefacts/${artId}`);
    await expect(page.locator('#popover-adjust')).toBeVisible({ timeout: 40_000 });

    const newName = `renamed-${Date.now()}`;
    await page.evaluate(async (name) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cur: any = (document.getElementById('artefact-image') as any)?.__vueParentComponent;
        let svc: any; // eslint-disable-line @typescript-eslint/no-explicit-any
        while (cur) { if (cur.ctx?.artefactService?.changeArtefact) { svc = cur.ctx.artefactService; break; } cur = cur.parent; }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        const art = st.artefacts.current;
        art.name = name;
        await svc.changeArtefact(st.editions.current.id, art);
    }, newName);

    // the SERVER has the new name.
    const onServer = await serverArtefact(page, ed, artId);
    expect(onServer.name).toBe(newName);

    // survives reload.
    await page.reload();
    await expect(page.locator('#popover-adjust')).toBeVisible({ timeout: 40_000 });
    const reloadedName = await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        return st.artefacts.current.name as string;
    });
    expect(reloadedName).toBe(newName);

    await collectCoverage(ctx);
    await ctx.close();
});
