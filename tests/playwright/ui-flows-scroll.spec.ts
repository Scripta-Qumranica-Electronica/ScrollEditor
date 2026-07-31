import { test, expect, collectCoverage, loginToken, authedContext, API } from './fixtures';
import type { Page } from '@playwright/test';

// UI flow for the SCROLL editor: select a placed artefact on the canvas, then move and rotate
// it with the real toolbar buttons, asserting the resulting placement transform actually
// changed. This exercises the manipulation logic (selectArtefact → dragArtefact /
// rotateGroupArtefact → placement clone + translate operation), not just "the canvas rendered".

let token: string;
test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    await request.dispose();
});
const auth = () => ({ Authorization: `Bearer ${token}` });

// The selected artefact's live placement, read straight from the app store that drives the SVG.
async function selectedPlacement(page: Page): Promise<{ x: number; y: number; rotate: number } | null> {
    return page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any)?.__vue_app__?.config?.globalProperties?.$state;
        const a = st?.scrollEditor?.selectedArtefact;
        if (!a) return null;
        return { x: a.placement.translate.x, y: a.placement.translate.y, rotate: a.placement.rotate };
    });
}

test('FLOW: scroll editor — select a placed artefact, move it up and rotate it', async ({ browser }) => {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    // disposable owned edition (copy of 899, which has ~60 placed artefacts)
    const ed = (await (await page.request.post(`${API}/v1/editions/899`, { headers: auth(), data: { name: `ui-scroll-${Date.now()}-${Math.floor(Math.random() * 1e6)}` } })).json()).id;

    await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto(`/editions/${ed}/scroll-editor`);

    const upBtn = page.getByTitle('Up', { exact: true });
    const rotateRight = page.getByTitle('Rotate Right', { exact: true });
    const artefactGroups = page.locator('#the-scroll g[pointer-events="all"]');

    await test.step('the scroll renders its placed artefacts', async () => {
        await expect(page.locator('#the-scroll')).toBeVisible({ timeout: 40_000 });
        // The placed artefacts are in the DOM (each a <g pointer-events="all"> carrying its
        // placement transform). We assert DOM presence, not Playwright "visibility": with the
        // IIIF image tiles aborted in headless CI the groups have no rendered pixels, so they
        // have zero geometry and Playwright reports them hidden — but they are fully live.
        await expect.poll(async () => artefactGroups.count(), { timeout: 40_000 }).toBeGreaterThan(0);
    });

    await test.step('selecting an artefact enables the Move/Rotate toolbar', async () => {
        // Move buttons are disabled until an artefact is selected.
        await expect(upBtn).toBeDisabled();
        // Select through the app's OWN selection pathway — the `select-artefact` event bus that
        // the scroll editor itself listens on (scroll-area.created()). A canvas click can't be
        // used here because the un-tiled artefact groups have no clickable geometry headless;
        // this drives the real selectArtefact → state.selectArtefact code path all the same.
        await page.evaluate(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const art = st.artefacts.items.find((a: any) => a.isPlaced);
            st.eventBus.emit('select-artefact', art);
        });
        await expect(upBtn).toBeEnabled({ timeout: 10_000 });
        expect(await selectedPlacement(page)).not.toBeNull();
    });

    await test.step('clicking "Up" moves the artefact up (translate.y decreases)', async () => {
        const before = await selectedPlacement(page);
        for (let i = 0; i < 3; i++) await upBtn.click();
        await expect
            .poll(async () => (await selectedPlacement(page))!.y, { timeout: 10_000 })
            .toBeLessThan(before!.y);
        // x is unchanged by a pure vertical move
        expect((await selectedPlacement(page))!.x).toBe(before!.x);
    });

    await test.step('clicking "Rotate right" rotates the artefact (rotate changes)', async () => {
        const before = await selectedPlacement(page);
        await rotateRight.click();
        await expect
            .poll(async () => (await selectedPlacement(page))!.rotate, { timeout: 10_000 })
            .not.toBe(before!.rotate);
    });

    await collectCoverage(ctx);
    await ctx.close();
});
