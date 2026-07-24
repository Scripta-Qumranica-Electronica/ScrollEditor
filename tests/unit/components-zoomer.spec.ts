import { describe, it, expect, vi } from 'vitest';
import Zoomer from '@/components/misc/zoomer.vue';

// Unit test for the zoomer component's behaviour.
//
// NOTE: zoomer.vue renders a bare `<slot>` in its own root element. Under this
// project's `@vue/compat` (MODE 2) + `vue-facing-decorator` setup, mounting it
// crashes inside compat's SSR-optimized `renderSlot` ("Cannot read properties
// of null (reading 'ce')") because `currentRenderingInstance` is null — a known
// compat/decorator incompatibility unrelated to this component's logic. So we
// exercise the component's own handlers (onWheel / applyZoom / onPinch /
// onRotate — the ~17 uncovered lines) directly against the compiled options'
// `methods`, with a mock `this` that supplies `zoom`, `zoomTarget` and spies on
// the @Emit-generated `newZoom` / `newRotate`.

const methods = (Zoomer as any).methods as Record<string, (...a: any[]) => any>;

function makeTarget() {
    // Stand-in for `this.zoomTarget` (the scroll container). Deterministic
    // geometry + writable scroll offsets so applyZoom's scroll math runs.
    return {
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
        scrollLeft: 0,
        scrollTop: 0,
    };
}

function makeCtx(zoom: number) {
    const target = makeTarget();
    const ctx: any = {
        zoom,
        degel: false,
        zoomTarget: target,
        // @Emit wrappers — spied so we can assert emitted values.
        newZoom: vi.fn((z: number) => ({ zoom: z })),
        newRotate: vi.fn((r: number) => ({ rotate: r })),
    };
    // Bind the real methods to the ctx so `this` resolves.
    ctx.onWheel = methods.onWheel.bind(ctx);
    ctx.applyZoom = methods.applyZoom.bind(ctx);
    ctx.onPinch = methods.onPinch.bind(ctx);
    ctx.onRotate = methods.onRotate.bind(ctx);
    return ctx;
}

describe('zoomer', () => {
    it('exposes the expected handler methods', () => {
        expect(typeof methods.onWheel).toBe('function');
        expect(typeof methods.applyZoom).toBe('function');
        expect(typeof methods.onPinch).toBe('function');
        expect(typeof methods.onRotate).toBe('function');
    });

    it('onWheel ignores events without ctrlKey (guard)', () => {
        const ctx = makeCtx(0.5);
        const preventDefault = vi.fn();
        ctx.onWheel({ ctrlKey: false, deltaY: -10, preventDefault });
        expect(preventDefault).not.toHaveBeenCalled();
        expect(ctx.newZoom).not.toHaveBeenCalled();
    });

    it('onWheel wheel-up (ctrl) zooms in', () => {
        const ctx = makeCtx(0.5);
        const preventDefault = vi.fn();
        ctx.onWheel({ ctrlKey: true, deltaY: -10, clientX: 5, clientY: 5, preventDefault });
        expect(preventDefault).toHaveBeenCalled();
        expect(ctx.newZoom).toHaveBeenCalledTimes(1);
        expect(ctx.newZoom.mock.calls[0][0]).toBeCloseTo(0.51);
    });

    it('onWheel wheel-down (ctrl) zooms out', () => {
        const ctx = makeCtx(0.5);
        ctx.onWheel({ ctrlKey: true, deltaY: 10, clientX: 5, clientY: 5, preventDefault: vi.fn() });
        expect(ctx.newZoom.mock.calls[0][0]).toBeCloseTo(0.49);
    });

    it('applyZoom clamps to max 1 (no emit when unchanged)', () => {
        const ctx = makeCtx(1);
        ctx.applyZoom(0.5, { x: 10, y: 10 });
        expect(ctx.newZoom).not.toHaveBeenCalled();
    });

    it('applyZoom clamps to min 0.05 (no emit when unchanged)', () => {
        const ctx = makeCtx(0.05);
        ctx.applyZoom(-0.5, { x: 10, y: 10 });
        expect(ctx.newZoom).not.toHaveBeenCalled();
    });

    it('applyZoom is a no-op when degel is set', () => {
        const ctx = makeCtx(0.5);
        ctx.degel = true;
        ctx.applyZoom(0.01, { x: 10, y: 10 });
        expect(ctx.newZoom).not.toHaveBeenCalled();
    });

    it('applyZoom updates scroll offsets to keep the point in place', () => {
        const ctx = makeCtx(0.5);
        ctx.applyZoom(0.1, { x: 100, y: 50 });
        // newZoom = 0.6; newPos = pos * 0.6/0.5 = 1.2x; delta = +0.2x
        expect(ctx.newZoom.mock.calls[0][0]).toBeCloseTo(0.6);
        expect(ctx.zoomTarget.scrollLeft).toBeCloseTo(20);
        expect(ctx.zoomTarget.scrollTop).toBeCloseTo(10);
    });

    it('onPinch zooms out on pinchin', () => {
        const ctx = makeCtx(0.5);
        ctx.onPinch({ additionalEvent: 'pinchin', center: { x: 5, y: 5 } });
        expect(ctx.newZoom.mock.calls[0][0]).toBeCloseTo(0.49);
    });

    it('onPinch zooms in on pinchout', () => {
        const ctx = makeCtx(0.5);
        ctx.onPinch({ additionalEvent: 'pinchout', center: { x: 5, y: 5 } });
        expect(ctx.newZoom.mock.calls[0][0]).toBeCloseTo(0.51);
    });

    it('onRotate emits the event angle', () => {
        const ctx = makeCtx(0.5);
        ctx.onRotate({ angle: 42 });
        expect(ctx.newRotate).toHaveBeenCalledWith(42);
    });
});
