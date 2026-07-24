import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const replaceText = vi.fn();
vi.mock('@/services/text', () => ({
    default: class {
        replaceText = replaceText;
    },
}));

vi.mock('@/views/artefact-editor/operations', () => ({
    ArtefactEditLineOperation: class {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(...args: any[]) {
            (this as any).args = args;
            (this as any).type = 'editLine';
        }
        public uniteWith() { return undefined; }
    },
}));

import EditLineModal from '@/components/text/edit-line-modal.vue';
import { mountComponent } from './helpers/mount';

function makeSi(over: any = {}) {
    return {
        id: over.id ?? 1,
        attributes: over.attributes ?? [],
        sign: over.sign ?? { line: over.line ?? { lineId: 3, signs: [] } },
    };
}

function makeState(sis: any[], attributesMetadata: any[] = []) {
    return {
        operationsManager: undefined,
        textFragmentEditor: { selectedSignInterpretations: sis },
        editions: {
            current: { attributeMetadata: { allAttributes: attributesMetadata } },
        },
        eventBus: { on: vi.fn(), emit: vi.fn() },
    };
}

function mountModal(state: any) {
    return mountComponent(EditLineModal, {
        state,
        mocks: { $route: { params: { editionId: '9' } } },
        stubs: {
            'b-modal': true,
            'b-button': true,
            'b-form-checkbox': true,
            'text-line': true,
        },
    });
}

describe('edit-line-modal', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.useRealTimers());

    it('mounts and wires the operationsManager into state', () => {
        const state = makeState([makeSi()]);
        const w = mountModal(state);
        expect(w.exists()).toBe(true);
        expect(state.operationsManager).toBe(w.vm.operationsManager);
    });

    it('editionId parses the route param', () => {
        const w = mountModal(makeState([makeSi()]));
        expect(w.vm.editionId).toBe(9);
    });

    it('line getter returns the selected sign line', () => {
        const line = { lineId: 42, signs: [] };
        const w = mountModal(makeState([makeSi({ line })]));
        expect(w.vm.line).toBe(line);
    });

    it('onLineChanged stores the edited text', () => {
        const w = mountModal(makeState([makeSi()]));
        w.vm.onLineChanged('hello');
        expect(w.vm.textLine).toBe('hello');
    });

    it('allSiAreReconstructed is false when nothing is selected', () => {
        const w = mountModal(makeState([]));
        expect(w.vm.allSiAreReconstructed).toBe(false);
    });

    it('allSiAreReconstructed is true when every si has the reconstructed attr', () => {
        const attrs = [
            { attributeString: 'is_reconstructed', attributeValueString: 'TRUE' },
        ];
        const w = mountModal(makeState([makeSi({ attributes: attrs })]));
        expect(w.vm.allSiAreReconstructed).toBe(true);
    });

    it('allSiAreReconstructed is false when an si is missing the attr', () => {
        const w = mountModal(makeState([makeSi({ attributes: [] })]));
        expect(w.vm.allSiAreReconstructed).toBe(false);
    });

    it('attributesMetadata falls back to empty array', () => {
        const state = makeState([makeSi()]);
        state.editions.current.attributeMetadata = undefined as any;
        const w = mountModal(state);
        expect(w.vm.attributesMetadata).toEqual([]);
    });

    it('onAddAttribute marks all selected sis as reconstructed', () => {
        const si = makeSi({ attributes: [{}] });
        const w = mountModal(makeState([si]));
        w.vm.onAddAttribute({} as any, {} as any);
        expect(si.attributes[0].attributeString).toBe('is_reconstructed');
        expect(si.attributes[0].attributeValueString).toBe('TRUE');
    });

    it('onDeleteAttribute sets the second attr to LETTER sign_type', () => {
        const si = makeSi({ attributes: [{}, {}] });
        const w = mountModal(makeState([si]));
        w.vm.onDeleteAttribute({} as any);
        expect(si.attributes[1].attributeString).toBe('sign_type');
        expect(si.attributes[1].attributeValueString).toBe('LETTER');
    });

    it('onReconstructedCheckBoxChanged(true) routes to onAddAttribute', () => {
        const meta = [
            {
                attributeName: 'is_reconstructed',
                values: [{ value: 'TRUE' }],
            },
        ];
        const si = makeSi({ attributes: [{}] });
        const w = mountModal(makeState([si], meta));
        const spy = vi.spyOn(w.vm as any, 'onAddAttribute');
        w.vm.onReconstructedCheckBoxChanged(true);
        expect(spy).toHaveBeenCalled();
    });

    it('onReconstructedCheckBoxChanged(false) routes to onDeleteAttribute', () => {
        const meta = [
            {
                attributeName: 'is_reconstructed',
                values: [{ value: 'TRUE' }],
            },
        ];
        const si = makeSi({ attributes: [{}, {}] });
        const w = mountModal(makeState([si], meta));
        const spy = vi.spyOn(w.vm as any, 'onDeleteAttribute');
        w.vm.onReconstructedCheckBoxChanged(false);
        expect(spy).toHaveBeenCalled();
    });

    it('onReconstructedCheckBoxChanged is a no-op with no matching metadata', () => {
        const si = makeSi({ attributes: [{}] });
        const w = mountModal(makeState([si], []));
        expect(() => w.vm.onReconstructedCheckBoxChanged(true)).not.toThrow();
    });

    // Note: `shown()` and `checkDifference()` read the rendered text-line via a
    // dynamic `$refs['line-<id>']`, which the stubbed/hoisted b-modal slot does
    // not register under @vue/compat — so those DOM-coupled paths are not
    // unit-mountable here and are intentionally left uncovered.

    it('saveEntities resolves true', async () => {
        const w = mountModal(makeState([makeSi()]));
        await expect(w.vm.saveEntities([])).resolves.toBe(true);
    });

    it('created subscribes to the edit-line event; beforeUnmount disposes', () => {
        const state = makeState([makeSi()]);
        const w = mountModal(state);
        expect(state.eventBus.on).toHaveBeenCalledWith(
            'change-artefact-edit-line',
            expect.any(Function)
        );
        expect(() => w.unmount()).not.toThrow();
    });
});
