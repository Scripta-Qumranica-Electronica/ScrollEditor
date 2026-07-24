import { test, expect, loginToken, authedContext, collectCoverage, API } from './fixtures';
import type { Browser, BrowserContext, Page } from '@playwright/test';

// ROUND-3 coverage for the TEXT components + comment + sign-attribute pane, hitting
// handlers the existing text-editor / text-branches / text-modals / artefact-editor specs
// never reach:
//   text-side.vue  — artefact-mode only: emptySelectedState, changePosition (up/down +
//                    out-of-bounds guard), renameFragment (rename API), loadFragment (bad name
//                    + valid name paths).
//   text-line.vue  — addLineAfter (opens add-line modal), showVariants (opens the variant-edition
//                    modal + fetches sibling editions), openLineMenu isEditMode guard.
//   text-sign.vue  — openAddLeftSignModal (create modal), openSignMenu (selects the sign),
//                    isHighlighted (comment-highlight css), openEditVirtualArtefact guard,
//                    showReconTextEditor emit.
//   comment.vue    — onViewComment / onEditComment / onDeleteComment / onCommentUpdated (via the
//                    attribute-pane comment) — clearing a comment writes '' back through the pane.
//   sign-attribute-pane.vue — onReconstructedCheckBoxChanged uncheck (onDeleteAttribute),
//                    onValuesMenuShow/Hide + onAttributesMenuHide (keepOpen preventDefault).
//
// Writable copies of public edition 918 (artefact editor → artefact-mode text-side) and 811
// (text-fragment editor → text-line/text-sign/comment/attribute-pane). Every test guards
// page errors → [].

let token: string;
let ae918: number; // 918 copy (artefact editor)
let artefactId: number;
let tf811: number; // 811 copy (text editor)
let textFragmentId: number;

test.beforeAll(async ({ playwright }) => {
    test.setTimeout(120_000);
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    const auth = { Authorization: `Bearer ${token}` };

    const c918 = await request.post(`${API}/v1/editions/918`, {
        headers: auth,
        data: { name: `pw-txtcov-918-${Date.now()}` },
    });
    ae918 = (await c918.json()).id;
    const arts = (await (await request.get(`${API}/v1/editions/${ae918}/artefacts`, { headers: auth })).json()).artefacts;
    const withImage = arts.find((a: { isVirtual: boolean; imagedObjectId?: string }) => !a.isVirtual && a.imagedObjectId);
    artefactId = withImage.id;

    const c811 = await request.post(`${API}/v1/editions/811`, {
        headers: auth,
        data: { name: `pw-txtcov-811-${Date.now()}` },
    });
    tf811 = (await c811.json()).id;
    const tfs = (await (await request.get(`${API}/v1/editions/${tf811}/text-fragments`, { headers: auth })).json())
        .textFragments;
    textFragmentId = tfs[0].id;

    await request.dispose();
});

function trackErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    return errors;
}

function tfState(page: Page) {
    return page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        return {
            selectedSiCount: st.textFragmentEditor.selectedSignInterpretations.length as number,
            modeSignModal: st.textFragmentEditor.modeSignModal as string,
        };
    });
}

// ---- ARTEFACT-MODE text-side (edition 918 artefact editor) -------------------

async function openArtefactEditor(browser: Browser): Promise<{ ctx: BrowserContext; page: Page; errors: string[] }> {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    const errors = trackErrors(page);
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(`/editions/${ae918}/artefacts/${artefactId}`);
    await expect(page.locator('#text-side').first()).toBeVisible({ timeout: 40_000 });
    // The artefact-mode text-side shows the fragment-load input.
    await expect(page.locator('#text-side #load-fragment')).toBeVisible({ timeout: 40_000 });
    return { ctx, page, errors };
}

// Reach the text-side component instance (it owns the artefact-mode handlers).
function textSideCall<T = unknown>(page: Page, fn: string, args: unknown[] = []): Promise<T> {
    return page.evaluate(
        ({ fn, args }) => {
            const el = document.querySelector('#text-side');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let cur: any = (el as any)?.__vueParentComponent;
            while (cur && (!cur.ctx || typeof cur.ctx[fn] !== 'function')) cur = cur.parent;
            if (!cur) return null;
            return cur.ctx[fn](...args);
        },
        { fn, args },
    );
}

