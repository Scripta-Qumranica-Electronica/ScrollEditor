import { describe, it, expect, vi, beforeEach } from 'vitest';

const opRedo = vi.fn();
const opInstances: any[] = [];
vi.mock('@/views/artefact-editor/operations', () => ({
    TextFragmentAttributeOperation: class {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(public siId: number, public attrValueId: number, public next?: any) {
            opInstances.push(this);
        }
        public redo = opRedo;
    },
}));

import SignAttributeModal from '@/components/sign-attributes/sign-attribute-modal.vue';
import { mountComponent } from './helpers/mount';

function makeAttr(over: any = {}) {
    return {
        attributeId: over.attributeId ?? 10,
        attributeString: over.attributeString ?? 'sign_type',
        attributeValueId: over.attributeValueId ?? 100,
        attributeValueString: over.attributeValueString ?? 'LETTER',
        commentary: over.commentary,
    };
}

function makeMetadata(over: any = {}) {
    return {
        getAttribute: vi.fn().mockReturnValue(
            over.attribute ?? {
                removable: true,
                editable: true,
                batchEditable: true,
                description: 'attr-desc ',
                values: [
                    { id: 100, value: 'LETTER', description: '' },
                    { id: 101, value: 'SPACE', description: 'space-desc' },
                ],
            }
        ),
        getAttributeValue: vi
            .fn()
            .mockReturnValue(over.attributeValue ?? { description: 'val-desc' }),
    };
}

function makeState(over: any = {}) {
    const attribute = over.attribute === null ? null : over.attribute ?? makeAttr();
    return {
        editions: {
            current: {
                permission: { readOnly: over.readOnly ?? false },
                attributeMetadata: over.metadata ?? makeMetadata(),
            },
        },
        textFragmentEditor: {
            selectedAttribute: attribute,
            selectedSignInterpretations:
                over.sis ?? [{ id: 1, attributes: [makeAttr()] }],
        },
        eventBus: { on: vi.fn(), emit: vi.fn() },
    };
}

function mountModal(state: any) {
    return mountComponent(SignAttributeModal, {
        state,
        stubs: {
            'b-modal': true,
            'b-row': true,
            'b-col': true,
            'b-form-select': true,
            'b-button': true,
            comment: true,
            'sign-attribute-badge': true,
        },
    });
}

