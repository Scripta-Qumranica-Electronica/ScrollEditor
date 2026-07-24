import { test, expect, loginToken, authedContext, collectCoverage } from './fixtures';
import type { Page } from '@playwright/test';

// Deep coverage of the SEARCH area (src/views/search/**): the search form,
// results accordion, and each result-type component (editions / imaged-objects /
// text-fragments / artefacts). All read-only — search never mutates anything.

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

// Run a text-designation (manuscript/edition) search from the form.
async function runEditionSearch(page: Page, designation: string) {
    // The Edition row is the first text input in the form (form.vue).
    const editionInput = page.getByPlaceholder(/Manuscript\/text number/i);
    await editionInput.fill(designation);
    await page.getByRole('button', { name: /^Search$/i }).click();
}

test('the search page mounts with an empty, disabled-until-input form', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    const errors = trackPageErrors(page);

    await page.goto('/search');
    // All four search fields render.
    await expect(page.getByPlaceholder(/Manuscript\/text number/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByPlaceholder(/IAA-Plate/i)).toBeVisible();
    await expect(page.getByPlaceholder(/portion of text/i)).toBeVisible();
    await expect(page.getByPlaceholder(/manuscript fragment/i)).toBeVisible();

    // With no input the Search button is disabled (noSearch computed).
    const searchBtn = page.getByRole('button', { name: /^Search$/i });
    await expect(searchBtn).toBeDisabled();

    // Typing a designation enables it.
    await page.getByPlaceholder(/Manuscript\/text number/i).fill('1Q9');
    await expect(searchBtn).toBeEnabled();

    expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
    await collectCoverage(context);
    await context.close();
});

test('a manuscript search renders the edition-results accordion', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    const errors = trackPageErrors(page);

    await page.goto('/search');
    await runEditionSearch(page, '1Q9');

    // edition-results.vue renders an "Editions (N)" toggle header with N > 0.
    // The toggle <p> carries role="tab"; its text has a leading icon space.
    const header = page.getByRole('tab', { name: /Editions \(\d+\)/ });
    await expect(header).toBeVisible({ timeout: 20_000 });
    await expect(header).not.toHaveText(/Editions \(0\)/);

    // The results panel contains at least one edition-card (reused from home).
    await expect
        .poll(async () => page.locator('#edition-results-main .card-title').count(), { timeout: 20_000 })
        .toBeGreaterThan(0);

    expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
    await collectCoverage(context);
    await context.close();
});

test('the edition-results accordion collapses and expands on click', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();

    await page.goto('/search');
    await runEditionSearch(page, '1Q9');

    const header = page.getByRole('tab', { name: /Editions \(\d+\)/ });
    await expect(header).toBeVisible({ timeout: 20_000 });
    const firstCard = page.locator('#edition-results-main .card-title').first();
    // The results panel is rendered but collapsed by default; wait for the toggle target.
    await expect(firstCard).toBeAttached({ timeout: 20_000 });

    // Clicking the header expands the b-collapse panel.
    await header.click();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    // Clicking again collapses it.
    await header.click();
    await expect(firstCard).toBeHidden({ timeout: 10_000 });

    await collectCoverage(context);
    await context.close();
});

test('an imaged-object designation search renders the imaged-object-results', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    const errors = trackPageErrors(page);

    await page.goto('/search');
    // Search by IAA plate designation — returns imaged objects (imaged-object-results.vue).
    await page.getByPlaceholder(/IAA-Plate/i).fill('IAA-1093');
    await page.getByRole('button', { name: /^Search$/i }).click();

    const header = page.getByRole('tab', { name: /Imaged Objects \(\d+\)/ });
    await expect(header).toBeVisible({ timeout: 25_000 });
    await expect(header).not.toHaveText(/Imaged Objects \(0\)/);

    // Expand and assert the per-object rows render (each shows the imaged-object id).
    await header.click();
    await expect
        .poll(async () => page.locator('#imaged-object-results-main .image-id').count(), { timeout: 20_000 })
        .toBeGreaterThan(0);

    expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
    await collectCoverage(context);
    await context.close();
});

test('a search that matches nothing reports no results', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    const errors = trackPageErrors(page);

    await page.goto('/search');
    await runEditionSearch(page, 'zzz-no-such-edition-zzz');

    await expect(page.getByText(/Search returned no results/i)).toBeVisible({ timeout: 20_000 });

    expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
    await collectCoverage(context);
    await context.close();
});

test('navigating into an edition result opens that edition view', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();

    await page.goto('/search');
    await runEditionSearch(page, '1Q9');

    // Expand the (initially collapsed) Editions results panel first.
    const header = page.getByRole('tab', { name: /Editions \(\d+\)/ });
    await expect(header).toBeVisible({ timeout: 20_000 });
    await header.click();

    const firstCard = page.locator('#edition-results-main .edition-card-grid').first();
    await expect(firstCard).toBeVisible({ timeout: 20_000 });

    // edition-card's Edit button routes into the edition view (exact — "Copy Edition"
    // also contains "Edit").
    await firstCard.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.waitForURL(/\/editions\/\d+/, { timeout: 20_000 });
    // The edition view header renders its tab switch.
    await expect(page.getByRole('link', { name: /Artefacts/i })).toBeVisible({ timeout: 20_000 });

    await collectCoverage(context);
    await context.close();
});

test('the exact-match checkbox narrows a manuscript search', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    const errors = trackPageErrors(page);

    // This env's IIIF host serves an invalid cert, so result-card thumbnail loads retry
    // and slow the render. This test is about result COUNTS, not thumbnails — drop image
    // requests to keep it fast + stable.
    await page.route('**/*', (route) =>
        route.request().resourceType() === 'image' ? route.abort() : route.continue()
    );

    await page.goto('/search');

    // Loose "1Q7" matches a handful of editions (a LIKE '%1Q7%' over the whole editions
    // table — kept to a moderate term so the query + render stay fast even under DB load;
    // a broad term like "1Q" returns ~100 and its scan/render is flaky near the timeout).
    await runEditionSearch(page, '1Q7');
    const looseHeader = page.getByRole('tab', { name: /Editions \(\d+\)/ });
    await expect(looseHeader).toBeVisible({ timeout: 30_000 });
    const loose = Number((await looseHeader.innerText()).match(/\((\d+)\)/)?.[1] ?? '0');
    expect(loose).toBeGreaterThan(1);

    // Tick the Edition-row exact checkbox and re-run the SAME term: exact narrows it.
    await page.locator('input[type="checkbox"]').first().check();
    await page.getByPlaceholder(/Manuscript\/text number/i).fill('1Q7');
    await page.getByRole('button', { name: /^Search$/i }).click();

    // Exact "1Q7" should yield fewer editions than the loose "1Q7".
    await expect
        .poll(
            async () => {
                const t = await page
                    .getByRole('tab', { name: /Editions \(\d+\)/ })
                    .innerText()
                    .catch(() => 'Editions (0)');
                return Number(t.match(/\((\d+)\)/)?.[1] ?? '0');
            },
            { timeout: 30_000 }
        )
        .toBeLessThan(loose);

    expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
    await collectCoverage(context);
    await context.close();
});
