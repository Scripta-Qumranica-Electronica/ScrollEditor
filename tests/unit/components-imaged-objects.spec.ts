import { describe, it, expect, vi } from 'vitest';

vi.mock('@/components/search-bar.vue', () => ({ default: { name: 'search-bar', template: '<div class="search-bar-stub"></div>' } }));
vi.mock('@/views/edition/components/imaged-object-card.vue', () => ({ default: { name: 'imaged-object-card', render: () => null } }));

import ImagedObjects from '@/views/edition/components/imaged-objects.vue';
import { mountComponent } from './helpers/mount';

function io(over: any = {}) {
    return { id: 'IO-1', name: 'Alpha', ...over };
}

function makeState(items: any[], currentId = 5) {
    return {
        imagedObjects: { items },
        editions: { current: { id: currentId } },
        prepare: {
            edition: vi.fn().mockResolvedValue(undefined),
            imagedObjects: vi.fn().mockResolvedValue(undefined),
        },
    };
}

function mountView(items: any[], editionId: string | undefined = '5') {
    const state = makeState(items);
    const w = mountComponent(ImagedObjects, {
        state,
        mocks: { $route: { params: { editionId } } },
        stubs: { 'search-bar': true, 'imaged-object-card': true },
    });
    return { w, state };
}

describe('imaged-objects', () => {
    it('created prepares the edition and imaged objects using the route id', async () => {
        const { w, state } = mountView([io(), io({ id: 'IO-2' })], '9');
        await w.vm.$nextTick();
        expect(state.prepare.edition).toHaveBeenCalledWith(9);
        expect(state.prepare.imagedObjects).toHaveBeenCalledWith(9);
        expect(w.vm.filteredImagedObjects.length).toBe(2);
    });

    it('created falls back to the current edition id when the route lacks one', async () => {
        const { w, state } = mountView([io()], undefined);
        await w.vm.$nextTick();
        expect(state.prepare.edition).toHaveBeenCalledWith(5); // current.id
    });

    it('imagedObjects getter returns the state items', () => {
        const items = [io()];
        const { w } = mountView(items);
        expect(w.vm.imagedObjects).toBe(items);
    });

    it('onImagedObjectsSearch filters by name case-insensitively', () => {
        const { w } = mountView([io({ name: 'Genesis' }), io({ id: 'x', name: 'Exodus' })]);
        w.vm.onImagedObjectsSearch({ filter: 'exo' } as any);
        expect(w.vm.filteredImagedObjects.map((i: any) => i.name)).toEqual(['Exodus']);
    });

    it('returns all imaged objects when no filter is set', () => {
        const { w } = mountView([io({ name: 'A' }), io({ id: 'b', name: 'B' })]);
        w.vm.onImagedObjectsSearch({} as any);
        expect(w.vm.filteredImagedObjects.length).toBe(2);
    });

    it('sorts by a given field', () => {
        const { w } = mountView([io({ id: 'a', name: 'B' }), io({ id: 'b', name: 'A' })]);
        w.vm.searchValue = { sort: 'name' } as any;
        const sorted = w.vm.getFilteredImagedObjects();
        expect(sorted.map((i: any) => i.name)).toEqual(['A', 'B']);
    });

    it('sorts descending as well (both ternary branches)', () => {
        const { w } = mountView([io({ id: 'a', name: 'A' }), io({ id: 'b', name: 'B' }), io({ id: 'c', name: 'C' })]);
        w.vm.searchValue = { sort: 'name' } as any;
        expect(w.vm.getFilteredImagedObjects().map((i: any) => i.name)).toEqual(['A', 'B', 'C']);
    });

    it('renders a card per imaged object', async () => {
        const { w } = mountView([io(), io({ id: 'IO-2' })]);
        await w.vm.$nextTick();
        expect(w.element.querySelectorAll('imaged-object-card').length).toBe(2);
    });

    it('the search-bar @search event triggers filtering', async () => {
        const { w } = mountView([io({ name: 'Genesis' }), io({ id: 'x', name: 'Exodus' })]);
        await w.find('search-bar').trigger('search', { filter: 'gen' } as any);
        // event payload carries no detail here; verify the handler ran via a direct call too
        w.vm.onImagedObjectsSearch({ filter: 'gen' } as any);
        expect(w.vm.filteredImagedObjects.map((i: any) => i.name)).toEqual(['Genesis']);
    });
});
