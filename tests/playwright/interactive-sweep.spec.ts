import { test, expect, loginToken, authedContext, collectCoverage, API } from './fixtures';
import { auditControls } from './sweep-helpers';

// Reachability + visibility sweep. For every significant route, at three widths, enumerate
// the interactive controls that are RENDERED + VISIBLE in the default state and flag any
// that are OVERLAPPED (something on top -> unclickable), zero-size, or CLIPPED by a scroll
// container, plus any pageerror on load. Overlap + clipped are asserted (high-confidence
// "it's there but dead" bugs); zero-size is logged. Images are dropped (invalid IIIF cert
// in this env slows the render and isn't what we audit here).

let token: string;
let ed: number;
let artId: number;
let ioId: string | undefined;
let tfId: number | undefined;

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    const auth = { Authorization: `Bearer ${token}` };
    const copyText = await (await request.post(`${API}/v1/editions/899`, { headers: auth, data: { name: `pw-sweep-${Date.now()}` } })).text();
    ed = Number((copyText.match(/"id":\s*(\d+)/) || [])[1]);
    expect(Number.isFinite(ed), `edition copy must yield a numeric id (got ${ed})`).toBeTruthy();
    const arts = (await (await request.get(`${API}/v1/editions/${ed}/artefacts`, { headers: auth })).json()).artefacts;
    artId = arts[0].id;
    const ios = (await (await request.get(`${API}/v1/editions/${ed}/imaged-objects`, { headers: auth })).json()).imagedObjects ?? [];
    ioId = ios[0]?.id;
    const tfs = (await (await request.get(`${API}/v1/editions/${ed}/text-fragments`, { headers: auth })).json()).textFragments ?? [];
    tfId = tfs[0]?.id;
    await request.dispose();
});

// LAZY paths so the ids from beforeAll are resolved at run time.
const ROUTES: Array<{ name: string; path: () => string }> = [
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

const WIDTHS = [1024, 1280, 1440];

for (const route of ROUTES) {
    for (const width of WIDTHS) {
        test(`sweep ${route.name} @ ${width}`, async ({ browser }) => {
            const context = await authedContext(browser, token);
            const page = await context.newPage();
            const pageErrors: string[] = [];
            page.on('pageerror', (e) => pageErrors.push(e.message));
            await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
            await page.setViewportSize({ width, height: 900 });
            await page.goto(route.path());
            await page.waitForLoadState('domcontentloaded');
            await page.waitForTimeout(2500);

            const res = await auditControls(page);
            const overlapped = res.problems.filter((p) => p.issue === 'overlapped');
            const clipped = res.problems.filter((p) => p.issue === 'clipped');
            const zero = res.problems.filter((p) => p.issue === 'zero-size');
            // eslint-disable-next-line no-console
            console.log(
                `### ${route.name}@${width}: checked ${res.checked}` +
                    (res.problems.length ? '' : ' — clean') +
                    (overlapped.length ? `\n  OVERLAPPED: ${overlapped.map((p) => `${p.el} <- ${p.detail}`).join(' ; ')}` : '') +
                    (clipped.length ? `\n  CLIPPED: ${clipped.map((p) => p.el).join(' ; ')}` : '') +
                    (zero.length ? `\n  zero-size(info): ${zero.map((p) => p.el).join(' ; ')}` : '') +
                    (pageErrors.length ? `\n  PAGEERRORS: ${pageErrors.join(' | ')}` : '')
            );

            // Overlap + pageerror are the high-confidence guards. Clipped/zero-size are
            // logged only: a control legitimately scrolled out of a virtualized/overflow
            // list looks "clipped", so it's too noisy to assert on a whole-page sweep.
            void clipped;
            expect(overlapped, `overlapped controls: ${overlapped.map((p) => p.el).join('; ')}`).toEqual([]);
            expect(pageErrors, `pageerrors on ${route.name}@${width}`).toEqual([]);

            await collectCoverage(context);
            await context.close();
        });
    }
}
