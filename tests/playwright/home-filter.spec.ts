import { test, expect, loginToken, authedContext, collectCoverage, API } from './fixtures';
import type { Page } from '@playwright/test';

// HOME filter + sort now WORK (the search-bar prop was fixed to modelValue). These
// tests type into the personal/public filter, assert the shared store value
// ($state.misc.editionSearchBarValue.filter) updates and the rendered card list
// narrows, and that changing the sort select re-orders the list. Every page-loading
// test asserts zero pageerrors.

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

// Read the shared home search-bar value from the live app store.
async function searchBarValue(page: Page): Promise<Record<string, unknown> | null> {
    return page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const app = document.getElementById('app') as any;
        const st = app?.__vue_app__?.config?.globalProperties?.$state;
        return st?.misc?.editionSearchBarValue ?? null;
    });
}

// The visible filter input for whichever home tab is active.
function visibleFilter(page: Page) {
    return page.locator('#filter').filter({ visible: true }).first();
}
function visibleSort(page: Page) {
    return page.locator('select[name="sort"]').filter({ visible: true }).first();
}

test('typing in the personal filter updates $state.misc.editionSearchBarValue.filter and narrows the list', async ({
    browser,
}) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    const errors = trackPageErrors(page);

    try {
        await page.goto('/home/private');
        await expect(page.getByText(/currently working on/i)).toBeVisible({ timeout: 20_000 });

        // Wait for the personal cards to render.
        await expect
            .poll(async () => page.locator('.edition-card-grid').count(), { timeout: 20_000 })
            .toBeGreaterThan(1);
        const before = await page.locator('.edition-card-grid').count();

        // Take a token from the first card's name to filter on it.
        const firstName = (await page.locator('.edition-card-grid .card-title').first().innerText()).trim();
        const term = firstName.split(/\s+/)[0];
        expect(term.length).toBeGreaterThan(0);

        const filter = visibleFilter(page);
        await filter.fill(term);

        // The shared store's filter value reflects what we typed.
        await expect
            .poll(async () => (await searchBarValue(page))?.filter, { timeout: 10_000 })
            .toBe(term);

        // The rendered card list narrows (never grows) and every remaining card name
        // contains the filter term.
        await expect
            .poll(async () => page.locator('.edition-card-grid').count(), { timeout: 15_000 })
            .toBeLessThanOrEqual(before);
        const names = await page.locator('.edition-card-grid .card-title').allInnerTexts();
        expect(names.length).toBeGreaterThan(0);
        for (const n of names) {
            expect(n.toLowerCase()).toContain(term.toLowerCase());
        }

        expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
    } finally {
        await collectCoverage(context);
        await context.close();
    }
});

test('a filter that matches nothing empties the personal list, and clearing it restores the cards', async ({
    browser,
}) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    const errors = trackPageErrors(page);

    try {
        await page.goto('/home/private');
        await expect(page.getByText(/currently working on/i)).toBeVisible({ timeout: 20_000 });
        await expect
            .poll(async () => page.locator('.edition-card-grid').count(), { timeout: 20_000 })
            .toBeGreaterThan(0);

        const filter = visibleFilter(page);
        const noMatch = 'zzz-no-such-edition-zzz-' + Date.now();
        await filter.fill(noMatch);

        await expect
            .poll(async () => (await searchBarValue(page))?.filter, { timeout: 10_000 })
            .toBe(noMatch);
        // No card should survive an impossible filter.
        await expect
            .poll(async () => page.locator('.edition-card-grid').count(), { timeout: 15_000 })
            .toBe(0);

        // Clearing the filter brings the cards back.
        await filter.fill('');
        await expect
            .poll(async () => page.locator('.edition-card-grid').count(), { timeout: 15_000 })
            .toBeGreaterThan(0);

        expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
    } finally {
        await collectCoverage(context);
        await context.close();
    }
});

