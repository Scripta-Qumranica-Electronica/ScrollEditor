import { describe, it, expect, vi } from 'vitest';
import ImagedObjectCard from '@/views/edition/components/imaged-object-card.vue';
import { mountComponent } from './helpers/mount';

function makeImagedObject(over: any = {}) {
    return {
        id: 'IO/1?x=2',
        name: 'Plate 1',
        recto: { master: { getThumbnailUrl: vi.fn().mockReturnValue('http://img/thumb600') } },
        ...over,
    };
}

function mountCard(imagedObject: any, editionId: number | null = 33) {
    const state = { editions: { current: editionId === null ? undefined : { id: editionId } } };
    return mountComponent(ImagedObjectCard, {
        props: { imagedObject },
        state,
        stubs: { 'router-link': true },
    });
}

describe('imaged-object-card', () => {
    it('imageUrl reads the recto master thumbnail at 600px', () => {
        const io = makeImagedObject();
        const w = mountCard(io);
        expect(w.vm.imageUrl).toBe('http://img/thumb600');
        expect(io.recto.master.getThumbnailUrl).toHaveBeenCalledWith(600);
    });

    it('imageUrl is undefined when there is no recto master', () => {
        const w = mountCard(makeImagedObject({ recto: undefined }));
        expect(w.vm.imageUrl).toBeUndefined();
        expect(w.find('img.card-img-top').exists()).toBe(false);
    });

    it('imageObjectId is URL-encoded', () => {
        const w = mountCard(makeImagedObject({ id: 'IO/1?x=2' }));
        expect(w.vm.imageObjectId).toBe(encodeURIComponent('IO/1?x=2'));
    });

    it('editionId reads the current edition id, undefined when none', () => {
        expect(mountCard(makeImagedObject(), 77).vm.editionId).toBe(77);
        expect(mountCard(makeImagedObject(), null).vm.editionId).toBeUndefined();
    });

    it('renders the image and the imaged-object name', () => {
        const w = mountCard(makeImagedObject({ name: 'Plate 7' }));
        expect(w.find('img.card-img-top').attributes('src')).toBe('http://img/thumb600');
        expect(w.text()).toContain('Plate 7');
    });
});
