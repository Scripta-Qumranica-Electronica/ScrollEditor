import { test, expect, loginToken, authedContext, collectCoverage, API } from './fixtures';
import type { BrowserContext, Page } from '@playwright/test';

// FUNCTIONAL regressions — these assert the app actually WORKS/looks right, not just
// "no crash + some state changed". They each FAIL against the bugs they guard and
// pass after the fix, so a real regression shows up in CI instead of by clicking.

let token: string;

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    await request.dispose();
});

const authHeader = () => ({ Authorization: `Bearer ${token}` });

async function copyEdition(ctx: BrowserContext, name: string): Promise<number> {
    const r = await ctx.request.post(`${API}/v1/editions/811`, { headers: authHeader(), data: { name } });
    return (await r.json()).id;
}
async function firstImagedObject(ctx: BrowserContext, ed: number): Promise<string> {
    const r = await ctx.request.get(`${API}/v1/editions/${ed}/imaged-objects`, { headers: authHeader() });
    return (await r.json()).imagedObjects[0].id;
}
function ioArtefactNames(page: Page) {
    return page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        return st.imagedObjects.current.artefacts.map((a: { name: string }) => a.name) as string[];
    });
}

test('edition-card thumbnails actually load an image (v-lazy regression)', async ({ browser }) => {
    // v-lazy (vue-lazyload, Vue-2-only, disabled in the migration) left every thumbnail
    // with an empty src. Assert real images are loaded, not just present.
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    await page.goto('/home/public');
    await expect(page.locator('img.card-img-top').first()).toBeVisible({ timeout: 20_000 });

    const stats = await page.evaluate(() => {
        const imgs = [...document.querySelectorAll('img.card-img-top')] as HTMLImageElement[];
        return {
            count: imgs.length,
            realSrc: imgs.filter((i) => /^https?:/.test(i.src)).length,
            loaded: imgs.filter((i) => i.naturalWidth > 0).length,
        };
    });
    expect(stats.count).toBeGreaterThan(5);
    // Every rendered thumbnail must have a real URL…
    expect(stats.realSrc).toBe(stats.count);
    // …and a healthy number must have actually decoded (naturalWidth > 0).
    expect(stats.loaded).toBeGreaterThan(5);

    await collectCoverage(context);
    await context.close();
});

test('the imaged-object editor renders its master image', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const ed = await copyEdition(context, `fr-img-${Date.now()}`);
    const io = await firstImagedObject(context, ed);
    const page = await context.newPage();
    await page.goto(`/editions/${ed}/imaged-objects/${io}`);

    // The master image renders as SVG <image> elements with real hrefs.
    await expect.poll(async () => page.evaluate(() =>
        [...document.querySelectorAll('image')].filter((i) => /^https?:/.test(i.getAttribute('href') || '')).length,
    ), { timeout: 30_000 }).toBeGreaterThan(0);

    await collectCoverage(context);
    await context.close();
});

test('creating an artefact adds it to the imaged-object listing', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const ed = await copyEdition(context, `fr-create-${Date.now()}`);
    const io = await firstImagedObject(context, ed);
    const page = await context.newPage();
    await page.goto(`/editions/${ed}/imaged-objects/${io}`);
    await expect(page.getByRole('button', { name: 'New Artefact' })).toBeVisible({ timeout: 30_000 });

    const name = `Regression Art ${Date.now()}`;
    await page.getByRole('button', { name: 'New Artefact' }).click();
    await expect(page.locator('#newName')).toBeVisible({ timeout: 10_000 });
    // The dialog's cancel button must read "Cancel", not "Delete ROI" (i18n regression).
    await expect(page.locator('#newModal').getByRole('button', { name: 'Cancel' })).toBeVisible();

    await page.fill('#newName', name);
    await page.locator('#newModal').getByRole('button', { name: /create/i }).click();

    // It must appear in the imaged object's listing (createArtefact used to add only to
    // the global collection, so it never showed until reload).
    await expect.poll(() => ioArtefactNames(page), { timeout: 15_000 }).toContain(name);
    await expect(page.getByText(name, { exact: false }).first()).toBeVisible({ timeout: 10_000 });

    await collectCoverage(context);
    await context.close();
});

