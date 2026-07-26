import { test, expect, loginToken, authedContext, collectCoverage, API } from './fixtures';
import type { Page } from '@playwright/test';

/*
 * Artefact-editor UI PARITY regression guard.
 *
 * These lock in three fixes for bootstrap-vue-next / Bootstrap 5 divergences that
 * silently rendered wrong (the same markup that worked under bootstrap-vue v2 /
 * Bootstrap 4 no-ops under the new libs):
 *
 *   1. "Adjust image" popover — v2's `triggers="click blur"` string is dead in
 *      bootstrap-vue-next, so it never opened. Now uses the boolean `click` trigger:
 *      opens on click, closes on outside click, sliders inside stay interactive.
 *   2. The resize divider (#resize-bar) had a stale `grid-row: 2` after the grid
 *      gained a second toolbar row, so it bled UP into the toolbar/menu. It must
 *      now start at/below the toolbar's bottom edge.
 *   3. The opacity slider (BS5 `.form-range`) must still drive image settings state
 *      live as it moves.
 *
 * The companion static guard (`npm run check:bootstrap5`) enumerates the remaining
 * dead BS4 tokens across the tree; this spec is the runtime half.
 */

let token: string;

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    await request.dispose();
});

const auth = () => ({ Authorization: `Bearer ${token}` });

// Open the first artefact of a stable edition (808) in the artefact editor.
async function openArtefactEditor(page: Page): Promise<void> {
    const arts = (await (await page.request.get(`${API}/v1/editions/808/artefacts`, { headers: auth() })).json()).artefacts;
    const artefactId = arts[0].id;
    // Drop images — the parity checks are structural/behavioral, not pixel.
    await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
    await page.setViewportSize({ width: 1500, height: 950 });
    await page.goto(`/editions/808/artefacts/${artefactId}`);
    await expect(page.locator('#popover-adjust')).toBeVisible({ timeout: 40_000 });
}

test('“Adjust image” popover opens on click and closes on outside click (bootstrap-vue-next trigger parity)', async ({ browser }) => {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    await openArtefactEditor(page);

    const popover = page.locator('.popover.b-popover', { has: page.locator('input[type=range]') });
    await expect(popover).toBeHidden();

    await page.locator('#popover-adjust').click();
    await expect(popover, 'popover opens on click').toBeVisible();
    await expect(popover.locator('input[type=range]').first(), 'sliders are inside and reachable').toBeVisible();

    // Click well outside the popover -> it dismisses.
    await page.mouse.click(5, 5);
    await expect(popover, 'popover closes on outside click').toBeHidden();

    await collectCoverage(ctx);
    await ctx.close();
});

test('the resize divider starts below the toolbar — it does not bleed into the menu above', async ({ browser }) => {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    await openArtefactEditor(page);

    const geo = await page.evaluate(() => {
        const bar = document.getElementById('resize-bar');
        const toolbar = document.getElementById('toolbar');
        if (!bar || !toolbar) return null;
        const b = bar.getBoundingClientRect();
        const t = toolbar.getBoundingClientRect();
        return { barTop: b.top, toolbarBottom: t.bottom };
    });
    expect(geo, 'resize-bar and toolbar are present').not.toBeNull();
    // The divider's top must sit at/below the toolbar's bottom (allow 2px slack).
    expect(geo!.barTop).toBeGreaterThanOrEqual(geo!.toolbarBottom - 2);

    await collectCoverage(ctx);
    await ctx.close();
});

test('the opacity slider drives image-settings state live as it moves', async ({ browser }) => {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    await openArtefactEditor(page);
    await page.locator('#popover-adjust').click();
    await expect(page.locator('.popover input[type=range]').first()).toBeVisible();

    const result = await page.evaluate(async () => {
        const range = document.querySelector('.popover input[type=range]') as HTMLInputElement | null;
        if (!range) return { error: 'no range' };
        const readOpacity = () => {
            let el: any = range;
            while (el) { if (el.__vueParentComponent?.ctx?.settings) return el.__vueParentComponent.ctx.settings.opacity; el = el.parentElement; }
            return null;
        };
        const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
        const before = readOpacity();
        set.call(range, '0.35');
        range.dispatchEvent(new Event('input', { bubbles: true })); // live drag, not release
        await new Promise((r) => setTimeout(r, 60));
        return { before, after: readOpacity() };
    });

    expect('error' in result ? result.error : null, 'range slider is present').toBeNull();
    expect((result as any).after, 'slider input updated settings.opacity live').toBeCloseTo(0.35, 5);

    await collectCoverage(ctx);
    await ctx.close();
});

