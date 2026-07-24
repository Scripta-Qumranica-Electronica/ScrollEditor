import { describe, it, expect, vi, beforeEach } from 'vitest';

// Unit test for scroll-area.vue — the SVG canvas that hosts the placed artefacts.
// As with the other scroll-editor specs, we exercise the compiled options'
// `methods` + `computed` against a mock `this` (the template renders one child per
// placed artefact and relies on live state, so a full mount is fragile).

import ScrollArea from '@/views/scroll-editor/scroll-area.vue';

const methods = (ScrollArea as any).methods as Record<string, (...a: any[]) => any>;
const computed = (ScrollArea as any).computed as Record<string, any>;
const createdHook = (ScrollArea as any).created as (...a: any[]) => any;
const unmountedHook = (ScrollArea as any).unmounted as (...a: any[]) => any;
const mountedHook = (ScrollArea as any).mounted as (...a: any[]) => any;

function makeCtx(opts: {
    selectedArtefact?: any;
    selectedGroup?: any;
    mode?: string;
    artefacts?: any[];
    edition?: any;
} = {}) {
    const state: any = {
        scrollEditor: {
            selectedArtefact: opts.selectedArtefact ?? null,
            selectedGroup: opts.selectedGroup ?? null,
            params: { zoom: 2, mode: opts.mode ?? '' },
            displayRois: true,
            displayText: false,
            displayReconstructedText: false,
            pointerPosition: { x: 0, y: 0 },
            selectGroup: vi.fn(),
        },
        editions: {
            current: opts.edition ?? {
                metrics: { width: 10, height: 20, xOrigin: 1, yOrigin: 2 },
                ppm: 3,
                artefactGroups: [],
                script: { glyphs: { a: {} } },
            },
        },
        artefacts: { items: opts.artefacts ?? [] },
        eventBus: { on: vi.fn(), off: vi.fn() },
        prepare: {
            artefact: vi.fn().mockResolvedValue(undefined),
            textFragment: vi.fn().mockResolvedValue(undefined),
        },
    };
    const ctx: any = { $state: state, $emit: vi.fn() };
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
    return { ctx, state };
}

beforeEach(() => vi.clearAllMocks());

describe('scroll-area computed', () => {
    it('actual dimensions/origins fold in ppm and zoom', () => {
        const { ctx } = makeCtx();
        expect(ctx.actualWidth).toBe(10 * 3 * 2);
        expect(ctx.actualHeight).toBe(20 * 3 * 2);
        expect(ctx.actualXOrigin).toBe(1 * 3 * 2);
        expect(ctx.actualYOrigin).toBe(2 * 3 * 2);
        expect(ctx.zoomLevel).toBe(2);
        expect(ctx.transform).toBe('scale(2)');
    });

    it('positionX/positionY are half the actual size; imgWidth is fixed', () => {
        const { ctx } = makeCtx();
        expect(ctx.positionX).toBe(ctx.actualWidth / 2);
        expect(ctx.positionY).toBe(ctx.actualHeight / 2);
        expect(ctx.imgWidth).toBe(200);
    });

    it('display flags + script getters read state', () => {
        const { ctx } = makeCtx();
        expect(ctx.displayRois).toBe(true);
        expect(ctx.displayText).toBe(false);
        expect(ctx.displayReconstructedText).toBe(false);
        expect(ctx.currentScript).toBeTruthy();
        expect(ctx.scriptGlyphs).toEqual({ a: {} });
    });

    it('placedArtefacts filters isPlaced+inViewport and sorts by zIndex', () => {
        const arts = [
            { id: 1, isPlaced: true, inViewport: true, placement: { zIndex: 2 } },
            { id: 2, isPlaced: true, inViewport: true, placement: { zIndex: 1 } },
            { id: 3, isPlaced: false, inViewport: true, placement: { zIndex: 0 } },
            { id: 4, isPlaced: true, inViewport: false, placement: { zIndex: 0 } },
        ];
        const { ctx } = makeCtx({ artefacts: arts });
        expect(ctx.placedArtefacts.map((a: any) => a.id)).toEqual([2, 1]);
    });
});

