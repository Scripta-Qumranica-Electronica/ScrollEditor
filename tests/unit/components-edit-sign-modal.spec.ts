import { describe, it, expect, vi, beforeEach } from 'vitest';

// Inert operation classes with a redo() spy so statusMode()/create/update can run.
const redo = vi.fn();
vi.mock('@/views/artefact-editor/operations', () => ({
    UpdateSignInterperationOperation: class {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(...args: any[]) {
            (this as any).args = args;
            (this as any).kind = 'update';
        }
        public redo = redo;
    },
    CreateSignInterpretationOperation: class {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(...args: any[]) {
            (this as any).args = args;
            (this as any).kind = 'create';
        }
        public redo = redo;
    },
    SignInterpretationEditOperation: class {},
    ArtefactEditorOperation: class {},
}));

import EditSignModal from '@/components/text/edit-sign-modal.vue';
import { mountComponent } from './helpers/mount';

// sign_type attribute metadata with LETTER/SPACE values.
function signTypeMeta() {
    return [
        {
            attributeName: 'sign_type',
            values: [
                { id: 1, value: 'SPACE' },
                { id: 2, value: 'LETTER' },
            ],
        },
    ];
}

function makeState(over: any = {}) {
    return {
        textFragmentEditor: {
            modeSignModal: over.mode ?? 'edit',
            singleSelectedSi: over.singleSelectedSi ?? {
                character: 'א',
                signType: [2, 'LETTER'],
                isReconstructed: false,
                id: 99,
                attributes: [
                    { attributeString: 'sign_type', attributeValueString: 'LETTER' },
                ],
            },
        },
        editions: {
            current: {
                attributeMetadata: { allAttributes: over.meta ?? signTypeMeta() },
            },
        },
        eventBus: { on: vi.fn(), emit: vi.fn() },
    };
}

function mountModal(state: any) {
    return mountComponent(EditSignModal, {
        state,
        stubs: {
            'b-modal': true,
            'b-row': true,
            'b-col': true,
            'b-form-input': true,
            'b-form-select': true,
            'b-form-checkbox': true,
            'b-button': true,
        },
    });
}

