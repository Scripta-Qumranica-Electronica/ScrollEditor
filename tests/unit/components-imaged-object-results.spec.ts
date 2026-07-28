import { describe, it, expect, vi } from 'vitest';

vi.mock('@/services/search', () => ({ default: class {} }));

import ImagedObjectResults from '@/views/search/imaged-object-results.vue';
import { mountComponent } from './helpers/mount';

const flush = async () => { for (let i = 0; i < 5; i++) { await Promise.resolve(); } };

function makeState(byId: Record<number, any>) {
    return {
        editions: { find: vi.fn((id: number) => byId[id]) },
        prepare: { allEditions: vi.fn().mockResolvedValue(undefined) },
    };
}

function mountResults(imagedObjects: any, byId: Record<number, any> = {}) {
    const state = makeState(byId);
    const w = mountComponent(ImagedObjectResults, {
        props: { imagedObjects },
        state,
        stubs: { 'b-collapse': true, 'b-card': true, 'router-link': true },
    });
    return { w, state };
}

describe('imaged-object-results', () => {
    it('mounted prepares editions and flips ready', async () => {
        const { w, state } = mountResults([]);
        await flush();
        expect(state.prepare.allEditions).toHaveBeenCalled();
        expect(w.vm.ready).toBe(true);
    });

    it('title reports the count and expandedObjects is empty for null', () => {
        const { w } = mountResults(null);
        expect(w.vm.title).toBe('Imaged Objects (0)');
        expect(w.vm.expandedObjects).toEqual([]);
    });

    it('expandedObjects attaches found editions for each imaged object', () => {
        const byId = { 1: { id: 1, name: 'Ed A' }, 2: { id: 2, name: 'Ed B' } };
        const ios = [{ id: 'IO-1', editionIds: [1, 2] }];
        const { w } = mountResults(ios, byId);
        const expanded = w.vm.expandedObjects;
        expect(expanded.length).toBe(1);
        expect(expanded[0].editions.map((e: any) => e.id)).toEqual([1, 2]);
        expect(expanded[0].id).toBe('IO-1');
    });

    it('editions stays null when the imaged object has no editionIds', () => {
        const { w } = mountResults([{ id: 'IO-1' }]);
        expect(w.vm.expandedObjects[0].editions).toBeNull();
    });

    it('warns and skips edition ids that cannot be located', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const byId = { 1: { id: 1, name: 'Ed A' } };
        const { w } = mountResults([{ id: 'IO-1', editionIds: [1, 99] }], byId);
        const expanded = w.vm.expandedObjects;
        expect(expanded[0].editions.map((e: any) => e.id)).toEqual([1]);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('99'));
        warn.mockRestore();
    });

    it('leaves editions null when every id is missing', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const { w } = mountResults([{ id: 'IO-1', editionIds: [42] }], {});
        expect(w.vm.expandedObjects[0].editions).toBeNull();
        warn.mockRestore();
    });

    it('renders a card, edition link and thumbnail per imaged object', () => {
        const byId = { 1: { id: 1, name: 'Ed A' } };
        const ios = [{ id: 'IO-1', editionIds: [1], rectoThumbnail: 'http://img/r' }];
        const { w } = mountResults(ios, byId);
        expect(w.element.querySelectorAll('b-card-stub').length).toBe(1);
        expect(w.text()).toContain('IO-1');
        expect(w.text()).toContain('Ed A');
        expect(w.find('img.card-img').attributes('src')).toBe('http://img/r');
    });

    it('falls back to the verso thumbnail when there is no recto', () => {
        const { w } = mountResults([{ id: 'IO-2', versoThumbnail: 'http://img/v' }]);
        expect(w.find('img.card-img').attributes('src')).toBe('http://img/v');
    });
});
