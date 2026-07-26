import { describe, it, expect, vi, beforeEach } from 'vitest';

// Unit test for the scroll-editor view (the manuscript/material scroll editor).
//
// scroll-editor.vue imports `currentState()` directly and instantiates real
// services in the class body, so we mock both. The component *does* mount (its
// template has no bare <slot>), but its mounted() hook touches many $refs +
// ResizeObserver; rather than fight that, we exercise the compiled options'
// `methods` + `computed` against a mock `this` (as the toolbar/zoomer specs do).
// This keeps every handler unit-testable without a fragile full mount.

const {
    updateArtefactDTOs,
    newArtefactGroup,
    updateArtefactGroup,
    deleteArtefactGroup,
    updateMetrics,
    showModal,
} = vi.hoisted(() => ({
    updateArtefactDTOs: vi.fn(),
    newArtefactGroup: vi.fn(),
    updateArtefactGroup: vi.fn(),
    deleteArtefactGroup: vi.fn(),
    updateMetrics: vi.fn(),
    showModal: vi.fn(),
}));

vi.mock('@/services/edition', () => ({
    default: class {
        public updateArtefactDTOs = updateArtefactDTOs;
        public newArtefactGroup = newArtefactGroup;
        public updateArtefactGroup = updateArtefactGroup;
        public deleteArtefactGroup = deleteArtefactGroup;
        public updateMetrics = updateMetrics;
    },
}));
vi.mock('@/services/artefact', () => ({ default: class {} }));
vi.mock('@/services/virtual-artefact', () => ({ VirtualArtefactEditor: class {} }));
vi.mock('@/utils/modal-bus', () => ({ showModal }));

// A controllable fake StateManager singleton.
const fakeState: any = {};
vi.mock('@/state/current', () => ({ currentState: () => fakeState }));

import ScrollEditor from '@/views/scroll-editor/scroll-editor.vue';
import {
    ArtefactPlacementOperation,
    GroupPlacementOperation,
    EditGroupOperation,
    EditionMetricOperation,
} from '@/views/scroll-editor/operations';
import { ArtefactGroup } from '@/models/edition';
import { Placement } from '@/utils/Placement';

const methods = (ScrollEditor as any).methods as Record<string, (...a: any[]) => any>;
const computed = (ScrollEditor as any).computed as Record<string, any>;
const createdHook = (ScrollEditor as any).created as (...a: any[]) => any;
const unmountedHook = (ScrollEditor as any).unmounted as (...a: any[]) => any;

function makeEdition(over: any = {}) {
    return {
        id: over.id ?? 5,
        ppm: over.ppm ?? 2,
        metrics: over.metrics ?? { width: 100, height: 200, xOrigin: 1, yOrigin: 2 },
        artefactGroups: over.artefactGroups ?? [],
        ...over,
    };
}

function makeScrollEditorState(over: any = {}) {
    const se: any = {
        selectedArtefacts: over.selectedArtefacts ?? [],
        selectedArtefact: over.selectedArtefact ?? null,
        selectedGroup: over.selectedGroup ?? null,
        params: over.params ?? { zoom: 1, mode: '' },
        mode: over.mode ?? 'material',
        viewport: over.viewport ?? { x: 0, y: 0, width: 400, height: 300 },
        pointerPosition: over.pointerPosition ?? { x: 20, y: 30 },
    };
    // Real state mutators (so multipleSelect-mode logic can read what it just wrote).
    se.selectArtefact = vi.fn((a: any) => { se.selectedArtefact = a; });
    se.selectGroup = vi.fn((g: any) => { se.selectedGroup = g ?? null; });
    return se;
}

