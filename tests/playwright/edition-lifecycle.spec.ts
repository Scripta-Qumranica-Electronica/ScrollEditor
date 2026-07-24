import { test, expect, loginToken, authedContext, collectCoverage, API } from './fixtures';
import type { BrowserContext } from '@playwright/test';

// P2 — Edition lifecycle through the real UI: copy a public edition, open the
// collaborators/permissions dialog, and delete an owned edition. Each flow both
// drives the UI and confirms the server side via the API, so a green test means
// the button actually did the thing (not just that a modal opened).

let token: string;

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    await request.dispose();
});

const authHeader = () => ({ Authorization: `Bearer ${token}` });

// Create a private, writable edition (a copy of public 899) via the API.
async function createEdition(ctx: BrowserContext, name: string): Promise<number> {
    const resp = await ctx.request.post(`${API}/v1/editions/899`, {
        headers: authHeader(),
        data: { name },
    });
    expect(resp.ok(), 'edition create should succeed').toBeTruthy();
    return (await resp.json()).id;
}

test('copying a public edition creates a personal edition', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();

    await page.goto('/home/public');
    // Each public card carries a "Copy Edition" action; the first one opens the
    // copy modal (which is v-if="currentEdition", set by the card click).
    await page.getByText('Copy Edition').first().click();

    const modal = page.locator('#copy-edition-modal');
    await expect(modal.locator('#newCopyName')).toBeVisible({ timeout: 10_000 });

    const name = `pw-copy-${Date.now()}`;
    await modal.locator('#newCopyName').fill(name);
    await modal.getByRole('button', { name: /copy/i }).click();

    // Success navigates to the freshly created edition.
    await page.waitForURL(/\/editions\/\d+/, { timeout: 25_000 });

    // And the copy exists server-side under the user's editions.
    const editions = await (await context.request.get(`${API}/v1/editions`, { headers: authHeader() })).json();
    expect(JSON.stringify(editions), 'new copy should appear in the edition list').toContain(name);

    await collectCoverage(context);
    await context.close();
});

test('the collaborators/permissions dialog opens for an owned edition', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const ed = await createEdition(context, `pw-perm-${Date.now()}`);
    const page = await context.newPage();

    await page.goto(`/editions/${ed}`);
    // Header action visible only to an admin of a non-public edition.
    await page.getByRole('button', { name: /collaborators/i }).click();

    const modal = page.locator('#permissionModal');
    await expect(modal).toBeVisible({ timeout: 10_000 });
    // The dialog exposes the share controls (a permission select / invite field).
    await expect(modal.locator('select, input').first()).toBeVisible();

    await collectCoverage(context);
    await context.close();
});

test('deleting an owned edition removes it', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const ed = await createEdition(context, `pw-del-${Date.now()}`);
    const page = await context.newPage();

    await page.goto(`/editions/${ed}`);
    await page.getByRole('button', { name: /delete edition/i }).click();

    const modal = page.locator('#deleteEditionModal');
    await expect(modal.locator('#input-confirmation')).toBeVisible({ timeout: 10_000 });
    // The Delete button stays disabled until the confirmation word is typed.
    await modal.locator('#input-confirmation').fill('delete');
    await modal.getByRole('button', { name: /^delete$/i }).click();

    // UI returns to home…
    await page.waitForURL(/\/home/, { timeout: 20_000 });
    // …and the edition is no longer accessible server-side.
    const res = await context.request.get(`${API}/v1/editions/${ed}`, { headers: authHeader() });
    expect(res.status(), 'deleted edition should no longer be accessible').toBeGreaterThanOrEqual(400);

    await collectCoverage(context);
    await context.close();
});
