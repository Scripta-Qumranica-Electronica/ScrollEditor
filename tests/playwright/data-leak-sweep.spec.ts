import { test, expect, loginToken, authedContext, collectCoverage, API } from './fixtures';
import { scanLeaks, type LeakFinding } from './sweep-helpers';
import type { BrowserContext, Page } from '@playwright/test';

// Generic "nothing a user should never see is rendered" sweep. For every route and every modal
// it scans the VISIBLE text for: a raw stringified object/array, an `undefined`/`NaN` value, or
// an untranslated i18n key (its dotted path). Needs no per-page spec — it would have caught the
// copyright modal that printed the raw collaborators JSON, and finds missing translations too.

let token: string;
let ed: number;
let artId: number;
let ioId: string | undefined;
let tfId: number | undefined;

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    const auth = { Authorization: `Bearer ${token}` };
    const copyText = await (await request.post(`${API}/v1/editions/899`, { headers: auth, data: { name: `pw-leak-${Date.now()}` } })).text();
    ed = Number((copyText.match(/"id":\s*(\d+)/) || [])[1]);
    const arts = (await (await request.get(`${API}/v1/editions/${ed}/artefacts`, { headers: auth })).json()).artefacts;
    artId = arts[0].id;
    ioId = ((await (await request.get(`${API}/v1/editions/${ed}/imaged-objects`, { headers: auth })).json()).imagedObjects ?? [])[0]?.id;
    tfId = ((await (await request.get(`${API}/v1/editions/${ed}/text-fragments`, { headers: auth })).json()).textFragments ?? [])[0]?.id;
    await request.dispose();
});

function fmt(findings: LeakFinding[]): string {
    return findings.map((f) => `[${f.kind}] "${f.match}"  …${f.context}…`).join('\n  ');
}

// --- routes ---------------------------------------------------------------------------------
const ROUTES: Array<{ name: string; path: () => string }> = [
    { name: 'landing', path: () => '/' },
    { name: 'home-public', path: () => '/home/public' },
    { name: 'home-private', path: () => '/home/private' },
    { name: 'search', path: () => '/search' },
    { name: 'edition-artefacts', path: () => `/editions/${ed}/artefacts` },
    { name: 'edition-imaged-objects', path: () => `/editions/${ed}/imaged-objects` },
    { name: 'edition-metadata', path: () => `/editions/${ed}/metadata` },
    { name: 'scroll-editor', path: () => `/editions/${ed}/scroll-editor` },
    { name: 'artefact-editor', path: () => `/editions/${ed}/artefacts/${artId}` },
    { name: 'imaged-object-editor', path: () => `/editions/${ed}/imaged-objects/${ioId}` },
    { name: 'text-fragment-editor', path: () => `/editions/${ed}/text-fragments/${tfId}` },
];

for (const route of ROUTES) {
    test(`no leaked data on ${route.name}`, async ({ browser }) => {
        const context = await authedContext(browser, token);
        const page = await context.newPage();
        await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
        await page.goto(route.path());
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2500);
        const findings = await scanLeaks(page);
        expect(findings, `leaked on ${route.name}:\n  ${fmt(findings)}`).toEqual([]);
        await collectCoverage(context);
        await context.close();
    });
}

// --- in-app modals (data-bearing) -----------------------------------------------------------
const INAPP_MODALS: Array<{ name: string; open: (p: Page) => Promise<string> }> = [
    {
        name: 'copy-edition',
        open: async (p) => {
            await p.goto('/home/public');
            await p.getByText('Copy Edition').first().click();
            return '#copy-edition-modal';
        },
    },
    {
        name: 'metadata',
        open: async (p) => {
            await p.goto(`/editions/${ed}/artefacts`);
            await p.getByRole('button', { name: /Manuscript Information/i }).click();
            return '#editionMetadataModal';
        },
    },
    {
        name: 'permission',
        open: async (p) => {
            await p.goto(`/editions/${ed}`);
            await p.getByRole('button', { name: /collaborators/i }).click();
            return '#permissionModal';
        },
    },
];

for (const m of INAPP_MODALS) {
    test(`no leaked data in modal: ${m.name}`, async ({ browser }) => {
        const context = await authedContext(browser, token);
        const page = await context.newPage();
        await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
        const sel = await m.open(page);
        await expect(page.locator(`${sel} .modal-content`).first()).toBeVisible({ timeout: 20_000 });
        await page.waitForTimeout(800);
        const findings = await scanLeaks(page, sel);
        expect(findings, `leaked in ${m.name} modal:\n  ${fmt(findings)}`).toEqual([]);
        await collectCoverage(context);
        await context.close();
    });
}

// --- logged-out modals ----------------------------------------------------------------------
const LOGGED_OUT: Array<{ name: string; open: (p: Page) => Promise<string> }> = [
    { name: 'login', open: async (p) => { await p.locator('button.btn-login').first().click(); return '#loginModal'; } },
    {
        name: 'register',
        open: async (p) => {
            await p.locator('button.btn-login').first().click();
            await expect(p.locator('#loginModal input[type="email"]')).toBeVisible({ timeout: 10_000 });
            await p.locator('#loginModal').getByRole('link', { name: /sign up/i }).click();
            return '#registerModal';
        },
    },
    { name: 'report-problem', open: async (p) => { await callNavbar(p, 'reportProblemModal'); return '#ReportProblemModal'; } },
    { name: 'faq', open: async (p) => { await callNavbar(p, 'showFAQModal'); return '#FaqModal'; } },
    { name: 'eula', open: async (p) => { await callNavbar(p, 'showEulaModal'); return '#EulaModal'; } },
];

async function callNavbar(page: Page, fn: string): Promise<void> {
    await expect
        .poll(() =>
            page.evaluate((fnName) => {
                const el = document.querySelector('.navbar-button') || document.querySelector('nav') || document.body;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let cur: any = (el as any)?.__vueParentComponent;
                while (cur && (!cur.ctx || typeof cur.ctx[fnName] !== 'function')) cur = cur.parent;
                if (!cur) return false;
                cur.ctx[fnName]();
                return true;
            }, fn), { timeout: 15_000 })
        .toBe(true);
}

for (const m of LOGGED_OUT) {
    test(`no leaked data in logged-out modal: ${m.name}`, async ({ browser }) => {
        const context: BrowserContext = await browser.newContext();
        const page = await context.newPage();
        await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
        await page.goto('/');
        await expect(page.locator('button.btn-login').first()).toBeVisible({ timeout: 20_000 });
        const sel = await m.open(page);
        await expect(page.locator(`${sel} .modal-content`).first()).toBeVisible({ timeout: 20_000 });
        await page.waitForTimeout(800);
        const findings = await scanLeaks(page, sel);
        expect(findings, `leaked in ${m.name} modal:\n  ${fmt(findings)}`).toEqual([]);
        await context.close();
    });
}
