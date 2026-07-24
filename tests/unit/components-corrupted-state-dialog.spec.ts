import { describe, it, expect, vi } from 'vitest';

// Component-mount unit test for corrupted-state-dialog. b-modal/b-button are
// stubbed so mount succeeds; we exercise show() and reloadPage() (which flips
// visibility and calls $router.go(0)).

import CorruptedStateDialog from '@/components/misc/CorruptedStateDialog.vue';
import { mountComponent } from './helpers/mount';

function mountDialog() {
    const router = { go: vi.fn() };
    // Render the modal/button slots (non-`true` stubs) so the template's
    // reloadPage() binding is instrumented, then force it visible.
    const w = mountComponent(CorruptedStateDialog, {
        mocks: { $router: router },
        stubs: {
            'b-modal': { template: '<div><slot /><slot name="footer" /></div>' },
            'b-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
        },
    });
    w.vm.isVisible = true;
    return { w, router };
}

describe('corrupted-state-dialog', () => {
    it('show() makes the dialog visible', () => {
        const { w } = mountDialog();
        w.vm.isVisible = false;
        w.vm.show();
        expect(w.vm.isVisible).toBe(true);
    });

    it('reloadPage() hides the dialog and reloads via router.go(0)', () => {
        const { w, router } = mountDialog();
        w.vm.reloadPage();
        expect(w.vm.isVisible).toBe(false);
        expect(router.go).toHaveBeenCalledWith(0);
    });
});
