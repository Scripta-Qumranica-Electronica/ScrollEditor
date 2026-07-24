import { describe, it, expect } from 'vitest';
import ZoomToolbox from '@/components/toolbars/zoom-toolbox.vue';
import { mountComponent } from './helpers/mount';

// Component-mount unit test for zoom-toolbox. `toolbox` and the b-* form controls
// are stubbed so mount succeeds; we exercise the zoom getter/setter, zoomClick
// clamping (both directions + over/under bounds), canZoomIn/canZoomOut and
// onReset, asserting the emitted update:modelValue / zoomChanged events.

function mountZoom(props: Record<string, any> = {}) {
    return mountComponent(ZoomToolbox, {
        props: { modelValue: 0.5, ...props },
        stubs: {
            toolbox: true,
            'b-button-group': true,
            'b-form-input': true,
            'b-button': true,
        },
    });
}

function lastEmit(w: any, name: string) {
    const events = w.emitted(name) as any[];
    return events[events.length - 1][0];
}

describe('zoom-toolbox', () => {
    it('zoom getter converts fraction to percent', () => {
        const w = mountZoom({ modelValue: 0.25 });
        expect(w.vm.zoom).toBe(25);
    });

    it('zoom setter converts percent to fraction and emits both events', () => {
        const w = mountZoom({ modelValue: 0.5 });
        (w.vm as any).zoom = 80;
        expect(lastEmit(w, 'update:modelValue')).toBeCloseTo(0.8);
        expect(lastEmit(w, 'zoomChanged')).toBeCloseTo(0.8);
    });

    it('zoom setter treats falsy value as 10%', () => {
        const w = mountZoom({ modelValue: 0.5 });
        (w.vm as any).zoom = 0;
        expect(lastEmit(w, 'update:modelValue')).toBeCloseTo(0.1);
    });

    it('zoomClick increments within bounds', () => {
        const w = mountZoom({ modelValue: 0.5 });
        w.vm.zoomClick(0.05);
        expect(lastEmit(w, 'zoomChanged')).toBeCloseTo(0.55);
    });

    it('zoomClick clamps above 1 to 1', () => {
        const w = mountZoom({ modelValue: 0.99 });
        w.vm.zoomClick(0.5);
        expect(lastEmit(w, 'zoomChanged')).toBe(1);
    });

    it('zoomClick clamps below 0 to 0.01', () => {
        const w = mountZoom({ modelValue: 0.01 });
        w.vm.zoomClick(-0.5);
        expect(lastEmit(w, 'zoomChanged')).toBe(0.01);
    });

    it('canZoomIn true below 1, false at 1', () => {
        expect(mountZoom({ modelValue: 0.5 }).vm.canZoomIn).toBe(true);
        expect(mountZoom({ modelValue: 1 }).vm.canZoomIn).toBe(false);
    });

    it('canZoomOut true above 0, false at 0', () => {
        expect(mountZoom({ modelValue: 0.5 }).vm.canZoomOut).toBe(true);
        expect(mountZoom({ modelValue: 0 }).vm.canZoomOut).toBe(false);
    });

    it('onReset sets zoom to 100% (=1)', () => {
        const w = mountZoom({ modelValue: 0.5 });
        w.vm.onReset();
        expect(lastEmit(w, 'update:modelValue')).toBeCloseTo(1);
    });
});
