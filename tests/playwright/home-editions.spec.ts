import { test, expect, loginToken, authedContext, collectCoverage, API } from './fixtures';
import type { Browser, BrowserContext, Page } from '@playwright/test';

// Deep coverage of the HOME list and the EDITION-VIEW areas. Every write flow
// operates on a private copy of a small public edition (1Q9 / 811: 4 artefacts,
// 2 imaged objects, real catalogue metadata) so the shared public editions are
// never mutated. Each test creates its own copy and archives it on teardown.

// A public source edition that is small enough to copy quickly yet still has
// artefacts, imaged objects AND catalogue metadata — exactly what the edition
// view components need to render real content.
const SOURCE_EDITION = 811; // 1Q9 / Ezekiel

let token: string;

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    await request.dispose();
});

const authHeader = () => ({ Authorization: `Bearer ${token}` });

// Create a private, writable copy of the small public source edition.
async function createEdition(ctx: BrowserContext, name: string): Promise<number> {
    const resp = await ctx.request.post(`${API}/v1/editions/${SOURCE_EDITION}`, {
        headers: authHeader(),
        data: { name },
    });
    expect(resp.ok(), 'edition copy should succeed').toBeTruthy();
    return (await resp.json()).id;
}

// Archive an owned edition so we never accumulate junk in the shared DB.
async function deleteEdition(ctx: BrowserContext, id: number): Promise<void> {
    await ctx.request
        .delete(`${API}/v1/editions/${id}?optional=archiveForAllEditors`, { headers: authHeader() })
        .catch(() => undefined);
}

function trackPageErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    return errors;
}

// -------------------------------------------------------------------------
// HOME — personal vs public tabs, filter, sort, cards
// -------------------------------------------------------------------------

test('home shows both the personal and public tabs for a logged-in user', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    const errors = trackPageErrors(page);

    await page.goto('/home/private');
    // Personal-editions header text (personal-editions.vue).
    await expect(page.getByText(/currently working on/i)).toBeVisible({ timeout: 15_000 });

    // Two tabs render (personal + public); switch to public.
    const publicTab = page.getByRole('tab', { name: /public/i });
    await publicTab.click();
    await expect(page.getByText(/published in the scrollery/i)).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/home\/public/);

    // Back to personal.
    await page.getByRole('tab', { name: /personal/i }).click();
    await expect(page).toHaveURL(/\/home\/private/);
    await expect(page.getByText(/currently working on/i)).toBeVisible();

    expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
    await collectCoverage(context);
    await context.close();
});

// Read the shared home search-bar value from the live app store.
async function editionSearchBarValue(page: Page): Promise<Record<string, unknown> | null> {
    return page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const app = document.getElementById('app') as any;
        const st = app?.__vue_app__?.config?.globalProperties?.$state;
        return st?.misc?.editionSearchBarValue ?? null;
    });
}

test('the public list renders public edition cards with View and Copy actions', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    const errors = trackPageErrors(page);

    await page.goto('/home/public');
    await page.getByRole('tab', { name: /public/i }).click();
    await expect(page.getByText(/published in the scrollery/i)).toBeVisible({ timeout: 15_000 });

    // The virtualised public list (edition-public-list -> edition-public-row ->
    // edition-public-card) renders a windowed set of cards. Each card carries a
    // title and both a View and a Copy Edition action.
    const publicCards = page.locator('#public-list .edition-public-grid');
    await expect.poll(async () => publicCards.count(), { timeout: 15_000 }).toBeGreaterThan(5);

    const firstCard = publicCards.first();
    await expect(firstCard.locator('.card-title')).toBeVisible();
    await expect(firstCard.getByRole('button', { name: /^View$/i })).toBeVisible();
    await expect(firstCard.getByRole('button', { name: 'Copy Edition', exact: true })).toBeVisible();

    // The public tab's own search-bar exposes the filter input and the sort select.
    const publicPane = page.locator('.tab-pane', { has: page.locator('#public-list') });
    await expect(publicPane.locator('#filter')).toBeVisible();
    await expect(publicPane.locator('select[name="sort"]')).toBeVisible();

    expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
    await collectCoverage(context);
    await context.close();
});

test('scrolling the virtualised public list swaps in further edition cards', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    const errors = trackPageErrors(page);

    await page.goto('/home/public');
    await page.getByRole('tab', { name: /public/i }).click();
    await expect(page.getByText(/published in the scrollery/i)).toBeVisible({ timeout: 15_000 });

    const list = page.locator('#public-list');
    await expect(list.locator('.edition-public-grid').first()).toBeVisible({ timeout: 15_000 });

    // Capture the top card names, scroll the virtual list, and confirm the rendered
    // window changes (edition-public-list re-windows on scroll).
    const topNamesBefore = (await list.locator('.card-title').allInnerTexts()).slice(0, 4).join('|');
    await list.evaluate((el) => (el.scrollTop = el.scrollHeight / 2));

    await expect
        .poll(
            async () => (await list.locator('.card-title').allInnerTexts()).slice(0, 4).join('|'),
            { timeout: 15_000 }
        )
        .not.toBe(topNamesBefore);

    expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
    await collectCoverage(context);
    await context.close();
});

