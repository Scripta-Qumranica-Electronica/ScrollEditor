import { test, expect, loginToken, authedContext, collectCoverage, API } from './fixtures';
import type { ConsoleMessage } from '@playwright/test';

// Console-health gate: every major route must load with ZERO Vue warnings and zero
// unexpected console errors.
//
// This is the layer the migration was missing. `route-coverage` proves a route *mounts*;
// the sweeps prove it is structurally sound (nothing overlapped, no leaked i18n keys) — but
// NONE of them saw the wiring bugs, because a dead <b-popover triggers="...">, a dead
// @change, or an unregistered v-hammer/v-b-toggle silently no-ops: it renders fine, doesn't
// crash, doesn't overlap. Real Vue 3 DOES emit a runtime warning for a whole class of these
// (Failed to resolve directive/component, Extraneous non-emits listener, injection not
// found, Invalid prop, "$x accessed during render but not defined"). Asserting there are no
// such warnings would have caught the v-hammer directive, the <break/> component, and the
// onResize string-handler on sight. (The truly-silent ones — a dead prop/class — are covered
// by the static scanner + effect-asserting specs; this net catches the warn-producing half.)

let token: string;
let ed: number;
let artId: number;
let ioId: string | undefined;
let tfId: number | undefined;

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    const auth = { Authorization: `Bearer ${token}` };
    const copy = await request.post(`${API}/v1/editions/899`, { headers: auth, data: { name: `console-health-${Date.now()}` } });
    ed = (await copy.json()).id;
    const arts = (await (await request.get(`${API}/v1/editions/${ed}/artefacts`, { headers: auth })).json()).artefacts;
    artId = arts[0].id;
    const ios = (await (await request.get(`${API}/v1/editions/${ed}/imaged-objects`, { headers: auth })).json()).imagedObjects ?? [];
    ioId = ios[0]?.id;
    const tfs = (await (await request.get(`${API}/v1/editions/${ed}/text-fragments`, { headers: auth })).json()).textFragments ?? [];
    tfId = tfs[0]?.id;
    await request.dispose();
});

// External/benign noise that is NOT an app bug: IIIF image loading (self-signed cert on the
// image host, 404s, the app's own "Giving up loading" retry logs) and a benign browser warning.
const NOISE = [
    /ERR_CERT/i,
    /Failed to load resource/i,
    /Giving up loading/i,
    /gallica\.bnf\.fr|iiif|\.jpg|\.png|\.jpeg/i,
    /net::ERR_INTERNET_DISCONNECTED/i,
    /ResizeObserver loop/i,
    /\[intlify\]/i, // vue-i18n legacy-mode config notices (not per-route app bugs)
];
const isNoise = (t: string) => NOISE.some((re) => re.test(t));

const ROUTES: Array<{ name: string; path: () => string }> = [
    { name: 'landing', path: () => '/' },
    { name: 'public editions list', path: () => '/home/public' },
    { name: 'search', path: () => '/search' },
    { name: 'edition artefacts tab', path: () => `/editions/${ed}/artefacts` },
    { name: 'edition imaged-objects tab', path: () => `/editions/${ed}/imaged-objects` },
    { name: 'edition metadata tab', path: () => `/editions/${ed}/metadata` },
    { name: 'scroll editor', path: () => `/editions/${ed}/scroll-editor` },
    { name: 'artefact editor', path: () => `/editions/${ed}/artefacts/${artId}` },
    { name: 'imaged-object editor', path: () => `/editions/${ed}/imaged-objects/${ioId}` },
    { name: 'text-fragment editor', path: () => `/editions/${ed}/text-fragments/${tfId}` },
];

for (const route of ROUTES) {
    test(`console-health: ${route.name}`, async ({ browser }) => {
        const context = await authedContext(browser, token);
        const page = await context.newPage();
        const vueWarnings: string[] = [];
        const consoleErrors: string[] = [];
        page.on('console', (msg: ConsoleMessage) => {
            const t = msg.text();
            if (/\[Vue warn\]/.test(t)) vueWarnings.push(t.split('\n')[0].slice(0, 200));
            else if (msg.type() === 'error' && !isNoise(t)) consoleErrors.push(t.split('\n')[0].slice(0, 200));
        });
        page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message.slice(0, 200)));

        await page.goto(route.path());
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(3000); // let mount + async data + first interactions settle

        expect(
            vueWarnings,
            `Vue warnings on ${route.name} (unresolved directive/component, extraneous listener, bad prop, …):\n  ${vueWarnings.join('\n  ')}`,
        ).toEqual([]);
        expect(
            consoleErrors,
            `console errors on ${route.name}:\n  ${consoleErrors.join('\n  ')}`,
        ).toEqual([]);

        await collectCoverage(context);
        await context.close();
    });
}
