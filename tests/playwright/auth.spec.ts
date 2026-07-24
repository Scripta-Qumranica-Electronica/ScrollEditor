import { test, expect, TEST_USER } from './fixtures';
import type { Page } from '@playwright/test';

// P1 — Authentication & session. These flows broke silently in the Vue-3 migration
// (the login modal never opened) so they are the first thing we pin down. Behaviour
// oracle: production https://sqe.deadseascrolls.org.il/.

function trackPageErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    return errors;
}

async function openLoginModal(page: Page) {
    await page.locator('button.btn-login').click();
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 });
}

async function uiLogin(page: Page, email: string, password: string) {
    await openLoginModal(page);
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    // The modal's own submit button (distinct from the landing "Log in" that opened it).
    await page.locator('.modal').getByRole('button', { name: /^log in$/i }).click();
}

// The nav "hamburger" dropdown only offers Logout when a session is active.
async function openUserMenu(page: Page) {
    await page.locator('button.dropdown-toggle').first().click();
}

async function expectLoggedIn(page: Page) {
    await openUserMenu(page);
    // bootstrap-vue-next renders dropdown entries with role="menuitem".
    await expect(page.getByRole('menuitem', { name: /logout/i })).toBeVisible({ timeout: 10_000 });
}

test('valid credentials log the user in', async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.goto('/');
    await uiLogin(page, TEST_USER.email, TEST_USER.password);
    // Landing login button goes away once authenticated…
    await expect(page.locator('button.btn-login')).toHaveCount(0, { timeout: 15_000 });
    // …and the user menu now offers Logout.
    await expectLoggedIn(page);
    expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
});

test('invalid credentials do not log the user in', async ({ page }) => {
    await page.goto('/');
    await uiLogin(page, TEST_USER.email, 'definitely-the-wrong-password');
    // The landing login entry point must still be present (login was rejected).
    await expect(page.locator('button.btn-login')).toBeVisible({ timeout: 10_000 });
    // And no session token was stored.
    const token = await page.evaluate(() => window.localStorage.getItem('token'));
    expect(token).toBeFalsy();
});

test('a session survives a full page reload', async ({ page }) => {
    await page.goto('/');
    await uiLogin(page, TEST_USER.email, TEST_USER.password);
    await expect(page.locator('button.btn-login')).toHaveCount(0, { timeout: 15_000 });

    await page.reload();
    // Session is restored from the persisted token — still no login button.
    await expect(page.locator('button.btn-login')).toHaveCount(0, { timeout: 15_000 });
    await expectLoggedIn(page);
});

test('logout ends the session and returns to the landing entry points', async ({ page }) => {
    await page.goto('/');
    await uiLogin(page, TEST_USER.email, TEST_USER.password);
    await expect(page.locator('button.btn-login')).toHaveCount(0, { timeout: 15_000 });

    await openUserMenu(page);
    await page.getByRole('menuitem', { name: /logout/i }).click();

    await expect(page.locator('button.btn-login')).toBeVisible({ timeout: 15_000 });
    const token = await page.evaluate(() => window.localStorage.getItem('token'));
    expect(token).toBeFalsy();
});
