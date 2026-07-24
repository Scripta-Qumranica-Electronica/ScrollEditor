import { describe, it, expect, vi } from 'vitest';
import UndoRedoToolbox from '@/components/toolbars/undo-redo-toolbox.vue';
import { mountComponent } from './helpers/mount';

// Component-mount unit test for undo-redo-toolbox. The child toolbar-icon-button
// is stubbed by the helper; we stub `toolbox` too so mount succeeds. Exercises the
// canUndo/canRedo getters (both truthy and the `|| false` fallback) plus the
// onUndo/onRedo handlers delegating to $state.operationsManager.

function makeState(over: Partial<Record<string, unknown>> = {}) {
    return {
        operationsManager: {
            canUndo: false,
            canRedo: false,
            undo: vi.fn(),
            redo: vi.fn(),
            ...over,
        },
    };
}

function mountToolbox(state: any) {
    return mountComponent(UndoRedoToolbox, {
        state,
        stubs: { toolbox: true },
    });
}

describe('undo-redo-toolbox', () => {
    it('canUndo/canRedo reflect operationsManager flags', () => {
        const w = mountToolbox(makeState({ canUndo: true, canRedo: true }));
        expect(w.vm.canUndo).toBe(true);
        expect(w.vm.canRedo).toBe(true);
    });

    it('canUndo/canRedo default to false when flags falsy', () => {
        const w = mountToolbox(makeState());
        expect(w.vm.canUndo).toBe(false);
        expect(w.vm.canRedo).toBe(false);
    });

    it('canUndo/canRedo are false when operationsManager is absent', () => {
        const w = mountToolbox({});
        expect(w.vm.canUndo).toBe(false);
        expect(w.vm.canRedo).toBe(false);
    });

    it('onUndo/onRedo delegate to operationsManager', () => {
        const state = makeState();
        const w = mountToolbox(state);
        w.vm.onUndo();
        w.vm.onRedo();
        expect(state.operationsManager.undo).toHaveBeenCalledTimes(1);
        expect(state.operationsManager.redo).toHaveBeenCalledTimes(1);
    });

    it('uses the default subject prop', () => {
        const w = mountToolbox(makeState());
        expect((w.vm as any).subject).toBe('Undo/redo');
    });
});
