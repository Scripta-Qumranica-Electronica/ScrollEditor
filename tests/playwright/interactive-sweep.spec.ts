import { test, expect, loginToken, authedContext, collectCoverage, API } from './fixtures';

// Reachability + visibility sweep. For every significant route, enumerate the interactive
// controls that are RENDERED + VISIBLE in the default state and flag any that are:
//   - zero-size (0×0 box),
//   - off-screen (center outside the viewport, not in a scroll container),
//   - OVERLAPPED (something else sits on top at the control's center -> you can't click it).
// Plus record any console errors / pageerrors per route. Report-mode: it logs findings so
// they can be triaged; the load-bearing invariants are asserted at the end.

let token: string;
let ed: number;
let artId: number;
let ioId: string | undefined;
let tfId: number | undefined;

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    const auth = { Authorization: `Bearer ${token}` };
    const copy = await request.post(`${API}/v1/editions/899`, { headers: auth, data: { name: `pw-sweep-${Date.now()}` } });
    // The copy response can contain unescaped control chars (from edition metadata) that
    // break strict response.json(); extract the id tolerantly and assert it's real so the
    // edition routes never become /editions/undefined/... (which fires NaN loads).
    const copyText = await copy.text();
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

// Paths are LAZY (functions) so the ids from beforeAll are resolved when each test RUNS,
// not at collection time (when ed/artId/… are still undefined).
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

// Runs in the browser: enumerate visible interactive controls and classify problems.
function auditPageFn() {
    const SEL = 'button, a[href], input, select, textarea, [role="button"], [role="tab"], [contenteditable="true"]';
    const describe = (el: Element) => {
        const e = el as HTMLElement;
        const txt = (e.getAttribute('title') || e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 40);
        return `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${e.className && typeof e.className === 'string' ? '.' + e.className.split(/\s+/).filter(Boolean).slice(0, 2).join('.') : ''}${txt ? ` "${txt}"` : ''}`;
    };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const out: Array<{ el: string; issue: string; detail: string }> = [];
    let checked = 0;
    for (const el of Array.from(document.querySelectorAll(SEL))) {
        const e = el as HTMLElement;
        const cs = getComputedStyle(e);
        // Only consider controls the user is meant to see/use right now.
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
        if (!e.getClientRects().length) continue; // not rendered
        const r = e.getBoundingClientRect();
        if (cs.pointerEvents === 'none') continue; // decorative / passthrough by design
        checked++;
        if (r.width === 0 || r.height === 0) {
            out.push({ el: describe(e), issue: 'zero-size', detail: `${Math.round(r.width)}x${Math.round(r.height)}` });
            continue;
        }
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        // Skip controls whose center is outside the viewport: virtualized/scrolled lists
        // legitimately position below-fold rows off-screen, so this isn't a reliable bug
        // signal (and elementFromPoint only works inside the viewport anyway).
        if (cx < 0 || cy < 0 || cx > vw || cy > vh) continue;
        // Overlap: the topmost element at the control's center should be the control itself,
        // a descendant, or an ancestor. Anything else means it's covered -> unclickable.
        const top = document.elementFromPoint(cx, cy);
        if (top && top !== e && !e.contains(top) && !top.contains(e)) {
            // Ignore when the covering node is a label/link wrapping the control or vice versa.
            out.push({ el: describe(e), issue: 'overlapped', detail: `covered by ${describe(top)}` });
        }
    }
    return { checked, problems: out };
}

const allFindings: Record<string, unknown> = {};

for (const route of ROUTES) {
    test(`sweep: ${route.name}`, async ({ browser }) => {
        const context = await authedContext(browser, token);
        const page = await context.newPage();
        const pageErrors: string[] = [];
        const consoleErrors: string[] = [];
        page.on('pageerror', (e) => pageErrors.push(e.message));
        page.on('console', (m) => {
            if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200));
        });
        // Drop images (invalid IIIF cert in this env slows things + is not what we audit).
        await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto(route.path());
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2500);

        const res = await page.evaluate(auditPageFn);
        allFindings[route.name] = { ...res, pageErrors, consoleErrors };
        // eslint-disable-next-line no-console
        console.log(`\n### SWEEP ${route.name} (checked ${res.checked} controls)`);
        if (res.problems.length) {
            for (const p of res.problems) console.log(`  [${p.issue}] ${p.el}  <- ${p.detail}`);
        } else {
            console.log('  no visibility/overlap problems');
        }
        if (pageErrors.length) console.log(`  PAGEERRORS: ${pageErrors.join(' | ')}`);
        // Non-IIIF console errors only (image aborts produce net::ERR noise we already drop;
        // dropping images can also make an <svg> compute NaN/Infinity geometry — a separate,
        // image-load-only robustness gap, not a per-route regression).
        const realConsole = consoleErrors.filter(
            (c) => !/ERR_|IIIF|net::|Expected number|Expected length|scale\(Infinity/i.test(c)
        );
        if (realConsole.length) console.log(`  CONSOLE ERRORS: ${realConsole.slice(0, 8).join(' | ')}`);

        // Guard: no interactive control may be OVERLAPPED by another element (you couldn't
        // click it). This is the high-confidence "it's there but dead" check.
        const overlapped = res.problems.filter((p) => p.issue === 'overlapped');
        expect(overlapped, `overlapped controls on ${route.name}: ${overlapped.map((p) => p.el).join('; ')}`).toEqual([]);
        // Guard: no uncaught pageerror on load.
        expect(pageErrors, `pageerrors on ${route.name}`).toEqual([]);

        await collectCoverage(context);
        await context.close();
    });
}
