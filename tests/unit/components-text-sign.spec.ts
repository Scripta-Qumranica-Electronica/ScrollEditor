import { describe, it, expect, vi, beforeEach } from 'vitest';

// Component-mount unit test for text-sign. Exercises the right-click sign-menu
// handlers, the isSelected/isHighlighted/cssStrings/virtualArtefact/qwbWordId
// computeds and onSignInterpretationClicked. The QwbProxyService, the operations
// module and the modal bus are mocked so the handlers run inert.

const redo = vi.fn();
vi.mock('@/views/artefact-editor/operations', () => ({
    ArtefactROIOperation: class {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(...args: any[]) {
            (this as any).args = args;
        }
        public redo = redo;
    },
    DeleteSignInterpretationOperation: class {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(...args: any[]) {
            (this as any).args = args;
        }
        public redo = redo;
    },
}));

const getQwbWordVariants = vi.fn();
vi.mock('@/services/qwb-proxy', () => ({
    default: class {
        public getQwbWordVariants = getQwbWordVariants;
    },
}));

const showModal = vi.fn();
vi.mock('@/utils/modal-bus', () => ({
    showModal: (id: string) => showModal(id),
}));

// edit-sign-modal is a child import; stub it to avoid pulling its deps.
vi.mock('@/components/text/edit-sign-modal.vue', () => ({ default: {} }));

import TextSign from '@/components/text/text-sign.vue';
import { mountComponent } from './helpers/mount';

// Build a minimal sign / sign-interpretation graph.
function makeSi(over: any = {}) {
    const si: any = {
        id: over.id ?? 42,
        signInterpretationId: over.signInterpretationId ?? 42,
        htmlCharacter: 'א',
        commentary: over.commentary,
        attributes: over.attributes ?? [
            { attributeString: 'sign_type', attributeValueString: 'LETTER' },
        ],
        rois: over.rois ?? [],
        qwbWordIds: over.qwbWordIds ?? [],
        sign: undefined,
    };
    return si;
}

function makeSign(over: any = {}) {
    const si = makeSi(over);
    const sign: any = {
        signInterpretations: [si],
        indexInLine: over.indexInLine ?? 1,
        line: over.line,
    };
    si.sign = sign;
    return sign;
}

function makeState(over: any = {}) {
    const selectSign = vi.fn();
    const toggleSelectSign = vi.fn();
    const isSiSelected = vi.fn().mockReturnValue(over.selected ?? false);
    return {
        state: {
            editions: { current: { permission: { readOnly: over.readOnly ?? false } } },
            textFragmentEditor: {
                textEditingMode: over.editingMode ?? 'artefact',
                isSiSelected,
                selectSign,
                toggleSelectSign,
                modeSignModal: '',
                editedVirtualArtefact: undefined,
            },
            artefactEditor: { highlightCommentMode: over.highlight ?? false },
            artefacts: { find: over.find ?? vi.fn().mockReturnValue(undefined) },
            showEditReconTextBar: false,
        },
        selectSign,
        toggleSelectSign,
        isSiSelected,
    };
}

function mountSign(sign: any, ctx: any) {
    return mountComponent(TextSign, {
        state: ctx.state,
        props: { sign, withMenu: true },
        stubs: { 'b-popover': true, 'b-modal': true, 'b-button': true },
    });
}

