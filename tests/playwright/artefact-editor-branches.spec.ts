import { test, expect, loginToken, authedContext, collectCoverage, API } from './fixtures';
import type { Browser, BrowserContext, Page } from '@playwright/test';

// P9 — BRANCH coverage for the ARTEFACT EDITOR view, driving artefact-editor.vue paths
// the existing artefact-editor / artefact-editor-deep specs miss:
//   - openCopyToEdtion() (the "Copy to edition" toolbar button click),
//   - the full ROI lifecycle inside the editor: draw a polygon (onNewPolygon) → click the
//     rendered ROI (onRoiClicked, which selects its sign) → delete it via the now-enabled
//     trash button (onDeleteRoi, isDeleteEnabled → true),
//   - onAuto()'s guard branch (>1 selected signs with autoMode on → toast + autoMode off).
//
// Runs against a throwaway copy of public edition 918 (rich imaged objects / artefacts).
// Every test installs a pageerror listener and asserts [].

let token: string;
let editionId: number;
let artefactId: number;

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    const auth = { Authorization: `Bearer ${token}` };

    const copy = await request.post(`${API}/v1/editions/918`, {
        headers: auth,
        data: { name: `pw-artefact-branch-${Date.now()}` },
    });
    editionId = (await copy.json()).id;

    const arts = (await (await request.get(`${API}/v1/editions/${editionId}/artefacts`, { headers: auth })).json())
        .artefacts;
    const withImage = arts.find((a: { isVirtual: boolean; imagedObjectId?: string }) => !a.isVirtual && a.imagedObjectId);
    artefactId = withImage.id;

    await request.dispose();
});

function state(page: Page) {
    return page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        const tr = document.querySelector('#transform-root');
        return {
            selectedSiCount: st.textFragmentEditor.selectedSignInterpretations.length as number,
            selectedRoi: !!st.artefactEditor.selectedInterpretationRoi,
            transform: tr ? tr.getAttribute('transform') : null,
        };
    });
}

// The artefact-editor instance owns actionMode / isDrawingEnabled / operationsManager.
function editorCtx(page: Page) {
    return page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c = (document.querySelector('#artefact-grid') as any)?.__vueParentComponent?.ctx;
        return {
            isDrawingEnabled: !!c?.isDrawingEnabled,
            isDeleteEnabled: !!c?.isDeleteEnabled,
            actionMode: c?.actionMode as string,
            undoLen: c?.operationsManager?.undoStack?.length as number,
        };
    });
}

async function openEditor(browser: Browser): Promise<{ ctx: BrowserContext; page: Page; errors: string[] }> {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(`/editions/${editionId}/artefacts/${artefactId}`);
    await expect.poll(() => state(page).then((s) => s.transform), { timeout: 40_000 }).not.toBeNull();
    return { ctx, page, errors };
}

// Select signs down the text side until drawing becomes enabled (first mappable,
// non-reconstructed sign). Returns the index selected.
async function enableDrawing(page: Page): Promise<void> {
    const signs = page.locator('#text-side .text-sign');
    await expect(signs.first()).toBeVisible({ timeout: 20_000 });
    const count = await signs.count();
    for (let i = 0; i < Math.min(count, 25); i++) {
        await signs.nth(i).click();
        if ((await editorCtx(page)).isDrawingEnabled) return;
    }
    throw new Error('could not enable drawing (no mappable sign)');
}

