import { describe, it, expect, beforeEach } from 'vitest';
import { StateManager } from '@/state';
import { Artefact } from '@/models/artefact';
import {
    TextFragmentData,
    TextFragment,
    TextEdition,
    Line,
    Sign,
    SignInterpretation,
    InterpretationRoi,
    ArtefactTextFragmentData,
} from '@/models/text';
import { Polygon } from '@/utils/Polygons';
import type {
    ArtefactDTO,
    LineDTO,
    SignDTO,
    SignInterpretationDTO,
    TextFragmentDTO,
    TextEditionDTO,
    InterpretationRoiDTO,
    InterpretationAttributeDTO,
} from '@/dtos/sqe-dtos';

const st = StateManager.instance;

// ---- DTO builders -------------------------------------------------------

function attr(over: Partial<InterpretationAttributeDTO> = {}): InterpretationAttributeDTO {
    return {
        interpretationAttributeId: 1,
        attributeId: 1,
        attributeValueId: 1,
        attributeString: 'x',
        attributeValueString: 'y',
        creatorId: 0,
        editorId: 0,
        ...over,
    } as InterpretationAttributeDTO;
}

function siDto(over: Partial<SignInterpretationDTO> = {}): SignInterpretationDTO {
    return {
        signId: 1,
        signInterpretationId: 100,
        isVariant: false,
        character: 'a',
        nextSignInterpretations: [],
        attributes: [],
        rois: [],
        ...over,
    } as SignInterpretationDTO;
}

function signDto(over: Partial<SignDTO> = {}): SignDTO {
    return { signInterpretations: [siDto()], ...over };
}

function lineDto(over: Partial<LineDTO> = {}): LineDTO {
    return { lineId: 1, lineName: 'L1', editorId: 1, signs: [signDto()], ...over };
}

function tfDto(over: Partial<TextFragmentDTO> = {}): TextFragmentDTO {
    return { textFragmentId: 1, textFragmentName: 'TF1', editorId: 1, lines: [lineDto()], ...over };
}

function roiDto(over: Partial<InterpretationRoiDTO> = {}): InterpretationRoiDTO {
    return {
        interpretationRoiId: 500,
        artefactId: 1,
        signInterpretationId: 100,
        shape: 'POLYGON((0 0,10 0,10 10,0 10,0 0))',
        translate: { x: 3, y: 4 },
        stanceRotation: 0,
        exceptional: false,
        valuesSet: true,
        creatorId: 0,
        editorId: 0,
        ...over,
    } as InterpretationRoiDTO;
}

function makeArtefactDto(over: Partial<ArtefactDTO> = {}): ArtefactDTO {
    return {
        id: 1, name: 'a', editionId: 100, imagedObjectId: 'IO-1', imageId: 1,
        artefactDataEditorId: 1, mask: 'POLYGON((0 0,10 0,10 10,0 10,0 0))',
        artefactMaskEditorId: 1, isPlaced: true,
        placement: { scale: 1, rotate: 0, translate: { x: 0, y: 0 }, zIndex: 0, mirrored: false },
        artefactPlacementEditorId: 1, side: 'recto', statusMessage: '',
        ...over,
    } as ArtefactDTO;
}

// ---- Tests --------------------------------------------------------------

describe('text — TextFragmentData & ArtefactTextFragmentData', () => {
    it('TextFragmentData maps id/name/editorId', () => {
        const t = new TextFragmentData({ id: 3, name: 'n', editorId: 9 });
        expect(t.id).toBe(3);
        expect(t.name).toBe('n');
        expect(t.editorId).toBe(9);
    });

    it('ArtefactTextFragmentData: suggested=true => certain false', () => {
        const a = new ArtefactTextFragmentData({ id: 1, name: 'n', editorId: 1, suggested: true });
        expect(a.suggested).toBe(true);
        expect(a.certain).toBe(false);
    });

    it('ArtefactTextFragmentData: suggested=false => certain true', () => {
        const a = new ArtefactTextFragmentData({ id: 1, name: 'n', editorId: 1, suggested: false });
        expect(a.certain).toBe(true);
    });

    it('createFromEditionTextFragment produces a non-suggested, non-certain entry', () => {
        const tf = new TextFragmentData({ id: 7, name: 'edt', editorId: 2 });
        const atf = ArtefactTextFragmentData.createFromEditionTextFragment(tf);
        expect(atf.id).toBe(7);
        expect(atf.name).toBe('edt');
        expect(atf.suggested).toBe(false);
        expect(atf.certain).toBe(false);
    });
});

