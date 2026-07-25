import { describe, it, expect, vi, beforeEach } from 'vitest';

// Component-mount unit test for the Registration modal. Mocks SessionService
// (network) and $toasted; exercises the disabledReg / identicalError validation
// getters and the register() submit handler (success + error branches).

const { register, showModal, registerModalListener, dispose } = vi.hoisted(() => {
    const dispose = vi.fn();
    return {
        register: vi.fn().mockResolvedValue({}),
        showModal: vi.fn(),
        dispose,
        registerModalListener: vi.fn((_id: string, _onShow: () => void, _onHide: () => void) => dispose),
    };
});
vi.mock('@/services/session', () => ({
    default: vi.fn(function () { return { register }; }),
}));
vi.mock('@/utils/modal-bus', () => ({
    showModal,
    registerModalListener,
}));

import Registration from '@/views/user/Registration.vue';
import { mountComponent } from './helpers/mount';

function mountReg() {
    return mountComponent(Registration, {
        mocks: { $toasted: { show: vi.fn() } },
        stubs: {
            'b-modal': true, 'b-row': true, 'b-col': true, 'b-container': true,
            'b-form-input': true, 'b-form-checkbox': true, 'b-link': true,
            'b-button': true, 'font-awesome-icon': true,
        },
    });
}

describe('registration', () => {
    beforeEach(() => vi.clearAllMocks());

    it('disabledReg is true when fields empty, false when all valid', () => {
        const w = mountReg();
        expect(w.vm.disabledReg).toBe(true);

        w.vm.forename = 'A';
        w.vm.surname = 'B';
        w.vm.email = 'a@b.c';
        w.vm.password = 'pw';
        w.vm.repassword = 'pw';
        w.vm.termsOfUse = true;
        expect(w.vm.disabledReg).toBe(false);
    });

    it('disabledReg stays true when passwords mismatch or waiting', () => {
        const w = mountReg();
        w.vm.forename = 'A';
        w.vm.surname = 'B';
        w.vm.email = 'a@b.c';
        w.vm.password = 'pw';
        w.vm.repassword = 'different';
        w.vm.termsOfUse = true;
        expect(w.vm.disabledReg).toBe(true);

        w.vm.repassword = 'pw';
        w.vm.waiting = true;
        expect(w.vm.disabledReg).toBe(true);
    });

    it('identicalError reflects mismatched passwords', () => {
        const w = mountReg();
        expect(w.vm.identicalError).toBe('');
        w.vm.password = 'pw';
        w.vm.repassword = 'other';
        expect(w.vm.identicalError).toBe('Passwords must be identical');
        w.vm.repassword = 'pw';
        expect(w.vm.identicalError).toBe('');
    });

    it('show() opens the modal; showTermsOfUse() opens the EULA modal', () => {
        const w = mountReg();
        w.vm.show();
        expect(w.vm.modalVisible).toBe(true);
        w.vm.showTermsOfUse();
        expect(showModal).toHaveBeenCalledWith('EulaModal');
    });

    it('register() calls the service, toasts, and closes on success', async () => {
        const w = mountReg();
        w.vm.forename = 'A';
        w.vm.surname = 'B';
        w.vm.email = 'a@b.c';
        w.vm.password = 'pw';
        w.vm.modalVisible = true;
        await w.vm.register();

        expect(register).toHaveBeenCalledTimes(1);
        expect((w.vm as any).$toasted.show).toHaveBeenCalled();
        expect(w.vm.waiting).toBe(false);
        expect(w.vm.modalVisible).toBe(false);
    });

    it('register() sets errorMessage on service failure', async () => {
        register.mockRejectedValueOnce({ response: { data: { msg: 'boom' } } });
        const w = mountReg();
        await w.vm.register();

        expect(w.vm.errorMessage).toContain('boom');
        expect(w.vm.waiting).toBe(false);
        expect(w.vm.modalVisible).toBe(false);
    });

    it('mounted registers a modal listener whose callbacks toggle visibility', () => {
        const w = mountReg();
        expect(registerModalListener).toHaveBeenCalledWith(
            'registerModal', expect.any(Function), expect.any(Function)
        );
        const [, onShow, onHide] = registerModalListener.mock.calls[0];
        onShow();
        expect(w.vm.modalVisible).toBe(true);
        onHide();
        expect(w.vm.modalVisible).toBe(false);
    });

    it('beforeUnmount disposes the modal listener', () => {
        const w = mountReg();
        w.unmount();
        expect(dispose).toHaveBeenCalledTimes(1);
    });
});
