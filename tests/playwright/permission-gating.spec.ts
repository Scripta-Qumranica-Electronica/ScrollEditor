import { test, expect, loginToken, authedContext, collectCoverage, API } from './fixtures';

// Permission gating: a user WITHOUT write access (viewing a public edition they don't
// collaborate on) must not get write controls. (The writable case — controls present — is
// covered by functional-regressions, which creates artefacts on writable copies.)

const READONLY_EDITION = 810; // public, not owned by the test user -> read-only, has content

let token: string;
let roIo: string;
let roArtefact: number;

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    const auth = { Authorization: `Bearer ${token}` };
    roIo = (await (await request.get(`${API}/v1/editions/${READONLY_EDITION}/imaged-objects`, { headers: auth })).json()).imagedObjects[0].id;
    const arts = (await (await request.get(`${API}/v1/editions/${READONLY_EDITION}/artefacts`, { headers: auth })).json()).artefacts;
    roArtefact = (arts.find((a: { isVirtual: boolean; imagedObjectId?: string }) => !a.isVirtual && a.imagedObjectId) ?? arts[0]).id;
    await request.dispose();
});

test('imaged-object editor: no "New Artefact" control when read-only', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
    await page.goto(`/editions/${READONLY_EDITION}/imaged-objects/${roIo}`);
    // Toolbar renders regardless of permission (the Side dropdown is always there).
    await expect(page.locator('#imaged-object-toolbar')).toBeVisible({ timeout: 40_000 });
    await page.waitForTimeout(1000);
    await expect(page.getByRole('button', { name: 'New Artefact' })).toHaveCount(0);
    await collectCoverage(context);
    await context.close();
});

test('artefact editor: ROI drawing tools hidden when read-only', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const page = await context.newPage();
    await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
    await page.goto(`/editions/${READONLY_EDITION}/artefacts/${roArtefact}`);
    await expect(page.locator('#text-side, #artefact-image').first()).toBeVisible({ timeout: 40_000 });
    await page.waitForTimeout(1000);
    // Draw/Box are v-show-gated (present but display:none); Select stays (no gate).
    await expect(page.getByTitle('Draw', { exact: true }).first()).toBeHidden();
    await expect(page.getByTitle('Select', { exact: true }).first()).toBeVisible();
    await collectCoverage(context);
    await context.close();
});