function makeCtx(opts: {
    scrollEditor?: any;
    edition?: any;
    artefacts?: any[];
    operationsManager?: any;
} = {}) {
    const scrollEditor = opts.scrollEditor ?? makeScrollEditorState();
    const edition = opts.edition ?? makeEdition();
    const artefactItems = opts.artefacts ?? [];

    fakeState.scrollEditor = scrollEditor;
    fakeState.editions = {
        current: edition,
        find: vi.fn(() => edition),
    };
    fakeState.artefacts = {
        items: artefactItems,
        current: null,
        find: vi.fn((id: number) => artefactItems.find((a: any) => a.id === id)),
    };
    fakeState.imagedObjects = { current: null };
    fakeState.textFragmentEditor = { editedVirtualArtefact: null, textEditingMode: '' };
    fakeState.eventBus = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
    fakeState.operationsManager = null;
    fakeState.prepare = {
        edition: vi.fn().mockResolvedValue(undefined),
        editionFullText: vi.fn().mockResolvedValue(undefined),
        imagedObjects: vi.fn().mockResolvedValue(undefined),
        ensureArtefactMasks: vi.fn().mockResolvedValue(undefined),
    };

    const operationsManager = opts.operationsManager ?? {
        addOperation: vi.fn(),
        addBulkOperations: vi.fn(),
        updateStackIds: vi.fn(),
        dispose: vi.fn(),
    };

    const ctx: any = {
        $emit: vi.fn(),
        $route: { params: { editionId: '5' } },
        $router: { push: vi.fn() },
        $refs: {},
        $root: { $emit: vi.fn() },
        editionId: edition.id,
        editionService: {
            updateArtefactDTOs,
            newArtefactGroup,
            updateArtefactGroup,
            deleteArtefactGroup,
            updateMetrics,
        },
        operationsManager,
        selectedSide: 'left',
        metricsInput: 1,
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
    return { ctx, scrollEditor, edition, operationsManager };
}

beforeEach(() => {
    vi.clearAllMocks();
    updateArtefactDTOs.mockResolvedValue(undefined);
    newArtefactGroup.mockResolvedValue({ id: 42 });
    updateArtefactGroup.mockResolvedValue({ id: 7 });
    deleteArtefactGroup.mockResolvedValue(undefined);
    updateMetrics.mockResolvedValue(undefined);
});

describe('scroll-editor computed getters', () => {
    it('exposes edition-derived dimensions', () => {
        const { ctx } = makeCtx();
        expect(ctx.editionWidth).toBe(100);
        expect(ctx.editionHeight).toBe(200);
        // width * ppm * zoom
        expect(ctx.actualWidth).toBe(100 * 2 * 1);
        expect(ctx.actualHeight).toBe(200 * 2 * 1);
        expect(ctx.zoomLevel).toBe(1);
    });

    it('isTextMode reflects the scroll-editor mode', () => {
        const { ctx } = makeCtx({ scrollEditor: makeScrollEditorState({ mode: 'text' }) });
        expect(ctx.isTextMode).toBe(true);
    });

    it('viewportSize + pointerPosition getters use ppm/zoom', () => {
        const { ctx } = makeCtx();
        expect(ctx.viewportSizeWidth).toBe(Math.round(400 / 2));
        expect(ctx.viewportSizeHeight).toBe(Math.round(300 / 2));
        expect(ctx.pointerPositionX).toBe((20 / 1 / 2).toFixed(2));
        expect(ctx.pointerPositionY).toBe((30 / 1 / 2).toFixed(2));
    });

    it('placedArtefacts filters isPlaced', () => {
        const arts = [{ id: 1, isPlaced: true }, { id: 2, isPlaced: false }];
        const { ctx } = makeCtx({ artefacts: arts });
        expect(ctx.placedArtefacts.map((a: any) => a.id)).toEqual([1]);
    });
});

describe('scroll-editor event-bus wiring', () => {
    it('created wires event bus handlers and resets scroll-editor state', () => {
        const { ctx } = makeCtx();
        const OrigRO = globalThis.ResizeObserver;
        globalThis.ResizeObserver = class {
            public observe = vi.fn();
            public disconnect = vi.fn();
        } as any;
        createdHook.call(ctx);
        expect(fakeState.eventBus.on).toHaveBeenCalledWith('select-group', ctx.selectGroup);
        expect(fakeState.eventBus.on).toHaveBeenCalledWith('new-operation', ctx.onNewOperation);
        expect(ctx.observer).toBeTruthy();
        expect(fakeState.scrollEditor).toBeTruthy();
        globalThis.ResizeObserver = OrigRO;
    });

    it('unmounted unwires handlers, disconnects observer and disposes the manager', () => {
        const { ctx, operationsManager } = makeCtx();
        ctx.observer = { disconnect: vi.fn() };
        unmountedHook.call(ctx);
        expect(fakeState.eventBus.off).toHaveBeenCalledWith('select-group', ctx.selectGroup);
        expect(ctx.observer.disconnect).toHaveBeenCalled();
        expect(operationsManager.dispose).toHaveBeenCalled();
        expect(fakeState.operationsManager).toBeNull();
    });
});

describe('scroll-editor operation plumbing', () => {
    it('onNewOperation / onNewBulkOperations / newOperation forward to the manager', () => {
        const { ctx, operationsManager } = makeCtx();
        const op: any = { id: 1 };
        ctx.onNewOperation(op);
        expect(operationsManager.addOperation).toHaveBeenCalledWith(op);
        ctx.newOperation(op);
        expect(operationsManager.addOperation).toHaveBeenCalledTimes(2);
        const ops: any = [op];
        ctx.onNewBulkOperations(ops);
        expect(operationsManager.addBulkOperations).toHaveBeenCalledWith(ops);
    });

    it('updateOperationId forwards to the manager', () => {
        const { ctx, operationsManager } = makeCtx();
        ctx.updateOperationId(-3, 8);
        expect(operationsManager.updateStackIds).toHaveBeenCalledWith(-3, 8);
    });

    it('onZoomChangedGlobal sets zoom and recalculates viewport', () => {
        const { ctx, scrollEditor } = makeCtx();
        ctx.calculateViewport = vi.fn();
        ctx.onZoomChangedGlobal(0.5);
        expect(scrollEditor.params.zoom).toBe(0.5);
        expect(ctx.calculateViewport).toHaveBeenCalled();
    });

    it('openAddArtefactModal shows the add-artefact modal', () => {
        const { ctx } = makeCtx();
        ctx.openAddArtefactModal();
        expect(showModal).toHaveBeenCalledWith('addArtefactModal');
    });
});

describe('scroll-editor selectArtefact / groups', () => {
    it('selectArtefact(undefined) clears the selected group', () => {
        const { ctx, scrollEditor } = makeCtx();
        ctx.selectArtefact(undefined);
        expect(scrollEditor.selectGroup).toHaveBeenCalledWith(undefined);
    });

    it('selectArtefact selects an existing group when the artefact belongs to one', () => {
        const grp = { groupId: 3, artefactIds: [10] };
        const edition = makeEdition({ artefactGroups: [grp] });
        const { ctx, scrollEditor } = makeCtx({ edition });
        ctx.selectArtefact({ id: 10 });
        expect(scrollEditor.selectGroup).toHaveBeenCalledWith(grp);
    });

    it('selectArtefact selects a lone artefact when no group matches', () => {
        const { ctx, scrollEditor } = makeCtx();
        const art = { id: 11 };
        ctx.selectArtefact(art);
        expect(scrollEditor.selectArtefact).toHaveBeenCalledWith(art);
    });

    it('selectArtefact in multipleSelect mode builds a group and toggles ids', () => {
        const se = makeScrollEditorState({
            params: { zoom: 1, mode: 'multipleSelect' },
            selectedArtefact: { id: 1 },
        });
        const { ctx } = makeCtx({ scrollEditor: se });
        // first call: no selectedGroup -> generate a new group (seeded with the
        // current selectedArtefact id) then add artefact 20 to it.
        ctx.selectArtefact({ id: 20 });
        expect(se.selectGroup).toHaveBeenCalled();
        expect(se.selectedGroup.artefactIds).toContain(20);
        // second call with the same id toggles it back off
        ctx.selectArtefact({ id: 20 });
        expect(se.selectedGroup.artefactIds).not.toContain(20);
    });

    it('selectGroup delegates to state', () => {
        const { ctx, scrollEditor } = makeCtx();
        const grp: any = { groupId: 1 };
        ctx.selectGroup(grp);
        expect(scrollEditor.selectGroup).toHaveBeenCalledWith(grp);
    });

    it('deleteGroup empties the matching group', () => {
        const grp = { groupId: 4, artefactIds: [1, 2] };
        const edition = makeEdition({ artefactGroups: [grp] });
        const { ctx } = makeCtx({ edition });
        ctx.deleteGroup(4);
        expect(grp.artefactIds).toEqual([]);
    });

    it('cancelGroup clears selection and resets mode', () => {
        const { ctx, scrollEditor } = makeCtx();
        scrollEditor.params.mode = 'manageGroup';
        ctx.cancelGroup();
        expect(scrollEditor.selectGroup).toHaveBeenCalledWith(undefined);
        expect(scrollEditor.params.mode).toBe('');
    });
});

describe('scroll-editor saveGroupArtefacts', () => {
    it('warns and returns on a null selected group', () => {
        const { ctx, operationsManager } = makeCtx();
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        ctx.saveGroupArtefacts();
        expect(operationsManager.addOperation).not.toHaveBeenCalled();
        spy.mockRestore();
    });

    it('updates an existing group when it still has >= 2 artefacts', () => {
        const existing = { groupId: 9, artefactIds: [1, 2] };
        const edition = makeEdition({ artefactGroups: [existing] });
        const se = makeScrollEditorState({
            selectedGroup: { groupId: 9, artefactIds: [1, 2, 3] },
            params: { zoom: 1, mode: 'manageGroup' },
        });
        const { ctx, operationsManager } = makeCtx({ edition, scrollEditor: se });
        ctx.saveGroupArtefacts();
        expect(operationsManager.addOperation).toHaveBeenCalledWith(expect.any(EditGroupOperation));
        expect(existing.artefactIds).toEqual([1, 2, 3]);
        expect(se.params.mode).toBe('');
    });

    it('deletes an existing group that shrank below 2 artefacts', () => {
        const existing = { groupId: 9, artefactIds: [1, 2] };
        const edition = makeEdition({ artefactGroups: [existing] });
        const se = makeScrollEditorState({
            selectedGroup: { groupId: 9, artefactIds: [1] },
        });
        const { ctx } = makeCtx({ edition, scrollEditor: se });
        ctx.deleteGroup = vi.fn();
        ctx.cancelGroup = vi.fn();
        ctx.saveGroupArtefacts();
        expect(ctx.deleteGroup).toHaveBeenCalledWith(9);
        expect(ctx.cancelGroup).toHaveBeenCalled();
    });

    it('pushes a brand-new group when none matches and it is saveable', () => {
        const edition = makeEdition({ artefactGroups: [] });
        const clone = { groupId: -1, artefactIds: [1, 2] };
        const se = makeScrollEditorState({
            selectedGroup: { groupId: -1, artefactIds: [1, 2], notSave: false, clone: () => clone },
        });
        const { ctx } = makeCtx({ edition, scrollEditor: se });
        ctx.saveGroupArtefacts();
        expect(edition.artefactGroups).toContain(clone);
        expect(se.params.mode).toBe('');
    });

    it('does not push a group flagged notSave', () => {
        const edition = makeEdition({ artefactGroups: [] });
        const se = makeScrollEditorState({
            selectedGroup: { groupId: -1, artefactIds: [1, 2], notSave: true, clone: () => ({}) },
        });
        const { ctx } = makeCtx({ edition, scrollEditor: se });
        ctx.saveGroupArtefacts();
        expect(edition.artefactGroups).toEqual([]);
    });
});

describe('scroll-editor saveEntities pipeline', () => {
    function art(id: number) {
        return { id, prepareForBackend: vi.fn(), placement: {} };
    }

    it('saves moved artefacts in bulk', async () => {
        const a1 = art(1);
        const { ctx } = makeCtx({ artefacts: [a1] });
        const op = new ArtefactPlacementOperation(1, 'translate', Placement.empty, Placement.empty, true, true);
        // clone() is called in the ctor; give placements a clone
        const ok = await ctx.saveEntities([op]);
        expect(ok).toBe(true);
        expect(a1.prepareForBackend).toHaveBeenCalled();
        expect(updateArtefactDTOs).toHaveBeenCalledWith(5, [a1]);
    });

    it('creates a new group (id < 0, >= 2 artefacts) via newArtefactGroup', async () => {
        const grp: any = { id: -3, groupId: -3, artefactIds: [1, 2] };
        const edition = makeEdition({ artefactGroups: [grp] });
        const se = makeScrollEditorState({ selectedGroup: null });
        const { ctx } = makeCtx({ edition, scrollEditor: se, artefacts: [] });
        ctx.updateOperationId = vi.fn();
        ctx.selectGroup = vi.fn();
        const op = new EditGroupOperation(-3, [], [1, 2]);
        await ctx.saveEntities([op]);
        await Promise.resolve();
        expect(newArtefactGroup).toHaveBeenCalledWith(5, grp);
        expect(grp.groupId).toBe(42);
        expect(ctx.updateOperationId).toHaveBeenCalledWith(-3, 42);
    });

    it('updates an edited group (id > 0, >= 2 artefacts) via updateArtefactGroup', async () => {
        const grp: any = { id: 8, groupId: 8, artefactIds: [1, 2] };
        const edition = makeEdition({ artefactGroups: [grp] });
        const { ctx } = makeCtx({ edition, artefacts: [] });
        const op = new EditGroupOperation(8, [1], [1, 2]);
        await ctx.saveEntities([op]);
        await Promise.resolve();
        expect(updateArtefactGroup).toHaveBeenCalledWith(5, grp);
    });

    it('deletes an edited group (id > 0) that shrank below 2 via deleteArtefactGroup', async () => {
        const grp: any = { id: 8, groupId: 8, artefactIds: [1] };
        const edition = makeEdition({ artefactGroups: [grp] });
        const { ctx } = makeCtx({ edition, artefacts: [] });
        const op = new EditGroupOperation(8, [1, 2], [1]);
        await ctx.saveEntities([op]);
        await Promise.resolve();
        expect(deleteArtefactGroup).toHaveBeenCalledWith(5, 8);
    });

    it('logs when an edited group id cannot be found', async () => {
        const edition = makeEdition({ artefactGroups: [] });
        const { ctx } = makeCtx({ edition, artefacts: [] });
        const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const op = new EditGroupOperation(99, [], []);
        await ctx.saveEntities([op]);
        await Promise.resolve();
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('99'));
        spy.mockRestore();
    });

    it('deletes groups collected from delete GroupPlacementOperations', async () => {
        const inner = new ArtefactPlacementOperation(1, 'translate', Placement.empty, Placement.empty, true, true);
        const gop = new GroupPlacementOperation(6, [inner], 'delete');
        const a1 = art(1);
        const { ctx } = makeCtx({ artefacts: [a1] });
        await ctx.saveEntities([gop]);
        await Promise.resolve();
        expect(deleteArtefactGroup).toHaveBeenCalledWith(5, 6);
    });

    it('saves metrics when an EditionMetricOperation is present', async () => {
        const edition = makeEdition();
        const { ctx } = makeCtx({ edition, artefacts: [] });
        const op = new EditionMetricOperation(5, edition.metrics as any, edition.metrics as any);
        await ctx.saveEntities([op]);
        expect(updateMetrics).toHaveBeenCalledWith(5, edition.metrics);
    });

    it('returns false and logs on a service error', async () => {
        const a1 = art(1);
        updateArtefactDTOs.mockRejectedValueOnce(new Error('boom'));
        const { ctx } = makeCtx({ artefacts: [a1] });
        const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const op = new ArtefactPlacementOperation(1, 'translate', Placement.empty, Placement.empty, true, true);
        const ok = await ctx.saveEntities([op]);
        expect(ok).toBe(false);
        spy.mockRestore();
    });
});

