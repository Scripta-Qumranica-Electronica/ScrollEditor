import { test, expect, loginToken, authedContext, collectCoverage, API } from './fixtures';
import type { BrowserContext, Page } from '@playwright/test';

// permission-modal — the "remove a collaborator" flow that edition-modals.spec.ts
// (invite-only) never reaches: a REAL share is established (test@1 invites test@2,
// who accepts via the API), then the Shares row is driven through the modal's own
// UI — change the permission select to "None", which flips the row to a "Revoke"
// button, and click it. That runs setRowShareStatus() -> update() ->
// updateSharePermissions(), the previously-uncovered share branches. The revoke is
// verified server-side (the collaborator's rights are cleared). Runs on a throwaway
// copy of edition 811.

const SOURCE_EDITION = 811;
const COLLABORATOR = 'test@2.com';

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

// Read the edition's current shares from the API.
async function shares(ctx: BrowserContext, ed: number): Promise<Array<{ email: string; mayRead: boolean; mayWrite: boolean; isAdmin: boolean }>> {
    const res = await ctx.request.get(`${API}/v1/editions/${ed}`, { headers: authHeader() });
    const body = await res.json().catch(() => null);
    const primary = body?.primary ?? body;
    return primary?.shares ?? [];
}

test('permission-modal: revoking a collaborator (None -> Revoke -> Update) clears their rights', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const ed = await createEdition(context, `pw-permrm-${Date.now()}`);
    const page = await context.newPage();
    const errors = trackPageErrors(page);

    try {
        // --- Establish a REAL share: test@1 invites test@2, who accepts via the API. ---
        // The add-editor-request 500s only on the disabled dev SMTP send, but records
        // the editor request; catch is fine since we assert the accepted share below.
        await context.request
            .post(`${API}/v1/editions/${ed}/add-editor-request`, {
                headers: authHeader(),
                data: { email: COLLABORATOR, mayRead: true, mayWrite: true, isAdmin: false },
            })
            .catch(() => undefined);

        // test@2 finds the pending invitation token and confirms editorship.
        const collabToken = await loginToken(context.request, { email: COLLABORATOR, password: 'test' });
        const invites = await (
            await context.request.get(`${API}/v1/editions/editor-invitations`, {
                headers: { Authorization: `Bearer ${collabToken}` },
            })
        ).json();
        const inv = (invites.editorInvitations || []).find((i: { editionId: number }) => i.editionId === ed);
        expect(inv, 'the collaborator should have a pending invitation for this edition').toBeTruthy();
        const accept = await context.request.post(`${API}/v1/editions/confirm-editorship/${inv.token}`, {
            headers: { Authorization: `Bearer ${collabToken}` },
        });
        expect(accept.ok(), 'confirm-editorship should succeed').toBeTruthy();

        // The collaborator is now a real share with read+write rights.
        await expect
            .poll(async () => (await shares(context, ed)).some((s) => s.email === COLLABORATOR && s.mayWrite), { timeout: 15_000 })
            .toBe(true);

        // --- Now drive the REMOVE through the modal UI. ---
        await page.goto(`/editions/${ed}`);
        await page.getByRole('button', { name: /collaborators/i }).click();

        const modal = page.locator('#permissionModal');
        await expect(modal).toBeVisible({ timeout: 15_000 });

        // The Shares card lists the collaborator (fillShareRows). Locate their row —
        // the row for the current user (test@1) has a DISABLED select, so scope to the
        // list-group-item that holds the collaborator's email and an ENABLED select.
        const collabRow = modal
            .locator('.list-group-item', { hasText: COLLABORATOR })
            .filter({ has: page.locator('select:not([disabled])') })
            .first();
        await expect(collabRow).toBeVisible({ timeout: 15_000 });

        // Change this row's permission select to "None". The b-form-select v-model
        // updates share.permission, but bootstrap-vue-next's @change (which carries the
        // option OBJECT) isn't emitted by a native selectOption, so also drive the pane's
        // setRowShareStatus handler — the exact code @change is bound to — which flips the
        // row's button to "Revoke" and enables it.
        await collabRow.locator('select').selectOption('none');
        expect(
            await page.evaluate((email) => {
                const el = document.querySelector('#permissionModal');
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let cur: any = (el as any)?.__vueParentComponent;
                while (cur && (!cur.ctx || typeof cur.ctx.setRowShareStatus !== 'function')) cur = cur.parent;
                if (!cur) return false;
                const p = cur.proxy || cur.ctx;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const row = p.sharesRows.find((r: any) => r.email === email);
                if (!row) return false;
                row.permission = 'none';
                p.setRowShareStatus(row);
                return true;
            }, COLLABORATOR)
        ).toBe(true);

        const revokeBtn = collabRow.getByRole('button', { name: /revoke/i });
        await expect(revokeBtn).toBeVisible({ timeout: 10_000 });
        await expect(revokeBtn).toBeEnabled();

        // Click Revoke -> update() -> updateSharePermissions() PUTs none-permissions.
        await revokeBtn.click();

        // Server-side the collaborator's rights are cleared (revoked).
        await expect
            .poll(
                async () => {
                    const s = (await shares(context, ed)).find((x) => x.email === COLLABORATOR);
                    // Either the share is gone, or it remains with all rights cleared.
                    return !s || (!s.mayRead && !s.mayWrite && !s.isAdmin);
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
