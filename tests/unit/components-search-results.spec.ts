import { describe, it, expect, vi } from 'vitest';

vi.mock('@/services/search', () => ({ default: class {} }));
vi.mock('@/views/search/artefact-results.vue', () => ({ default: { name: 'artefact-results', render: () => null } }));
vi.mock('@/views/search/edition-results.vue', () => ({ default: { name: 'edition-results', render: () => null } }));
vi.mock('@/views/search/imaged-object-results.vue', () => ({ default: { name: 'imaged-object-results', render: () => null } }));
vi.mock('@/views/search/text-fragment-results.vue', () => ({ default: { name: 'text-fragment-results', render: () => null } }));

import SearchResults from '@/views/search/results.vue';
import { mountComponent } from './helpers/mount';

function mountResults(results: any) {
    return mountComponent(SearchResults, {
        props: { results },
        stubs: {
            'edition-results': true, 'imaged-object-results': true,
            'text-fragment-results': true, 'artefact-results': true,
        },
    });
}

describe('search-results', () => {
    it('empty is true when there are no results', () => {
        const w = mountResults(null);
        expect(w.vm.empty).toBe(true);
        expect(w.vm.prettyResults).toBe('');
    });

    it('empty is true when every result bucket is absent or zero-length', () => {
        const w = mountResults({ editions: { editions: [] }, artefacts: { artefacts: [] } });
        expect(w.vm.empty).toBe(true);
        expect(w.text()).toContain('Search returned no results');
    });

    it('empty is false when any bucket has items and renders the accordion', () => {
        const results = {
            editions: { editions: [{ id: 1 }] },
            textFragments: { textFragments: [] },
            artefacts: { artefacts: [] },
            images: { imagedObjects: [] },
        };
        const w = mountResults(results);
        expect(w.vm.empty).toBe(false);
        expect(w.find('.accordion').exists()).toBe(true);
    });

    it('counts across all four buckets', () => {
        const results = {
            editions: { editions: [{ id: 1 }] },
            textFragments: { textFragments: [{ id: 2 }, { id: 3 }] },
            artefacts: { artefacts: [{ id: 4 }] },
            images: { imagedObjects: [{ id: 5 }] },
        };
        const w = mountResults(results);
        expect(w.vm.empty).toBe(false);
    });

    it('prettyResults serializes the results as JSON', () => {
        const w = mountResults({ editions: { editions: [{ id: 1 }] } });
        expect(w.vm.prettyResults).toContain('"editions"');
    });
});