// Find an artefact whose imaged object exposes >=2 image layers (color/infrared/raking).
async function findMultiLayerArtefact(page: Page): Promise<{ editionId: number; artefactId: number } | null> {
    for (const editionId of [1, 3, 894, 923]) {
        const res = await page.request.get(`${API}/v1/editions/${editionId}/imaged-objects?optional=artefacts`, { headers: auth() });
        if (!res.ok()) continue;
        const ios = (await res.json()).imagedObjects || [];
        for (const io of ios) {
            const imgs = (io.recto?.images || []).length;
            const arts = io.artefacts || [];
            if (imgs >= 2 && arts.length) return { editionId, artefactId: arts[0].id };
        }
    }
    return null;
}

test('multi-layer adjust: hiding a layer re-normalizes the rest — no washed-out remainder', async ({ browser }) => {
    // Regression for the "washed out infrared" bug: the visibility checkbox used @change,
    // which bootstrap-vue-next never emits, so hiding a layer skipped normalizeOpacity and
    // the remaining top layer stayed at its multi-layer opacity (~0.5-0.75) instead of 1.
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    const found = await findMultiLayerArtefact(page);
    expect(found, 'a multi-layer artefact exists in the seed').not.toBeNull();

    await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
    await page.setViewportSize({ width: 1500, height: 950 });
    await page.goto(`/editions/${found!.editionId}/artefacts/${found!.artefactId}`);
    await expect(page.locator('#popover-adjust')).toBeVisible({ timeout: 40_000 });
    await page.locator('#popover-adjust').click();
    await expect(page.locator('.popover input[type=checkbox]').first()).toBeVisible();

    const result = await page.evaluate(async () => {
        const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
        const checks = [...document.querySelectorAll('.popover input[type=checkbox]')] as HTMLInputElement[];
        const ranges = [...document.querySelectorAll('.popover input[type=range]')] as HTMLInputElement[];
        if (checks.length < 2) return { layers: checks.length, firstVisibleNorm: null };
        const read = () => ranges.map((r) => { let el: any = r; while (el) { if (el.__vueParentComponent?.ctx?.settings) return el.__vueParentComponent.ctx.settings; el = el.parentElement; } return null; });
        for (const c of checks) if (!c.checked) { c.click(); await sleep(80); }
        checks[0].click(); await sleep(150); // hide the first (top) layer
        const firstVisible = read().find((s: any) => s && s.visible);
        return { layers: checks.length, firstVisibleNorm: firstVisible ? firstVisible.normalizedOpacity : null };
    });

    expect(result.layers, 'artefact has >=2 image layers').toBeGreaterThanOrEqual(2);
    expect(result.firstVisibleNorm, 'remaining top layer is full opacity (not washed out)').toBeCloseTo(1, 5);

    await collectCoverage(ctx);
    await ctx.close();
});

test('right-click an artefact card opens the rename popover (bv:: bus → v-model)', async ({ browser }) => {
    // Regression for the dead $root.$emit('bv::show::popover') bus: right-click must open
    // the per-instance rename <b-popover> (now a boolean v-model) and Close must dismiss it.
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
    await page.setViewportSize({ width: 1500, height: 950 });
    await page.goto('/editions/808/artefacts');

    const card = page.locator('.line-name[id^="popover-line-"]').first();
    await expect(card).toBeVisible({ timeout: 40_000 });
    // All card popovers are pre-rendered (teleported) in Bootstrap's fade state, so
    // "shown" must be gated on the `.show` class, not Playwright visibility.
    const shownPopover = page.locator('.popover.b-popover.show', { hasText: 'Rename this artefact' });
    await expect(shownPopover, 'no rename popover is open initially').toHaveCount(0);

    await card.click({ button: 'right' });
    await expect(shownPopover, 'rename popover opens on right-click').toHaveCount(1);
    await expect(shownPopover.locator('#newName'), 'rename input is present').toBeVisible();

    await shownPopover.getByRole('button', { name: /close/i }).click();
    await expect(shownPopover, 'popover closes via Close').toHaveCount(0);

    await collectCoverage(ctx);
    await ctx.close();
});