describe('scroll-area selection helpers', () => {
    it('isArtefactSelected matches the single selected artefact', () => {
        const art = { id: 1 };
        const { ctx } = makeCtx({ selectedArtefact: art });
        expect(ctx.isArtefactSelected(art)).toBe(true);
        expect(ctx.isArtefactSelected({ id: 2 })).toBe(false);
    });

    it('isArtefactSelected matches group membership', () => {
        const { ctx } = makeCtx({ selectedGroup: { groupId: 1, artefactIds: [7] } });
        expect(ctx.isArtefactSelected({ id: 7 })).toBe(true);
        expect(ctx.isArtefactSelected({ id: 8 })).toBe(false);
    });

    it('isArtefactSelected is false with no selection', () => {
        const { ctx } = makeCtx();
        expect(ctx.isArtefactSelected({ id: 1 })).toBe(false);
    });

    it('isArtefactDisabled greys out artefacts of other groups in manageGroup mode', () => {
        const other = { groupId: 2, artefactIds: [1, 2] };
        const edition = { metrics: { width: 1, height: 1, xOrigin: 0, yOrigin: 0 }, ppm: 1, artefactGroups: [other], script: null };
        const { ctx } = makeCtx({
            edition,
            selectedGroup: { groupId: 9, artefactIds: [3] },
            mode: 'manageGroup',
        });
        expect(ctx.isArtefactDisabled({ id: 1 })).toBe(true);
        expect(ctx.isArtefactDisabled({ id: 99 })).toBe(false);
    });

    it('isArtefactDisabled is false when nothing is selected', () => {
        const { ctx } = makeCtx();
        expect(ctx.isArtefactDisabled({ id: 1 })).toBe(false);
    });

    it('getArtefactGroup finds a multi-artefact group containing the artefact', () => {
        const grp = { groupId: 1, artefactIds: [1, 2] };
        const edition = { metrics: { width: 1, height: 1, xOrigin: 0, yOrigin: 0 }, ppm: 1, artefactGroups: [grp], script: null };
        const { ctx } = makeCtx({ edition });
        expect(ctx.getArtefactGroup({ id: 1 })).toBe(grp);
    });
});

describe('scroll-area event handlers', () => {
    it('onScrollClick clears the selected group', () => {
        const { ctx, state } = makeCtx();
        ctx.onScrollClick({} as any);
        expect(state.scrollEditor.selectGroup).toHaveBeenCalledWith(undefined);
    });

    it('onMouseMove records the pointer position', () => {
        const { ctx, state } = makeCtx();
        ctx.onMouseMove({ offsetX: 12, offsetY: 34 } as any);
        expect(state.scrollEditor.pointerPosition).toEqual({ x: 12, y: 34 });
    });

    it('onNewZoom parses the zoom into params', () => {
        const { ctx, state } = makeCtx();
        ctx.onNewZoom({ zoom: '0.75' } as any);
        expect(state.scrollEditor.params.zoom).toBe(0.75);
    });

    it('selectArtefact emits onSelectArtefact', () => {
        const { ctx } = makeCtx();
        const art = { id: 1 } as any;
        ctx.selectArtefact(art);
        expect(ctx.$emit).toHaveBeenCalledWith('onSelectArtefact', art);
    });

    it('onNewOperation / newOperation emit newOperation', () => {
        const { ctx } = makeCtx();
        const op = { id: 1 } as any;
        ctx.onNewOperation(op);
        expect(ctx.$emit).toHaveBeenCalledWith('newOperation', op);
    });

    it('onSaveGroup / cancelGroup / manageGroup emit their events', () => {
        const { ctx } = makeCtx();
        ctx.onSaveGroup();
        ctx.cancelGroup();
        ctx.manageGroup();
        expect(ctx.$emit).toHaveBeenCalledWith('onSaveGroupArtefacts');
        expect(ctx.$emit).toHaveBeenCalledWith('onCancelGroup');
        expect(ctx.$emit).toHaveBeenCalledWith('onManageGroup');
    });
});

describe('scroll-area lifecycle', () => {
    it('created subscribes to select-artefact and re-emits via selectArtefact', () => {
        const { ctx, state } = makeCtx();
        createdHook.call(ctx);
        expect(state.eventBus.on).toHaveBeenCalledWith('select-artefact', expect.any(Function));
        // invoke the registered handler -> it should emit onSelectArtefact
        const handler = state.eventBus.on.mock.calls[0][1];
        handler({ id: 1 });
        expect(ctx.$emit).toHaveBeenCalledWith('onSelectArtefact', { id: 1 });
    });

    it('unmounted unsubscribes from select-artefact', () => {
        const { ctx, state } = makeCtx();
        unmountedHook.call(ctx);
        expect(state.eventBus.off).toHaveBeenCalledWith('select-artefact');
    });

    it('mounted prepares each placed artefact and its text fragments', async () => {
        const arts = [
            { id: 1, editionId: 5, isPlaced: true, inViewport: true, placement: { zIndex: 0 }, textFragments: [{ id: 9 }] },
        ];
        const { ctx, state } = makeCtx({ artefacts: arts });
        await mountedHook.call(ctx);
        // forEach's async callbacks are fire-and-forget; flush microtasks
        await Promise.resolve();
        await Promise.resolve();
        expect(state.prepare.artefact).toHaveBeenCalledWith(5, 1);
        expect(state.prepare.textFragment).toHaveBeenCalledWith(5, 9);
    });
});