describe('text — TextFragment', () => {
    it('constructs and builds lines', () => {
        const tf = new TextFragment(tfDto());
        expect(tf.textFragmentId).toBe(1);
        expect(tf.id).toBe(1);
        expect(tf.textFragmentName).toBe('TF1');
        expect(tf.lines).toHaveLength(1);
        expect(tf.lines[0]).toBeInstanceOf(Line);
    });

    it('defaults to empty lines when none supplied', () => {
        const dto = tfDto();
        delete (dto as any).lines;
        expect(new TextFragment(dto).lines).toEqual([]);
    });
});

describe('text — TextEdition', () => {
    function teDto(over: Partial<TextEditionDTO> = {}): TextEditionDTO {
        return {
            manuscriptId: 5, editionName: 'E', editorId: 1, licence: 'CC',
            editors: {}, textFragments: [tfDto()], ...over,
        };
    }

    it('constructs from a DTO', () => {
        const te = new TextEdition(teDto());
        expect(te.manuscriptId).toBe(5);
        expect(te.editionName).toBe('E');
        expect(te.licence).toBe('CC');
        expect(te.textFragments).toHaveLength(1);
        expect(te.textFragments[0]).toBeInstanceOf(TextFragment);
    });

    it('defaults to empty textFragments', () => {
        const dto = teDto();
        delete (dto as any).textFragments;
        expect(new TextEdition(dto).textFragments).toEqual([]);
    });

    it('copyFrom path clones an existing TextEdition', () => {
        const orig = new TextEdition(teDto());
        const copy = new TextEdition(orig);
        expect(copy.manuscriptId).toBe(orig.manuscriptId);
        expect(copy.editionName).toBe(orig.editionName);
        expect(copy.textFragments).toBe(orig.textFragments);
    });
});

describe('text — Line signs manipulation', () => {
    it('builds signs from DTO with indices', () => {
        const tf = new TextFragment(tfDto({
            lines: [lineDto({ signs: [signDto(), signDto()] })],
        }));
        const line = tf.lines[0];
        expect(line.signs).toHaveLength(2);
        expect(line.signs[0].indexInLine).toBe(0);
        expect(line.signs[1].indexInLine).toBe(1);
    });

    it('defaults to empty signs when none supplied', () => {
        const dto = lineDto();
        delete (dto as any).signs;
        const tf = new TextFragment(tfDto({ lines: [dto] }));
        expect(tf.lines[0].signs).toEqual([]);
    });

    it('addSign inserts and reindexes following signs', () => {
        const tf = new TextFragment(tfDto({ lines: [lineDto({ signs: [signDto(), signDto()] })] }));
        const line = tf.lines[0];
        const newSign = new Sign(signDto(), line, 1);
        line.addSign(newSign);
        expect(line.signs).toHaveLength(3);
        expect(line.signs[1]).toBe(newSign);
        expect(line.signs[2].indexInLine).toBe(2);
    });

    it('addSign throws if the sign is not attached to this line', () => {
        const tf = new TextFragment(tfDto());
        const otherTf = new TextFragment(tfDto());
        const stray = new Sign(signDto(), otherTf.lines[0], 0);
        expect(() => tf.lines[0].addSign(stray)).toThrow(/attached to this line/);
    });

    it('addSign throws on a negative index', () => {
        const tf = new TextFragment(tfDto({ lines: [lineDto({ signs: [] })] }));
        const line = tf.lines[0];
        const sign = new Sign(signDto(), line, -1);
        expect(() => line.addSign(sign)).toThrow(/negative index/);
    });

    it('removeSign removes and reindexes', () => {
        const tf = new TextFragment(tfDto({ lines: [lineDto({ signs: [signDto(), signDto(), signDto()] })] }));
        const line = tf.lines[0];
        const target = line.signs[1];
        line.removeSign(target);
        expect(line.signs).toHaveLength(2);
        expect(line.signs[1].indexInLine).toBe(1);
    });

    it('removeSign throws when the sign belongs to another line', () => {
        const tf = new TextFragment(tfDto());
        const other = new TextFragment(tfDto());
        expect(() => tf.lines[0].removeSign(other.lines[0].signs[0])).toThrow(/different line/);
    });

    it('removeSign throws on an out-of-range index', () => {
        const tf = new TextFragment(tfDto());
        const line = tf.lines[0];
        const sign = line.signs[0];
        sign.indexInLine = 99;
        expect(() => line.removeSign(sign)).toThrow(/out of range/);
    });
});

