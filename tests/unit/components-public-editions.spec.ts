import { describe, it, expect, vi } from 'vitest';

vi.mock('@/components/search-bar.vue', () => ({ default: { name: 'search-bar', render: () => null } }));
vi.mock('@/views/home/components/edition-public-list.vue', () => ({ default: { name: 'editions-public-list', template: '<div class="pub-list-stub"></div>' } }));
vi.mock('@/views/home/components/copy-edition-modal.vue', () => ({ default: { name: 'copy-edition-modal', render: () => null } }));

import PublicEditions from '@/views/home/components/public-editions.vue';
import { mountComponent } from './helpers/mount';

function ed(over: any = {}) {
    return { id: 1, name: 'Alpha', isPublic: true, lastEdit: new Date('2021-01-01'), ...over };
}

function makeState(items: any[], searchValue: any = {}) {
    return {
        misc: { editionSearchBarValue: searchValue },
        editions: { items },
        prepare: { allEditions: vi.fn().mockResolvedValue(undefined) },
    };
}

function mountPub(items: any[], searchValue: any = {}) {
    const state = makeState(items, searchValue);
    const w = mountComponent(PublicEditions, {
        state,
        stubs: { 'search-bar': true, 'editions-public-list': true, 'copy-edition-modal': true },
    });
    return { w, state };
}

describe('public-editions', () => {
    it('mounted prepares editions and loads the filtered list', async () => {
        const { w, state } = mountPub([ed(), ed({ id: 2, isPublic: false })]);
        await w.vm.$nextTick();
        expect(state.prepare.allEditions).toHaveBeenCalled();
        expect(w.vm.filteredEditions.map((e: any) => e.id)).toEqual([1]); // only public
    });

    it('searchValue getter/setter proxy to state', () => {
        const { w, state } = mountPub([]);
        expect(w.vm.searchValue).toBe(state.misc.editionSearchBarValue);
        const v = { filter: 'x' };
        w.vm.searchValue = v as any;
        expect(state.misc.editionSearchBarValue).toBe(v);
    });

    it('onEditionsSearch updates searchValue', () => {
        const { w, state } = mountPub([]);
        w.vm.onEditionsSearch({ filter: 'beta' } as any);
        expect(state.misc.editionSearchBarValue).toEqual({ filter: 'beta' });
    });

    it('onPublicEditionsLoad emits the filtered count', () => {
        const { w } = mountPub([ed(), ed({ id: 2 })]);
        w.vm.onPublicEditionsLoad();
        const emitted = w.emitted();
        const key = Object.keys(emitted).find(k => k.toLowerCase().replace(/-/g, '') === 'onpubliceditionsload');
        expect(key).toBeTruthy();
        expect((emitted[key!] as any[]).at(-1)[0]).toBe(2);
    });

    it('filters by name (case-insensitive) when a filter is set', () => {
        const { w } = mountPub([ed({ name: 'Genesis' }), ed({ id: 2, name: 'Exodus' })], { filter: 'gen' });
        expect(w.vm.getFilteredEditions().map((e: any) => e.name)).toEqual(['Genesis']);
    });

    it('sorts by name numerically', () => {
        const { w } = mountPub([ed({ name: 'B10' }), ed({ id: 2, name: 'B2' })], { sort: 'name' });
        expect(w.vm.getFilteredEditions().map((e: any) => e.name)).toEqual(['B2', 'B10']);
    });

    it('sorts by lastEdit descending, treating undefined as epoch', () => {
        const editions = [
            ed({ id: 1, name: 'old', lastEdit: new Date('2019-01-01') }),
            ed({ id: 2, name: 'new', lastEdit: new Date('2022-01-01') }),
            ed({ id: 3, name: 'never', lastEdit: undefined }),
        ];
        const { w } = mountPub(editions, { sort: 'lastEdit' });
        const order = w.vm.getFilteredEditions().map((e: any) => e.id);
        expect(order[0]).toBe(2); // newest first
        expect(order.at(-1)).toBe(3); // undefined date last
    });

    it('sorts by a generic field ascending', () => {
        const { w } = mountPub([ed({ id: 5 }), ed({ id: 2 }), ed({ id: 8 })], { sort: 'id' });
        expect(w.vm.getFilteredEditions().map((e: any) => e.id)).toEqual([2, 5, 8]);
    });

    it('lastEdit sort handles an undefined date on either side', () => {
        const editions = [
            ed({ id: 1, name: 'a', lastEdit: undefined }),
            ed({ id: 2, name: 'b', lastEdit: new Date('2022-01-01') }),
            ed({ id: 3, name: 'c', lastEdit: undefined }),
        ];
        const { w } = mountPub(editions, { sort: 'lastEdit' });
        const ids = w.vm.getFilteredEditions().map((e: any) => e.id);
        expect(ids[0]).toBe(2); // dated edition first
    });

    it('leaves order unchanged when no sort key is given', () => {
        const { w } = mountPub([ed({ id: 3 }), ed({ id: 1 })], {});
        expect(w.vm.getFilteredEditions().map((e: any) => e.id)).toEqual([3, 1]);
    });

    it('show-copy-modal from the list opens the copy modal', async () => {
        const { w } = mountPub([ed()]);
        expect(w.vm.showCopyModal).toBe(false);
        await w.find('editions-public-list-stub').trigger('show-copy-modal');
        expect(w.vm.showCopyModal).toBe(true);
    });

    it('onSearchValueChanged re-runs the load', () => {
        const { w } = mountPub([ed()]);
        const spy = vi.spyOn(w.vm, 'onPublicEditionsLoad');
        w.vm.onSearchValueChanged();
        expect(spy).toHaveBeenCalled();
    });
});
