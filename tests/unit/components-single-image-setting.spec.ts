import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Component-mount unit test for single-image-setting. Uses fake timers because
// the change handlers defer via setTimeout(...,0). Covers mounted() seeding the
// opacity string, onVisibleChange (emits change), and onOpacityInput in both
// branches (already visible / forced visible), plus the @Emit change payload.

import SingleImageSetting from '@/components/image-settings/SingleImageSetting.vue';
import { mountComponent } from './helpers/mount';

function mountSetting(settings: any) {
    return mountComponent(SingleImageSetting, {
        props: { type: 'master', settings },
        stubs: { 'b-form-checkbox': true, 'b-form-input': true },
    });
}

describe('single-image-setting', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('mounted() seeds the opacity string from the setting', () => {
        const w = mountSetting({ visible: true, opacity: 0.35 });
        expect(w.vm.opacity).toBe('0.35');
    });

    it('onVisibleChange emits change with the settings after the timeout', () => {
        const settings = { visible: true, opacity: 1 };
        const w = mountSetting(settings);
        w.vm.onVisibleChange();
        expect(w.emitted('change')).toBeFalsy();
        vi.runAllTimers();
        expect(w.emitted('change')![0][0]).toStrictEqual(settings);
    });

    it('onOpacityInput writes the parsed opacity back and emits change', () => {
        const settings = { visible: true, opacity: 1 };
        const w = mountSetting(settings);
        w.vm.opacity = '0.6';
        w.vm.onOpacityInput();
        vi.runAllTimers();
        expect(settings.opacity).toBe(0.6);
        expect(w.emitted('change')).toBeTruthy();
    });

    it('onOpacityInput forces visibility when moving the slider on a hidden image', () => {
        const settings = { visible: false, opacity: 0.2 };
        const w = mountSetting(settings);
        w.vm.opacity = '0.9';
        w.vm.onOpacityInput();
        expect(settings.visible).toBe(true);
        vi.runAllTimers();
        expect(settings.opacity).toBe(0.9);
    });

    it('change() emits the change event carrying the settings', () => {
        const settings = { visible: true, opacity: 1 };
        const w = mountSetting(settings);
        w.vm.change();
        expect(w.emitted('change')![0][0]).toStrictEqual(settings);
    });
});
