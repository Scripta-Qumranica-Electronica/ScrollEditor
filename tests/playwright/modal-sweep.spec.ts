import { test, expect, loginToken, authedContext, collectCoverage, API } from './fixtures';
import { auditControls } from './sweep-helpers';
import type { BrowserContext, Page } from '@playwright/test';

// Layout/visibility sweep for MODALS — where most layout bugs hide (overlapping controls,
// content cut off, buttons off the bottom edge). For each modal we open it, then assert:
//   - its interactive controls aren't overlapped or clipped,
//   - the dialog fits within the viewport (not cut off top/bottom),
//   - no pageerror.
// Run at 1280 and 1024 (a narrower width squeezes modals hardest).

let token: string;
let ed: number;
let artId: number;

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    const auth = { Authorization: `Bearer ${token}` };
    const copyText = await (await request.post(`${API}/v1/editions/899`, { headers: auth, data: { name: `pw-modalsweep-${Date.now()}` } })).text();
    ed = Number((copyText.match(/"id":\s*(\d+)/) || [])[1]);
    const arts = (await (await request.get(`${API}/v1/editions/${ed}/artefacts`, { headers: auth })).json()).artefacts;
    artId = arts[0].id;
    await request.dispose();
});

// Each modal: how to open it (returns the modal's selector), from a fresh authed page.
// (The login/register/forgot modals are logged-OUT flows — covered by smoke/public-user-flows,
// not here, since this sweep runs as a logged-in user.)
const MODALS: Array<{ name: string; open: (page: Page) => Promise<string> }> = [
    {
        name: 'copy-edition',
        open: async (page) => {
            await page.goto('/home/public');
            await page.getByText('Copy Edition').first().click();
            return '#copy-edition-modal';
        },
    },
    {
        name: 'metadata',
        open: async (page) => {
            await page.goto(`/editions/${ed}/artefacts`);
            await page.getByRole('button', { name: /Manuscript Information/i }).click();
            return '#editionMetadataModal';
        },
    },
    {
        name: 'permission',
        open: async (page) => {
            await page.goto(`/editions/${ed}`);
            await page.getByRole('button', { name: /collaborators/i }).click();
            return '#permissionModal';
        },
    },
    {
        name: 'add-artefact',
        open: async (page) => {
            await page.goto(`/editions/${ed}/scroll-editor/`);
            // The button lives in the manuscript-toolbar; walk UP the parent chain to its
            // handler (robust to layout), as scroll-editor-modals.spec does.
            await expect
                .poll(
                    () =>
                        page.evaluate(() => {
                            const el = document.querySelector('#secondary-toolbar') || document.body;
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            let cur: any = (el as any)?.__vueParentComponent;
                            while (cur && (!cur.ctx || typeof cur.ctx.openAddArtefactModal !== 'function')) cur = cur.parent;
                            if (!cur) return false;
                            cur.ctx.openAddArtefactModal();
                            return true;
                        }),
                    { timeout: 15_000 }
                )
                .toBe(true);
            return '#addArtefactModal';
        },
    },
    {
        name: 'copy-to-edition',
        open: async (page) => {
            await page.goto(`/editions/${ed}/artefacts/${artId}`);
            await expect(page.locator('#text-side .text-sign, #artefact-image').first()).toBeVisible({ timeout: 40_000 });
            // The button is small in the toolbar; call its handler directly (openCopyToEdtion).
            await page.evaluate(() => {
                const b = Array.from(document.querySelectorAll('#toolbar button')).find((x) =>
                    /copy to edition/i.test(x.getAttribute('title') || '')
                ) as HTMLElement | undefined;
                b?.click();
            });
            return '#copy-to-edition-modal';
        },
    },
];

const WIDTHS = [1024, 1280];

for (const m of MODALS) {
    for (const width of WIDTHS) {
        test(`modal ${m.name} @ ${width}`, async ({ browser }) => {
            const context: BrowserContext = await authedContext(browser, token);
            const page = await context.newPage();
            const pageErrors: string[] = [];
            page.on('pageerror', (e) => pageErrors.push(e.message));
            await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
            await page.setViewportSize({ width, height: 900 });

            const modalSel = await m.open(page);
            // The visible dialog box (not the full-screen backdrop) for the fits-viewport check.
            const dialog = page.locator(`${modalSel} .modal-content`).first();
            await expect(dialog, `${m.name} modal should open`).toBeVisible({ timeout: 20_000 });
            await page.waitForTimeout(800); // settle transition

            // The dialog's TOP must be visible (header/close reachable), and if it extends
            // past the viewport bottom it must be SCROLLABLE so the bottom stays reachable
            // (a tall modal that scrolls is fine; one that clips its footer is a bug).
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

            // Controls inside the modal aren't overlapped (clipped is info-only — a modal
            // body may scroll). The fits-viewport check above catches a cut-off dialog.
            const res = await auditControls(page, modalSel);
            const overlapped = res.problems.filter((p) => p.issue === 'overlapped');
            const info = res.problems.filter((p) => p.issue !== 'overlapped');
            // eslint-disable-next-line no-console
            console.log(`### modal ${m.name}@${width}: ${res.checked} controls${overlapped.length ? '' : ' — clean'}${res.problems.map((p) => `\n  [${p.issue}] ${p.el} <- ${p.detail}`).join('')}`);
            void info;
            expect(overlapped, `${m.name}@${width} overlapped modal controls: ${overlapped.map((p) => p.el).join('; ')}`).toEqual([]);
            expect(pageErrors, `pageerrors opening ${m.name}`).toEqual([]);

            await collectCoverage(context);
            await context.close();
        });
    }
}
