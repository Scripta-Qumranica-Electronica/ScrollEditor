import { test, expect, loginToken, authedContext, API } from './fixtures';
import type { Page } from '@playwright/test';

// UI flows for TEXT editing: adding a line through the right-click line menu + modal, and
// renaming a text fragment. Real interactions, visible-state assertions.

let token: string;
test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    await request.dispose();
});
const auth = () => ({ Authorization: `Bearer ${token}` });

async function newTextFragmentPage(page: Page): Promise<{ ed: number; tfId: number }> {
    const ed = (await (await page.request.post(`${API}/v1/editions/899`, { headers: auth(), data: { name: `ui-text-${Date.now()}-${Math.floor(Math.random() * 1e6)}` } })).json()).id;
    const tfs = (await (await page.request.get(`${API}/v1/editions/${ed}/text-fragments`, { headers: auth() })).json()).textFragments;
    await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
    await page.setViewportSize({ width: 1500, height: 950 });
    await page.goto(`/editions/${ed}/text-fragments/${tfs[0].id}`);
    return { ed, tfId: tfs[0].id };
}

test('FLOW: add a text line via the right-click line menu → the new line appears', async ({ browser }) => {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    await newTextFragmentPage(page);

    const lines = page.locator('#text-side .text-line');
    let before = 0;

    await test.step('the fragment renders its text lines', async () => {
        await expect(lines.first()).toBeVisible({ timeout: 40_000 });
        before = await lines.count();
        expect(before).toBeGreaterThan(0);
    });

    await test.step('right-clicking a line opens the line menu', async () => {
        await page.locator('#text-side .text-line [id^="popover-line-"]').first().click({ button: 'right' });
        // menu appears with the line actions
        await expect(page.locator('.popover.b-popover.show', { hasText: /Add a line after/i })).toBeVisible({ timeout: 10_000 });
    });

    await test.step('"Add a line after" opens the Add-Line modal', async () => {
        await page.locator('.popover.b-popover.show p', { hasText: /Add a line after/i }).click();
        await expect(page.locator('#addLineModal')).toBeVisible({ timeout: 10_000 });
    });

    await test.step('naming the line and clicking Save adds it to the fragment', async () => {
        await page.locator('#addLineModal input').fill('ui-flow-newline');
        await page.locator('#addLineModal').getByRole('button', { name: /^save$/i }).click();
        await expect(page.locator('#addLineModal')).toBeHidden({ timeout: 10_000 });
        // the visible line count grew by one
        await expect(lines).toHaveCount(before + 1, { timeout: 10_000 });
    });

    await ctx.close();
});

test('FLOW: delete a text line via the right-click line menu → the line disappears', async ({ browser }) => {
    // The inverse of the add-line flow, on the same route: right-click a line → "Delete this
    // line" → confirm modal → the visible line count shrinks by one. This exercises the
    // destructive line path (line menu → deleteLineModal → textService.deleteLine) end to end.
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    await newTextFragmentPage(page);

    const lines = page.locator('#text-side .text-line');
    let before = 0;

    await test.step('the fragment renders its text lines', async () => {
        await expect(lines.first()).toBeVisible({ timeout: 40_000 });
        before = await lines.count();
        expect(before).toBeGreaterThan(1); // need at least two so a delete leaves something
    });

    await test.step('right-clicking a line and choosing "Delete this line" opens the confirm modal', async () => {
        await page.locator('#text-side .text-line [id^="popover-line-"]').first().click({ button: 'right' });
        await expect(page.locator('.popover.b-popover.show', { hasText: /Delete this line/i })).toBeVisible({ timeout: 10_000 });
        await page.locator('.popover.b-popover.show p', { hasText: /Delete this line/i }).click();
        await expect(page.locator('#deleteLineModal')).toBeVisible({ timeout: 10_000 });
    });

    await test.step('confirming the delete removes the line from the fragment', async () => {
        await page.locator('#deleteLineModal').getByRole('button', { name: /^confirm$/i }).click();
        await expect(page.locator('#deleteLineModal')).toBeHidden({ timeout: 10_000 });
        await expect(lines).toHaveCount(before - 1, { timeout: 10_000 });
    });

    await ctx.close();
});
