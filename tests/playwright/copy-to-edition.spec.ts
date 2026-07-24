import { test, expect, loginToken, authedContext, collectCoverage, API } from './fixtures';
import type { BrowserContext, Page } from '@playwright/test';

// copy-to-edition-modal — the SUBMIT path (copyToEdition) that edition-modals.spec.ts
// only opens+cancels. A source edition's first artefact is copied INTO a second
// (target) edition through the modal: the target is chosen from the dropdown and the
// "Copy to edition" button runs artefactService.copyArtefact + router navigation. The
// new artefact is verified in the target edition via the API. Both editions are
// throwaway copies of 811. The open button (openCopyToEdtion) is a dead $bvModal.show
// no-op, so the modal is opened on its component instance (internalVisible) — the same
// approach the existing copy-to-edition test uses to reach it.

const SOURCE_EDITION = 811;

let token: string;

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    await request.dispose();
});

const authHeader = () => ({ Authorization: `Bearer ${token}` });

async function createEdition(ctx: BrowserContext, name: string): Promise<number> {
    const resp = await ctx.request.post(`${API}/v1/editions/${SOURCE_EDITION}`, { headers: authHeader(), data: { name } });
    expect(resp.ok(), 'edition copy should succeed').toBeTruthy();
    return (await resp.json()).id;
}

async function deleteEdition(ctx: BrowserContext, id: number): Promise<void> {
    await ctx.request
        .delete(`${API}/v1/editions/${id}?optional=archiveForAllEditors`, { headers: authHeader() })
        .catch(() => undefined);
}

async function artefactCount(ctx: BrowserContext, ed: number): Promise<number> {
    const res = await ctx.request.get(`${API}/v1/editions/${ed}/artefacts`, { headers: authHeader() });
    const body = await res.json().catch(() => null);
    return body?.artefacts ? (body.artefacts.length as number) : -1;
}

function trackErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    return errors;
}

test('copy-to-edition-modal: copying an artefact into a target edition creates it there', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const source = await createEdition(context, `pw-cte-src-${Date.now()}`);
    const target = await createEdition(context, `pw-cte-tgt-${Date.now()}`);
    const page = await context.newPage();
    await page.setViewportSize({ width: 1400, height: 900 });
    const errors = trackErrors(page);

    try {
        const targetBefore = await artefactCount(context, target);
        expect(targetBefore).toBeGreaterThan(0);

        // Open the source edition's artefact editor on its first artefact.
        const arts = await (await context.request.get(`${API}/v1/editions/${source}/artefacts`, { headers: authHeader() })).json();
        const artId = arts.artefacts[0].id;
        await page.goto(`/editions/${source}/artefacts/${artId}`);
        await expect(page.locator('.artefact-editor, #card, .toolbar, #artefact-grid').first()).toBeVisible({ timeout: 40_000 });

        // The user's editions must be loaded so the target appears in the dropdown.
        await expect
            .poll(
                () =>
                    page.evaluate(() => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const st = (document.getElementById('app') as any)?.__vue_app__?.config?.globalProperties?.$state;
                        return (st?.editions?.items?.length ?? 0) as number;
                    }),
                { timeout: 30_000 }
            )
            .toBeGreaterThan(0);

        // Open the modal on its component (openCopyToEdtion's $bvModal.show is a no-op).
        await expect
            .poll(
                () =>
                    page.evaluate(() => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const app = document.getElementById('app') as any;
                        const root = app?.__vue_app__?._instance;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const collect = (inst: any): any[] => {
                            const out: any[] = [];
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const visit = (vn: any) => {
                                if (!vn || typeof vn !== 'object') return;
                                if (vn.component) out.push(vn.component);
                                const ch = vn.children;
                                if (Array.isArray(ch)) ch.forEach(visit);
                                else if (ch && typeof ch === 'object') Object.values(ch).forEach((c) => (Array.isArray(c) ? c.forEach(visit) : visit(c)));
                            };
                            if (inst.subTree) visit(inst.subTree);
                            return out;
                        };
                        const seen = new Set();
                        const stack = [root];
                        while (stack.length) {
                            const cur = stack.pop();
                            if (!cur || seen.has(cur)) continue;
                            seen.add(cur);
                            if (cur.type?.name === 'copy-to-edition-modal') {
                                (cur.proxy || cur.ctx).internalVisible = true;
                                return true;
                            }
                            for (const child of collect(cur)) stack.push(child);
                        }
                        return false;
                    }),
                { timeout: 20_000 }
            )
            .toBe(true);

        const modal = page.locator('#copy-to-edition-modal');
        await expect(modal).toBeVisible({ timeout: 15_000 });

        // Select the target edition on the modal instance (the dropdown items set
        // editionTargetId/Name; setting them directly is the same state the click sets),
        // then confirm through the modal's own copyToEdition handler. The handler does a
        // router.push + router.go(0) reload; catch the resulting navigation, then verify
        // the target edition gained an artefact via the API.
        await page.evaluate((tgt) => {
            const el = document.querySelector('#copy-to-edition-modal');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let cur: any = (el as any)?.__vueParentComponent;
            while (cur && (!cur.ctx || typeof cur.ctx.copyToEdition !== 'function')) cur = cur.parent;
            const p = cur.proxy || cur.ctx;
            p.editionTargetId = tgt;
            p.editionTargetName = 'target';
        }, target);

        // The confirm button enables once a target is chosen.
        const copyBtn = modal.getByRole('button', { name: /copy to edition/i }).first();
        await expect(copyBtn).toBeEnabled({ timeout: 10_000 });
        // Trigger the copy (the page will reload via router.go(0) — don't await it).
        await copyBtn.click().catch(() => undefined);

        // The artefact was copied into the target edition (verified server-side).
        await expect.poll(() => artefactCount(context, target), { timeout: 25_000 }).toBe(targetBefore + 1);

        expect(errors, `page errors: ${errors.join(' | ')}`).toEqual([]);
    } finally {
        await collectCoverage(context);
        await deleteEdition(context, source);
        await deleteEdition(context, target);
        await context.close();
    }
});
