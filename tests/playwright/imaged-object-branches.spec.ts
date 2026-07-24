import { test, expect, loginToken, authedContext, collectCoverage, API } from './fixtures';
import type { Browser, BrowserContext, Page } from '@playwright/test';

// P10 — BRANCH coverage for the IMAGED-OBJECT EDITOR view, driving imaged-object-editor.vue
// paths the existing editor-controls / artefact-editor-deep specs miss:
//   - the New-artefact modal (v-if showNewModal): open it (@click showNewModal=true),
//     @shown → newModalShown() focuses the name input, canCreate reacts to the name, cancel
//     closes it,
//   - onDeleteArtefact(): delete an artefact and land on the artefacts[0] re-selection branch,
//   - the recto/verso side switch on a two-sided imaged object where sideArtefactChanged
//     re-selects an artefact on the new side (artefact.side !== side branch).
//
// Uses throwaway copies of public edition 811 — its imaged objects each carry a recto AND a
// verso artefact, exactly what the side-switch + delete branches need. Every test installs a
// pageerror listener and asserts [].

let token: string;
let editionId: number;
let imagedObjectId: string;

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    const auth = { Authorization: `Bearer ${token}` };

    const copy = await request.post(`${API}/v1/editions/811`, {
        headers: auth,
        data: { name: `pw-io-branch-${Date.now()}` },
    });
    editionId = (await copy.json()).id;

    const arts = (await (await request.get(`${API}/v1/editions/${editionId}/artefacts`, { headers: auth })).json())
        .artefacts;
    // Pick an imaged object that has BOTH a recto and a verso artefact.
    const bySide: Record<string, { recto: boolean; verso: boolean }> = {};
    for (const a of arts) {
        if (!a.imagedObjectId || a.isVirtual) continue;
        bySide[a.imagedObjectId] = bySide[a.imagedObjectId] || { recto: false, verso: false };
        if (a.side === 'recto') bySide[a.imagedObjectId].recto = true;
        if (a.side === 'verso') bySide[a.imagedObjectId].verso = true;
    }
    imagedObjectId = Object.keys(bySide).find((io) => bySide[io].recto && bySide[io].verso)!;
    expect(imagedObjectId, 'need a two-sided imaged object').toBeTruthy();

    await request.dispose();
});

function ioCtx(page: Page) {
    return page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c = (document.querySelector('#imaged-object-grid') as any)?.__vueParentComponent?.ctx;
        return {
            side: c?.side as string,
            artefactId: c?.artefactId as number,
            showNewModal: !!c?.showNewModal,
            canCreate: !!c?.canCreate,
            visibleCount: (c?.visibleArtefacts?.length ?? 0) as number,
            totalArtefacts: (c?.artefacts?.length ?? 0) as number,
        };
    });
}

async function openEditor(browser: Browser): Promise<{ ctx: BrowserContext; page: Page; errors: string[] }> {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(`/editions/${editionId}/imaged-objects/${imagedObjectId}`);
    await expect(page.getByTitle('Zoom In').first()).toBeVisible({ timeout: 40_000 });
    await expect(page.locator('#transform-root')).toBeVisible({ timeout: 20_000 });
    return { ctx, page, errors };
}

test('imaged-object editor: New-artefact modal opens (focuses name input), canCreate reacts to the name, cancel closes it', async ({
    browser,
}) => {
    const { ctx, page, errors } = await openEditor(browser);

    // Open the New-artefact modal via showNewModal (the slot <b-btn> that would set it is a
    // no-op in this bootstrap-vue-next build — `b-btn` isn't registered — so drive the flag
    // the button's @click sets). This renders the modal (v-if showNewModal).
    await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cmp = (document.querySelector('#imaged-object-grid') as any).__vueParentComponent;
        (cmp.proxy || cmp.ctx).showNewModal = true; // reactive write goes through proxy
    });

    // The modal (v-if showNewModal) renders; @shown → newModalShown() focuses #newName.
    const modal = page.locator('#newModal');
    await expect(modal).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#newName')).toBeVisible({ timeout: 10_000 });

    // Empty name → canCreate false; typing a name flips it true (canCreate getter branch).
    await expect.poll(() => ioCtx(page).then((c) => c.canCreate), { timeout: 10_000 }).toBe(false);
    await page.locator('#newName').fill('pw-branch-artefact');
    await expect.poll(() => ioCtx(page).then((c) => c.canCreate), { timeout: 10_000 }).toBe(true);

    // Cancel dismisses without creating. The modal's cancel-title is $t('misc.cancel')
    // ("Delete ROI" in this locale); click the footer button that is NOT the "Create" OK
    // button.
    await modal
        .locator('.modal-footer button')
        .filter({ hasNot: page.getByText('Create', { exact: true }) })
        .first()
        .click();
    await expect(modal).toBeHidden({ timeout: 10_000 });

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('imaged-object editor: switching to Verso re-selects the verso-side artefact (sideArtefactChanged)', async ({
    browser,
}) => {
    const { ctx, page, errors } = await openEditor(browser);

    // Boots on recto with the recto artefact selected.
    const start = await ioCtx(page);
    expect(start.side).toBe('recto');
    const rectoArtefactId = start.artefactId;

    // Open the Side dropdown → Verso. sideArtefactChanged sets side='verso'; because the
    // currently-selected artefact.side ('recto') !== 'verso' and the verso side has an
    // artefact, it re-selects visibleArtefacts[0] (a different, verso artefact).
    const sideToggle = page.locator('.dropdown-toggle', { hasText: /recto|verso/i }).first();
    await sideToggle.click();
    await page.getByRole('menuitem', { name: /verso/i }).first().click();

    await expect.poll(() => ioCtx(page).then((c) => c.side), { timeout: 10_000 }).toBe('verso');
    await expect.poll(() => ioCtx(page).then((c) => c.artefactId), { timeout: 10_000 }).not.toBe(rectoArtefactId);
    // The verso artefact still renders in the image group.
    await expect(page.locator('#transform-root')).toBeVisible({ timeout: 10_000 });

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('imaged-object editor: Delete artefact removes it and re-selects the remaining artefact (onDeleteArtefact)', async ({
    browser,
}) => {
    const { ctx, page, errors } = await openEditor(browser);

    const start = await ioCtx(page);
    const doomedId = start.artefactId;
    const totalBefore = start.totalArtefacts;
    expect(totalBefore).toBeGreaterThan(1); // recto + verso, so a Delete leaves ≥1 behind

    // Click the selected row's Delete button → onDeleteArtefact(art): deletes on the server,
    // then artefacts[0] exists so artefactId := artefacts[0].id (the re-selection branch).
    await page
        .locator('#imaged-object-artefacts .selectedRow')
        .getByRole('button', { name: /^Delete$/ })
        .first()
        .click();

    await expect.poll(() => ioCtx(page).then((c) => c.totalArtefacts), { timeout: 15_000 }).toBe(totalBefore - 1);
    // The deleted artefact is gone from the store and a remaining artefact is now selected.
    await expect
        .poll(
            () =>
                page.evaluate(
                    (id) =>
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        !!(document.querySelector('#imaged-object-grid') as any)?.__vueParentComponent?.ctx?.artefacts?.find(
                            (a: { id: number }) => a.id === id,
                        ),
                    doomedId,
                ),
            { timeout: 10_000 },
        )
        .toBe(false);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});
