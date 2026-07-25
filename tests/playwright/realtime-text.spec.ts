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

function fragmentName(page: Page, tfId: number): Promise<string | undefined> {
    return page.evaluate((id) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        return st.textFragments.get(id)?.textFragmentName as string | undefined;
    }, tfId);
}

test('renaming a text fragment appears live for another editor (no reload)', async ({ browser }) => {
    const ctxA = await authedContext(browser, token);
    const ed = Number(((await (await ctxA.request.post(`${API}/v1/editions/811`, { headers: auth(), data: { name: `pw-rttfrename-${Date.now()}` } })).text()).match(/"id":\s*(\d+)/) || [])[1]);
    const tf = (await (await ctxA.request.get(`${API}/v1/editions/${ed}/text-fragments`, { headers: auth() })).json()).textFragments[0];

    const pageA = await ctxA.newPage();
    const ctxB = await authedContext(browser, token);
    const pageB = await ctxB.newPage();
    for (const p of [pageA, pageB]) {
        await p.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
        await p.setViewportSize({ width: 1400, height: 900 });
        await p.goto(`/editions/${ed}/text-fragments/${tf.id}`);
        await expect(p.locator('#text-side .text-line').first()).toBeVisible({ timeout: 40_000 });
    }
    await pageB.waitForTimeout(1500); // let SignalR settle

    const newName = `pw-tf-renamed-${Date.now()}`;
    await pageA.evaluate(async (args) => {
        const { edId, tfId, name } = args;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        const frag = st.textFragments.get(tfId);
        frag.textFragmentName = name;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const el = document.querySelector('#text-side'); let cur: any = (el as any)?.__vueParentComponent; let svc: any;
        while (cur) { if (cur.ctx && cur.ctx.textService?.changeTextFragment) { svc = cur.ctx.textService; break; } cur = cur.parent; }
        await svc.changeTextFragment(edId, frag);
    }, { edId: ed, tfId: tf.id, name: newName });

    // A applied its own rename; B receives it live over SignalR.
    await expect.poll(() => fragmentName(pageA, tf.id), { timeout: 10_000 }).toBe(newName);
    await expect.poll(() => fragmentName(pageB, tf.id), { timeout: 20_000 }).toBe(newName);

    await collectCoverage(ctxA);
    await collectCoverage(ctxB);
    await ctxA.close();
    await ctxB.close();
});

test('a metadata-only text fragment loads its content on open (broadcast -> open, not empty)', async ({ browser }) => {
    // A CreatedTextFragment broadcast adds a fragment with only id+name (no lines). Opening it
    // must FETCH its content, not short-circuit on the cached metadata and show it empty.
    const ctx = await authedContext(browser, token);
    const ed = Number(((await (await ctx.request.post(`${API}/v1/editions/811`, { headers: auth(), data: { name: `pw-tfcontent-${Date.now()}` } })).text()).match(/"id":\s*(\d+)/) || [])[1]);
    const tfs = (await (await ctx.request.get(`${API}/v1/editions/${ed}/text-fragments`, { headers: auth() })).json()).textFragments;
    const [a, b] = [tfs[0].id, tfs[1].id];

    const page = await ctx.newPage();
    await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(`/editions/${ed}/text-fragments/${a}`);
    await expect(page.locator('#text-side .text-line').first()).toBeVisible({ timeout: 40_000 });

    const result = await page.evaluate(async (args) => {
        const { edId, fa, fb } = args;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        const before = st.textFragments.get(fa)?.lines?.length ?? 0;
        // Simulate the state left by a CreatedTextFragment broadcast: the fragment is known but
        // has no lines yet.
        st.textFragments.get(fa).lines = [];
        const emptied = st.textFragments.get(fa)?.lines?.length ?? 0;
        // Move the tracked load process to another fragment, then re-open A: it must re-fetch.
        await st.prepare.textFragment(edId, fb);
        await st.prepare.textFragment(edId, fa);
        const after = st.textFragments.get(fa)?.lines?.length ?? 0;
        return { before, emptied, after };
    }, { edId: ed, fa: a, fb: b });

    expect(result.before, 'fragment A had content to begin with').toBeGreaterThan(0);
    expect(result.emptied, 'we emulated a metadata-only entry').toBe(0);
    expect(result.after, 'opening the metadata-only fragment re-fetched its content').toBeGreaterThan(0);

    await collectCoverage(ctx);
    await ctx.close();
});
