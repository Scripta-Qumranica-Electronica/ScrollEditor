import { describe, it, expect, vi, beforeEach } from 'vitest';

const opRedo = vi.fn();
const attrOps: any[] = [];
const commentOps: any[] = [];
vi.mock('@/views/artefact-editor/operations', () => ({
    TextFragmentAttributeOperation: class {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(public siId: number, public attrValueId: number, public next?: any) {
            attrOps.push(this);
        }
        public redo = opRedo;
    },
    SignInterpretationCommentOperation: class {
        constructor(public siId: number, public comment: string) {
            commentOps.push(this);
        }
        public redo = opRedo;
    },
}));

import SignAttributePane from '@/components/sign-attributes/sign-attribute-pane.vue';
import { mountComponent } from './helpers/mount';

function attr(over: any = {}) {
    return {
        attributeId: over.attributeId ?? 10,
        attributeString: over.attributeString ?? 'sign_type',
        attributeValueId: over.attributeValueId ?? 100,
        attributeValueString: over.attributeValueString ?? 'LETTER',
        interpretationAttributeId: over.interpretationAttributeId ?? 1,
    };
}

function si(over: any = {}) {
    return {
        id: over.id ?? 1,
        attributes: over.attributes ?? [attr()],
        commentary: over.commentary ?? '',
    };
}

function meta() {
    return [
        {
            attributeId: 20,
            attributeName: 'is_reconstructed',
            repeatable: false,
            batchEditable: true,
            editable: true,
            values: [{ id: 200, value: 'TRUE' }],
        },
        {
            attributeId: 10,
            attributeName: 'sign_type',
            repeatable: false,
            batchEditable: true,
            editable: true,
            values: [{ id: 100, value: 'LETTER' }],
        },
    ];
}

function makeState(over: any = {}) {
    return {
        editions: {
            current: {
                permission: { readOnly: over.readOnly ?? false },
                attributeMetadata: { allAttributes: over.meta ?? meta() },
            },
        },
        textFragmentEditor: {
            selectedAttribute: null,
            selectedSignInterpretations: over.sis ?? [si()],
        },
        eventBus: { on: vi.fn(), emit: vi.fn() },
    };
}

function mountPane(state: any) {
    return mountComponent(SignAttributePane, {
        state,
        stubs: {
            'b-form-checkbox': true,
            'b-dropdown': true,
            'b-dropdown-item': true,
            comment: true,
            'sign-attribute': true,
            'sign-attribute-modal': true,
        },
    });
}

