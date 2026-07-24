import { describe, it, expect, vi, beforeEach } from 'vitest';

const { dispose, registerModalListener } = vi.hoisted(() => {
    const d = vi.fn();
    return { dispose: d, registerModalListener: vi.fn().mockReturnValue(d) };
});
vi.mock('@/utils/modal-bus', () => ({ registerModalListener }));

import Copyright from '@/views/edition/components/copyright.vue';
import { mountComponent } from './helpers/mount';

function makeState(edition: any = { name: 'Ed', copyright: 'Rights reserved' }) {
    return {
        editions: { current: edition },
        prepare: { edition: vi.fn().mockResolvedValue(undefined) },
    };
}

function mountModal(editionId = '5', edition?: any) {
    const state = makeState(edition);
    const w = mountComponent(Copyright, {
        state,
        mocks: { $route: { params: { editionId } } },
        stubs: { 'b-modal': true },
    });
    return { w, state };
}

describe('copyright', () => {
    beforeEach(() => vi.clearAllMocks());

    it('edition getter returns the current edition', () => {
        const { w, state } = mountModal();
        expect(w.vm.edition).toBe(state.editions.current);
    });

    it('mounted registers the modal listener and prepares the edition', async () => {
        const { w, state } = mountModal('7');
        await w.vm.$nextTick();
        expect(registerModalListener).toHaveBeenCalledWith(
            'editionCopyrightInfoModal', expect.any(Function), expect.any(Function),
        );
        expect(w.vm.editionId).toBe(7);
        expect(state.prepare.edition).toHaveBeenCalledWith(7);
    });

    it('the registered open/close callbacks toggle visibility', async () => {
        const { w } = mountModal();
        await w.vm.$nextTick();
        const [, open, close] = registerModalListener.mock.calls[0];
        open();
        expect(w.vm.visible).toBe(true);
        close();
        expect(w.vm.visible).toBe(false);
    });

    it('mounted bails out for a non-numeric editionId without preparing', async () => {
        const { w, state } = mountModal('not-a-number');
        await w.vm.$nextTick();
        expect(w.vm.editionId).toBeNaN();
        expect(state.prepare.edition).not.toHaveBeenCalled();
    });

    it('show() sets visible true', () => {
        const { w } = mountModal();
        w.vm.show();
        expect(w.vm.visible).toBe(true);
    });

    it('cleanString strips dollar signs', () => {
        const { w } = mountModal();
        expect(w.vm.cleanString('a$b$c')).toBe('abc');
    });

    it('beforeUnmount disposes the modal listener', () => {
        const { w } = mountModal();
        w.unmount();
        expect(dispose).toHaveBeenCalled();
    });

    it('renders the modal with a copyright and the no-info placeholder without', () => {
        const withRights = mountModal('5', { name: 'A', copyright: 'MIT' });
        expect(withRights.w.text()).toContain('MIT');
        const without = mountModal('5', { name: 'A', copyright: '' });
        expect(without.w.text()).toContain('No Additional Information');
    });
});
