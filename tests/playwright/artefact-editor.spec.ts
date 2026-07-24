import {
    test,
    expect,
    loginToken,
    authedContext,
    collectCoverage,
    API,
} from './fixtures';
import type { Browser, BrowserContext, Page } from '@playwright/test';

// Deep interaction coverage for the ARTEFACT EDITOR (src/views/artefact-editor/**)
// and the toolbar / drawing / sign-attribute sub-components it hosts
// (src/components/toolbars/**, src/components/polygons/boundary-drawer.vue,
// src/components/sign-attributes/**, src/components/text/**). Everything runs
// against a throwaway writable copy of public edition 918 so it never touches
// shared data. We drive real controls and assert store / DOM changes (not pixels).

let token: string;
let editionId: number;
let artefactId: number;
let imagedObjectId: string;

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    const auth = { Authorization: `Bearer ${token}` };

    const copy = await request.post(`${API}/v1/editions/918`, {
        headers: auth,
        data: { name: `pw-artefact-${Date.now()}` },
    });
    editionId = (await copy.json()).id;

    const arts = (
        await (
            await request.get(`${API}/v1/editions/${editionId}/artefacts`, {
                headers: auth,
            })
        ).json()
    ).artefacts;
    const withImage = arts.find(
        (a: { isVirtual?: boolean; imagedObjectId?: string }) =>
            !a.isVirtual && a.imagedObjectId,
    );
    artefactId = withImage.id;
    imagedObjectId = withImage.imagedObjectId;

    await request.dispose();
});

// Collect page errors into an array we assert is empty at the end of each test.
function trackErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    return errors;
}

// Read the live app store.
function state(page: Page) {
    return page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config
            .globalProperties.$state;
        const tr = document.querySelector('#transform-root');
        return {
            zoom: st.artefactEditor.params?.zoom as number | undefined,
            fontSize: st.artefactEditor.params?.fontSize as number | undefined,
            rotation: st.artefactEditor.params?.rotationAngle as
                | number
                | undefined,
            highlightCommentMode: st.artefactEditor
                .highlightCommentMode as boolean,
            selectedSiCount: st.textFragmentEditor.selectedSignInterpretations
                .length as number,
            selectedRoi: !!st.artefactEditor.selectedInterpretationRoi,
            transform: tr ? tr.getAttribute('transform') : null,
        };
    });
}

// Open the artefact editor and wait until the artefact has rendered.
async function openEditor(browser: Browser): Promise<{
    context: BrowserContext;
    page: Page;
    errors: string[];
}> {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    await page.setViewportSize({ width: 1400, height: 900 });
    const errors = trackErrors(page);
    await page.goto(`/editions/${editionId}/artefacts/${artefactId}`);
    await expect
        .poll(() => state(page).then((s) => s.transform), { timeout: 40_000 })
        .not.toBeNull();
    return { context, page, errors };
}

async function teardown(context: BrowserContext, errors: string[]) {
    await collectCoverage(context);
    await context.close();
    expect(errors, `page errors: ${errors.join('\n')}`).toEqual([]);
}

test('artefact editor: loads with the full grid (toolbar, image, text-side, attribute pane) and no page errors', async ({
    browser,
}) => {
    const { context, page, errors } = await openEditor(browser);

    // Core layout regions from artefact-editor.vue render.
    await expect(page.locator('#artefact-grid')).toBeVisible();
    await expect(page.locator('#toolbar')).toBeVisible();
    await expect(page.locator('#artefact-image svg.overlay')).toBeVisible();
    await expect(page.locator('#text-side')).toBeVisible();
    await expect(page.locator('#attribute-pane')).toBeVisible();
    // image-layer renders the artefact image inside transform-root.
    await expect(page.locator('#transform-root')).toBeVisible();

    await teardown(context, errors);
});

test('artefact editor: Adjust Image popover opens and exposes image settings', async ({
    browser,
}) => {
    const { context, page, errors } = await openEditor(browser);

    // adjust-image-toolbox renders a button that toggles a popover holding the
    // ImageSettings component (opacity / visibility controls).
    const adjust = page.locator('#popover-adjust');
    await expect(adjust).toBeVisible({ timeout: 10_000 });
    await adjust.click();

    // The popover with the image-settings component becomes visible.
    await expect(page.locator('#popover-input-1')).toBeVisible({
        timeout: 10_000,
    });

    await teardown(context, errors);
});

