import { describe, it, expect, vi } from 'vitest';
import EditionPublicCard from '@/views/home/components/edition-public-card.vue';
import { mountComponent } from './helpers/mount';

function makeEdition(over: any = {}) {
    return {
        id: 42,
        name: 'Public Edition',
        thumbnail: { thumbnailUrl: 'http://img/thumb.jpg' },
        lastEdit: new Date('2021-05-03T00:00:00Z'),
        ...over,
    };
}

function mountCard(edition: any) {
    const push = vi.fn();
    const w = mountComponent(EditionPublicCard, {
        props: { edition },
        mocks: { $router: { push } },
        stubs: { 'edition-icons': true },
    });
    return { w, push };
}

describe('edition-public-card', () => {
    it('exposes the thumbnail url and renders the image', () => {
        const { w } = mountCard(makeEdition());
        expect(w.vm.thumbnailSource).toBe('http://img/thumb.jpg');
        expect(w.find('img.card-img-top').exists()).toBe(true);
        expect(w.text()).toContain('Public Edition');
    });

    it('renders the no-images placeholder when there is no thumbnail', () => {
        const { w } = mountCard(makeEdition({ thumbnail: undefined }));
        expect(w.vm.thumbnailSource).toBeUndefined();
        expect(w.find('img.card-img-top').exists()).toBe(false);
        expect(w.find('.no-images').exists()).toBe(true);
    });

    it('editionViewClick navigates to the edition route', () => {
        const { w, push } = mountCard(makeEdition());
        w.vm.editionViewClick();
        expect(push).toHaveBeenCalledWith({ path: '/editions/42' });
    });

    it('editionCopyClick emits the event', () => {
        const { w } = mountCard(makeEdition());
        w.vm.editionCopyClick();
        const emitted = w.emitted();
        const key = Object.keys(emitted).find(k => k.toLowerCase().replace(/-/g, '') === 'editioncopyclick');
        expect(key).toBeTruthy();
        expect((emitted[key!] as any[])[0]).toEqual([true]);
    });

    it('clicking the card navigates', async () => {
        const { w, push } = mountCard(makeEdition());
        await w.find('.edition-public-grid').trigger('click');
        expect(push).toHaveBeenCalledWith({ path: '/editions/42' });
    });

    it('the View button navigates and the Copy button emits (inline handlers)', async () => {
        const { w, push } = mountCard(makeEdition());
        const buttons = w.findAll('b-button');
        expect(buttons.length).toBe(2);
        await buttons[0].trigger('click'); // View
        expect(push).toHaveBeenCalledWith({ path: '/editions/42' });
        await buttons[1].trigger('click'); // Copy
        const emitted = w.emitted();
        const key = Object.keys(emitted).find(k => k.toLowerCase().replace(/-/g, '') === 'editioncopyclick');
        expect(key).toBeTruthy();
    });

    it('renders the last-edit date, blank when missing', () => {
        const { w } = mountCard(makeEdition());
        expect(w.text()).toContain('May 03 2021');
        const { w: w2 } = mountCard(makeEdition({ lastEdit: undefined }));
        expect(w2.text()).toContain('Published:');
    });
});
