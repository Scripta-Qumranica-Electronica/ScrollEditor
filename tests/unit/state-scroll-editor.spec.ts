import { describe, it, expect, beforeEach } from 'vitest';
import { StateManager } from '@/state';
import { ScrollEditorState } from '@/state/scroll-editor';
import { Artefact } from '@/models/artefact';
import { ArtefactGroup } from '@/models/edition';
import { ScrollEditorParams } from '@/views/artefact-editor/types';
import type { ArtefactDTO, ArtefactGroupDTO } from '@/dtos/sqe-dtos';

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

function art(id: number) {
    return new Artefact(makeArtefactDto({ id }));
}

function group(id: number, ids: number[]) {
    return new ArtefactGroup({ id, name: 'g', artefacts: ids } as ArtefactGroupDTO);
}

describe('ScrollEditorState', () => {
    beforeEach(() => {
        st.artefacts.items = [];
        st.textFragmentEditor.selectedSignInterpretations = [];
    });

    it('constructs with defaults', () => {
        const s = new ScrollEditorState();
        expect(s.params).toBeInstanceOf(ScrollEditorParams);
        expect(s.pointerPosition).toEqual({ x: 0, y: 0 });
        expect(s.displayRois).toBe(false);
        expect(s.displayReconstructedText).toBe(false);
        expect(s.displayText).toBe(false);
        expect(s.mode).toBe('material');
        expect(s.showEditReconTextBar).toBe(false);
        expect(s.selectedArtefact).toBeNull();
        expect(s.selectedGroup).toBeNull();
    });

    it('selectArtefact sets the artefact and clears the group', () => {
        const s = new ScrollEditorState();
        const a = art(1);
        s.selectArtefact(a);
        expect(s.selectedArtefact).toBe(a);
        expect(s.selectedGroup).toBeNull();
    });

    it('selectGroup clones the group and clears the selected artefact', () => {
        const s = new ScrollEditorState();
        s.selectArtefact(art(1));
        const g = group(5, [1, 2]);
        s.selectGroup(g);
        expect(s.selectedGroup).not.toBe(g); // cloned
        expect(s.selectedGroup!.groupId).toBe(5);
        expect(s.selectedGroup!.artefactIds).toEqual([1, 2]);
        expect(s.selectedArtefact).toBeNull();
    });

    it('selectGroup(undefined) clears both selections', () => {
        const s = new ScrollEditorState();
        s.selectGroup(group(5, [1]));
        s.selectGroup(undefined);
        expect(s.selectedGroup).toBeNull();
        expect(s.selectedArtefact).toBeNull();
    });

    it('selectedArtefacts is empty when nothing is selected', () => {
        const s = new ScrollEditorState();
        expect(s.selectedArtefacts).toEqual([]);
    });

    it('selectedArtefacts returns the single selected artefact', () => {
        st.artefacts.add(art(1));
        const s = new ScrollEditorState();
        s.selectArtefact(st.artefacts.find(1)!);
        const result = s.selectedArtefacts;
        expect(result.map(a => a.id)).toEqual([1]);
    });

    it('selectedArtefacts resolves a group to the artefacts present in state', () => {
        st.artefacts.add(art(1));
        st.artefacts.add(art(2));
        // id 3 is in the group but NOT in state -> filtered out
        const s = new ScrollEditorState();
        s.selectGroup(group(9, [1, 2, 3]));
        expect(s.selectedArtefacts.map(a => a.id).sort()).toEqual([1, 2]);
    });

    it('mode setter is a no-op when set to the current mode', () => {
        const s = new ScrollEditorState();
        s.selectArtefact(art(1));
        s.mode = 'material'; // already material
        // selection is untouched because the setter early-returns
        expect(s.selectedArtefact).toBeTruthy();
    });

    it('switching to text mode clears selections and turns on text display', () => {
        const s = new ScrollEditorState();
        s.selectArtefact(art(1));
        st.textFragmentEditor.selectedSignInterpretations = [{ id: 1 } as any];
        s.mode = 'text';
        expect(s.mode).toBe('text');
        expect(s.selectedArtefact).toBeNull();
        expect(s.selectedGroup).toBeNull();
        expect(st.textFragmentEditor.selectedSignInterpretations).toEqual([]);
        expect(s.displayReconstructedText).toBe(true);
        expect(s.displayText).toBe(true);
        expect(s.displayRois).toBe(false);
    });

    it('switching from text back to material clears selections without touching display flags', () => {
        const s = new ScrollEditorState();
        s.mode = 'text';
        s.displayRois = true;
        s.mode = 'material';
        expect(s.mode).toBe('material');
        // material branch does not reset display flags
        expect(s.displayRois).toBe(true);
    });
});