test('artefact editor: Edit Mode buttons switch actionMode (draw / box / select)', async ({
    browser,
}) => {
    const { context, page, errors } = await openEditor(browser);

    // The Edit Modes toolbox holds the Draw (pen), Box (square) and Select
    // (mouse-pointer) toolbar-icon-buttons. The ArtefactEditor instance owns
    // actionMode directly on #artefact-grid's owner component.
    const actionMode = () =>
        page.evaluate(
            () =>
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (document.querySelector('#artefact-grid') as any)
                    ?.__vueParentComponent?.ctx?.actionMode as string | undefined,
        );

    // These buttons sit under the #artefact-info region (which overlaps the
    // toolbar in the grid), so a real mouse click is intercepted by the overlay —
    // invoking the element's native click() fires the button's @click directly.
    const clickToolbarButton = (title: string) =>
        page
            .locator(`#toolbar button[title="${title}"]`)
            .first()
            .evaluate((el) => (el as HTMLElement).click());

    // Select is always enabled.
    await clickToolbarButton('Select');
    await expect.poll(actionMode, { timeout: 10_000 }).toBe('select');

    // Box and Draw (polygon) are only enabled once a non-reconstructed sign is
    // selected (isDrawingEnabled); select one from the text side first.
    await page.locator('#text-side .text-sign').first().click();
    await expect
        .poll(
            () =>
                page.evaluate(
                    () =>
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        !!(document.querySelector('#artefact-grid') as any)
                            ?.__vueParentComponent?.ctx?.isDrawingEnabled,
                ),
            { timeout: 10_000 },
        )
        .toBe(true);

    await clickToolbarButton('Box');
    await expect.poll(actionMode, { timeout: 10_000 }).toBe('box');

    await clickToolbarButton('Draw');
    await expect.poll(actionMode, { timeout: 10_000 }).toBe('polygon');

    await teardown(context, errors);
});

test('artefact editor: Comments toggle flips highlightCommentMode', async ({
    browser,
}) => {
    const { context, page, errors } = await openEditor(browser);

    const before = (await state(page)).highlightCommentMode;
    // The "Comments" b-form-checkbox switch is a label with that text.
    await page
        .locator('label', { hasText: /^Comments$/ })
        .first()
        .click();

    await expect
        .poll(() => state(page).then((s) => s.highlightCommentMode), {
            timeout: 10_000,
        })
        .toBe(!before);

    await teardown(context, errors);
});

test('artefact editor: font-size buttons change params.fontSize', async ({
    browser,
}) => {
    const { context, page, errors } = await openEditor(browser);

    const before = (await state(page)).fontSize!;
    // font-size-button-toolbox renders two ".fa.fa-font" icon buttons (plus / minus).
    const fontButtons = page.locator('.fa.fa-font');
    await expect(fontButtons.first()).toBeVisible({ timeout: 10_000 });
    // Click the increase button (the one WITHOUT the .minus modifier).
    await page.locator('.fa.fa-font:not(.minus)').first().click();

    await expect
        .poll(() => state(page).then((s) => s.fontSize), { timeout: 10_000 })
        .not.toBe(before);

    await teardown(context, errors);
});

test('artefact editor: Zoom In + Rotate update store and rendered transform; undo-redo toolbox renders', async ({
    browser,
}) => {
    const { context, page, errors } = await openEditor(browser);

    const before = await state(page);
    // zoom-toolbox
    await page.getByTitle('Zoom In').first().click();
    await expect
        .poll(() => state(page).then((s) => s.zoom), { timeout: 10_000 })
        .toBeGreaterThan(before.zoom!);
    let after = await state(page);
    expect(after.transform).toContain(`scale(${after.zoom})`);

    // rotation-toolbox: the rendered transform reflects the new angle (reactivity).
    await page.getByTitle('Right Rotate').first().click();
    await expect
        .poll(() => state(page).then((s) => s.rotation), { timeout: 10_000 })
        .not.toBe(before.rotation);
    after = await state(page);
    expect(after.transform).toContain(`rotate(${after.rotation}`);

    // undo-redo-toolbox renders its two buttons (disabled with an empty stack).
    await expect(page.getByTitle('Undo').first()).toBeVisible();
    await expect(page.getByTitle('Redo').first()).toBeVisible();

    await teardown(context, errors);
});

test('artefact editor: selecting a text-sign populates the sign-wheel and attribute pane', async ({
    browser,
}) => {
    const { context, page, errors } = await openEditor(browser);

    // The text-side renders text-fragment -> text-line -> text-sign spans.
    const sign = page.locator('#text-side .text-sign').first();
    await expect(sign).toBeVisible({ timeout: 20_000 });
    await sign.click();

    // Selecting a sign updates the store...
    await expect
        .poll(() => state(page).then((s) => s.selectedSiCount), {
            timeout: 10_000,
        })
        .toBe(1);

    // ...which makes the sign-wheel render (v-if selectedSignInterpretations.length === 1)
    await expect(page.locator('.sign-wheel')).toBeVisible({ timeout: 10_000 });
    // ...and the attribute pane shows the sign's attribute pills.
    await expect(
        page.locator('#attribute-pane .attribute-pane-sign-pill').first(),
    ).toBeVisible({ timeout: 10_000 });

    await teardown(context, errors);
});

