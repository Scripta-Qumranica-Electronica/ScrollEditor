import { test, expect, loginToken, authedContext, collectCoverage, API } from './fixtures';

// Phase-4 layout audit. For each significant route, at 1280 and 1440 width, this:
//   - captures a screenshot into test-results/layout/ for manual comparison to prod
//     (https://sqe.deadseascrolls.org.il/),
//   - asserts the load-bearing layout invariants that the Vue-3 migration threatened:
//       * no horizontal overflow (the body doesn't scroll sideways),
//       * toolbars don't overflow their bar vertically (the bootstrap `.row > *`
//         width:100% / fixed-height regression fixed in toolbar.vue),
//       * no uncaught page error.
// IIIF thumbnails 404/cert-fail in this env and would add noise + slow the render, so
// images are dropped — layout is asserted on the chrome, not the pictures.

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
        data: { name: `layout-audit-${Date.now()}` },
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

const ROUTES: Array<{ name: string; path: () => string; knownToolbarOverflow?: boolean }> = [
    { name: 'landing', path: () => '/' },
    { name: 'home-public', path: () => '/home/public' },
    { name: 'home-private', path: () => '/home/private' },
    { name: 'search', path: () => '/search' },
    { name: 'edition-artefacts', path: () => `/editions/${ed}/artefacts` },
    { name: 'edition-imaged-objects', path: () => `/editions/${ed}/imaged-objects` },
    { name: 'scroll-editor', path: () => `/editions/${ed}/scroll-editor` },
    { name: 'artefact-editor', path: () => `/editions/${ed}/artefacts/${artId}` },
    { name: 'imaged-object-editor', path: () => `/editions/${ed}/imaged-objects/${ioId}` },
    { name: 'text-fragment-editor', path: () => `/editions/${ed}/text-fragments/${tfId}` },
];

const WIDTHS = [1280, 1440];

for (const route of ROUTES) {
    for (const width of WIDTHS) {
        test(`layout ${route.name} @ ${width}`, async ({ browser }) => {
            const context = await authedContext(browser, token);
            const page = await context.newPage();
            const errors: string[] = [];
            page.on('pageerror', (err) => errors.push(err.message));
            await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
            await page.setViewportSize({ width, height: 900 });

            await page.goto(route.path());
            await page.waitForLoadState('domcontentloaded');
            await page.waitForTimeout(2500);

            await page.screenshot({ path: `test-results/layout/${route.name}-${width}.png`, fullPage: false });

            // No horizontal overflow: the document must not scroll sideways (allow a
            // 2px rounding slack).
            const overflowX = await page.evaluate(
                () => document.documentElement.scrollWidth - document.documentElement.clientWidth
            );
            expect(overflowX, `${route.name} overflows horizontally by ${overflowX}px`).toBeLessThanOrEqual(2);

            // Toolbars must not overflow their own bar vertically (the fixed-height /
            // .row>* regression). Check every rendered .toolbar.
            const toolbarOverflow = await page.evaluate(() =>
                [...document.querySelectorAll('.toolbar')]
                    .map((el) => (el as HTMLElement).scrollHeight - (el as HTMLElement).clientHeight)
                    .filter((d) => d > 4)
            );
            if (route.knownToolbarOverflow) {
                // Documented known issue — assert it does not REGRESS well past the current
                // ~55px spill (a bigger jump means a new/worse layout break to investigate).
                const worst = Math.max(0, ...toolbarOverflow);
                expect(worst, `scroll-editor toolbar overflow grew unexpectedly to ${worst}px`).toBeLessThan(90);
            } else {
                expect(toolbarOverflow, `a .toolbar overflows vertically: ${toolbarOverflow.join(',')}`).toEqual([]);
            }

            expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
            await collectCoverage(context);
            await context.close();
        });
    }
}