test('changing the personal sort select from Date to Name re-orders the cards', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    const errors = trackPageErrors(page);

    try {
        await page.goto('/home/private');
        await expect(page.getByText(/currently working on/i)).toBeVisible({ timeout: 20_000 });
        await expect
            .poll(async () => page.locator('.edition-card-grid').count(), { timeout: 20_000 })
            .toBeGreaterThan(2);

        const sort = visibleSort(page);
        // Default sort is by lastEdit (Date). Capture the top card names.
        const topByDate = (await page.locator('.edition-card-grid .card-title').allInnerTexts()).slice(0, 8).join('|');

        await sort.selectOption('name');
        await expect
            .poll(async () => (await searchBarValue(page))?.sort, { timeout: 10_000 })
            .toBe('name');

        // Sorting by name yields alphabetical order — confirm the rendered order
        // changed and is actually sorted.
        await expect
            .poll(
                async () => (await page.locator('.edition-card-grid .card-title').allInnerTexts()).slice(0, 8).join('|'),
                { timeout: 15_000 }
            )
            .not.toBe(topByDate);

        const namesNow = (await page.locator('.edition-card-grid .card-title').allInnerTexts())
            .slice(0, 8)
            .map((s) => s.trim());
        const sortedCopy = [...namesNow].sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
        );
        expect(namesNow).toEqual(sortedCopy);

        // Switching back to Date updates the store again.
        await sort.selectOption('lastEdit');
        await expect
            .poll(async () => (await searchBarValue(page))?.sort, { timeout: 10_000 })
            .toBe('lastEdit');

        expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
    } finally {
        await collectCoverage(context);
        await context.close();
    }
});

test('typing in the public filter updates the store and narrows the public card list', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    const errors = trackPageErrors(page);

    try {
        await page.goto('/home/public');
        await page.getByRole('tab', { name: /public/i }).click();
        await expect(page.getByText(/published in the scrollery/i)).toBeVisible({ timeout: 20_000 });

        const cards = page.locator('#public-list .edition-public-grid');
        await expect.poll(async () => cards.count(), { timeout: 20_000 }).toBeGreaterThan(5);

        // The public source editions are named like "1Q9". Filter on a common token.
        const term = '1Q';
        const filter = visibleFilter(page);
        await filter.fill(term);

        await expect
            .poll(async () => (await searchBarValue(page))?.filter, { timeout: 10_000 })
            .toBe(term);

        // Every rendered public card title now contains the filter term.
        await expect
            .poll(async () => {
                const titles = await page.locator('#public-list .card-title').allInnerTexts();
                return titles.length > 0 && titles.every((t) => t.toLowerCase().includes(term.toLowerCase()));
            }, { timeout: 15_000 })
            .toBe(true);

        expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
    } finally {
        await collectCoverage(context);
        await context.close();
    }
});

test('changing the public sort select updates the store and keeps public cards rendered', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    const errors = trackPageErrors(page);

    try {
        await page.goto('/home/public');
        await page.getByRole('tab', { name: /public/i }).click();
        await expect(page.getByText(/published in the scrollery/i)).toBeVisible({ timeout: 20_000 });

        const cards = page.locator('#public-list .edition-public-grid');
        await expect.poll(async () => cards.count(), { timeout: 20_000 }).toBeGreaterThan(5);

        // Default order is already name-like (1Q1, 1Q2, …), so sorting by name is a
        // no-op on the visible order; we assert the store records the choice and the
        // list stays rendered, then switch back to Date and confirm the store again.
        const sort = visibleSort(page);
        await sort.selectOption('name');
        await expect
            .poll(async () => (await searchBarValue(page))?.sort, { timeout: 10_000 })
            .toBe('name');
        await expect.poll(async () => cards.count(), { timeout: 15_000 }).toBeGreaterThan(0);

        await sort.selectOption('lastEdit');
        await expect
            .poll(async () => (await searchBarValue(page))?.sort, { timeout: 10_000 })
            .toBe('lastEdit');
        await expect.poll(async () => cards.count(), { timeout: 15_000 }).toBeGreaterThan(0);

        expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
    } finally {
        await collectCoverage(context);
        await context.close();
    }
});
