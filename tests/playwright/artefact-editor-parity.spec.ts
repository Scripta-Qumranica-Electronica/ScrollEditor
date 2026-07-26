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
