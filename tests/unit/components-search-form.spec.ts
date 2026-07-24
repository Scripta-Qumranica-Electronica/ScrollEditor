import { describe, it, expect, vi } from 'vitest';

vi.mock('@/services/search', () => ({
    default: class {},
}));

import SearchForm from '@/views/search/form.vue';
import { mountComponent } from './helpers/mount';

function mountForm(props: any = {}) {
    return mountComponent(SearchForm, {
        props,
        stubs: {
            'b-row': true, 'b-col': true, 'b-form-input': true,
            'b-form-checkbox': true, 'b-form-textarea': true, 'b-button': true,
        },
    });
}

describe('search-form', () => {
    it('starts with a fresh SearchFormData and noSearch is true (nothing entered)', () => {
        const w = mountForm();
        expect(w.vm.noSearch).toBe(true);
    });

    it('textToArray splits on newlines and drops empty lines', () => {
        const w = mountForm();
        w.vm.textToArray('Frg. 1\n\nFrg. 2\n', 'textReference');
        expect(w.vm.searchData.textReference).toEqual(['Frg. 1', 'Frg. 2']);

        w.vm.textToArray('A\nB', 'artefactDesignation');
        expect(w.vm.searchData.artefactDesignation).toEqual(['A', 'B']);
    });

    it('noSearch becomes false once any field is populated', () => {
        const w = mountForm();
        w.vm.searchData.textDesignation = '3Q4';
        expect(w.vm.noSearch).toBe(false);

        w.vm.searchData.textDesignation = '';
        w.vm.searchData.imageDesignation = 'IAA-1';
        expect(w.vm.noSearch).toBe(false);

        w.vm.searchData.imageDesignation = '';
        w.vm.searchData.textReference = ['x'];
        expect(w.vm.noSearch).toBe(false);

        w.vm.searchData.textReference = [];
        w.vm.searchData.artefactDesignation = ['y'];
        expect(w.vm.noSearch).toBe(false);
    });

    it('noSearch stays true when the disabled prop is set even with data', () => {
        const w = mountForm({ disabled: true });
        w.vm.searchData.textDesignation = '3Q4';
        expect(w.vm.noSearch).toBe(true);
    });

    it('search() emits the current searchData', () => {
        const w = mountForm();
        w.vm.searchData.textDesignation = 'ABC';
        w.vm.search();
        const emitted = w.emitted('search');
        expect(emitted).toBeTruthy();
        expect((emitted![0][0] as any).textDesignation).toBe('ABC');
    });
});
