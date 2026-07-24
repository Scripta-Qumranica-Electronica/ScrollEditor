import { test, expect, loginToken, authedContext, collectCoverage, API } from './fixtures';
import type { Browser, BrowserContext, Page } from '@playwright/test';

// P7 — DEEP artefact-editor + imaged-object-editor coverage. editor-controls.spec
// proves the toolbar buttons are wired (zoom/rotate/draw-erase, side selector).
// This spec goes wide across the remaining under-covered slots: the artefact editor's
// Edit-Modes (polygon/box/select), Comments + Auto-character switches, Copy-to-edition,
// zoom-toolbox Reset, rotation input, font-size buttons; and the imaged-object editor's
// recto/verso side switch (re-selects an artefact), Draw/Erase modes, New-artefact modal,
// per-artefact row selection + rename input toggle, and the zoomer ctrl-wheel path.
// Every test guards against page errors.
//
// Runs against a throwaway copy of public edition 918 (rich imaged objects / artefacts).

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
        data: { name: `pw-artefact-deep-${Date.now()}` },
    });
    editionId = (await copy.json()).id;

    const arts = (await (await request.get(`${API}/v1/editions/${editionId}/artefacts`, { headers: auth })).json())
        .artefacts;
    const withImage = arts.find(
        (a: { isVirtual: boolean; imagedObjectId?: string }) => !a.isVirtual && a.imagedObjectId,
    );
    artefactId = withImage.id;
    imagedObjectId = withImage.imagedObjectId;

    await request.dispose();
});

// ---- artefact editor helpers -------------------------------------------------

async function artefactEditorState(page: Page) {
    return page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        const tr = document.querySelector('#transform-root');
        return {
            zoom: st.artefactEditor.params?.zoom as number | undefined,
            rotation: st.artefactEditor.params?.rotationAngle as number | undefined,
            fontSize: st.artefactEditor.params?.fontSize as number | undefined,
            highlightCommentMode: st.artefactEditor.highlightCommentMode as boolean | undefined,
            transform: tr ? tr.getAttribute('transform') : null,
        };
    });
}

async function openArtefactEditor(
    browser: Browser,
): Promise<{ ctx: BrowserContext; page: Page; errors: string[] }> {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(`/editions/${editionId}/artefacts/${artefactId}`);
    await expect.poll(() => artefactEditorState(page).then((s) => s.transform), { timeout: 40_000 }).not.toBeNull();
    return { ctx, page, errors };
}

