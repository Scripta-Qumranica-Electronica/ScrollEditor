import { test, expect, TEST_USER } from './fixtures';

// UI flow for AUTHENTICATION: a logged-out visitor opens the user menu, logs in through the
// real login modal, and the navbar reflects the logged-in session; then logs out and the
// navbar reverts. Real clicks/typing; assertions are on the visible navbar state and the
// token the app actually persists.

test('FLOW: log in through the navbar modal, then log out', async ({ browser }) => {
    // A CLEAN context — no injected token, so the app boots logged-out.
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
    await page.setViewportSize({ width: 1500, height: 950 });
    await page.goto('/home');

    // The user-account dropdown toggle (its element id is "register").
    const userMenu = page.locator('button#register');
    const loginItem = page.locator('.dropdown-item', { hasText: /^\s*Log in\s*$/ });
    const logoutItem = page.locator('.dropdown-item', { hasText: /^\s*Logout\s*$/ });
    const modal = page.locator('#loginModal');

    await test.step('the app boots logged-out — the user menu offers Log in', async () => {
        await expect(userMenu).toBeVisible({ timeout: 30_000 });
        await userMenu.click();
        await expect(loginItem).toBeVisible({ timeout: 10_000 });
        // no token yet
        expect(await page.evaluate(() => window.localStorage.getItem('token'))).toBeNull();
    });

    await test.step('choosing Log in opens the login modal', async () => {
        await loginItem.click();
        await expect(modal).toBeVisible({ timeout: 10_000 });
    });

    await test.step('submitting valid credentials logs the user in', async () => {
        await modal.locator('input[type=email], input[placeholder*="email" i]').first().fill(TEST_USER.email);
        await modal.locator('input[type=password]').fill(TEST_USER.password);
        await modal.getByRole('button', { name: /^log in$/i }).click();
        await expect(modal).toBeHidden({ timeout: 15_000 });
        // the app persisted the JWT it uses for every authed call
        await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('token')), { timeout: 10_000 }).not.toBeNull();
    });

    await test.step('the navbar now shows a logged-in session (Logout, not Log in)', async () => {
        await userMenu.click();
        await expect(logoutItem).toBeVisible({ timeout: 10_000 });
        await expect(loginItem).toHaveCount(0);
    });

    await test.step('logging out clears the session and restores Log in', async () => {
        await logoutItem.click();
        await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('token')), { timeout: 10_000 }).toBeNull();
        await userMenu.click();
        await expect(loginItem).toBeVisible({ timeout: 10_000 });
    });

    await ctx.close();
});
