// vue-virtual-scroller (v1) has no bundled typings. Kept as a TODO(vue3):
// component migrators should replace it with a Vue 3 compatible scroller.
declare module 'vue-virtual-scroller';

// @vue/compat ships no type declarations. We only import `configureCompat`
// from it during bootstrap (main.ts); declare just that surface.
declare module '@vue/compat' {
    import type { App } from 'vue';
    export function configureCompat(config: Record<string, unknown>): void;
    export function createApp(...args: any[]): App;
    const compat: any;
    export default compat;
}
