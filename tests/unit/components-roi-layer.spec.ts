import { describe, it, expect, vi } from 'vitest';
import RoiLayer from '@/views/artefact-editor/roi-layer.vue';
import { mountComponent } from './helpers/mount';

function makeRoi(over: any = {}) {
    return {
        id: over.id ?? 1,
        interpretationRoiId: over.interpretationRoiId ?? 100,
        signInterpretationId: over.signInterpretationId ?? 5,
        position: { x: over.x ?? 0, y: over.y ?? 0 },
        shape: { svg: over.svg ?? 'M0 0' },
        shine: over.shine ?? false,
    } as any;
}

function makeState(opts: any = {}) {
    return {
        artefactEditor: {
            selectedInterpretationRoi: opts.selectedRoi ?? null,
            highlightCommentMode: opts.highlightCommentMode ?? false,
        },
        textFragmentEditor: { singleSelectedSi: opts.singleSelectedSi ?? null },
        signInterpretations: opts.signInterpretations ?? new Map(),
    };
}

function mountLayer(state: any, rois: any[] = [makeRoi()], withClass = true) {
    return mountComponent(RoiLayer, {
        state,
        props: { rois, withClass },
    });
}

describe('roi-layer', () => {
    it('renders one path per roi', () => {
        const w = mountLayer(makeState(), [makeRoi({ id: 1 }), makeRoi({ id: 2, interpretationRoiId: 200 })]);
        expect(w.findAll('path').length).toBe(2);
    });

    it('highlighted matches the single selected SI', () => {
        const w = mountLayer(makeState({ singleSelectedSi: { signInterpretationId: 5 } }));
        expect(w.vm.highlighted(makeRoi({ signInterpretationId: 5 }))).toBe(true);
        expect(w.vm.highlighted(makeRoi({ signInterpretationId: 9 }))).toBe(false);
    });

    it('highlighted is false with no selected SI', () => {
        const w = mountLayer(makeState());
        expect(w.vm.highlighted(makeRoi())).toBe(false);
    });

    it('highlightedComment is false when no signInterpretationId', () => {
        const w = mountLayer(makeState());
        expect(w.vm.highlightedComment(makeRoi({ signInterpretationId: 0 }))).toBe(false);
    });

    it('highlightedComment reflects comment-mode + commentary presence', () => {
        const si = { commentary: 'hi', attributes: [] };
        const w = mountLayer(
            makeState({
                highlightCommentMode: true,
                signInterpretations: new Map([[5, si]]),
            })
        );
        expect(w.vm.highlightedComment(makeRoi({ signInterpretationId: 5 }))).toBeTruthy();
    });

    it('highlightedComment detects commentary on an attribute', () => {
        const si = { commentary: null, attributes: [{ commentary: 'x' }] };
        const w = mountLayer(
            makeState({
                highlightCommentMode: true,
                signInterpretations: new Map([[5, si]]),
            })
        );
        expect(w.vm.highlightedComment(makeRoi({ signInterpretationId: 5 }))).toBeTruthy();
    });

    it('highlightedComment is falsy when comment mode is off', () => {
        const si = { commentary: 'hi', attributes: [] };
        const w = mountLayer(
            makeState({ highlightCommentMode: false, signInterpretations: new Map([[5, si]]) })
        );
        expect(w.vm.highlightedComment(makeRoi({ signInterpretationId: 5 }))).toBeFalsy();
    });

    it('isSelectedRoi compares interpretationRoiId', () => {
        const w = mountLayer(makeState({ selectedRoi: { interpretationRoiId: 100 } }));
        expect(w.vm.isSelectedRoi(makeRoi({ interpretationRoiId: 100 }))).toBe(true);
        expect(w.vm.isSelectedRoi(makeRoi({ interpretationRoiId: 999 }))).toBe(false);
    });

    it('isSelectedRoi is falsy with no selection', () => {
        const w = mountLayer(makeState());
        expect(w.vm.isSelectedRoi(makeRoi())).toBeFalsy();
    });

    it('selectedInterpretationRoi + si + artefactEditorState getters read state', () => {
        const state = makeState({
            selectedRoi: { interpretationRoiId: 1 },
            singleSelectedSi: { signInterpretationId: 2 },
        });
        const w = mountLayer(state);
        expect(w.vm.selectedInterpretationRoi).toBe(state.artefactEditor.selectedInterpretationRoi);
        expect(w.vm.si).toBe(state.textFragmentEditor.singleSelectedSi);
        expect(w.vm.artefactEditorState).toBe(state.artefactEditor);
    });

    it('onPathClicked emits roiClicked with the roi', () => {
        const w = mountLayer(makeState());
        const roi = makeRoi();
        w.vm.onPathClicked(roi);
        expect(w.emitted().roiClicked?.[0]).toEqual([roi]);
    });

    it('clicking a rendered path emits roiClicked', async () => {
        const roi = makeRoi();
        const w = mountLayer(makeState(), [roi]);
        await w.find('path').trigger('click');
        expect(w.emitted().roiClicked).toBeTruthy();
    });
});
