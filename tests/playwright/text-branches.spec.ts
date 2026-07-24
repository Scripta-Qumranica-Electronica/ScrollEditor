import { test, expect, loginToken, authedContext, collectCoverage, API } from './fixtures';
import type { Browser, BrowserContext, Page } from '@playwright/test';

// Branch coverage for the TEXT components that the existing text-editor.spec.ts /
// text-modals.spec.ts don't reach: text-sign's deleteSignInterpretation + the
// "add sign" (create-mode) edit-sign modal, text-line's editable-line input path
// (lineChange / checkEnter / onPaste) and its Show-Parallels modal, and the
// add-line-modal's updateLineName "before" branch. Every write runs against a
// throwaway writable copy of edition 811 (1Q9 — small, real text) and is checked
// through the live store / API. The right-click popover bus is dead, so the
// line/sign trigger methods are driven on the component instance (the exact
// handlers the menu items are bound to), exactly like the existing text specs.

const SOURCE_EDITION = 811;

let token: string;
let editionId: number;
let textFragmentId: number;

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    const auth = { Authorization: `Bearer ${token}` };

    const copy = await request.post(`${API}/v1/editions/${SOURCE_EDITION}`, {
        headers: auth,
        data: { name: `pw-textbranch-${Date.now()}` },
    });
    editionId = (await copy.json()).id;

    const tfs = (
        await (await request.get(`${API}/v1/editions/${editionId}/text-fragments`, { headers: auth })).json()
    ).textFragments;
    textFragmentId = tfs[0].id;

    await request.dispose();
});

test.afterAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    await request
        .delete(`${API}/v1/editions/${editionId}?optional=archiveForAllEditors`, {
            headers: { Authorization: `Bearer ${token}` },
        })
        .catch(() => undefined);
    await request.dispose();
});

const authHeader = () => ({ Authorization: `Bearer ${token}` });

function trackErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    return errors;
}

function state(page: Page) {
    return page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        return {
            selectedSiCount: st.textFragmentEditor.selectedSignInterpretations.length as number,
            modeSignModal: st.textFragmentEditor.modeSignModal as string,
        };
    });
}

// Invoke a trigger method on the Nth rendered text-line's component instance.
async function callLineMethod(page: Page, lineIndex: number, method: string): Promise<boolean> {
    return page.evaluate(
        ({ lineIndex, method }) => {
            const lines = document.querySelectorAll('#text-side .text-line');
            const lineEl = lines[lineIndex];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let cur: any = (lineEl as any)?.__vueParentComponent;
            while (cur && (!cur.ctx || typeof cur.ctx[method] !== 'function')) cur = cur.parent;
            if (!cur) return false;
            cur.ctx[method](cur.ctx.line);
            return true;
        },
        { lineIndex, method }
    );
}

async function setModalProp(page: Page, componentName: string, prop: string, value: unknown): Promise<boolean> {
    return page.evaluate(
        ({ componentName, prop, value }) => {
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
                if (cur.type?.name === componentName) {
                    (cur.proxy || cur.ctx)[prop] = value;
                    return true;
                }
                for (const child of collect(cur)) stack.push(child);
            }
            return false;
        },
        { componentName, prop, value }
    );
}

async function openTextEditor(browser: Browser): Promise<{ context: BrowserContext; page: Page; errors: string[] }> {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    await page.setViewportSize({ width: 1400, height: 900 });
    const errors = trackErrors(page);
    await page.goto(`/editions/${editionId}/text-fragments/${textFragmentId}`);
    await expect(page.locator('#text-side .text-sign').first()).toBeVisible({ timeout: 40_000 });
    return { context, page, errors };
}

async function teardown(context: BrowserContext, errors: string[]) {
    await collectCoverage(context);
    await context.close();
    expect(errors, `page errors: ${errors.join('\n')}`).toEqual([]);
}

// -------------------------------------------------------------------------
// text-sign — deleteSignInterpretation (removes the SI from the store)
// -------------------------------------------------------------------------

