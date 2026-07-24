import { request } from '@playwright/test';
import { API, TEST_USER } from './fixtures';

// Runs once after the whole suite. The specs each copy an edition (named `pw-*`,
// `layout-audit-*`, `route-coverage-*`, …) and best-effort delete it; failed/interrupted
// runs leak copies, and they accumulate across runs until `/v1/editions` returns thousands
// of rows — which slows anything that loads the full editions list (search results,
// `allEditions()`), degrading the API under the serial suite's load until specs' beforeAll
// logins start timing out. Sweeping the throwaway copies here keeps the dev DB lean.
//
// Single-owner editions can only be removed via the 2-step archiveForAllEditors flow
// (first DELETE returns a {token}, then repeat with &token=…).

const TEST_EDITION = /^(pw-|layout-audit-|route-coverage-)/;

export default async function globalTeardown() {
    let ctx;
    try {
        ctx = await request.newContext();
        const login = await ctx.post(`${API}/v1/users/login`, { data: TEST_USER });
        if (!login.ok()) return;
        const token = (await login.json()).token as string;
        const auth = { Authorization: `Bearer ${token}` };

        const listRes = await ctx.get(`${API}/v1/editions`, { headers: auth });
        const body = await listRes.json().catch(() => ({}));
        // The list nests grouped editions; flatten and keep only our throwaway copies.
        const editions = (body.editions ?? []).flat();
        const ids: number[] = editions
            .filter((e: { name?: string }) => e && TEST_EDITION.test(e.name ?? ''))
            .map((e: { id: number }) => e.id);

        let swept = 0;
        for (const id of ids) {
            const first = await ctx
                .delete(`${API}/v1/editions/${id}?optional=archiveForAllEditors`, { headers: auth })
                .catch(() => null);
            const tok = first ? (await first.json().catch(() => ({})))?.token : undefined;
            if (tok) {
                await ctx
                    .delete(`${API}/v1/editions/${id}?optional=archiveForAllEditors&token=${tok}`, { headers: auth })
                    .catch(() => undefined);
                swept++;
            }
        }
        if (swept) {
            // eslint-disable-next-line no-console
            console.log(`[global-teardown] swept ${swept} throwaway test edition(s)`);
        }
    } catch {
        /* teardown is best-effort — never fail the run over cleanup */
    } finally {
        await ctx?.dispose();
    }
}
