import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'path';

// Vitest config for fast unit/component tests. Kept separate from vite.config.mts
// so the app build/dev config stays clean. Uses the same @/ alias and the Vue-3
// compat build the app runs on.
export default defineConfig({
    plugins: [
        vue({ template: { compilerOptions: { compatConfig: { MODE: 2 } } } }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
            vue: '@vue/compat',
        },
    },
    define: {
        // The app reads these at import time; provide test values so modules load.
        'process.env.VUE_APP_SIGNALR_URL': JSON.stringify('http://localhost:5000/signalr'),
        'process.env.VUE_APP_BACKEND_PREFIX': JSON.stringify('http://localhost:5000'),
        'process.env.VUE_APP_MODE': JSON.stringify('development'),
        'process.env.NODE_ENV': JSON.stringify('test'),
    },
    test: {
        environment: 'happy-dom',
        globals: true,
        include: ['tests/unit/**/*.spec.ts'],
        // The app imports js-clipper (CJS/latin1); exclude heavy e2e dirs.
        exclude: ['node_modules', 'tests/e2e/**'],
        coverage: {
            // istanbul (not v8) so unit coverage merges with the e2e istanbul output
            // (window.__coverage__ -> .nyc_output) into one combined nyc report.
            provider: 'istanbul',
            include: ['src/**'],
            // all:true counts every src file (untested -> 0%) so the denominator is
            // the WHOLE codebase, not just what a test happened to import.
            all: true,
            // Potrace.js is a vendored, battle-tested bitmap-tracing library (no
            // side effects, "just works") — exclude it from the coverage denominator.
            exclude: ['src/utils/Potrace.js'],
            reporter: ['json', 'text-summary'],
            reportsDirectory: './coverage-unit',
        },
    },
});
