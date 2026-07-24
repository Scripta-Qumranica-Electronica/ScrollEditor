import { describe, it, expect, beforeEach, vi } from 'vitest';

// Unit-covers the Vue-3 $toasted replacement plugin (src/plugins/toasted.ts): it installs
// a global $toasted.show(message, options) that appends a styled, auto-dismissing toast to
// the DOM. We drive show() directly and assert the DOM + timers. The plugin keeps a
// module-level per-position container Map, so we reset modules + re-import per test to
// avoid the Map referencing containers removed by a previous test's body reset.

async function install() {
    document.body.innerHTML = '';
    vi.resetModules();
    const { default: ToastedPlugin } = await import('@/plugins/toasted');
    const app = { config: { globalProperties: {} as Record<string, unknown> } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ToastedPlugin.install(app as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (app.config.globalProperties.$toasted as any);
}

describe('toasted plugin', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    it('installs a $toasted with a show() method', async () => {
        const t = await install();
        expect(typeof t.show).toBe('function');
    });

    it('renders a toast with the message and default (info) variant, then auto-dismisses', async () => {
        const t = await install();
        t.show('hello world');
        const toast = document.querySelector('.toast-shim');
        expect(toast).not.toBeNull();
        expect(toast!.textContent).toBe('hello world');
        expect(toast!.className).toContain('text-bg-info');
        // fade-in on next frame
        vi.advanceTimersByTime(20);
        // default 4s auto-dismiss + 150ms fade-out removes it
        vi.advanceTimersByTime(4000 + 200);
        expect(document.querySelector('.toast-shim')).toBeNull();
    });

    it('maps type -> bootstrap variant (success/error/warning) and position', async () => {
        const t = await install();
        t.show('ok', { type: 'success', position: 'bottom-left' });
        t.show('bad', { type: 'error' });
        t.show('warn', { type: 'warning', position: 'top-center' });
        const classes = [...document.querySelectorAll('.toast-shim')].map((e) => e.className);
        expect(classes.some((c) => c.includes('text-bg-success'))).toBe(true);
        expect(classes.some((c) => c.includes('text-bg-danger'))).toBe(true);
        expect(classes.some((c) => c.includes('text-bg-warning'))).toBe(true);
    });

    it('duration 0 keeps the toast until it is clicked away', async () => {
        const t = await install();
        t.show('sticky', { duration: 0 });
        const toast = document.querySelector('.toast-shim') as HTMLElement;
        vi.advanceTimersByTime(10_000);
        expect(document.querySelector('.toast-shim')).not.toBeNull(); // still there
        toast.click(); // manual dismiss
        vi.advanceTimersByTime(200);
        expect(document.querySelector('.toast-shim')).toBeNull();
    });

    it('reuses one container per position and cleans it up when empty', async () => {
        const t = await install();
        t.show('a', { position: 'top-right', duration: 100 });
        t.show('b', { position: 'top-right', duration: 100 });
        // two toasts share a single container
        const containers = document.body.children.length;
        expect(containers).toBe(1);
        vi.advanceTimersByTime(400);
        // container removed once empty
        expect(document.body.children.length).toBe(0);
    });
});
