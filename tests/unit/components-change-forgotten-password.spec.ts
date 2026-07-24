import { describe, it, expect, vi, beforeEach } from 'vitest';

// Component-mount unit test for ChangeForgottenPassword. Mocks SessionService and
// router; exercises disableChange / identicalError getters and change() (success +
// service-reject branches).

const { changeForgottenPassword, routerPush } = vi.hoisted(() => ({
    changeForgottenPassword: vi.fn().mockResolvedValue({}),
    routerPush: vi.fn(),
}));
vi.mock('@/services/session', () => ({
    default: vi.fn(function () { return { changeForgottenPassword }; }),
}));
vi.mock('@/router', () => ({ default: { push: routerPush } }));

import ChangeForgottenPassword from '@/views/user/ChangeForgottenPassword.vue';
import { mountComponent } from './helpers/mount';

function mountCFP() {
    return mountComponent(ChangeForgottenPassword, {
        stubs: {
            'b-row': true, 'b-col': true, 'b-form-input': true,
            'b-button': true, 'font-awesome-icon': true,
        },
    });
}

describe('change-forgotten-password', () => {
    beforeEach(() => vi.clearAllMocks());

    it('disableChange true when empty / mismatched / waiting, false when valid', () => {
        const w = mountCFP();
        expect(w.vm.disableChange).toBe(true);

        w.vm.newPassword = 'new';
        w.vm.rePassword = 'nope';
        expect(w.vm.disableChange).toBe(true);

        w.vm.rePassword = 'new';
        expect(w.vm.disableChange).toBe(false);

        w.vm.waiting = true;
        expect(w.vm.disableChange).toBe(true);
    });

    it('identicalError reflects mismatched new passwords', () => {
        const w = mountCFP();
        expect(w.vm.identicalError).toBe('');
        w.vm.newPassword = 'a';
        w.vm.rePassword = 'b';
        expect(w.vm.identicalError).toBe('Passwords must be identical');
        w.vm.rePassword = 'a';
        expect(w.vm.identicalError).toBe('');
    });

    it('change() calls service with token+password and routes home on success', async () => {
        const w = mountCFP();
        w.vm.token = 'tok123';
        w.vm.newPassword = 'new';
        w.vm.rePassword = 'new';
        await w.vm.change();

        expect(changeForgottenPassword).toHaveBeenCalledTimes(1);
        const arg = changeForgottenPassword.mock.calls[0][0];
        expect(arg.token).toBe('tok123');
        expect(arg.password).toBe('new');
        expect(routerPush).toHaveBeenCalledWith('/');
        expect(w.vm.waiting).toBe(false);
    });

    it('change() sets errorMessage on service rejection', async () => {
        changeForgottenPassword.mockRejectedValueOnce({ response: { data: { msg: 'bad token' } } });
        const w = mountCFP();
        w.vm.token = 'tok';
        w.vm.newPassword = 'new';
        w.vm.rePassword = 'new';
        await w.vm.change();

        expect(w.vm.errorMessage).toContain('bad token');
        expect(routerPush).not.toHaveBeenCalled();
        expect(w.vm.waiting).toBe(false);
    });
});