describe('scroll-editor scroll / navigation / resize', () => {
    it('onScroll recalculates the viewport', () => {
        const { ctx } = makeCtx();
        ctx.calculateViewport = vi.fn();
        ctx.onScroll();
        expect(ctx.calculateViewport).toHaveBeenCalled();
    });

    it('onResize recalculates viewport + secondary toolbar height', () => {
        const { ctx } = makeCtx();
        ctx.calculateViewport = vi.fn();
        ctx.calculateSecondaryToolbarHeight = vi.fn();
        ctx.onResize([]);
        expect(ctx.calculateViewport).toHaveBeenCalled();
        expect(ctx.calculateSecondaryToolbarHeight).toHaveBeenCalled();
    });

    it('onMetricsChange recalculates the viewport', () => {
        const { ctx } = makeCtx();
        ctx.calculateViewport = vi.fn();
        ctx.onMetricsChange();
        expect(ctx.calculateViewport).toHaveBeenCalled();
    });

    it('calculateViewport writes a BoundingBox into scroll-editor state', () => {
        const { ctx, scrollEditor } = makeCtx();
        ctx.$refs.artefactContainer = {
            getBoundingClientRect: () => ({ width: 200, height: 100 }),
            scrollTop: 10,
            scrollLeft: 20,
        };
        ctx.calculateViewport();
        expect(scrollEditor.viewport).toBeTruthy();
        expect(scrollEditor.viewport.width).toBe(200);
    });

    it('calculateSecondaryToolbarHeight sets the height from the rects', () => {
        const { ctx } = makeCtx();
        ctx.$refs.artefactContainer = { getBoundingClientRect: () => ({ height: 500 }) };
        ctx.$refs.scrollMap = { getBoundingClientRect: () => ({ height: 120 }) };
        ctx.calculateSecondaryToolbarHeight();
        expect(ctx.secondaryToolbarHeight).toBe(380);
    });

    it('navigateToPoint scrolls the container, offset by origin/zoom', () => {
        const scroll = vi.fn();
        const { ctx } = makeCtx();
        fakeState.scrollEditor.viewport = { width: 400, height: 300 };
        ctx.$refs.artefactContainer = { scroll };
        ctx.navigateToPoint({ x: 100, y: 100 });
        expect(scroll).toHaveBeenCalled();
    });

    it('navigateToPoint warns and no-ops on a null viewport', () => {
        const { ctx } = makeCtx();
        fakeState.scrollEditor.viewport = null;
        const scroll = vi.fn();
        ctx.$refs.artefactContainer = { scroll };
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        ctx.navigateToPoint({ x: 1, y: 1 });
        expect(scroll).not.toHaveBeenCalled();
        spy.mockRestore();
    });

    it('resizeScroll widens the right side and enqueues a metric operation', () => {
        const { ctx, operationsManager } = makeCtx();
        ctx.selectedSide = 'right';
        ctx.metricsInput = 5;
        ctx.resizeScroll(1);
        expect(operationsManager.addOperation).toHaveBeenCalledWith(expect.any(EditionMetricOperation));
        expect(ctx.edition.metrics.width).toBe(105);
        expect(ctx.$emit).toHaveBeenCalledWith('onMetricsChange');
    });

    it('resizeScroll refuses to shrink when artefacts would be cropped', () => {
        const arts = [
            { id: 1, isPlaced: true, placement: { translate: { x: 0, y: 0 } }, boundingBox: { width: 10, height: 10 } },
        ];
        const { ctx, operationsManager } = makeCtx({ artefacts: arts });
        ctx.selectedSide = 'right';
        ctx.metricsInput = 500;
        const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        ctx.resizeScroll(-1);
        // shrinking width so the max artefact edge would fall outside -> refused
        expect(operationsManager.addOperation).not.toHaveBeenCalled();
        spy.mockRestore();
    });

    it('allowResizing left checks xOrigin against the min artefact x', () => {
        const arts = [
            { id: 1, isPlaced: true, placement: { translate: { x: 20 } }, boundingBox: { width: 5, height: 5 } },
        ];
        const { ctx } = makeCtx({ artefacts: arts });
        // minX = 20 / ppm(2) = 10
        expect(ctx.allowResizing('left', { xOrigin: 5 })).toBe(true);
        expect(ctx.allowResizing('left', { xOrigin: 50 })).toBe(false);
    });
});

