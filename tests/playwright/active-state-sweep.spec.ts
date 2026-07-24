import { test, expect, loginToken, authedContext, collectCoverage, API, artefactTransform } from './fixtures';
import { auditControls } from './sweep-helpers';
import type { BrowserContext, Page } from '@playwright/test';

// Visibility sweep for the ACTIVE (post-interaction) editor states. The route sweep audits
// each screen in its DEFAULT state, but most of an editor's controls — the drawing toolbar,
// the move/rotate/scale bar, the sign-attribute pane, the selected-row actions — only appear
// AFTER you select something. That's where the last real overlap bug hid (the artefact-editor
// "Select" button). So here we drive each editor into its working state, then assert no
// interactive control is OVERLAPPED and no pageerror fired. Two widths; 1024 squeezes toolbars.

const SOURCE = 899; // placed artefacts + imaged objects
const TEXT_SOURCE = 811; // real signs (1Q9)

let token: string;
let ed: number;
let artId: number;
let placedId: number;
let ioId: string;
let textEd: number;
let textTfId: number;

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    const auth = { Authorization: `Bearer ${token}` };

    const copyText = await (await request.post(`${API}/v1/editions/${SOURCE}`, { headers: auth, data: { name: `pw-active-${Date.now()}` } })).text();
    ed = Number((copyText.match(/"id":\s*(\d+)/) || [])[1]);
    const arts = (await (await request.get(`${API}/v1/editions/${ed}/artefacts`, { headers: auth })).json()).artefacts;
    const withIo = arts.find((a: { isVirtual: boolean; imagedObjectId?: string }) => !a.isVirtual && a.imagedObjectId);
    artId = withIo.id;
    ioId = withIo.imagedObjectId;
    placedId = (arts.find((a: { isPlaced: boolean }) => a.isPlaced) ?? withIo).id;

    const tText = await (await request.post(`${API}/v1/editions/${TEXT_SOURCE}`, { headers: auth, data: { name: `pw-activetext-${Date.now()}` } })).text();
    textEd = Number((tText.match(/"id":\s*(\d+)/) || [])[1]);
    const tfs = (await (await request.get(`${API}/v1/editions/${textEd}/text-fragments`, { headers: auth })).json()).textFragments;
    textTfId = tfs[0].id;

    await request.dispose();
});

// Shared audit: no overlapped control, no pageerror. `label` names the state; `root` scopes it.
async function assertClean(page: Page, pageErrors: string[], label: string, root = '') {
    const res = await auditControls(page, root);
    const overlapped = res.problems.filter((p) => p.issue === 'overlapped');
    // eslint-disable-next-line no-console
    console.log(`### ${label}: ${res.checked} controls${overlapped.length ? '' : ' — clean'}${res.problems.map((p) => `\n  [${p.issue}] ${p.el} <- ${p.detail}`).join('')}`);
    expect(overlapped, `${label} overlapped controls: ${overlapped.map((p) => `${p.el} <- ${p.detail}`).join('; ')}`).toEqual([]);
    expect(pageErrors, `${label} pageerrors: ${pageErrors.join(' | ')}`).toEqual([]);
}

async function newPage(browser: import('@playwright/test').Browser, width: number): Promise<{ context: BrowserContext; page: Page; errors: string[] }> {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
    await page.setViewportSize({ width, height: 900 });
    return { context, page, errors };
}

const WIDTHS = [1024, 1280];

