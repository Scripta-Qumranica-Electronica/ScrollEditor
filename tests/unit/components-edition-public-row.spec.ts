import { describe, it, expect, vi } from 'vitest';
import EditionPublicRow from '@/views/home/components/edition-public-row.vue';
import { mountComponent } from './helpers/mount';

function makeEditions(n: number) {
    return Array.from({ length: n }, (_, i) => ({
        id: i + 1,
        name: `Ed ${i + 1}`,
        thumbnail: undefined,
        lastEdit: new Date('2020-01-01T00:00:00Z'),
    }));
}

function mountRow(editions: any[], index = 0) {
    const state: any = { editions: { current: null } };
    const w = mountComponent(EditionPublicRow, {
        props: { editions, index },
        state,
        stubs: { 'edition-public-card': true },
    });
    return { w, state };
}

describe('edition-public-row', () => {
    it('rowEditions returns at most four editions starting at index', () => {
        const { w } = mountRow(makeEditions(10), 2);
        expect(w.vm.rowEditions.map((e: any) => e.id)).toEqual([3, 4, 5, 6]);
    });

    it('rowEditions is a shorter slice near the end', () => {
        const { w } = mountRow(makeEditions(6), 4);
        expect(w.vm.rowEditions.map((e: any) => e.id)).toEqual([5, 6]);
    });

    it('renders one card per row edition', () => {
        const { w } = mountRow(makeEditions(4), 0);
        expect(w.element.querySelectorAll('edition-public-card-stub').length).toBe(4);
    });

    it('the card edition-copy-click listener triggers editionCopyClick', async () => {
        const { w, state } = mountRow(makeEditions(4), 0);
        const cards = w.findAll('edition-public-card-stub');
        await cards[2].trigger('edition-copy-click');
        expect(state.editions.current).toBe(w.vm.rowEditions[2]);
        const emitted = w.emitted();
        const key = Object.keys(emitted).find(k => k.toLowerCase().replace(/-/g, '') === 'showcopymodal');
        expect(key).toBeTruthy();
    });

    it('editionCopyClick sets current in state and emits show-copy-modal', () => {
        const { w, state } = mountRow(makeEditions(4), 0);
        const edition = w.vm.rowEditions[1];
        w.vm.editionCopyClick(edition);
        expect(state.editions.current).toBe(edition);
        const emitted = w.emitted();
        const key = Object.keys(emitted).find(k => k.toLowerCase().replace(/-/g, '') === 'showcopymodal');
        expect(key).toBeTruthy();
        expect((emitted[key!] as any[])[0][0]).toBe(edition);
    });
});
