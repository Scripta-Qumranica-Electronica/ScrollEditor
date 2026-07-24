import { test, expect, loginToken, authedContext, collectCoverage, API } from './fixtures';
import type { Page } from '@playwright/test';

// P4 — editor toolbar controls. The Vue-3 migration left toolbar buttons visually
// present but DEAD: `@click`/native listeners on the shared toolbar-icon-button were
// routed to Vue-2-style $listeners (compat MODE 2) and never reached the button, and
// the imaged-object toolbar overflowed its bar because `<toolbar>` was a bootstrap
// `.row` (whose `.row > *` forces children to full width). These tests drive the
// actual controls and assert the state/rendered transform changes — they would have
// caught both bugs.

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
        data: { name: `pw-editor-${Date.now()}` },
    });
    editionId = (await copy.json()).id;

    const arts = (await (await request.get(`${API}/v1/editions/${editionId}/artefacts`, { headers: auth })).json()).artefacts;
    const withImage = arts.find((a: { isVirtual: boolean; imagedObjectId?: string }) => !a.isVirtual && a.imagedObjectId);
    artefactId = withImage.id;
    imagedObjectId = withImage.imagedObjectId;

    await request.dispose();
});

// Read the artefact-editor's rendered transform (#transform-root) + its zoom/rotate state.
async function artefactEditorState(page: Page) {
    return page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        const tr = document.querySelector('#transform-root');
        return {
            zoom: st.artefactEditor.params?.zoom as number | undefined,
            rotation: st.artefactEditor.params?.rotationAngle as number | undefined,
            transform: tr ? tr.getAttribute('transform') : null,
        };
    });
}

test('artefact editor: Zoom In changes the zoom and the rendered transform', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    await page.goto(`/editions/${editionId}/artefacts/${artefactId}`);
    await expect.poll(() => artefactEditorState(page).then((s) => s.transform), { timeout: 30_000 }).not.toBeNull();

    const before = await artefactEditorState(page);
    await page.getByTitle('Zoom In').first().click();

    await expect.poll(() => artefactEditorState(page).then((s) => s.zoom), { timeout: 10_000 })
        .toBeGreaterThan(before.zoom!);
    // The rendered transform reflects the new scale (reactivity).
    const after = await artefactEditorState(page);
    expect(after.transform).toContain(`scale(${after.zoom})`);

    await collectCoverage(context);
    await context.close();
});

test('artefact editor: Rotate changes the rotation and the rendered transform', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    await page.goto(`/editions/${editionId}/artefacts/${artefactId}`);
    await expect.poll(() => artefactEditorState(page).then((s) => s.transform), { timeout: 30_000 }).not.toBeNull();

    const before = await artefactEditorState(page);
    await page.getByTitle('Right Rotate').first().click();

    await expect.poll(() => artefactEditorState(page).then((s) => s.rotation), { timeout: 10_000 })
        .not.toBe(before.rotation);
    const after = await artefactEditorState(page);
    expect(after.transform).toContain(`rotate(${after.rotation}`);

    await collectCoverage(context);
    await context.close();
});

test('imaged-object editor: Zoom In works and the toolbar does not overflow its bar', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/editions/${editionId}/imaged-objects/${imagedObjectId}`);
    // Wait for the toolbar (with the zoom control) to render.
    await expect(page.getByTitle('Zoom In').first()).toBeVisible({ timeout: 30_000 });

    const zoomBefore = await page.evaluate(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state.imagedObject.params?.zoom);
    await page.getByTitle('Zoom In').first().click();
    await expect.poll(() => page.evaluate(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state.imagedObject.params?.zoom),
        { timeout: 10_000 }).toBeGreaterThan(zoomBefore);

    // Layout regression guard: the toolbox row lays its controls out horizontally in
    // a single (non-overflowing) bar rather than stacking full-width and spilling
    // onto the canvas.
    const layout = await page.evaluate(() => {
        const row = document.querySelector('.toolbar');
        if (!row) return null;
        return {
            verticalOverflow: row.scrollHeight > row.clientHeight + 4,
            firstControlWidth: Math.round((row.children[0] as HTMLElement).getBoundingClientRect().width),
            rowWidth: Math.round(row.getBoundingClientRect().width),
        };
    });
    expect(layout, 'toolbar row not found').not.toBeNull();
    expect(layout!.verticalOverflow, 'toolbar controls overflow the bar').toBe(false);
    // A control sized to its content (not stretched to full row width).
    expect(layout!.firstControlWidth).toBeLessThan(layout!.rowWidth / 2);

    await collectCoverage(context);
    await context.close();
});

test('imaged-object editor: Draw/Erase mode buttons switch the drawing mode', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    await page.goto(`/editions/${editionId}/imaged-objects/${imagedObjectId}`);
    await expect(page.getByTitle('Erase').first()).toBeVisible({ timeout: 30_000 });

    const mode = () => page.evaluate(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state.imagedObject.params?.drawingMode);

    await page.getByTitle('Erase').first().click();
    const erase = await mode();
    await page.getByTitle('Draw').first().click();
    await expect.poll(mode, { timeout: 10_000 }).not.toBe(erase);

    await collectCoverage(context);
    await context.close();
});

test('imaged-object editor: the side selector offers recto/verso', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    await page.goto(`/editions/${editionId}/imaged-objects/${imagedObjectId}`);
    // The Side toolbox holds a dropdown showing the current side; open it.
    const sideToggle = page.locator('.dropdown-toggle', { hasText: /recto|verso/i }).first();
    await expect(sideToggle).toBeVisible({ timeout: 30_000 });
    await sideToggle.click();
    await expect(page.getByRole('menuitem', { name: /recto/i }).first()).toBeVisible({ timeout: 10_000 });

    await collectCoverage(context);
    await context.close();
});
