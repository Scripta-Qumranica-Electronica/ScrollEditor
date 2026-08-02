import { test, expect, collectCoverage, loginToken, authedContext, API } from './fixtures';
import type { Page } from '@playwright/test';

// UI flow for SIGN editing via the right-click sign menu in the text editor: deleting a sign
// interpretation. This drives the real DeleteSignInterpretationOperation (+ ROI erase ops) — an
// operation-class path whose branches are otherwise thinly covered — and asserts the visible
// effect: the sign disappears from the rendered line.

let token: string;
test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    await request.dispose();
});
const auth = () => ({ Authorization: `Bearer ${token}` });

async function newTextFragmentPage(page: Page): Promise<{ ed: number; tfId: number }> {
    const ed = (await (await page.request.post(`${API}/v1/editions/899`, { headers: auth(), data: { name: `ui-sign-${Date.now()}-${Math.floor(Math.random() * 1e6)}` } })).json()).id;
    const tfs = (await (await page.request.get(`${API}/v1/editions/${ed}/text-fragments`, { headers: auth() })).json()).textFragments;
    await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
    await page.setViewportSize({ width: 1500, height: 950 });
    await page.goto(`/editions/${ed}/text-fragments/${tfs[0].id}`);
    return { ed, tfId: tfs[0].id };
}

test('FLOW: delete a sign via the right-click sign menu → the sign disappears', async ({ browser }) => {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    await newTextFragmentPage(page);

    const signs = page.locator('#text-side .text-sign');
    let before = 0;

    await test.step('the fragment renders its signs', async () => {
        await expect(signs.first()).toBeVisible({ timeout: 40_000 });
        before = await signs.count();
        expect(before).toBeGreaterThan(1);
    });

    await test.step('right-clicking a sign opens the sign menu', async () => {
        await signs.first().click({ button: 'right' });
        await expect(page.locator('.popover.b-popover.show', { hasText: /Delete sign/i })).toBeVisible({ timeout: 10_000 });
    });

    await test.step('"Delete sign" removes it from the line', async () => {
        await page.locator('.popover.b-popover.show p', { hasText: /Delete sign/i }).click();
        await expect(signs).toHaveCount(before - 1, { timeout: 10_000 });
    });

    await collectCoverage(ctx);
    await ctx.close();
});
