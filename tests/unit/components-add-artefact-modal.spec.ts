import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const dispose = vi.fn();
const registerModalListener = vi.fn((_id: string, _onShow: () => void, _onHide: () => void) => dispose);
vi.mock('@/utils/modal-bus', () => ({
    registerModalListener: (...a: [string, () => void, () => void]) => registerModalListener(...a),
}));

import AddArtefactModal from '@/views/scroll-editor/add-artefact-modal.vue';
import { mountComponent } from './helpers/mount';

function makeArt(over: any = {}) {
    return {
        id: over.id ?? 1,
        name: over.name ?? 'Frag',
        side: over.side ?? 'recto',
        isPlaced: over.isPlaced ?? false,
    } as any;
}

function makeState(items: any[] = []) {
    return {
        artefacts: { items },
        editions: { current: { id: 42 } },
        prepare: { artefacts: vi.fn().mockResolvedValue(undefined) },
    };
}

function mountModal(state: any) {
    return mountComponent(AddArtefactModal, {
        state,
        stubs: {
            'b-modal': true,
            'b-form-group': true,
            'b-form-input': true,
            'b-form-checkbox-group': true,
            'b-form-checkbox': true,
            'b-button': true,
            'artefact-image': true,
        },
    });
}

describe('add-artefact-modal', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.useRealTimers());

    it('mounts and registers a modal listener', () => {
        const w = mountModal(makeState());
        expect(w.exists()).toBe(true);
        expect(registerModalListener).toHaveBeenCalledWith(
            'addArtefactModal',
            expect.any(Function),
            expect.any(Function)
        );
    });

    it('registered open/close callbacks toggle modalVisible', () => {
        const w = mountModal(makeState());
        const [, open, close] = registerModalListener.mock.calls[0];
        open();
        expect(w.vm.modalVisible).toBe(true);
        close();
        expect(w.vm.modalVisible).toBe(false);
    });

    it('show() and closeModal() drive modalVisible', () => {
        const w = mountModal(makeState([makeArt()]));
        w.vm.show();
        expect(w.vm.modalVisible).toBe(true);
        (w.vm as any).chekedArtefacts = [1, 2];
        w.vm.closeModal();
        expect(w.emitted().close?.[0]).toEqual([[1, 2]]);
        expect(w.vm.modalVisible).toBe(false);
        // closeModal calls uncheckAll -> resets
        expect(w.vm.chekedArtefacts).toEqual([]);
        expect(w.vm.searchValue).toBe('');
    });

    it('nonPlacedArtefacts filters out placed artefacts', () => {
        const w = mountModal(
            makeState([makeArt({ id: 1 }), makeArt({ id: 2, isPlaced: true })])
        );
        expect(w.vm.nonPlacedArtefacts.map((a: any) => a.id)).toEqual([1]);
    });

    it('artefacts falls back to empty when items is missing', () => {
        const state = makeState();
        state.artefacts.items = undefined as any;
        const w = mountModal(state);
        expect(w.vm.artefacts).toEqual([]);
    });

    it('filteredArtefacts honours the search value and clears selection', () => {
        const w = mountModal(
            makeState([makeArt({ id: 1, name: 'Alpha' }), makeArt({ id: 2, name: 'Beta' })])
        );
        (w.vm as any).chekedArtefacts = [9];
        (w.vm as any).searchValue = 'alph';
        expect(w.vm.filteredArtefacts.map((a: any) => a.id)).toEqual([1]);
        expect(w.vm.chekedArtefacts).toEqual([]);
    });

    it('checkedAllSide selects every non-placed artefact of a side matching the search', () => {
        const w = mountModal(
            makeState([
                makeArt({ id: 1, name: 'A', side: 'recto' }),
                makeArt({ id: 2, name: 'A', side: 'verso' }),
                makeArt({ id: 3, name: 'A', side: 'recto', isPlaced: true }),
            ])
        );
        (w.vm as any).searchValue = 'a';
        w.vm.checkedAllSide('recto' as any);
        expect(w.vm.chekedArtefacts).toEqual([1]);
    });

    it('isSelectedArtefact compares against the preview artefact', () => {
        const w = mountModal(makeState([makeArt({ id: 7 })]));
        (w.vm as any).artefact = { id: 7 };
        expect(w.vm.isSelectedArtefact(7)).toBe(true);
        expect(w.vm.isSelectedArtefact(8)).toBe(false);
    });

    it('selectArtefact loads the preview artefact after the timer', () => {
        vi.useFakeTimers();
        const art = makeArt({ id: 5 });
        const w = mountModal(makeState([art]));
        w.vm.selectArtefact(5);
        expect(w.vm.isLoaded).toBe(false);
        vi.runAllTimers();
        expect(w.vm.artefact).toStrictEqual(art);
        expect(w.vm.isLoaded).toBe(true);
    });

    it('scrollModalShown prepares the edition artefacts', async () => {
        const state = makeState([makeArt()]);
        const w = mountModal(state);
        await w.vm.scrollModalShown();
        expect(state.prepare.artefacts).toHaveBeenCalledWith(42);
        expect(w.vm.isLoaded).toBe(false);
    });

    it('uncheckAll resets search + selection', () => {
        const w = mountModal(makeState());
        (w.vm as any).searchValue = 'x';
        (w.vm as any).chekedArtefacts = [1];
        w.vm.uncheckAll();
        expect(w.vm.searchValue).toBe('');
        expect(w.vm.chekedArtefacts).toEqual([]);
    });

    it('beforeUnmount disposes the modal listener', () => {
        const w = mountModal(makeState());
        w.unmount();
        expect(dispose).toHaveBeenCalled();
    });

    it('renders the artefact list body + footer (b-modal slots passthrough)', async () => {
        const w = mountComponent(AddArtefactModal, {
            state: makeState([
                makeArt({ id: 1, name: 'Alpha', side: 'recto' }),
                makeArt({ id: 2, name: 'Beta', side: 'verso' }),
            ]),
            stubs: {
                // Render b-modal's default + footer slots so the body/footer markup is covered.
                'b-modal': {
                    template: '<div><slot /><slot name="footer" /></div>',
                },
                'b-form-group': { template: '<div><slot /></div>' },
                'b-form-input': true,
                'b-form-checkbox-group': { template: '<div><slot /></div>' },
                'b-form-checkbox': { template: '<div><slot /></div>' },
                'b-button': { template: '<button><slot /></button>' },
                'artefact-image': true,
            },
        });
        (w.vm as any).isLoaded = true;
        (w.vm as any).artefact = makeArt();
        await w.vm.$nextTick();
        // The two non-placed artefacts render their name/side spans.
        expect(w.html()).toContain('Alpha');
        expect(w.html()).toContain('Beta');
        // Click a rendered artefact row to trigger selectArtefact through the DOM.
        const rows = w.findAll('#cheked-artefact > div');
        expect(rows.length).toBe(2);
        await rows[0].trigger('click');
        // Click each footer button to cover the inline @click handlers.
        const buttons = w.findAll('button');
        for (const b of buttons) {
            await b.trigger('click');
        }
    });
});