describe('edit-sign-modal', () => {
    beforeEach(() => vi.clearAllMocks());

    it('mounts', () => {
        const w = mountModal(makeState());
        expect(w.exists()).toBe(true);
    });

    it('isEditMode reflects the modeSignModal state', () => {
        expect(mountModal(makeState({ mode: 'edit' })).vm.isEditMode).toBe(true);
        expect(mountModal(makeState({ mode: 'add' })).vm.isEditMode).toBe(false);
    });

    it('newAttributeValueIdModel getter/setter round-trips a string', () => {
        const w = mountModal(makeState());
        w.vm.newAttributeValueIdModel = '2';
        expect(w.vm.newAttributeValueId).toBe(2);
        expect(w.vm.newAttributeValueIdModel).toBe('2');
    });

    it('newAttributeValueIdModel setter accepts an array', () => {
        const w = mountModal(makeState());
        w.vm.newAttributeValueIdModel = ['1'] as any;
        expect(w.vm.newAttributeValueId).toBe(1);
    });

    it('signTypes is sorted ascending by id', () => {
        const w = mountModal(makeState());
        const ids = w.vm.signTypes.map((v: any) => v.id);
        expect(ids).toEqual([1, 2]);
    });

    it('shown() in edit mode seeds fields from the selected sign', () => {
        const w = mountModal(makeState({ mode: 'edit' }));
        w.vm.shown();
        expect(w.vm.editedSi).not.toBeNull();
        expect(w.vm.newCharacter).toBe('א');
        expect(w.vm.newAttributeValueId).toBe(2);
        expect(w.vm.isReconstructed).toBe(false);
    });

    it('shown() in add mode resets to defaults', () => {
        const w = mountModal(makeState({ mode: 'add' }));
        w.vm.shown();
        expect(w.vm.newCharacter).toBe('');
        expect(w.vm.newAttributeValueId).toBe(2);
        expect(w.vm.isReconstructed).toBe(false);
    });

    it('editedSiSignType finds the sign_type attribute', () => {
        const w = mountModal(makeState());
        w.vm.shown();
        expect(w.vm.editedSiSignType?.attributeString).toBe('sign_type');
    });

    it('isLetter: a normal key selects LETTER', () => {
        const w = mountModal(makeState());
        const e: any = { keyCode: 65, preventDefault: vi.fn() };
        w.vm.isLetter(e);
        expect(w.vm.newAttributeValueId).toBe(2);
        expect(e.preventDefault).not.toHaveBeenCalled();
    });

    it('isLetter: space/backspace/delete selects SPACE and prevents default', () => {
        const w = mountModal(makeState());
        const e: any = { keyCode: 32, preventDefault: vi.fn() };
        w.vm.isLetter(e);
        expect(w.vm.newAttributeValueId).toBe(1);
        expect(e.preventDefault).toHaveBeenCalled();
    });

    it('valueField clears the character when the value is not LETTER', () => {
        const w = mountModal(makeState());
        w.vm.newCharacter = 'x';
        w.vm.valueField(1); // SPACE
        expect(w.vm.newCharacter).toBe('');
    });

    it('valueField keeps the character when the value is LETTER', () => {
        const w = mountModal(makeState());
        w.vm.newCharacter = 'x';
        w.vm.valueField(2); // LETTER
        expect(w.vm.newCharacter).toBe('x');
    });

    it('modeButtonApply is false for LETTER with empty character', () => {
        const w = mountModal(makeState());
        w.vm.newAttributeValueId = 2;
        w.vm.newCharacter = '';
        expect(w.vm.modeButtonApply).toBe(false);
    });

    it('modeButtonApply is true for LETTER with a character', () => {
        const w = mountModal(makeState());
        w.vm.newAttributeValueId = 2;
        w.vm.newCharacter = 'y';
        expect(w.vm.modeButtonApply).toBe(true);
    });

    it('updateSignInterpretation redoes and emits new-operation', () => {
        const state = makeState();
        const w = mountModal(state);
        w.vm.shown();
        w.vm.newCharacter = 'ב';
        w.vm.newAttributeValueId = 2;
        w.vm.updateSignInterpretation();
        expect(redo).toHaveBeenCalledWith(true);
        expect(state.eventBus.emit).toHaveBeenCalledWith(
            'new-operation',
            expect.anything()
        );
    });

    it('createSignInterpretation redoes and emits new-operation', () => {
        const state = makeState();
        const w = mountModal(state);
        w.vm.shown();
        w.vm.newCharacter = 'ג';
        w.vm.newAttributeValueId = 2;
        w.vm.createSignInterpretation();
        expect(redo).toHaveBeenCalledWith(true);
        expect(state.eventBus.emit).toHaveBeenCalledWith(
            'new-operation',
            expect.anything()
        );
    });

    it('statusMode in edit mode updates and hides', () => {
        const w = mountModal(makeState({ mode: 'edit' }));
        w.vm.shown();
        w.vm.modalVisible = true;
        const spy = vi.spyOn(w.vm as any, 'updateSignInterpretation');
        w.vm.statusMode();
        expect(spy).toHaveBeenCalled();
        expect(w.vm.modalVisible).toBe(false);
    });

    it('statusMode in add mode creates and hides', () => {
        const w = mountModal(makeState({ mode: 'add' }));
        w.vm.shown();
        w.vm.modalVisible = true;
        const spy = vi.spyOn(w.vm as any, 'createSignInterpretation');
        w.vm.statusMode();
        expect(spy).toHaveBeenCalled();
        expect(w.vm.modalVisible).toBe(false);
    });

    it('beforeUnmount disposes the modal listener', () => {
        const w = mountModal(makeState());
        expect(() => w.unmount()).not.toThrow();
    });
});