describe('text — Sign', () => {
    it('builds sign interpretations', () => {
        const tf = new TextFragment(tfDto());
        const sign = tf.lines[0].signs[0];
        expect(sign.signInterpretations).toHaveLength(1);
        expect(sign.signInterpretations[0]).toBeInstanceOf(SignInterpretation);
    });

    it('defaults to empty interpretations when none supplied', () => {
        const dto = signDto();
        delete (dto as any).signInterpretations;
        const tf = new TextFragment(tfDto({ lines: [lineDto({ signs: [dto] })] }));
        expect(tf.lines[0].signs[0].signInterpretations).toEqual([]);
    });
});

describe('text — SignInterpretation', () => {
    function makeSI(over: Partial<SignInterpretationDTO> = {}): SignInterpretation {
        const tf = new TextFragment(tfDto({ lines: [lineDto({ signs: [signDto({ signInterpretations: [siDto(over)] })] })] }));
        return tf.lines[0].signs[0].signInterpretations[0];
    }

    it('maps base fields with defaults', () => {
        const si = makeSI();
        expect(si.signInterpretationId).toBe(100);
        expect(si.id).toBe(100);
        expect(si.character).toBe('a');
        expect(si.commentary).toBeNull();
        expect(si.signStreamSectionIds).toEqual([]);
        expect(si.qwbWordIds).toEqual([]);
        expect(si.rois).toEqual([]);
    });

    it('extracts commentary text and section/word ids', () => {
        const si = makeSI({
            commentary: { commentary: 'hello', creatorId: 0, editorId: 0 },
            signStreamSectionIds: [1, 2],
            qwbWordIds: [9],
        });
        expect(si.commentary).toBe('hello');
        expect(si.signStreamSectionIds).toEqual([1, 2]);
        expect(si.qwbWordIds).toEqual([9]);
    });

    it('builds ROIs from DTO', () => {
        const si = makeSI({ rois: [roiDto()] });
        expect(si.rois).toHaveLength(1);
        expect(si.rois[0]).toBeInstanceOf(InterpretationRoi);
    });

    it('nextAvailableId decrements the shared counter', () => {
        const first = SignInterpretation.nextAvailableId;
        const second = SignInterpretation.nextAvailableId;
        expect(second).toBe(first - 1);
    });

    it('artefactRoi finds the ROI for a given artefact', () => {
        const si = makeSI({ rois: [roiDto({ artefactId: 1 }), roiDto({ interpretationRoiId: 501, artefactId: 2 })] });
        const art = new Artefact(makeArtefactDto({ id: 2 }));
        expect(si.artefactRoi(art)!.artefactId).toBe(2);
        const missing = new Artefact(makeArtefactDto({ id: 999 }));
        expect(si.artefactRoi(missing)).toBeUndefined();
    });

    it('deleteRoi removes a matching ROI (and is a no-op otherwise)', () => {
        const si = makeSI({ rois: [roiDto({ interpretationRoiId: 500 })] });
        const toDelete = si.rois[0];
        si.deleteRoi({ id: 999 } as any);
        expect(si.rois).toHaveLength(1);
        si.deleteRoi(toDelete);
        expect(si.rois).toHaveLength(0);
    });

    it('findAttributeIndex locates an attribute by valueId', () => {
        const si = makeSI({ attributes: [attr({ attributeValueId: 55 })] });
        expect(si.findAttributeIndex(55)).toBe(0);
        expect(si.findAttributeIndex(1234)).toBe(-1);
    });

    it('isReconstructed getter reflects the attribute presence', () => {
        const plain = makeSI();
        expect(plain.isReconstructed).toBe(false);
        const recon = makeSI({ attributes: [attr({ attributeString: 'is_reconstructed' })] });
        expect(recon.isReconstructed).toBe(true);
    });

    it('isReconstructed setter toggles the attribute', () => {
        const si = makeSI();
        si.isReconstructed = true;
        expect(si.isReconstructed).toBe(true);
        expect(si.attributes.some(a => a.attributeId === 6)).toBe(true);
        si.isReconstructed = false;
        expect(si.isReconstructed).toBe(false);
        expect(si.attributes.some(a => a.attributeId === 6)).toBe(false);
    });

    it('signType getter falls back based on character when absent', () => {
        expect(makeSI({ character: 'x' }).signType).toEqual([1, 'LETTER']);
        expect(makeSI({ character: ' ' }).signType).toEqual([2, 'SPACE']);
    });

    it('signType getter reads an explicit sign_type attribute', () => {
        const si = makeSI({
            attributes: [attr({ attributeString: 'sign_type', attributeValueId: 3, attributeValueString: 'FOO' })],
        });
        expect(si.signType).toEqual([3, 'FOO']);
    });

    it('signType setter adds a new attribute when absent', () => {
        const si = makeSI({ attributes: [] });
        si.signType = [5, 'NEW'];
        expect(si.signType).toEqual([5, 'NEW']);
    });

    it('signType setter updates an existing attribute', () => {
        const si = makeSI({
            attributes: [attr({ attributeString: 'sign_type', attributeValueId: 1, attributeValueString: 'OLD' })],
        });
        si.signType = [9, 'UPDATED'];
        expect(si.signType).toEqual([9, 'UPDATED']);
    });

    it('htmlCharacter returns nbsp for space / non-letters and the char for letters', () => {
        expect(makeSI({ character: ' ' }).htmlCharacter).toBe('&nbsp;');
        expect(makeSI({ character: undefined }).htmlCharacter).toBe('&nbsp;');
        expect(makeSI({ character: 'q' }).htmlCharacter).toBe('q');
    });
});