describe('sign-attribute-modal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        opInstances.length = 0;
    });

    it('mounts and isVisible tracks the selected attribute', () => {
        const w = mountModal(makeState());
        expect(w.exists()).toBe(true);
        expect(w.vm.isVisible).toBe(true);
    });

    it('isVisible is false with no attribute', () => {
        const w = mountModal(makeState({ attribute: null }));
        expect(w.vm.isVisible).toBe(false);
    });

    it('readOnly reflects the edition permission', () => {
        expect(mountModal(makeState({ readOnly: true })).vm.readOnly).toBe(true);
        expect(mountModal(makeState({ readOnly: false })).vm.readOnly).toBe(false);
    });

    it('isMultiSelect is true unless exactly one si is selected', () => {
        expect(mountModal(makeState()).vm.isMultiSelect).toBe(false);
        expect(
            mountModal(makeState({ sis: [{ id: 1, attributes: [] }, { id: 2, attributes: [] }] }))
                .vm.isMultiSelect
        ).toBe(true);
    });

    it('deleteAllowed / editAllowed derive from metadata', () => {
        const w = mountModal(makeState());
        expect(w.vm.deleteAllowed).toBe(true);
        expect(w.vm.editAllowed).toBe(true);
    });

    it('comment getter returns the attribute commentary in single-select', () => {
        const attribute = makeAttr({ commentary: { commentary: 'hi' } });
        const w = mountModal(makeState({ attribute }));
        expect(w.vm.comment).toBe('hi');
    });

    it('comment getter returns empty in multi-select', () => {
        const w = mountModal(
            makeState({ sis: [{ id: 1, attributes: [] }, { id: 2, attributes: [] }] })
        );
        expect(w.vm.comment).toBe('');
    });

    it('comment setter creates an operation and emits new-operation', () => {
        const state = makeState();
        const w = mountModal(state);
        w.vm.comment = 'new comment';
        expect(opRedo).toHaveBeenCalledWith(true);
        expect(state.eventBus.emit).toHaveBeenCalledWith(
            'new-operation',
            expect.anything()
        );
    });

    it('comment setter warns and no-ops in multi-select', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const state = makeState({
            sis: [{ id: 1, attributes: [] }, { id: 2, attributes: [] }],
        });
        const w = mountModal(state);
        w.vm.comment = 'x';
        expect(warn).toHaveBeenCalled();
        expect(state.eventBus.emit).not.toHaveBeenCalled();
        warn.mockRestore();
    });

    it('possibleAttributeValues removes values already selected on the sis', () => {
        // si already has attributeValueId 100 selected -> should be filtered out
        const state = makeState({ sis: [{ id: 1, attributes: [makeAttr({ attributeValueId: 100 })] }] });
        const w = mountModal(state);
        const values = w.vm.possibleAttributeValues;
        expect(values.map((v: any) => v.id)).toEqual([101]);
    });

    it('possibleAttributeValues returns [] with no attribute', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const w = mountModal(makeState({ attribute: null }));
        expect(w.vm.possibleAttributeValues).toEqual([]);
        warn.mockRestore();
    });

    it('description concatenates attribute and value descriptions for non-TRUE values', () => {
        const w = mountModal(makeState());
        expect(w.vm.description).toBe('attr-desc val-desc');
    });

    it('description omits value description for TRUE (boolean) attributes', () => {
        const attribute = makeAttr({ attributeValueString: 'TRUE' });
        const w = mountModal(makeState({ attribute }));
        expect(w.vm.description).toBe('attr-desc ');
    });

    it('onDeleteAttribute builds one op per si, emits bulk and hides', () => {
        const state = makeState();
        const w = mountModal(state);
        w.vm.onDeleteAttribute();
        expect(opInstances.length).toBe(1);
        expect(opRedo).toHaveBeenCalledWith(true);
        expect(state.eventBus.emit).toHaveBeenCalledWith(
            'new-bulk-operations',
            expect.any(Array)
        );
        // hide() clears the selectedAttribute
        expect(state.textFragmentEditor.selectedAttribute).toBeNull();
    });

    it('onAttributeValueChanged updates matching attrs and emits bulk', () => {
        const state = makeState();
        const w = mountModal(state);
        w.vm.onAttributeValueChanged({ id: 101, value: 'SPACE' } as any);
        expect(opRedo).toHaveBeenCalledWith(true);
        expect(state.eventBus.emit).toHaveBeenCalledWith(
            'new-bulk-operations',
            expect.any(Array)
        );
        expect(w.vm.selected).toBeNull();
    });

    it('hide / onHide clear the selected attribute', () => {
        const state = makeState();
        const w = mountModal(state);
        w.vm.hide();
        expect(state.textFragmentEditor.selectedAttribute).toBeNull();
        expect(w.vm.hidingStarted).toBe(true);

        state.textFragmentEditor.selectedAttribute = makeAttr();
        w.vm.hidingStarted = false;
        w.vm.onHide();
        expect(state.textFragmentEditor.selectedAttribute).toBeNull();
    });

    it('onVisibilityChange(false) hides; (true) does nothing', () => {
        const state = makeState();
        const w = mountModal(state);
        w.vm.onVisibilityChange(true);
        expect(state.textFragmentEditor.selectedAttribute).not.toBeNull();
        w.vm.onVisibilityChange(false);
        expect(state.textFragmentEditor.selectedAttribute).toBeNull();
    });

    it('onAttributeChanged auto-hides when the attribute vanished externally', () => {
        const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
        const state = makeState({ attribute: null });
        const w = mountModal(state);
        w.vm.hidingStarted = false;
        w.vm.onAttributeChanged();
        // hide() ran (info toast logged) and the guard was reset for next time.
        expect(info).toHaveBeenCalled();
        expect(w.vm.hidingStarted).toBe(false);
        info.mockRestore();
    });

    it('onAttributeChanged resets hidingStarted when hide was already in progress', () => {
        const state = makeState({ attribute: null });
        const w = mountModal(state);
        w.vm.hidingStarted = true;
        w.vm.onAttributeChanged();
        expect(w.vm.hidingStarted).toBe(false);
    });
});
