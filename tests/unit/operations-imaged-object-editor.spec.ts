import { describe, it, expect, beforeEach } from 'vitest';
import { StateManager } from '@/state';
import { Artefact } from '@/models/artefact';
import { ImagedObject } from '@/models/imaged-object';
import { Polygon } from '@/utils/Polygons';
import { ImagedObjectEditorOperation } from '@/views/imaged-object-editor/operations';
import {
    ImagedObjectEditorParams,
    ArtefactEditingData,
    DrawingMode,
    EditMode,
} from '@/views/imaged-object-editor/types';
import type { ArtefactDTO, ImagedObjectDTO } from '@/dtos/sqe-dtos';

const st = StateManager.instance;

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
        placement: { scale: 1, rotate: 0, translate: { x: 100, y: 200 }, zIndex: 0, mirrored: false },
        artefactPlacementEditorId: 1,
        side: 'recto',
        statusMessage: '',
        ...over,
    } as ArtefactDTO;
}

function seedImagedObjectWithArtefact(dto: ArtefactDTO): Artefact {
    const ioDto = {
        id: 'IO-1',
        artefacts: [dto],
        recto: undefined,
        verso: undefined,
    } as unknown as ImagedObjectDTO;
    const io = new ImagedObject(ioDto, {} as any);
    st.imagedObjects.items = [io];
    st.imagedObjects.current = io;
    return io.artefacts[0];
}

// SVG values for two distinct masks
const PREV = new Polygon('M0 0L10 0 L10 10 L0 10 L0 0');
const NEXT = new Polygon('M0 0L20 0 L20 20 L0 20 L0 0');

describe('ImagedObjectEditorOperation', () => {
    beforeEach(() => {
        st.artefacts.items = [];
        st.imagedObjects.items = [];
    });

    it('redo() writes the next mask onto the artefact, undo() restores the prev mask', () => {
        const art = seedImagedObjectWithArtefact(makeArtefactDto({ id: 1 }));
        const op = new ImagedObjectEditorOperation(1, 'draw', PREV, NEXT);

        op.redo(true);
        expect(art.mask.svg).toBe(NEXT.svg);

        op.undo();
        expect(art.mask.svg).toBe(PREV.svg);

        op.redo();
        expect(art.mask.svg).toBe(NEXT.svg);
    });

    it('constructor deep-copies the prev/next polygons (not by reference)', () => {
        seedImagedObjectWithArtefact(makeArtefactDto({ id: 1 }));
        const op = new ImagedObjectEditorOperation(1, 'erase', PREV, NEXT);
        expect(op.prev).not.toBe(PREV);
        expect(op.next).not.toBe(NEXT);
        expect(op.prev.svg).toBe(PREV.svg);
        expect(op.next.svg).toBe(NEXT.svg);
    });

    it('getId() returns the artefact id', () => {
        seedImagedObjectWithArtefact(makeArtefactDto({ id: 42 }));
        const op = new ImagedObjectEditorOperation(42, 'draw', PREV, NEXT);
        expect(op.getId()).toBe(42);
    });

    it('replaceEntityId mutates the resolved artefact id', () => {
        const art = seedImagedObjectWithArtefact(makeArtefactDto({ id: 7 }));
        const op = new ImagedObjectEditorOperation(7, 'draw', PREV, NEXT);
        op.replaceEntityId(999);
        expect(art.id).toBe(999);
    });

    it('uniteWith always returns undefined (imaged-object ops never merge)', () => {
        seedImagedObjectWithArtefact(makeArtefactDto({ id: 1 }));
        const a = new ImagedObjectEditorOperation(1, 'draw', PREV, NEXT);
        const b = new ImagedObjectEditorOperation(1, 'draw', PREV, NEXT);
        expect(a.uniteWith(b)).toBeUndefined();
    });

    it('throws when the target artefact is not present in the current imaged object', () => {
        seedImagedObjectWithArtefact(makeArtefactDto({ id: 1 }));
        const op = new ImagedObjectEditorOperation(404, 'draw', PREV, NEXT);
        expect(() => op.redo(true)).toThrow(/Couldn't find artefact/);
    });

    it('needsSaving toggles across the base-class redo/undo lifecycle', () => {
        seedImagedObjectWithArtefact(makeArtefactDto({ id: 1 }));
        const op = new ImagedObjectEditorOperation(1, 'draw', PREV, NEXT);
        op.redo(true);
        expect(op.needsSaving).toBe(true);
        op.undo();
        expect(op.undone).toBe(true);
        expect(op.needsSaving).toBe(false);
        op.redo();
        expect(op.undone).toBe(false);
        expect(op.needsSaving).toBe(true);
    });
});

describe('ImagedObjectEditor types', () => {
    it('ImagedObjectEditorParams has documented defaults', () => {
        const p = new ImagedObjectEditorParams();
        expect(p.zoom).toBe(0.1);
        expect(p.background).toBe(true);
        expect(p.highLight).toBe(true);
        expect(p.drawingMode).toBe(DrawingMode.DRAW);
        expect(p.rotationAngle).toBe(0);
        expect(p.imageSettings).toEqual({});
    });

    it('DrawingMode / EditMode enums have expected members', () => {
        expect(DrawingMode.DRAW).toBe(0);
        expect(DrawingMode.ERASE).toBe(1);
        expect(EditMode.DRAWING).toBe(0);
        expect(EditMode.ADJUSTING).toBe(1);
        expect(EditMode.NONE).toBe(2);
    });

    it('ArtefactEditingData initializes empty undo/redo lists and clean flag', () => {
        const d = new ArtefactEditingData();
        expect(d.undoList).toEqual([]);
        expect(d.redoList).toEqual([]);
        expect(d.dirty).toBe(false);
    });
});