test('text-sign: deleteSignInterpretation removes the sign interpretation from the store', async ({ browser }) => {
    const { context, page, errors } = await openTextEditor(browser);

    // Pick a LETTER sign in a MIDDLE line (deleting a whole line's only sign at the
    // fragment edge cascades; a middle-line letter deletes cleanly) and record its id.
    await page.locator('#text-side .text-sign').first().click();
    await expect.poll(() => state(page).then((s) => s.selectedSiCount), { timeout: 10_000 }).toBe(1);

    // Pick a NON-FIRST LETTER sign (deleteSignInterpretation reads prevSign =
    // indexInLine - 1, so the first sign of a line can't be deleted this way).
    const target = await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        const tf = st.textFragmentEditor.selectedTextFragment;
        if (!tf) return null;
        for (const line of tf.lines) {
            for (const sign of line.signs) {
                const si = sign.signInterpretations[0];
                if (si.sign?.indexInLine >= 1 && si.signType && si.signType[1] === 'LETTER' && si.character) {
                    return { siid: si.signInterpretationId, lineId: line.lineId };
                }
            }
        }
        return null;
    });
    expect(target, 'a non-first LETTER sign should exist').not.toBeNull();

    // Reach the rendered text-sign for this SI and call deleteSignInterpretation on
    // its component (the popover "Delete Sign" item is bound to exactly this).
    const removed = await page.evaluate((siid) => {
        const signs = document.querySelectorAll('#text-side .text-sign');
        for (const el of Array.from(signs)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let cur: any = (el as any)?.__vueParentComponent;
            while (cur && !(cur.ctx && typeof cur.ctx.deleteSignInterpretation === 'function')) cur = cur.parent;
            if (cur && cur.ctx.si?.signInterpretationId === siid) {
                cur.ctx.deleteSignInterpretation(cur.ctx.si);
                return true;
            }
        }
        return false;
    }, target!.siid);
    expect(removed, 'the text-sign for the target SI should be reachable').toBe(true);

    // The delete operation removes the sign from its line (line.removeSign).
    await expect
        .poll(
            () =>
                page.evaluate(
                    ({ lineId, siid }) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
                        const tf = st.textFragmentEditor.selectedTextFragment;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const line = tf?.lines.find((l: any) => l.lineId === lineId);
                        if (!line) return true;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        return !line.signs.some((s: any) => s.signInterpretations[0].signInterpretationId === siid);
                    },
                    { lineId: target!.lineId, siid: target!.siid }
                ),
            { timeout: 15_000 }
        )
        .toBe(true);

    await teardown(context, errors);
});

// -------------------------------------------------------------------------
// text-sign — openAddRightSignModal opens the edit-sign modal in CREATE mode
// -------------------------------------------------------------------------

test('text-sign: openAddRightSignModal opens the edit-sign modal in create mode', async ({ browser }) => {
    const { context, page, errors } = await openTextEditor(browser);

    // Select a sign that is NOT the first in its line (openAddRightSignModal reads
    // the previous sign in the line: indexInLine - 1). Click the 3rd rendered sign.
    await page.locator('#text-side .text-sign').nth(2).click();
    await expect.poll(() => state(page).then((s) => s.selectedSiCount), { timeout: 10_000 }).toBe(1);

    const opened = await page.evaluate(() => {
        const signs = document.querySelectorAll('#text-side .text-sign');
        // Find a text-sign whose si is not the first in its line.
        for (const el of Array.from(signs)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let cur: any = (el as any)?.__vueParentComponent;
            while (cur && !(cur.ctx && typeof cur.ctx.openAddRightSignModal === 'function')) cur = cur.parent;
            if (!cur) continue;
            const si = cur.ctx.si;
            if (si?.sign?.indexInLine >= 1) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
                st.textFragmentEditor.selectSign(si);
                cur.ctx.openAddRightSignModal();
                return true;
            }
        }
        return false;
    });
    expect(opened, 'a non-first sign should exist to add a sign to its right').toBe(true);

    const modal = page.locator('#editSignModal');
    await expect(modal).toBeVisible({ timeout: 10_000 });
    // Create mode: the modal title is "Add" (edit mode is "Edit") and modeSignModal='create'.
    await expect(modal.getByText('Add', { exact: true })).toBeVisible({ timeout: 10_000 });
    expect((await state(page)).modeSignModal).toBe('create');

    // Close via the header × so nothing is created.
    await modal.locator('.btn-close').click();
    await expect(modal).toBeHidden({ timeout: 10_000 });

    await teardown(context, errors);
});

// -------------------------------------------------------------------------
// edit-sign-modal — CREATE mode Apply (createSignInterpretation adds a sign)
// -------------------------------------------------------------------------

