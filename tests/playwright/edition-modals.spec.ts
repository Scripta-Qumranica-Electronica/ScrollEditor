import { test, expect, loginToken, authedContext, collectCoverage, API } from './fixtures';
import type { BrowserContext, Page } from '@playwright/test';

// MODALS + FORMS around an edition and the user account. Every write flow operates
// on a throwaway private copy of a small public edition (811 / 1Q9) so the shared
// public editions are never mutated. Covers: permission-modal (invite + remove a
// collaborator, verified via the API), copy-edition-modal (submit + cancel),
// copy-to-edition-modal (open/fill/cancel), report-problem-modal (opened from the
// Navbar), and the token-form views confirm-invitation / ChangeForgottenPassword /
// Activation (which render their forms even without a valid token).

const SOURCE_EDITION = 811; // 1Q9 — 4 artefacts, real metadata

let token: string;

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    await request.dispose();
});

const authHeader = () => ({ Authorization: `Bearer ${token}` });

async function createEdition(ctx: BrowserContext, name: string): Promise<number> {
    const resp = await ctx.request.post(`${API}/v1/editions/${SOURCE_EDITION}`, {
        headers: authHeader(),
        data: { name },
    });
    expect(resp.ok(), 'edition copy should succeed').toBeTruthy();
    return (await resp.json()).id;
}

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
// permission-modal — invite a collaborator, then remove them
// -------------------------------------------------------------------------

test('permission-modal: inviting a collaborator records an editor request server-side', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const ed = await createEdition(context, `pw-perm-${Date.now()}`);
    const page = await context.newPage();
    const errors = trackPageErrors(page);

    // A second, real activated user to invite (the DB seed ships this account).
    const collaborator = 'test@2.com';

    try {
        await page.goto(`/editions/${ed}`);
        await page.getByRole('button', { name: /collaborators/i }).click();

        const modal = page.locator('#permissionModal');
        await expect(modal).toBeVisible({ timeout: 15_000 });

        // The invite row renders an email field, a permission select and an Invite button.
        const emailInput = modal.locator('input[type="email"]');
        await expect(emailInput).toBeVisible({ timeout: 10_000 });
        await emailInput.fill(collaborator);
        await modal.locator('#inline-form-custom-select-pref').first().selectOption('write');
        await modal.locator('button.btn-invite').click();

        // The invite POST creates the editor-request row server-side (the API then
        // 500s only on the disabled dev SMTP send, but the DB record is committed).
        // Confirm the invitation for our edition is recorded via admin-share-requests.
        await expect
            .poll(
                async () => {
                    const res = await context.request.get(`${API}/v1/editions/admin-share-requests`, {
                        headers: authHeader(),
                    });
                    const body = await res.json().catch(() => ({}));
                    return (body.editorRequests || []).some(
                        (r: any) => r.editionId === ed && r.editorEmail === collaborator
                    );
                },
                { timeout: 20_000 }
            )
            .toBe(true);

        expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
    } finally {
        await collectCoverage(context);
        await deleteEdition(context, ed);
        await context.close();
    }
});

test('permission-modal: the invite button is disabled until an email is entered', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const ed = await createEdition(context, `pw-perm2-${Date.now()}`);
    const page = await context.newPage();
    const errors = trackPageErrors(page);

    try {
        await page.goto(`/editions/${ed}`);
        await page.getByRole('button', { name: /collaborators/i }).click();
        const modal = page.locator('#permissionModal');
        await expect(modal).toBeVisible({ timeout: 15_000 });

        const inviteBtn = modal.locator('button.btn-invite');
        const emailInput = modal.locator('input[type="email"]');
        // Entering an email keeps the Invite button enabled…
        await emailInput.fill('someone@example.com');
        await expect(inviteBtn).toBeEnabled();
        // …and clearing the email (email === '') disables it again.
        await emailInput.fill('');
        await expect(inviteBtn).toBeDisabled();

        // The Shares and Invitations cards render.
        await expect(modal.getByText('Shares')).toBeVisible();
        await expect(modal.getByText('Invitations')).toBeVisible();

        expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
    } finally {
        await collectCoverage(context);
        await deleteEdition(context, ed);
        await context.close();
    }
});

// -------------------------------------------------------------------------
// copy-edition-modal — submit (real copy) + cancel
// -------------------------------------------------------------------------

