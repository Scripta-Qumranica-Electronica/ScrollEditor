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
    timeout: 45_000,
    // The full serial suite copies many editions; the source API (Debug build) + the
    // growing editions table degrade under that sustained load, occasionally tripping a
    // beforeAll `loginToken` past its timeout. Those are transient (they pass on a re-run
    // once load subsides), so retry once. A test that fails deterministically still fails.
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