test('artefact editor: clicking an attribute pill opens the sign-attribute modal, then closes', async ({
    browser,
}) => {
    const { context, page, errors } = await openEditor(browser);

    const sign = page.locator('#text-side .text-sign').first();
    await expect(sign).toBeVisible({ timeout: 20_000 });
    await sign.click();
    await expect
        .poll(() => state(page).then((s) => s.selectedSiCount), {
            timeout: 10_000,
        })
        .toBe(1);

    // sign-attribute.vue emits attribute-click -> pane sets selectedAttribute ->
    // sign-attribute-modal becomes visible (isVisible = !!attribute).
    const pill = page
        .locator('#attribute-pane .attribute-pane-sign-pill')
        .first();
    await expect(pill).toBeVisible({ timeout: 10_000 });
    await pill.click();

    const modal = page.locator('#sign-attribute-modal');
    await expect(modal).toBeVisible({ timeout: 10_000 });
    await expect(modal.getByText('Attribute Information')).toBeVisible();

    // Close it via the state (the modal is state-driven).
    await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state.textFragmentEditor.selectedAttribute =
            null;
    });
    await expect(modal).toBeHidden({ timeout: 10_000 });

    await teardown(context, errors);
});

test('artefact editor: entering draw mode with a selected sign and drawing a polygon creates an ROI operation', async ({
    browser,
}) => {
    const { context, page, errors } = await openEditor(browser);

    // Select signs (via the text side) until drawing becomes enabled — the boundary
    // drawer is only active for a selected, non-reconstructed sign (isDrawingEnabled).
    const signs = page.locator('#text-side .text-sign');
    const count = await signs.count();
    const drawingEnabled = () =>
        page.evaluate(
            () =>
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                !!(document.querySelector('#artefact-grid') as any)
                    ?.__vueParentComponent?.ctx?.isDrawingEnabled,
        );
    let enabled = false;
    for (let i = 0; i < Math.min(count, 20); i++) {
        await signs.nth(i).click();
        if (await drawingEnabled()) {
            enabled = true;
            break;
        }
    }
    // Per the brief, drop the drag if drawing can't be driven — but assert we got
    // there (this edition always has a mappable first sign).
    expect(enabled, 'expected a selectable non-reconstructed sign').toBe(true);

    // Enter polygon draw mode via the editor (the toolbar button is overlapped by
    // #artefact-info; onModeClick is exactly what the button's @click calls).
    await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (document.querySelector('#artefact-grid') as any).__vueParentComponent.ctx.onModeClick(
            'polygon',
        );
    });

    // The boundary-drawer's drawing surface (pointer-events="all") appears.
    const surface = page.locator('#artefact-image svg .draw-boundary').first();
    await expect(surface).toBeVisible({ timeout: 10_000 });

    // Draw a closed triangle by dispatching PointerEvents on the surface, then
    // assert the artefact editor's own operations manager gained an ROI operation
    // (onNewPolygon -> ArtefactROIOperation -> operationsManager.undoStack).
    const opsBefore = await page.evaluate(
        () =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (document.querySelector('#artefact-grid') as any).__vueParentComponent
                .ctx.operationsManager.undoStack.length as number,
    );

    await page.evaluate(() => {
        const g = document.querySelector(
            '#artefact-image svg .draw-boundary',
        ) as SVGElement;
        const rect = g.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const fire = (type: string, x: number, y: number) =>
            g.dispatchEvent(
                new PointerEvent(type, {
                    clientX: x,
                    clientY: y,
                    pointerId: 1,
                    bubbles: true,
                    cancelable: true,
                }),
            );
        fire('pointerdown', cx - 50, cy - 40);
        fire('pointermove', cx + 50, cy - 40);
        fire('pointermove', cx + 50, cy + 40);
        fire('pointermove', cx - 50, cy + 40);
        fire('pointermove', cx - 48, cy - 38);
        fire('pointerup', cx - 48, cy - 38);
    });

    await expect
        .poll(
            () =>
                page.evaluate(
                    () =>
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (document.querySelector('#artefact-grid') as any)
                            .__vueParentComponent.ctx.operationsManager.undoStack
                            .length as number,
                ),
            { timeout: 15_000 },
        )
        .toBeGreaterThan(opsBefore);

    await teardown(context, errors);
});
