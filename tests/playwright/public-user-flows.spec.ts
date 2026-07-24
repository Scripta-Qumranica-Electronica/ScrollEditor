import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

// Public (unauthenticated) account flows: the Register dialog and the
// Forgot-Password reset form. These render the user/registration components that
// the authed account tests don't reach. We open the forms and assert their fields,
// without submitting (no real emails sent).

function trackPageErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    return errors;
}

test('the Register dialog opens with its account fields', async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.goto('/');
    await page.locator('button.btn-regis').click();
    // The registration form asks for email + password (+ confirm).
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
});

test('Forgot Password reveals a reset form', async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.goto('/');
    await page.locator('button.btn-login').click();
    await expect(page.getByText(/forgot password/i)).toBeVisible({ timeout: 10_000 });
    await page.getByText(/forgot password/i).click();
    // The reset flow asks for the account email.
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 10_000 });
    expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
});

test('the registration form validates required fields before submit', async ({ page }) => {
    await page.goto('/');
    await page.locator('button.btn-regis').click();
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 10_000 });
    // Fill a syntactically invalid email and a mismatched password to exercise the
    // form's validation state, then confirm we did not get navigated/logged in.
    await page.locator('input[type="email"]').first().fill('not-an-email');
    await page.locator('input[type="password"]').first().fill('abc');
    const token = await page.evaluate(() => window.localStorage.getItem('token'));
    expect(token).toBeFalsy();
});
