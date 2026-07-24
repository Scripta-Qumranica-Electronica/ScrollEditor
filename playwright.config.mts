import { defineConfig, devices } from '@playwright/test';

// Playwright e2e config for ScrollEditor. Chosen over Cypress because SQE's core
// feature is realtime multi-tab collaboration, which needs multiple independent
// browser contexts per test — first-class in Playwright.
//
// Requires the app + backend running:
//   - instrumented frontend:  COVERAGE=true vite --port 8080 --strictPort
//   - API on :5000, DB on :3307 (see docs/sqe-local-dev-stack)
// Coverage is collected via the fixture in tests/playwright/fixtures.ts (reads
// window.__coverage__ into .nyc_output; `npx nyc report` to summarise).
export default defineConfig({
    testDir: './tests/playwright',
    // Realtime tests mutate shared backend edition state, so keep them serial for
    // now. Individual read-only specs can opt into parallelism later.
    fullyParallel: false,
    workers: 1,
    // The full serial suite copies many editions; the source API (Debug build) + the
    // growing editions table degrade under that sustained load, so a per-spec beforeAll
    // `loginToken` can crawl. A generous per-test/hook budget keeps those transient slow
    // logins from failing the whole spec (they pass in isolation). retries:1 covers the
    // rest. A test that fails deterministically still fails well under this ceiling.
    timeout: 90_000,
    retries: 1,
    expect: { timeout: 10_000 },
    reporter: [['list']],
    use: {
        baseURL: 'http://localhost:8080',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        // Cross-browser is a one-line add when we want it:
        // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        // { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    ],
});