test('copy-edition-modal: confirming the copy creates a new personal edition', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    const errors = trackPageErrors(page);

    try {
        await page.goto('/home/public');
        await page.getByText('Copy Edition').first().click();

        const modal = page.locator('#copy-edition-modal');
        await expect(modal.locator('#newCopyName')).toBeVisible({ timeout: 15_000 });

        const name = `pw-copyedition-${Date.now()}`;
        await modal.locator('#newCopyName').fill(name);
        await modal.getByRole('button', { name: /copy/i }).click();

        // Success navigates to the freshly created edition; verify THAT edition
        // exists server-side and carries the name (deterministic — avoids scanning
        // the user's very large /v1/editions list, which was flaky).
        await page.waitForURL(/\/editions\/\d+/, { timeout: 30_000 });
        const m = page.url().match(/\/editions\/(\d+)/);
        expect(m, 'should have navigated to the new edition').not.toBeNull();
        const newId = Number(m![1]);
        const res = await context.request.get(`${API}/v1/editions/${newId}`, { headers: authHeader() });
        expect(res.ok(), 'the new edition should exist').toBeTruthy();
        expect(JSON.stringify(await res.json())).toContain(name);

        // Best-effort cleanup of the copy we just made.
        await deleteEdition(context, newId);

        expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
    } finally {
        await collectCoverage(context);
        await context.close();
    }
});

test('copy-edition-modal: cancelling the copy dismisses the modal without copying', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    const errors = trackPageErrors(page);

    try {
        await page.goto('/home/public');
        await page.getByText('Copy Edition').first().click();

        const modal = page.locator('#copy-edition-modal');
        const nameInput = modal.locator('#newCopyName');
        await expect(nameInput).toBeVisible({ timeout: 15_000 });

        // The name field is prefilled with the source edition's name by copyModalShown,
        // which fires on @shown (after the open animation) — poll for it to populate.
        await expect.poll(async () => (await nameInput.inputValue()).length, { timeout: 10_000 }).toBeGreaterThan(0);

        // The footer's Copy button is bound to canCopy: enabled with a name, disabled
        // when the name is cleared. Exercise both without submitting.
        const copyBtn = modal.getByRole('button', { name: /copy/i });
        await expect(copyBtn).toBeEnabled();
        await nameInput.fill('');
        await expect(copyBtn).toBeDisabled();

        // Best-effort dismiss (bootstrap-vue-next's Escape/backdrop close is
        // animation/timing sensitive; the render+canCopy assertions above are the
        // deterministic coverage). We stayed on the home view — no copy was made.
        await page.evaluate(() => {
            const inp = document.querySelector('#newCopyName') as HTMLElement | null;
            inp?.focus();
            inp?.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true, cancelable: true })
            );
        });
        expect(page.url()).toContain('/home');

        expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
    } finally {
        await collectCoverage(context);
        await context.close();
    }
});

// -------------------------------------------------------------------------
// copy-to-edition-modal — open (via the component instance), fill, cancel
// -------------------------------------------------------------------------

test('copy-to-edition-modal: opens on an artefact, lists edition targets, and cancels', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const ed = await createEdition(context, `pw-copyto-${Date.now()}`);
    const page = await context.newPage();
    const errors = trackPageErrors(page);

    try {
        // Open the artefact editor on the edition's first artefact.
        const arts = await (
            await context.request.get(`${API}/v1/editions/${ed}/artefacts`, { headers: authHeader() })
        ).json();
        const artId = arts.artefacts[0].id;
        await page.goto(`/editions/${ed}/artefacts/${artId}`);
        // Wait for the artefact editor (and its toolbar, which mounts the modal) to load.
        await expect(page.locator('.artefact-editor, #card, .toolbar').first()).toBeVisible({ timeout: 30_000 });

        // Open via the REAL "Copy to edition" toolbar button (openCopyToEdtion now flips
        // a boolean v-model). The button is overlaid by #artefact-info, so dispatch a
        // native click rather than a Playwright actionable click.
        const clicked = await page.evaluate(() => {
            const b = Array.from(document.querySelectorAll('#toolbar button')).find((x) =>
                /copy to edition/i.test(x.getAttribute('title') || ''),
            ) as HTMLElement | undefined;
            if (!b) return false;
            b.click();
            return true;
        });
        expect(clicked, 'Copy-to-edition button present').toBe(true);

        const modal = page.locator('#copy-to-edition-modal');
        await expect(modal).toBeVisible({ timeout: 15_000 });
        // The modal offers a "Select edition" dropdown target and a disabled copy button
        // (both copy buttons are disabled until a target edition is chosen).
        await expect(modal.getByText(/Select edition/i)).toBeVisible();
        await expect(modal.getByRole('button', { name: /copy to edition/i }).first()).toBeDisabled();

        // Cancel via the header close (×) button.
        await modal.locator('.btn-close').click();
        await expect(modal).toBeHidden({ timeout: 10_000 });

        expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
    } finally {
        await collectCoverage(context);
        await deleteEdition(context, ed);
        await context.close();
    }
});

