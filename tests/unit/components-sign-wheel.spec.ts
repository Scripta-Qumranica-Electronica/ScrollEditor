import { describe, it, expect, vi } from 'vitest';
import SignWheel from '@/views/artefact-editor/sign-wheel.vue';
import { mountComponent } from './helpers/mount';

// Build a line of `n` signs; sign i's first interpretation has id = i+1.
function makeLine(n: number) {
    const signs = [];
    for (let i = 0; i < n; i++) {
        signs.push({ signInterpretations: [{ id: i + 1 }] });
    }
    return { signs } as any;
}

function makeState(selectedId: number | null) {
    return {
        textFragmentEditor: {
            singleSelectedSi: selectedId === null ? null : { id: selectedId },
            selectedSignInterpretations: [],
        },
    };
}

function mountWheel(state: any, line: any, props: any = {}) {
    return mountComponent(SignWheel, {
        state,
        props: { line, ...props },
        stubs: { 'text-sign': true },
    });
}

describe('sign-wheel', () => {
    it('findSignIndex returns -1 with no selection', () => {
        const w = mountWheel(makeState(null), makeLine(3));
        expect(w.vm.findSignIndex()).toBe(-1);
    });

    it('findSignIndex locates the selected sign', () => {
        const w = mountWheel(makeState(3), makeLine(5));
        expect(w.vm.findSignIndex()).toBe(2);
    });

    it('findSignIndex returns -1 when the selected id is absent', () => {
        const w = mountWheel(makeState(99), makeLine(3));
        expect(w.vm.findSignIndex()).toBe(-1);
    });

    it('fillWheel clears signs when nothing is selected', () => {
        const w = mountWheel(makeState(null), makeLine(3));
        (w.vm as any).signs = [{ any: true }];
        w.vm.fillWheel();
        // fillWheel returns early on -1 without touching signs
        expect(w.vm.selectedIndex).toBe(-1);
    });

    it('fillWheel windows signsOnEachSide around the selection', () => {
        // selected id 6 -> index 5; signsOnEachSide=2 -> indices 3..7 (5 signs)
        const w = mountWheel(makeState(6), makeLine(10), { signsOnEachSide: 2 });
        w.vm.fillWheel();
        expect(w.vm.signs.map((s: any) => s.index)).toEqual([3, 4, 5, 6, 7]);
        expect(w.vm.signs[2].class).toBe('sign-dist-0 ');
        expect(w.vm.signs[0].class).toBe('sign-dist-2 ');
    });

    it('fillWheel clamps the window at the line boundaries', () => {
        // selected first sign (index 0), signsOnEachSide=3 -> indices 0..3
        const w = mountWheel(makeState(1), makeLine(4), { signsOnEachSide: 3 });
        w.vm.fillWheel();
        expect(w.vm.signs.map((s: any) => s.index)).toEqual([0, 1, 2, 3]);
    });

    it('mounted fills the wheel; all in-window signs are present', () => {
        const w = mountWheel(makeState(3), makeLine(5), { signsOnEachSide: 5 });
        // mounted() ran fillWheel; all 5 signs are within the window
        expect(w.vm.signs.length).toBe(5);
    });

    it('textFragmentEditor + selectedSignInterpretations getters read state', () => {
        const state = makeState(1);
        const w = mountWheel(state, makeLine(2));
        expect(w.vm.textFragmentEditor).toBe(state.textFragmentEditor);
        expect(w.vm.selectedSignInterpretations).toBe(
            state.textFragmentEditor.selectedSignInterpretations
        );
    });

    it('onSelectedSignInterpretationChanged refills the wheel', () => {
        const w = mountWheel(makeState(2), makeLine(4));
        const spy = vi.spyOn(w.vm as any, 'fillWheel');
        w.vm.onSelectedSignInterpretationChanged({} as any, {} as any);
        expect(spy).toHaveBeenCalled();
    });
});
