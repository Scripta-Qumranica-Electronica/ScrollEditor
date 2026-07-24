import { describe, it, expect } from 'vitest';

// Component-mount unit test for rotation-toolbox. Exercises onRotateClick (wraps
// into [0,360)), the rotationAngle getter/setter (normalization + falsy->0) and
// asserts the emitted update:modelValue events.

import RotationToolbox from '@/components/toolbars/rotation-toolbox.vue';
import { mountComponent } from './helpers/mount';

function mountBox(props: Record<string, any> = {}) {
    return mountComponent(RotationToolbox, {
        props: { modelValue: 0, ...props },
        stubs: { toolbox: true, 'b-button-group': true, 'b-form-input': true, 'rotate-button': true },
    });
}

function lastEmit(w: any, name: string) {
    const e = w.emitted(name) as any[];
    return e[e.length - 1][0];
}

describe('rotation-toolbox', () => {
    it('rotationAngle getter normalizes into [0,360)', () => {
        expect(mountBox({ modelValue: 370 }).vm.rotationAngle).toBe(10);
        expect(mountBox({ modelValue: -10 }).vm.rotationAngle).toBe(350);
    });

    it('onRotateClick adds a positive delta and emits the wrapped angle', () => {
        const w = mountBox({ modelValue: 350 });
        w.vm.onRotateClick(20);
        expect(lastEmit(w, 'update:modelValue')).toBe(10);
    });

    it('onRotateClick subtracts a negative delta with wraparound', () => {
        const w = mountBox({ modelValue: 10 });
        w.vm.onRotateClick(-20);
        expect(lastEmit(w, 'update:modelValue')).toBe(350);
    });

    it('rotationAngle setter normalizes and emits', () => {
        const w = mountBox({ modelValue: 0 });
        (w.vm as any).rotationAngle = 400;
        expect(lastEmit(w, 'update:modelValue')).toBe(40);
    });

    it('rotationAngle setter treats a falsy value as 0', () => {
        const w = mountBox({ modelValue: 45 });
        (w.vm as any).rotationAngle = 0;
        expect(lastEmit(w, 'update:modelValue')).toBe(0);
    });
});
