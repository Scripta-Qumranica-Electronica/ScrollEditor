import { describe, it, expect, beforeEach } from 'vitest';
import { StateManager } from '@/state';
import { TextFragmentState } from '@/state/text-fragment';
import { Artefact } from '@/models/artefact';
import { TextFragment, SignInterpretation } from '@/models/text';
import type { ArtefactDTO, TextFragmentDTO, SignInterpretationDTO } from '@/dtos/sqe-dtos';

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

function makeSiDto(id: number, character = 'א'): SignInterpretationDTO {
    return {
        signId: id,
        signInterpretationId: id,
        character,
        isVariant: false,
        nextSignInterpretations: [],
        attributes: [],
        rois: [],
        signStreamSectionIds: [],
        qwbWordIds: [],
    } as unknown as SignInterpretationDTO;
}

// Build a TextFragment with a single line holding the given sign-interpretation DTOs
// (one interpretation per sign).
function makeTextFragment(tfId: number, siDtos: SignInterpretationDTO[]): TextFragment {
    const dto: TextFragmentDTO = {
        textFragmentId: tfId,
        textFragmentName: `tf-${tfId}`,
        editorId: 1,
        lines: [
            {
                lineId: tfId * 10,
                lineName: 'l1',
                editorId: 1,
                signs: siDtos.map(si => ({ signInterpretations: [si] })),
            },
        ],
    } as unknown as TextFragmentDTO;
    return new TextFragment(dto);
}

function siOf(tf: TextFragment, index: number): SignInterpretation {
    return tf.lines[0].signs[index].signInterpretations[0];
}

