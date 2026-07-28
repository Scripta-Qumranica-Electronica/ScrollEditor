import { describe, it, expect, vi, beforeEach } from 'vitest';

const { search } = vi.hoisted(() => ({ search: vi.fn().mockResolvedValue({ editions: { editions: [] } }) }));
vi.mock('@/services/search', () => ({ default: class { public search = search; } }));
vi.mock('@/views/search/form.vue', () => ({ default: { name: 'search-form', template: '<div class="search-form-stub"></div>' } }));
vi.mock('@/views/search/results.vue', () => ({ default: { name: 'search-results', render: () => null } }));

import SearchMain from '@/views/search/main.vue';
import { mountComponent } from './helpers/mount';

function mountMain() {
    return mountComponent(SearchMain, {
        stubs: { 'search-form': true, 'search-results': true, 'b-row': true, 'b-col': true, waiting: true },
    });
}

describe('search main', () => {
    beforeEach(() => vi.clearAllMocks());

    it('mounted resets the results', () => {
        const w = mountMain();
        expect(w.vm.searchResults).toBeNull();
        expect(w.vm.searching).toBe(false);
    });

    it('onSearch runs the search, stores the data + results and clears searching', async () => {
        const w = mountMain();
        const data = { text: 'abc' } as any;
        const result = { editions: { editions: [{ id: 1 }] } };
        search.mockResolvedValueOnce(result);
        await w.vm.onSearch(data);
        expect(search).toHaveBeenCalledWith(data);
        expect(w.vm.searchData).toEqual(data);
        expect(w.vm.searchResults).toEqual(result);
        expect(w.vm.searching).toBe(false);
    });

    it('the search-form @search event runs onSearch', async () => {
        const w = mountMain();
        await w.find('search-form-stub').trigger('search');
        expect(search).toHaveBeenCalled();
    });

    it('onSearch clears searching even when the search rejects', async () => {
        const w = mountMain();
        search.mockRejectedValueOnce(new Error('boom'));
        await expect(w.vm.onSearch({} as any)).rejects.toThrow('boom');
        expect(w.vm.searching).toBe(false);
        expect(w.vm.searchResults).toBeNull();
    });
});
