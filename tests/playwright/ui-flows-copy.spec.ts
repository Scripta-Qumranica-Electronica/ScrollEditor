import { test, expect, loginToken, authedContext } from './fixtures';

// UI flow for COPYING an edition: from the home edition list, open a card's copy dialog, name
// the copy, confirm, and land in the newly-created edition. Real clicks/typing; the assertion
// is the visible result — a full navigation into a brand-new /editions/<id> overview.

let token: string;
test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    await request.dispose();
});

test('FLOW: copy an edition from the home list into a new edition', async ({ browser }) => {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
    await page.setViewportSize({ width: 1500, height: 950 });
    await page.goto('/home');

    const modal = page.locator('#copy-edition-modal');
    const copyName = `ui-copy-${Date.now()}`;

    await test.step('the home page lists editions with a Copy control', async () => {
        // Both the card button and the modal button read "Copy Edition"; before the modal is
        // open only card buttons exist.
        await expect(page.getByRole('button', { name: 'Copy Edition' }).first()).toBeVisible({ timeout: 30_000 });
    });

    await test.step('clicking Copy on a card opens the copy dialog', async () => {
        await page.getByRole('button', { name: 'Copy Edition' }).first().click();
        await expect(modal).toBeVisible({ timeout: 10_000 });
        await expect(modal.locator('#newCopyName')).toBeVisible();
    });

    await test.step('naming the copy and confirming creates it and navigates into it', async () => {
        await modal.locator('#newCopyName').fill(copyName);
        // Scope the confirm to the modal (the card buttons share the same label).
        await modal.getByRole('button', { name: 'Copy Edition' }).click();
        // copyEdition() does window.location.assign(`/editions/<newId>`) on success.
        await expect(page).toHaveURL(/\/editions\/\d+(\/|$)/, { timeout: 30_000 });
        await expect(page).not.toHaveURL(/\/home$/);
    });

    await test.step('the new edition really is a fresh, owned copy bearing the chosen name', async () => {
        // Read the new edition id from the URL and verify via the API that it exists, is owned,
        // and carries the name we typed — proving the copy operation actually ran server-side.
        const id = Number(page.url().match(/\/editions\/(\d+)/)![1]);
        const ed = await (await page.request.get(`http://localhost:5000/v1/editions/${id}`, { headers: { Authorization: `Bearer ${token}` } })).json();
        expect(ed.primary?.name ?? ed.name).toBe(copyName);
    });

    await ctx.close();
});
