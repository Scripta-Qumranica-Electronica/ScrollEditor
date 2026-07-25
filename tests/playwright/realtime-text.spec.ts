import { test, expect, loginToken, authedContext, collectCoverage, API } from './fixtures';
import type { Page } from '@playwright/test';

// Realtime TEXT collaboration: a line added by one editor must appear live for another editor
// viewing the same text fragment — WITHOUT reload. This exercises the CreatedLine SignalR path
// (backend now carries textFragmentId; frontend handleCreatedLine -> applyCreatedLine). Client A
// adds the line via the text service directly (the add-line MODAL has a separate `position` bug),
// which posts + broadcasts to B.

let token: string;

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    await request.dispose();
});

const auth = () => ({ Authorization: `Bearer ${token}` });

function lineCount(page: Page): Promise<number> {
    return page.locator('#text-side .text-line').count();
}

test('a line added by one editor appears live for another (no reload)', async ({ browser }) => {
    const ctxA = await authedContext(browser, token);
    const ed = Number(((await (await ctxA.request.post(`${API}/v1/editions/811`, { headers: auth(), data: { name: `pw-rttext-${Date.now()}` } })).text()).match(/"id":\s*(\d+)/) || [])[1]);
    const tf = (await (await ctxA.request.get(`${API}/v1/editions/${ed}/text-fragments`, { headers: auth() })).json()).textFragments[0];

    // Two editors open the SAME text fragment (both subscribe to the edition over SignalR).
    const pageA = await ctxA.newPage();
    const ctxB = await authedContext(browser, token);
    const pageB = await ctxB.newPage();
    for (const p of [pageA, pageB]) {
        await p.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
        await p.setViewportSize({ width: 1400, height: 900 });
        await p.goto(`/editions/${ed}/text-fragments/${tf.id}`);
        await expect(p.locator('#text-side .text-line').first()).toBeVisible({ timeout: 40_000 });
    }
    const before = await lineCount(pageB);
    // let SignalR subscriptions settle
    await pageB.waitForTimeout(1500);

    // Editor A adds a line via the text service (valid previousLineId = the fragment's last line).
    await pageA.evaluate(async (args) => {
        const { edId, tfId } = args;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        const mapTf = st.textFragments.get(tfId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const el = document.querySelector('#text-side'); let cur: any = (el as any)?.__vueParentComponent; let svc: any;
        while (cur) { if (cur.ctx && cur.ctx.textService?.createLine) { svc = cur.ctx.textService; break; } cur = cur.parent; }
        await svc.createLine(edId, tfId, { lineName: 'pw-rt-line' }, mapTf.lines[mapTf.lines.length - 1]?.lineId, undefined);
    }, { edId: ed, tfId: tf.id });

    // A sees its own line immediately (local apply from the POST response).
    await expect.poll(() => lineCount(pageA), { timeout: 10_000 }).toBe(before + 1);

    // B sees it appear LIVE via the CreatedLine broadcast — no reload.
    await expect.poll(() => lineCount(pageB), { timeout: 20_000 }).toBe(before + 1);

    await collectCoverage(ctxA);
    await collectCoverage(ctxB);
    await ctxA.close();
    await ctxB.close();
});