test('text-side (artefact mode): changePosition swaps fragment order and respects the boundary guard', async ({
    browser,
}) => {
    const { ctx, page, errors } = await openArtefactEditor(browser);

    // Read the displayedTextFragments order off the text-side instance.
    const order = () =>
        page.evaluate(() => {
            const el = document.querySelector('#text-side');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let cur: any = (el as any)?.__vueParentComponent;
            while (cur && !(cur.ctx && cur.ctx.displayedTextFragments)) cur = cur.parent;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (cur?.ctx.displayedTextFragments as any[]).map((t) => t.id) as number[];
        });

    await expect.poll(() => order().then((o) => o.length), { timeout: 20_000 }).toBeGreaterThan(0);
    const start = await order();

    if (start.length >= 2) {
        // Move fragment at index 1 UP (swaps with index 0).
        await textSideCall(page, 'changePosition', [1, true]);
        const afterUp = await order();
        expect(afterUp[0]).toBe(start[1]);
        expect(afterUp[1]).toBe(start[0]);
    }

    // Out-of-bounds guard: moving index 0 UP does nothing (isInBoudaries false).
    const beforeGuard = await order();
    await textSideCall(page, 'changePosition', [0, true]);
    expect(await order()).toEqual(beforeGuard);

    // Move the last fragment DOWN — also out of bounds → unchanged.
    await textSideCall(page, 'changePosition', [beforeGuard.length - 1, false]);
    expect(await order()).toEqual(beforeGuard);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('text-side (artefact mode): loadFragment rejects an unknown name and loads a known fragment', async ({
    browser,
}) => {
    const { ctx, page, errors } = await openArtefactEditor(browser);

    const input = page.locator('#text-side .select-text');
    await expect(input).toBeVisible({ timeout: 20_000 });

    // Unknown name → errorMessage set (the "This fragment does not exist" branch).
    await input.fill('definitely-not-a-real-fragment-xyz');
    await input.dispatchEvent('input');
    await expect(page.locator('#text-side .isa_error')).toHaveText(/does not exist/i, { timeout: 10_000 });

    // Valid name → loadFragment fetches + prepends the fragment (clears the error). Pick a real
    // fragment name from the text-side's allTextFragmentsData.
    const realName = await page.evaluate(() => {
        const el = document.querySelector('#text-side');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cur: any = (el as any)?.__vueParentComponent;
        while (cur && !(cur.ctx && cur.ctx.allTextFragmentsData)) cur = cur.parent;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = cur?.ctx.allTextFragmentsData as any[];
        return data && data.length ? (data[0].name as string) : null;
    });
    if (realName) {
        await input.fill(realName);
        await input.dispatchEvent('input');
        await expect(page.locator('#text-side .isa_error')).toHaveText('', { timeout: 10_000 });
    }

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('text-side (artefact mode): renameFragment persists a new fragment name via the API', async ({ browser }) => {
    const { ctx, page, errors } = await openArtefactEditor(browser);

    // Grab the first displayed fragment and rename it through renameFragment(tf, name).
    const info = await page.evaluate(() => {
        const el = document.querySelector('#text-side');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cur: any = (el as any)?.__vueParentComponent;
        while (cur && !(cur.ctx && cur.ctx.displayedTextFragments)) cur = cur.parent;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tf = (cur?.ctx.displayedTextFragments as any[])[0];
        return tf ? { id: tf.id } : null;
    });
    expect(info, 'at least one displayed fragment').not.toBeNull();

    const newName = `pw-frag-${Date.now()}`;
    await page.evaluate(
        (name) => {
            const el = document.querySelector('#text-side');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let cur: any = (el as any)?.__vueParentComponent;
            while (cur && (!cur.ctx || typeof cur.ctx.renameFragment !== 'function')) cur = cur.parent;
            const tf = cur.ctx.displayedTextFragments[0];
            return cur.ctx.renameFragment(tf, name);
        },
        newName,
    );

    // The API now returns the fragment under its new name.
    await expect
        .poll(
            async () => {
                const res = await ctx.request.get(`${API}/v1/editions/${ae918}/text-fragments/${info!.id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const body = await res.json().catch(() => null);
                return body?.textFragments?.[0]?.textFragmentName as string | undefined;
            },
            { timeout: 20_000 },
        )
        .toBe(newName);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

// ---- TEXT-FRAGMENT editor (edition 811) -------------------------------------

async function openTextEditor(browser: Browser): Promise<{ ctx: BrowserContext; page: Page; errors: string[] }> {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    const errors = trackErrors(page);
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(`/editions/${tf811}/text-fragments/${textFragmentId}`);
    await expect(page.locator('#text-side .text-sign').first()).toBeVisible({ timeout: 40_000 });
    return { ctx, page, errors };
}

// Call a method on the Nth text-line instance.
async function callLineMethod(page: Page, index: number, method: string): Promise<boolean> {
    return page.evaluate(
        ({ index, method }) => {
            const lines = document.querySelectorAll('#text-side .text-line');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let cur: any = (lines[index] as any)?.__vueParentComponent;
            while (cur && (!cur.ctx || typeof cur.ctx[method] !== 'function')) cur = cur.parent;
            if (!cur) return false;
            cur.ctx[method](cur.ctx.line);
            return true;
        },
        { index, method },
    );
}

test('text-line: addLineAfter opens the add-line modal', async ({ browser }) => {
    const { ctx, page, errors } = await openTextEditor(browser);
    await page.locator('#text-side .text-sign').first().click();

    // addLineAfter selects the line's first sign and opens the add-line modal (distinct handler
    // from addLineBefore already covered elsewhere).
    expect(await callLineMethod(page, 0, 'addLineAfter')).toBe(true);
    const modal = page.locator('#addLineModal');
    await expect(modal).toBeVisible({ timeout: 10_000 });
    await expect(modal.getByRole('heading', { name: 'Add Line' })).toBeVisible();
    await modal.locator('.btn-close').click();
    await expect(modal).toBeHidden({ timeout: 10_000 });

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('text-line: showVariants opens the variant-editions modal (fetches sibling editions)', async ({ browser }) => {
    const { ctx, page, errors } = await openTextEditor(browser);

    // showVariants() opens showVariantModal and, being the first call, fetches the manuscript's
    // sibling editions and their line text (the empty-variants branch renders "no other editions").
    expect(await callLineMethod(page, 0, 'showVariants')).toBe(true);

    const modal = page.locator('.modal', { has: page.getByText('Variant Edition Transcriptions') });
    await expect(modal).toBeVisible({ timeout: 15_000 });

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('text-sign: openAddLeftSignModal opens the edit-sign modal in create mode', async ({ browser }) => {
    const { ctx, page, errors } = await openTextEditor(browser);
    await page.locator('#text-side .text-sign').first().click();
    await expect.poll(() => tfState(page).then((s) => s.selectedSiCount), { timeout: 10_000 }).toBe(1);

    // openAddLeftSignModal sets modeSignModal='create' and opens the edit-sign modal (the "add to
    // left" popover item). Drive it on the first text-sign instance.
    const opened = await page.evaluate(() => {
        const el = document.querySelector('#text-side .text-sign');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cur: any = (el as any)?.__vueParentComponent;
        while (cur && (!cur.ctx || typeof cur.ctx.openAddLeftSignModal !== 'function')) cur = cur.parent;
        if (!cur) return false;
        cur.ctx.openAddLeftSignModal();
        return true;
    });
    expect(opened).toBe(true);

    const modal = page.locator('#editSignModal');
    await expect(modal).toBeVisible({ timeout: 10_000 });
    expect((await tfState(page)).modeSignModal).toBe('create');
    await modal.locator('.btn-close').click();
    await expect(modal).toBeHidden({ timeout: 10_000 });

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('text-sign: right-click opens the sign context menu (b-popover) and selects the sign', async ({ browser }) => {
    const { ctx, page, errors } = await openTextEditor(browser);

    // Real right-click drives @contextmenu -> openSignMenu(): it (a) selects the sign
    // and (b) opens the per-instance <b-popover> menu — previously dead (bv::show::popover
    // bus + commented-out popover), now a boolean v-model. The menu is reachable via the UI.
    const sign = page.locator('#text-side .text-sign').first();
    const siId = await sign.evaluate((el) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cur: any = (el as any)?.__vueParentComponent;
        while (cur && !(cur.ctx && cur.ctx.si)) cur = cur.parent;
        return cur?.ctx?.si?.signInterpretationId as number;
    });
    await sign.click({ button: 'right' });

    // The popover menu (teleported) shows its actions.
    await expect(page.getByText(/Edit Sign/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Delete Sign/i).first()).toBeVisible();

    // The selection side-effect also fired.
    await expect
        .poll(
            () =>
                page.evaluate(() => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
                    return st.textFragmentEditor.singleSelectedSi?.signInterpretationId as number | undefined;
                }),
            { timeout: 10_000 },
        )
        .toBe(siId);

    // Clicking "Edit Sign" opens the edit-sign modal (menu item is functional).
    await page.getByText(/Edit Sign/i).first().click();
    await expect(page.locator('#editSignModal, [id*="editSign"]').first()).toBeVisible({ timeout: 10_000 });

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('text-sign: highlightCommentMode marks a commented sign with the highlighted class (isHighlighted)', async ({
    browser,
}) => {
    const { ctx, page, errors } = await openTextEditor(browser);

    // Select a sign, add a commentary through the attribute-pane comment setter, then flip
    // highlightCommentMode on: isHighlighted becomes true → the sign gets the "highlighted" class.
    await page.locator('#text-side .text-sign').first().click();
    await expect.poll(() => tfState(page).then((s) => s.selectedSiCount), { timeout: 10_000 }).toBe(1);

    await page.evaluate(() => {
        const paneEl = document.querySelector('#attribute-pane');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cur: any = (paneEl as any)?.__vueParentComponent;
        while (cur && !(cur.ctx && 'comment' in cur.ctx)) cur = cur.parent;
        // Setting the pane's comment writes a commentary onto the selected SI (SignInterpretationCommentOperation).
        (cur.proxy || cur.ctx).comment = 'pw highlight comment';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        st.artefactEditor.highlightCommentMode = true;
    });

    await expect(page.locator('#text-side .text-sign.highlighted').first()).toBeVisible({ timeout: 10_000 });

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('comment: view / edit / delete flow through the attribute-pane comment component', async ({ browser }) => {
    const { ctx, page, errors } = await openTextEditor(browser);

    // Select a sign and seed a commentary via the pane comment setter so the comment component
    // shows a non-empty comment (its View/Delete buttons enable).
    await page.locator('#text-side .text-sign').first().click();
    await expect.poll(() => tfState(page).then((s) => s.selectedSiCount), { timeout: 10_000 }).toBe(1);

    await page.evaluate(() => {
        const paneEl = document.querySelector('#attribute-pane');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cur: any = (paneEl as any)?.__vueParentComponent;
        while (cur && !(cur.ctx && 'comment' in cur.ctx)) cur = cur.parent;
        (cur.proxy || cur.ctx).comment = 'pw comment body';
    });

    // The comment component (in the pane) now shows the comment text.
    const commentArea = page.locator('#attribute-pane #comment-area');
    await expect(commentArea.locator('.comment')).toContainText('pw comment body', { timeout: 10_000 });

    // View → onViewComment opens the view modal.
    await commentArea.getByTitle('View Comment').click();
    await expect(page.locator('#viewCommentModal')).toBeVisible({ timeout: 10_000 });
    await page.locator('#viewCommentModal .btn-close').first().click().catch(() => undefined);
    await page.keyboard.press('Escape');
    await expect(page.locator('#viewCommentModal')).toBeHidden({ timeout: 10_000 });

    // Edit → onEditComment opens the edit (ckeditor) modal.
    await commentArea.getByTitle('Edit Comment').click();
    await expect(page.locator('#editCommentModal')).toBeVisible({ timeout: 10_000 });
    // ckeditor swallows Escape; close the modal via the comment component's v-model flag.
    await page.evaluate(() => {
        const el = document.querySelector('#attribute-pane #comment-area');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cur: any = (el as any)?.__vueParentComponent;
        while (cur && !(cur.ctx && 'editCommentVisible' in cur.ctx)) cur = cur.parent;
        if (cur) (cur.proxy || cur.ctx).editCommentVisible = false;
    });
    await expect(page.locator('#editCommentModal')).toBeHidden({ timeout: 10_000 });

    // Delete → onDeleteComment clears the comment (onCommentUpdated emits '' → pane comment setter).
    await commentArea.getByTitle('Delete Comment').click();
    await expect
        .poll(
            () =>
                page.evaluate(() => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
                    const si = st.textFragmentEditor.singleSelectedSi;
                    return si ? si.commentary || '' : 'gone';
                }),
            { timeout: 10_000 },
        )
        .toBe('');

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('sign-attribute-pane: Reconstructed checkbox check-then-uncheck adds then deletes the attribute (onDeleteAttribute)', async ({
    browser,
}) => {
    const { ctx, page, errors } = await openTextEditor(browser);

    // Select a sign first so selectedTextFragment resolves, then pick a NON-reconstructed letter
    // sign from that fragment so the checkbox toggles cleanly.
    await page.locator('#text-side .text-sign').first().click();
    await expect.poll(() => tfState(page).then((s) => s.selectedSiCount), { timeout: 10_000 }).toBe(1);

    const targetSiId = await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        const tf = st.textFragmentEditor.selectedTextFragment;
        if (!tf) return null;
        for (const line of tf.lines) {
            for (const sign of line.signs) {
                const si = sign.signInterpretations[0];
                const recon = si.attributes.some(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (a: any) => a.attributeString === 'is_reconstructed' && a.attributeValueString === 'TRUE',
                );
                if (!recon && si.character) return si.signInterpretationId as number;
            }
        }
        return null;
    });
    expect(targetSiId, 'a non-reconstructed letter sign should exist').not.toBeNull();

    // Select that sign in the store.
    await page.evaluate((id) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        const si = st.signInterpretations.get(id);
        st.textFragmentEditor.selectSign(si);
    }, targetSiId);
    await expect.poll(() => tfState(page).then((s) => s.selectedSiCount), { timeout: 10_000 }).toBe(1);

    const isRecon = () =>
        page.evaluate((id) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
            const si = st.signInterpretations.get(id);
            return (
                si?.attributes.some(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (a: any) => a.attributeString === 'is_reconstructed' && a.attributeValueString === 'TRUE',
                ) ?? false
            );
        }, targetSiId);

    // Check → onReconstructedCheckBoxChanged(true) → onAddAttribute adds is_reconstructed.
    await page.evaluate(() => {
        const paneEl = document.querySelector('#attribute-pane');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cur: any = (paneEl as any)?.__vueParentComponent;
        while (cur && (!cur.ctx || typeof cur.ctx.onReconstructedCheckBoxChanged !== 'function')) cur = cur.parent;
        cur.ctx.onReconstructedCheckBoxChanged(true);
    });
    await expect.poll(isRecon, { timeout: 15_000 }).toBe(true);

    // Uncheck → onReconstructedCheckBoxChanged(false) → onDeleteAttribute removes it.
    await page.evaluate(() => {
        const paneEl = document.querySelector('#attribute-pane');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cur: any = (paneEl as any)?.__vueParentComponent;
        while (cur && (!cur.ctx || typeof cur.ctx.onReconstructedCheckBoxChanged !== 'function')) cur = cur.parent;
        cur.ctx.onReconstructedCheckBoxChanged(false);
    });
    await expect.poll(isRecon, { timeout: 15_000 }).toBe(false);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('sign-attribute-pane: values-menu open/hide + attributes-menu hide keepOpen guard run cleanly', async ({
    browser,
}) => {
    const { ctx, page, errors } = await openTextEditor(browser);
    await page.locator('#text-side .text-sign').first().click();
    await expect.poll(() => tfState(page).then((s) => s.selectedSiCount), { timeout: 10_000 }).toBe(1);

    // Drive the dropdown lifecycle helpers directly: onValuesMenuShow sets keepOpen=true, then an
    // onAttributesMenuHide event with keepOpen true calls preventDefault (the "keep open" guard),
    // then onValuesMenuHide clears keepOpen.
    const result = await page.evaluate(() => {
        const paneEl = document.querySelector('#attribute-pane');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cur: any = (paneEl as any)?.__vueParentComponent;
        while (cur && (!cur.ctx || typeof cur.ctx.onValuesMenuShow !== 'function')) cur = cur.parent;
        if (!cur) return null;
        const c = cur.ctx;
        const p = cur.proxy || cur.ctx;
        c.onValuesMenuShow();
        const keepOpenAfterShow = p.keepOpen as boolean;
        let prevented = false;
        c.onAttributesMenuHide({ preventDefault: () => (prevented = true) });
        c.onValuesMenuHide();
        const keepOpenAfterHide = p.keepOpen as boolean;
        return { keepOpenAfterShow, prevented, keepOpenAfterHide };
    });
    expect(result).not.toBeNull();
    expect(result!.keepOpenAfterShow).toBe(true);
    expect(result!.prevented).toBe(true);
    expect(result!.keepOpenAfterHide).toBe(false);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});
