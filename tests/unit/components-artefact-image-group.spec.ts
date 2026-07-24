import { describe, it, expect, vi, beforeEach } from 'vitest';

// Unit test for artefact-image-group.vue — the draggable SVG group that renders one
// placed artefact in the scroll editor. Its pointer handlers rely on live SVG DOM
// (getScreenCTM / setPointerCapture) and @Emit decorators, so — like the toolbar and
// scroll-editor specs — we exercise the compiled options' `methods` + `computed`
// against a mock `this`, stubbing the SVG-coordinate helper `eventToPoint`.

import ArtefactImageGroup from '@/views/scroll-editor/artefact-image-group.vue';
import {
    ArtefactPlacementOperation,
    GroupPlacementOperation,
} from '@/views/scroll-editor/operations';
import { Placement } from '@/utils/Placement';
import { BoundingBox } from '@/utils/helpers';

const methods = (ArtefactImageGroup as any).methods as Record<string, (...a: any[]) => any>;
const computed = (ArtefactImageGroup as any).computed as Record<string, any>;
const mountedHook = (ArtefactImageGroup as any).mounted as (...a: any[]) => any;

function placement(over: any = {}) {
    return new Placement({
        scale: over.scale ?? 1,
        rotate: over.rotate ?? 0,
        translate: over.translate ?? { x: 0, y: 0 },
        zIndex: over.zIndex ?? 0,
        mirrored: over.mirrored ?? false,
    });
}

function makeArtefact(id: number, over: any = {}) {
    return {
        id,
        isPlaced: true,
        isVirtual: false,
        placement: over.placement ?? placement(),
        mask: { svg: 'M0 0' },
        rois: [],
        signInterpretations: [],
    } as any;
}

