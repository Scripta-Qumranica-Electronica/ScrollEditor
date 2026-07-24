import { describe, it, expect, vi, beforeEach } from 'vitest';

const { showModal } = vi.hoisted(() => ({ showModal: vi.fn() }));
vi.mock('@/utils/modal-bus', () => ({ showModal, registerModalListener: vi.fn().mockReturnValue(vi.fn()) }));
vi.mock('@/views/edition/components/permission-modal.vue', () => ({ default: { name: 'permission-modal', render: () => null } }));
vi.mock('@/views/edition/components/delete-edition-modal.vue', () => ({ default: { name: 'delete-edition-modal', render: () => null } }));
vi.mock('@/views/edition/components/metadata.vue', () => ({ default: { name: 'edition-metadata-modal', render: () => null } }));

import Edition from '@/views/edition/Edition.vue';
import { mountComponent } from './helpers/mount';

const flush = async () => { for (let i = 0; i < 5; i++) { await Promise.resolve(); } };

function makeState(opts: any = {}) {
    const edition = opts.edition ?? { id: 5, name: 'My Edition', isPublic: false, permission: { isAdmin: true } };
    const user = 'user' in opts ? opts.user : { id: 1 };
    return {
        session: { user },
        editions: {
            current: opts.current ?? edition,
            find: vi.fn().mockReturnValue(opts.found === undefined ? edition : opts.found),
        },
        artefacts: { items: opts.artefacts ?? [], current: null },
        imagedObjects: { items: opts.imagedObjects ?? [], current: null },
        prepare: { edition: vi.fn().mockResolvedValue(undefined) },
    };
}

function mountView(opts: any = {}, editionId = '5') {
    const state = makeState(opts);
    window.history.replaceState({}, '', opts.href ?? `/editions/${editionId}/artefacts`);
    const w = mountComponent(Edition, {
        state,
        mocks: { $route: { params: { editionId } } },
        stubs: {
            'b-row': true, 'b-col': true, 'b-button': true, 'b-button-group': true,
            'router-link': true, 'router-view': true, 'Waiting': true,
            'permission-modal': true, 'delete-edition-modal': true, 'edition-metadata-modal': true,
        },
    });
    return { w, state };
}

describe('Edition', () => {
    beforeEach(() => vi.clearAllMocks());

    it('mounted loads the edition and sets current', async () => {
        const { w, state } = mountView({}, '9');
        await flush();
        expect(state.prepare.edition).toHaveBeenCalledWith(9);
        expect(state.editions.find).toHaveBeenCalledWith(9);
        expect(w.vm.isLoading).toBe(false);
        expect(state.artefacts.current).toBeNull();
        expect(state.imagedObjects.current).toBeNull();
        expect(w.vm.page).toBe('artefacts');
    });

    it('mounted leaves current untouched when the edition is not found', async () => {
        const before = { id: 99, name: 'Keep', isPublic: false, permission: { isAdmin: true } };
        const { w, state } = mountView({ found: null, current: before });
        await flush();
        expect(state.editions.current).toBe(before);
    });

    it('getPage classifies imaged-objects URLs', async () => {
        const { w } = mountView({ href: '/editions/5/imaged-objects' });
        await flush();
        expect(w.vm.page).toBe('imaged-objects');
    });

    it('isWaiting mirrors isLoading', () => {
        const { w } = mountView();
        w.vm.isLoading = true;
        expect(w.vm.isWaiting).toBe(true);
    });

    it('user getter reflects the session', () => {
        expect(mountView({ user: { id: 1 } }).w.vm.user).toBe(true);
        expect(mountView({ user: null }).w.vm.user).toBe(false);
    });

    it('currentEdition / isAdmin read from state', () => {
        const { w, state } = mountView({ edition: { id: 5, name: 'E', isPublic: false, permission: { isAdmin: false } } });
        expect(w.vm.currentEdition).toBe(state.editions.current);
        expect(w.vm.isAdmin).toBe(false);
    });

    it('copyTooltip differs for public vs private editions', () => {
        const pub = mountView({ edition: { id: 1, name: 'P', isPublic: true, permission: { isAdmin: true } } }).w;
        expect(pub.vm.copyTooltip).toContain('public Edition');
        const priv = mountView({ edition: { id: 1, name: 'D', isPublic: false, permission: { isAdmin: true } } }).w;
        expect(priv.vm.copyTooltip).toContain('Create a copy and');
    });

    it('artefactsLength excludes virtual artefacts', () => {
        const artefacts = [{ isVirtual: false }, { isVirtual: true }, { isVirtual: false }];
        const { w } = mountView({ artefacts });
        expect(w.vm.artefactsLength).toBe(2);
    });

    it('imagedObjectsLength counts imaged objects', () => {
        const { w } = mountView({ imagedObjects: [{}, {}, {}] });
        expect(w.vm.imagedObjectsLength).toBe(3);
    });

    it('modal openers dispatch the right modal ids', () => {
        const { w } = mountView();
        w.vm.openMetadata();
        expect(showModal).toHaveBeenCalledWith('editionMetadataModal');
        w.vm.deleteEdition();
        expect(showModal).toHaveBeenCalledWith('deleteEditionModal');
        w.vm.openPermissionModal();
        expect(showModal).toHaveBeenCalledWith('permissionModal');
    });

    it('versionString returns the edition name', () => {
        const { w } = mountView();
        expect(w.vm.versionString({ name: 'Foo' } as any)).toBe('Foo');
    });

    it('beforeRouteUpdate reloads the edition, sets the page and calls next', async () => {
        const { w, state } = mountView();
        const next = vi.fn();
        await w.vm.beforeRouteUpdate({ params: { editionId: '12' }, path: '/editions/12/imaged-objects' }, {}, next);
        expect(state.prepare.edition).toHaveBeenCalledWith(12);
        expect(w.vm.page).toBe('imaged-objects');
        expect(next).toHaveBeenCalled();
    });
});