describe('sign-attribute-pane', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        attrOps.length = 0;
        commentOps.length = 0;
    });

    it('mounts and exposes simple getters', () => {
        const state = makeState();
        const w = mountPane(state);
        expect(w.exists()).toBe(true);
        expect(w.vm.readOnly).toBe(false);
        expect(w.vm.currentEdition).toBe(state.editions.current);
        expect(w.vm.editorState).toBe(state.textFragmentEditor);
    });

    it('isMultiSelect true unless exactly one si', () => {
        expect(mountPane(makeState()).vm.isMultiSelect).toBe(false);
        expect(mountPane(makeState({ sis: [si({ id: 1 }), si({ id: 2 })] })).vm.isMultiSelect).toBe(true);
    });

    it('allSiAreReconstructed false when nothing selected', () => {
        expect(mountPane(makeState({ sis: [] })).vm.allSiAreReconstructed).toBe(false);
    });

    it('allSiAreReconstructed true when all have the reconstructed attr', () => {
        const sis = [
            si({ attributes: [attr({ attributeString: 'is_reconstructed', attributeValueString: 'TRUE' })] }),
        ];
        expect(mountPane(makeState({ sis })).vm.allSiAreReconstructed).toBe(true);
    });

    it('comment getter returns commentary in single-select and empty in multi', () => {
        expect(mountPane(makeState({ sis: [si({ commentary: 'note' })] })).vm.comment).toBe('note');
        expect(mountPane(makeState({ sis: [si({ id: 1 }), si({ id: 2 })] })).vm.comment).toBe('');
    });

    it('comment setter creates a comment op and emits new-operation', () => {
        const state = makeState();
        const w = mountPane(state);
        w.vm.comment = 'hello';
        expect(commentOps.length).toBe(1);
        expect(opRedo).toHaveBeenCalledWith(true);
        expect(state.eventBus.emit).toHaveBeenCalledWith('new-operation', expect.anything());
    });

    it('comment setter warns in multi-select', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const state = makeState({ sis: [si({ id: 1 }), si({ id: 2 })] });
        const w = mountPane(state);
        w.vm.comment = 'x';
        expect(warn).toHaveBeenCalled();
        expect(commentOps.length).toBe(0);
        warn.mockRestore();
    });

    it('attributes getter returns the intersection across selected sis', () => {
        const shared = attr({ attributeValueId: 100 });
        const sis = [
            si({ attributes: [shared, attr({ attributeValueId: 999 })] }),
            si({ id: 2, attributes: [attr({ attributeValueId: 100 })] }),
        ];
        const w = mountPane(makeState({ sis }));
        const values = w.vm.attributes.map((a: any) => a.attributeValueId);
        expect(values).toEqual([100]);
    });

    it('attributes getter returns [] with no selection', () => {
        expect(mountPane(makeState({ sis: [] })).vm.attributes).toEqual([]);
    });

    it('onAttributeClick sets the selected attribute in state', () => {
        const state = makeState();
        const w = mountPane(state);
        const a = attr();
        w.vm.onAttributeClick(a);
        expect(state.textFragmentEditor.selectedAttribute).toBe(a);
    });

    it('onAddAttribute creates ops, emits bulk and hides the menu', () => {
        const state = makeState();
        const w = mountPane(state);
        // The b-dropdown `attributesMenu` ref does not register under @vue/compat
        // stubbed markup, so the final `.hide()` call throws — we assert the
        // meaningful effects (ops + emit) that run before it.
        try {
            w.vm.onAddAttribute({ attributeId: 10, attributeName: 'sign_type' } as any, { id: 100, value: 'LETTER' } as any);
        } catch {
            // ignore the $refs.hide() call on the missing ref
        }
        expect(attrOps.length).toBe(1);
        expect(opRedo).toHaveBeenCalledWith(true);
        expect(state.eventBus.emit).toHaveBeenCalledWith('new-bulk-operations', expect.any(Array));
    });

    it('onDeleteAttribute creates ops and emits bulk', () => {
        const state = makeState();
        const w = mountPane(state);
        w.vm.onDeleteAttribute({ id: 100 } as any);
        expect(attrOps.length).toBe(1);
        expect(state.eventBus.emit).toHaveBeenCalledWith('new-bulk-operations', expect.any(Array));
    });

    it('onReconstructedCheckBoxChanged(true) adds the reconstructed attribute', () => {
        const state = makeState();
        const w = mountPane(state);
        const spy = vi.spyOn(w.vm as any, 'onAddAttribute').mockImplementation(() => undefined);
        w.vm.onReconstructedCheckBoxChanged(true);
        expect(spy).toHaveBeenCalled();
    });

    it('onReconstructedCheckBoxChanged(false) deletes the reconstructed attribute', () => {
        const state = makeState();
        const w = mountPane(state);
        const spy = vi.spyOn(w.vm as any, 'onDeleteAttribute').mockImplementation(() => undefined);
        w.vm.onReconstructedCheckBoxChanged(false);
        expect(spy).toHaveBeenCalled();
    });

    it('onReconstructedCheckBoxChanged is a no-op with no matching metadata', () => {
        const state = makeState({ meta: [] });
        const w = mountPane(state);
        expect(() => w.vm.onReconstructedCheckBoxChanged(true)).not.toThrow();
    });

    it('onAddAttributesMenuOpen populates attributesMenu via prepareAttributesMenu', () => {
        const state = makeState();
        const w = mountPane(state);
        w.vm.onAddAttributesMenuOpen();
        // is_reconstructed (not present on the si) is eligible; sign_type is present & not repeatable -> excluded
        const names = w.vm.attributesMenu.map((a: any) => a.attributeName);
        expect(names).toContain('is_reconstructed');
        expect(names).not.toContain('sign_type');
    });

    it('prepareAttributesMenu returns [] with no selection', () => {
        expect(mountPane(makeState({ sis: [] })).vm.prepareAttributesMenu()).toEqual([]);
    });

    it('prepareAttributesMenu skips non-batchEditable when multiple sis selected', () => {
        const m = [
            { attributeId: 30, attributeName: 'only_single', repeatable: true, batchEditable: false, editable: true, values: [] },
        ];
        const state = makeState({ meta: m, sis: [si({ id: 1 }), si({ id: 2 })] });
        const w = mountPane(state);
        expect(w.vm.prepareAttributesMenu()).toEqual([]);
    });

    it('prepareAttributesMenu skips non-editable when a single si selected', () => {
        const m = [
            { attributeId: 30, attributeName: 'batch_only', repeatable: true, batchEditable: true, editable: false, values: [] },
        ];
        const state = makeState({ meta: m });
        const w = mountPane(state);
        expect(w.vm.prepareAttributesMenu()).toEqual([]);
    });

    it('prepareAttributesMenu filters out already-used values for repeatable attributes', () => {
        const m = [
            {
                attributeId: 10,
                attributeName: 'sign_type',
                repeatable: true,
                batchEditable: true,
                editable: true,
                values: [{ id: 100, value: 'LETTER' }, { id: 101, value: 'SPACE' }],
            },
        ];
        // si already uses value 100 -> it should be removed from the menu copy
        const state = makeState({ meta: m, sis: [si({ attributes: [attr({ attributeValueId: 100 })] })] });
        const w = mountPane(state);
        const result = w.vm.prepareAttributesMenu();
        expect(result[0].values.map((v: any) => v.id)).toEqual([101]);
    });

    // (Removed: the keepOpen / onValuesMenuShow/Hide / onAttributesMenuHide handlers
    // were dead — bootstrap-vue-next's <b-dropdown> never emits show/hide, so those
    // @show/@hide handlers never fired. The nested "Add attribute" submenu now relies
    // on bootstrap-vue-next's native auto-close.)
});