function makeCtx(opts: {
    mode?: string;
    selected?: boolean;
    selectedArtefact?: any;
    selectedGroup?: any;
    selectedArtefacts?: any[];
    artefact?: any;
} = {}) {
    const artefact = opts.artefact ?? makeArtefact(1);
    const state: any = {
        scrollEditor: {
            mode: opts.mode ?? 'material',
            selectedArtefact: opts.selectedArtefact ?? null,
            selectedGroup: opts.selectedGroup ?? null,
            selectedArtefacts: opts.selectedArtefacts ?? [],
        },
        textFragmentEditor: {
            selectSign: vi.fn(),
            selectedSignInterpretations: [],
        },
        signInterpretations: { get: vi.fn(() => null) },
        editions: { current: { script: { glyphs: {} } } },
    };
    const ctx: any = {
        $state: state,
        $emit: vi.fn(),
        artefact,
        selected: opts.selected ?? true,
        boundingBox: { x: 0, y: 0, width: 10, height: 20 },
        pointerId: -1,
        mouseOrigin: undefined,
        element: null,
        previousPlacement: [],
        // stub the SVG-coordinate transform helper (needs live DOM otherwise)
        eventToPoint: vi.fn(($e: any) => ({ x: $e.clientX, y: $e.clientY })),
    };
    for (const [name, fn] of Object.entries(methods)) {
        if (name === 'eventToPoint') { continue; }
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
    return { ctx, artefact, state };
}

beforeEach(() => vi.clearAllMocks());

describe('artefact-image-group computed', () => {
    it('materialMode reflects the scroll-editor mode', () => {
        expect(makeCtx({ mode: 'material' }).ctx.materialMode).toBe(true);
        expect(makeCtx({ mode: 'text' }).ctx.materialMode).toBe(false);
    });

    it('selectedGroup / selectedArtefact / selectedArtefacts read state', () => {
        const grp = { groupId: 2 };
        const art = { id: 9 };
        const { ctx } = makeCtx({ selectedGroup: grp, selectedArtefact: art, selectedArtefacts: [art] });
        expect(ctx.selectedGroup).toBe(grp);
        expect(ctx.selectedArtefact).toBe(art);
        expect(ctx.selectedArtefacts).toEqual([art]);
    });

    it('groupTransform composes translate/scale/rotate', () => {
        const { ctx } = makeCtx();
        expect(ctx.groupTransform).toContain('translate');
        expect(ctx.groupTransform).toContain('scale(1)');
        expect(ctx.groupTransform).toContain('rotate(0)');
    });

    it('groupTransform returns empty when there is no scale', () => {
        const art = makeArtefact(1, { placement: placement({ scale: 0 }) });
        const { ctx } = makeCtx({ artefact: art });
        expect(ctx.groupTransform).toBe('');
    });

    it('masterImage reads the imageStack master', () => {
        const { ctx } = makeCtx();
        ctx.imageStack = { master: { id: 'm' } };
        expect(ctx.masterImage).toEqual({ id: 'm' });
    });

    it('visibleRois / visibleSignInterpretations proxy the artefact', () => {
        const art = makeArtefact(1);
        art.rois = [{ id: 1 }];
        art.signInterpretations = [{ id: 2 }];
        const { ctx } = makeCtx({ artefact: art });
        expect(ctx.visibleRois).toBe(art.rois);
        expect(ctx.visibleSignInterpretations).toBe(art.signInterpretations);
    });

    it('selectedSignInterpretationId is null unless exactly one SI is selected', () => {
        const { ctx, state } = makeCtx();
        expect(ctx.selectedSignInterpretationId).toBe(null);
        state.textFragmentEditor.selectedSignInterpretations = [{ signInterpretationId: 55 }];
        expect(ctx.selectedSignInterpretationId).toBe(55);
    });

    it('displayedSigns builds a DisplayableSign per rendered sign', () => {
        const si = {
            id: 1,
            character: 'a',
            isReconstructed: false,
            rois: [{ shape: { getBoundingBox: () => new BoundingBox(0, 0, 4, 4) }, position: { x: 1, y: 2 } }],
        };
        const art = makeArtefact(1);
        art.signInterpretations = [si];
        const { ctx } = makeCtx({ artefact: art });
        (ctx as any).displayText = true;
        (ctx as any).reconstructedText = false;
        const signs = ctx.displayedSigns;
        expect(signs).toHaveLength(1);
        expect(signs[0].character).toBe('a');
        expect(signs[0].svgTransform).toContain('translate');
    });

    it('displayedSigns skips signs with no character and reconstructed-only filtering', () => {
        const noChar = { id: 1, character: '', isReconstructed: false, rois: [] };
        const original = {
            id: 2,
            character: 'b',
            isReconstructed: false,
            rois: [{ shape: { getBoundingBox: () => new BoundingBox(0, 0, 2, 2) }, position: { x: 0, y: 0 } }],
        };
        const art = makeArtefact(1);
        art.signInterpretations = [noChar, original];
        const { ctx } = makeCtx({ artefact: art });
        (ctx as any).displayText = false;
        (ctx as any).reconstructedText = true; // reconstructedOnly -> drop the non-reconstructed 'b'
        expect(ctx.displayedSigns).toHaveLength(0);
    });
});

describe('artefact-image-group mounted', () => {
    it('sets loaded to true', () => {
        const { ctx } = makeCtx();
        ctx.loaded = false;
        mountedHook.call(ctx);
        expect(ctx.loaded).toBe(true);
    });
});

describe('artefact-image-group emits', () => {
    // These methods carry the @Emit() decorator, so the compiled wrapper emits the
    // return value on $emit rather than returning it synchronously.
    it('onSelect stops propagation and emits the artefact', () => {
        const { ctx, artefact } = makeCtx();
        const stopPropagation = vi.fn();
        ctx.onSelect({ stopPropagation } as any);
        expect(stopPropagation).toHaveBeenCalled();
        expect(ctx.$emit).toHaveBeenCalledWith('onSelect', artefact);
    });

    it('onContextMenu stops propagation and emits the artefact', () => {
        const { ctx, artefact } = makeCtx();
        const stopPropagation = vi.fn();
        ctx.onContextMenu({ stopPropagation } as any);
        expect(stopPropagation).toHaveBeenCalled();
        expect(ctx.$emit).toHaveBeenCalledWith('onContextMenu', artefact);
    });

    it('newOperation emits the operation', () => {
        const { ctx } = makeCtx();
        const op: any = { id: 1 };
        ctx.newOperation(op);
        expect(ctx.$emit).toHaveBeenCalledWith('newOperation', op);
    });
});

describe('artefact-image-group pointer drag', () => {
    it('onPointerDown captures the pointer and records origin (material mode)', () => {
        const art = makeArtefact(1);
        const { ctx } = makeCtx({ selectedArtefacts: [art] });
        const setPointerCapture = vi.fn();
        const target = { setPointerCapture, closest: vi.fn(() => ({ tag: 'g' })) };
        ctx.onPointerDown({ pointerId: 7, target, clientX: 5, clientY: 6 } as any);
        expect(ctx.pointerId).toBe(7);
        expect(setPointerCapture).toHaveBeenCalledWith(7);
        expect(ctx.mouseOrigin).toEqual({ x: 5, y: 6 });
        expect(ctx.previousPlacement.length).toBe(1);
    });

    it('onPointerDown is a no-op outside material mode', () => {
        const { ctx } = makeCtx({ mode: 'text' });
        ctx.onPointerDown({ pointerId: 1, target: {} } as any);
        expect(ctx.pointerId).toBe(-1);
    });

    it('onPointerDown ignores a second active pointer', () => {
        const { ctx } = makeCtx();
        ctx.pointerId = 3;
        ctx.onPointerDown({ pointerId: 9, target: {} } as any);
        expect(ctx.pointerId).toBe(3);
    });

    it('onPointerMove translates selected artefacts by the delta', () => {
        const art = makeArtefact(1, { placement: placement({ translate: { x: 0, y: 0 } }) });
        const { ctx } = makeCtx({ selected: true, selectedArtefacts: [art] });
        ctx.pointerId = 7;
        ctx.mouseOrigin = { x: 0, y: 0 };
        ctx.onPointerMove({ pointerId: 7, clientX: 10, clientY: 20 } as any);
        expect(art.placement.translate.x).toBe(10);
        expect(art.placement.translate.y).toBe(20);
        expect(ctx.mouseOrigin).toEqual({ x: 10, y: 20 });
    });

    it('onPointerMove is a no-op when the pointer id differs', () => {
        const art = makeArtefact(1);
        const { ctx } = makeCtx({ selected: true, selectedArtefacts: [art] });
        ctx.pointerId = 7;
        ctx.mouseOrigin = { x: 0, y: 0 };
        ctx.onPointerMove({ pointerId: 99, clientX: 10, clientY: 20 } as any);
        expect(art.placement.translate.x).toBe(0);
    });

    it('onPointerUp emits a single-artefact placement operation', () => {
        const art = makeArtefact(1);
        const { ctx } = makeCtx({ selected: true, selectedArtefact: art, selectedArtefacts: [art] });
        ctx.pointerId = 7;
        ctx.previousPlacement = [{ artefactId: 1, placement: placement() }];
        const target = { releasePointerCapture: vi.fn() };
        ctx.onPointerUp({ pointerId: 7, target } as any);
        const emitted = ctx.$emit.mock.calls.find((c: any[]) => c[0] === 'newOperation');
        expect(emitted[1]).toBeInstanceOf(ArtefactPlacementOperation);
        expect(target.releasePointerCapture).toHaveBeenCalledWith(7);
        expect(ctx.pointerId).toBe(-1);
    });

    it('onPointerUp emits a GroupPlacementOperation when a group is selected', () => {
        const a1 = makeArtefact(1);
        const a2 = makeArtefact(2);
        const grp = { groupId: 5 };
        const { ctx } = makeCtx({
            selected: true,
            selectedGroup: grp,
            selectedArtefacts: [a1, a2],
        });
        ctx.pointerId = 7;
        ctx.previousPlacement = [
            { artefactId: 1, placement: placement() },
            { artefactId: 2, placement: placement() },
        ];
        const target = { releasePointerCapture: vi.fn() };
        ctx.onPointerUp({ pointerId: 7, target } as any);
        const emitted = ctx.$emit.mock.calls.find((c: any[]) => c[0] === 'newOperation');
        expect(emitted[1]).toBeInstanceOf(GroupPlacementOperation);
    });

    it('onPointerUp cancels when the pointer id does not match', () => {
        const { ctx } = makeCtx({ selected: true });
        ctx.pointerId = 7;
        const target = { releasePointerCapture: vi.fn() };
        ctx.onPointerUp({ pointerId: 99, target } as any);
        expect(target.releasePointerCapture).toHaveBeenCalled();
        expect(ctx.pointerId).toBe(-1);
    });

    it('onPointerCancel releases the element in material mode', () => {
        const { ctx } = makeCtx();
        ctx.pointerId = 7;
        ctx.element = { releasePointerCapture: vi.fn() };
        ctx.onPointerCancel();
        expect(ctx.element).toBe(null);
        expect(ctx.pointerId).toBe(-1);
    });

    it('onPointerCancel is a no-op outside material mode', () => {
        const { ctx } = makeCtx({ mode: 'text' });
        ctx.pointerId = 7;
        ctx.onPointerCancel();
        expect(ctx.pointerId).toBe(7);
    });
});

describe('artefact-image-group onClick', () => {
    it('is a no-op in material mode', () => {
        const { ctx, state } = makeCtx({ mode: 'material' });
        ctx.onClick({ target: {} } as any);
        expect(state.textFragmentEditor.selectSign).not.toHaveBeenCalled();
    });

    it('clears the sign then selects the clicked sign (text mode)', () => {
        const { ctx, state } = makeCtx({ mode: 'text' });
        const use = { getAttribute: vi.fn(() => '42') };
        const target = { closest: vi.fn(() => use) };
        state.signInterpretations.get = vi.fn(() => ({ id: 42 }));
        ctx.onClick({ target } as any);
        // called once with null (clear) and once with the resolved SI
        expect(state.textFragmentEditor.selectSign).toHaveBeenCalledWith(null);
        expect(state.textFragmentEditor.selectSign).toHaveBeenLastCalledWith({ id: 42 });
    });

    it('only clears the sign when the click is not on a <use> (text mode)', () => {
        const { ctx, state } = makeCtx({ mode: 'text' });
        const target = { closest: vi.fn(() => null) };
        ctx.onClick({ target } as any);
        expect(state.textFragmentEditor.selectSign).toHaveBeenCalledTimes(1);
        expect(state.textFragmentEditor.selectSign).toHaveBeenCalledWith(null);
    });
});
