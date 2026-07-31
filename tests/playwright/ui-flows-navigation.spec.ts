import { test, expect, collectCoverage, loginToken, authedContext } from './fixtures';

// UI flows for navigation/discovery: browsing an edition and searching. Real interactions,
// visible-state assertions, named steps.

let token: string;
test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    await request.dispose();
});

test('FLOW: browse an edition — tab counts, switch tabs, open an artefact', async ({ browser }) => {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
    await page.setViewportSize({ width: 1500, height: 950 });
    await page.goto('/editions/808/artefacts'); // 1Q7 (public): 16 artefacts, 1 imaged object

    const tabs = page.locator('.btns-groups');
    const artefactsTab = tabs.locator('a, button').filter({ hasText: 'Artefacts' });
    const imagedTab = tabs.locator('a, button').filter({ hasText: 'Imaged Objects' });

    await test.step('the Artefacts tab shows its count and renders the cards', async () => {
        await expect(artefactsTab).toContainText('Artefacts 16', { timeout: 40_000 });
        await expect(page.locator('.scroll-bar .card')).toHaveCount(16);
    });

    await test.step('the Imaged Objects tab shows its count and opening it lists imaged objects', async () => {
        await expect(imagedTab).toContainText('Imaged Objects 1');
        await imagedTab.click();
        await expect(page).toHaveURL(/\/editions\/808\/imaged-objects$/);
        await expect(page.locator('.card').first()).toBeVisible({ timeout: 20_000 });
    });

    await test.step('opening an artefact from the grid lands in the artefact editor', async () => {
        await artefactsTab.click();
        await expect(page).toHaveURL(/\/editions\/808\/artefacts$/);
        await page.locator('.scroll-bar .card .line-name').first().click();
        await expect(page).toHaveURL(/\/editions\/808\/artefacts\/\d+$/);
        await expect(page.locator('#popover-adjust')).toBeVisible({ timeout: 40_000 });
    });

    await collectCoverage(ctx);
    await ctx.close();
});

test('FLOW: search for a manuscript, expand the results, open an edition', async ({ browser }) => {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
    await page.setViewportSize({ width: 1500, height: 950 });
    await page.goto('/search');

    // The form's submit button (variant=primary); NOT the navbar search icon.
    const searchBtn = page.locator('button.btn-primary', { hasText: /^\s*Search\s*$/ });
    const editionsToggle = page.locator('p[role="tab"]', { hasText: /Editions/ });

    await test.step('running a manuscript-number search returns grouped results', async () => {
        await page.locator('input[placeholder*="Manuscript"]').fill('1Q7');
        await searchBtn.click();
        await expect(editionsToggle).toContainText(/Editions \(\d+\)/, { timeout: 20_000 });
        // there must be at least one edition hit
        const label = await editionsToggle.textContent();
        const n = Number((label || '').match(/\((\d+)\)/)?.[1] ?? '0');
        expect(n, 'search returned no editions for 1Q7').toBeGreaterThan(0);
    });

    await test.step('expanding the Editions group reveals result cards', async () => {
        await editionsToggle.click();
        const collapse = page.locator('#edition-results-main');
        await expect(collapse).toHaveClass(/show/);
        await expect(collapse.locator('.card').first()).toBeVisible({ timeout: 10_000 });
    });

    await test.step('clicking a result navigates into that edition', async () => {
        await page.locator('#edition-results-main .card').first().click();
        await expect(page).toHaveURL(/\/editions\/\d+/);
    });

    await collectCoverage(ctx);
    await ctx.close();
});
