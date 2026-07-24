import { describe, it, expect, beforeEach } from 'vitest';
import { StateManager } from '@/state';
import { ArtefactEditorState } from '@/state/artefact-editor';
import { Artefact } from '@/models/artefact';
import { TextFragment, SignInterpretation, InterpretationRoi } from '@/models/text';
import { ArtefactEditorParams } from '@/views/artefact-editor/types';
import type { ArtefactDTO, TextFragmentDTO, SignInterpretationDTO, InterpretationRoiDTO } from '@/dtos/sqe-dtos';

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

function makeRoiDto(artefactId: number, siId: number, id = 500): InterpretationRoiDTO {
    return {
        interpretationRoiId: id,
        artefactId,
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

function makeSiDto(id: number, rois: InterpretationRoiDTO[] = []): SignInterpretationDTO {
    return {
        signId: id,
        signInterpretationId: id,
        character: 'א',
        isVariant: false,
        nextSignInterpretations: [],
        attributes: [],
        rois,
        signStreamSectionIds: [],
        qwbWordIds: [],
    } as unknown as SignInterpretationDTO;
}

function makeSi(id: number, rois: InterpretationRoiDTO[] = []): SignInterpretation {
    const dto: TextFragmentDTO = {
        textFragmentId: 1,
        textFragmentName: 'tf',
        editorId: 1,
        lines: [{ lineId: 10, lineName: 'l', editorId: 1, signs: [{ signInterpretations: [makeSiDto(id, rois)] }] }],
    } as unknown as TextFragmentDTO;
    const tf = new TextFragment(dto);
    return tf.lines[0].signs[0].signInterpretations[0];
}

describe('ArtefactEditorState', () => {
    beforeEach(() => {
        st.artefacts.items = [];
        st.textFragmentEditor.selectedSignInterpretations = [];
    });

    it('constructs with default params and no selected ROI', () => {
        const s = new ArtefactEditorState();
        expect(s.params).toBeInstanceOf(ArtefactEditorParams);
        expect(s.selectedInterpretationRoi).toBeNull();
        expect(s.highlightCommentMode).toBe(false);
    });

    it('selectRoi sets and clears the selected ROI', () => {
        const s = new ArtefactEditorState();
        const roi = new InterpretationRoi(makeRoiDto(1, 1));
        s.selectRoi(roi);
        expect(s.selectedInterpretationRoi).toBe(roi);
        s.selectRoi(null);
        expect(s.selectedInterpretationRoi).toBeNull();
    });

    it('onSignInterpretationSelected clears the ROI when nothing is selected', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 1 })));
        st.artefacts.current = st.artefacts.find(1);
        const s = new ArtefactEditorState();
        s.selectRoi(new InterpretationRoi(makeRoiDto(1, 1)));
        // no single selected SI
        st.textFragmentEditor.selectedSignInterpretations = [];
        s.onSignInterpretationSelected();
        expect(s.selectedInterpretationRoi).toBeNull();
    });

    it('onSignInterpretationSelected picks the SI ROI for the current artefact when none is selected', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 1 })));
        st.artefacts.current = st.artefacts.find(1);
        const s = new ArtefactEditorState();
        // single-selected SI whose ROI belongs to artefact 1
        const si = makeSi(1, [makeRoiDto(1, 1)]);
        st.textFragmentEditor.selectedSignInterpretations = [si];
        expect(s.selectedInterpretationRoi).toBeNull();
        s.onSignInterpretationSelected();
        expect(s.selectedInterpretationRoi).toBeTruthy();
        expect(s.selectedInterpretationRoi!.artefactId).toBe(1);
    });

    it('onSignInterpretationSelected sets null when the SI has no ROI for the current artefact', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 1 })));
        st.artefacts.current = st.artefacts.find(1);
        const s = new ArtefactEditorState();
        const si = makeSi(1, []); // no rois
        st.textFragmentEditor.selectedSignInterpretations = [si];
        s.onSignInterpretationSelected();
        expect(s.selectedInterpretationRoi).toBeNull();
    });

    it('onSignInterpretationSelected leaves an already-selected ROI untouched', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 1 })));
        st.artefacts.current = st.artefacts.find(1);
        const s = new ArtefactEditorState();
        const existing = new InterpretationRoi(makeRoiDto(1, 99, 999));
        s.selectRoi(existing);
        const si = makeSi(1, [makeRoiDto(1, 1)]);
        st.textFragmentEditor.selectedSignInterpretations = [si];
        s.onSignInterpretationSelected();
        // already had a selected ROI -> unchanged
        expect(s.selectedInterpretationRoi).toBe(existing);
    });
});
