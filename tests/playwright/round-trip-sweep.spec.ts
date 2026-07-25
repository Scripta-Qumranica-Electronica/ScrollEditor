import { test, expect, loginToken, authedContext, collectCoverage, API, artefactX } from './fixtures';
import type { BrowserContext, Page } from '@playwright/test';

// Mutation ROUND-TRIP sweep. For several entity types: make the change THROUGH THE UI, RELOAD,
// and assert it survived — i.e. the UI's write path actually persisted it (not just updated
// local state). This is the class the verso bug fell into: the UI showed the change but the
// server never recorded it, so a reload would have revealed it.

let token: string;

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    await request.dispose();
});

const auth = () => ({ Authorization: `Bearer ${token}` });

async function copy(ctx: BrowserContext, source: number, name: string): Promise<number> {
    const r = await ctx.request.post(`${API}/v1/editions/${source}`, { headers: auth(), data: { name } });
    const id = Number(((await r.text()).match(/"id":\s*(\d+)/) || [])[1]);
    expect(Number.isFinite(id)).toBeTruthy();
    return id;
}

function artefactNames(page: Page): Promise<string[]> {
    return page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        return (st.imagedObjects.current?.artefacts ?? []).map((a: { name: string }) => a.name) as string[];
    });
}

test('round-trip: renaming an artefact survives a reload', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const ed = await copy(context, 899, `pw-rt-rename-${Date.now()}`);
    const arts = (await (await context.request.get(`${API}/v1/editions/${ed}/artefacts`, { headers: auth() })).json()).artefacts;
    const withIo = arts.find((a: { isVirtual: boolean; imagedObjectId?: string }) => !a.isVirtual && a.imagedObjectId);
    const page = await context.newPage();
    await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
    await page.goto(`/editions/${ed}/imaged-objects/${withIo.imagedObjectId}`);

    const rows = page.locator('#imaged-object-artefacts .select-art-name');
    await expect(rows.first()).toBeVisible({ timeout: 30_000 });
    await rows.first().click();
    await expect(page.locator('#imaged-object-artefacts .selectedRow')).toHaveCount(1, { timeout: 10_000 });
    await page.locator('#imaged-object-artefacts').getByRole('button', { name: /^Rename$/ }).first().click();
    const input = page.locator('#imaged-object-artefacts input').first();
    await expect(input).toBeVisible({ timeout: 10_000 });
    const newName = `pw-rt-renamed-${Date.now()}`;
    await input.fill(newName);
    await page.locator('#imaged-object-artefacts').getByRole('button', { name: /^(Save|Rename)$/ }).first().click().catch(() => undefined);
    await input.press('Enter').catch(() => undefined);
    // It's applied locally…
    await expect.poll(() => artefactNames(page), { timeout: 15_000 }).toContain(newName);

    // …and it SURVIVES a reload (server persisted it).
    await page.reload();
    await expect(page.locator('#imaged-object-artefacts .select-art-name').first()).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => artefactNames(page), { timeout: 20_000 }).toContain(newName);

    await collectCoverage(context);
    await context.close();
});

// Regression for the scroll-editor save bug: a nudge's autosave used this.editionId, which is
// 0 on the detached saving-agent `this`, so updateArtefactDTOs(0) threw and nothing persisted.
// saveEntities now resolves the edition from the store. This asserts the move survives a reload.
test('round-trip: moving a placed artefact survives a reload', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const ed = await copy(context, 899, `pw-rt-move-${Date.now()}`);
    const arts = (await (await context.request.get(`${API}/v1/editions/${ed}/artefacts`, { headers: auth() })).json()).artefacts;
    const placed = arts.find((a: { isPlaced: boolean }) => a.isPlaced);
    expect(placed, 'edition has a placed artefact').toBeTruthy();
    const id = placed.id as number;

    const page = await context.newPage();
    await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
    await page.goto(`/editions/${ed}/scroll-editor`);
    await expect.poll(() => artefactX(page, id), { timeout: 40_000 }).not.toBeNull();
    const x0 = await artefactX(page, id);

    // Select it — re-dispatch the click each poll iteration until the store registers the
    // selection (the canvas needs a beat to become interactive), so the move toolbar enables.
    await expect
        .poll(() => page.evaluate((artId) => {
            const path = document.querySelector(`#path-${artId}`);
            const g = (path?.closest('g[transform]')?.querySelector('g') as SVGElement | null) ?? (path as unknown as SVGElement);
            g?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
            return (st.scrollEditor.selectedArtefact?.id ?? null) as number | null;
        }, id), { timeout: 20_000 })
        .toBe(id);
    // Nudge right.
    await page.getByTitle('Right', { exact: true }).first().click();
    await expect.poll(() => artefactX(page, id), { timeout: 10_000 }).not.toBe(x0);
    const x1 = await artefactX(page, id);

    // Wait past the ~3s debounced autosave, then reload: x must still be the moved value.
    await page.waitForTimeout(6000);
    await page.reload();
    await expect.poll(() => artefactX(page, id), { timeout: 40_000 }).not.toBeNull();
    const xReloaded = await artefactX(page, id);
    expect(xReloaded, `moved x ${x1} must persist (was ${x0})`).not.toBe(x0);

    await collectCoverage(context);
    await context.close();
});

// NOTE: an add-line round-trip belongs here too, but the text editor currently doesn't reflect
// a newly-added line locally (it relies on the CreatedLine SignalR broadcast, which is ignored —
// the realtime-text bug). Its regression test is added with that fix; see docs/CAPABILITIES.md §8.
