import { describe, it, expect, beforeEach } from 'vitest';
import { StateManager } from '@/state';
import { Artefact } from '@/models/artefact';
import { NotificationHandler } from '@/state/notification-handler';
import { TextFragment, Sign, SignInterpretation, InterpretationRoi } from '@/models/text';
import type {
    ArtefactDTO,
    SignInterpretationDTO,
    LineDTO,
    SignDTO,
    TextFragmentDTO,
    InterpretationRoiDTO,
    InterpretationAttributeDTO,
    DeleteIntIdDTO,
} from '@/dtos/sqe-dtos';

/*
 * Coverage for the sign-interpretation UPDATE reducer and the ROI<->SI linkage in
 * src/state/notification-handler.ts, which the sibling notification specs do not
 * reach: handleUpdatedSignInterpretation's real update path (replace the SI in the
 * map + in its sign, and reconcile the text-fragment editor's selected SI /
 * selected attribute), handleUpdatedSignInterpretations over a non-empty list,
 * handleCreatedRoi/handleDeletedRoi attaching/detaching a ROI to/from its SI, and
 * handleUpdatedArtefact for an artefact we do not hold.
 */

const st = StateManager.instance;
const handler = new NotificationHandler();

function signTypeAttr(str = 'LETTER'): InterpretationAttributeDTO {
    return {
        attributeId: 1,
        attributeValueId: str === 'LETTER' ? 1 : 2,
        attributeString: 'sign_type',
        attributeValueString: str,
        interpretationAttributeId: 900,
        creatorId: 1,
        editorId: 1,
    } as InterpretationAttributeDTO;
}

function siDto(id: number, character: string, attrs: InterpretationAttributeDTO[] = []): SignInterpretationDTO {
    return {
        signId: 1,
        signInterpretationId: id,
        character,
        isVariant: false,
        nextSignInterpretations: [],
        attributes: attrs,
        rois: [],
        signStreamSectionIds: [],
        qwbWordIds: [],
    } as unknown as SignInterpretationDTO;
}

function buildFragmentWithSI(siId: number, character: string): SignInterpretation {
    const line: LineDTO = {
        lineId: 1, lineName: 'l1', editorId: 1,
        signs: [{ signInterpretations: [siDto(siId, character)] } as SignDTO],
    } as LineDTO;
    const tf = new TextFragment({
        textFragmentId: 1, textFragmentName: 'tf', editorId: 1, lines: [line],
    } as TextFragmentDTO);
    st.textFragments.put(tf);
    const si = tf.lines[0].signs[0].signInterpretations[0];
    st.signInterpretations.put(si);
    return st.signInterpretations.get(siId)!;
}

function makeArtefactDto(over: Partial<ArtefactDTO> = {}): ArtefactDTO {
    return {
        id: 1,
        name: 'frg',
        editionId: 100,
        imagedObjectId: 'IO-1',
        imageId: 1,
        artefactDataEditorId: 1,
        mask: 'POLYGON((0 0,10 0,10 10,0 10,0 0))',
        artefactMaskEditorId: 1,
        isPlaced: true,
        placement: { scale: 1, rotate: 0, translate: { x: 0, y: 0 }, zIndex: 0, mirrored: false },
        artefactPlacementEditorId: 1,
        side: 'recto',
        statusMessage: '',
        ...over,
    } as ArtefactDTO;
}

function roiDto(id: number, siId?: number): InterpretationRoiDTO {
    return {
        interpretationRoiId: id,
        artefactId: 1,
        signInterpretationId: siId,
        shape: 'POLYGON((0 0,1 0,1 1,0 1,0 0))',
        translate: { x: 0, y: 0 },
        stanceRotation: 0,
        exceptional: false,
        valuesSet: true,
        creatorId: 1,
        editorId: 1,
    } as unknown as InterpretationRoiDTO;
}

