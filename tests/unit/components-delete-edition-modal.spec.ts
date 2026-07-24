import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const deleteEdition = vi.fn().mockResolvedValue(undefined);
const updateSharePermissions = vi.fn().mockResolvedValue(undefined);

vi.mock('@/services/edition', () => ({
    default: class {
        public deleteEdition = deleteEdition;
        public updateSharePermissions = updateSharePermissions;
    },
}));

import DeleteEditionModal from '@/views/edition/components/delete-edition-modal.vue';
import { mountComponent } from './helpers/mount';

function makeState(editionOver: any = {}) {
    return {
        editions: {
            current: {
                id: 7,
                name: 'Ed',
                permission: { isAdmin: false },
                shares: [],
                ...editionOver,
            },
            remove: vi.fn(),
        },
        session: { user: { email: 'me@x.com' } },
    };
}

function mountModal(editionOver: any = {}) {
    const toasted = { show: vi.fn() };
    const router = { push: vi.fn() };
    const state = makeState(editionOver);
    const w = mountComponent(DeleteEditionModal, {
        state,
        mocks: { $toasted: toasted, $router: router, $tc: (s: string) => s },
        stubs: {
            'b-modal': true, 'b-row': true, 'b-form-input': true, 'b-button': true,
        },
    });
    return { w, toasted, router, state };
}

describe('delete-edition-modal', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.restoreAllMocks());

    it('exposes currentEdition + currentUser getters and show()', () => {
        const { w } = mountModal();
        expect(w.vm.currentEdition.id).toBe(7);
        expect(w.vm.currentUser.email).toBe('me@x.com');
        w.vm.visible = false;
        w.vm.show();
        expect(w.vm.visible).toBe(true);
    });

    it('delete() removes edition, navigates home, toasts success', async () => {
        const { w, router, state, toasted } = mountModal();
        await w.vm.delete();
        expect(deleteEdition).toHaveBeenCalledWith(7, undefined);
        expect(state.editions.remove).toHaveBeenCalledWith(7);
        expect(router.push).toHaveBeenCalledWith('/home');
        expect(toasted.show).toHaveBeenCalled();
        expect(w.vm.deleting).toBe(false);
        expect(w.vm.visible).toBe(false);
    });

    it('delete() toasts error when the service rejects', async () => {
        deleteEdition.mockRejectedValueOnce(new Error('nope'));
        const { w, toasted } = mountModal();
        await w.vm.delete(true);
        expect(toasted.show).toHaveBeenCalled();
        expect(w.vm.deleting).toBe(false);
    });

    it('deleteEdition() throws when there is no current edition', async () => {
        const w = mountComponent(DeleteEditionModal, {
            state: { editions: { current: null, remove: vi.fn() }, session: { user: { email: 'm' } } },
            mocks: { $toasted: { show: vi.fn() }, $router: { push: vi.fn() }, $tc: (s: string) => s },
            stubs: { 'b-modal': true },
        });
        await expect(w.vm.deleteEdition()).rejects.toThrow();
    });

    it('deleteEdition() as non-admin performs a plain delete', async () => {
        const { w } = mountModal({ permission: { isAdmin: false } });
        await w.vm.deleteEdition();
        expect(deleteEdition).toHaveBeenCalledWith(7, undefined);
    });

    it('deleteEdition() admin with no other editors force-deletes', async () => {
        const { w } = mountModal({ permission: { isAdmin: true }, shares: [] });
        await w.vm.deleteEdition();
        expect(deleteEdition).toHaveBeenCalledWith(7, true);
    });

    it('deleteEdition() admin + editors + confirm -> admin force delete', async () => {
        window.confirm = vi.fn().mockReturnValue(true);
        const { w } = mountModal({
            permission: { isAdmin: true },
            shares: [{ email: 'other@x.com', permissions: { mayWrite: true } }],
        });
        await w.vm.deleteEdition();
        expect(deleteEdition).toHaveBeenCalledWith(7, true);
    });

    it('deleteEdition() admin + editors + cancel -> hands off admin then plain delete', async () => {
        window.confirm = vi.fn().mockReturnValue(false);
        const { w } = mountModal({
            permission: { isAdmin: true },
            shares: [{ email: 'other@x.com', permissions: { mayWrite: true } }],
        });
        await w.vm.deleteEdition();
        expect(updateSharePermissions).toHaveBeenCalledWith(7, 'other@x.com', 'admin');
        expect(updateSharePermissions).toHaveBeenCalledWith(7, 'me@x.com', 'write');
        expect(deleteEdition).toHaveBeenCalledWith(7, undefined);
    });
});
