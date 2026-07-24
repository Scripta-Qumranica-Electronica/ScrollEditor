import { describe, it, expect } from 'vitest';
import { Artefact } from '@/models/artefact';
import type { ArtefactDTO } from '@/dtos/sqe-dtos';

// The transformer is not exported by name; it is a default-less named export.
import { ArtefactTransformer } from '@/utils/artefact-transformer';

function makeArtefact(over: Partial<ArtefactDTO> = {}): Artefact {
    const dto = {
        id: 1,
        name: 'frg 1',
        editionId: 100,
        imagedObjectId: 'IO-1',
        imageId: 1,
        artefactDataEditorId: 1,
        // 0..10 square -> bounding box (0,0,10,10), center (5,5)
        mask: 'POLYGON((0 0,10 0,10 10,0 10,0 0))',
        artefactMaskEditorId: 1,
        isPlaced: true,
        placement: { scale: 1, rotate: 0, translate: { x: 100, y: 200 }, zIndex: 0, mirrored: false },
        artefactPlacementEditorId: 1,
        side: 'recto',
        statusMessage: '',
        ...over,
    } as ArtefactDTO;
    return new Artefact(dto);
}

describe('ArtefactTransformer - croppedImageTransform', () => {
    it('translates by the mask bounding-box origin', () => {
        const art = makeArtefact({
            mask: 'POLYGON((5 7,15 7,15 27,5 27,5 7))',
        });
        const t = new ArtefactTransformer(art);
        expect(t.croppedImageTransform).toBe('translate(5 7)');
    });
});

describe('ArtefactTransformer - artefactTransform', () => {
    it('returns an empty string when scale is 0 (falsy)', () => {
        const art = makeArtefact({
            placement: { scale: 0, rotate: 0, translate: { x: 0, y: 0 }, zIndex: 0, mirrored: false },
        });
        const t = new ArtefactTransformer(art);
        expect(t.artefactTransform).toBe('');
    });

    it('composes translate/rotate/scale in SVG right-to-left order', () => {
        const art = makeArtefact({
            placement: { scale: 2, rotate: 30, translate: { x: 100, y: 200 }, zIndex: 0, mirrored: false },
        });
        const t = new ArtefactTransformer(art);
        const transform = t.artefactTransform;

        // bounding box is (0,0,10,10) -> center (5,5), half-extent (5,5)
        // translateToPlace = (width/2 + tx, height/2 + ty) = (105, 205)
        // translateToZero = (-midX, -midY) = (-5, -5)
        expect(transform).toBe('translate(105, 205) rotate(30) scale(2) translate(-5, -5)');
    });

    it('reflects a non-zero mask origin in the zero-translate', () => {
        const art = makeArtefact({
            mask: 'POLYGON((10 20,30 20,30 60,10 60,10 20))', // bbox (10,20,20,40) center (20,40)
            placement: { scale: 1, rotate: 0, translate: { x: 0, y: 0 }, zIndex: 0, mirrored: false },
        });
        const t = new ArtefactTransformer(art);
        // half extents: width/2 = 10, height/2 = 20 -> translateToPlace (10, 20)
        // translateToZero (-20, -40)
        expect(t.artefactTransform).toBe('translate(10, 20) rotate(0) scale(1) translate(-20, -40)');
    });
});