describe('TextFragmentState', () => {
    beforeEach(() => {
        st.artefacts.items = [];
    });

    it('constructs with empty selection and defaults', () => {
        const s = new TextFragmentState();
        expect(s.selectedSignInterpretations).toEqual([]);
        expect(s.selectedAttribute).toBeNull();
        expect(s.highlightCommentMode).toBe(false);
        expect(s.modeSignModal).toBe('edit');
        expect(s.textEditingMode).toBe('artefact');
        expect(s.editedVirtualArtefact).toBeNull();
    });

    it('singleSelectedSi returns the sole selected SI, else null', () => {
        const s = new TextFragmentState();
        const tf = makeTextFragment(1, [makeSiDto(1)]);
        const si = siOf(tf, 0);
        expect(s.singleSelectedSi).toBeNull();
        s.selectedSignInterpretations = [si];
        expect(s.singleSelectedSi).toBe(si);
        s.selectedSignInterpretations = [si, siOf(makeTextFragment(2, [makeSiDto(2)]), 0)];
        expect(s.singleSelectedSi).toBeNull();
    });

    it('selectedTextFragment returns null with no selection, else the first SI text fragment', () => {
        const s = new TextFragmentState();
        expect(s.selectedTextFragment).toBeNull();
        const tf = makeTextFragment(3, [makeSiDto(1)]);
        s.selectedSignInterpretations = [siOf(tf, 0)];
        expect(s.selectedTextFragment).toBe(tf);
    });

    it('selectSign selects a single SI or clears', () => {
        const s = new TextFragmentState();
        const tf = makeTextFragment(4, [makeSiDto(1)]);
        const si = siOf(tf, 0);
        s.selectSign(si);
        expect(s.selectedSignInterpretations).toEqual([si]);
        s.selectSign(null);
        expect(s.selectedSignInterpretations).toEqual([]);
    });

    it('isSiSelected reports membership', () => {
        const s = new TextFragmentState();
        const tf = makeTextFragment(5, [makeSiDto(1), makeSiDto(2)]);
        const si0 = siOf(tf, 0);
        const si1 = siOf(tf, 1);
        s.selectedSignInterpretations = [si0];
        expect(s.isSiSelected(si0)).toBe(true);
        expect(s.isSiSelected(si1)).toBe(false);
    });

    it('toggleSelectSign ignores an undefined or characterless sign', () => {
        const s = new TextFragmentState();
        s.toggleSelectSign(undefined);
        expect(s.selectedSignInterpretations).toEqual([]);
        const tf = makeTextFragment(6, [makeSiDto(1, '')]); // no character
        s.toggleSelectSign(siOf(tf, 0));
        expect(s.selectedSignInterpretations).toEqual([]);
    });

    it('toggleSelectSign selects a sign and records its text fragment on the current artefact', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 1 })));
        st.artefacts.current = st.artefacts.find(1);
        const s = new TextFragmentState();
        const tf = makeTextFragment(7, [makeSiDto(1)]);
        s.toggleSelectSign(siOf(tf, 0));
        expect(s.selectedSignInterpretations.length).toBe(1);
        // addTextFragementToArtefact pushed a text fragment entry
        expect(st.artefacts.current!.textFragments.some(x => x.id === 7)).toBe(true);
    });

    it('toggleSelectSign adds a second sign from the SAME text fragment', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 1 })));
        st.artefacts.current = st.artefacts.find(1);
        const s = new TextFragmentState();
        const tf = makeTextFragment(8, [makeSiDto(1), makeSiDto(2)]);
        s.toggleSelectSign(siOf(tf, 0));
        s.toggleSelectSign(siOf(tf, 1));
        expect(s.selectedSignInterpretations.map(x => x.id).sort()).toEqual([1, 2]);
    });

    it('toggleSelectSign deselects an already-selected sign when removeIfExist', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 1 })));
        st.artefacts.current = st.artefacts.find(1);
        const s = new TextFragmentState();
        const tf = makeTextFragment(9, [makeSiDto(1)]);
        const si = siOf(tf, 0);
        s.toggleSelectSign(si);
        s.toggleSelectSign(si); // toggle off
        expect(s.selectedSignInterpretations).toEqual([]);
    });

    it('toggleSelectSign switching text fragments removes the old selection and its artefact tf', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 1 })));
        st.artefacts.current = st.artefacts.find(1);
        const s = new TextFragmentState();
        const tfA = makeTextFragment(10, [makeSiDto(1)]);
        const tfB = makeTextFragment(11, [makeSiDto(2)]);
        s.toggleSelectSign(siOf(tfA, 0));
        expect(st.artefacts.current!.textFragments.some(x => x.id === 10)).toBe(true);
        s.toggleSelectSign(siOf(tfB, 0));
        // old fragment removed, only the new selection remains
        expect(s.selectedSignInterpretations.map(x => x.id)).toEqual([2]);
        expect(st.artefacts.current!.textFragments.some(x => x.id === 10)).toBe(false);
        expect(st.artefacts.current!.textFragments.some(x => x.id === 11)).toBe(true);
    });

    it('addTextFragementToArtefact marks an existing tf certain rather than duplicating', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 1 })));
        st.artefacts.current = st.artefacts.find(1);
        const s = new TextFragmentState();
        const tf = makeTextFragment(12, [makeSiDto(1)]);
        const si = siOf(tf, 0);
        s.addTextFragementToArtefact(si);
        // second call finds the existing entry -> sets certain=true, no duplicate
        s.addTextFragementToArtefact(si);
        const entries = st.artefacts.current!.textFragments.filter(x => x.id === 12);
        expect(entries.length).toBe(1);
        expect(entries[0].certain).toBe(true);
    });

    it('removeTextFragementFromArtefact removes the artefact text fragment entry', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 1 })));
        st.artefacts.current = st.artefacts.find(1);
        const s = new TextFragmentState();
        const tf = makeTextFragment(13, [makeSiDto(1)]);
        const si = siOf(tf, 0);
        s.addTextFragementToArtefact(si);
        s.removeTextFragementFromArtefact(si);
        expect(st.artefacts.current!.textFragments.some(x => x.id === 13)).toBe(false);
    });
});
