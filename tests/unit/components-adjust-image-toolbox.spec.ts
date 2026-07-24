import { describe, it, expect } from 'vitest';

// Component-mount unit test for adjust-image-toolbox. Exercises onImageSettingChanged
// which re-emits the child's image-setting-changed event up to the parent toolbar.

import AdjustImageToolbox from '@/components/toolbars/adjust-image-toolbox.vue';
import { mountComponent } from './helpers/mount';

function mountBox() {
    return mountComponent(AdjustImageToolbox, {
        props: {
            subject: 'Adjust',
            imageStack: { availableImageTypes: [] },
            params: { imageSettings: {} },
        },
        stubs: {
            toolbox: true, 'b-button': true, 'b-popover': true, 'image-settings': true,
        },
    });
}

describe('adjust-image-toolbox', () => {
    it('onImageSettingChanged re-emits image-setting-changed with the payload', () => {
        const w = mountBox();
        const payload = { type: 'master', visible: true, opacity: 1 };
        w.vm.onImageSettingChanged(payload as any);
        expect(w.emitted('image-setting-changed')![0][0]).toStrictEqual(payload);
    });
});