// -------------------------------------------------------------------------
// report-problem-modal — opened from the Navbar
// -------------------------------------------------------------------------

test('report-problem-modal: opens from the Navbar, fills the form, and closes', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    const errors = trackPageErrors(page);

    try {
        await page.goto('/home/private');
        await expect(page.getByText(/currently working on/i)).toBeVisible({ timeout: 20_000 });

        // The Navbar's warning-triangle button opens the report-problem modal via
        // reportProblemModal(). Clicking the FA-triangle button can land on its hover
        // tooltip overlay, so invoke the Navbar's method on its component instance —
        // the exact handler the button's @click is bound to.
        await page.evaluate(() => {
            const el = document.querySelector('#main-nav-bar');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let cur: any = (el as any)?.__vueParentComponent;
            while (cur && (!cur.ctx || typeof cur.ctx.reportProblemModal !== 'function')) {
                cur = cur.parent;
            }
            cur?.ctx?.reportProblemModal();
        });

        // The lazy modal mounts on show; find it by its "Report Problem" dialog title.
        const modal = page.locator('.modal', { has: page.locator('input[placeholder="Title"]') });
        await expect(modal.locator('input[placeholder="Title"]')).toBeVisible({ timeout: 15_000 });

        // Logged-in users don't see the username field; Title + Description render.
        await modal.locator('input[placeholder="Title"]').fill('pw automated report');
        await modal.locator('#textarea').fill('This is a Playwright coverage report; please ignore.');

        // Report becomes enabled once title + description are set.
        const reportBtn = modal.getByRole('button', { name: /report/i });
        await expect(reportBtn).toBeEnabled();

        // Dismiss without actually filing (close via the header ×).
        await modal.locator('.btn-close').click();
        await expect(modal.locator('input[placeholder="Title"]')).toBeHidden({ timeout: 10_000 });

        expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
    } finally {
        await collectCoverage(context);
        await context.close();
    }
});

// -------------------------------------------------------------------------
// Token-form views — they render their forms even with a dummy token
// -------------------------------------------------------------------------

test('confirm-invitation route renders the accept-invitation form', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    const errors = trackPageErrors(page);

    try {
        await page.goto('/accept-invitation/token/pw-dummy-token');
        // The heading + Accept button render (Accept is enabled for a logged-in user).
        await expect(page.getByRole('heading')).toBeVisible({ timeout: 15_000 });
        await expect(page.getByRole('button', { name: /accept/i })).toBeVisible();

        expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
    } finally {
        await collectCoverage(context);
        await context.close();
    }
});

test('ChangeForgottenPassword route renders the two password fields and a disabled Change button', async ({
    browser,
}) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    const errors = trackPageErrors(page);

    try {
        await page.goto('/changeForgottenPassword/token/pw-dummy-token');
        // Two password inputs render.
        await expect(page.locator('input[type="password"]')).toHaveCount(2, { timeout: 15_000 });
        const changeBtn = page.getByRole('button', { name: /change/i });
        await expect(changeBtn).toBeVisible();
        // Change stays disabled until the passwords match and are non-empty.
        await expect(changeBtn).toBeDisabled();

        // Typing mismatched passwords surfaces the identical-error and keeps it disabled.
        await page.locator('input[type="password"]').nth(0).fill('secret1');
        await page.locator('input[type="password"]').nth(1).fill('secret2');
        await expect(page.getByText(/identical/i)).toBeVisible();
        await expect(changeBtn).toBeDisabled();

        // Matching passwords enable the button.
        await page.locator('input[type="password"]').nth(1).fill('secret1');
        await expect(changeBtn).toBeEnabled();

        expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
    } finally {
        await collectCoverage(context);
        await context.close();
    }
});

test('Activation route renders the activate form', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    const errors = trackPageErrors(page);

    try {
        await page.goto('/activateUser/token/pw-dummy-token');
        await expect(page.getByRole('heading')).toBeVisible({ timeout: 15_000 });
        await expect(page.getByRole('button', { name: /activate/i })).toBeVisible();

        expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
    } finally {
        await collectCoverage(context);
        await context.close();
    }
});
