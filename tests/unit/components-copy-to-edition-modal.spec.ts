import { describe, it, expect, vi, beforeEach } from 'vitest';

const { copyArtefact } = vi.hoisted(() => ({ copyArtefact: vi.fn() }));

vi.mock('@/services/artefact', () => ({
    default: class { public copyArtefact = copyArtefact; },
}));
vi.mock('@/utils/modal-bus', () => ({
    showModal: vi.fn(),
    registerModalListener: () => () => undefined,
}));

import CopyToEditionModal from '@/views/home/components/copy-to-edition-modal.vue';
import { mountComponent } from './helpers/mount';

function makeState(over: any = {}) {
    return {
        editions: {
            items: over.items ?? [
                { id: 1, name: 'Alpha', isPublic: false },
                { id: 2, name: 'Beta', isPublic: false },
                { id: 3, name: 'PublicOne', isPublic: true },
            ],
        },
        artefacts: { current: over.artefact ?? { id: 50, name: 'Art' } },
        imagedObjects: { current: over.imagedObject ?? { id: 60 } },
    };
}

function mountModal(stateOver: any = {}) {
    const router = { push: vi.fn(), go: vi.fn() };
    const w = mountComponent(CopyToEditionModal, {
        props: { modelValue: false },
        state: makeState(stateOver),
        mocks: { $router: router },
        stubs: {
            'b-modal': true, 'b-row': true, 'b-col': true, 'b-dropdown': true,
            'b-dropdown-form': true, 'b-form-input': true, 'b-dropdown-item': true,
            'b-button': true,
        },
    });
    return { w, router };
}

describe('copy-to-edition-modal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        copyArtefact.mockResolvedValue({ id: 77 });
    });

    it('editions getter filters out public editions and honours the search term', () => {
        const { w } = mountModal();
        // No search term -> both private editions
        expect(w.vm.editions.map((e: any) => e.id)).toEqual([1, 2]);

        w.vm.searchValue = 'alp';
        expect(w.vm.editions.map((e: any) => e.id)).toEqual([1]);

        w.vm.searchValue = 'zzz';
        expect(w.vm.editions).toEqual([]);
    });

    it('currentArtefact + imagedObject getters', () => {
        const { w } = mountModal();
        expect(w.vm.currentArtefact.id).toBe(50);
        expect(w.vm.imagedObject.id).toBe(60);
    });

    it('modelValue/internalVisible watchers sync and emit', async () => {
        const { w } = mountModal();
        await w.setProps({ modelValue: true });
        expect(w.vm.internalVisible).toBe(true);

        w.vm.internalVisible = false;
        await w.vm.$nextTick();
        expect(w.emitted('update:modelValue')).toBeTruthy();
    });

    it('copyToEdition copies, navigates to the new artefact and reloads', async () => {
        const { w, router } = mountModal();
        w.vm.editionTargetId = 2;
        await w.vm.copyToEdition();
        expect(copyArtefact).toHaveBeenCalledWith(2, expect.objectContaining({ id: 50 }));
        expect(router.push).toHaveBeenCalledWith({ path: '/editions/2/artefacts/77' });
        expect(router.go).toHaveBeenCalledWith(0);
        expect(w.vm.internalVisible).toBe(false);
        expect(w.vm.waiting).toBe(false);
    });

    it('copyToEdition records an error message on failure', async () => {
        copyArtefact.mockRejectedValueOnce(new Error('nope'));
        const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const { w } = mountModal();
        w.vm.editionTargetId = 2;
        await w.vm.copyToEdition();
        expect(w.vm.errorMessage).toContain('nope');
        expect(w.vm.waiting).toBe(false);
        spy.mockRestore();
    });

    it('onHide closes the modal', () => {
        const { w } = mountModal();
        w.vm.internalVisible = true;
        w.vm.onHide({} as any);
        expect(w.vm.internalVisible).toBe(false);
    });
});
