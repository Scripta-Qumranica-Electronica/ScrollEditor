import { describe, it, expect, vi } from 'vitest';

vi.mock('@/components/search-bar.vue', () => ({ default: { name: 'search-bar', render: () => null } }));
vi.mock('@/views/home/components/edition-list.vue', () => ({ default: { name: 'editions-list', render: () => null } }));

import PersonalEditions from '@/views/home/components/personal-editions.vue';
import { mountComponent } from './helpers/mount';

function ed(over: any = {}) {
    return { id: 1, name: 'Alpha', mine: true, isPublic: false, lastEdit: new Date('2021-01-01'), ...over };
}

function makeState(items: any[], searchValue: any = {}) {
    return {
        misc: { editionSearchBarValue: searchValue },
        editions: { items },
        prepare: { allEditions: vi.fn().mockResolvedValue(undefined) },
    };
}

function mountPersonal(items: any[], searchValue: any = {}) {
    const state = makeState(items, searchValue);
    const w = mountComponent(PersonalEditions, {
        state,
        stubs: { 'search-bar': true, 'editions-list': true },
    });
    return { w, state };
}

describe('personal-editions', () => {
    it('mounted prepares editions and keeps only mine', async () => {
        const { w, state } = mountPersonal([ed(), ed({ id: 2, mine: false })]);
        await w.vm.$nextTick();
        expect(state.prepare.allEditions).toHaveBeenCalled();
        expect(w.vm.filteredEditions.map((e: any) => e.id)).toEqual([1]);
    });

    it('draft and published getters partition by isPublic', async () => {
        const { w } = mountPersonal([
            ed({ id: 1, isPublic: false }),
            ed({ id: 2, isPublic: true }),
        ]);
        await w.vm.$nextTick();
        expect(w.vm.draftEditions.map((e: any) => e.id)).toEqual([1]);
        expect(w.vm.publishedEditions.map((e: any) => e.id)).toEqual([2]);
    });

    it('searchValue getter/setter proxy to state', () => {
        const { w, state } = mountPersonal([]);
        expect(w.vm.searchValue).toBe(state.misc.editionSearchBarValue);
        const v = { filter: 'x' };
        w.vm.searchValue = v as any;
        expect(state.misc.editionSearchBarValue).toBe(v);
    });

    it('onEditionsSearch updates searchValue and reloads', () => {
        const { w, state } = mountPersonal([ed()]);
        const spy = vi.spyOn(w.vm, 'onPersonalEditionsLoad');
        w.vm.onEditionsSearch({ filter: 'al' } as any);
        expect(state.misc.editionSearchBarValue).toEqual({ filter: 'al' });
        expect(spy).toHaveBeenCalled();
    });

    it('onPersonalEditionsLoad emits the filtered count', () => {
        const { w } = mountPersonal([ed(), ed({ id: 2 })]);
        w.vm.onPersonalEditionsLoad();
        const emitted = w.emitted();
        const key = Object.keys(emitted).find(k => k.toLowerCase().replace(/-/g, '') === 'onpersonaleditionsload');
        expect(key).toBeTruthy();
        expect((emitted[key!] as any[]).at(-1)[0]).toBe(2);
    });

    it('filters by name (case-insensitive)', () => {
        const { w } = mountPersonal([ed({ name: 'Genesis' }), ed({ id: 2, name: 'Exodus' })], { filter: 'exo' });
        expect(w.vm.getFilteredEditions().map((e: any) => e.name)).toEqual(['Exodus']);
    });

    it('sorts by name numerically', () => {
        const { w } = mountPersonal([ed({ name: 'B10' }), ed({ id: 2, name: 'B2' })], { sort: 'name' });
        expect(w.vm.getFilteredEditions().map((e: any) => e.name)).toEqual(['B2', 'B10']);
    });

    it('sorts by lastEdit descending with undefined-as-epoch on both sides', () => {
        const editions = [
            ed({ id: 1, name: 'a', lastEdit: undefined }),
            ed({ id: 2, name: 'b', lastEdit: new Date('2022-01-01') }),
            ed({ id: 3, name: 'c', lastEdit: undefined }),
        ];
        const { w } = mountPersonal(editions, { sort: 'lastEdit' });
        expect(w.vm.getFilteredEditions().map((e: any) => e.id)[0]).toBe(2);
    });

    it('sorts by a generic field ascending', () => {
        const { w } = mountPersonal([ed({ id: 5 }), ed({ id: 2 }), ed({ id: 8 })], { sort: 'id' });
        expect(w.vm.getFilteredEditions().map((e: any) => e.id)).toEqual([2, 5, 8]);
    });

    it('leaves order unchanged when no sort key is given', () => {
        const { w } = mountPersonal([ed({ id: 3 }), ed({ id: 1 })], {});
        expect(w.vm.getFilteredEditions().map((e: any) => e.id)).toEqual([3, 1]);
    });

    it('onSearchValueChanged re-runs the load', () => {
        const { w } = mountPersonal([ed()]);
        const spy = vi.spyOn(w.vm, 'onPersonalEditionsLoad');
        w.vm.onSearchValueChanged();
        expect(spy).toHaveBeenCalled();
    });
});
