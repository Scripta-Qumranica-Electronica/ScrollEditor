import { describe, it, expect, vi, beforeEach } from 'vitest';

const { showModal, confirmAddEditionEditor, getErrorMessage, routerPush } = vi.hoisted(() => ({
    showModal: vi.fn(),
    confirmAddEditionEditor: vi.fn().mockResolvedValue(undefined),
    getErrorMessage: vi.fn().mockReturnValue('boom'),
    routerPush: vi.fn(),
}));

vi.mock('@/utils/modal-bus', () => ({ showModal }));
vi.mock('@/services/edition', () => ({ default: class { public confirmAddEditionEditor = confirmAddEditionEditor; } }));
vi.mock('@/services/error', () => ({ default: class { public getErrorMessage = getErrorMessage; } }));
vi.mock('@/router', () => ({ default: { push: routerPush } }));

import ConfirmInvitation from '@/views/edition/components/confirm-invitation.vue';
import { mountComponent } from './helpers/mount';

function mountView(opts: { user?: any; href?: string } = {}) {
    const user = 'user' in opts ? opts.user : { id: 1 };
    const state = { session: { user } };
    window.history.replaceState({}, '', opts.href ?? '/confirm/token/ABC123');
    const w = mountComponent(ConfirmInvitation, {
        state,
        stubs: { 'b-row': true, 'b-col': true, 'b-button': true, 'font-awesome-icon': true },
    });
    return { w, state };
}

describe('confirm-invitation', () => {
    beforeEach(() => vi.clearAllMocks());

    it('isLogged / currentUser reflect the session', () => {
        expect(mountView({ user: { id: 5 } }).w.vm.isLogged).toBe(true);
        expect(mountView({ user: null }).w.vm.isLogged).toBe(false);
    });

    it('mounted extracts the token from the URL', () => {
        const { w } = mountView({ href: '/x/token/TOK-9' });
        expect(w.vm.token).toBe('TOK-9');
    });

    it('mounted opens the login modal when the user is not logged in', () => {
        mountView({ user: null });
        expect(showModal).toHaveBeenCalledWith('loginModal');
    });

    it('mounted does not open the login modal when logged in', () => {
        mountView({ user: { id: 1 } });
        expect(showModal).not.toHaveBeenCalled();
    });

    it('mounted logs an error when the URL carries no token', () => {
        const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        mountView({ href: '/x/token/' });
        expect(err).toHaveBeenCalled();
        err.mockRestore();
    });

    it('change confirms the invitation and navigates home', async () => {
        const { w } = mountView({ href: '/x/token/GO' });
        await w.vm.change();
        expect(confirmAddEditionEditor).toHaveBeenCalledWith('GO');
        expect(routerPush).toHaveBeenCalledWith('/');
        expect(w.vm.waiting).toBe(false);
    });

    it('change surfaces the error message and clears waiting on failure', async () => {
        confirmAddEditionEditor.mockRejectedValueOnce({ response: { data: { code: 1 } } });
        const { w } = mountView({ href: '/x/token/BAD' });
        await w.vm.change();
        expect(getErrorMessage).toHaveBeenCalledWith({ code: 1 });
        expect(w.vm.errorMessage).toBe('boom');
        expect(w.vm.waiting).toBe(false);
    });
});
