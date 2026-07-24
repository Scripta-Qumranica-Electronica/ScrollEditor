import { describe, it, expect, vi, beforeEach } from 'vitest';

// Lightweight stand-in for the real VirtualArtefactEditor.
const hide = vi.fn();
let lastEditor: any;
vi.mock('@/services/virtual-artefact', () => ({
    VirtualArtefactEditor: class {
        public origin: any;
        private _text = 'שלום';
        constructor(origin: any) {
            this.origin = origin;
            lastEditor = this;
        }
        get text() {
            return this._text;
        }
        set text(v: string) {
            this._text = v;
        }
        hide = hide;
    },
}));

import EditVirtualArtefactText from '@/components/text/edit-virtual-artefact-text.vue';
import { mountComponent } from './helpers/mount';

function makeState(edited: any = { id: 1, isPlaced: true }) {
    return {
        textFragmentEditor: { editedVirtualArtefact: edited },
        // real $state.corrupted throws; model that so the guard short-circuits.
        corrupted: vi.fn((msg: string) => {
            throw new Error(msg);
        }),
    };
}

function mountPane(state: any) {
    return mountComponent(EditVirtualArtefactText, {
        state,
        stubs: {
            'b-row': { template: '<div><slot /></div>' },
            'b-col': { template: '<div><slot /></div>' },
            'b-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
            'b-form-input': true,
        },
    });
}

describe('edit-virtual-artefact-text', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        lastEditor = undefined;
    });

    it('mounted -> onShown initialises the editor, hides the original, loads text', () => {
        const edited = { id: 1, isPlaced: true };
        const state = makeState(edited);
        const w = mountPane(state);
        expect(w.vm.editor).toBeTruthy();
        // w.vm.editor is a reactive proxy over lastEditor -> compare structurally.
        expect(w.vm.editor).toStrictEqual(lastEditor);
        expect(edited.isPlaced).toBe(false);
        expect(w.vm.text).toBe('שלום');
        expect(w.vm.originalText).toBe('שלום');
        expect(state.corrupted).not.toHaveBeenCalled();
    });

    it('onShown flags corruption when there is no edited virtual artefact', () => {
        // Invoke the compiled onShown against a mock `this` so the guard runs in
        // isolation (mounting swallows the mounted() throw under compat/VTU).
        const methods = (EditVirtualArtefactText as any).methods as Record<string, any>;
        const state = makeState(null); // null, not undefined (default-param would kick in)
        const ctx: any = { $state: state };
        expect(() => methods.onShown.call(ctx)).toThrow();
        expect(state.corrupted).toHaveBeenCalledWith(
            expect.stringContaining('EditorVirtualArtefact')
        );
    });

    it('onHide hides the editor, re-places the artefact, and emits close', () => {
        const edited = { id: 1, isPlaced: true };
        const w = mountPane(makeState(edited));
        (w.vm as any).text = 'changed';
        w.vm.onHide();
        expect(hide).toHaveBeenCalled();
        expect(edited.isPlaced).toBe(true);
        const close = w.emitted().close?.[0]?.[0] as any;
        expect(close.text).toBe('changed');
        expect(close.originalText).toBe('שלום');
        expect(w.vm.editor).toBeUndefined();
    });

    it('onHide is a no-op once the editor is gone', () => {
        const w = mountPane(makeState());
        w.vm.onHide(); // clears editor + emits once
        const before = (w.emitted().close ?? []).length;
        w.vm.onHide(); // editor is undefined -> early return
        expect((w.emitted().close ?? []).length).toBe(before);
    });

    it('stripNonHebChars keeps only Hebrew letters and spaces', () => {
        const w = mountPane(makeState());
        expect(w.vm.stripNonHebChars('אbג 1ד')).toBe('אג ד');
    });

    it('onTextChanged strips illegal characters into the editor + text', async () => {
        const w = mountPane(makeState());
        (w.vm as any).text = 'שa ל';
        w.vm.onTextChanged();
        expect(w.vm.editor!.text).toBe('ש ל');
        await w.vm.$nextTick();
        expect(w.vm.text).toBe('ש ל');
    });

    it('onTextChanged throws when the editor disappeared', () => {
        const w = mountPane(makeState());
        (w.vm as any).editor = undefined;
        expect(() => w.vm.onTextChanged()).toThrow(/Editor object disappeared/);
    });

    it('unmounted tears down via onHide', () => {
        const edited = { id: 1, isPlaced: true };
        const w = mountPane(makeState(edited));
        hide.mockClear();
        w.unmount();
        expect(hide).toHaveBeenCalled();
    });
});
