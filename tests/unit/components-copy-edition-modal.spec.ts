import { describe, it, expect, vi, beforeEach } from 'vitest';

const { copyEdition, showModal } = vi.hoisted(() => ({
    copyEdition: vi.fn(),
    showModal: vi.fn(),
}));

vi.mock('@/services/edition', () => ({
    default: class { public copyEdition = copyEdition; },
}));
vi.mock('@/utils/modal-bus', () => ({
    showModal,
    registerModalListener: () => () => undefined,
}));

import CopyEditionModal from '@/views/home/components/copy-edition-modal.vue';
import { mountComponent } from './helpers/mount';

function makeState(over: any = {}) {
    return {
        session: { user: over.user === undefined ? { email: 'me@x.com' } : over.user },
        editions: {
            current: over.current === undefined
                ? { id: 3, name: 'Orig', owner: { forename: 'O' } }
                : over.current,
        },
        misc: {},
    };
}

function mountModal(stateOver: any = {}, routeParams: any = {}) {
    const router = { push: vi.fn(), go: vi.fn() };
    const w = mountComponent(CopyEditionModal, {
        props: { modelValue: false },
        state: makeState(stateOver),
        mocks: { $router: router, $route: { params: routeParams } },
        stubs: {
            'b-modal': true, 'b-row': true, 'b-col': true, 'b-form-input': true,
            'b-button': true, 'font-awesome-icon': true,
        },
    });
    return { w, router };
}

describe('copy-edition-modal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        copyEdition.mockResolvedValue({ id: 99 });
    });

    it('user + currentEdition + isWaiting getters', () => {
        const { w } = mountModal();
        expect(w.vm.user).toBe(true);
        expect(w.vm.currentEdition.id).toBe(3);
        expect(w.vm.isWaiting).toBe(false);
    });

    it('canCopy reflects a trimmed non-empty name', () => {
        const { w } = mountModal();
        expect(w.vm.canCopy).toBe(false);
        w.vm.newCopyName = '  hello  ';
        expect(w.vm.canCopy).toBe(true);
        w.vm.newCopyName = '   ';
        expect(w.vm.canCopy).toBe(false);
    });

    it('modelValue watcher drives internalVisible; internalVisible watcher emits update', async () => {
        const { w } = mountModal();
        await w.setProps({ modelValue: true });
        expect(w.vm.internalVisible).toBe(true);

        w.vm.internalVisible = false;
        await w.vm.$nextTick();
        expect(w.emitted('update:modelValue')).toBeTruthy();
    });

    it('copyModalShown seeds the name from the edition (logged out: no focus)', () => {
        const { w } = mountModal({ user: null });
        w.vm.copyModalShown();
        expect(w.vm.newCopyName).toBe('Orig');
    });

    it('onShow prevents the default event', () => {
        const { w } = mountModal();
        const preventDefault = vi.fn();
        w.vm.onShow({ preventDefault } as any);
        expect(preventDefault).toHaveBeenCalled();
    });

    it('onHide on non-backdrop triggers is a no-op (no ref access)', () => {
        const { w } = mountModal();
        expect(() => w.vm.onHide({ trigger: 'ok' } as any)).not.toThrow();
        // event.type fallback path when no `trigger` key present
        expect(() => w.vm.onHide({ type: 'hidden' } as any)).not.toThrow();
    });

    it('copyEdition() no-ops when the name is blank', async () => {
        const { w } = mountModal();
        w.vm.newCopyName = '';
        await w.vm.copyEdition({ preventDefault: vi.fn() } as any);
        expect(copyEdition).not.toHaveBeenCalled();
    });

    it('copyEdition() copies and full-page navigates to the new edition overview', async () => {
        const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => undefined);
        const { w } = mountModal();
        w.vm.newCopyName = '  New Name  ';
        await w.vm.copyEdition({ preventDefault: vi.fn() } as any);
        expect(copyEdition).toHaveBeenCalledWith(3, 'New Name');
        // A single full navigation (not router.push + go(0), which raced and reloaded the old url).
        expect(assign).toHaveBeenCalledWith('/editions/99');
        expect(w.vm.internalVisible).toBe(false);
        expect(w.vm.waiting).toBe(false);
        assign.mockRestore();
    });

    it('copyEdition() preserves the imaged-object view on the new edition', async () => {
        const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => undefined);
        const { w } = mountModal({}, { editionId: '3', imagedObjectId: 'IAA-648-1' });
        w.vm.newCopyName = 'New Name';
        await w.vm.copyEdition({ preventDefault: vi.fn() } as any);
        expect(assign).toHaveBeenCalledWith('/editions/99/imaged-objects/IAA-648-1');
        assign.mockRestore();
    });

    it('copyEdition() records an error message on failure', async () => {
        copyEdition.mockRejectedValueOnce(new Error('bad'));
        const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const { w } = mountModal();
        w.vm.newCopyName = 'X';
        await w.vm.copyEdition({ preventDefault: vi.fn() } as any);
        expect(w.vm.errorMessage).toContain('bad');
        expect(w.vm.waiting).toBe(false);
        spy.mockRestore();
    });

    it('onLogin / onRegister open the right modal and close this one', () => {
        const { w } = mountModal();
        w.vm.internalVisible = true;
        w.vm.onLogin();
        expect(showModal).toHaveBeenCalledWith('loginModal');
        expect(w.vm.internalVisible).toBe(false);

        w.vm.internalVisible = true;
        w.vm.onRegister();
        expect(showModal).toHaveBeenCalledWith('registerModal');
        expect(w.vm.internalVisible).toBe(false);
    });

    it('user getter is false when logged out', () => {
        const { w } = mountModal({ user: null });
        expect(w.vm.user).toBe(false);
    });
});
