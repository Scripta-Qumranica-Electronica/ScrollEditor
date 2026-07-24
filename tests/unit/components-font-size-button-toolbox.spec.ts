import { describe, it, expect, beforeEach, vi } from 'vitest';
import FontSizeButtonToolbox from '@/components/toolbars/font-size-button-toolbox.vue';
import { mountComponent } from './helpers/mount';

// Component-mount unit test for font-size-button-toolbox. `toolbox` is stubbed;
// toolbar-icon-button is stubbed by the helper. Exercises canFontSizePlus /
// canFontSizeMinus at the limits, fontSizeChanged in both directions, and that
// onFontSizeChanged persists to localStorage and emits both event names.

function mountFs(props: Record<string, any> = {}) {
    return mountComponent(FontSizeButtonToolbox, {
        props: { modelValue: 20, ...props },
        stubs: { toolbox: true },
    });
}

function lastEmit(w: any, name: string) {
    const events = w.emitted(name) as any[];
    return events[events.length - 1][0];
}

describe('font-size-button-toolbox', () => {
    beforeEach(() => localStorage.clear());

    it('canFontSizePlus true mid-range, false near max', () => {
        expect(mountFs({ modelValue: 20 }).vm.canFontSizePlus).toBe(true);
        // 39 + 2 = 41 > 40 max => false
        expect(mountFs({ modelValue: 39 }).vm.canFontSizePlus).toBe(false);
        expect(mountFs({ modelValue: 40 }).vm.canFontSizePlus).toBe(false);
    });

    it('canFontSizeMinus true mid-range, false near min', () => {
        expect(mountFs({ modelValue: 20 }).vm.canFontSizeMinus).toBe(true);
        // 11 - 2 = 9 < 10 min => false
        expect(mountFs({ modelValue: 11 }).vm.canFontSizeMinus).toBe(false);
        expect(mountFs({ modelValue: 10 }).vm.canFontSizeMinus).toBe(false);
    });

    it('fontSizeChanged increases by delta and emits both events', () => {
        const w = mountFs({ modelValue: 20, delta: 2 });
        w.vm.fontSizeChanged(2);
        expect(lastEmit(w, 'update:modelValue')).toBe(22);
        expect(lastEmit(w, 'fontSizeChanged')).toBe(22);
    });

    it('fontSizeChanged decreases by delta', () => {
        const w = mountFs({ modelValue: 20, delta: 2 });
        w.vm.fontSizeChanged(-2);
        expect(lastEmit(w, 'update:modelValue')).toBe(18);
    });

    it('onFontSizeChanged persists to localStorage', () => {
        const spy = vi.spyOn(localStorage, 'setItem');
        const w = mountFs({ modelValue: 20 });
        w.vm.onFontSizeChanged(24);
        expect(spy).toHaveBeenCalledWith('font-size', '24');
        expect(localStorage.getItem('font-size')).toBe('24');
        spy.mockRestore();
    });
});
