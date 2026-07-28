import { describe, it, expect, vi } from 'vitest';

vi.mock('@/services/search', () => ({ default: class {} }));
vi.mock('@/views/home/components/edition-card.vue', () => ({ default: { name: 'edition-card', render: () => null } }));

import EditionResults from '@/views/search/edition-results.vue';
import { mountComponent } from './helpers/mount';

const flush = async () => { for (let i = 0; i < 5; i++) { await Promise.resolve(); } };

function makeState(byId: Record<number, any>) {
    return {
        editions: { find: vi.fn((id: number) => byId[id]) },
        prepare: { allEditions: vi.fn().mockResolvedValue(undefined) },
    };
}

function mountResults(editions: any, byId: Record<number, any> = {}) {
    const state = makeState(byId);
    const w = mountComponent(EditionResults, {
        props: { editions },
        state,
        stubs: { 'b-collapse': true, 'b-card': true, 'edition-card': true },
    });
    return { w, state };
}

describe('edition-results', () => {
    it('mounted prepares editions and flips ready', async () => {
        const { w, state } = mountResults([]);
        await flush();
        expect(state.prepare.allEditions).toHaveBeenCalled();
        expect(w.vm.ready).toBe(true);
    });

    it('actualEditions is empty when the prop is null', () => {
        const { w } = mountResults(null);
        expect(w.vm.actualEditions).toEqual([]);
        expect(w.vm.title).toBe('Editions (0)');
    });

    it('actualEditions maps DTOs to found EditionInfo, dropping unknown ids', () => {
        const byId = { 1: { id: 1, name: 'A' }, 2: { id: 2, name: 'B' } };
        const { w } = mountResults([{ id: 1 }, { id: 99 }, { id: 2 }], byId);
        expect(w.vm.actualEditions.map((e: any) => e.id)).toEqual([1, 2]);
        expect(w.vm.title).toBe('Editions (2)');
    });

    it('displayedEditions is capped at the render limit', () => {
        const byId: Record<number, any> = {};
        const dtos = [] as any[];
        for (let i = 1; i <= 30; i++) { byId[i] = { id: i, name: `E${i}` }; dtos.push({ id: i }); }
        const { w } = mountResults(dtos, byId);
        expect(w.vm.actualEditions.length).toBe(30);
        expect(w.vm.displayedEditions.length).toBe(w.vm.renderLimit);
        expect(w.vm.renderLimit).toBe(24);
    });

    it('renders a card per displayed edition and a more-results notice once ready', async () => {
        const byId: Record<number, any> = {};
        const dtos = [] as any[];
        for (let i = 1; i <= 30; i++) { byId[i] = { id: i, name: `E${i}` }; dtos.push({ id: i }); }
        const { w } = mountResults(dtos, byId);
        await flush();
        expect(w.element.querySelectorAll('edition-card-stub').length).toBe(24);
        expect(w.text()).toContain('Showing the first 24 of 30');
    });

    it('renders no more-results notice when under the limit', async () => {
        const byId = { 1: { id: 1, name: 'A' } };
        const { w } = mountResults([{ id: 1 }], byId);
        await flush();
        expect(w.find('.more-results').exists()).toBe(false);
    });
});
