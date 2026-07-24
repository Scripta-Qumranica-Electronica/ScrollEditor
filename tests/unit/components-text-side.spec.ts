import { describe, it, expect, vi, beforeEach } from 'vitest';

const changeTextFragment = vi.fn().mockResolvedValue(undefined);
vi.mock('@/services/text', () => ({
    default: class {
        changeTextFragment = changeTextFragment;
    },
}));

import TextSide from '@/views/artefact-editor/text-side.vue';
import { mountComponent } from './helpers/mount';

// text-side.vue's template renders several child modals + $refs; a full compat
// mount is brittle, so (as with the toolbar specs) we exercise the compiled
// options' methods + computed getters against a hand-built `this`.
const methods = (TextSide as any).methods as Record<string, (...a: any[]) => any>;
const computed = (TextSide as any).computed as Record<string, any>;
const mountedHook = (TextSide as any).mounted as (...a: any[]) => any;

function tfData(over: any = {}) {
    return {
        id: over.id ?? 1,
        name: over.name ?? 'col.1',
        certain: over.certain ?? false,
        suggested: over.suggested ?? false,
    };
}

function makeCtx(opts: any = {}) {
    const state = {
        editions: {
            current: {
                permission: { readOnly: opts.readOnly ?? false },
                textFragments: opts.editionTfs ?? [],
            },
        },
        artefacts: { current: { textFragments: opts.artefactTfs ?? [] } },
        textFragments: opts.textFragments ?? new Map(),
        textFragmentEditor: {
            singleSelectedSi: opts.singleSelectedSi ?? null,
            selectedSignInterpretations: [1, 2],
        },
        artefactEditor: { selectRoi: vi.fn() },
        prepare: {
            artefact: vi.fn().mockResolvedValue(undefined),
            textFragment: vi.fn().mockResolvedValue(undefined),
        },
    };
    const ctx: any = {
        $state: state,
        $route: { params: { editionId: '5' } },
        $emit: vi.fn(),
        $root: { $emit: vi.fn() },
        editorMode: opts.editorMode ?? 'artefact',
        artefact: opts.artefact ?? { id: 3, editionId: 5 },
        textFragment: opts.textFragment,
        fontSize: 12,
        newFragmentName: '',
        prevLineMenuId: '',
        errorMessage: '',
        loading: false,
        displayedTextFragments: opts.displayedTextFragments ?? [],
        displayedTextFragmentsShow: {},
        textService: { changeTextFragment },
    };
    for (const [name, fn] of Object.entries(methods)) {
        ctx[name] = fn.bind(ctx);
    }
    for (const [name, def] of Object.entries(computed)) {
        if (typeof def === 'function') {
            Object.defineProperty(ctx, name, { get: def.bind(ctx), configurable: true });
        } else {
            Object.defineProperty(ctx, name, {
                get: def.get ? def.get.bind(ctx) : undefined,
                set: def.set ? def.set.bind(ctx) : undefined,
                configurable: true,
            });
        }
    }
    return ctx;
}

