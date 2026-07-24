import { describe, it, expect, vi, beforeEach } from 'vitest';

// Component-mount unit test for the Login modal. Mocks SessionService, router,
// modal-bus and location.reload; exercises disabledLogin, login() (guard,
// success, error), shown(), and the forgotPassword()/register() nav helpers.

const { login, routerPush, showModal } = vi.hoisted(() => ({
    login: vi.fn().mockResolvedValue({}),
    routerPush: vi.fn(),
    showModal: vi.fn(),
}));
vi.mock('@/services/session', () => ({
    default: vi.fn(function () { return { login }; }),
}));
vi.mock('@/router', () => ({ default: { push: routerPush } }));
vi.mock('@/utils/modal-bus', () => ({
    showModal,
    registerModalListener: vi.fn(() => vi.fn()),
}));

import Login from '@/components/navigation/Login.vue';
import { mountComponent } from './helpers/mount';

function mountLogin() {
    return mountComponent(Login, {
        stubs: {
            'b-modal': true, 'b-row': true, 'b-col': true, 'b-container': true,
            'b-form-input': true, 'b-button': true, 'b-link': true,
            'font-awesome-icon': true, 'forgot-password': true, 'ForgotPassword': true,
        },
    });
}

describe('login', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // location.reload is called on successful login
        Object.defineProperty(window, 'location', {
            value: { reload: vi.fn() },
            writable: true,
        });
    });

    it('disabledLogin true without credentials / while waiting, false when both set', () => {
        const w = mountLogin();
        expect(w.vm.disabledLogin).toBe(true);
        w.vm.email = 'a@b.c';
        expect(w.vm.disabledLogin).toBe(true);
        w.vm.password = 'pw';
        expect(w.vm.disabledLogin).toBe(false);
        w.vm.waiting = true;
        expect(w.vm.disabledLogin).toBe(true);
    });

    it('login() returns early when disabled (no service call)', async () => {
        const w = mountLogin();
        await w.vm.login();
        expect(login).not.toHaveBeenCalled();
    });

    it('login() authenticates, hides modal, routes and reloads on success', async () => {
        const w = mountLogin();
        w.vm.email = 'a@b.c';
        w.vm.password = 'pw';
        w.vm.visible = true;
        await w.vm.login();

        expect(login).toHaveBeenCalledWith('a@b.c', 'pw');
        expect(w.vm.visible).toBe(false);
        expect(routerPush).toHaveBeenCalledWith('/home');
        expect(window.location.reload).toHaveBeenCalled();
        expect(w.vm.waiting).toBe(false);
    });

    it('login() sets errorMessage on failure', async () => {
        login.mockRejectedValueOnce({ response: { data: { msg: 'denied' } } });
        const w = mountLogin();
        w.vm.email = 'a@b.c';
        w.vm.password = 'pw';
        await w.vm.login();

        expect(w.vm.errorMessage).toContain('denied');
        expect(w.vm.waiting).toBe(false);
    });

    it('show() and shown() manage modal state', async () => {
        const w = mountLogin();
        w.vm.show();
        expect(w.vm.visible).toBe(true);
        w.vm.errorMessage = 'x';
        w.vm.waiting = true;
        w.vm.shown();
        expect(w.vm.errorMessage).toBe('');
        expect(w.vm.waiting).toBe(false);
    });

    it('forgotPassword() and register() hide login and open sibling modals', () => {
        const w = mountLogin();
        w.vm.visible = true;
        w.vm.forgotPassword();
        expect(w.vm.visible).toBe(false);
        expect(showModal).toHaveBeenCalledWith('passwordModal');

        w.vm.visible = true;
        w.vm.register();
        expect(w.vm.visible).toBe(false);
        expect(showModal).toHaveBeenCalledWith('registerModal');
    });
});
