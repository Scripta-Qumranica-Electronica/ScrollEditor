import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

// Fast structural smoke tests over the entry flows a real user hits first. These
// exist because the Vue-3 migration broke these paths silently (login modal never
// opened; the guest flow crashed on edition-public-list). They assert "the page
// mounts and does not throw", which the old Cypress specs did not catch.

// Collect uncaught page errors so we can assert none fired. We do NOT throw inside
// the handler (that becomes an unhandled rejection and hangs the run) — we record
// and assert at the end of each test.
function trackPageErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    return errors;
}

test('landing page mounts with the login entry points', async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.goto('/');
    await expect(page.locator('button.btn-login')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('link', { name: /guest/i })).toBeVisible();
    expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
});

test('clicking "Log in" opens the login modal (COMPONENT_V_MODEL linchpin)', async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.goto('/');
    await page.locator('button.btn-login').click();
    // The modal only reveals these inputs when it actually opens.
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByText(/log in to your account/i)).toBeVisible();
    expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
});

test('entering as guest loads the public editions list without crashing', async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.goto('/');
    await page.getByRole('link', { name: /guest/i }).click();
    // Guest lands on the public editions list; the DynamicScroller→v-for fix means
    // this renders instead of throwing on a destructured `item`.
    await expect(page).toHaveURL(/\/home/, { timeout: 15_000 });
    await expect(page.getByText(/published in the scrollery/i)).toBeVisible({ timeout: 15_000 });
    // At least one edition card renders its actions (proves the list, not just the
    // header, mounted — the crash was inside the per-item template).
    await expect(page.getByText(/Copy Edition/i).first()).toBeVisible({ timeout: 15_000 });
    expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
});