describe('text-side', () => {
    beforeEach(() => vi.clearAllMocks());

    it('editionId parses the route param', () => {
        expect(makeCtx().editionId).toBe(5);
    });

    it('readOnly reflects the edition permission', () => {
        expect(makeCtx({ readOnly: true }).readOnly).toBe(true);
    });

    it('artefactMode / textFragmentMode reflect editorMode', () => {
        expect(makeCtx({ editorMode: 'artefact' }).artefactMode).toBe(true);
        expect(makeCtx({ editorMode: 'artefact' }).textFragmentMode).toBe(false);
        expect(makeCtx({ editorMode: 'text-fragment' }).textFragmentMode).toBe(true);
    });

    it('openLineMenu prevents default, emits show, and records the id', () => {
        const ctx = makeCtx();
        const ev = { preventDefault: vi.fn() } as any;
        ctx.openLineMenu(ev, 'popover-1');
        expect(ev.preventDefault).toHaveBeenCalled();
        expect(ctx.$root.$emit).toHaveBeenCalledWith('bv::show::popover', 'popover-1');
        expect(ctx.prevLineMenuId).toBe('popover-1');
    });

    it('closeLineMenu emits hide for the previous id', () => {
        const ctx = makeCtx();
        ctx.prevLineMenuId = 'popover-9';
        ctx.closeLineMenu();
        expect(ctx.$root.$emit).toHaveBeenCalledWith('bv::hide::popover', 'popover-9');
    });

    it('renameFragment sets the name, persists it, and hides the popover', async () => {
        const ctx = makeCtx();
        ctx.prevLineMenuId = 'popover-2';
        const frag: any = { textFragmentName: 'old' };
        await ctx.renameFragment(frag, 'newName');
        expect(frag.textFragmentName).toBe('newName');
        expect(changeTextFragment).toHaveBeenCalledWith(5, frag);
        expect(ctx.$root.$emit).toHaveBeenCalledWith('bv::hide::popover', 'popover-2');
    });

    it('allTextFragmentsData merges edition + artefact suggested/certain flags', () => {
        const ctx = makeCtx({
            editionTfs: [
                { id: 10, name: 'a', suggested: false, certain: false },
            ],
            artefactTfs: [{ id: 10, suggested: true, certain: false }],
        });
        const out = ctx.allTextFragmentsData;
        expect(out[0].suggested).toBe(true);
    });

    it('allTextFragmentsData tolerates a missing artefact textFragments list', () => {
        const ctx = makeCtx({ editionTfs: [{ id: 1, name: 'a' }] });
        ctx.$state.artefacts.current.textFragments = undefined;
        expect(ctx.allTextFragmentsData.length).toBe(1);
    });

    it('dropdownTextFragmentsData excludes already-displayed and certain+suggested', () => {
        // Flags come from the artefact-match merge; edition data always starts false.
        const ctx = makeCtx({
            editionTfs: [
                { id: 1, name: 'a' },
                { id: 2, name: 'b' },
            ],
            artefactTfs: [{ id: 2, suggested: true, certain: true }],
        });
        ctx.displayedTextFragments = [{ id: 99 }];
        const out = ctx.dropdownTextFragmentsData;
        expect(out.map((t: any) => t.id)).toContain(1);
        expect(out.map((t: any) => t.id)).not.toContain(2);
    });

    it('displayedTextFragmentsData prefers certain, falls back to suggested', () => {
        const certainCtx = makeCtx({
            editionTfs: [{ id: 1, name: 'a' }],
            artefactTfs: [{ id: 1, certain: true, suggested: false }],
        });
        expect(certainCtx.displayedTextFragmentsData.map((t: any) => t.id)).toEqual([1]);

        const suggestedCtx = makeCtx({
            editionTfs: [{ id: 2, name: 'b' }],
            artefactTfs: [{ id: 2, certain: false, suggested: true }],
        });
        expect(suggestedCtx.displayedTextFragmentsData.map((t: any) => t.id)).toEqual([2]);
    });

    it('openedTextFragement returns 0 with no selected SI', () => {
        expect(makeCtx().openedTextFragement).toBe(0);
    });

    it('openedTextFragement returns the index of the selected SI text fragment', () => {
        const ctx = makeCtx({
            singleSelectedSi: {
                sign: { line: { textFragment: { textFragmentId: 7 } } },
            },
        });
        ctx.displayedTextFragments = [{ id: 3 }, { id: 7 }];
        expect(ctx.openedTextFragement).toBe(1);
    });

    it('isTfShown reads the show map', () => {
        const ctx = makeCtx();
        ctx.displayedTextFragmentsShow[4] = true;
        expect(ctx.isTfShown(4)).toBe(true);
        expect(ctx.isTfShown(5)).toBeFalsy();
    });

    it('changePosition swaps within bounds and no-ops out of bounds', () => {
        const ctx = makeCtx();
        ctx.displayedTextFragments = [{ id: 1 }, { id: 2 }, { id: 3 }];
        ctx.changePosition(0, false); // move down
        expect(ctx.displayedTextFragments.map((t: any) => t.id)).toEqual([2, 1, 3]);
        // up at index 0 -> out of bounds, unchanged
        const before = [...ctx.displayedTextFragments];
        ctx.changePosition(0, true);
        expect(ctx.displayedTextFragments.map((t: any) => t.id)).toEqual(
            before.map((t: any) => t.id)
        );
    });

    it('getFragmentText toggles loading and prepares the fragment', async () => {
        const ctx = makeCtx();
        await ctx.getFragmentText(11);
        expect(ctx.$state.prepare.textFragment).toHaveBeenCalledWith(5, 11);
        expect(ctx.loading).toBe(false);
    });

    it('emptySelectedState clears selection + roi', () => {
        const ctx = makeCtx();
        ctx.emptySelectedState();
        expect(ctx.$state.textFragmentEditor.selectedSignInterpretations).toEqual([]);
        expect(ctx.$state.artefactEditor.selectRoi).toHaveBeenCalledWith(null);
    });

    it('emptySelectedState returns early when the id matches the selected SI', () => {
        const ctx = makeCtx({
            singleSelectedSi: {
                sign: { line: { textFragment: { textFragmentId: 8 } } },
            },
        });
        ctx.emptySelectedState(8);
        expect(ctx.$state.artefactEditor.selectRoi).not.toHaveBeenCalled();
    });

    it('loadFragment sets an error for an unknown fragment name', async () => {
        const ctx = makeCtx({ editionTfs: [{ id: 1, name: 'a' }] });
        await ctx.loadFragment({ target: { value: 'nope' } } as any);
        expect(ctx.errorMessage).toBe('This fragment does not exist');
    });

    it('loadFragment is a no-op for an empty value', async () => {
        const ctx = makeCtx({ editionTfs: [{ id: 1, name: 'a' }] });
        await ctx.loadFragment({ target: { value: '' } } as any);
        expect(ctx.errorMessage).toBe('');
    });

    it('loadFragment loads a known fragment and prepends it', async () => {
        const tf = { id: 1 };
        const map = new Map([[1, tf]]);
        const ctx = makeCtx({
            editionTfs: [{ id: 1, name: 'a', certain: true }],
            textFragments: map,
        });
        await ctx.loadFragment({ target: { value: 'a' } } as any);
        expect(ctx.$state.prepare.textFragment).toHaveBeenCalledWith(5, 1);
        expect(ctx.displayedTextFragments[0]).toBe(tf);
        expect(ctx.newFragmentName).toBe('a');
    });

    it('textFragmentSelected / textFragmentsLoaded emit', () => {
        const ctx = makeCtx();
        ctx.textFragmentSelected(42);
        ctx.textFragmentsLoaded();
        expect(ctx.$emit).toHaveBeenCalledWith('textFragmentSelected', 42);
        expect(ctx.$emit).toHaveBeenCalledWith('textFragmentsLoaded');
    });

    it('mounted (text-fragment mode) displays the passed fragment', async () => {
        const ctx = makeCtx({
            editorMode: 'text-fragment',
            textFragment: { id: 99 },
        });
        await mountedHook.call(ctx);
        expect(ctx.$state.prepare.artefact).toHaveBeenCalledWith(5, 3);
        expect(ctx.displayedTextFragments).toEqual([{ id: 99 }]);
        expect(ctx.displayedTextFragmentsShow[99]).toBe(true);
    });

    it('renders the template (artefact mode) with a displayed fragment', async () => {
        const state = {
            editions: {
                current: {
                    permission: { readOnly: false },
                    textFragments: [{ id: 1, name: 'a', editorId: 1 }],
                },
            },
            artefacts: { current: { textFragments: [{ id: 1, suggested: false }] } },
            textFragments: new Map([[1, { id: 1, textFragmentId: 1, textFragmentName: 'col.1' }]]),
            textFragmentEditor: { singleSelectedSi: null, selectedSignInterpretations: [] },
            artefactEditor: { selectRoi: vi.fn() },
            prepare: {
                artefact: vi.fn().mockResolvedValue(undefined),
                textFragment: vi.fn().mockResolvedValue(undefined),
            },
        };
        const w = mountComponent(TextSide, {
            state,
            props: { artefact: { id: 3, editionId: 5 }, editorMode: 'artefact', fontSize: 12 },
            mocks: { $route: { params: { editionId: '5' } } },
            stubs: {
                'text-fragment': true,
                'edit-sign-modal': true,
                'edit-line-modal': true,
                'add-line-modal': true,
                'delete-line-modal': true,
            },
        });
        await new Promise((r) => setTimeout(r, 10));
        expect(w.exists()).toBe(true);
        expect(w.find('.text-side-container').exists()).toBe(true);
    });

    it('renders fragment card headers with rename popover + up/down controls', async () => {
        const frag: any = {
            id: 1,
            textFragmentId: 1,
            textFragmentName: 'col.1',
        };
        const state = {
            editions: {
                current: {
                    permission: { readOnly: false },
                    textFragments: [{ id: 1, name: 'a', editorId: 1 }],
                },
            },
            artefacts: { current: { textFragments: [] } },
            textFragments: new Map([[1, frag]]),
            textFragmentEditor: { singleSelectedSi: null, selectedSignInterpretations: [] },
            artefactEditor: { selectRoi: vi.fn() },
            prepare: {
                artefact: vi.fn().mockResolvedValue(undefined),
                textFragment: vi.fn().mockResolvedValue(undefined),
            },
        };
        // text-fragment mode makes mounted() synchronously seed displayedTextFragments,
        // but artefactMode=false hides the up/down block. Force artefact mode AND seed
        // the list so the full card-header (buttons + popover) branch renders.
        const w = mountComponent(TextSide, {
            state,
            props: { artefact: { id: 3, editionId: 5 }, editorMode: 'artefact', fontSize: 12, textFragment: frag },
            mocks: { $route: { params: { editionId: '5' } } },
            stubs: {
                'text-fragment': true,
                'edit-sign-modal': true,
                'edit-line-modal': true,
                'add-line-modal': true,
                'delete-line-modal': true,
            },
        });
        (w.vm as any).displayedTextFragments = [frag];
        await w.vm.$nextTick();
        expect(w.findAll('.line-name').length).toBeGreaterThan(0);
        // Exercise a rename input + button through the rendered DOM.
        expect(w.find('#newName').exists()).toBe(true);
    });

    it('mounted (artefact mode) loads the certain text fragments', async () => {
        const tf = { id: 1 };
        const ctx = makeCtx({
            editorMode: 'artefact',
            editionTfs: [{ id: 1, name: 'a' }],
            artefactTfs: [{ id: 1, certain: true, suggested: false }],
            textFragments: new Map([[1, tf]]),
        });
        await mountedHook.call(ctx);
        // getFragmentText is invoked per displayed fragment
        expect(ctx.$state.prepare.textFragment).toHaveBeenCalledWith(5, 1);
    });
});