for (const width of WIDTHS) {
    test(`active: artefact editor with ROI drawing mode @ ${width}`, async ({ browser }) => {
        const { context, page, errors } = await newPage(browser, width);
        try {
            await page.goto(`/editions/${ed}/artefacts/${artId}`);
            await expect(page.locator('#text-side .text-sign').first()).toBeVisible({ timeout: 40_000 });

            // Select signs until drawing is enabled, then enter polygon mode -> the drawing
            // toolbar + attribute pane appear (the controls the default sweep never sees).
            const signs = page.locator('#text-side .text-sign');
            const drawingEnabled = () =>
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                page.evaluate(() => !!(document.querySelector('#artefact-grid') as any)?.__vueParentComponent?.ctx?.isDrawingEnabled);
            const n = await signs.count();
            for (let i = 0; i < Math.min(n, 20); i++) {
                await signs.nth(i).click();
                if (await drawingEnabled()) break;
            }
            await page.evaluate(() => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (document.querySelector('#artefact-grid') as any).__vueParentComponent.ctx.onModeClick('polygon');
            });
            await expect(page.locator('#artefact-image svg .draw-boundary').first()).toBeVisible({ timeout: 10_000 });
            await page.waitForTimeout(500);

            await assertClean(page, errors, `artefact-editor(ROI)@${width}`);
        } finally {
            await collectCoverage(context);
            await context.close();
        }
    });

    test(`active: scroll editor with artefact selected @ ${width}`, async ({ browser }) => {
        const { context, page, errors } = await newPage(browser, width);
        try {
            await page.goto(`/editions/${ed}/scroll-editor`);
            await expect.poll(() => artefactTransform(page, placedId), { timeout: 40_000 }).not.toBeNull();

            // Select the placed artefact -> the move/rotate/scale/z-index toolbar reveals.
            await page.evaluate((id) => {
                const path = document.querySelector(`#path-${id}`);
                const g = (path?.closest('g[transform]')?.querySelector('g') as SVGElement | null) ?? (path as unknown as SVGElement);
                g?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            }, placedId);
            await expect
                .poll(
                    () =>
                        page.evaluate(() => {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
                            return (st.scrollEditor.selectedArtefact?.id ?? null) as number | null;
                        }),
                    { timeout: 15_000 }
                )
                .toBe(placedId);
            await page.waitForTimeout(500);

            await assertClean(page, errors, `scroll-editor(selected)@${width}`);
        } finally {
            await collectCoverage(context);
            await context.close();
        }
    });

    test(`active: imaged-object editor with artefact selected @ ${width}`, async ({ browser }) => {
        const { context, page, errors } = await newPage(browser, width);
        try {
            await page.goto(`/editions/${ed}/imaged-objects/${ioId}`);
            const rows = page.locator('#imaged-object-artefacts .select-art-name');
            await expect(rows.first()).toBeVisible({ timeout: 30_000 });

            // Select the artefact row -> the Rename/Delete/boundary actions reveal.
            await rows.first().click();
            await expect(page.locator('#imaged-object-artefacts .selectedRow')).toHaveCount(1, { timeout: 10_000 });
            await page.waitForTimeout(500);

            await assertClean(page, errors, `imaged-object-editor(selected)@${width}`);
        } finally {
            await collectCoverage(context);
            await context.close();
        }
    });

    test(`active: text-fragment editor with a sign selected @ ${width}`, async ({ browser }) => {
        const { context, page, errors } = await newPage(browser, width);
        try {
            await page.goto(`/editions/${textEd}/text-fragments/${textTfId}`);
            await expect(page.locator('#text-side .text-sign').first()).toBeVisible({ timeout: 40_000 });

            // Select a sign -> the sign-attribute controls / context actions reveal.
            await page.locator('#text-side .text-sign').first().click();
            await page.waitForTimeout(500);

            await assertClean(page, errors, `text-editor(sign)@${width}`);
        } finally {
            await collectCoverage(context);
            await context.close();
        }
    });

    test(`active: user-account menu items reachable @ ${width}`, async ({ browser }) => {
        const { context, page, errors } = await newPage(browser, width);
        try {
            await page.goto('/home/private');
            const toggle = page.locator('#register .dropdown-toggle, .dropdown-toggle').first();
            await expect(toggle).toBeVisible({ timeout: 25_000 });

            // Open the user-account menu and assert every ACTIONABLE item is genuinely
            // reachable — not off-screen, not covered by page chrome. Playwright's trial click
            // runs its full actionability check (visible, stable, receives events at its
            // center) WITHOUT firing the handler, so it catches an item you couldn't click.
            // (The non-interactive name-display row is intentionally excluded — it has no
            // handler and is allowed to tuck under the sticky navbar.)
            await toggle.click();
            const menu = page.locator('.dropdown-menu.show, [role="menu"]').first();
            await expect(menu).toBeVisible({ timeout: 10_000 });
            await page.waitForTimeout(400);

            const actions = [/log ?out/i, /change password/i, /update user details/i];
            for (const name of actions) {
                const item = menu.getByRole('menuitem', { name }).first();
                if ((await item.count()) === 0) continue;
                await item.click({ trial: true, timeout: 8_000 });
            }

            // Regression guard: the toggle's "User Account" hover-tooltip (z-index 1080) used to
            // land on top of the first menu item because the toggle sits at the very top of the
            // viewport and the tooltip flips downward onto the menu. The menu is lifted above it
            // (#register-menu z-index:1090) so NO menu control — including the name row — is
            // covered by a foreign element.
            await assertClean(page, errors, `user-account-menu@${width}`, '.dropdown-menu.show');
        } finally {
            await collectCoverage(context);
            await context.close();
        }
    });
}
