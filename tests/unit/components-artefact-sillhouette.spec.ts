import { describe, it, expect } from 'vitest';
import ArtefactSillhouette from '@/views/scroll-editor/artefact-sillhouette.vue';
import { mountComponent } from './helpers/mount';

function makeArtefact(over: any = {}) {
    return {
        id: over.id ?? 1,
        inViewport: over.inViewport ?? false,
        placement: over.placement ?? {
            zIndex: 0,
            scale: 1,
            rotate: 0,
            translate: { x: 0, y: 0 },
        },
        mask: {
            svg: over.svg ?? 'M0 0 L10 0 L10 10 Z',
            getBoundingBox: () => ({ x: 0, y: 0, width: 10, height: 10 }),
        },
    } as any;
}

function mountSillhouette(artefact: any) {
    return mountComponent(ArtefactSillhouette, { props: { artefact } });
}

describe('artefact-sillhouette', () => {
    it('created builds an ArtefactTransformer for the artefact', () => {
        const artefact = makeArtefact();
        const w = mountSillhouette(artefact);
        expect(w.vm.transformer).toBeTruthy();
        expect(w.vm.transformer!.artefact).toStrictEqual(artefact);
    });

    it('inViewport reflects the artefact flag', () => {
        expect(mountSillhouette(makeArtefact({ inViewport: true })).vm.inViewport).toBe(true);
        expect(mountSillhouette(makeArtefact({ inViewport: false })).vm.inViewport).toBe(false);
    });

    it('renders the clip-path defs + silhouette path from the mask svg', () => {
        const w = mountSillhouette(makeArtefact({ id: 7 }));
        expect(w.find('#path-7').exists()).toBe(true);
        expect(w.find('#clip-path-7').exists()).toBe(true);
        expect(w.find('path.sillhouette').exists()).toBe(true);
    });

    it('applies the artefact transform to the root group', () => {
        const w = mountSillhouette(
            makeArtefact({ placement: { zIndex: 0, scale: 2, rotate: 0, translate: { x: 0, y: 0 } } })
        );
        // With scale set, artefactTransform returns a non-empty transform string.
        expect(w.find('g').attributes('transform')).toContain('scale(2)');
    });

    it('renders a pink fill style while inViewport', () => {
        const w = mountSillhouette(makeArtefact({ inViewport: true }));
        expect(w.find('path.sillhouette').attributes('style')).toContain('pink');
    });

    it('renders a transparent-blue fill style while out of viewport', () => {
        const w = mountSillhouette(makeArtefact({ inViewport: false }));
        expect(w.find('path.sillhouette').attributes('style')).toContain('blue');
    });
});
