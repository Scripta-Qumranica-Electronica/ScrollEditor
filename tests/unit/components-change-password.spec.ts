import { describe, it, expect, vi, beforeEach } from 'vitest';

// Component-mount unit test for ChangePassword. Mocks SessionService, router and
// $toasted; exercises disableChange / identicalError getters and change()
// (success + error branches).

const { changePassword, routerPush } = vi.hoisted(() => ({
    changePassword: vi.fn().mockResolvedValue({}),
    routerPush: vi.fn(),
}));
vi.mock('@/services/session', () => ({
    default: vi.fn(function () { return { changePassword }; }),
}));
vi.mock('@/router', () => ({ default: { push: routerPush } }));

import ChangePassword from '@/views/user/ChangePassword.vue';
import { mountComponent } from './helpers/mount';

function mountCP() {
    return mountComponent(ChangePassword, {
        mocks: { $toasted: { show: vi.fn() } },
        stubs: {
            'b-row': true, 'b-col': true, 'b-form-input': true,
            'b-button': true, 'font-awesome-icon': true,
        },
    });
}

describe('change-password', () => {
    beforeEach(() => vi.clearAllMocks());

    it('disableChange true when empty / mismatched, false when valid', () => {
        const w = mountCP();
        expect(w.vm.disableChange).toBe(true);

        w.vm.currentPassword = 'cur';
        w.vm.newPassword = 'new';
        w.vm.rePassword = 'nope';
        expect(w.vm.disableChange).toBe(true);

        w.vm.rePassword = 'new';
        expect(w.vm.disableChange).toBe(false);

        w.vm.waiting = true;
        expect(w.vm.disableChange).toBe(true);
    });

    it('identicalError reflects mismatched new passwords', () => {
        const w = mountCP();
        expect(w.vm.identicalError).toBe('');
        w.vm.newPassword = 'a';
        w.vm.rePassword = 'b';
        expect(w.vm.identicalError).toBe('Passwords must be identical');
        w.vm.rePassword = 'a';
        expect(w.vm.identicalError).toBe('');
    });

    it('change() calls service, routes home and toasts on success', async () => {
        const w = mountCP();
        w.vm.currentPassword = 'cur';
        w.vm.newPassword = 'new';
        w.vm.rePassword = 'new';
        await w.vm.change();

        expect(changePassword).toHaveBeenCalledTimes(1);
        expect(routerPush).toHaveBeenCalledWith('/');
        expect((w.vm as any).$toasted.show).toHaveBeenCalled();
        expect(w.vm.waiting).toBe(false);
    });

    it('change() sets errorMessage on failure', async () => {
        changePassword.mockRejectedValueOnce({ response: { data: { msg: 'wrong' } } });
        const w = mountCP();
        w.vm.currentPassword = 'cur';
        w.vm.newPassword = 'new';
        w.vm.rePassword = 'new';
        await w.vm.change();

        expect(w.vm.errorMessage).toContain('wrong');
        expect(w.vm.waiting).toBe(false);
    });
});