test('the personal tab exposes the search-bar filter and sort controls', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    const errors = trackPageErrors(page);

    await page.goto('/home/private');
    await expect(page.getByText(/currently working on/i)).toBeVisible({ timeout: 15_000 });

    // The personal tab's search-bar renders a filter input and a Date/Name sort select.
    const filter = page.locator('#filter').filter({ visible: true }).first();
    const select = page.locator('select[name="sort"]').filter({ visible: true }).first();
    await expect(filter).toBeVisible();
    await expect(select).toBeVisible();
    // The sort select offers both Date and Name options.
    await expect(select.locator('option')).toHaveText([/Date/i, /Name/i]);

    // Changing the sort select is accepted (search-bar onSortChange) and leaves the
    // personal edition cards rendered.
    await select.selectOption('name');
    await expect(page.locator('.edition-card-grid').first()).toBeVisible({ timeout: 10_000 });
    await select.selectOption('lastEdit');
    await expect(page.locator('.edition-card-grid').first()).toBeVisible();

    // The read of the shared store (whatever its value) does not throw.
    expect(await editionSearchBarValue(page)).not.toBeNull();

    expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
    await collectCoverage(context);
    await context.close();
});

test('a personal edition renders in the Draft group with its card actions and cues', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const name = `pw-home-${Date.now()}`;
    const ed = await createEdition(context, name);
    const page = await context.newPage();
    const errors = trackPageErrors(page);

    try {
        await page.goto('/home/private');
        // The freshly copied (private) edition appears under the Draft group.
        const card = page.locator('.edition-card-grid', { hasText: name });
        await expect(card).toBeVisible({ timeout: 20_000 });

        // edition-card exposes Edit + "Copy Edition" buttons and a Draft status badge.
        await expect(card.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
        await expect(card.getByRole('button', { name: 'Copy Edition', exact: true })).toBeVisible();
        await expect(card.getByText('Draft')).toBeVisible();

        // Clicking Edit navigates to the edition view.
        await card.getByRole('button', { name: 'Edit', exact: true }).click();
        await page.waitForURL(new RegExp(`/editions/${ed}`), { timeout: 20_000 });

        expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
    } finally {
        await collectCoverage(context);
        await deleteEdition(context, ed);
        await context.close();
    }
});

test('the Copy Edition action on a personal card opens the copy modal', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const name = `pw-copymodal-${Date.now()}`;
    const ed = await createEdition(context, name);
    const page = await context.newPage();

    try {
        await page.goto('/home/private');
        const card = page.locator('.edition-card-grid', { hasText: name });
        await expect(card).toBeVisible({ timeout: 20_000 });

        await card.getByRole('button', { name: 'Copy Edition', exact: true }).click();
        const modal = page.locator('#copy-edition-modal');
        await expect(modal.locator('#newCopyName')).toBeVisible({ timeout: 10_000 });
        // The name field is prefilled with the source edition name.
        await expect(modal.locator('#newCopyName')).toHaveValue(name);
    } finally {
        await collectCoverage(context);
        await deleteEdition(context, ed);
        await context.close();
    }
});

// -------------------------------------------------------------------------
// EDITION VIEW — artefacts / imaged-objects tabs, cards, metadata modal
// -------------------------------------------------------------------------

test('the edition view renders the artefacts tab with artefact cards', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const ed = await createEdition(context, `pw-arts-${Date.now()}`);
    const page = await context.newPage();
    const errors = trackPageErrors(page);

    try {
        await page.goto(`/editions/${ed}/artefacts`);
        // The Artefacts / Imaged Objects switch renders with counts.
        await expect(page.getByRole('link', { name: /Artefacts/i })).toBeVisible({ timeout: 20_000 });

        // artefact-card renders one card per (non-virtual) artefact with a "<name> - <side>" label.
        await expect
            .poll(async () => page.locator('#card').count(), { timeout: 20_000 })
            .toBeGreaterThan(0);
        await expect(page.locator('.side-edition').first()).toBeVisible();

        // The artefacts search-bar filter is present (filter + side controls).
        await expect(page.locator('#filter')).toBeVisible();
        await expect(page.locator('select[name="side"]')).toBeVisible();

        expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
    } finally {
        await collectCoverage(context);
        await deleteEdition(context, ed);
        await context.close();
    }
});

