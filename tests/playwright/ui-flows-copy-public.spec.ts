import { test, expect, collectCoverage, loginToken, authedContext, API } from './fixtures';

// UI flow for copying a PUBLIC edition from the Public Editions tab. This exercises a different
// path than the personal-list copy (public-editions.vue drives the modal via a :visible prop),
// and asserts the real effect: naming + confirming lands in a new, server-verified owned edition.

let token: string;
test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    await request.dispose();
});

test('FLOW: copy a public edition into a new owned edition', async ({ browser }) => {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
    await page.setViewportSize({ width: 1500, height: 950 });
    await page.goto('/home');

    const modal = page.locator('#copy-edition-modal');
    const copyName = `ui-pubcopy-${Date.now()}`;

    await test.step('switch to the Public Editions tab', async () => {
        await page.getByRole('tab', { name: /Public Editions/i }).click();
        await expect(page.getByRole('button', { name: 'Copy Edition' }).first()).toBeVisible({ timeout: 40_000 });
    });

    await test.step('clicking Copy on a public card opens the copy dialog', async () => {
        await page.getByRole('button', { name: 'Copy Edition' }).first().click();
        await expect(modal).toBeVisible({ timeout: 10_000 });
        await expect(modal.locator('#newCopyName')).toBeVisible();
    });

    await test.step('naming and confirming creates the copy and navigates into it', async () => {
        const nameInput = modal.locator('#newCopyName');
        // The modal pre-fills the input with the source edition's name on @shown (asynchronously).
        // Wait for that default to land BEFORE typing, otherwise fill() races ahead of the @shown
        // population and the default gets prepended ("1Q1" + our name). Then replace it.
        await expect(nameInput).not.toHaveValue('', { timeout: 10_000 });
        await nameInput.fill(copyName);
        await expect(nameInput).toHaveValue(copyName);
        await modal.getByRole('button', { name: 'Copy Edition' }).click();
        await expect(page).toHaveURL(/\/editions\/\d+(\/|$)/, { timeout: 30_000 });
        const id = Number(page.url().match(/\/editions\/(\d+)/)![1]);
        const ed = await (await page.request.get(`${API}/v1/editions/${id}`, { headers: { Authorization: `Bearer ${token}` } })).json();
        expect(ed.primary?.name ?? ed.name).toBe(copyName);
    });

    await collectCoverage(ctx);
    await ctx.close();
});
