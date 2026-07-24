import { describe, it, expect, vi, beforeEach } from 'vitest';

// Component-mount unit test for ForgotPassword. Mocks SessionService and
// $toasted; exercises disabledSubmit, submit() (guard, success, error) and the
// show()/close()/shown() helpers.

const { forgotPassword } = vi.hoisted(() => ({
    forgotPassword: vi.fn().mockResolvedValue({}),
}));
vi.mock('@/services/session', () => ({
    default: vi.fn(function () { return { forgotPassword }; }),
}));
vi.mock('@/utils/modal-bus', () => ({
    registerModalListener: vi.fn(() => vi.fn()),
}));

import ForgotPassword from '@/views/user/ForgotPassword.vue';
import { mountComponent } from './helpers/mount';

function mountFP() {
    return mountComponent(ForgotPassword, {
        mocks: { $toasted: { show: vi.fn() } },
        stubs: {
            'b-modal': true, 'b-row': true, 'b-col': true, 'b-container': true,
            'b-form-input': true, 'b-button': true, 'font-awesome-icon': true,
        },
    });
}

describe('forgot-password', () => {
    beforeEach(() => vi.clearAllMocks());

    it('disabledSubmit true without email / while waiting, false when email set', () => {
        const w = mountFP();
        expect(w.vm.disabledSubmit).toBe(true);
        w.vm.email = 'a@b.c';
        expect(w.vm.disabledSubmit).toBe(false);
        w.vm.waiting = true;
        expect(w.vm.disabledSubmit).toBe(true);
    });

    it('submit() returns early when disabled (no service call)', async () => {
        const w = mountFP();
        await w.vm.submit();
        expect(forgotPassword).not.toHaveBeenCalled();
    });

    it('submit() calls the service, closes and toasts on success', async () => {
        const w = mountFP();
        w.vm.email = 'a@b.c';
        w.vm.modalVisible = true;
        await w.vm.submit();

        expect(forgotPassword).toHaveBeenCalledWith('a@b.c');
        expect(w.vm.modalVisible).toBe(false);
        expect((w.vm as any).$toasted.show).toHaveBeenCalled();
        expect(w.vm.waiting).toBe(false);
    });

    it('submit() sets errorMessage on failure', async () => {
        forgotPassword.mockRejectedValueOnce({ response: { data: { msg: 'bad' } } });
        const w = mountFP();
        w.vm.email = 'a@b.c';
        await w.vm.submit();

        expect(w.vm.errorMessage).toContain('bad');
        expect(w.vm.waiting).toBe(false);
    });

    it('show()/close() toggle the modal', () => {
        const w = mountFP();
        w.vm.show();
        expect(w.vm.modalVisible).toBe(true);
        w.vm.close();
        expect(w.vm.modalVisible).toBe(false);
    });

    it('shown() resets state and focuses the email input', () => {
        const w = mountFP();
        const focus = vi.fn();
        // Populate the internal refs record that this.$refs reads from.
        (w.vm.$ as any).refs = { emailRef: { focus } };
        w.vm.errorMessage = 'x';
        w.vm.waiting = true;
        w.vm.shown();
        expect(w.vm.errorMessage).toBe('');
        expect(w.vm.waiting).toBe(false);
        expect(focus).toHaveBeenCalled();
    });
});