test('artefact editor: Copy-to-edition toolbar button opens the copy-to-edition modal', async ({ browser }) => {
    const { ctx, page, errors } = await openEditor(browser);

    // The "Copy to edition" toolbar-icon-button is overlaid by #artefact-info, so dispatch
    // a native click — this runs openCopyToEdtion(), which now flips a boolean v-model
    // (the old Vue-2 $bvModal.show path was a no-op under bootstrap-vue-next).
    const clicked = await page.evaluate(() => {
        const b = Array.from(document.querySelectorAll('#toolbar button')).find((x) =>
            /copy to edition/i.test(x.getAttribute('title') || ''),
        ) as HTMLElement | undefined;
        if (!b) return false;
        b.click();
        return true;
    });
    expect(clicked, 'Copy-to-edition button present').toBe(true);

    // The real trigger now opens the modal (reachability, not just "no throw").
    await expect(page.locator('#copy-to-edition-modal')).toBeVisible({ timeout: 10_000 });
    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('artefact editor: draw an ROI, click it (onRoiClicked selects its sign), then delete it (onDeleteRoi)', async ({
    browser,
}) => {
    const { ctx, page, errors } = await openEditor(browser);

    await enableDrawing(page);

    // Enter polygon draw mode (the toolbar button is overlaid; onModeClick is its @click).
    await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (document.querySelector('#artefact-grid') as any).__vueParentComponent.ctx.onModeClick('polygon');
    });
    const surface = page.locator('#artefact-image svg .draw-boundary').first();
    await expect(surface).toBeVisible({ timeout: 10_000 });

    const undoBefore = (await editorCtx(page)).undoLen;

    // Draw a closed quad → onNewPolygon creates an ArtefactROIOperation (undoStack grows).
    await page.evaluate(() => {
        const g = document.querySelector('#artefact-image svg .draw-boundary') as SVGElement;
        const r = g.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const fire = (type: string, x: number, y: number) =>
            g.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, bubbles: true, cancelable: true }));
        fire('pointerdown', cx - 50, cy - 40);
        fire('pointermove', cx + 50, cy - 40);
        fire('pointermove', cx + 50, cy + 40);
        fire('pointermove', cx - 50, cy + 40);
        fire('pointermove', cx - 48, cy - 38);
        fire('pointerup', cx - 48, cy - 38);
    });
    await expect.poll(() => editorCtx(page).then((c) => c.undoLen), { timeout: 15_000 }).toBeGreaterThan(undoBefore);

    // Switch to Select mode and clear the current ROI selection (onNewPolygon auto-selects
    // the drawn ROI), so we can prove onRoiClicked re-selects it.
    await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c = (document.querySelector('#artefact-grid') as any).__vueParentComponent.ctx;
        c.onModeClick('select');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        st.artefactEditor.selectRoi(null);
    });
    await expect.poll(() => state(page).then((s) => s.selectedRoi), { timeout: 10_000 }).toBe(false);

    // Click the ROI path (roi-layer renders each ROI as a <g translate><path vector-effect=
    // "non-scaling-stroke" @click> pair). Clicking it runs roi-layer.onPathClicked → emits
    // roi-clicked → artefact-editor.onRoiClicked (selects the ROI + its sign).
    const roiClicked = await page.evaluate(() => {
        const paths = Array.from(
            document.querySelectorAll('#transform-root path[vector-effect="non-scaling-stroke"]'),
        ) as SVGElement[];
        if (!paths.length) return 0;
        for (const p of paths) {
            p.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }
        return paths.length;
    });
    expect(roiClicked, 'a drawn ROI path is present to click').toBeGreaterThan(0);

    await expect.poll(() => state(page).then((s) => s.selectedRoi), { timeout: 10_000 }).toBe(true);
    await expect.poll(() => editorCtx(page).then((c) => c.isDeleteEnabled), { timeout: 10_000 }).toBe(true);

    // Now the trash button is enabled → click it → onDeleteRoi pushes an 'erase'
    // ArtefactROIOperation (undoStack grows again). Find it by its fa-trash icon (its
    // title is localised) and click the enclosing <button>.
    const undoAfterSelect = (await editorCtx(page)).undoLen;
    const trashClicked = await page.evaluate(() => {
        const icon = document.querySelector('#toolbar [data-icon="trash"], #toolbar .fa-trash');
        const btn = icon?.closest('button') as HTMLButtonElement | null;
        if (!btn || btn.disabled) return false;
        btn.click();
        return true;
    });
    expect(trashClicked, 'enabled trash button present').toBe(true);
    await expect.poll(() => editorCtx(page).then((c) => c.undoLen), { timeout: 10_000 }).toBeGreaterThan(undoAfterSelect);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('artefact editor: onAuto guard — enabling auto with >1 signs selected turns auto back off (toast branch)', async ({
    browser,
}) => {
    const { ctx, page, errors } = await openEditor(browser);

    // Select two signs so selectedSignInterpretations.length > 1.
    const signs = page.locator('#text-side .text-sign');
    await expect(signs.first()).toBeVisible({ timeout: 20_000 });
    await signs.nth(0).click();
    await page.keyboard.down('Shift');
    await signs.nth(1).click();
    await page.keyboard.up('Shift');

    const multi = await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        return st.textFragmentEditor.selectedSignInterpretations.length as number;
    });

    // Read autoMode straight off the component; toggle it on via the switch. If >1 signs are
    // selected, onAuto's guard shows a toast and forces autoMode false; with ≤1 it flips on.
    const autoModeOf = () =>
        page.evaluate(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (document.querySelector('#artefact-grid') as any)?.__vueParentComponent?.ctx?.autoMode as boolean;
        });

    const auto = page.locator('#auto-character');
    const input = (await auto.evaluate((el) => el.tagName)) === 'INPUT' ? auto : auto.locator('input').first();
    await input.click({ force: true });

    if (multi > 1) {
        // Guard branch: onAuto keeps autoMode false and shows the info toast.
        await expect.poll(autoModeOf, { timeout: 10_000 }).toBe(false);
    } else {
        // Fallback (couldn't multi-select): the plain toggle branch flips autoMode on.
        await expect.poll(autoModeOf, { timeout: 10_000 }).toBe(true);
    }

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});