test('deleting an artefact removes it from the imaged-object listing', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const ed = await copyEdition(context, `fr-del-${Date.now()}`);
    const io = await firstImagedObject(context, ed);
    const page = await context.newPage();
    await page.goto(`/editions/${ed}/imaged-objects/${io}`);
    await expect(page.getByRole('button', { name: 'New Artefact' })).toBeVisible({ timeout: 30_000 });

    // Create one we can safely delete.
    const name = `ToDelete ${Date.now()}`;
    await page.getByRole('button', { name: 'New Artefact' }).click();
    await expect(page.locator('#newName')).toBeVisible({ timeout: 10_000 });
    await page.fill('#newName', name);
    await page.locator('#newModal').getByRole('button', { name: /create/i }).click();
    await expect.poll(() => ioArtefactNames(page), { timeout: 15_000 }).toContain(name);

    // Delete it via its row's Delete button, then it must leave the listing
    // (deleteArtefact used to remove from neither collection).
    const before = (await ioArtefactNames(page)).length;
    await page.getByRole('button', { name: /^Delete$/ }).last().click();
    await expect.poll(() => ioArtefactNames(page).then((n) => n.length), { timeout: 15_000 }).toBe(before - 1);

    await collectCoverage(context);
    await context.close();
});

test('drawing a mask triggers autosave WITHOUT crashing', async ({ browser }) => {
    // The OperationsManager autosave invokes saveEntities on a saving-agent whose
    // `this` is not the component proxy, so this.$state was undefined -> "Cannot read
    // properties of undefined (reading 'imagedObjects')". Assert no such error fires.
    const context = await authedContext(browser, token);
    const ed = await copyEdition(context, `fr-save-${Date.now()}`);
    const io = await firstImagedObject(context, ed);
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`/editions/${ed}/imaged-objects/${io}`);
    await expect(page.getByRole('button', { name: 'New Artefact' })).toBeVisible({ timeout: 30_000 });

    // Create -> selected + DRAW mode.
    await page.getByRole('button', { name: 'New Artefact' }).click();
    await expect(page.locator('#newName')).toBeVisible({ timeout: 10_000 });
    await page.fill('#newName', `Draw ${Date.now()}`);
    await page.locator('#newModal').getByRole('button', { name: /create/i }).click();
    await page.waitForTimeout(1500);

    // Draw a polygon (dispatched pointer events, since pointer-capture ignores the
    // high-level mouse API), which enqueues an operation and triggers the autosave.
    await page.evaluate(() => {
        const g = document.querySelector('.draw-boundary') || document.querySelector('g[pointer-events="all"]');
        if (!g) return;
        const r = (g as Element).getBoundingClientRect();
        const cx = r.x + r.width / 2;
        const cy = r.y + r.height / 2;
        const pe = (t: string, x: number, y: number) =>
            g.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: 1, clientX: x, clientY: y }));
        pe('pointerdown', cx - 40, cy - 30);
        pe('pointermove', cx + 40, cy - 30);
        pe('pointermove', cx + 20, cy + 40);
        pe('pointermove', cx - 40, cy - 28);
        pe('pointerup', cx - 40, cy - 28);
    });

    // Wait past the ~3s debounced autosave and assert it did not throw.
    await page.waitForTimeout(5000);
    const saveCrash = errors.filter((e) => /imagedObjects|Cannot read prop/i.test(e));
    expect(saveCrash, `autosave crashed: ${saveCrash.join(' | ')}`).toEqual([]);

    await collectCoverage(context);
    await context.close();
});

test('the Adjust Image opacity slider changes an image opacity', async ({ browser }) => {
    // The opacity slider used @input (not fired by bvn's range input) so it did nothing.
    const context = await authedContext(browser, token);
    const ed = await copyEdition(context, `fr-opac-${Date.now()}`);
    const io = await firstImagedObject(context, ed);
    const page = await context.newPage();
    await page.goto(`/editions/${ed}/imaged-objects/${io}`);
    await expect(page.getByText(/adjust image/i)).toBeVisible({ timeout: 30_000 });

    await page.getByText(/adjust image/i).click();
    await expect(page.locator('input[type="range"]').first()).toBeVisible({ timeout: 10_000 });

    const opacityOf = () => page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        const s = st.imagedObject.params?.imageSettings || {};
        const first = Object.values(s)[0] as { opacity: number } | undefined;
        return first?.opacity;
    });
    const before = await opacityOf();

    // Move the first slider and dispatch the events bvn listens to.
    await page.evaluate(() => {
        const r = document.querySelector('input[type="range"]') as HTMLInputElement;
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
        setter.call(r, '0.5');
        r.dispatchEvent(new Event('input', { bubbles: true }));
        r.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await expect.poll(opacityOf, { timeout: 10_000 }).not.toBe(before);

    await collectCoverage(context);
    await context.close();
});
