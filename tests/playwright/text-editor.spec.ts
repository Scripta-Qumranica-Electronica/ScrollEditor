import {
    test,
    expect,
    loginToken,
    authedContext,
    collectCoverage,
    API,
} from './fixtures';
import type { Browser, BrowserContext, Page } from '@playwright/test';

// Deep interaction coverage for the TEXT-FRAGMENT EDITOR. The artefact editor in
// text-fragment mode (route /editions/:id/text-fragments/:tfId) renders the same
// grid but drives src/components/text/** (text-fragment, text-line, text-sign) and
// the line/sign modals (add-line, edit-line, delete-line, edit-sign) plus the
// sign-attribute pane/modal. Runs against a throwaway writable copy of edition 918.

let token: string;
let editionId: number;
let textFragmentId: number;

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    const auth = { Authorization: `Bearer ${token}` };

    const copy = await request.post(`${API}/v1/editions/918`, {
        headers: auth,
        data: { name: `pw-text-${Date.now()}` },
    });
    editionId = (await copy.json()).id;

    const tfs = (
        await (
            await request.get(`${API}/v1/editions/${editionId}/text-fragments`, {
                headers: auth,
            })
        ).json()
    ).textFragments;
    textFragmentId = tfs[0].id;

    await request.dispose();
});

function trackErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    return errors;
}

function state(page: Page) {
    return page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config
            .globalProperties.$state;
        return {
            selectedSiCount: st.textFragmentEditor.selectedSignInterpretations
                .length as number,
            modeSignModal: st.textFragmentEditor.modeSignModal as string,
            fontSize: st.artefactEditor.params?.fontSize as number | undefined,
            zoom: st.artefactEditor.params?.zoom as number | undefined,
        };
    });
}

// Invoke a trigger method (openEditLineModal / deleteLine / addLineBefore) on the
// first text-line component instance. These call the real showModal() path — the
// context-menu popover that would normally invoke them relies on a dead vue-2
// popover bus, so we reach the instance directly to exercise the modal + operation.
async function callTextLineMethod(page: Page, method: string) {
    return page.evaluate((m) => {
        const el = document.querySelector('#text-side .text-line');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cur: any = (el as any)?.__vueParentComponent;
        while (cur && (!cur.ctx || typeof cur.ctx[m] !== 'function')) {
            cur = cur.parent;
        }
        if (!cur) return false;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const line = cur.ctx.line;
        cur.ctx[m](line);
        return true;
    }, method);
}

async function openTextEditor(browser: Browser): Promise<{
    context: BrowserContext;
    page: Page;
    errors: string[];
}> {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    await page.setViewportSize({ width: 1400, height: 900 });
    const errors = trackErrors(page);
    await page.goto(`/editions/${editionId}/text-fragments/${textFragmentId}`);
    // Wait for the text to render (text-sign spans inside the text-side).
    await expect(page.locator('#text-side .text-sign').first()).toBeVisible({
        timeout: 40_000,
    });
    return { context, page, errors };
}

async function teardown(context: BrowserContext, errors: string[]) {
    await collectCoverage(context);
    await context.close();
    expect(errors, `page errors: ${errors.join('\n')}`).toEqual([]);
}

test('text editor: the text fragment renders as lines and signs, no page errors', async ({
    browser,
}) => {
    const { context, page, errors } = await openTextEditor(browser);

    // text-fragment.vue -> text-line.vue -> text-sign.vue
    await expect(page.locator('#text-side .text-fragment')).toHaveCount(1, {
        timeout: 10_000,
    });
    const lineCount = await page.locator('#text-side .text-line').count();
    expect(lineCount).toBeGreaterThan(0);
    const signCount = await page.locator('#text-side .text-sign').count();
    expect(signCount).toBeGreaterThan(0);
    // Each text-line shows its line-name label.
    await expect(page.locator('#text-side .line-name').first()).toBeVisible();

    await teardown(context, errors);
});

