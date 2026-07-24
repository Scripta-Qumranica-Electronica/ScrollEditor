import {
    test,
    expect,
    loginToken,
    authedContext,
    artefactX,
    artefactTransform,
    collectCoverage,
    API,
} from './fixtures';
import type { BrowserContext, Page } from '@playwright/test';

// P3 — the realtime scroll-editor matrix. SQE's whole reason to exist is that an
// edit in one session shows up live in another. These tests open two independent
// authenticated sessions on the SAME edition's scroll editor, mutate an artefact
// from one, and assert the OTHER session converges WITHOUT a reload — at BOTH the
// store level (data pipeline: SignalR -> reducer -> store) AND the rendered DOM
// transform (Vue reactivity: store -> re-render). The DOM assertion is the part
// that regressed in the Vue-3 migration ("mask edit not reflected until reload").
//
// Everything runs against a throwaway copy of public edition 899 so it is
// self-contained and never touches shared data.

let token: string;
let editionId: number;
let artefactId: number;
let basePlacement: { scale: number; rotate: number; translate: { x: number; y: number }; zIndex: number; mirrored: boolean };

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    const auth = { Authorization: `Bearer ${token}` };

    const copy = await request.post(`${API}/v1/editions/899`, {
        headers: auth,
        data: { name: `pw-realtime-${Date.now()}` },
    });
    editionId = (await copy.json()).id;

    const arts = (await (await request.get(`${API}/v1/editions/${editionId}/artefacts`, { headers: auth })).json()).artefacts;
    const placed = arts.find((a: { isPlaced: boolean }) => a.isPlaced);
    artefactId = placed.id;
    basePlacement = placed.placement;

    await request.dispose();
});

// PUT a placement from the given session (exactly as the app does).
async function putPlacement(page: Page, placement: typeof basePlacement) {
    const resp = await page.request.put(
        `${API}/v1/editions/${editionId}/artefacts/${artefactId}`,
        { headers: { Authorization: `Bearer ${token}` }, data: { placement } },
    );
    expect(resp.ok(), 'placement PUT should succeed').toBeTruthy();
}

// Open editor + observer sessions and wait until both have the artefact rendered.
async function openTwoSessions(browser: import('@playwright/test').Browser) {
    const editor = await authedContext(browser, token);
    const observer = await authedContext(browser, token);
    const editorPage = await editor.newPage();
    const observerPage = await observer.newPage();
    const route = `/editions/${editionId}/scroll-editor`;
    await editorPage.goto(route);
    await observerPage.goto(route);
    await expect.poll(() => artefactTransform(observerPage, artefactId), { timeout: 30_000 }).not.toBeNull();
    await expect.poll(() => artefactTransform(editorPage, artefactId), { timeout: 30_000 }).not.toBeNull();
    return { editor, observer, editorPage, observerPage };
}

async function teardown(...contexts: BrowserContext[]) {
    for (const c of contexts) await collectCoverage(c);
    for (const c of contexts) await c.close();
}

test('placement translate propagates to another session (store + rendered DOM)', async ({ browser }) => {
    const { editor, observer, editorPage, observerPage } = await openTwoSessions(browser);

    const targetX = (basePlacement.translate.x ?? 0) + 4321;
    await putPlacement(editorPage, { ...basePlacement, translate: { x: targetX, y: 5000 } });

    // Store converges (data pipeline)…
    await expect.poll(() => artefactX(observerPage, artefactId), { timeout: 20_000 }).toBe(targetX);
    // …and so does the rendered transform (reactivity).
    await expect.poll(() => artefactTransform(observerPage, artefactId), { timeout: 20_000 })
        .toContain(`translate(${targetX},`);

    await teardown(editor, observer);
});

test('placement rotate propagates to another session (rendered DOM)', async ({ browser }) => {
    const { editor, observer, editorPage, observerPage } = await openTwoSessions(browser);

    await putPlacement(editorPage, { ...basePlacement, rotate: 45 });

    await expect.poll(() => artefactTransform(observerPage, artefactId), { timeout: 20_000 })
        .toContain('rotate(45)');

    await teardown(editor, observer);
});

test('placement scale propagates to another session (rendered DOM)', async ({ browser }) => {
    const { editor, observer, editorPage, observerPage } = await openTwoSessions(browser);

    await putPlacement(editorPage, { ...basePlacement, scale: 2 });

    await expect.poll(() => artefactTransform(observerPage, artefactId), { timeout: 20_000 })
        .toContain('scale(2)');

    await teardown(editor, observer);
});

test('a late-joining session sees the current placement on initial load', async ({ browser }) => {
    // Mutate FIRST (no observer yet), then open a fresh session — it must load the
    // already-changed state (the initial-load path, not a live broadcast).
    const editor = await authedContext(browser, token);
    const editorPage = await editor.newPage();
    await editorPage.goto(`/editions/${editionId}/scroll-editor`);
    await expect.poll(() => artefactTransform(editorPage, artefactId), { timeout: 30_000 }).not.toBeNull();

    const lateX = (basePlacement.translate.x ?? 0) + 9876;
    await putPlacement(editorPage, { ...basePlacement, translate: { x: lateX, y: 6000 } });
    await expect.poll(() => artefactX(editorPage, artefactId), { timeout: 20_000 }).toBe(lateX);

    const observer = await authedContext(browser, token);
    const observerPage = await observer.newPage();
    await observerPage.goto(`/editions/${editionId}/scroll-editor`);

    await expect.poll(() => artefactX(observerPage, artefactId), { timeout: 30_000 }).toBe(lateX);
    await expect.poll(() => artefactTransform(observerPage, artefactId), { timeout: 20_000 })
        .toContain(`translate(${lateX},`);

    await teardown(editor, observer);
});
