import { test as base, expect, Browser, BrowserContext, Page, APIRequestContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export const API = 'http://localhost:5000';
const NYC = path.resolve(__dirname, '../../.nyc_output');
export const TEST_USER = { email: 'test@1.com', password: 'test' };

// Log in via the API and return the JWT (the app stores this in localStorage['token']).
export async function loginToken(request: APIRequestContext, user = TEST_USER): Promise<string> {
    const resp = await request.post(`${API}/v1/users/login`, { data: user });
    expect(resp.ok(), 'login API should succeed').toBeTruthy();
    return (await resp.json()).token as string;
}

// A browser context pre-authenticated with the given token (injected before app JS runs).
export async function authedContext(browser: Browser, token: string): Promise<BrowserContext> {
    const context = await browser.newContext();
    await context.addInitScript((t: string) => window.localStorage.setItem('token', t), token);
    recordRequests(context, currentTestTitle);
    return context;
}

// Read an artefact's placement.translate.x from the live app store (or null).
export async function artefactX(page: Page, id: number): Promise<number | null> {
    return page.evaluate((artId) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const app = document.getElementById('app') as any;
        const st = app?.__vue_app__?.config?.globalProperties?.$state;
        const a = st?.artefacts?.find(artId);
        return a ? a.placement.translate.x : null;
    }, id);
}

// Read the RENDERED placement transform of an artefact in the scroll editor.
// Each placed artefact is drawn as `<g transform="translate(x, y) rotate(r)
// scale(s) ...">` wrapping `#path-<id>`. Asserting on this (not just the store)
// proves the SignalR change actually re-rendered the DOM — the exact reactivity
// the Vue-3 migration had lost.
export async function artefactTransform(page: Page, id: number): Promise<string | null> {
    return page.evaluate((artId) => {
        const path = document.querySelector(`#path-${artId}`);
        const g = path && path.closest('g[transform]');
        return g ? g.getAttribute('transform') : null;
    }, id);
}

// Write each page's istanbul coverage (window.__coverage__) into .nyc_output.
export async function collectCoverage(context: BrowserContext): Promise<void> {
    for (const page of context.pages()) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cov = await page.evaluate(() => (window as any).__coverage__);
            if (cov) {
                fs.mkdirSync(NYC, { recursive: true });
                fs.writeFileSync(
                    path.join(NYC, `pw-${Date.now()}-${Math.floor(Math.random() * 1e9)}.json`),
                    JSON.stringify(cov),
                );
            }
        } catch {
            /* page may already be closed */
        }
    }
}

// Env-guarded API-coverage recorder. When API_AUDIT=1, every /v1/ request made
// by the real app during a test is appended (as {test, method, url}) to
// tests/playwright/.api-audit.jsonl, then aggregated into API-COVERAGE.md's
// "covered-by" column. A no-op otherwise, so it is safe to leave in.
const API_AUDIT = process.env.API_AUDIT === '1';
const AUDIT_FILE = path.resolve(__dirname, '.api-audit.jsonl');
let currentTestTitle = '';
function recordRequests(context: BrowserContext, testTitle: string): void {
    if (!API_AUDIT) {
        return;
    }
    const attach = (page: Page) =>
        page.on('request', (req) => {
            const url = req.url();
            if (!/\/v1\//.test(url)) {
                return;
            }
            fs.appendFileSync(
                AUDIT_FILE,
                JSON.stringify({
                    test: testTitle,
                    method: req.method(),
                    // strip host + query so URLs collapse to route shapes
                    url: url.replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, ''),
                }) + '\n',
            );
        });
    context.on('page', attach);
    context.pages().forEach(attach);
}

// Default single-context tests get coverage collected automatically on teardown.
export const test = base.extend<{ context: BrowserContext }>({
    context: async ({ context }, use, testInfo) => {
        currentTestTitle = testInfo.title;
        recordRequests(context, testInfo.title);
        await use(context);
        await collectCoverage(context);
    },
});

export { expect };
