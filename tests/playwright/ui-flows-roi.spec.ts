import { test, expect, collectCoverage, loginToken, authedContext, API } from './fixtures';
import type { Page } from '@playwright/test';

// UI flow for the signature scholarly manipulation: creating a Region Of Interest that maps a
// text sign onto an image region. We perform the real preparatory UI (load a fragment, select a
// sign, switch to Box mode) and then exercise the actual ROI-creation handler the boundary-drawer
// invokes on a box gesture — onNewPolygon → InterpretationRoi.new → ArtefactROIOperation('draw')
// → placeRoi — asserting a new InterpretationRoi lands in the store and is bound to the artefact.
//
// Why we invoke onNewPolygon rather than mouse-dragging the canvas: the artefact editor's drawing
// SVG derives its dimensions from the loaded IIIF master image. This headless environment serves
// no IIIF tiles, so the canvas stays 0×0 (viewBox "0 0 0 0", transform scale(0)) and a pointer
// drag has no geometry to land on. The pointer→polygon conversion is the boundary-drawer's own
// concern; the manipulation LOGIC under test here is what happens once a polygon exists, which is
// exactly onNewPolygon. We drive the component's real handler with a genuine Polygon instance.

let token: string;
test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    await request.dispose();
});
const auth = () => ({ Authorization: `Bearer ${token}` });

const roiCount = (page: Page) =>
    page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any)?.__vue_app__?.config?.globalProperties?.$state;
        // interpretationRois is a keyed map (InterpretationRoiMap over a Map): read .size.
        return st?.interpretationRois?.size ?? 0;
    });

// Shared setup: a disposable owned edition, its first placed artefact opened in the artefact
// editor, a fragment loaded, and a single non-reconstructed sign selected so drawing is enabled.
async function openArtefactWithDrawableSign(page: Page) {
    const ed = (await (await page.request.post(`${API}/v1/editions/899`, { headers: auth(), data: { name: `ui-roi-${Date.now()}-${Math.floor(Math.random() * 1e6)}` } })).json()).id;
    const allArts = (await (await page.request.get(`${API}/v1/editions/${ed}/artefacts`, { headers: auth() })).json()).artefacts;
    const artId = (allArts.find((a: { isPlaced: boolean }) => a.isPlaced) ?? allArts[0]).id;

    await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto(`/editions/${ed}/artefacts/${artId}`);

    const boxBtn = page.getByTitle('Box', { exact: true });
    const signs = page.locator('.text-sign');

    await expect(page.locator('#popover-adjust')).toBeVisible({ timeout: 40_000 });
    await page.locator('#load-fragment input.select-text').fill('frg. 1');
    await expect(signs.first()).toBeVisible({ timeout: 20_000 });
    // isDrawingEnabled requires a single, non-reconstructed sign selected; walk the first few
    // signs until Box turns enabled.
    const n = Math.min(await signs.count(), 6);
    for (let i = 0; i < n; i++) {
        await signs.nth(i).click();
        if (await boxBtn.isEnabled()) break;
    }
    await expect(boxBtn).toBeEnabled({ timeout: 10_000 });
    return { ed, artId, boxBtn, signs };
}

const signIsReconstructed = (page: Page) =>
    page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any)?.__vue_app__?.config?.globalProperties?.$state;
        return !!st?.textFragmentEditor?.singleSelectedSi?.isReconstructed;
    });

test('FLOW: create a box ROI mapping a selected sign onto the artefact', async ({ browser }) => {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    const { boxBtn } = await openArtefactWithDrawableSign(page);

    await test.step('entering Box mode and completing a box creates a new ROI bound to the artefact', async () => {
        await boxBtn.click();
        const before = await roiCount(page);

        // Drive the real box-completion handler with a genuine Polygon (the class is reachable via
        // any existing ROI's shape). Returns the outcome so the assertions read from the app store.
        const result = await page.evaluate(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
            // Find the artefact-editor component that owns onNewPolygon.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let cur: any = (document.getElementById('artefact-image') as any)?.__vueParentComponent;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let comp: any;
            while (cur) { if (cur.ctx?.onNewPolygon) { comp = cur.ctx; break; } cur = cur.parent; }
            if (!comp) return { error: 'no artefact-editor component' };
            // Borrow the real Polygon class from an existing ROI shape, build a fresh square.
            const anyRoi = st.interpretationRois.getItems().next().value;
            if (!anyRoi?.shape?.constructor) return { error: 'no existing roi to source Polygon class' };
            const Polygon = anyRoi.shape.constructor;
            const poly = new Polygon('M0 0 L400 0 L400 400 L0 400 Z');
            const selectedSi = st.textFragmentEditor.singleSelectedSi;
            comp.onNewPolygon(poly);
            const created = st.textFragmentEditor.singleSelectedSi?.rois ?? [];
            return {
                error: null,
                size: st.interpretationRois.size,
                signHasRoi: selectedSi ? created.length > 0 : false,
            };
        });

        expect(result.error, 'onNewPolygon ran').toBeNull();
        // The ROI-creation operation added a new InterpretationRoi to the store...
        expect(result.size).toBe(before + 1);
        // ...and it is bound to the selected sign (the sign↔image mapping the ROI represents).
        expect(result.signHasRoi).toBe(true);
    });

    await collectCoverage(ctx);
    await ctx.close();
});

test('FLOW: marking a sign Reconstructed changes its attribute and disables drawing on it', async ({ browser }) => {
    // Attribute editing via the sign-attribute pane: the "Reconstructed" checkbox writes the
    // is_reconstructed attribute onto the selected sign. Because reconstructed signs cannot carry
    // an ROI, the visible consequence is that Box drawing turns off — a real, observable coupling
    // between the attribute change and the editor state.
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    const { boxBtn } = await openArtefactWithDrawableSign(page);

    const reconstructed = page.getByRole('checkbox', { name: 'Reconstructed' });

    await test.step('the selected sign starts non-reconstructed and drawable', async () => {
        await expect(reconstructed).toBeVisible({ timeout: 10_000 });
        expect(await signIsReconstructed(page)).toBe(false);
        await expect(boxBtn).toBeEnabled();
    });

    await test.step('checking Reconstructed sets is_reconstructed and disables drawing', async () => {
        await reconstructed.check({ force: true });
        // the attribute actually landed on the sign...
        await expect.poll(async () => signIsReconstructed(page), { timeout: 10_000 }).toBe(true);
        // ...and its documented consequence: you can no longer draw an ROI on a reconstructed sign.
        await expect(boxBtn).toBeDisabled({ timeout: 10_000 });
    });

    await collectCoverage(ctx);
    await ctx.close();
});
