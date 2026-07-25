import { test, expect, loginToken, API } from './fixtures';
import { execSync } from 'child_process';

// End-to-end collaboration flow (register -> activate -> invite -> accept -> gain access ->
// revoke). Driven at the API level because it spans two users and email tokens; the tokens
// (normally emailed) are read straight from the dev DB via `docker exec`, consistent with the
// rest of the suite running against the local stack (localhost:5000 + the SQE_Database container).

function db(sql: string): string {
    return execSync(
        `docker exec SQE_Database mysql -usqe_user -pmysecretpw -N -e "${sql}" SQE 2>/dev/null`
    ).toString().trim();
}

function permissionOf(body: any) {
    // GET /v1/editions/{id} -> { primary: { permission }, others: [...] }
    return (body.primary ?? body.edition ?? body).permission;
}

test('collaboration: invite a second user -> they accept and gain access -> revoke write', async ({ playwright }) => {
    const req = await playwright.request.newContext();
    const aAuth = { Authorization: `Bearer ${await loginToken(req)}` }; // test@1.com = admin/owner

    // 1) Register user B (unique email so the test is repeatable).
    const bEmail = `collab-b-${Date.now()}@test.local`;
    const bPw = 'test';
    const reg = await req.post(`${API}/v1/users`, {
        data: { email: bEmail, password: bPw, forename: 'Col', surname: 'Lab', organization: '' },
    });
    expect(reg.ok(), `register B (${reg.status()})`).toBeTruthy();

    // 2) Activate B using the activation token from the DB (email is disabled in dev).
    const actToken = db(
        `SELECT t.token FROM user_email_token t JOIN user u ON u.user_id=t.user_id ` +
        `WHERE u.email='${bEmail}' AND t.type='ACTIVATE_ACCOUNT' ORDER BY t.date_created DESC LIMIT 1`
    );
    expect(actToken, 'activation token in DB').toMatch(/[0-9a-f-]{36}/);
    const act = await req.post(`${API}/v1/users/confirm-registration`, { data: { token: actToken } });
    expect(act.ok(), `activate B (${act.status()})`).toBeTruthy();

    const bAuth = { Authorization: `Bearer ${await loginToken(req, { email: bEmail, password: bPw })}` };

    // 3) A creates an edition and B has no access to it yet.
    const ed = Number(((await (await req.post(`${API}/v1/editions/899`, { headers: aAuth, data: { name: `pw-collab-${Date.now()}` } })).text()).match(/"id":\s*(\d+)/) || [])[1]);
    expect((await req.get(`${API}/v1/editions/${ed}`, { headers: bAuth })).status(), 'B blocked before accepting').not.toBe(200);

    // 4) A invites B with write access.
    const invite = await req.post(`${API}/v1/editions/${ed}/add-editor-request`, {
        headers: aAuth,
        data: { email: bEmail, mayRead: true, mayWrite: true, isAdmin: false, mayLock: false },
    });
    expect(invite.ok(), `invite B (${invite.status()})`).toBeTruthy();

    // 5) B accepts using the invitation token from the DB.
    const inviteToken = db(
        `SELECT r.token FROM edition_editor_request r JOIN user u ON u.user_id=r.editor_user_id ` +
        `WHERE u.email='${bEmail}' AND r.edition_id=${ed} LIMIT 1`
    );
    expect(inviteToken, 'invite token in DB').toMatch(/[0-9a-f-]{36}/);
    const accept = await req.post(`${API}/v1/editions/confirm-editorship/${inviteToken}`, { headers: bAuth });
    expect(accept.ok(), `B accepts (${accept.status()})`).toBeTruthy();

    // 6) B now sees the edition with write permission, and it appears in B's edition list.
    const bView = await req.get(`${API}/v1/editions/${ed}`, { headers: bAuth });
    expect(bView.status(), 'B can read after accepting').toBe(200);
    expect(permissionOf(await bView.json())?.mayWrite, 'B has write').toBeTruthy();

    // 7) A revokes B's write access; B drops to read-only.
    const revoke = await req.put(`${API}/v1/editions/${ed}/editors/${bEmail}`, {
        headers: aAuth,
        data: { mayRead: true, mayWrite: false, isAdmin: false, mayLock: false },
    });
    expect(revoke.ok(), `revoke write (${revoke.status()})`).toBeTruthy();
    expect(permissionOf(await (await req.get(`${API}/v1/editions/${ed}`, { headers: bAuth })).json())?.mayWrite, 'B write revoked').toBeFalsy();

    // cleanup: A archives the edition
    const del1: any = await (await req.delete(`${API}/v1/editions/${ed}?optional=archiveForAllEditors`, { headers: aAuth })).json().catch(() => ({}));
    if (del1?.token) await req.delete(`${API}/v1/editions/${ed}?optional=archiveForAllEditors&token=${del1.token}`, { headers: aAuth });
    await req.dispose();
});
