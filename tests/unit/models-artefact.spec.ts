import { describe, it, expect, beforeEach } from 'vitest';
import { StateManager } from '@/state';
import { Artefact } from '@/models/artefact';
import { Placement } from '@/utils/Placement';
import type { ArtefactDTO, PlacementDTO } from '@/dtos/sqe-dtos';

function placement(over: Partial<PlacementDTO> = {}): PlacementDTO {
    return { scale: 1, rotate: 0, translate: { x: 100, y: 200 }, zIndex: 0, mirrored: false, ...over };
}

function makeArtefactDto(over: Partial<ArtefactDTO> = {}): ArtefactDTO {
    return {
        id: 1,
        name: 'frg 1',
        editionId: 100,
        imagedObjectId: 'IO-1',
        imageId: 1,
        artefactDataEditorId: 1,
        mask: 'POLYGON((0 0,10 0,10 10,0 10,0 0))',
        artefactMaskEditorId: 1,
        isPlaced: true,
        placement: placement(),
        artefactPlacementEditorId: 1,
        side: 'recto',
        statusMessage: '',
        ...over,
    } as ArtefactDTO;
}

// Ensure the singleton exists (constructs the reactive store).
const st = StateManager.instance;

describe('artefact — constructor', () => {
    it('maps all DTO fields', () => {
        const a = new Artefact(makeArtefactDto());
        expect(a.id).toBe(1);
        expect(a.editionId).toBe(100);
        expect(a.imagedObjectId).toBe('IO-1');
        expect(a.name).toBe('frg 1');
        expect(a.artefactMaskEditorId).toBe(1);
        expect(a.isPlaced).toBe(true);
        expect(a.side).toBe('recto');
        expect(a.placement.translate.x).toBe(100);
    });

    it('marks maskLoaded true for a non-empty mask', () => {
        expect(new Artefact(makeArtefactDto()).maskLoaded).toBe(true);
    });

    it('marks maskLoaded false and imagedObjectId empty for a mask-free virtual artefact', () => {
        const a = new Artefact(makeArtefactDto({ mask: '', imagedObjectId: undefined }));
        expect(a.maskLoaded).toBe(false);
        expect(a.imagedObjectId).toBe('');
        expect(a.isVirtual).toBe(true);
    });

    it('coerces a non-recto side to verso', () => {
        expect(new Artefact(makeArtefactDto({ side: 'verso' })).side).toBe('verso');
        expect(new Artefact(makeArtefactDto({ side: 'anything' as any })).side).toBe('verso');
    });

    it('isVirtual is false when there is an imaged object', () => {
        expect(new Artefact(makeArtefactDto()).isVirtual).toBe(false);
    });
});

describe('artefact — applyMask', () => {
    it('parses WKT and sets maskLoaded', () => {
        const a = new Artefact(makeArtefactDto({ mask: '', imagedObjectId: undefined }));
        expect(a.maskLoaded).toBe(false);
        a.applyMask('POLYGON((0 0,20 0,20 20,0 20,0 0))');
        expect(a.maskLoaded).toBe(true);
        expect(a.mask.wkt).toContain('20 20');
    });

    it('handles an empty/undefined mask string', () => {
        const a = new Artefact(makeArtefactDto());
        a.applyMask('');
        expect(a.maskLoaded).toBe(true);
        expect(a.mask.empty).toBe(true);
    });
});

describe('artefact — boundingBox', () => {
    it('derives the bounding box from the mask', () => {
        const a = new Artefact(makeArtefactDto());
        const bb = a.boundingBox;
        expect(bb.x).toBe(0);
        expect(bb.y).toBe(0);
        expect(bb.width).toBe(10);
        expect(bb.height).toBe(10);
    });
});

describe('artefact — placement helpers', () => {
    it('placeOnScroll clones the placement and marks placed', () => {
        const a = new Artefact(makeArtefactDto({ isPlaced: false }));
        const p = new Placement(placement({ translate: { x: 5, y: 6 } }));
        a.placeOnScroll(p);
        expect(a.isPlaced).toBe(true);
        expect(a.placement.translate).toEqual({ x: 5, y: 6 });
        expect(a.placement).not.toBe(p); // cloned
    });

    it('clonePlacement returns an independent copy', () => {
        const a = new Artefact(makeArtefactDto());
        const c = a.clonePlacement();
        expect(c).not.toBe(a.placement);
        expect(c.translate).toEqual(a.placement.translate);
    });

    it('prepareForBackend rounds translate to integers', () => {
        const a = new Artefact(makeArtefactDto({
            placement: placement({ translate: { x: 3.7, y: 8.2 } }),
        }));
        a.prepareForBackend();
        expect(a.placement.translate.x).toBe(4);
        expect(a.placement.translate.y).toBe(8);
    });

    it('prepareForBackend leaves zero translate untouched', () => {
        const a = new Artefact(makeArtefactDto({
            placement: placement({ translate: { x: 0, y: 0 } }),
        }));
        a.prepareForBackend();
        expect(a.placement.translate.x).toBe(0);
        expect(a.placement.translate.y).toBe(0);
    });
});

describe('artefact — calculateNewPoints', () => {
    it('returns the mask bounding box when unrotated', () => {
        const a = new Artefact(makeArtefactDto({
            mask: 'POLYGON((0 0,10 0,10 10,0 10,0 0))',
            placement: placement({ rotate: 0, translate: { x: 0, y: 0 } }),
        }));
        const bb = a.calculateNewPoints();
        expect(bb.width).toBeCloseTo(10);
        expect(bb.height).toBeCloseTo(10);
    });

    it('grows the bounding box when rotated 45 degrees', () => {
        const a = new Artefact(makeArtefactDto({
            mask: 'POLYGON((0 0,10 0,10 10,0 10,0 0))',
            placement: placement({ rotate: 45, translate: { x: 0, y: 0 } }),
        }));
        const bb = a.calculateNewPoints();
        expect(bb.width).toBeGreaterThan(10);
    });
});

describe('artefact — inViewport', () => {
    it('is false when the artefact is not placed', () => {
        const a = new Artefact(makeArtefactDto({ isPlaced: false }));
        expect(a.inViewport).toBe(false);
    });

    it('is false when there is no viewport in state', () => {
        st.scrollEditor.viewport = undefined as any;
        const a = new Artefact(makeArtefactDto({ isPlaced: true }));
        expect(a.inViewport).toBe(false);
    });

    it('is true when placed and a viewport exists', () => {
        st.scrollEditor.viewport = { x: 0, y: 0, width: 1000, height: 1000 } as any;
        const a = new Artefact(makeArtefactDto({ isPlaced: true }));
        expect(a.inViewport).toBe(true);
    });
});

describe('artefact — copyFrom', () => {
    it('copies all fields and clones textFragments array', () => {
        const src = new Artefact(makeArtefactDto({ id: 2, name: 'source', side: 'verso' }));
        src.textFragments = [{ id: 1, name: 'tf', editorId: 1 } as any];
        const dst = new Artefact(makeArtefactDto({ id: 99 }));
        dst.copyFrom(src);
        expect(dst.id).toBe(2);
        expect(dst.name).toBe('source');
        expect(dst.side).toBe('verso');
        expect(dst.textFragments).toEqual(src.textFragments);
        expect(dst.textFragments).not.toBe(src.textFragments);
    });
});
