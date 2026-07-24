import { test, expect, loginToken, authedContext, collectCoverage, API } from './fixtures';

// Closes the API-COVERAGE gap for edition.confirmAddEditionEditor (POST
// /v1/editions/confirm-editorship/{token}): the invitee accepts an editorship through the
// real /accept-invitation/token/:token page's Confirm button, not via page.request.

const SOURCE_EDITION = 811;
const COLLABORATOR = { email: 'test@2.com', password: 'test' };

let ownerToken: string;

test.beforeAll(async ({ playwright }) => {
    const req = await playwright.request.newContext();
    ownerToken = await loginToken(req);
    await req.dispose();
});

test('confirm-invitation: the invitee accepts an editorship via the Confirm button', async ({ browser }) => {
    const ownerCtx = await authedContext(browser, ownerToken);
    const auth = { Authorization: `Bearer ${ownerToken}` };

    // Owner copies an edition and invites test@2 (the add-editor-request 500s only on the
    // disabled dev SMTP send, but the request row is recorded).
    const ed = (
        await (
            await ownerCtx.request.post(`${API}/v1/editions/${SOURCE_EDITION}`, {
                headers: auth,
                data: { name: `pw-confirm-${Date.now()}` },
            })
        ).json()
    ).id as number;
    await ownerCtx.request
        .post(`${API}/v1/editions/${ed}/add-editor-request`, {
            headers: auth,
            data: { email: COLLABORATOR.email, mayRead: true, mayWrite: true, isAdmin: false },
        })
        .catch(() => undefined);

    try {
        // test@2 logs in and finds the pending invitation token.
        const collabToken = await loginToken(ownerCtx.request, COLLABORATOR);
        const invites = await (
            await ownerCtx.request.get(`${API}/v1/editions/editor-invitations`, {
                headers: { Authorization: `Bearer ${collabToken}` },
            })
        ).json();
        const inv = (invites.editorInvitations || []).find((i: { editionId: number }) => i.editionId === ed);
        expect(inv, 'the collaborator should have a pending invitation').toBeTruthy();

        // test@2 accepts through the real Confirm button.
        const collabCtx = await authedContext(browser, collabToken);
        const page = await collabCtx.newPage();
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));

        await page.goto(`/accept-invitation/token/${inv.token}`);
        const confirm = page.locator('button.btn-confirm');
        await expect(confirm).toBeEnabled({ timeout: 15_000 }); // enabled once the session is restored (isLogged)
        await confirm.click();

        // Server-side: test@2 is now a real share on the edition.
        await expect
            .poll(
                async () => {
                    const body = await (
                        await ownerCtx.request.get(`${API}/v1/editions/${ed}`, { headers: auth })
                    ).json();
                    const shares = (body.primary ?? body)?.shares ?? [];
                    return shares.some((s: { email: string }) => s.email === COLLABORATOR.email);
                },
                { timeout: 20_000 }
            )
            .toBe(true);

        expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
        await collectCoverage(collabCtx);
        await collabCtx.close();
    } finally {
        await ownerCtx.request
            .delete(`${API}/v1/editions/${ed}?optional=archiveForAllEditors`, { headers: auth })
            .catch(() => undefined);
        await ownerCtx.close();
    }
});
