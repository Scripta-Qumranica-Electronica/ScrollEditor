import { describe, it, expect, vi } from 'vitest';

vi.mock('@/services/search', () => ({ default: class {} }));

import TextFragmentResults from '@/views/search/text-fragment-results.vue';
import { mountComponent } from './helpers/mount';

function mountResults(textFragments: any) {
    return mountComponent(TextFragmentResults, {
        props: { textFragments },
        stubs: { 'b-collapse': true, 'b-card': true, 'router-link': true },
    });
}

describe('text-fragment-results', () => {
    it('renders nothing when textFragments is null', () => {
        const w = mountResults(null);
        expect(w.find('p').exists()).toBe(false);
    });

    it('title reports the count', () => {
        expect(mountResults([]).vm.title).toBe('Text Fragments (0)');
        expect(mountResults([{ id: 1, name: 'col.1', editionId: 5, editionName: 'Ed' }]).vm.title)
            .toBe('Text Fragments (1)');
    });

    it('renders a card + link per text fragment with name and edition', () => {
        const tfs = [
            { id: 1, name: 'col.1', editionId: 5, editionName: 'Genesis' },
            { id: 2, name: 'col.2', editionId: 6, editionName: 'Exodus' },
        ];
        const w = mountResults(tfs);
        expect(w.element.querySelectorAll('b-card').length).toBe(2);
        expect(w.text()).toContain('col.1 in Genesis');
        expect(w.text()).toContain('col.2 in Exodus');
    });
});
