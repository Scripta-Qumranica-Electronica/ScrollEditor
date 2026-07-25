import { test, expect, API } from './fixtures';

// Resend-activation UI: a registered-but-unactivated user can re-request the activation email
// from the login modal. The response is deliberately generic (the endpoint 404s for an
// activated/unknown email, but the UI swallows that so it never reveals account existence).

test('login modal: resend-activation requires an email, then confirms generically', async ({ browser }) => {
    const context = await browser.newContext(); // logged out
    const page = await context.newPage();
    const posts: string[] = [];
    page.on('request', (r) => { if (r.method() === 'POST' && /resend-activation-email/.test(r.url())) posts.push(r.url().replace(API, '')); });
    await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
    await page.goto('/');
    await page.locator('button.btn-login').first().click();
    const modal = page.locator('#loginModal');
    await expect(modal.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 });

    const resend = page.locator('#resend-activation-link');
    await expect(resend).toBeVisible();

    // No email yet -> prompts for one, sends nothing.
    await resend.click();
    await expect(modal.getByText(/enter your email/i)).toBeVisible({ timeout: 5_000 });
    expect(posts, 'no request without an email').toEqual([]);

    // With an email -> fires the request and shows the generic confirmation.
    await modal.locator('input[type="email"]').fill('someone@example.com');
    await resend.click();
    await expect(modal.getByText(/activation email is on its way/i)).toBeVisible({ timeout: 10_000 });
    await expect.poll(() => posts.length, { timeout: 10_000 }).toBeGreaterThan(0);

    await context.close();
});