describe('scroll-editor keyboard handlers', () => {
    it('onKeyDown scrolls the container when no artefacts are selected', () => {
        const { ctx } = makeCtx();
        const el = { scrollTop: 0, scrollLeft: 0, scrollTo: vi.fn(), scrollWidth: 9, scrollHeight: 9 };
        ctx.$refs.artefactContainer = el;
        ctx.onKeyDown({ key: 'ArrowDown' } as any);
        expect(el.scrollTop).toBe(30);
        ctx.onKeyDown({ key: 'ArrowRight' } as any);
        expect(el.scrollLeft).toBe(30);
        ctx.onKeyDown({ key: 'Home' } as any);
        expect(el.scrollTo).toHaveBeenCalledWith(0, 0);
        ctx.onKeyDown({ key: 'End' } as any);
        expect(el.scrollTo).toHaveBeenCalledWith(9, 9);
    });

    it('onKeyDown delegates to the top toolbar when artefacts are selected', () => {
        const se = makeScrollEditorState({ selectedArtefacts: [{ id: 1 }] });
        const { ctx } = makeCtx({ scrollEditor: se });
        const onKeyDown = vi.fn();
        ctx.$refs.topToolbar = { onKeyDown };
        ctx.onKeyDown({ key: 'ArrowDown' } as any);
        expect(onKeyDown).toHaveBeenCalled();
    });

    it('onKeyDown on Delete emits delete-key-pressed on the app event bus', () => {
        const { ctx } = makeCtx();
        ctx.$refs.artefactContainer = { scrollTop: 0, scrollLeft: 0, scrollTo: vi.fn() };
        ctx.onKeyDown({ key: 'Delete' } as any);
        // Vue-3: $root.$emit is gone; the Delete key now goes through the app event bus
        // (currentState().eventBus), which manuscript-toolbar subscribes to.
        expect(fakeState.eventBus.emit).toHaveBeenCalledWith('delete-key-pressed');
    });

    it('onKeyDown handles the remaining scroll keys', () => {
        const { ctx } = makeCtx();
        const el = { scrollTop: 100, scrollLeft: 100, scrollTo: vi.fn() };
        ctx.$refs.artefactContainer = el;
        ctx.onKeyDown({ key: 'PageDown' } as any);
        expect(el.scrollTop).toBe(190);
        ctx.onKeyDown({ key: 'ArrowUp' } as any);
        expect(el.scrollTop).toBe(160);
        ctx.onKeyDown({ key: 'PageUp' } as any);
        expect(el.scrollTop).toBe(70);
        ctx.onKeyDown({ key: 'ArrowLeft' } as any);
        expect(el.scrollLeft).toBe(70);
        // unknown key hits the default branch (no throw)
        expect(() => ctx.onKeyDown({ key: 'x' } as any)).not.toThrow();
    });

    it('onKeyPress / onKeyUp ignore non-g keys', () => {
        const { ctx, scrollEditor } = makeCtx();
        scrollEditor.params.mode = 'material';
        ctx.onKeyPress({ key: 'h' } as any);
        expect(scrollEditor.params.mode).toBe('material');
        ctx.onKeyUp({ key: 'h' } as any);
        expect(scrollEditor.params.mode).toBe('material');
    });

    it('onKeyPress g enters multipleSelect mode; onKeyUp g clears it', () => {
        const { ctx, scrollEditor } = makeCtx();
        const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
        ctx.onKeyPress({ key: 'g' } as any);
        expect(scrollEditor.params.mode).toBe('multipleSelect');
        ctx.onKeyUp({ key: 'g' } as any);
        expect(scrollEditor.params.mode).toBe('');
        spy.mockRestore();
    });
});

