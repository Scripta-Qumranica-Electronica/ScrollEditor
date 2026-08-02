import { test, expect, collectCoverage, loginToken, authedContext, artefactTransform, API } from './fixtures';
import type { Page, Browser, BrowserContext } from '@playwright/test';

// COLLABORATIVE UI flow: a real user action in one session must reach a SECOND SignalR-connected
// session live. Unlike realtime.spec.ts (which triggers the change with a direct API PUT), here
// client A performs the actual UI interaction (select an artefact, click a toolbar button); the
// scroll editor autosaves the operation, the server broadcasts it, and we assert client B's
// rendered transform converges WITHOUT a reload. This proves the human→interface→SignalR→other
// client path end to end.

let token: string;
let editionId: number;
let artefactId: number;

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    const auth = { Authorization: `Bearer ${token}` };
    editionId = (await (await request.post(`${API}/v1/editions/899`, { headers: auth, data: { name: `pw-rt-flow-${Date.now()}` } })).json()).id;
    const arts = (await (await request.get(`${API}/v1/editions/${editionId}/artefacts`, { headers: auth })).json()).artefacts;
    artefactId = arts.find((a: { isPlaced: boolean }) => a.isPlaced).id;
    await request.dispose();
});

async function openTwoSessions(browser: Browser) {
    const editor = await authedContext(browser, token);
    const observer = await authedContext(browser, token);
    const editorPage = await editor.newPage();
    const observerPage = await observer.newPage();
    for (const p of [editorPage, observerPage]) {
        await p.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
        await p.setViewportSize({ width: 1600, height: 1000 });
        await p.goto(`/editions/${editionId}/scroll-editor`);
    }
    // Both sessions have the artefact rendered.
    await expect.poll(() => artefactTransform(observerPage, artefactId), { timeout: 30_000 }).not.toBeNull();
    await expect.poll(() => artefactTransform(editorPage, artefactId), { timeout: 30_000 }).not.toBeNull();
    return { editor, observer, editorPage, observerPage };
}

const selectArtefact = (page: Page, id: number) => page.evaluate((artId) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const art = st.artefacts.items.find((a: any) => a.id === artId);
    st.eventBus.emit('select-artefact', art);
}, id);

const rotateOf = (t: string | null) => (t?.match(/rotate\(([-\d.]+)/)?.[1]) ?? null;

test('COLLAB: a real toolbar rotate in one session reaches a second session live', async ({ browser }) => {
    const { editor, observer, editorPage, observerPage } = await openTwoSessions(browser);

    const observerBefore = rotateOf(await artefactTransform(observerPage, artefactId));

    await test.step('client A selects the artefact and clicks Rotate Right (real UI)', async () => {
        await selectArtefact(editorPage, artefactId);
        await expect(editorPage.getByTitle('Rotate Right', { exact: true })).toBeEnabled({ timeout: 10_000 });
        // Rotate a few times so the change is unambiguous and the autosave definitely fires.
        for (let i = 0; i < 3; i++) await editorPage.getByTitle('Rotate Right', { exact: true }).click();
    });

    await test.step("client A's own rendered transform reflects the rotate", async () => {
        await expect.poll(async () => rotateOf(await artefactTransform(editorPage, artefactId)), { timeout: 10_000 }).not.toBe(observerBefore);
    });

    await test.step('client B converges to the same rotation via SignalR — no reload', async () => {
        const editorRotate = rotateOf(await artefactTransform(editorPage, artefactId));
        expect(editorRotate).not.toBe(observerBefore);
        // The OTHER session's rendered transform catches up to A's value without any reload.
        await expect.poll(async () => rotateOf(await artefactTransform(observerPage, artefactId)), { timeout: 25_000 }).toBe(editorRotate);
    });

    for (const c of [editor, observer] as BrowserContext[]) await collectCoverage(c);
    await editor.close();
    await observer.close();
});

test('COLLAB: renaming an artefact in one session updates the other session\'s grid live', async ({ browser }) => {
    // A different broadcast than placement: changeArtefact -> ArtefactChanged. Both sessions view
    // the artefacts grid; client A renames a card through its right-click popover and client B's
    // grid must reflect the new name without a reload.
    const editor = await authedContext(browser, token);
    const observer = await authedContext(browser, token);
    const editorPage = await editor.newPage();
    const observerPage = await observer.newPage();
    for (const p of [editorPage, observerPage]) {
        await p.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
        await p.setViewportSize({ width: 1500, height: 950 });
        await p.goto(`/editions/${editionId}/artefacts`);
        await expect(p.locator('.line-name[id^="popover-line-"]').first()).toBeVisible({ timeout: 40_000 });
    }

    const newName = `rt-renamed-${Date.now()}`;

    await test.step('client A renames the first artefact via its popover (real UI)', async () => {
        const card = editorPage.locator('.line-name[id^="popover-line-"]').first();
        await card.click({ button: 'right' });
        const pop = editorPage.locator('.popover.b-popover.show', { hasText: 'Rename this artefact' });
        await expect(pop.locator('#newName')).toBeVisible({ timeout: 10_000 });
        await pop.locator('#newName').fill(newName);
        await pop.getByRole('button', { name: /^rename$/i }).click();
    });

    await test.step("client A's grid shows the new name", async () => {
        await expect(editorPage.locator('.side-edition', { hasText: newName }).first()).toBeVisible({ timeout: 10_000 });
    });

    await test.step("client B's grid converges to the new name via SignalR — no reload", async () => {
        await expect(observerPage.locator('.side-edition', { hasText: newName }).first()).toBeVisible({ timeout: 25_000 });
    });

    for (const c of [editor, observer] as BrowserContext[]) await collectCoverage(c);
    await editor.close();
    await observer.close();
});
