import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the TextService module so the modal's `new TextService()` is inert.
const createLine = vi.fn();
const deleteLine = vi.fn();
vi.mock('@/services/text', () => ({
    default: class {
        createLine = createLine;
        deleteLine = deleteLine;
    },
}));

// Mock the operations module so constructing operations doesn't reach currentState().
vi.mock('@/views/artefact-editor/operations', () => ({
    ArtefactAddLineOperation: class {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(...args: any[]) {
            (this as any).args = args;
            (this as any).type = 'addLine';
        }
        public uniteWith() { return undefined; }
    },
}));

import AddLineModal from '@/components/text/add-line-modal.vue';
import { mountComponent } from './helpers/mount';

// Build a fake sign-interpretation graph: a text-fragment with a list of lines,
// where the "selected" sign points into a specific line.
function makeFragment(lineNames: string[]) {
    const lines = lineNames.map((lineName, i) => ({
        lineName,
        lineId: 100 + i,
        editorId: 7,
        signs: [],
        textFragment: {} as any,
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
    return mountComponent(AddLineModal, {
        state,
        mocks: { $route: { params: { editionId: '9' } } },
        stubs: { 'b-modal': true, 'b-button': true, 'text-line': true },
    });
}

describe('add-line-modal', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.useRealTimers());

    it('mounts and registers the modal listener / operationsManager', () => {
        const { state } = makeState('1', ['1', '2', '3']);
        const w = mountModal(state);
        expect(w.exists()).toBe(true);
        // mounted() assigns the operationsManager onto state
        expect(state.operationsManager).toBe(w.vm.operationsManager);
    });

    it('editionId parses the route param', () => {
        const { state } = makeState('1', ['1', '2', '3']);
        const w = mountModal(state);
        expect(w.vm.editionId).toBe(9);
    });

    it('onModalShow logs the parameter without throwing', () => {
        const { state } = makeState('1', ['1']);
        const w = mountModal(state);
        expect(() => w.vm.onModalShow('x')).not.toThrow();
    });

    it('notInTheRightComponent branch returns the selected line directly', () => {
        const { state, lines } = makeState('2', ['1', '2', '3']);
        const w = mountModal(state);
        w.vm.notInTheRightComponent = true;
        const line = w.vm.line;
        expect(line.lineId).toBe(lines[1].lineId);
        expect(line.lineName).toBe('2');
    });

    it('onLineNamed mutates the derived line name', () => {
        const { state } = makeState('2', ['1', '2', '3']);
        const w = mountModal(state);
        w.vm.notInTheRightComponent = true;
        w.vm.onLineNamed('renamed');
        expect(w.vm.line.lineName).toBe('renamed');
    });

    it('line getter (after) computes prev/subsequent ids for a middle line', () => {
        const { state, lines } = makeState('2', ['1', '2', '3']);
        const w = mountModal(state);
        w.vm.position = 'after';
        const line = w.vm.line;
        expect(line.lineId).toBe(-1);
        expect(w.vm.textFragmentId).toBe(55);
        expect(w.vm.previousLineId).toBe(lines[1].lineId);
        expect(w.vm.subsequentLineId).toBe(lines[2].lineId);
    });

    it('line getter (after) on the last line leaves subsequent undefined', () => {
        const { state, lines } = makeState('3', ['1', '2', '3']);
        const w = mountModal(state);
        w.vm.position = 'after';
        void w.vm.line;
        expect(w.vm.previousLineId).toBe(lines[2].lineId);
        expect(w.vm.subsequentLineId).toBeUndefined();
    });

    it('line getter (before) computes prev/subsequent for a middle line', () => {
        const { state, lines } = makeState('2', ['1', '2', '3']);
        const w = mountModal(state);
        w.vm.position = 'before';
        void w.vm.line;
        expect(w.vm.previousLineId).toBe(lines[0].lineId);
        expect(w.vm.subsequentLineId).toBe(lines[1].lineId);
    });

    it('line getter (before) on the first line leaves previous undefined', () => {
        const { state, lines } = makeState('1', ['1', '2', '3']);
        const w = mountModal(state);
        w.vm.position = 'before';
        void w.vm.line;
        expect(w.vm.previousLineId).toBeUndefined();
        expect(w.vm.subsequentLineId).toBe(lines[0].lineId);
    });

    it('updateLineName: no underscore, after -> appends _1', () => {
        const { state, textFragment } = makeState('2', ['1', '2', '3']);
        const w = mountModal(state);
        w.vm.position = 'after';
        expect(w.vm.updateLineName('2', textFragment)).toBe('2_1');
    });

    it('updateLineName: no underscore, before -> (n-1)_1', () => {
        const { state, textFragment } = makeState('2', ['1', '2', '3']);
        const w = mountModal(state);
        w.vm.position = 'before';
        expect(w.vm.updateLineName('2', textFragment)).toBe('1_1');
    });

    it('updateLineName: one underscore, after, no collision -> increments', () => {
        const { state, textFragment } = makeState('2_1', ['2_1', '5']);
        const w = mountModal(state);
        w.vm.position = 'after';
        expect(w.vm.updateLineName('2_1', textFragment)).toBe('2_2');
    });

    it('updateLineName: one underscore, after, collision -> _0 suffix', () => {
        const { state, textFragment } = makeState('2_1', ['2_1', '2_2']);
        const w = mountModal(state);
        w.vm.position = 'after';
        expect(w.vm.updateLineName('2_1', textFragment)).toBe('2_1_0');
    });

    it('updateLineName: one underscore, before, no collision -> decrements', () => {
        const { state, textFragment } = makeState('2_5', ['1', '2_5', '9']);
        const w = mountModal(state);
        w.vm.position = 'before';
        expect(w.vm.updateLineName('2_5', textFragment)).toBe('2_4');
    });

    it('updateLineName: two underscores -> empty string', () => {
        const { state, textFragment } = makeState('2_1_0', ['2_1_0']);
        const w = mountModal(state);
        w.vm.position = 'after';
        expect(w.vm.updateLineName('2_1_0', textFragment)).toBe('');
    });

    it('updateLineName: no textFragment -> empty string', () => {
        const { state } = makeState('1', ['1']);
        const w = mountModal(state);
        expect(w.vm.updateLineName('1', undefined as any)).toBe('');
    });

    it('saveNewLine calls the service, records an operation and hides the modal', () => {
        const { state } = makeState('2', ['1', '2', '3']);
        const w = mountModal(state);
        w.vm.position = 'after';
        w.vm.modalVisible = true;
        w.vm.saveNewLine();
        expect(createLine).toHaveBeenCalledTimes(1);
        expect(w.vm.operationsManager.undoStack.length).toBe(1);
        expect(w.vm.modalVisible).toBe(false);
    });

    it('saveEntities resolves true', async () => {
        const { state } = makeState('1', ['1']);
        const w = mountModal(state);
        await expect(w.vm.saveEntities([])).resolves.toBe(true);
    });

    it('created subscribes to the add-line event; beforeUnmount disposes', () => {
        const { state } = makeState('1', ['1']);
        const w = mountModal(state);
        expect(state.eventBus.on).toHaveBeenCalledWith(
            'change-artefact-add-line',
            expect.any(Function)
        );
        expect(() => w.unmount()).not.toThrow();
    });
});
