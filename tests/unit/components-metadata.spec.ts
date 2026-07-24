import { describe, it, expect, vi, beforeEach } from 'vitest';

const { dispose, registerModalListener } = vi.hoisted(() => {
    const d = vi.fn();
    return { dispose: d, registerModalListener: vi.fn().mockReturnValue(d) };
});
vi.mock('@/utils/modal-bus', () => ({ registerModalListener }));

import Metadata from '@/views/edition/components/metadata.vue';
import { mountComponent } from './helpers/mount';

function makeState(edition: any) {
    return {
        editions: { current: edition },
        prepare: { edition: vi.fn().mockResolvedValue(undefined) },
    };
}

function edition(over: any = {}) {
    return {
        name: 'Ed',
        copyright: 'CC',
        metadata: { manuscript: 'MS-1', composition: 'Comp$X', publication: 'Pub' },
        ...over,
    };
}

function mountModal(editionId = '5', ed: any = edition()) {
    const state = makeState(ed);
    const w = mountComponent(Metadata, {
        state,
        mocks: { $route: { params: { editionId } } },
        stubs: { 'b-modal': true },
    });
    return { w, state };
}

describe('metadata', () => {
    beforeEach(() => vi.clearAllMocks());

    it('edition / metadata / headers getters read from state', () => {
        const { w, state } = mountModal();
        expect(w.vm.edition).toBe(state.editions.current);
        expect(w.vm.metadata).toEqual(state.editions.current.metadata);
        expect(w.vm.headers.manuscript).toBe('Manuscript');
        expect(w.vm.keys).toContain('publication');
    });

    it('mounted registers the listener and prepares the edition', async () => {
        const { w, state } = mountModal('7');
        await w.vm.$nextTick();
        expect(registerModalListener).toHaveBeenCalledWith(
            'editionMetadataModal', expect.any(Function), expect.any(Function),
        );
        expect(w.vm.editionId).toBe(7);
        expect(state.prepare.edition).toHaveBeenCalledWith(7);
    });

    it('open/close callbacks toggle visibility', async () => {
        const { w } = mountModal();
        await w.vm.$nextTick();
        const [, open, close] = registerModalListener.mock.calls[0];
        open();
        expect(w.vm.visible).toBe(true);
        close();
        expect(w.vm.visible).toBe(false);
    });

    it('mounted bails out for a non-numeric editionId', async () => {
        const { w, state } = mountModal('xyz');
        await w.vm.$nextTick();
        expect(w.vm.editionId).toBeNaN();
        expect(state.prepare.edition).not.toHaveBeenCalled();
    });

    it('show sets visible and beforeUnmount disposes the listener', () => {
        const { w } = mountModal();
        w.vm.show();
        expect(w.vm.visible).toBe(true);
        w.unmount();
        expect(dispose).toHaveBeenCalled();
    });

    it('cleanString strips dollar signs', () => {
        const { w } = mountModal();
        expect(w.vm.cleanString('Comp$X')).toBe('CompX');
    });

    it('renders the metadata rows, copyright and cleaned values', () => {
        const { w } = mountModal('5', edition());
        const text = w.text();
        expect(text).toContain('Manuscript');
        expect(text).toContain('MS-1');
        expect(text).toContain('CompX'); // $ stripped
        expect(text).toContain('Copyright');
        expect(text).toContain('CC');
    });

    it('shows a dash for a missing metadata value', () => {
        const { w } = mountModal('5', edition({ metadata: { manuscript: '' } }));
        expect(w.text()).toContain('-');
    });
});
