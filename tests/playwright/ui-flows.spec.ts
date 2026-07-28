import { test, expect, loginToken, authedContext, collectCoverage, API } from './fixtures';
import type { Page, Locator } from '@playwright/test';

// UI FLOWS: multi-step HUMAN→interface journeys. Every action is a real user interaction
// (Playwright .click()/.uncheck()/.fill() — trusted browser events), and every assertion is
// about the VISIBLE resulting state (what the user sees rendered), NOT an API call. Steps are
// chained with test.step() so a failure names the exact step. This is the layer that catches
// "Adjust Image doesn't open" / "the image goes washed out" — there is no API call to test.

let token: string;
test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    await request.dispose();
});
const auth = () => ({ Authorization: `Bearer ${token}` });

// Opacities of the actually-rendered image layers (what the eye sees), highest first.
async function renderedLayerOpacities(page: Page): Promise<number[]> {
    return page.evaluate(() =>
        [...document.querySelectorAll('#artefact-image image, #artefact-image svg image')]
            .map((im) => parseFloat(im.getAttribute('opacity') ?? '1'))
            .filter((n) => !Number.isNaN(n))
            .sort((a, b) => b - a),
    );
}

test('FLOW: Adjust Image — open, hide a layer, move a slider, close (multi-layer artefact)', async ({ browser }) => {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
    await page.setViewportSize({ width: 1500, height: 950 });
    await page.goto('/editions/1/artefacts/26278'); // color + infrared + rakingLeft + rakingRight

    const adjustBtn = page.locator('#popover-adjust');
    const popover = page.locator('.popover.b-popover').filter({ has: page.locator('input[type=range]') });
    const checks = popover.locator('input[type=checkbox]');
    const sliders = popover.locator('input[type=range]');

    await test.step('the artefact editor loads its image', async () => {
        await expect(adjustBtn).toBeVisible({ timeout: 40_000 });
        await expect.poll(async () => (await renderedLayerOpacities(page)).length).toBeGreaterThanOrEqual(2);
    });

    await test.step('clicking "Adjust image" opens the layer controls', async () => {
        await adjustBtn.click();
        await expect(popover).toBeVisible();
        await expect(checks.first()).toBeVisible();
        await expect(sliders.first()).toBeVisible();
    });

    await test.step('all layers visible → several image layers are rendered', async () => {
        const boxes = await checks.count();
        for (let i = 0; i < boxes; i++) await checks.nth(i).check({ force: true });
        await expect.poll(async () => (await renderedLayerOpacities(page)).length).toBeGreaterThanOrEqual(2);
    });

    await test.step('hiding the top layer must NOT leave the image washed out (opacity re-normalises to 1)', async () => {
        await checks.first().uncheck({ force: true });
        // The remaining stack's top layer must be fully opaque. The washed-out bug left it
        // at its multi-layer opacity (~0.75) because the toggle did not re-run normalizeOpacity.
        await expect
            .poll(async () => Math.max(...(await renderedLayerOpacities(page))), { timeout: 5_000 })
            .toBeCloseTo(1, 5);
    });

    await test.step('moving a layer slider changes what is rendered', async () => {
        const before = await renderedLayerOpacities(page);
        await sliders.nth(1).fill('0.1'); // a non-first slider actually affects blended opacity
        await expect.poll(async () => renderedLayerOpacities(page).then((a) => JSON.stringify(a) !== JSON.stringify(before))).toBe(true);
    });

    await test.step('clicking outside closes the popover', async () => {
        await page.mouse.click(4, 4);
        await expect(popover).toBeHidden();
    });

    await collectCoverage(ctx);
    await ctx.close();
});

test('FLOW: rename an artefact via its right-click popover — the name on screen updates', async ({ browser }) => {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    // disposable owned edition (safe to mutate)
    const ed = (await (await page.request.post(`${API}/v1/editions/899`, { headers: auth(), data: { name: `ui-flow-${Date.now()}` } })).json()).id;

    await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
    await page.setViewportSize({ width: 1500, height: 950 });
    await page.goto(`/editions/${ed}/artefacts`);

    const card: Locator = page.locator('.line-name[id^="popover-line-"]').first();
    const shownPopover = page.locator('.popover.b-popover.show', { hasText: 'Rename this artefact' });
    const newName = `flow-renamed-${Date.now()}`;

    await test.step('the artefacts grid renders cards', async () => {
        await expect(card).toBeVisible({ timeout: 40_000 });
    });

    await test.step('right-clicking a card opens the rename popover', async () => {
        await card.click({ button: 'right' });
        await expect(shownPopover).toHaveCount(1);
        await expect(shownPopover.locator('#newName')).toBeVisible();
    });

    await test.step('typing a new name and clicking Rename renames IN PLACE (no navigation)', async () => {
        await shownPopover.locator('#newName').fill(newName);
        await shownPopover.getByRole('button', { name: /^rename$/i }).click();
        // We must STAY on the artefacts list — the popover used to sit inside the card's
        // <router-link>, so clicking Rename navigated to the artefact editor instead.
        await expect(page).toHaveURL(new RegExp(`/editions/${ed}/artefacts$`));
        await expect(shownPopover).toHaveCount(0); // popover closes
        // The card's own label reflects the new name (rendered state, no reload).
        await expect(page.locator('.side-edition', { hasText: newName }).first()).toBeVisible({ timeout: 10_000 });
    });

    await collectCoverage(ctx);
    await ctx.close();
});
