import { describe, it, expect, vi, beforeEach } from 'vitest';

// Component-mount unit test for text-line. Exercises the line context-menu
// handlers (open/close/edit/add-before/add-after/delete), lineChange/checkEnter,
// and the showVariants / showParallels modal openers (with the edition/text/qwb
// services mocked so the modal opens and the empty branches run).

const showModal = vi.fn();
vi.mock('@/utils/modal-bus', () => ({
    showModal: (id: string) => showModal(id),
}));

const getSingleEditions = vi.fn();
const getManuscriptEditions = vi.fn();
vi.mock('@/services/edition', () => ({
    default: class {
        public getSingleEditions = getSingleEditions;
        public getManuscriptEditions = getManuscriptEditions;
    },
}));

const getLineText = vi.fn();
vi.mock('@/services/text', () => ({
    default: class {
        public getLineText = getLineText;
    },
}));

const getQwbParallelText = vi.fn();
vi.mock('@/services/qwb-proxy', () => ({
    default: class {
        public getQwbParallelText = getQwbParallelText;
    },
}));

// text-sign is a registered child; stub it out.
vi.mock('@/components/text/text-sign.vue', () => ({ default: {} }));

import TextLine from '@/components/text/text-line.vue';
import { mountComponent } from './helpers/mount';

function makeSi(over: any = {}) {
    return {
        signInterpretationId: over.id ?? 1,
        qwbWordIds: over.qwbWordIds ?? [],
    };
}

function makeLine(over: any = {}) {
    return {
        lineId: over.lineId ?? 10,
        lineName: over.lineName ?? '1',
        signs: over.signs ?? [{ signInterpretations: [makeSi()] }],
    };
}

function makeState() {
    const selectSign = vi.fn();
    return {
        state: {
            textFragmentEditor: {
                selectSign,
                selectedSignInterpretations: [],
            },
        },
        selectSign,
    };
}

function mountLine(line: any, ctx: any, over: { editMode?: boolean } = {}) {
    return mountComponent(TextLine, {
        state: ctx.state,
        props: { line, isEditMode: over.editMode ?? false, direction: 'rtl' },
        mocks: {
            $route: { params: { editionId: '9' } },
        },
        stubs: { 'b-popover': true, 'b-modal': true, 'text-sign': true },
    });
}

