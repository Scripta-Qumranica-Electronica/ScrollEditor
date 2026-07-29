import { test, expect, loginToken, authedContext, API } from './fixtures';
import type { Page } from '@playwright/test';

// UI flow for the IMAGED-OBJECT editor artefact panel: the create → delete lifecycle of an
// artefact, driven through the real panel controls. The panel renders from the imaged-object data
// (not the IIIF pixels), so it is headless-safe. Assertions are on the visible artefact list and
// cross-checked against the server.
// (Rename is not covered here: the panel lists an artefact in more than one row, and entering
// rename mode moves the name from a text span into an <input>, so a by-name row locator can't be
// held stably across the edit — that flow is better exercised elsewhere.)

let token: string;
test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    await request.dispose();
});
const auth = () => ({ Authorization: `Bearer ${token}` });

const serverArtefactNames = async (page: Page, ed: number): Promise<string[]> => {
    const arts = (await (await page.request.get(`${API}/v1/editions/${ed}/artefacts`, { headers: auth() })).json()).artefacts;
    return arts.map((a: { name: string }) => a.name);
};

test('FLOW: imaged-object editor — create then delete an artefact', async ({ browser }) => {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    const ed = (await (await page.request.post(`${API}/v1/editions/899`, { headers: auth(), data: { name: `ui-io-${Date.now()}-${Math.floor(Math.random() * 1e6)}` } })).json()).id;
    const ioId = (await (await page.request.get(`${API}/v1/editions/${ed}/imaged-objects`, { headers: auth() })).json()).imagedObjects[0].id;

    await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto(`/editions/${ed}/imaged-objects/${ioId}`);

    const names = page.locator('.select-art-name');
    // Artefact rows are the ones carrying a Delete control.
    const rows = page.locator('.py-2.align-items-center').filter({ has: page.getByRole('button', { name: 'Delete' }) });
    const created = `io-art-${Date.now()}`;

    await test.step('the artefact panel renders', async () => {
        await expect(page.getByRole('button', { name: 'New Artefact' })).toBeVisible({ timeout: 40_000 });
    });

    let before = 0;
    await test.step('New Artefact → name it → submit creates it (list + server)', async () => {
        before = await names.count();
        await page.getByRole('button', { name: 'New Artefact' }).click();
        const nameInput = page.getByPlaceholder('New Artefact Name');
        await expect(nameInput).toBeVisible({ timeout: 10_000 });
        await nameInput.fill(created);
        await nameInput.press('Enter'); // @keyup.enter → newArtefact()
        await expect(nameInput).toBeHidden({ timeout: 15_000 });
        // The created artefact now shows in the panel (it can appear in more than one place — the
        // list row and the auto-selected label — so assert "at least one", not exactly one).
        await expect(names.filter({ hasText: created }).first()).toBeVisible({ timeout: 15_000 });
        expect(await serverArtefactNames(page, ed)).toContain(created);
    });

    await test.step('Delete removes it from the list and the server', async () => {
        await rows.filter({ hasText: created }).first().getByRole('button', { name: 'Delete' }).click();
        await expect(names.filter({ hasText: created })).toHaveCount(0, { timeout: 15_000 });
        await expect.poll(async () => (await serverArtefactNames(page, ed)).includes(created), { timeout: 15_000 }).toBe(false);
    });

    await ctx.close();
});
