import { describe, it, expect, vi, beforeEach } from 'vitest';

// Component-mount unit test for welcome. Mocks the modal-bus, SessionService and
// the router singleton; exercises login/register (modal-bus), the userName /
// buildTime getters, and startWorking / logout (router + location.reload).

const { showModal, logout, routerPush } = vi.hoisted(() => ({
    showModal: vi.fn(),
    logout: vi.fn(),
    routerPush: vi.fn(),
}));
vi.mock('@/utils/modal-bus', () => ({ showModal }));
vi.mock('@/services/session', () => ({
    default: class { public logout = logout; },
}));
vi.mock('@/router', () => ({ default: { push: routerPush } }));

import Welcome from '@/components/welcome/welcome.vue';
import { mountComponent } from './helpers/mount';

function mountWelcome(user: any = null) {
    return mountComponent(Welcome, {
        state: { session: { user } },
        stubs: {
            'b-nav': true, 'b-nav-item': true, 'b-button': true,
            'b-link': true, 'router-link': true,
        },
    });
}

describe('welcome', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        delete document.documentElement.dataset.buildTime;
    });

    it('login() and register() open the corresponding modals', () => {
        const w = mountWelcome();
        w.vm.login();
        expect(showModal).toHaveBeenCalledWith('loginModal');
        w.vm.register();
        expect(showModal).toHaveBeenCalledWith('registerModal');
    });

    it('userName is undefined when logged out', () => {
        expect(mountWelcome(null).vm.userName).toBeUndefined();
    });

    it('userName joins forename and surname when logged in', () => {
        const w = mountWelcome({ forename: 'Ada', surname: 'Lovelace' });
        expect(w.vm.userName).toBe('Ada Lovelace');
    });

    it('startWorking pushes /home', () => {
        const w = mountWelcome();
        w.vm.startWorking();
        expect(routerPush).toHaveBeenCalledWith('/home');
    });

    it('logout logs out, navigates home and reloads', () => {
        const reload = vi.fn();
        const original = window.location;
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { ...original, reload },
        });
        const w = mountWelcome({ forename: 'A', surname: 'B' });
        w.vm.logout();
        expect(logout).toHaveBeenCalledTimes(1);
        expect(routerPush).toHaveBeenCalledWith('/');
        expect(reload).toHaveBeenCalledTimes(1);
        Object.defineProperty(window, 'location', { configurable: true, value: original });
    });

    it('buildTime returns N/A without a data-build-time attribute', () => {
        expect(mountWelcome().vm.buildTime).toBe('N/A');
    });

    it('buildTime returns the first 10 chars (the date) when present', () => {
        document.documentElement.dataset.buildTime = '2026-07-24T13:00:00Z';
        expect(mountWelcome().vm.buildTime).toBe('2026-07-24');
    });
});