describe('text-sign', () => {
    beforeEach(() => vi.clearAllMocks());

    it('mounts and si returns the first interpretation', () => {
        const ctx = makeState();
        const w = mountSign(makeSign(), ctx);
        expect(w.exists()).toBe(true);
        expect(w.vm.si.id).toBe(42);
    });

    it('readOnly / editingMode getters reflect state', () => {
        const ctx = makeState({ readOnly: true, editingMode: 'manuscript' });
        const w = mountSign(makeSign(), ctx);
        expect(w.vm.readOnly).toBe(true);
        expect(w.vm.editingMode).toBe('manuscript');
    });

    it('isSelected proxies textFragmentEditor.isSiSelected', () => {
        const ctx = makeState({ selected: true });
        const w = mountSign(makeSign(), ctx);
        expect(w.vm.isSelected).toBe(true);
        expect(ctx.isSiSelected).toHaveBeenCalled();
    });

    it('isHighlighted: false when highlight mode is off', () => {
        const ctx = makeState({ highlight: false });
        const w = mountSign(makeSign({ commentary: 'note' }), ctx);
        expect(w.vm.isHighlighted).toBeFalsy();
    });

    it('isHighlighted: true when highlighting and the si has commentary', () => {
        const ctx = makeState({ highlight: true });
        const w = mountSign(makeSign({ commentary: 'note' }), ctx);
        expect(w.vm.isHighlighted).toBe('note');
    });

    it('isHighlighted: true when an attribute carries commentary', () => {
        const ctx = makeState({ highlight: true });
        const sign = makeSign({
            attributes: [{ attributeString: 'x', attributeValueString: 'y', commentary: 'c' }],
        });
        const w = mountSign(sign, ctx);
        expect(w.vm.isHighlighted).toBe(true);
    });

    it('cssStrings lowercases and hyphenates attribute pairs', () => {
        const ctx = makeState();
        const sign = makeSign({
            attributes: [{ attributeString: 'sign_type', attributeValueString: 'LETTER' }],
        });
        const w = mountSign(sign, ctx);
        expect(w.vm.cssStrings).toBe('sign-type-letter');
    });

    it('virtualArtefact: null unless exactly one roi maps to a virtual artefact', () => {
        // no rois -> null
        expect(mountSign(makeSign({ rois: [] }), makeState()).vm.virtualArtefact).toBeNull();

        // one roi but artefact not found -> null
        const ctxMissing = makeState({ find: vi.fn().mockReturnValue(undefined) });
        expect(
            mountSign(makeSign({ rois: [{ artefactId: 5 }] }), ctxMissing).vm.virtualArtefact
        ).toBeNull();

        // one roi, non-virtual artefact -> null
        const ctxReal = makeState({ find: vi.fn().mockReturnValue({ isVirtual: false }) });
        expect(
            mountSign(makeSign({ rois: [{ artefactId: 5 }] }), ctxReal).vm.virtualArtefact
        ).toBeNull();

        // one roi, virtual artefact -> the artefact
        const virt = { isVirtual: true };
        const ctxVirt = makeState({ find: vi.fn().mockReturnValue(virt) });
        expect(
            mountSign(makeSign({ rois: [{ artefactId: 5 }] }), ctxVirt).vm.virtualArtefact
        ).toBe(virt);
    });

    it('qwbWordId returns the first id or undefined', () => {
        expect(mountSign(makeSign({ qwbWordIds: [] }), makeState()).vm.qwbWordId).toBeUndefined();
        expect(mountSign(makeSign({ qwbWordIds: [7, 8] }), makeState()).vm.qwbWordId).toBe(7);
    });

    it('onSignInterpretationClicked selects (plain) or toggles (ctrl/meta)', () => {
        const ctx = makeState();
        const w = mountSign(makeSign(), ctx);
        w.vm.onSignInterpretationClicked({ ctrlKey: false, metaKey: false } as any);
        expect(ctx.selectSign).toHaveBeenCalledTimes(1);
        w.vm.onSignInterpretationClicked({ ctrlKey: true, metaKey: false } as any);
        expect(ctx.toggleSelectSign).toHaveBeenCalledTimes(1);
    });

    it('openSignMenu prevents default, selects the sign and shows the popover', () => {
        const ctx = makeState();
        const w = mountSign(makeSign(), ctx);
        const ev: any = { preventDefault: vi.fn() };
        w.vm.openSignMenu(ev, 'popover-si-42');
        expect(ev.preventDefault).toHaveBeenCalled();
        expect(ctx.selectSign).toHaveBeenCalled();
        expect(w.vm.signMenuVisible).toBe(true);
        expect(w.vm.previousMenuId).toBe('popover-si-42');
    });

    it('closeSignMenu hides the popover', () => {
        const w = mountSign(makeSign(), makeState());
        w.vm.signMenuVisible = true;
        w.vm.closeSignMenu();
        expect(w.vm.signMenuVisible).toBe(false);
    });

    it('openEditSignModal sets edit mode and opens the modal', () => {
        const ctx = makeState();
        const w = mountSign(makeSign(), ctx);
        w.vm.openEditSignModal();
        expect(ctx.state.textFragmentEditor.modeSignModal).toBe('edit');
        expect(showModal).toHaveBeenCalledWith('editSignModal');
    });

    it('openAddLeftSignModal sets create mode and opens the modal', () => {
        const ctx = makeState();
        const w = mountSign(makeSign(), ctx);
        w.vm.openAddLeftSignModal();
        expect(ctx.state.textFragmentEditor.modeSignModal).toBe('create');
        expect(showModal).toHaveBeenCalledWith('editSignModal');
    });

    it('openAddRightSignModal selects the previous sign then opens the modal', () => {
        const ctx = makeState();
        // Build a two-sign line; the current sign is index 1, previous is index 0.
        const prevSi = makeSi({ id: 1, signInterpretationId: 1 });
        const line: any = { signs: [{ signInterpretations: [prevSi] }, null] };
        const sign = makeSign({ line, indexInLine: 1 });
        line.signs[1] = sign;
        const w = mountSign(sign, ctx);
        w.vm.openAddRightSignModal();
        expect(ctx.state.textFragmentEditor.modeSignModal).toBe('create');
        expect(ctx.selectSign).toHaveBeenCalledWith(prevSi);
        expect(showModal).toHaveBeenCalledWith('editSignModal');
    });

    it('deleteSignInterpretation redoes the delete + roi ops and emits a bulk operation', () => {
        const ctx = makeState({ find: vi.fn() });
        const emit = vi.fn();
        (ctx.state as any).eventBus = { emit };
        const sign = makeSign({ rois: [{ artefactId: 1 }, { artefactId: 2 }] });
        const w = mountSign(sign, ctx);
        w.vm.deleteSignInterpretation(w.vm.si);
        // 1 delete op + 2 roi ops = 3 redo() calls
        expect(redo).toHaveBeenCalledTimes(3);
        expect(emit).toHaveBeenCalledWith('new-bulk-operations', expect.any(Array));
    });

    it('openEditVirtualArtefact warns and returns when no virtual artefact', () => {
        const ctx = makeState({ find: vi.fn().mockReturnValue(undefined) });
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const w = mountSign(makeSign({ rois: [] }), ctx);
        w.vm.openEditVirtualArtefact();
        expect(warn).toHaveBeenCalled();
        expect(ctx.state.showEditReconTextBar).toBe(false);
        warn.mockRestore();
    });

    it('openEditVirtualArtefact sets the edited artefact and shows the recon bar', () => {
        const virt = { isVirtual: true };
        const ctx = makeState({ find: vi.fn().mockReturnValue(virt) });
        const w = mountSign(makeSign({ rois: [{ artefactId: 5 }] }), ctx);
        w.vm.openEditVirtualArtefact();
        expect(ctx.state.textFragmentEditor.editedVirtualArtefact).toBe(virt);
        expect(ctx.state.showEditReconTextBar).toBe(true);
    });

    it('showReconTextEditor emits true', () => {
        const w = mountSign(makeSign(), makeState());
        w.vm.showReconTextEditor();
        expect(w.emitted('showReconTextEditor')).toBeTruthy();
    });

    it('textFragmentEditorState getter returns the editor slice', () => {
        const ctx = makeState();
        const w = mountSign(makeSign(), ctx);
        expect(w.vm.textFragmentEditorState).toBe(ctx.state.textFragmentEditor);
    });

    it('openQwbVariantsModal is a no-op with no qwbWordId', async () => {
        const w = mountSign(makeSign({ qwbWordIds: [] }), makeState());
        await w.vm.openQwbVariantsModal();
        expect(getQwbWordVariants).not.toHaveBeenCalled();
        expect(w.vm.showQwbVariantsModal).toBe(false);
    });

    it('openQwbVariantsModal fetches variants once then opens the modal', async () => {
        getQwbWordVariants.mockResolvedValueOnce({ variants: [] });
        const w = mountSign(makeSign({ qwbWordIds: [99] }), makeState());
        await w.vm.openQwbVariantsModal();
        expect(getQwbWordVariants).toHaveBeenCalledWith(99);
        expect(w.vm.showQwbVariantsModal).toBe(true);
        // second call: already cached, no refetch
        getQwbWordVariants.mockClear();
        w.vm.showQwbVariantsModal = false;
        await w.vm.openQwbVariantsModal();
        expect(getQwbWordVariants).not.toHaveBeenCalled();
        expect(w.vm.showQwbVariantsModal).toBe(true);
    });
});
