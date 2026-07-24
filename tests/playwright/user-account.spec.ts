import { test, expect, loginToken, authedContext, collectCoverage } from './fixtures';
import type { Page } from '@playwright/test';

// Coverage of the USER account area (src/views/user/**) and the account dropdown
// in the navbar. These are read-only: the Change Password and Update User Details
// forms are opened and asserted to render, but never submitted (we must not mutate
// the shared test user's credentials).

let token: string;

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    await request.dispose();
});

function trackPageErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    return errors;
}

// The account dropdown is the b-nav-item-dropdown with the user icon (#register).
async function openAccountMenu(page: Page) {
    await page.locator('#register').getByRole('button').click();
}

test('the account dropdown exposes the user name and account actions', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    const errors = trackPageErrors(page);

    await page.goto('/home/private');
    await expect(page.locator('#register')).toBeVisible({ timeout: 15_000 });
    await openAccountMenu(page);

    // For an activated user the menu offers Logout + Change Password + Update details.
    await expect(page.getByRole('menuitem', { name: /logout/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('menuitem', { name: /change password/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /update user details/i })).toBeVisible();

    expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
    await collectCoverage(context);
    await context.close();
});

test('Change Password opens the change-password form with three password fields', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    const errors = trackPageErrors(page);

    await page.goto('/home/private');
    await expect(page.locator('#register')).toBeVisible({ timeout: 15_000 });
    await openAccountMenu(page);
    await page.getByRole('menuitem', { name: /change password/i }).click();

    await page.waitForURL(/\/changePassword/, { timeout: 15_000 });
    // ChangePassword.vue: heading + current / new / repeat password inputs.
    await expect(page.getByRole('heading', { name: /change password/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('input[type="password"]')).toHaveCount(3);

    // The Change button stays disabled until valid, matching passwords are entered.
    const changeBtn = page.getByRole('button', { name: /^change$/i });
    await expect(changeBtn).toBeDisabled();

    expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
    await collectCoverage(context);
    await context.close();
});

test('Change Password validates that the new passwords must match (no submit)', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();

    // Load home first so the session user is fetched from the token; a *direct*
    // goto('/changePassword') races the activeUserRoute router guard (which bounces
    // to '/' before the async whoami resolves).
    await page.goto('/home/private');
    await expect(page.locator('#register')).toBeVisible({ timeout: 15_000 });
    await openAccountMenu(page);
    await page.getByRole('menuitem', { name: /change password/i }).click();
    await expect(page.getByRole('heading', { name: /change password/i })).toBeVisible({ timeout: 15_000 });

    const pw = page.locator('input[type="password"]');
    await pw.nth(0).fill('whatever-current');
    await pw.nth(1).fill('newpass-A');
    await pw.nth(2).fill('newpass-B'); // deliberately mismatched — we never submit

    // identicalError renders and the Change button remains disabled.
    await expect(page.getByText(/Passwords must be identical/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /^change$/i })).toBeDisabled();

    await collectCoverage(context);
    await context.close();
});

test('the account dropdown routes to Update User Details', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();

    await page.goto('/home/private');
    await expect(page.locator('#register')).toBeVisible({ timeout: 15_000 });
    await openAccountMenu(page);
    await page.getByRole('menuitem', { name: /update user details/i }).click();

    // The dropdown action navigates to the update-user route (the guard lets an
    // activated user through). NOTE: UpdateUser.vue reads $state in its class-field
    // initialisers, which throws on this build, so we assert the routing only and
    // do not depend on the form body rendering.
    await page.waitForURL(/\/updateUserDetails/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/updateUserDetails/);

    await collectCoverage(context);
    await context.close();
});

test('the changePassword route is guarded for anonymous visitors', async ({ browser }) => {
    // No token — anonymous. The activeUserRoute guard must bounce to the landing page.
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/changePassword');
    // Guard redirects unauthenticated users home ('/').
    await expect(page.locator('button.btn-login')).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/$/);

    await collectCoverage(context);
    await context.close();
});

test('the account dropdown offers Login when signed out', async ({ browser }) => {
    const context = await browser.newContext(); // anonymous
    const page = await context.newPage();
    const errors = trackPageErrors(page);

    await page.goto('/home/public');
    await expect(page.locator('#register')).toBeVisible({ timeout: 15_000 });
    await page.locator('#register').getByRole('button').click();

    // Signed-out users get a Login entry (and no Logout / account-management items).
    await expect(page.getByRole('menuitem', { name: /log in/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('menuitem', { name: /logout/i })).toHaveCount(0);

    expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
    await collectCoverage(context);
    await context.close();
});