test('text editor: clicking a sign selects it and renders the sign-wheel + attribute pane', async ({
    browser,
}) => {
    const { context, page, errors } = await openTextEditor(browser);

    await page.locator('#text-side .text-sign').first().click();
    await expect
        .poll(() => state(page).then((s) => s.selectedSiCount), {
            timeout: 10_000,
        })
        .toBe(1);

    // The selected sign gets the "selected" css class (text-sign reactivity).
    await expect(
        page.locator('#text-side .text-sign.selected').first(),
    ).toBeVisible({ timeout: 10_000 });
    // sign-wheel renders on single selection.
    await expect(page.locator('.sign-wheel')).toBeVisible({ timeout: 10_000 });
    // attribute pane shows this sign's attribute pills.
    await expect(
        page.locator('#attribute-pane .attribute-pane-sign-pill').first(),
    ).toBeVisible({ timeout: 10_000 });

    await teardown(context, errors);
});

test('text editor: ctrl-click selects multiple signs (multi-select path)', async ({
    browser,
}) => {
    const { context, page, errors } = await openTextEditor(browser);

    // A plain click selects one sign; a ctrl-click on another adds it
    // (onSignInterpretationClicked -> toggleSelectSign). Dispatch the modified
    // click directly so the ctrlKey flag is applied deterministically across OSes.
    await page.locator('#text-side .text-sign').nth(0).click();
    await expect
        .poll(() => state(page).then((s) => s.selectedSiCount), {
            timeout: 10_000,
        })
        .toBe(1);
    await page.evaluate(() => {
        const signs = document.querySelectorAll('#text-side .text-sign');
        signs[5].dispatchEvent(
            new MouseEvent('click', { bubbles: true, ctrlKey: true }),
        );
    });

    await expect
        .poll(() => state(page).then((s) => s.selectedSiCount), {
            timeout: 10_000,
        })
        .toBeGreaterThanOrEqual(2);

    await teardown(context, errors);
});

test('text editor: the edit-sign modal opens with its fields and cancels', async ({
    browser,
}) => {
    const { context, page, errors } = await openTextEditor(browser);

    // Select a sign, then open the edit-sign modal exactly as text-sign does.
    await page.locator('#text-side .text-sign').first().click();
    await expect
        .poll(() => state(page).then((s) => s.selectedSiCount), {
            timeout: 10_000,
        })
        .toBe(1);

    await page.evaluate(() => {
        const el = document.querySelector('#text-side .text-sign');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cur: any = (el as any)?.__vueParentComponent;
        while (
            cur &&
            (!cur.ctx || typeof cur.ctx.openEditSignModal !== 'function')
        ) {
            cur = cur.parent;
        }
        cur.ctx.openEditSignModal();
    });

    const modal = page.locator('#editSignModal');
    await expect(modal).toBeVisible({ timeout: 10_000 });
    // The edit-sign modal (mode 'edit') exposes a character input, a sign-type
    // select and an Apply button. The character input is present (rendered once
    // editedSi is set by @shown) though its wrapper collapses it visually, so we
    // assert presence for it and visibility for the reliably-laid-out controls.
    await expect(modal.locator('input.w-input')).toHaveCount(1, {
        timeout: 10_000,
    });
    await expect(modal.locator('select')).toBeVisible({ timeout: 10_000 });
    await expect(modal.getByRole('button', { name: 'Apply' })).toBeVisible();
    expect((await state(page)).modeSignModal).toBe('edit');

    // Cancel via the modal header's close (×) button (Escape is captured by the
    // focused input inside the modal, so it wouldn't dismiss it).
    await modal.locator('.btn-close').click();
    await expect(modal).toBeHidden({ timeout: 10_000 });

    await teardown(context, errors);
});

