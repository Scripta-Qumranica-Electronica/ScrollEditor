import { describe, it, expect, vi } from 'vitest';
import EditionCard from '@/views/home/components/edition-card.vue';
import { mountComponent } from './helpers/mount';

function makeEdition(over: any = {}) {
    return {
        id: 7,
        name: 'My Edition',
        thumbnail: { thumbnailUrl: 'http://img/t.jpg' },
        lastEdit: new Date('2020-01-15T00:00:00Z'),
        isPublic: false,
        ...over,
    };
}

function mountCard(edition: any) {
    const push = vi.fn();
    const resolve = vi.fn().mockReturnValue({ href: '/editions/7' });
    const w = mountComponent(EditionCard, {
        props: { edition },
        mocks: { $router: { push, resolve } },
        stubs: { 'edition-icons': true },
    });
    return { w, push, resolve };
}

describe('edition-card', () => {
    it('thumbnailSource returns the url and renders the image', () => {
        const { w } = mountCard(makeEdition());
        expect(w.vm.thumbnailSource).toBe('http://img/t.jpg');
        expect(w.find('img.card-img-top').exists()).toBe(true);
        expect(w.text()).toContain('My Edition');
        expect(w.text()).toContain('Draft');
    });

    it('renders the no-images placeholder and Published badge for a public edition', () => {
        const { w } = mountCard(makeEdition({ thumbnail: undefined, isPublic: true }));
        expect(w.vm.thumbnailSource).toBeUndefined();
        expect(w.find('img.card-img-top').exists()).toBe(false);
        expect(w.find('.no-images').exists()).toBe(true);
        expect(w.text()).toContain('Published');
    });

    it('editionEditClick navigates to the edition route', () => {
        const { w, push } = mountCard(makeEdition());
        w.vm.editionEditClick();
        expect(push).toHaveBeenCalledWith({ path: '/editions/7' });
    });

    it('editionEditRightClick resolves the link and opens a new tab', () => {
        const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
        const { w, resolve } = mountCard(makeEdition());
        w.vm.editionEditRightClick();
        expect(resolve).toHaveBeenCalledWith({ path: '/editions/7' });
        expect(openSpy).toHaveBeenCalledWith('/editions/7');
        openSpy.mockRestore();
    });

    it('editionCopyClick emits', () => {
        const { w } = mountCard(makeEdition());
        w.vm.editionCopyClick();
        const emitted = w.emitted();
        const key = Object.keys(emitted).find(k => k.toLowerCase().replace(/-/g, '') === 'editioncopyclick');
        expect(key).toBeTruthy();
    });

    describe('lastEditText', () => {
        it('is empty when there is no lastEdit', () => {
            const { w } = mountCard(makeEdition({ lastEdit: undefined }));
            expect(w.vm.lastEditText).toBe('');
        });

        it('returns Today for a same-day edit', () => {
            const { w } = mountCard(makeEdition({ lastEdit: new Date() }));
            expect(w.vm.lastEditText).toBe('Today');
        });

        it('returns Yesterday for a previous-day edit', () => {
            const y = new Date();
            y.setDate(y.getDate() - 1);
            const { w } = mountCard(makeEdition({ lastEdit: y }));
            // getDate()-based comparison: 'Yesterday' unless month/day wrap makes it ambiguous
            expect(['Yesterday']).toContain(w.vm.lastEditText);
        });

        it('returns an ISO date for an older edit', () => {
            const { w } = mountCard(makeEdition({ lastEdit: new Date('2019-06-20T00:00:00Z') }));
            expect(w.vm.lastEditText).toBe('2019-06-20');
        });
    });

    it('clicking the card and the Edit/Copy buttons fires the inline handlers', async () => {
        const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
        const { w, push } = mountCard(makeEdition());
        await w.find('.edition-card-grid').trigger('click');
        expect(push).toHaveBeenCalledWith({ path: '/editions/7' });

        const buttons = w.findAll('b-button');
        expect(buttons.length).toBe(2);
        await buttons[0].trigger('click'); // Edit
        await buttons[0].trigger('contextmenu');
        await buttons[1].trigger('click'); // Copy
        const emitted = w.emitted();
        const key = Object.keys(emitted).find(k => k.toLowerCase().replace(/-/g, '') === 'editioncopyclick');
        expect(key).toBeTruthy();
        openSpy.mockRestore();
    });
});
