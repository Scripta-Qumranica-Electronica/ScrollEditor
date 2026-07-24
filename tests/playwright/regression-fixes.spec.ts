import { test, expect, loginToken, authedContext, collectCoverage, API, TEST_USER } from './fixtures';
import type { Page } from '@playwright/test';

// Named regression guards for bugs fixed during the Vue-3 migration hardening that
// aren't already pinned by a feature spec. Each asserts the FIXED behaviour so the
// bug can't silently return.

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

// Reach an authed route via the SPA (the dropdown), NOT a fresh goto — direct
// navigation races the async session-restore guard and bounces to landing.
async function openAccountMenu(page: Page) {
    await expect(page.locator('button.dropdown-toggle').first()).toBeVisible({ timeout: 15_000 });
    await page.locator('button.dropdown-toggle').first().click();
}

test('UpdateUser renders its form with the account prefilled (regression: it threw on $state in field initializers)', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    const errors = trackPageErrors(page);

    await page.goto('/home');
    await openAccountMenu(page);
    await page.getByRole('menuitem', { name: /update user details/i }).click();

    // The form renders and its email is prefilled from the session user — this only
    // happens if created() ran, i.e. the component did not crash on load.
    const email = page.locator('input[type="email"]').first();
    await expect(email).toBeVisible({ timeout: 10_000 });
    await expect(email).toHaveValue(new RegExp(TEST_USER.email.replace(/[.@]/g, '\\$&')), { timeout: 5_000 });

    // The crash we fixed manifested as an uncaught pageerror on load.
    expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);

    await collectCoverage(context);
    await context.close();
});

test('the edition view (bare /editions/:id) redirects to the artefacts tab, not the landing page', async ({ browser }) => {
    // Regression for the vue-router-4 static-string redirect that produced :editionId
    // literally -> NaN -> 400 -> bounce home.
    const context = await authedContext(browser, token);
    const ed = (await (await context.request.post(`${API}/v1/editions/899`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { name: `pw-redirect-${Date.now()}` },
    })).json()).id;
    const page = await context.newPage();
    const errors = trackPageErrors(page);

    await page.goto(`/editions/${ed}`);
    await expect(page).toHaveURL(new RegExp(`/editions/${ed}/artefacts`), { timeout: 20_000 });
    expect(new URL(page.url()).pathname, 'must not have bounced to landing').not.toBe('/');
    expect(errors).toEqual([]);

    await collectCoverage(context);
    await context.close();
});