describe('text-line', () => {
    beforeEach(() => vi.clearAllMocks());

    it('mounts and editionId parses the route param', () => {
        const ctx = makeState();
        const w = mountLine(makeLine(), ctx);
        expect(w.exists()).toBe(true);
        expect(w.vm.editionId).toBe(9);
    });

    it('lineChange emits the element text content', () => {
        const w = mountLine(makeLine(), makeState());
        w.vm.lineChange({ target: { textContent: 'hi' } });
        const emitted = w.emitted('lineChange');
        expect(emitted).toBeTruthy();
        expect(emitted![0]).toEqual(['hi']);
    });

    it('checkEnter prevents default and blurs', () => {
        const w = mountLine(makeLine(), makeState());
        const blur = vi.fn();
        const ev: any = { preventDefault: vi.fn(), currentTarget: { blur } };
        w.vm.checkEnter(ev);
        expect(ev.preventDefault).toHaveBeenCalled();
        expect(blur).toHaveBeenCalled();
    });

    it('openEditLineModal selects the first sign and opens the modal', () => {
        const ctx = makeState();
        const line = makeLine();
        const w = mountLine(line, ctx);
        w.vm.openEditLineModal(line);
        expect(ctx.selectSign).toHaveBeenCalledWith(line.signs[0].signInterpretations[0]);
        expect(showModal).toHaveBeenCalledWith('editLineModal');
    });

    it('addLineBefore selects the first sign and opens the add-line modal', () => {
        const ctx = makeState();
        const line = makeLine();
        const w = mountLine(line, ctx);
        w.vm.addLineBefore(line);
        expect(ctx.selectSign).toHaveBeenCalled();
        expect(showModal).toHaveBeenCalledWith('addLineModal');
    });

    it('addLineAfter selects the first sign and opens the add-line modal', () => {
        const ctx = makeState();
        const line = makeLine();
        const w = mountLine(line, ctx);
        w.vm.addLineAfter(line);
        expect(ctx.selectSign).toHaveBeenCalled();
        expect(showModal).toHaveBeenCalledWith('addLineModal');
    });

    it('deleteLine selects the first sign and opens the delete modal', () => {
        const ctx = makeState();
        const line = makeLine();
        const w = mountLine(line, ctx);
        w.vm.deleteLine(line);
        expect(ctx.selectSign).toHaveBeenCalled();
        expect(showModal).toHaveBeenCalledWith('deleteLineModal');
    });

    it('openLineMenu is a no-op in edit mode', () => {
        const w = mountLine(makeLine(), makeState(), { editMode: true });
        const ev: any = { preventDefault: vi.fn() };
        w.vm.openLineMenu(ev, 'popover-line-10');
        expect(ev.preventDefault).not.toHaveBeenCalled();
        // early return leaves the tracked id untouched
        expect(w.vm.prevLineMenuId).toBe('');
    });

    it('openLineMenu shows the popover otherwise and stores the id', () => {
        const w = mountLine(makeLine(), makeState(), { editMode: false });
        const ev: any = { preventDefault: vi.fn() };
        w.vm.openLineMenu(ev, 'popover-line-10');
        expect(ev.preventDefault).toHaveBeenCalled();
        expect(w.vm.prevLineMenuId).toBe('popover-line-10');
    });

    it('closeLineMenu runs without throwing (emits the legacy hide event)', () => {
        const w = mountLine(makeLine(), makeState());
        w.vm.prevLineMenuId = 'popover-line-10';
        expect(() => w.vm.closeLineMenu()).not.toThrow();
    });

    it('onPaste inserts the pasted text and prevents default', () => {
        const w = mountLine(makeLine(), makeState());
        const range = { insertNode: vi.fn() };
        const selection = {
            rangeCount: 1,
            deleteFromDocument: vi.fn(),
            getRangeAt: vi.fn().mockReturnValue(range),
        };
        vi.spyOn(window, 'getSelection').mockReturnValue(selection as any);
        const ev: any = {
            clipboardData: { getData: () => 'pasted' },
            preventDefault: vi.fn(),
        };
        w.vm.onPaste(ev);
        expect(selection.deleteFromDocument).toHaveBeenCalled();
        expect(range.insertNode).toHaveBeenCalled();
        expect(ev.preventDefault).toHaveBeenCalled();
    });

    it('onPaste returns early when there is no range', () => {
        const w = mountLine(makeLine(), makeState());
        const selection = { rangeCount: 0 };
        vi.spyOn(window, 'getSelection').mockReturnValue(selection as any);
        const ev: any = {
            clipboardData: { getData: () => 'x' },
            preventDefault: vi.fn(),
        };
        w.vm.onPaste(ev);
        expect(ev.preventDefault).not.toHaveBeenCalled();
    });

    it('showParallels opens the modal and skips the fetch when ids are trivial', async () => {
        // signs with no qwbWordIds -> qwbWordIds array empty -> no fetch
        const w = mountLine(makeLine(), makeState());
        await w.vm.showParallels();
        expect(w.vm.showParallelModal).toBe(true);
        expect(getQwbParallelText).not.toHaveBeenCalled();
    });

    it('showParallels fetches parallel text for a valid word-id range', async () => {
        getQwbParallelText.mockResolvedValueOnce({ parallels: [] });
        const line = makeLine({
            signs: [
                { signInterpretations: [makeSi({ id: 1, qwbWordIds: [11] })] },
                { signInterpretations: [makeSi({ id: 2, qwbWordIds: [22] })] },
            ],
        });
        const w = mountLine(line, makeState());
        await w.vm.showParallels();
        expect(getQwbParallelText).toHaveBeenCalledWith(11, 22);
        expect(w.vm.parallels).toEqual({ parallels: [] });
    });

    it('showVariants opens the modal and lists sibling editions', async () => {
        getSingleEditions.mockResolvedValueOnce({ primary: { manuscriptId: 3 } });
        // one sibling edition (id 12) plus the current edition (id 9, skipped)
        getManuscriptEditions.mockResolvedValueOnce({
            editions: [[{ id: 9, name: 'self' }], [{ id: 12, name: 'sib', copyright: 'cc' }]],
        });
        getLineText.mockResolvedValueOnce({ lineName: 'L', signs: [] });
        const w = mountLine(makeLine(), makeState());
        await w.vm.showVariants();
        expect(w.vm.showVariantModal).toBe(true);
        expect(getLineText).toHaveBeenCalledWith(12, 10);
        expect(w.vm.variants.length).toBe(1);
        expect(w.vm.variants[0].editionId).toBe(12);
    });

    it('showVariants pushes an NA placeholder when getLineText throws', async () => {
        getSingleEditions.mockResolvedValueOnce({ primary: { manuscriptId: 3 } });
        getManuscriptEditions.mockResolvedValueOnce({
            editions: [[{ id: 12, name: 'sib', copyright: 'cc' }]],
        });
        getLineText.mockRejectedValueOnce(new Error('no line'));
        const w = mountLine(makeLine(), makeState());
        await w.vm.showVariants();
        expect(w.vm.variants.length).toBe(1);
        expect(w.vm.variants[0].lineName).toBe('NA');
        expect(w.vm.variants[0].editionId).toBe(12);
    });
});
