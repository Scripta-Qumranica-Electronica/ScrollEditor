import { test, expect, collectCoverage, loginToken, authedContext, API } from './fixtures';

// UI flow for the home editions filter: typing in the search box narrows the visible edition
// list and clearing it restores the list. Real typing; assertions on the rendered card count.

let token: string;
test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    await request.dispose();
});
const auth = () => ({ Authorization: `Bearer ${token}` });

test('FLOW: filtering the home editions list narrows and restores it', async ({ browser }) => {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    // Ensure the personal list has at least one edition with a known unique token in its name.
    const marker = `zqfilter${Date.now()}`;
    await page.request.post(`${API}/v1/editions/899`, { headers: auth(), data: { name: `${marker}-edition` } });

    await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
    await page.setViewportSize({ width: 1500, height: 950 });
    await page.goto('/home');

    const filter = page.locator('#filter').first();
    const cards = page.locator('.edition-card-grid');

    await test.step('the personal editions list renders cards', async () => {
        await expect(cards.first()).toBeVisible({ timeout: 40_000 });
        await expect(filter).toBeVisible();
    });

    await test.step('a non-matching filter empties the list', async () => {
        await filter.fill('zz-no-such-edition-zz');
        await expect(cards).toHaveCount(0, { timeout: 10_000 });
    });

    await test.step('filtering by a unique name shows exactly that edition', async () => {
        await filter.fill(marker);
        await expect(cards).toHaveCount(1, { timeout: 10_000 });
    });

    await test.step('clearing the filter restores the full list', async () => {
        await filter.fill('');
        await expect.poll(async () => cards.count(), { timeout: 10_000 }).toBeGreaterThan(1);
    });

    await collectCoverage(ctx);
    await ctx.close();
});
