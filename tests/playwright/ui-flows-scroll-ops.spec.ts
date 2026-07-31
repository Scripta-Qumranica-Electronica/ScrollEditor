import { test, expect, collectCoverage, loginToken, authedContext, API } from './fixtures';
import type { Page } from '@playwright/test';

// More SCROLL-editor manipulation flows: mirror, resize (scale), and keyboard-driven move/rotate.
// Selection uses the app's own select-artefact bus (the canvas groups have no clickable geometry
// headless); every manipulation is then a real toolbar click or keypress, asserted on the
// selected artefact's placement in the store.

let token: string;
test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    await request.dispose();
});
const auth = () => ({ Authorization: `Bearer ${token}` });

async function openScrollWithSelection(page: Page) {
    const ed = (await (await page.request.post(`${API}/v1/editions/899`, { headers: auth(), data: { name: `ui-scrollops-${Date.now()}-${Math.floor(Math.random() * 1e6)}` } })).json()).id;
    await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto(`/editions/${ed}/scroll-editor`);
    await expect(page.locator('#the-scroll')).toBeVisible({ timeout: 40_000 });
    await expect.poll(async () => page.locator('#the-scroll g[pointer-events="all"]').count(), { timeout: 40_000 }).toBeGreaterThan(0);
    // Select the first placed artefact through the app's own selection bus.
    await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const art = st.artefacts.items.find((a: any) => a.isPlaced);
        st.eventBus.emit('select-artefact', art);
    });
    await expect(page.getByTitle('Mirror', { exact: true })).toBeEnabled({ timeout: 10_000 });
    return { ed };
}

const placement = (page: Page) =>
    page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any)?.__vue_app__?.config?.globalProperties?.$state;
        const a = st?.scrollEditor?.selectedArtefact;
        if (!a) return null;
        return { x: a.placement.translate.x, y: a.placement.translate.y, rotate: a.placement.rotate, scale: a.placement.scale, mirrored: a.placement.mirrored };
    });

test('FLOW: scroll editor Mirror flips the selected artefact', async ({ browser }) => {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    await openScrollWithSelection(page);

    const before = (await placement(page))!.mirrored;
    await page.getByTitle('Mirror', { exact: true }).click();
    await expect.poll(async () => (await placement(page))!.mirrored, { timeout: 10_000 }).toBe(!before);

    await collectCoverage(ctx);
    await ctx.close();
});

test('FLOW: scroll editor Resize (scale) then Reset the selected artefact', async ({ browser }) => {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    await openScrollWithSelection(page);

    // Scope the zoom buttons to the "Resize Artefact" toolbox (they scale the artefact, not the view).
    const resizeBox = page.locator('.toolbox', { hasText: 'Resize Artefact' });

    await test.step('Zoom In raises the artefact scale', async () => {
        const before = (await placement(page))!.scale;
        await resizeBox.getByTitle('Zoom In', { exact: true }).click();
        await expect.poll(async () => (await placement(page))!.scale, { timeout: 10_000 }).toBeGreaterThan(before);
    });

    await test.step('Reset returns the scale to 1', async () => {
        await resizeBox.getByTitle('Reset', { exact: true }).click();
        await expect.poll(async () => (await placement(page))!.scale, { timeout: 10_000 }).toBe(1);
    });

    await collectCoverage(ctx);
    await ctx.close();
});

test('FLOW: scroll editor arrow keys move and "<" rotates the selected artefact', async ({ browser }) => {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    await openScrollWithSelection(page);

    // The editor shell (tabindex=0) owns the onKeyDown handler.
    const shell = page.locator('[tabindex="0"]').first();
    await shell.focus();

    await test.step('ArrowRight moves the artefact right (translate.x increases)', async () => {
        const before = (await placement(page))!.x;
        await page.keyboard.press('ArrowRight');
        await expect.poll(async () => (await placement(page))!.x, { timeout: 10_000 }).toBeGreaterThan(before);
    });

    await test.step('"," rotates the artefact (rotate changes)', async () => {
        const before = (await placement(page))!.rotate;
        await page.keyboard.press(','); // onKeyDown maps "," (and "<") to rotate-left
        await expect.poll(async () => (await placement(page))!.rotate, { timeout: 10_000 }).not.toBe(before);
    });

    await collectCoverage(ctx);
    await ctx.close();
});