test('edit-sign-modal: create-mode Apply adds a new sign interpretation to the line', async ({ browser }) => {
    const { context, page, errors } = await openTextEditor(browser);

    // Select a non-first sign and open the create ("Add to right") modal on it, capturing
    // the owning line so we can assert its sign count grows after Apply.
    await page.locator('#text-side .text-sign').nth(2).click();
    await expect.poll(() => state(page).then((s) => s.selectedSiCount), { timeout: 10_000 }).toBe(1);

    const info = await page.evaluate(() => {
        const signs = document.querySelectorAll('#text-side .text-sign');
        for (const el of Array.from(signs)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let cur: any = (el as any)?.__vueParentComponent;
            while (cur && !(cur.ctx && typeof cur.ctx.openAddRightSignModal === 'function')) cur = cur.parent;
            if (!cur) continue;
            const si = cur.ctx.si;
            if (si?.sign?.indexInLine >= 1) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
                st.textFragmentEditor.selectSign(si);
                const lineId = si.sign.line.lineId;
                const before = si.sign.line.signs.length;
                cur.ctx.openAddRightSignModal();
                return { lineId, before };
            }
        }
        return null;
    });
    expect(info, 'a non-first sign should be creatable-after').not.toBeNull();

    const modal = page.locator('#editSignModal');
    await expect(modal).toBeVisible({ timeout: 10_000 });
    expect((await state(page)).modeSignModal).toBe('create');

    // Choose a SPACE sign type on the modal (SPACE needs no character, so modeButtonApply
    // is true), then Apply -> statusMode() -> createSignInterpretation() adds a sign.
    expect(
        await page.evaluate(() => {
            const el = document.querySelector('#editSignModal');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let cur: any = (el as any)?.__vueParentComponent;
            while (cur && (!cur.ctx || typeof cur.ctx.statusMode !== 'function')) cur = cur.parent;
            if (!cur) return false;
            const p = cur.proxy || cur.ctx;
            const space = p.signTypes.find((t: { value: string }) => t.value === 'SPACE');
            p.newAttributeValueId = space.id;
            p.newCharacter = '';
            return true;
        })
    ).toBe(true);

    const applyBtn = modal.getByRole('button', { name: 'Apply' });
    await expect(applyBtn).toBeEnabled({ timeout: 10_000 });
    await applyBtn.click();
    await expect(modal).toBeHidden({ timeout: 10_000 });

    // The line gained a sign (createSignInterpretation pushed a new Sign into it).
    await expect
        .poll(
            () =>
                page.evaluate(
                    (lineId) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
                        const tf = st.textFragmentEditor.selectedTextFragment;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const line = tf?.lines.find((l: any) => l.lineId === lineId);
                        return line ? (line.signs.length as number) : -1;
                    },
                    info!.lineId
                ),
            { timeout: 15_000 }
        )
        .toBe(info!.before + 1);

    await teardown(context, errors);
});

// -------------------------------------------------------------------------
// sign-attribute-pane — the add-attributes dropdown menu (prepareAttributesMenu +
// onAddAttribute), separate from the Reconstructed checkbox path already covered
// -------------------------------------------------------------------------

test('sign-attribute-pane: adding an attribute via the +menu attaches it to the sign', async ({ browser }) => {
    const { context, page, errors } = await openTextEditor(browser);

    await page.locator('#text-side .text-sign').first().click();
    await expect.poll(() => state(page).then((s) => s.selectedSiCount), { timeout: 10_000 }).toBe(1);

    // Drive the pane's add-attribute flow: prepareAttributesMenu() builds the list of
    // addable attributes for the selected sign, then onAddAttribute(attr, value) adds
    // the first addable attribute-value (a TextFragmentAttributeOperation). This is the
    // dropdown-menu path (distinct from the Reconstructed checkbox already covered).
    const added = await page.evaluate(() => {
        const paneEl = document.querySelector('#attribute-pane');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cur: any = (paneEl as any)?.__vueParentComponent;
        while (cur && (!cur.ctx || typeof cur.ctx.prepareAttributesMenu !== 'function')) cur = cur.parent;
        if (!cur) return null;
        const p = cur.proxy || cur.ctx;
        p.onAddAttributesMenuOpen();
        const menu = p.prepareAttributesMenu();
        // Pick an attribute + value combo not already on the sign.
        for (const attr of menu) {
            if (attr.values && attr.values.length) {
                const val = attr.values[0];
                p.onAddAttribute(attr, val);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
                const siId = st.textFragmentEditor.selectedSignInterpretations[0].id;
                return { siId, attrId: attr.attributeId, valueId: val.id };
            }
        }
        return null;
    });
    expect(added, 'the selected sign should have at least one addable attribute').not.toBeNull();

    // The selected sign now carries the newly added attribute value.
    await expect
        .poll(
            () =>
                page.evaluate(
                    ({ siId, attrId, valueId }) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
                        const si = st.signInterpretations.get(siId);
                        return (
                            si?.attributes.some(
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                (a: any) => a.attributeId === attrId && a.attributeValueId === valueId
                            ) ?? false
                        );
                    },
                    added!
                ),
            { timeout: 15_000 }
        )
        .toBe(true);

    await teardown(context, errors);
});

