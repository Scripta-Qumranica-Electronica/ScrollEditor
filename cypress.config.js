const { defineConfig } = require('cypress')

// Migrated from the legacy cypress.json (Cypress <= 9). The e2e specs live under
// tests/e2e, and several of them share state: copy_spec creates the "1Q7Copy"
// edition that scroll_spec and rename_editor_spec then consume (rename_editor_spec
// renames it), so the specs must run in a fixed order. Cypress runs specPattern
// entries in the order listed here, which encodes that dependency chain.
module.exports = defineConfig({
    e2e: {
        baseUrl: 'http://localhost:8080',
        supportFile: 'tests/e2e/support/index.js',
        fixturesFolder: 'tests/e2e/fixtures',
        screenshotsFolder: 'tests/e2e/screenshots',
        videosFolder: 'tests/e2e/videos',
        video: false,
        defaultCommandTimeout: 10000,
        // Ordered on purpose (see note above) — do not sort alphabetically.
        // Two specs were retired because their UI was removed from the app:
        //   - language_spec.js: the in-app language switcher (#language) is gone (b9a6237).
        //   - rename_editor_spec.js: the edition-rename sidebar (edition-ver-sidebar) is
        //     imported but rendered in no template, so there is no reachable rename UI.
        specPattern: [
            'tests/e2e/specs/home_page_spec.js',
            'tests/e2e/specs/copy_spec.js',
            'tests/e2e/specs/scroll_spec.js',
        ],
        setupNodeEvents(on, config) {
            return config
        },
    },
})