test('switching to the imaged-objects tab renders imaged-object cards', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const ed = await createEdition(context, `pw-imgobj-${Date.now()}`);
    const page = await context.newPage();
    const errors = trackPageErrors(page);

    try {
        await page.goto(`/editions/${ed}/artefacts`);
        // The Artefacts / Imaged Objects switch lives in Edition.vue's .btns-groups.
        const imgTab = page.locator('.btns-groups a', { hasText: /Imaged Objects/i });
        await expect(imgTab).toBeVisible({ timeout: 20_000 });

        // Click the Imaged Objects tab (a router :to button).
        await imgTab.click();
        await page.waitForURL(/\/imaged-objects\/?$/, { timeout: 20_000 });

        // imaged-objects.vue renders <li class="list-item"> per imaged-object-card.
        await expect
            .poll(async () => page.locator('li.list-item').count(), { timeout: 20_000 })
            .toBeGreaterThan(0);
        // Each imaged-object-card carries the object name in a <label>.
        await expect(page.locator('li.list-item label').first()).toBeVisible();
        // The imaged-objects filter search-bar renders too.
        await expect(page.locator('#filter')).toBeVisible();

        expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
    } finally {
        await collectCoverage(context);
        await deleteEdition(context, ed);
        await context.close();
    }
});

test('filtering the artefacts list narrows the rendered artefact cards', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const ed = await createEdition(context, `pw-artfilter-${Date.now()}`);
    const page = await context.newPage();

    try {
        await page.goto(`/editions/${ed}/artefacts`);
        await expect.poll(async () => page.locator('#card').count(), { timeout: 20_000 }).toBeGreaterThan(0);
        const before = await page.locator('#card').count();

        // Grab the first artefact's label text and filter on a slice of it.
        const firstLabel = (await page.locator('.side-edition').first().innerText()).trim();
        const term = firstLabel.split(' ')[0]; // e.g. the artefact name token
        await page.locator('#filter').fill(term);

        // The list should not grow, and every remaining label should contain the term.
        await expect
            .poll(async () => page.locator('#card').count(), { timeout: 15_000 })
            .toBeLessThanOrEqual(before);
        const labels = await page.locator('.side-edition').allInnerTexts();
        expect(labels.length).toBeGreaterThan(0);
        for (const l of labels) {
            expect(l.toLowerCase()).toContain(term.toLowerCase());
        }
    } finally {
        await collectCoverage(context);
        await deleteEdition(context, ed);
        await context.close();
    }
});

test('the Manuscript Information (metadata) modal opens with catalogue fields', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const ed = await createEdition(context, `pw-meta-${Date.now()}`);
    const page = await context.newPage();
    const errors = trackPageErrors(page);

    try {
        await page.goto(`/editions/${ed}/artefacts`);
        await page.getByRole('button', { name: /Manuscript Information/i }).click();

        const modal = page.locator('#editionMetadataModal');
        await expect(modal).toBeVisible({ timeout: 15_000 });
        // The source edition (1Q9) has real catalogue metadata; the modal lists
        // labelled key/value rows including a Composition and a Copyright entry.
        await expect(modal.getByText(/Composition:/i).first()).toBeVisible();
        await expect(modal.getByText(/Copyright:/i)).toBeVisible();
        // Its title carries the edition name.
        await expect(modal.getByText(/Additional Information for Edition/i)).toBeVisible();

        // Close the modal via its header close button — it disappears.
        await modal.getByRole('button', { name: /close/i }).first().click();
        await expect(modal).toBeHidden({ timeout: 10_000 });

        expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
    } finally {
        await collectCoverage(context);
        await deleteEdition(context, ed);
        await context.close();
    }
});

test('an artefact can be renamed inline from its card popover', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const ed = await createEdition(context, `pw-rename-${Date.now()}`);
    const page = await context.newPage();

    try {
        await page.goto(`/editions/${ed}/artefacts`);
        await expect.poll(async () => page.locator('#card').count(), { timeout: 20_000 }).toBeGreaterThan(0);

        // Open the rename popover on the first artefact via right-click (openLineMenu).
        const firstLine = page.locator('span.line-name').first();
        await firstLine.click({ button: 'right' });

        const nameInput = page.locator('#newName').first();
        await expect(nameInput).toBeVisible({ timeout: 10_000 });

        const newName = `pw-renamed-${Date.now()}`;
        await nameInput.fill(newName);
        await page.getByRole('button', { name: /^Rename$/i }).first().click();

        // The rename hits the API; confirm the artefact's name changed server-side.
        await expect
            .poll(
                async () => {
                    const arts = await (
                        await context.request.get(`${API}/v1/editions/${ed}/artefacts`, {
                            headers: authHeader(),
                        })
                    ).json();
                    return (arts.artefacts || []).some((a: { name: string }) => a.name === newName);
                },
                { timeout: 15_000 }
            )
            .toBe(true);
    } finally {
        await collectCoverage(context);
        await deleteEdition(context, ed);
        await context.close();
    }
});