// -------------------------------------------------------------------------
// text-line — editable-line input handlers via the edit-line modal
// -------------------------------------------------------------------------

test('text-line: the editable line inside the edit-line modal fires lineChange/checkEnter', async ({ browser }) => {
    const { context, page, errors } = await openTextEditor(browser);
    await page.locator('#text-side .text-sign').first().click();

    // Open the edit-line modal — the text-line inside it is rendered in edit mode,
    // so typing/Enter drive lineChange() + checkEnter() (uncovered in the read-only side).
    expect(await callLineMethod(page, 0, 'openEditLineModal')).toBe(true);
    const modal = page.locator('#editLineModal');
    await expect(modal).toBeVisible({ timeout: 10_000 });

    const editable = modal.locator('.line-container[contenteditable="true"]').first();
    await expect(editable).toBeVisible({ timeout: 10_000 });

    // Focus + type into the contenteditable line: @input -> lineChange() emits the text.
    await editable.click();
    await editable.evaluate((el) => {
        el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    // Enter -> checkEnter() preventDefaults and blurs the line.
    await editable.press('Enter');

    // Paste -> onPaste() intercepts and inserts the text node.
    await editable.evaluate((el) => {
        const dt = new DataTransfer();
        dt.setData('text', 'x');
        el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    });

    // The modal is still alive (no crash from the handlers); Save runs the replace path.
    await expect(modal.getByRole('button', { name: 'Save' })).toBeVisible();
    await modal.getByRole('button', { name: 'Save' }).click();
    await expect(modal).toBeHidden({ timeout: 10_000 });

    await teardown(context, errors);
});

// -------------------------------------------------------------------------
// text-line — the Show-Parallels modal opens (showParallels + its modal markup)
// -------------------------------------------------------------------------

test('text-line: showParallels opens the QD parallels modal', async ({ browser }) => {
    const { context, page, errors } = await openTextEditor(browser);

    // showParallels() opens showParallelModal; edition 811's line has no QWB word ids
    // that differ, so no network fetch fires and the "no parallels" branch renders.
    expect(await callLineMethod(page, 0, 'showParallels')).toBe(true);

    const modal = page.locator('.modal', { has: page.getByText('Parallel Texts from QD') });
    await expect(modal).toBeVisible({ timeout: 10_000 });
    await expect(modal.getByText(/No parallel text found/i)).toBeVisible({ timeout: 10_000 });

    await teardown(context, errors);
});

// -------------------------------------------------------------------------
// add-line-modal — updateLineName "before" branch (position='before')
// -------------------------------------------------------------------------

test('add-line-modal: adding a line BEFORE names/creates it via the before branch', async ({ browser }) => {
    const { context, page, errors } = await openTextEditor(browser);

    const lineCount = async () => {
        const res = await context.request.get(`${API}/v1/editions/${editionId}/text-fragments/${textFragmentId}`, {
            headers: authHeader(),
        });
        const body = await res.json().catch(() => null);
        const tf = body?.textFragments?.[0];
        return tf ? (tf.lines.length as number) : -1;
    };

    const before = await lineCount();
    expect(before).toBeGreaterThan(2);

    // Select a sign in a MIDDLE line so add-before is anchored between two lines,
    // then open the add-line modal via addLineBefore (sets up selectedSignInterpretation).
    await page.evaluate(() => {
        const lineEl = document.querySelectorAll('#text-side .text-line')[1];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cur: any = (lineEl as any)?.__vueParentComponent;
        while (cur && (!cur.ctx || typeof cur.ctx.addLineBefore !== 'function')) cur = cur.parent;
        cur.ctx.addLineBefore(cur.ctx.line);
    });

    const modal = page.locator('#addLineModal');
    await expect(modal).toBeVisible({ timeout: 10_000 });

    // Drive the "before" branch: the text-line never sets position, so set it to
    // 'before' the way an "Add Line Before" action means. This exercises the
    // updateLineName before-branch (name = <prev>_1) and previousLineId/subsequentLineId.
    expect(await setModalProp(page, 'add-line-modal', 'position', 'before')).toBe(true);
    await modal.getByRole('button', { name: 'Save' }).click();
    await expect(modal).toBeHidden({ timeout: 10_000 });

    // The create hit the API; the fragment gained a line.
    await expect.poll(lineCount, { timeout: 20_000 }).toBe(before + 1);

    await teardown(context, errors);
});
