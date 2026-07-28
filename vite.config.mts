import { defineConfig, loadEnv, Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import istanbul from 'vite-plugin-istanbul';
import fs from 'fs';
import path from 'path';

// The bundled js-clipper/clipper.js contains a handful of Latin-1 encoded
// characters (superscripts in its comments) that Rolldown's default UTF-8
// loader rejects ("stream did not contain valid UTF-8"). Load that one file
// via latin1 so it round-trips cleanly, without patching node_modules.
function jsClipperLatin1(): Plugin {
    return {
        name: 'js-clipper-latin1',
        enforce: 'pre',
        load(id: string) {
            if (id.replace(/\\/g, '/').includes('/js-clipper/clipper.js')) {
                // Read as latin1 (superscripts in comments are not valid UTF-8), and
                // wrap the CommonJS body (it ends with `module.exports = ClipperLib`)
                // so it exposes a proper ESM default export for `import clipperLib`.
                const code = fs.readFileSync(id.split('?')[0], 'latin1');
                return `const module = { exports: {} };\nconst exports = module.exports;\n${code}\nexport default module.exports;`;
            }
            return null;
        },
    };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // Load .env.* files and expose the legacy VUE_APP_* variables. The rest of
    // the codebase still reads process.env.VUE_APP_* directly, so instead of
    // rewriting every file we re-inject those values via `define` below.
    const env = loadEnv(mode, process.cwd(), 'VUE_APP');

    return {
        plugins: [
            jsClipperLatin1(),
            vue(),
            // Code-coverage instrumentation for e2e. Gated behind COVERAGE=true so
            // it never slows normal dev/build. Used with @cypress/code-coverage.
            ...(process.env.COVERAGE
                ? [istanbul({ include: ['src/**'], extension: ['.ts', '.vue'], requireEnv: false })]
                : []),
        ],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, 'src'),
            },
        },
        define: {
            // Preserve legacy process.env.VUE_APP_* reads without editing every file.
            'process.env.VUE_APP_SIGNALR_URL': JSON.stringify(env.VUE_APP_SIGNALR_URL),
            'process.env.VUE_APP_BACKEND_PREFIX': JSON.stringify(env.VUE_APP_BACKEND_PREFIX),
            'process.env.VUE_APP_MODE': JSON.stringify(env.VUE_APP_MODE),
            'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
        },
        optimizeDeps: {
            // The dep pre-bundler (rolldown) bypasses the jsClipperLatin1 plugin
            // and rejects clipper.js's Latin-1 bytes. Exclude it so it is served
            // through the normal plugin pipeline (where the latin1 loader applies).
            exclude: ['js-clipper'],
        },
        server: {
            port: 8080,
            proxy: {
                '/v1': {
                    target: 'http://localhost:5000',
                    ws: true,
                    changeOrigin: true,
                },
            },
        },
    };
});