beforeEach(() => {
    st.signInterpretations.clear();
    st.interpretationRois.clear();
    st.artefacts.items = [];
    st.textFragmentEditor.selectedSignInterpretations = [];
    st.textFragmentEditor.selectedAttribute = null;
});

describe('handleUpdatedSignInterpretation — real update path', () => {
    it('replaces the SI in the map and in its containing sign', () => {
        const si = buildFragmentWithSI(500, 'a');
        const sign = si.sign;

        handler.handleUpdatedSignInterpretation(siDto(500, 'z'));

        const updated = st.signInterpretations.get(500)!;
        expect(updated.character).toBe('z');
        // The sign now points at the replacement instance.
        expect(sign.signInterpretations[0]).toBe(updated);
        expect(sign.signInterpretations[0].character).toBe('z');
    });

    it('handleUpdatedSignInterpretations iterates a non-empty list', () => {
        buildFragmentWithSI(510, 'a');
        handler.handleUpdatedSignInterpretations({ signInterpretations: [siDto(510, 'q')] });
        expect(st.signInterpretations.get(510)!.character).toBe('q');
    });

    it('reconciles the selected SI and keeps a still-present selected attribute', () => {
        const si = buildFragmentWithSI(520, 'a');
        st.textFragmentEditor.selectedSignInterpretations = [si];
        const attr = signTypeAttr('LETTER');
        st.textFragmentEditor.selectedAttribute = attr as any;

        // Updated DTO still carries an attribute with the same attributeValueId (1).
        handler.handleUpdatedSignInterpretation(siDto(520, 'b', [signTypeAttr('LETTER')]));

        const newSI = st.signInterpretations.get(520)!;
        // Selected SI list points at the replacement.
        expect(st.textFragmentEditor.selectedSignInterpretations[0]).toBe(newSI);
        // The matching attribute was re-selected from the new SI.
        expect(st.textFragmentEditor.selectedAttribute!.attributeValueId).toBe(1);
    });

    it('clears the selected attribute when it is gone from the updated SI', () => {
        const si = buildFragmentWithSI(530, 'a');
        st.textFragmentEditor.selectedSignInterpretations = [si];
        st.textFragmentEditor.selectedAttribute = signTypeAttr('LETTER') as any;

        // Updated DTO carries NO attributes -> selected attribute can't be found -> null.
        handler.handleUpdatedSignInterpretation(siDto(530, 'b', []));

        expect(st.textFragmentEditor.selectedAttribute).toBeNull();
    });

    it('warns and no-ops for an unknown SI', () => {
        expect(() => handler.handleUpdatedSignInterpretation(siDto(9999, 'x'))).not.toThrow();
    });
});

describe('ROI <-> SI linkage', () => {
    it('handleCreatedRoi attaches the ROI to its sign interpretation', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 1 })));
        const si = buildFragmentWithSI(600, 'a');
        handler.handleCreatedRoi(roiDto(700, 600));
        expect(st.interpretationRois.get(700)).toBeTruthy();
        expect(si.rois.some(r => r.id === 700)).toBe(true);
    });

    it('handleDeletedRoi detaches the ROI from its sign interpretation', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 1 })));
        const si = buildFragmentWithSI(610, 'a');
        handler.handleCreatedRoi(roiDto(710, 610));
        expect(si.rois.some(r => r.id === 710)).toBe(true);

        const del: DeleteIntIdDTO = { entity: 'roi', ids: [710] } as unknown as DeleteIntIdDTO;
        handler.handleDeletedRoi(del);
        expect(st.interpretationRois.get(710)).toBeUndefined();
        expect(si.rois.some(r => r.id === 710)).toBe(false);
    });
});

describe('handleUpdatedArtefact — not held', () => {
    it('does nothing when the artefact is not in the store', () => {
        expect(() => handler.handleUpdatedArtefact(makeArtefactDto({ id: 4242 }))).not.toThrow();
        expect(st.artefacts.find(4242)).toBeNull();
    });
});
