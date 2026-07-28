import { describe, it, expect, vi } from 'vitest';

// copy-edition-modal pulls in the edition service; stub it.
vi.mock('@/views/home/components/copy-edition-modal.vue', () => ({
    default: {
        name: 'copy-edition-modal',
        props: ['modelValue'],
        emits: ['update:modelValue'],
        template: '<div class="copy-modal-stub"></div>',
    },
}));

import EditionList from '@/views/home/components/edition-list.vue';
import { mountComponent } from './helpers/mount';

function makeEditions(n: number) {
    return Array.from({ length: n }, (_, i) => ({
        id: i + 1,
        name: `Ed ${i + 1}`,
        thumbnail: undefined,
        lastEdit: new Date('2020-01-01T00:00:00Z'),
        isPublic: false,
    }));
}

function mountList(editions: any[], title = 'My editions') {
    const state: any = { editions: { current: null } };
    const w = mountComponent(EditionList, {
        props: { title, editions },
        state,
        stubs: { 'edition-card': true },
    });
    return { w, state };
}

describe('edition-list', () => {
    it('renders the title and a card per edition', () => {
        const { w } = mountList(makeEditions(3));
        expect(w.text()).toContain('My editions');
        expect(w.element.querySelectorAll('edition-card-stub').length).toBe(3);
    });

    it('renders no cards when the list is empty', () => {
        const { w } = mountList([]);
        expect(w.element.querySelectorAll('edition-card').length).toBe(0);
    });

    it('openCopyEditionModal sets current and shows the modal', () => {
        const { w, state } = mountList(makeEditions(2));
        expect(w.vm.copyModalVisible).toBe(false);
        const edition = w.props('editions')[1];
        w.vm.openCopyEditionModal(edition);
        expect(state.editions.current).toBe(edition);
        expect(w.vm.copyModalVisible).toBe(true);
    });

    it('the card edition-copy-click listener opens the modal', async () => {
        const { w, state } = mountList(makeEditions(2));
        const cards = w.findAll('edition-card-stub');
        await cards[0].trigger('edition-copy-click');
        expect(state.editions.current.id).toBe(1);
        expect(w.vm.copyModalVisible).toBe(true);
    });
});
