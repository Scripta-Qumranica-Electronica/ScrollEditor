import { describe, it, expect } from 'vitest';
import SearchBar from '@/components/search-bar.vue';
import { mountComponent } from './helpers/mount';

function findEmit(w: any, name: string) {
    const emitted = w.emitted();
    const key = Object.keys(emitted).find(k => k.toLowerCase() === name.toLowerCase());
    return key ? emitted[key] : undefined;
}

function mountBar(params: any = { filter: true, side: true, sort: true }, modelValue: any = { filter: 'x' }) {
    return mountComponent(SearchBar, {
        props: { params, modelValue },
        stubs: {
            'b-form': true, 'b-form-group': true, 'b-form-input': true,
            'b-form-select': true, 'b-form-select-option': true,
        },
    });
}

describe('search-bar', () => {
    it('mounted copies the model value and emits an initial search', () => {
        const w = mountBar({ filter: true }, { filter: 'abc' });
        expect(w.vm.internalValue).toEqual({ filter: 'abc' });
        expect(findEmit(w, 'search')).toBeTruthy();
        expect(findEmit(w, 'search')![0][0]).toEqual({ filter: 'abc' });
    });

    it('onSearch re-emits a fresh copy of internalValue', () => {
        const w = mountBar();
        const before = (findEmit(w, 'search') || []).length;
        w.vm.internalValue = { side: 'recto' } as any;
        w.vm.onSearch();
        const calls = findEmit(w, 'search')!;
        expect(calls.length).toBe(before + 1);
        expect(calls.at(-1)[0]).toEqual({ side: 'recto' });
    });

    it('filter / view / sort change handlers all trigger a search', () => {
        const w = mountBar();
        const before = findEmit(w, 'search')!.length;
        w.vm.onFilterChange('f');
        w.vm.onViewChange('recto');
        w.vm.onSortChange('name');
        expect(findEmit(w, 'search')!.length).toBe(before + 3);
    });

    it('reacts to modelValue prop changes by resyncing internalValue', async () => {
        const w = mountBar({ filter: true }, { filter: 'one' });
        await w.setProps({ modelValue: { filter: 'two', sort: 'name' } });
        expect(w.vm.internalValue).toEqual({ filter: 'two', sort: 'name' });
    });

    it('renders only the enabled control groups', () => {
        const filterOnly = mountBar({ filter: true, side: false, sort: false });
        expect(filterOnly.element.querySelectorAll('b-form-group-stub').length).toBe(1);
        const all = mountBar({ filter: true, side: true, sort: true });
        expect(all.element.querySelectorAll('b-form-group-stub').length).toBe(3);
    });

    it('defaults params when none is provided', () => {
        const w = mountComponent(SearchBar, {
            props: { modelValue: {} },
            stubs: { 'b-form': true, 'b-form-group': true, 'b-form-input': true, 'b-form-select': true, 'b-form-select-option': true },
        });
        expect(w.vm.params.filter).toBe(false);
    });
});
