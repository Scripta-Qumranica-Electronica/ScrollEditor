import { describe, it, expect, vi, beforeEach } from 'vitest';

// Component-mount unit test for Eula-modal. The modal-bus registration is mocked
// so we can capture and drive the onShow/onHide callbacks; also checks show()
// and that beforeUnmount disposes the listener.

const { registerModalListener, dispose } = vi.hoisted(() => {
    const dispose = vi.fn();
    return {
        dispose,
        registerModalListener: vi.fn(() => dispose),
    };
});
vi.mock('@/utils/modal-bus', () => ({ registerModalListener }));

import EulaModal from '@/components/navigation/Eula-modal.vue';
import { mountComponent } from './helpers/mount';

function mountEula() {
    return mountComponent(EulaModal, {
        stubs: { 'b-modal': true, 'b-row': true, 'b-col': true, 'b-container': true },
    });
}

describe('Eula-modal', () => {
    beforeEach(() => vi.clearAllMocks());

    it('registers a modal listener for EulaModal on mount', () => {
        mountEula();
        expect(registerModalListener).toHaveBeenCalledWith(
            'EulaModal', expect.any(Function), expect.any(Function)
        );
    });

    it('the registered onShow/onHide callbacks toggle visibility', () => {
        const w = mountEula();
        const [, onShow, onHide] = registerModalListener.mock.calls[0];
        expect(w.vm.visible).toBe(false);
        onShow();
        expect(w.vm.visible).toBe(true);
        onHide();
        expect(w.vm.visible).toBe(false);
    });

    it('show() sets visible to true', () => {
        const w = mountEula();
        w.vm.show();
        expect(w.vm.visible).toBe(true);
    });

    it('beforeUnmount disposes the registered listener', () => {
        const w = mountEula();
        w.unmount();
        expect(dispose).toHaveBeenCalledTimes(1);
    });
});