test('text editor: the edit-line modal opens showing the editable line and cancels', async ({
    browser,
}) => {
    const { context, page, errors } = await openTextEditor(browser);
    await page.locator('#text-side .text-sign').first().click();

    expect(await callTextLineMethod(page, 'openEditLineModal')).toBe(true);

    const modal = page.locator('#editLineModal');
    await expect(modal).toBeVisible({ timeout: 10_000 });
    await expect(
        modal.getByRole('heading', { name: 'Edit Line' }),
    ).toBeVisible();
    // The modal renders an editable text-line and a Save button + Reconstructed checkbox.
    await expect(modal.locator('.line-container').first()).toBeVisible({
        timeout: 10_000,
    });
    await expect(modal.getByRole('button', { name: 'Save' })).toBeVisible();

    await modal.locator('.btn-close').click();
    await expect(modal).toBeHidden({ timeout: 10_000 });

    await teardown(context, errors);
});

test('text editor: the add-line modal opens with a name field and cancels', async ({
    browser,
}) => {
    const { context, page, errors } = await openTextEditor(browser);
    await page.locator('#text-side .text-sign').first().click();

    expect(await callTextLineMethod(page, 'addLineBefore')).toBe(true);

    const modal = page.locator('#addLineModal');
    await expect(modal).toBeVisible({ timeout: 10_000 });
    await expect(
        modal.getByRole('heading', { name: 'Add Line' }),
    ).toBeVisible();
    // It has an input for the line name and a Save button.
    await expect(modal.locator('input').first()).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Save' })).toBeVisible();

    await modal.locator('.btn-close').click();
    await expect(modal).toBeHidden({ timeout: 10_000 });

    await teardown(context, errors);
});

test('text editor: the delete-line modal opens with a confirm prompt and cancels', async ({
    browser,
}) => {
    const { context, page, errors } = await openTextEditor(browser);
    await page.locator('#text-side .text-sign').first().click();

    expect(await callTextLineMethod(page, 'deleteLine')).toBe(true);

    const modal = page.locator('#deleteLineModal');
    await expect(modal).toBeVisible({ timeout: 10_000 });
    await expect(
        modal.getByRole('heading', { name: 'Delete Line' }),
    ).toBeVisible();
    await expect(
        modal.getByText(/Are you sure you want to delete line/),
    ).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Confirm' })).toBeVisible();

    await modal.locator('.btn-close').click();
    await expect(modal).toBeHidden({ timeout: 10_000 });

    await teardown(context, errors);
});

test('text editor: clicking an attribute pill opens the sign-attribute modal and closes', async ({
    browser,
}) => {
    const { context, page, errors } = await openTextEditor(browser);
    await page.locator('#text-side .text-sign').first().click();
    await expect
        .poll(() => state(page).then((s) => s.selectedSiCount), {
            timeout: 10_000,
        })
        .toBe(1);

    const pill = page
        .locator('#attribute-pane .attribute-pane-sign-pill')
        .first();
    await expect(pill).toBeVisible({ timeout: 10_000 });
    await pill.click();

    const modal = page.locator('#sign-attribute-modal');
    await expect(modal).toBeVisible({ timeout: 10_000 });
    await expect(modal.getByText('Attribute Information')).toBeVisible();

    await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state.textFragmentEditor.selectedAttribute =
            null;
    });
    await expect(modal).toBeHidden({ timeout: 10_000 });

    await teardown(context, errors);
});

test('text editor: toolbar zoom + font-size controls work in text-fragment mode', async ({
    browser,
}) => {
    const { context, page, errors } = await openTextEditor(browser);

    const before = await state(page);
    await page.getByTitle('Zoom In').first().click();
    await expect
        .poll(() => state(page).then((s) => s.zoom), { timeout: 10_000 })
        .toBeGreaterThan(before.zoom!);

    const fontBefore = (await state(page)).fontSize!;
    await page.locator('.fa.fa-font:not(.minus)').first().click();
    await expect
        .poll(() => state(page).then((s) => s.fontSize), { timeout: 10_000 })
        .not.toBe(fontBefore);

    await teardown(context, errors);
});
