import { test, expect, collectCoverage, loginToken, authedContext, API } from './fixtures';
import type { Page } from '@playwright/test';

// UI flow for placing an artefact onto the scroll via the Add-Artefact modal: open it, pick an
// unplaced artefact, click Add — and assert the artefact actually becomes placed. This guards a
// whole workflow (manuscript-toolbar → add-artefact-modal → scroll-editor placement).

let token: string;
test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    await request.dispose();
});
const auth = () => ({ Authorization: `Bearer ${token}` });

const placedCount = (page: Page) =>
    page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any)?.__vue_app__?.config?.globalProperties?.$state;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (st?.artefacts?.items ?? []).filter((a: any) => a.isPlaced).length;
    });

test('FLOW: add an unplaced artefact to the scroll via the Add-Artefact modal', async ({ browser }) => {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    const ed = (await (await page.request.post(`${API}/v1/editions/899`, { headers: auth(), data: { name: `ui-addart-${Date.now()}-${Math.floor(Math.random() * 1e6)}` } })).json()).id;

    await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto(`/editions/${ed}/scroll-editor`);
    await expect(page.locator('#the-scroll')).toBeVisible({ timeout: 40_000 });

    const addModal = page.locator('#addArtefactModal');
    let before = 0;

    await test.step('opening the Add-Artefact modal lists unplaced artefacts', async () => {
        before = await placedCount(page);
        await page.getByRole('button', { name: /Add artefact/i }).click();
        await expect(addModal).toBeVisible({ timeout: 10_000 });
        await expect(addModal.locator('#cheked-artefact input[type="checkbox"]').first()).toBeVisible({ timeout: 10_000 });
    });

    await test.step('selecting one and clicking Add places it on the scroll', async () => {
        await addModal.locator('#cheked-artefact input[type="checkbox"]').first().check({ force: true });
        const addBtn = addModal.getByRole('button', { name: /^add$/i });
        await expect(addBtn).toBeEnabled();
        await addBtn.click();
        // The picked artefact is now placed — the placed-artefact count grew.
        await expect.poll(async () => placedCount(page), { timeout: 15_000 }).toBe(before + 1);
    });

    await collectCoverage(ctx);
    await ctx.close();
});

test('FLOW: remove a placed artefact from the scroll', async ({ browser }) => {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    const ed = (await (await page.request.post(`${API}/v1/editions/899`, { headers: auth(), data: { name: `ui-rmart-${Date.now()}-${Math.floor(Math.random() * 1e6)}` } })).json()).id;

    await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto(`/editions/${ed}/scroll-editor`);
    await expect(page.locator('#the-scroll')).toBeVisible({ timeout: 40_000 });
    await expect.poll(async () => page.locator('#the-scroll g[pointer-events="all"]').count(), { timeout: 40_000 }).toBeGreaterThan(0);

    let before = 0;
    await test.step('select a placed artefact', async () => {
        before = await placedCount(page);
        expect(before).toBeGreaterThan(0);
        await page.evaluate(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const art = st.artefacts.items.find((a: any) => a.isPlaced);
            st.eventBus.emit('select-artefact', art);
        });
        await expect(page.getByTitle('Mirror', { exact: true })).toBeEnabled({ timeout: 10_000 });
    });

    await test.step('clicking Remove unplaces it (placed count drops)', async () => {
        await page.getByRole('button', { name: /^Remove$/ }).click();
        await expect.poll(async () => placedCount(page), { timeout: 15_000 }).toBe(before - 1);
    });

    await collectCoverage(ctx);
    await ctx.close();
});
