import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import EditionPublicList from '@/views/home/components/edition-public-list.vue';
import { mountComponent } from './helpers/mount';

function makeEditions(n: number) {
    return Array.from({ length: n }, (_, i) => ({ id: i + 1, name: `Ed ${i + 1}` }));
}

function mountList(editions: any[]) {
    return mountComponent(EditionPublicList, {
        props: { editions },
        stubs: { 'edition-public-row': true },
    });
}

describe('edition-public-list', () => {
    afterEach(() => vi.restoreAllMocks());

    it('totalHeight is rowCount * rowHeight', () => {
        const w = mountList(makeEditions(10)); // ceil(10/4)=3 rows
        expect(w.vm.rowHeight).toBeGreaterThan(0);
        expect(w.vm.totalHeight).toBe(3 * w.vm.rowHeight);
    });

    it('totalHeight is zero for an empty list', () => {
        const w = mountList([]);
        expect(w.vm.totalHeight).toBe(0);
    });

    it('visibleIndices returns COLUMN-multiple start indices', () => {
        const w = mountList(makeEditions(40)); // 10 rows
        const idx = w.vm.visibleIndices;
        expect(idx.length).toBeGreaterThan(0);
        expect(idx[0]).toBe(0);
        idx.forEach((v: number) => expect(v % 4).toBe(0));
        // never past the last row start (9*4 = 36)
        expect(Math.max(...idx)).toBeLessThanOrEqual(36);
    });

    it('onScroll updates the windowed indices', async () => {
        const w = mountList(makeEditions(400)); // 100 rows
        (w.vm as any).rowHeight = 100;
        w.vm.onScroll({ target: { scrollTop: 5000 } } as any);
        await w.vm.$nextTick();
        // scrollTop/rowHeight = 50, minus overscan 4 -> firstRow 46 -> index 184
        expect(w.vm.visibleIndices[0]).toBe(46 * 4);
    });

    it('visibleIndices uses the default row height when rowHeight is zero', () => {
        const w = mountList(makeEditions(40));
        (w.vm as any).rowHeight = 0;
        // falls back to DEFAULT_ROW_HEIGHT; still yields valid COLUMN-multiple indices
        const idx = w.vm.visibleIndices;
        expect(idx[0]).toBe(0);
        idx.forEach((v: number) => expect(v % 4).toBe(0));
    });

    it('onScroll clamps to zero near the top (overscan floor)', async () => {
        const w = mountList(makeEditions(400));
        (w.vm as any).rowHeight = 100;
        w.vm.onScroll({ target: { scrollTop: 0 } } as any);
        await w.vm.$nextTick();
        expect(w.vm.visibleIndices[0]).toBe(0);
    });

    it('onResize re-measures without throwing and keeps rowHeight when nothing is measurable', () => {
        const w = mountList(makeEditions(8));
        const before = w.vm.rowHeight;
        expect(() => (w.vm as any).onResize()).not.toThrow();
        // No measurable .vlist-row in the detached DOM -> rowHeight is unchanged.
        expect(w.vm.rowHeight).toBe(before);
    });

    it('re-measures when editions change', async () => {
        const w = mountList(makeEditions(4));
        const spy = vi.spyOn(w.vm as any, 'measureRow');
        await w.setProps({ editions: makeEditions(12) });
        await w.vm.$nextTick();
        expect(spy).toHaveBeenCalled();
    });

    it('emits show-copy-modal upward from a row', async () => {
        const w = mountList(makeEditions(4));
        const row = w.findAll('edition-public-row-stub');
        expect(row.length).toBeGreaterThan(0);
        await row[0].trigger('show-copy-modal');
        expect(w.emitted('show-copy-modal')).toBeTruthy();
    });

    it('removes the resize listener on unmount', () => {
        const remove = vi.spyOn(window, 'removeEventListener');
        const w = mountList(makeEditions(4));
        w.unmount();
        expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
    });
});
