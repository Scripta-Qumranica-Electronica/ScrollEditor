import { test, expect, collectCoverage } from './fixtures';
import { auditControls } from './sweep-helpers';
import type { Page } from '@playwright/test';

// Layout/visibility sweep for the LOGGED-OUT modals — the auth + info dialogs a first-time
// visitor meets before signing in (login, register, forgot-password, report-problem, faq,
// eula). The authed modal-sweep can't reach these (they're logged-out flows), so they're
// swept here from a fresh un-authenticated context. Same guards as modal-sweep: no overlapped
// control, dialog top visible, tall dialogs must scroll, no pageerror.

// Call a Navbar component handler by walking UP from a navbar element to the instance that
// owns the method (robust to markup shuffling — mirrors scroll-editor-modals.spec).
async function callNavbar(page: Page, fn: string): Promise<boolean> {
    return page.evaluate((fnName) => {
        const el = document.querySelector('.navbar-button') || document.querySelector('nav') || document.body;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cur: any = (el as any)?.__vueParentComponent;
        while (cur && (!cur.ctx || typeof cur.ctx[fnName] !== 'function')) cur = cur.parent;
        if (!cur) return false;
        cur.ctx[fnName]();
        return true;
    }, fn);
}

const MODALS: Array<{ name: string; open: (page: Page) => Promise<string> }> = [
    {
        name: 'login',
        open: async (page) => {
            await page.locator('button.btn-login').first().click();
            return '#loginModal';
        },
    },
    {
        name: 'register',
        open: async (page) => {
            await page.locator('button.btn-login').first().click();
            await expect(page.locator('#loginModal input[type="email"]')).toBeVisible({ timeout: 10_000 });
            await page.locator('#loginModal').getByRole('link', { name: /sign up/i }).click();
            return '#registerModal';
        },
    },
    {
        name: 'forgot-password',
        open: async (page) => {
            await page.locator('button.btn-login').first().click();
            await expect(page.locator('#loginModal input[type="email"]')).toBeVisible({ timeout: 10_000 });
            await page.locator('#loginModal').getByRole('link', { name: /forgot/i }).click();
            return '#passwordModal';
        },
    },
    {
        name: 'report-problem',
        open: async (page) => {
            await expect.poll(() => callNavbar(page, 'reportProblemModal'), { timeout: 15_000 }).toBe(true);
            return '#ReportProblemModal';
        },
    },
    {
        name: 'faq',
        open: async (page) => {
            await expect.poll(() => callNavbar(page, 'showFAQModal'), { timeout: 15_000 }).toBe(true);
            return '#FaqModal';
        },
    },
    {
        name: 'eula',
        open: async (page) => {
            await expect.poll(() => callNavbar(page, 'showEulaModal'), { timeout: 15_000 }).toBe(true);
            return '#EulaModal';
        },
    },
];

const WIDTHS = [1024, 1280];

for (const m of MODALS) {
    for (const width of WIDTHS) {
        test(`logged-out modal ${m.name} @ ${width}`, async ({ browser }) => {
            const context = await browser.newContext(); // fresh, NOT authenticated
            const page = await context.newPage();
            const pageErrors: string[] = [];
            page.on('pageerror', (e) => pageErrors.push(e.message));
            await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
            await page.setViewportSize({ width, height: 900 });
            await page.goto('/');
            await expect(page.locator('button.btn-login').first()).toBeVisible({ timeout: 20_000 });

            const modalSel = await m.open(page);
            const dialog = page.locator(`${modalSel} .modal-content`).first();
            await expect(dialog, `${m.name} modal should open`).toBeVisible({ timeout: 20_000 });
            await page.waitForTimeout(800); // settle transition

            // Dialog top must be visible; if it runs past the bottom it must SCROLL so the
            // footer stays reachable (same rule as the authed modal sweep).
            const box = await dialog.boundingBox();
            expect(box, `${m.name} has a box`).not.toBeNull();
            if (box) {
                expect(box.y, `${m.name} dialog top cut off (${Math.round(box.y)})`).toBeGreaterThanOrEqual(-8);
                if (box.y + box.height > 908) {
                    const scrollable = await page.evaluate((sel) => {
                        const content = document.querySelector(sel);
                        const scrolls = (n: Element | null) => !!n && n.scrollHeight - n.clientHeight > 8;
                        return scrolls(content?.closest('.modal') ?? null) || scrolls(content?.querySelector('.modal-body') ?? null);
                    }, `${modalSel} .modal-content`);
                    expect(scrollable, `${m.name} dialog (bottom ${Math.round(box.y + box.height)} > 900) can't scroll -> footer unreachable`).toBe(true);
                }
            }

            const res = await auditControls(page, modalSel);
            const overlapped = res.problems.filter((p) => p.issue === 'overlapped');
            // eslint-disable-next-line no-console
            console.log(`### logged-out ${m.name}@${width}: ${res.checked} controls${overlapped.length ? '' : ' — clean'}${res.problems.map((p) => `\n  [${p.issue}] ${p.el} <- ${p.detail}`).join('')}`);
            expect(overlapped, `${m.name}@${width} overlapped controls: ${overlapped.map((p) => p.el).join('; ')}`).toEqual([]);
            expect(pageErrors, `pageerrors opening ${m.name}`).toEqual([]);

            await collectCoverage(context);
            await context.close();
        });
    }
}
