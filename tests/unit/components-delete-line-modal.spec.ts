import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const createLine = vi.fn();
const deleteLine = vi.fn();
vi.mock('@/services/text', () => ({
    default: class {
        createLine = createLine;
        deleteLine = deleteLine;
    },
}));

vi.mock('@/views/artefact-editor/operations', () => ({
    ArtefactDeleteLineOperation: class {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(...args: any[]) {
            (this as any).args = args;
            (this as any).type = 'deleteLine';
        }
        public uniteWith() { return undefined; }
    },
}));

import DeleteLineModal from '@/components/text/delete-line-modal.vue';
import { mountComponent } from './helpers/mount';

function makeFragment(lineNames: string[]) {
    const lines = lineNames.map((lineName, i) => ({
        lineName,
        lineId: 100 + i,
        editorId: 7,
        signs: [],
    }));
    const textFragment: any = { textFragmentId: 55, lines };
    lines.forEach(l => (l.textFragment = textFragment));
    return { textFragment, lines };
}

function makeState(selectedLineName: string, lineNames: string[]) {
    const { textFragment, lines } = makeFragment(lineNames);
    const line = lines.find(l => l.lineName === selectedLineName)!;
    const selectedSi: any = { sign: { line } };
    return {
        state: {
            operationsManager: undefined,
            textFragmentEditor: { selectedSignInterpretations: [selectedSi] },
            eventBus: { on: vi.fn(), emit: vi.fn() },
        },
        textFragment,
        lines,
    };
}

function mountModal(state: any) {
    return mountComponent(DeleteLineModal, {
        state,
        mocks: { $route: { params: { editionId: '9' } } },
        stubs: { 'b-modal': true, 'b-button': true, 'text-line': true },
    });
}

describe('delete-line-modal', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.useRealTimers());

    it('mounts and wires the operationsManager into state', () => {
        const { state } = makeState('1', ['1', '2', '3']);
        const w = mountModal(state);
        expect(w.exists()).toBe(true);
        expect(state.operationsManager).toBe(w.vm.operationsManager);
    });

    it('editionId parses the route param', () => {
        const { state } = makeState('1', ['1', '2']);
        const w = mountModal(state);
        expect(w.vm.editionId).toBe(9);
    });

    it('notInTheRightComponent branch returns the selected line', () => {
        const { state, lines } = makeState('2', ['1', '2', '3']);
        const w = mountModal(state);
        w.vm.notInTheRightComponent = true;
        expect(w.vm.line.lineId).toBe(lines[1].lineId);
    });

    it('line getter computes previous/subsequent ids around the selected line', () => {
        const { state, lines } = makeState('2', ['1', '2', '3']);
        const w = mountModal(state);
        const line = w.vm.line;
        expect(line.lineName).toBe('2');
        expect(w.vm.textFragmentId).toBe(55);
        expect(w.vm.previousLineId).toBe(lines[1].lineId);
        expect(w.vm.subsequentLineId).toBe(lines[2].lineId);
    });

    it('deleteLine calls service, records an op and hides the modal', () => {
        const { state } = makeState('2', ['1', '2', '3']);
        const w = mountModal(state);
        w.vm.modalVisible = true;
        w.vm.deleteLine();
        expect(deleteLine).toHaveBeenCalledTimes(1);
        expect(w.vm.operationsManager.undoStack.length).toBe(1);
        expect(w.vm.modalVisible).toBe(false);
    });

    it('saveEntities resolves true', async () => {
        const { state } = makeState('1', ['1', '2']);
        const w = mountModal(state);
        await expect(w.vm.saveEntities([])).resolves.toBe(true);
    });

    it('created subscribes to the delete-line event; beforeUnmount disposes', () => {
        const { state } = makeState('1', ['1', '2']);
        const w = mountModal(state);
        expect(state.eventBus.on).toHaveBeenCalledWith(
            'change-artefact-delete-line',
            expect.any(Function)
        );
        expect(() => w.unmount()).not.toThrow();
    });
});