describe('text — InterpretationRoi', () => {
    beforeEach(() => {
        st.artefacts.items = [];
        st.interpretationRois.clear();
    });

    it('constructs from a DTO with an interpretationRoiId', () => {
        const roi = new InterpretationRoi(roiDto());
        expect(roi.artefactId).toBe(1);
        expect(roi.signInterpretationId).toBe(100);
        expect(roi.interpretationRoiId).toBe(500);
        expect(roi.id).toBe(500);
        expect(roi.position).toEqual({ x: 3, y: 4 });
        expect(roi.rotation).toBe(0);
        expect(roi.exceptional).toBe(false);
        expect(roi.valuesSet).toBe(true);
        expect(roi.status).toBe('original');
        expect(roi.shape.wkt).toContain('POLYGON');
    });

    it('static new() builds a "new" ROI with a negative internal id', () => {
        const artefact = new Artefact(makeArtefactDto({ id: 1 }));
        st.artefacts.add(artefact);
        const si = new SignInterpretation(siDto(), { line: {} } as any);
        const shape = Polygon.fromWkt('POLYGON((0 0,5 0,5 5,0 5,0 0))');
        const roi = InterpretationRoi.new(artefact, si, shape, { x: 1, y: 2 }, 30);
        expect(roi.artefactId).toBe(1);
        expect(roi.signInterpretationId).toBe(si.id);
        expect(roi.rotation).toBe(30);
        expect(roi.status).toBe('new');
        expect(roi.interpretationRoiId).toBeUndefined();
        expect(roi.id).toBeLessThan(0);
    });

    it('clone preserves ids and copies the position', () => {
        const roi = new InterpretationRoi(roiDto());
        const c = roi.clone();
        expect(c).not.toBe(roi);
        expect(c.interpretationRoiId).toBe(roi.interpretationRoiId);
        expect(c.position).toEqual(roi.position);
        expect(c.position).not.toBe(roi.position);
        expect(c.id).toBe(roi.id);
    });

    it('status setter is a no-op when unchanged', () => {
        const roi = new InterpretationRoi(roiDto());
        roi.status = 'original';
        expect(roi.status).toBe('original');
    });

    it('status setter detaches on delete and re-attaches on undelete', () => {
        const artefact = new Artefact(makeArtefactDto({ id: 1 }));
        st.artefacts.add(artefact);
        const roi = new InterpretationRoi(roiDto({ artefactId: 1 }));
        // put() attaches to the artefact
        st.interpretationRois.put(roi);
        expect(artefact.rois.some(r => r.id === roi.id)).toBe(true);

        roi.status = 'deleted';
        expect(roi.status).toBe('deleted');
        expect(artefact.rois.some(r => r.id === roi.id)).toBe(false);

        roi.status = 'original';
        expect(roi.status).toBe('original');
        expect(artefact.rois.some(r => r.id === roi.id)).toBe(true);
    });
});