describe('scroll-editor createOperation / onAddArtefactModalClose / onTextChanged', () => {
    it('createOperation builds an operation and mutates the artefact', () => {
        const { ctx } = makeCtx();
        const art: any = { id: 3, placement: Placement.empty, isPlaced: false };
        const newPlacement = Placement.empty;
        const op = ctx.createOperation('add', newPlacement, art, true);
        expect(op).toBeInstanceOf(ArtefactPlacementOperation);
        expect(art.isPlaced).toBe(true);
    });

    it('onAddArtefactModalClose places artefacts and selects the first', async () => {
        const arts = [
            { id: 1, isPlaced: false, placement: { zIndex: 0 }, placeOnScroll: vi.fn() },
            { id: 2, isPlaced: false, placement: { zIndex: 0 }, placeOnScroll: vi.fn() },
        ];
        const { ctx, operationsManager, scrollEditor } = makeCtx({ artefacts: arts });
        scrollEditor.viewport = { x: 0, y: 0, width: 400, height: 300 };
        await ctx.onAddArtefactModalClose([1, 2]);
        expect(arts[0].placeOnScroll).toHaveBeenCalled();
        expect(arts[1].placeOnScroll).toHaveBeenCalled();
        expect(operationsManager.addOperation).toHaveBeenCalledTimes(2);
        expect(scrollEditor.selectArtefact).toHaveBeenCalledWith(arts[0]);
    });

    it('onTextChanged errors when no edited virtual artefact is set', async () => {
        const { ctx } = makeCtx();
        fakeState.textFragmentEditor.editedVirtualArtefact = null;
        const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        await ctx.onTextChanged({ text: 'x', editor: { updateText: vi.fn() } } as any);
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it('onTextChanged calls the editor.updateText for a virtual artefact', async () => {
        const updateText = vi.fn();
        const { ctx } = makeCtx();
        // makeCtx resets textFragmentEditor; set a virtual edited artefact after.
        fakeState.textFragmentEditor.editedVirtualArtefact = {
            isVirtual: true,
            signInterpretations: [{ sign: { line: {} } }],
        };
        await ctx.onTextChanged({ text: 'x', editor: { updateText } } as any);
        expect(updateText).toHaveBeenCalled();
    });

    it('notifyChange emits paramsChanged', () => {
        const { ctx } = makeCtx();
        ctx.notifyChange('zoom', 2);
        expect(ctx.$emit).toHaveBeenCalledWith('paramsChanged', expect.objectContaining({ property: 'zoom', value: 2 }));
    });

    it('allowResizing top/down/right branches', () => {
        const arts = [
            { id: 1, isPlaced: true, placement: { translate: { x: 10, y: 10 } }, boundingBox: { width: 4, height: 4 } },
        ];
        const { ctx } = makeCtx({ artefacts: arts });
        // top: minY = 10/2 = 5
        expect(ctx.allowResizing('top', { yOrigin: 2 })).toBe(true);
        expect(ctx.allowResizing('top', { yOrigin: 9 })).toBe(false);
        // right: maxX = (10+4)/2 = 7 ; maxX - xOrigin <= width
        expect(ctx.allowResizing('right', { xOrigin: 0, width: 100 })).toBe(true);
        // down: maxY = (10+4)/2 = 7
        expect(ctx.allowResizing('down', { yOrigin: 0, height: 100 })).toBe(true);
        // unknown side -> true
        expect(ctx.allowResizing('weird', {} as any)).toBe(true);
    });

    it('resizeScroll on the left side adjusts width and xOrigin', () => {
        const { ctx, operationsManager } = makeCtx();
        ctx.selectedSide = 'left';
        ctx.metricsInput = 3;
        ctx.resizeScroll(1);
        expect(ctx.edition.metrics.width).toBe(103);
        expect(operationsManager.addOperation).toHaveBeenCalled();
    });

    it('resizeScroll top/down adjusts height', () => {
        const { ctx } = makeCtx();
        ctx.selectedSide = 'down';
        ctx.metricsInput = 4;
        ctx.resizeScroll(1);
        expect(ctx.edition.metrics.height).toBe(204);
    });
});
