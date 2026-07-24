import { test, expect, loginToken, authedContext, collectCoverage, API } from './fixtures';

// Breadth net: every significant route must MOUNT for an authenticated user —
// i.e. not bounce back to the landing page and not throw an uncaught error. This
// is deliberately shallow (it does not assert feature behaviour) but it is what
// catches the silent, whole-route breakages the Vue-3 migration produced. It was
// this style of check that surfaced the `/editions/:id` redirect bug (a static
// ':editionId' string that vue-router 4 never interpolated -> NaN -> 400 -> home).
//
// Deeper per-route behaviour lives in the focused specs (auth, realtime, …).

let token: string;
let ed: number;
let artId: number;
let ioId: string | undefined;
let tfId: number | undefined;

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    const auth = { Authorization: `Bearer ${token}` };

    const copy = await request.post(`${API}/v1/editions/899`, {
        headers: auth,
        data: { name: `route-coverage-${Date.now()}` },
    });
    ed = (await copy.json()).id;

    const arts = (await (await request.get(`${API}/v1/editions/${ed}/artefacts`, { headers: auth })).json()).artefacts;
    artId = arts[0].id;
    const ios = (await (await request.get(`${API}/v1/editions/${ed}/imaged-objects`, { headers: auth })).json()).imagedObjects ?? [];
    ioId = ios[0]?.id;
    const tfs = (await (await request.get(`${API}/v1/editions/${ed}/text-fragments`, { headers: auth })).json()).textFragments ?? [];
    tfId = tfs[0]?.id;

    await request.dispose();
});

// Paths are lazy so the ids fetched in beforeAll are resolved when each test runs.
const ROUTES: Array<{ name: string; path: () => string; bounceGuard: boolean }> = [
    { name: 'landing', path: () => '/', bounceGuard: false },
    { name: 'public editions list', path: () => '/home/public', bounceGuard: true },
    { name: 'search', path: () => '/search', bounceGuard: true },
    { name: 'edition view (bare -> artefacts)', path: () => `/editions/${ed}`, bounceGuard: true },
    { name: 'edition artefacts tab', path: () => `/editions/${ed}/artefacts`, bounceGuard: true },
    { name: 'edition imaged-objects tab', path: () => `/editions/${ed}/imaged-objects`, bounceGuard: true },
    { name: 'edition metadata tab', path: () => `/editions/${ed}/metadata`, bounceGuard: true },
    { name: 'scroll editor', path: () => `/editions/${ed}/scroll-editor`, bounceGuard: true },
    { name: 'artefact editor', path: () => `/editions/${ed}/artefacts/${artId}`, bounceGuard: true },
    { name: 'imaged-object editor', path: () => `/editions/${ed}/imaged-objects/${ioId}`, bounceGuard: true },
    { name: 'text-fragment editor', path: () => `/editions/${ed}/text-fragments/${tfId}`, bounceGuard: true },
];

for (const route of ROUTES) {
    test(`route mounts without bounce or error: ${route.name}`, async ({ browser }) => {
        const context = await authedContext(browser, token);
        const page = await context.newPage();
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));

        await page.goto(route.path());
        await page.waitForLoadState('domcontentloaded');
        // Let mount hooks and their API calls settle (a bounce/crash happens here).
        await page.waitForTimeout(2500);

        if (route.bounceGuard) {
            // Must not have been redirected back to the landing route.
            expect(new URL(page.url()).pathname, 'was bounced to landing').not.toBe('/');
        }
        const bodyLen = await page.evaluate(() => document.body.innerText.length);
        expect(bodyLen, 'page rendered no content').toBeGreaterThan(20);
        expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);

        await collectCoverage(context);
        await context.close();
    });
}
