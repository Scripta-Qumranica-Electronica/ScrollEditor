import { test, expect, loginToken, authedContext, API } from './fixtures';

// UI flows for EDITION MANAGEMENT from the edition overview: viewing manuscript metadata and
// deleting an edition (a real destructive operation with a typed confirmation). Real clicks/
// typing; assertions on the visible modal state and the resulting navigation / server state.

let token: string;
test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    await request.dispose();
});
const auth = () => ({ Authorization: `Bearer ${token}` });

test('FLOW: open the Manuscript Information (metadata) modal', async ({ browser }) => {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    const ed = (await (await page.request.post(`${API}/v1/editions/899`, { headers: auth(), data: { name: `ui-meta-${Date.now()}-${Math.floor(Math.random() * 1e6)}` } })).json()).id;

    await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
    await page.setViewportSize({ width: 1500, height: 950 });
    await page.goto(`/editions/${ed}`);

    await test.step('clicking Manuscript Information opens the metadata modal', async () => {
        await page.getByRole('button', { name: 'Manuscript Information' }).click();
        await expect(page.locator('#editionMetadataModal')).toBeVisible({ timeout: 10_000 });
    });

    await ctx.close();
});

test('FLOW: delete an edition with typed confirmation removes it', async ({ browser }) => {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    const ed = (await (await page.request.post(`${API}/v1/editions/899`, { headers: auth(), data: { name: `ui-del-${Date.now()}-${Math.floor(Math.random() * 1e6)}` } })).json()).id;

    await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
    await page.setViewportSize({ width: 1500, height: 950 });
    await page.goto(`/editions/${ed}`);

    const modal = page.locator('#deleteEditionModal');

    await test.step('Delete Edition opens the confirmation modal', async () => {
        await page.getByRole('button', { name: 'Delete Edition' }).click();
        await expect(modal).toBeVisible({ timeout: 10_000 });
    });

    await test.step('the Delete button stays disabled until you type "delete"', async () => {
        const del = modal.getByRole('button', { name: /^delete$/i });
        await expect(del).toBeDisabled();
        await modal.locator('#input-confirmation').fill('delete');
        await expect(del).toBeEnabled();
    });

    await test.step('confirming deletes the edition (it is gone server-side)', async () => {
        await modal.getByRole('button', { name: /^delete$/i }).click();
        // The edition no longer exists — the API returns non-OK for it.
        await expect.poll(async () => {
            const r = await page.request.get(`${API}/v1/editions/${ed}`, { headers: auth() });
            return r.status();
        }, { timeout: 15_000 }).toBeGreaterThanOrEqual(400);
    });

    await ctx.close();
});