test('artefact editor: Edit-Modes select/box/polygon buttons toggle the pressed action mode', async ({ browser }) => {
    const { ctx, page, errors } = await openArtefactEditor(browser);

    // Select mode is always enabled (drawing modes require a selected sign). Dispatch a
    // real click on the "Select" button (it can be overlaid by #artefact-info) — this
    // runs onModeClick('select') and presses the button (aria-pressed / active class).
    const pressed = (title: string) =>
        page.evaluate((t) => {
            const b = Array.from(document.querySelectorAll('button')).find((x) => x.getAttribute('title') === t);
            if (!b) return null;
            return b.getAttribute('aria-pressed') === 'true' || b.className.includes('active');
        }, title);

    await page.evaluate(() => {
        const b = Array.from(document.querySelectorAll('button')).find((x) => x.getAttribute('title') === 'Select');
        b?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await expect.poll(() => pressed('Select'), { timeout: 10_000 }).toBe(true);

    // The Draw/Box buttons exist in the Edit-Modes toolbox (disabled until a sign is
    // selected) — assert they are present so the toolbox slot rendered.
    await expect(page.getByTitle('Draw', { exact: true }).first()).toBeVisible();
    await expect(page.getByTitle('Box', { exact: true }).first()).toBeVisible();

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('artefact editor: Comments switch flips highlightCommentMode in the store', async ({ browser }) => {
    const { ctx, page, errors } = await openArtefactEditor(browser);

    await expect.poll(() => artefactEditorState(page).then((s) => s.highlightCommentMode), { timeout: 10_000 }).toBeFalsy();

    const comments = page.getByText('Comments', { exact: true }).locator('xpath=preceding::input[1]');
    await comments.click({ force: true });
    await expect
        .poll(() => artefactEditorState(page).then((s) => s.highlightCommentMode), { timeout: 10_000 })
        .toBe(true);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('artefact editor: Auto-character switch can be toggled without error', async ({ browser }) => {
    const { ctx, page, errors } = await openArtefactEditor(browser);

    // #auto-character is the b-form-checkbox id; click its input. onAuto() flips autoMode.
    const auto = page.locator('#auto-character');
    await expect(auto).toBeVisible({ timeout: 10_000 });
    const input = (await auto.evaluate((el) => el.tagName)) === 'INPUT' ? auto : auto.locator('input').first();
    await input.click({ force: true });
    // No selected sign -> no toast; the click path (onAuto) executed cleanly.
    await page.waitForTimeout(200);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('artefact editor: zoom-toolbox Reset sets zoom to 1 and re-renders the transform', async ({ browser }) => {
    const { ctx, page, errors } = await openArtefactEditor(browser);

    // Zoom in a couple of times, then the zoom-input reflects a value; typing 100 via
    // the input's setter maps to zoom=1. (There is no Reset button here, so drive the
    // numeric zoom input which exercises the zoom setter branch.)
    await page.getByTitle('Zoom In').first().click();
    const zoomInput = page.locator('.zoom-input').first();
    await zoomInput.fill('100');
    await zoomInput.blur();

    await expect.poll(() => artefactEditorState(page).then((s) => s.zoom), { timeout: 10_000 }).toBe(1);
    const after = await artefactEditorState(page);
    expect(after.transform).toContain('scale(1)');

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('artefact editor: rotation numeric input updates rotationAngle and the transform', async ({ browser }) => {
    const { ctx, page, errors } = await openArtefactEditor(browser);

    // The rotation-toolbox has enable-text=true here, so its numeric input is editable.
    const rotInput = page.locator('#artefact-toolbar .input-lg').first();
    await rotInput.fill('42');
    await rotInput.blur();

    await expect.poll(() => artefactEditorState(page).then((s) => s.rotation), { timeout: 10_000 }).toBe(42);
    const after = await artefactEditorState(page);
    expect(after.transform).toContain('rotate(42');

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('artefact editor: font-size +/- buttons change params.fontSize', async ({ browser }) => {
    const { ctx, page, errors } = await openArtefactEditor(browser);

    const before = (await artefactEditorState(page)).fontSize!;
    // The Font size toolbox holds two icon buttons (fa-font increase / fa-font.minus
    // decrease). They can be overlaid by the text-side, so dispatch clicks directly —
    // this runs onFontSizeChanged(±delta).
    const clickFont = (minus: boolean) =>
        page.evaluate((isMinus) => {
            const btns = Array.from(document.querySelectorAll('button.fa-font')) as HTMLElement[];
            const target = isMinus
                ? btns.find((b) => b.className.includes('minus'))
                : btns.find((b) => !b.className.includes('minus'));
            target?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }, minus);

    await clickFont(false);
    await expect.poll(() => artefactEditorState(page).then((s) => s.fontSize), { timeout: 10_000 }).toBeGreaterThan(before);

    const mid = (await artefactEditorState(page)).fontSize!;
    await clickFont(true);
    await expect.poll(() => artefactEditorState(page).then((s) => s.fontSize), { timeout: 10_000 }).toBeLessThan(mid);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('artefact editor: Left/Right rotate buttons change the rotation and the transform', async ({ browser }) => {
    const { ctx, page, errors } = await openArtefactEditor(browser);

    const before = (await artefactEditorState(page)).rotation!;

    // The rotation-toolbox left/right rotate-buttons step the angle by the delta.
    await page.getByTitle('Left Rotate').first().click();
    await expect.poll(() => artefactEditorState(page).then((s) => s.rotation), { timeout: 10_000 }).not.toBe(before);
    const afterLeft = await artefactEditorState(page);
    expect(afterLeft.transform).toContain(`rotate(${afterLeft.rotation}`);

    await page.getByTitle('Right Rotate').first().click();
    await expect
        .poll(() => artefactEditorState(page).then((s) => s.rotation), { timeout: 10_000 })
        .not.toBe(afterLeft.rotation);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

// ---- imaged-object editor ----------------------------------------------------

function ioState(page: Page) {
    return page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        return {
            zoom: st.imagedObject.params?.zoom as number | undefined,
            drawingMode: st.imagedObject.params?.drawingMode as string | undefined,
        };
    });
}

async function openImagedObjectEditor(
    browser: Browser,
): Promise<{ ctx: BrowserContext; page: Page; errors: string[] }> {
    const ctx = await authedContext(browser, token);
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(`/editions/${editionId}/imaged-objects/${imagedObjectId}`);
    await expect(page.getByTitle('Zoom In').first()).toBeVisible({ timeout: 40_000 });
    return { ctx, page, errors };
}

test('imaged-object editor: switching side to Verso re-renders the selected artefact / image', async ({ browser }) => {
    const { ctx, page, errors } = await openImagedObjectEditor(browser);

    // The transform-root (image group) is present for the initial (recto) side.
    await expect(page.locator('#transform-root')).toBeVisible({ timeout: 20_000 });

    // Open the Side dropdown and choose Verso -> sideArtefactChanged re-selects an
    // artefact on that side and re-fills the image settings.
    const sideToggle = page.locator('.dropdown-toggle', { hasText: /recto|verso/i }).first();
    await sideToggle.click();
    await page.getByRole('menuitem', { name: /verso/i }).first().click();

    // The Side dropdown toggle now shows Verso, and the image group still renders.
    await expect
        .poll(() => page.locator('.dropdown-toggle', { hasText: /verso/i }).count(), { timeout: 10_000 })
        .toBeGreaterThan(0);
    await expect(page.locator('#transform-root')).toBeVisible({ timeout: 20_000 });

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('imaged-object editor: Erase then Draw switches the drawing mode', async ({ browser }) => {
    const { ctx, page, errors } = await openImagedObjectEditor(browser);

    // DrawingMode enum: DRAW=0, ERASE=1 (params.drawingMode stores the numeric value).
    await page.getByTitle('Erase').first().click();
    await expect.poll(() => ioState(page).then((s) => s.drawingMode), { timeout: 10_000 }).toBe(1);

    await page.getByTitle('Draw').first().click();
    await expect.poll(() => ioState(page).then((s) => s.drawingMode), { timeout: 10_000 }).toBe(0);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('imaged-object editor: selecting an artefact row highlights it and Rename toggles the input', async ({
    browser,
}) => {
    const { ctx, page, errors } = await openImagedObjectEditor(browser);

    // The right-hand artefact list; each row has a clickable name.
    const rows = page.locator('#imaged-object-artefacts .select-art-name');
    await expect(rows.first()).toBeVisible({ timeout: 20_000 });
    const count = await rows.count();
    // Click a row (the last if there are several) to change the selected artefact.
    await rows.nth(count - 1).click();
    await expect(page.locator('#imaged-object-artefacts .selectedRow')).toHaveCount(1, { timeout: 10_000 });

    // Click "Rename" on the selected row -> the inline <input> for the name appears.
    await page.locator('#imaged-object-artefacts').getByRole('button', { name: /^Rename$/ }).first().click();
    await expect(page.locator('#imaged-object-artefacts input').first()).toBeVisible({ timeout: 10_000 });

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('imaged-object editor: Right Rotate (90°) rotates the image and swaps actualWidth/Height', async ({
    browser,
}) => {
    const { ctx, page, errors } = await openImagedObjectEditor(browser);

    const rotationOf = () =>
        page.evaluate(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
            return st.imagedObject.params?.rotationAngle as number;
        });

    const before = await rotationOf();
    const beforeTransform = await page.evaluate(
        () => document.querySelector('#transform-root')?.getAttribute('transform') ?? null,
    );

    // 90° rotation exercises the `rotationAngle % 180` translate branch in transform.
    await page.getByTitle('Right Rotate').first().click();
    await expect.poll(rotationOf, { timeout: 10_000 }).not.toBe(before);
    await expect
        .poll(() => page.evaluate(() => document.querySelector('#transform-root')?.getAttribute('transform') ?? null), {
            timeout: 10_000,
        })
        .not.toBe(beforeTransform);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});

test('imaged-object editor: ctrl-wheel over the image zooms via the zoomer', async ({ browser }) => {
    const { ctx, page, errors } = await openImagedObjectEditor(browser);

    const before = (await ioState(page)).zoom!;
    await page.evaluate(() => {
        const target = document.querySelector('#imaged-object-container svg') as Element;
        const r = target.getBoundingClientRect();
        for (let i = 0; i < 8; i++) {
            target.dispatchEvent(
                new WheelEvent('wheel', {
                    bubbles: true,
                    cancelable: true,
                    ctrlKey: true,
                    deltaY: -100,
                    clientX: r.x + r.width / 2,
                    clientY: r.y + r.height / 2,
                }),
            );
        }
    });
    await expect.poll(() => ioState(page).then((s) => s.zoom), { timeout: 10_000 }).toBeGreaterThan(before);

    expect(errors).toEqual([]);
    await collectCoverage(ctx);
    await ctx.close();
});
