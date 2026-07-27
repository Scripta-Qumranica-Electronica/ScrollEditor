import { describe, it, expect, vi } from 'vitest';
import Zoomer from '@/components/misc/zoomer.vue';

// Unit test for the zoomer component's behaviour.
//
// NOTE: zoomer.vue renders a bare `<slot>` in its own root element. Under this
// project's `@vue/compat` (MODE 2) + `vue-facing-decorator` setup, mounting it
// crashes inside compat's SSR-optimized `renderSlot` ("Cannot read properties
// of null (reading 'ce')") because `currentRenderingInstance` is null — a known
// compat/decorator incompatibility unrelated to this component's logic. So we
// exercise the component's own handlers (onWheel / applyZoom and the pointer
// pinch/rotate handlers) directly against the compiled options' `methods`, with
// a mock `this` that supplies `zoom`, `angle`, the pointer state, `zoomTarget`
// and spies on the @Emit-generated `newZoom` / `newRotate`.

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

function makeCtx(zoom: number, angle = 0) {
    const target = makeTarget();
    const ctx: any = {
        zoom,
        angle,
        degel: false,
        zoomTarget: target,
        // Pointer-gesture instance state (class fields on the real component).
        pointers: new Map<number, { x: number; y: number }>(),
        gestureStartDist: 0,
        gestureStartAngle: 0,
        gestureStartRotation: 0,
        lastDist: 0,
        // @Emit wrappers — spied so we can assert emitted values.
        newZoom: vi.fn((z: number) => ({ zoom: z })),
        newRotate: vi.fn((r: number) => ({ rotate: r })),
    };
    // Bind the real methods to the ctx so `this` resolves.
    for (const m of ['onWheel', 'applyZoom', 'onPointerDown', 'onPointerMove', 'onPointerEnd', 'distance', 'lineAngle']) {
        ctx[m] = methods[m].bind(ctx);
    }
    return ctx;
}

const touch = (over: Record<string, unknown>) => ({ pointerType: 'touch', preventDefault: vi.fn(), ...over });

describe('zoomer', () => {
    it('exposes the expected handler methods', () => {
        expect(typeof methods.onWheel).toBe('function');
        expect(typeof methods.applyZoom).toBe('function');
        expect(typeof methods.onPointerDown).toBe('function');
        expect(typeof methods.onPointerMove).toBe('function');
        expect(typeof methods.onPointerEnd).toBe('function');
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

    it('ignores mouse pointers (the wheel handles the mouse)', () => {
        const ctx = makeCtx(0.5);
        ctx.onPointerDown({ pointerType: 'mouse', pointerId: 1, clientX: 0, clientY: 0 });
        expect(ctx.pointers.size).toBe(0);
    });

    it('two-finger spread (pinch-out) zooms in', () => {
        const ctx = makeCtx(0.5);
        ctx.onPointerDown(touch({ pointerId: 1, clientX: 0, clientY: 0 }));
        ctx.onPointerDown(touch({ pointerId: 2, clientX: 10, clientY: 0 })); // start dist 10
        ctx.onPointerMove(touch({ pointerId: 2, clientX: 12, clientY: 0 })); // dist 12 -> zoom in
        expect(ctx.newZoom).toHaveBeenCalled();
        expect(ctx.newZoom.mock.calls[0][0]).toBeGreaterThan(0.5);
    });

    it('two-finger pinch (pinch-in) zooms out', () => {
        const ctx = makeCtx(0.5);
        ctx.onPointerDown(touch({ pointerId: 1, clientX: 0, clientY: 0 }));
        ctx.onPointerDown(touch({ pointerId: 2, clientX: 10, clientY: 0 }));
        ctx.onPointerMove(touch({ pointerId: 2, clientX: 8, clientY: 0 })); // dist 8 -> zoom out
        expect(ctx.newZoom.mock.calls[0][0]).toBeLessThan(0.5);
    });

    it('rotating the two-finger line emits the new absolute angle', () => {
        const ctx = makeCtx(0.5, 30); // rotation starts at 30deg
        ctx.onPointerDown(touch({ pointerId: 1, clientX: 0, clientY: 0 }));
        ctx.onPointerDown(touch({ pointerId: 2, clientX: 10, clientY: 0 })); // line angle 0
        ctx.onPointerMove(touch({ pointerId: 2, clientX: 0, clientY: 10 })); // line angle +90 -> 30+90
        const calls = ctx.newRotate.mock.calls;
        expect(calls[calls.length - 1][0]).toBeCloseTo(120);
    });

    it('a single pointer does nothing (needs two fingers)', () => {
        const ctx = makeCtx(0.5);
        ctx.onPointerDown(touch({ pointerId: 1, clientX: 0, clientY: 0 }));
        ctx.onPointerMove(touch({ pointerId: 1, clientX: 50, clientY: 0 }));
        expect(ctx.newZoom).not.toHaveBeenCalled();
        expect(ctx.newRotate).not.toHaveBeenCalled();
    });
});
