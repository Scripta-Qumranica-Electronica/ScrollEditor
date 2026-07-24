import { describe, it, expect, vi, beforeEach } from 'vitest';

// Unit test for the artefact-editor view's script logic.
//
// This is a large `vue-facing-decorator` @Component. As with the sibling
// artefact-editor-toolbar / zoomer tests, mounting it under this project's
// `@vue/compat` (MODE 2) + decorator setup is unreliable (bare-ish slots via
// <toolbar>, heavy `mounted`/`created` hooks that call `currentState().prepare.*`,
// $refs layout reads). So we exercise the compiled options' `methods` + `computed`
// getters/setters against a mock `this`, with `currentState()` and the operation
// classes mocked. This directly covers the handler logic (mode/roi/auto/comment
// handlers, the SavingAgent save* pipeline, nextSign, param handlers, etc.).

// ---- Mocks ---------------------------------------------------------------

// The module singleton every getter/handler reads. We hand it a mutable state.
let mockState: any;
vi.mock('@/state/current', () => ({
    currentState: () => mockState,
}));

// modal-bus.showModal — assert openReportMask triggers it.
const { showModal } = vi.hoisted(() => ({ showModal: vi.fn() }));
vi.mock('@/utils/modal-bus', () => ({
    showModal: (id: string) => showModal(id),
}));

// Inert operation classes that record their construction so we can assert which
// op the handlers emit, without pulling the real ones (which touch currentState).
// The instances array is `vi.hoisted` so it exists before the hoisted mock factory.
const { opInstances } = vi.hoisted(() => ({ opInstances: [] as any[] }));
vi.mock('@/views/artefact-editor/operations', () => {
    class FakeOp {
        public redo = vi.fn();
        public undone = false;
        constructor(public kind: string, public a?: any, public b?: any) {
            opInstances.push(this);
        }
    }
    return {
        ArtefactROIOperation: class extends FakeOp {
            public type = 'draw';
            constructor(mode: any, roi: any) {
                super('roi', mode, roi);
                this.type = mode;
            }
        },
        ArtefactRotateOperation: class extends FakeOp {
            public type = 'rotate';
            constructor(prev: any, next: any) {
                super('rotate', prev, next);
            }
        },
        // The remaining exports are only referenced as types/casts in the component,
        // but the module must still provide them as values for the import to resolve.
        ArtefactEditorOperation: class {},
        SignInterpretationEditOperation: class {},
        SignInterpretationCommentOperation: class {},
        TextFragmentAttributeOperation: class {},
        CreateSignInterpretationOperation: class {},
        DeleteSignInterpretationOperation: class {},
        UpdateSignInterperationOperation: class {},
    };
});

// InterpretationRoi.new is called by onNewPolygon; keep the rest of the module real.
const { roiNew } = vi.hoisted(() => ({
    roiNew: vi.fn((_art: any, _si: any, _shape: any, _bbox: any) => ({
        id: 'roi-new',
        signInterpretationId: 42,
    })),
}));
vi.mock('@/models/text', async (importActual) => {
    const actual = (await importActual()) as any;
    return {
        ...actual,
        InterpretationRoi: Object.assign(
            class {},
            { new: (...args: any[]) => roiNew(...args) }
        ),
    };
});

// Polygon.offset is called by onNewPolygon; keep the rest real.
vi.mock('@/utils/Polygons', async (importActual) => {
    const actual = (await importActual()) as any;
    return {
        ...actual,
        Polygon: Object.assign(actual.Polygon, {
            offset: vi.fn((p: any) => p),
        }),
    };
});

// The component instantiates these services in data(); we override them on the ctx.
vi.mock('@/services/artefact', () => ({ default: class {} }));
vi.mock('@/services/text', () => ({ default: class {} }));
vi.mock('@/services/sign-interpretation', () => ({ default: class {} }));

import AE from '@/views/artefact-editor/artefact-editor.vue';
import { i18n } from './helpers/mount';

const methods = (AE as any).methods as Record<string, (...a: any[]) => any>;
const computed = (AE as any).computed as Record<string, any>;
const createdHook = (AE as any).created as (...a: any[]) => any;
const mountedHook = (AE as any).mounted as (...a: any[]) => any;
const unmountedHook = (AE as any).unmounted as (...a: any[]) => any;

// ---- state / ctx factories ----------------------------------------------

function makeArtefact(over: any = {}): any {
    return {
        id: over.id ?? 1,
        editionId: over.editionId ?? 5,
        isVirtual: over.isVirtual ?? false,
        imagedObjectId: over.imagedObjectId ?? 'io-1',
        side: over.side ?? 'recto',
        name: over.name ?? 'Artefact A',
        rois: over.rois ?? [],
        textFragments: over.textFragments ?? [],
        placement: over.placement ?? { rotate: 0 },
        mask: over.mask ?? {
            getBoundingBox: () => ({ x: 10, y: 20, width: 100, height: 200 }),
        },
    };
}

function makeSi(over: any = {}): any {
    return {
        signInterpretationId: over.signInterpretationId ?? 42,
        character: over.character ?? 'a',
        isReconstructed: over.isReconstructed ?? false,
        commentary: over.commentary ?? '',
        rois: over.rois ?? [],
        attributes: over.attributes ?? [],
        findAttributeIndex: over.findAttributeIndex ?? (() => -1),
        sign: over.sign ?? {
            indexInLine: 0,
            line: {
                signs: [],
                textFragment: { textFragmentId: 7 },
            },
        },
    };
}

function makeState(over: any = {}): any {
    const artefact = over.artefact ?? makeArtefact();
    return {
        artefacts: {
            current: artefact,
            items: over.items ?? [artefact],
        },
        artefactEditor: {
            params: over.params ?? { rotationAngle: 0, zoom: 1, imageSettings: {} },
            selectedInterpretationRoi: over.selectedRoi ?? null,
            highlightCommentMode: false,
            selectRoi: vi.fn(),
        },
        textFragmentEditor: {
            selectedSignInterpretations: over.selectedSis ?? [],
            singleSelectedSi: over.singleSi ?? null,
            textEditingMode: 'artefact',
            selectSign: vi.fn(),
            addTextFragementToArtefact: vi.fn(),
            removeTextFragementFromArtefact: vi.fn(),
        },
        signInterpretations: {
            get: over.siGet ?? vi.fn(() => null),
        },
        interpretationRois: {
            get: vi.fn(() => null),
            put: vi.fn(),
        },
        editions: {
            current: over.edition ?? {
                id: 808,
                name: 'Test Edition',
                isPublic: over.isPublic ?? true,
                permission: { readOnly: over.readOnly ?? false },
            },
        },
        misc: {},
        eventBus: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
        operationsManager: null,
        imagedObjects: over.imagedObjects ?? {
            find: vi.fn(() => ({
                recto: { images: [{ id: 'img' }], availableImageTypes: [], master: { width: 1, height: 1 } },
                verso: undefined,
            })),
        },
        textFragments: { get: over.tfGet ?? vi.fn(() => null) },
        prepare: {
            edition: vi.fn().mockResolvedValue(undefined),
            imagedObjects: vi.fn().mockResolvedValue(undefined),
            artefact: vi.fn().mockResolvedValue(undefined),
            artefactMask: vi.fn().mockResolvedValue(undefined),
            textFragment: vi.fn().mockResolvedValue(undefined),
            imageManifest: vi.fn().mockResolvedValue(undefined),
        },
    };
}

function makeCtx(state: any = makeState()): any {
    mockState = state;
    const ctx: any = {
        // instance data the handlers touch
        actionMode: 'box',
        editorMode: 'artefact',
        autoMode: false,
        waiting: true,
        saving: false,
        showCopyToEditionModal: false,
        editionId: 5,
        artefactId: 1,
        textFragmentId: 0,
        textFragment: null,
        boundingBox: { x: 0, y: 0, width: 0, height: 0 },
        boundingBoxCenter: { x: 0, y: 0 },
        centeringReady: true,
        zoomHandledByZoomer: false,
        imageStack: undefined,
        // overridden services / manager (data() builds real ones)
        artefactService: { changeArtefact: vi.fn().mockResolvedValue(undefined) },
        textService: { updateArtefactROIs: vi.fn().mockResolvedValue(0) },
        signInterpretationService: {
            createSignInterpretation: vi.fn().mockResolvedValue(undefined),
            deleteSignInterpretation: vi.fn().mockResolvedValue(undefined),
            updateSignInterpretation: vi.fn().mockResolvedValue(undefined),
            createAttribute: vi.fn().mockResolvedValue(undefined),
            updateAttribute: vi.fn().mockResolvedValue(undefined),
            deleteAttribute: vi.fn().mockResolvedValue(undefined),
            updateCommentary: vi.fn().mockResolvedValue(undefined),
        },
        operationsManager: {
            addOperation: vi.fn(),
            addBulkOperations: vi.fn(),
        },
        // vue-facing-decorator env
        $toasted: { show: vi.fn() },
        $tc: (k: string) => i18n.global.t(k),
        $t: (k: string) => i18n.global.t(k),
        $nextTick: (fn?: () => void) => {
            if (fn) fn();
            return Promise.resolve();
        },
        $refs: {},
        $route: { params: { editionId: '5', artefactId: '1' } },
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

// ---- tests ---------------------------------------------------------------

describe('artefact-editor (script logic)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        opInstances.length = 0;
    });

    describe('computed getters', () => {
        it('mode getters follow editorMode', () => {
            const ctx = makeCtx();
            ctx.editorMode = 'artefact';
            expect(ctx.artefactMode).toBe(true);
            expect(ctx.textFragmentMode).toBe(false);
            ctx.editorMode = 'text-fragment';
            expect(ctx.artefactMode).toBe(false);
            expect(ctx.textFragmentMode).toBe(true);
        });

        it('artefact / params / visibleRois / edition / artefacts read from state', () => {
            const art = makeArtefact({ rois: [{ id: 'r1' }] });
            const state = makeState({ artefact: art });
            const ctx = makeCtx(state);
            expect(ctx.artefact).toBe(art);
            expect(ctx.params).toBe(state.artefactEditor.params);
            expect(ctx.visibleRois).toBe(art.rois);
            expect(ctx.edition).toBe(state.editions.current);
            expect(ctx.artefacts).toBe(state.artefacts.items);
        });

        it('params falls back to a fresh ArtefactEditorParams when absent', () => {
            const state = makeState();
            state.artefactEditor.params = undefined;
            const ctx = makeCtx(state);
            expect(ctx.params).toBeTruthy();
            expect(ctx.params.zoom).toBeDefined();
        });

        it('artefacts falls back to [] when items is null', () => {
            const state = makeState();
            state.artefacts.items = null;
            const ctx = makeCtx(state);
            expect(ctx.artefacts).toEqual([]);
        });

        it('selected* + editor-state getters', () => {
            const si = makeSi();
            const roi = { id: 'r' };
            const state = makeState({ selectedSis: [si], singleSi: si, selectedRoi: roi });
            const ctx = makeCtx(state);
            expect(ctx.selectedSignInterpretations).toEqual([si]);
            expect(ctx.selectedInterpretationRoi).toBe(roi);
            expect(ctx.artefactEditorState).toBe(state.artefactEditor);
            expect(ctx.textFragmentEditorState).toBe(state.textFragmentEditor);
        });

        it('readOnly reflects the edition permission', () => {
            expect(makeCtx(makeState({ readOnly: true })).readOnly).toBe(true);
            expect(makeCtx(makeState({ readOnly: false })).readOnly).toBe(false);
        });

        it('zoomLevel / rotationAngle read params', () => {
            const state = makeState({ params: { zoom: 0.5, rotationAngle: 30, imageSettings: {} } });
            const ctx = makeCtx(state);
            expect(ctx.zoomLevel).toBe(0.5);
            expect(ctx.rotationAngle).toBe(30);
        });

        it('image width/height use the master image for a real artefact', () => {
            const ctx = makeCtx();
            ctx.imageStack = { master: { width: 640, height: 480 } };
            expect(ctx.imageWidth).toBe(640);
            expect(ctx.imageHeight).toBe(480);
        });

        it('image width/height use the bounding box for a virtual artefact', () => {
            const art = makeArtefact({ isVirtual: true });
            const ctx = makeCtx(makeState({ artefact: art }));
            ctx.boundingBox = { x: 0, y: 0, width: 10, height: 20 };
            expect(ctx.imageWidth).toBe(15);
            expect(ctx.imageHeight).toBe(30);
        });

        it('actualWidth/Height/BoundingBox derive from bbox * zoom', () => {
            const state = makeState({ params: { zoom: 2, rotationAngle: 0, imageSettings: {} } });
            const ctx = makeCtx(state);
            ctx.boundingBox = { x: 1, y: 2, width: 3, height: 4 };
            expect(ctx.actualWidth).toBe(6);
            expect(ctx.actualHeight).toBe(8);
            expect(ctx.actualBoundingBox).toBe('2 4 6 8');
        });

        it('transform composes scale + rotate', () => {
            const state = makeState({ params: { zoom: 2, rotationAngle: 45, imageSettings: {} } });
            const ctx = makeCtx(state);
            ctx.boundingBoxCenter = { x: 5, y: 6 };
            expect(ctx.transform).toBe('scale(2) rotate(45  5  6)');
        });

        it('isDrawingEnabled true only for a non-reconstructed single selected si', () => {
            expect(makeCtx(makeState({ singleSi: null })).isDrawingEnabled).toBe(false);
            expect(makeCtx(makeState({ singleSi: makeSi({ isReconstructed: true }) })).isDrawingEnabled).toBe(false);
            expect(makeCtx(makeState({ singleSi: makeSi({ isReconstructed: false }) })).isDrawingEnabled).toBe(true);
        });

        it('isDeleteEnabled tracks a selected roi', () => {
            expect(makeCtx(makeState({ selectedRoi: null })).isDeleteEnabled).toBe(false);
            expect(makeCtx(makeState({ selectedRoi: { id: 'r' } })).isDeleteEnabled).toBe(true);
        });

        it('selectedLine returns null with no single si, else the si line', () => {
            expect(makeCtx(makeState({ singleSi: null })).selectedLine).toBeNull();
            const line = { signs: [] };
            const si = makeSi({ sign: { indexInLine: 0, line } });
            expect(makeCtx(makeState({ singleSi: si })).selectedLine).toBe(line);
        });
    });

    describe('mode / toggle handlers', () => {
        it('onModeClick sets the action mode', () => {
            const ctx = makeCtx();
            ctx.onModeClick('polygon');
            expect(ctx.actionMode).toBe('polygon');
        });

        it('onHighlightComment writes the highlight mode into state', () => {
            const state = makeState();
            const ctx = makeCtx(state);
            ctx.onHighlightComment(true);
            expect(state.artefactEditor.highlightCommentMode).toBe(true);
            ctx.onHighlightComment(0);
            expect(state.artefactEditor.highlightCommentMode).toBe(false);
        });

        it('onAuto toggles autoMode on when off', () => {
            const ctx = makeCtx();
            ctx.autoMode = false;
            ctx.onAuto();
            expect(ctx.autoMode).toBe(true);
        });

        it('onAuto shows a toast and turns off when >1 si selected while active', () => {
            const state = makeState({ selectedSis: [makeSi({ signInterpretationId: 1 }), makeSi({ signInterpretationId: 2 })] });
            const ctx = makeCtx(state);
            ctx.autoMode = true;
            ctx.onAuto();
            expect(ctx.$toasted.show).toHaveBeenCalled();
            expect(ctx.autoMode).toBe(false);
        });

        it('openCopyToEdtion flips the modal flag', () => {
            const ctx = makeCtx();
            ctx.openCopyToEdtion();
            expect(ctx.showCopyToEditionModal).toBe(true);
        });

        it('openReportMask seeds report data and opens the modal', () => {
            const state = makeState();
            const ctx = makeCtx(state);
            ctx.openReportMask();
            expect(state.misc.reportIssueData.title).toContain('Test Edition');
            expect(showModal).toHaveBeenCalledWith('ReportProblemModal');
        });

        it('showMessage shows a toast', () => {
            const ctx = makeCtx();
            ctx.showMessage('misc.draw', 'error');
            expect(ctx.$toasted.show).toHaveBeenCalled();
        });
    });

    describe('roi handlers', () => {
        it('onRoiClicked with no signInterpretationId clears the selection', () => {
            const state = makeState();
            const ctx = makeCtx(state);
            ctx.onRoiClicked({ signInterpretationId: null });
            expect(state.artefactEditor.selectRoi).toHaveBeenCalled();
            expect(state.textFragmentEditor.selectedSignInterpretations).toEqual([]);
            expect(state.textFragmentEditor.selectSign).not.toHaveBeenCalled();
        });

        it('onRoiClicked with a signInterpretationId selects the found si', () => {
            const si = makeSi();
            const state = makeState({ siGet: vi.fn(() => si) });
            const ctx = makeCtx(state);
            ctx.onRoiClicked({ signInterpretationId: 42 });
            expect(state.textFragmentEditor.selectSign).toHaveBeenCalledWith(si);
        });

        it('onDeleteRoi is a no-op with nothing selected', () => {
            const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
            const ctx = makeCtx(makeState({ selectedRoi: null }));
            ctx.onDeleteRoi();
            expect(err).toHaveBeenCalled();
            expect(opInstances.length).toBe(0);
            err.mockRestore();
        });

        it('onDeleteRoi builds an erase op and emits it when a roi is selected', () => {
            const roi = { id: 'r', clone: vi.fn(() => ({ id: 'r-clone' })) };
            const si = makeSi();
            const state = makeState({ selectedRoi: roi, selectedSis: [si] });
            const ctx = makeCtx(state);
            ctx.onDeleteRoi();
            expect(roi.clone).toHaveBeenCalled();
            expect(opInstances.length).toBe(1);
            expect(opInstances[0].type).toBe('erase');
            expect(opInstances[0].redo).toHaveBeenCalledWith(true);
            expect(ctx.operationsManager.addOperation).toHaveBeenCalledWith(opInstances[0]);
        });

        it('onNewPolygon warns and bails with no selected sign', () => {
            const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
            const ctx = makeCtx(makeState({ selectedSis: [] }));
            ctx.onNewPolygon({ getBoundingBox: () => ({ x: 0, y: 0, width: 1, height: 1 }) });
            expect(err).toHaveBeenCalled();
            expect(opInstances.length).toBe(0);
            err.mockRestore();
        });

        it('onNewPolygon builds a draw op, selects the roi and emits it', () => {
            const si = makeSi();
            const state = makeState({ selectedSis: [si], singleSi: si });
            const ctx = makeCtx(state);
            const poly = { getBoundingBox: () => ({ x: 3, y: 4, width: 5, height: 6 }) };
            ctx.onNewPolygon(poly);
            expect(roiNew).toHaveBeenCalled();
            expect(opInstances.length).toBe(1);
            expect(opInstances[0].type).toBe('draw');
            expect(state.artefactEditor.selectRoi).toHaveBeenCalled();
            expect(ctx.operationsManager.addOperation).toHaveBeenCalled();
        });

        it('onNewPolygon in autoMode plays a sound and schedules nextSign', () => {
            vi.useFakeTimers();
            const audioPlay = vi.fn();
            class AudioMock { public play = audioPlay; }
            vi.stubGlobal('Audio', AudioMock);
            const si = makeSi();
            const state = makeState({ selectedSis: [si], singleSi: si });
            const ctx = makeCtx(state);
            ctx.autoMode = true;
            const nextSpy = vi.spyOn(ctx, 'nextSign');
            ctx.onNewPolygon({ getBoundingBox: () => ({ x: 0, y: 0, width: 1, height: 1 }) });
            expect(audioPlay).toHaveBeenCalled();
            vi.advanceTimersByTime(1500);
            expect(nextSpy).toHaveBeenCalled();
            vi.unstubAllGlobals();
            vi.useRealTimers();
        });

        it('removeRoi resets the selection', () => {
            const roi = { id: 'r', signInterpretationId: 42 };
            const si = makeSi();
            const state = makeState({ siGet: vi.fn(() => si) });
            const ctx = makeCtx(state);
            ctx.removeRoi(roi);
            expect(state.artefactEditor.selectRoi).toHaveBeenCalledWith(null);
            expect(state.textFragmentEditor.selectedSignInterpretations).toEqual([]);
        });

        it('placeRoi stores a new roi, links it to its si and selects it', () => {
            const si = makeSi();
            const roi = { id: 'r', signInterpretationId: 42, status: '' };
            const state = makeState({ siGet: vi.fn(() => si) });
            const ctx = makeCtx(state);
            const out = ctx.placeRoi(roi);
            expect(state.interpretationRois.put).toHaveBeenCalledWith(roi);
            expect(out.status).toBe('new');
            expect(si.rois).toContain(roi);
            expect(state.artefactEditor.selectRoi).toHaveBeenCalledWith(roi);
        });

        it('placeRoi reuses an existing roi already in the state', () => {
            const existing = { id: 'r', signInterpretationId: 42, status: '' };
            const si = makeSi();
            const state = makeState({ siGet: vi.fn(() => si) });
            state.interpretationRois.get = vi.fn(() => existing);
            const ctx = makeCtx(state);
            const out = ctx.placeRoi({ id: 'r', signInterpretationId: 42 });
            expect(state.interpretationRois.put).not.toHaveBeenCalled();
            expect(out).toBe(existing);
        });
    });

    describe('zoom / rotate handlers', () => {
        it('onNewZoom flags zoomer handling and writes params.zoom', () => {
            const state = makeState();
            const ctx = makeCtx(state);
            ctx.onNewZoom({ zoom: 0.9 });
            expect(ctx.zoomHandledByZoomer).toBe(true);
            expect(state.artefactEditor.params.zoom).toBe(0.9);
        });

        it('onNewRotate writes params.rotationAngle', () => {
            const state = makeState();
            const ctx = makeCtx(state);
            ctx.onNewRotate({ rotate: 33 });
            expect(state.artefactEditor.params.rotationAngle).toBe(33);
        });

        it('recentreOnZoom short-circuits when zoomer already handled it', () => {
            const ctx = makeCtx();
            ctx.zoomHandledByZoomer = true;
            ctx.recentreOnZoom(2, 1);
            expect(ctx.zoomHandledByZoomer).toBe(false);
        });

        it('recentreOnZoom bails when not ready or no old zoom', () => {
            const ctx = makeCtx();
            ctx.centeringReady = false;
            expect(() => ctx.recentreOnZoom(2, 1)).not.toThrow();
        });

        it('recentreOnZoom re-scrolls the info box to keep the centre fixed', () => {
            const el = { scrollLeft: 100, scrollTop: 50, clientWidth: 200, clientHeight: 100 };
            const ctx = makeCtx();
            ctx.centeringReady = true;
            ctx.$refs.infoBox = el;
            ctx.recentreOnZoom(2, 1);
            // cx = 100 + 100 = 200; k = 2 -> 200*2 - 100 = 300
            expect(el.scrollLeft).toBe(300);
            expect(el.scrollTop).toBe(150);
        });

        it('recentreOnRotate bails when not ready', () => {
            const ctx = makeCtx();
            ctx.centeringReady = false;
            expect(() => ctx.recentreOnRotate(90, 0)).not.toThrow();
        });

        it('recentreOnRotate rotates the viewport centre about the pivot', () => {
            const el = { scrollLeft: 0, scrollTop: 0, clientWidth: 100, clientHeight: 100 };
            const state = makeState({ params: { zoom: 1, rotationAngle: 0, imageSettings: {} } });
            const ctx = makeCtx(state);
            ctx.centeringReady = true;
            ctx.boundingBox = { x: 0, y: 0, width: 100, height: 100 };
            ctx.boundingBoxCenter = { x: 50, y: 50 };
            ctx.$refs.infoBox = el;
            expect(() => ctx.recentreOnRotate(90, 0)).not.toThrow();
            expect(typeof el.scrollLeft).toBe('number');
        });
    });

    describe('param / sign navigation handlers', () => {
        it('onParamsChanged rotation builds a rotate op', () => {
            const art = makeArtefact({ placement: { rotate: 10 } });
            const ctx = makeCtx(makeState({ artefact: art }));
            ctx.onParamsChanged({ property: 'rotationAngle', value: 90 });
            expect(opInstances.length).toBe(1);
            expect(opInstances[0].type).toBe('rotate');
            expect(ctx.operationsManager.addOperation).toHaveBeenCalled();
        });

        it('onParamsChanged ignores non-rotation properties', () => {
            const ctx = makeCtx();
            ctx.onParamsChanged({ property: 'zoom', value: 2 });
            expect(opInstances.length).toBe(0);
        });

        it('nextSign advances to the next real character in the line', () => {
            const target = { character: 'b', isReconstructed: false };
            const line = {
                signs: [
                    { signInterpretations: [{ character: 'a' }] },
                    { signInterpretations: [target] },
                ],
            };
            const single = makeSi({ sign: { indexInLine: 0, line } });
            const state = makeState({ singleSi: single });
            const ctx = makeCtx(state);
            ctx.nextSign();
            expect(state.textFragmentEditor.selectSign).toHaveBeenCalledWith(target);
        });

        it('nextSign is a no-op without a single selected si', () => {
            const ctx = makeCtx(makeState({ singleSi: null }));
            expect(() => ctx.nextSign()).not.toThrow();
        });

        it('playSound plays audio when given a source, no-op otherwise', () => {
            const play = vi.fn();
            class AudioMock { public play = play; }
            vi.stubGlobal('Audio', AudioMock);
            const ctx = makeCtx();
            ctx.playSound('/x.mp3');
            expect(play).toHaveBeenCalled();
            play.mockClear();
            ctx.playSound('');
            expect(play).not.toHaveBeenCalled();
            vi.unstubAllGlobals();
        });

        it('onNewOperation / onNewBulkOperations delegate to the operations manager', () => {
            const ctx = makeCtx();
            const op: any = { type: 'x' };
            ctx.onNewOperation(op);
            expect(ctx.operationsManager.addOperation).toHaveBeenCalledWith(op);
            ctx.onNewBulkOperations([op]);
            expect(ctx.operationsManager.addBulkOperations).toHaveBeenCalledWith([op]);
        });

        it('onModeClick + selectArtefact delegate to prepareArtefact', async () => {
            const ctx = makeCtx();
            const spy = vi.spyOn(ctx, 'prepareArtefact').mockResolvedValue(undefined);
            await ctx.selectArtefact(99);
            expect(spy).toHaveBeenCalledWith(99);
        });
    });

    describe('statusTextFragment', () => {
        it('does nothing when the roi si is missing', () => {
            const state = makeState({ siGet: vi.fn(() => null) });
            const ctx = makeCtx(state);
            expect(() => ctx.statusTextFragment({ signInterpretationId: 1 })).not.toThrow();
        });

        it('adds a text fragment to the artefact when a roi appears for a new tf', () => {
            const si = makeSi({
                sign: { indexInLine: 0, line: { textFragment: { textFragmentId: 7 } } },
            });
            const art = makeArtefact({ textFragments: [], rois: [{ signInterpretationId: 42 }] });
            const state = makeState({ artefact: art, siGet: vi.fn(() => si) });
            const ctx = makeCtx(state);
            ctx.statusTextFragment({ signInterpretationId: 42 });
            expect(state.textFragmentEditor.addTextFragementToArtefact).toHaveBeenCalledWith(si);
        });

        it('removes the text fragment when no roi remains for it', () => {
            const si = makeSi({
                sign: { indexInLine: 0, line: { textFragment: { textFragmentId: 7 } } },
            });
            // visibleRois empty -> anyRoiOfSelectedTf false; tfToMove present -> remove
            const art = makeArtefact({ textFragments: [{ id: 7 }], rois: [] });
            const state = makeState({ artefact: art, siGet: vi.fn(() => si) });
            const ctx = makeCtx(state);
            ctx.statusTextFragment({ signInterpretationId: 42 });
            expect(state.textFragmentEditor.removeTextFragementFromArtefact).toHaveBeenCalledWith(si);
        });
    });

    describe('bounding box + image settings + zoom fit', () => {
        it('calculateBoundingBox squares the mask bbox around its centre', () => {
            const ctx = makeCtx();
            ctx.calculateBoundingBox();
            // mask bbox 100x200 -> diag sqrt(100^2+200^2) ~ 223.6, centred at (60,120)
            expect(ctx.boundingBoxCenter).toEqual({ x: 60, y: 120 });
            expect(ctx.boundingBox.width).toBeCloseTo(Math.sqrt(100 * 100 + 200 * 200));
            expect(ctx.boundingBox.width).toBe(ctx.boundingBox.height);
        });

        it('setFirstZoom fits the artefact to the info box', () => {
            const state = makeState();
            const ctx = makeCtx(state);
            ctx.boundingBox = { x: 0, y: 0, width: 100, height: 200 };
            ctx.$refs.infoBox = { clientHeight: 400, clientWidth: 300 };
            ctx.setFirstZoom();
            // min(400/200, 300/100) = min(2, 3) = 2
            expect(state.artefactEditor.params.zoom).toBe(2);
        });

        it('fillImageSettings returns early for a virtual artefact', () => {
            const art = makeArtefact({ isVirtual: true });
            const state = makeState({ artefact: art });
            const ctx = makeCtx(state);
            ctx.fillImageSettings();
            expect(state.artefactEditor.params.imageSettings).toEqual({});
        });

        it('fillImageSettings throws for a real artefact with no image stack', () => {
            const ctx = makeCtx();
            ctx.imageStack = undefined;
            expect(() => ctx.fillImageSettings()).toThrow(/No image stack/);
        });

        it('fillImageSettings populates a setting per available image type', () => {
            const master = { type: 'color' };
            const state = makeState();
            const ctx = makeCtx(state);
            ctx.imageStack = {
                master,
                availableImageTypes: ['color', 'ir'],
                getImage: (t: string) => ({ type: t }),
            };
            ctx.fillImageSettings();
            const settings = state.artefactEditor.params.imageSettings;
            expect(Object.keys(settings)).toEqual(['color', 'ir']);
            expect(settings.color.visible).toBe(true);
            expect(settings.ir.visible).toBe(false);
        });
    });

    describe('SavingAgent pipeline', () => {
        it('saveRotation is a no-op when the angle is unchanged', async () => {
            const art = makeArtefact({ placement: { rotate: 0 } });
            const state = makeState({ artefact: art, params: { rotationAngle: 0, zoom: 1, imageSettings: {} } });
            const ctx = makeCtx(state);
            const res = await ctx.saveRotation();
            expect(res).toBe(false);
            expect(ctx.artefactService.changeArtefact).not.toHaveBeenCalled();
        });

        it('saveRotation persists a changed angle', async () => {
            const art = makeArtefact({ placement: { rotate: 0 } });
            const state = makeState({ artefact: art, params: { rotationAngle: 90, zoom: 1, imageSettings: {} } });
            const ctx = makeCtx(state);
            const res = await ctx.saveRotation();
            expect(res).toBe(true);
            expect(ctx.artefactService.changeArtefact).toHaveBeenCalledWith(art.editionId, art);
        });

        it('saveROIs delegates to the text service and reports whether anything changed', async () => {
            const state = makeState({ singleSi: makeSi() });
            const ctx = makeCtx(state);
            ctx.textService.updateArtefactROIs.mockResolvedValue(3);
            const res = await ctx.saveROIs('created');
            expect(ctx.textService.updateArtefactROIs).toHaveBeenCalledWith(state.artefacts.current, 'created');
            expect(res).toBe(true);
        });

        it('saveSignInterpretations create/delete/update dispatch on op type and undone flag', async () => {
            const ctx = makeCtx();
            const si = makeSi();
            const createOp: any = { signOpType: 'create', undone: false, signInterpretation: si };
            const createUndone: any = { signOpType: 'create', undone: true, signInterpretation: si };
            const deleteOp: any = { signOpType: 'delete', undone: false, signInterpretation: si };
            const deleteUndone: any = { signOpType: 'delete', undone: true, signInterpretation: si };
            const updateOp: any = { signOpType: 'update', signInterpretation: si };
            await ctx.saveSignInterpretations([createOp, createUndone, deleteOp, deleteUndone, updateOp]);
            const svc = ctx.signInterpretationService;
            expect(svc.createSignInterpretation).toHaveBeenCalledTimes(2); // create(not undone) + delete(undone)
            expect(svc.deleteSignInterpretation).toHaveBeenCalledTimes(2); // create(undone) + delete(not undone)
            expect(svc.updateSignInterpretation).toHaveBeenCalledTimes(1);
        });

        it('saveCommentaries skips missing sis and updates present ones', async () => {
            const si = makeSi();
            const state = makeState();
            const getMock = vi.fn().mockReturnValueOnce(null).mockReturnValueOnce(si);
            state.signInterpretations.get = getMock;
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
            const ctx = makeCtx(state);
            await ctx.saveCommentaries([{ signInterpretationId: 1 }, { signInterpretationId: 2 }]);
            expect(warn).toHaveBeenCalled();
            expect(ctx.signInterpretationService.updateCommentary).toHaveBeenCalledTimes(1);
            warn.mockRestore();
        });

        it('saveAttributes create-op -> delete when the value is absent from the si', async () => {
            const si = makeSi({ findAttributeIndex: () => -1 });
            const state = makeState({ siGet: vi.fn(() => si) });
            const ctx = makeCtx(state);
            const op: any = { attributeOperationType: 'create', attributeValueId: 100, signInterpretationId: 1 };
            await ctx.saveAttributes([op]);
            expect(ctx.signInterpretationService.deleteAttribute).toHaveBeenCalled();
        });

        it('saveAttributes create-op -> create when the value is present on the si', async () => {
            const si = makeSi({ findAttributeIndex: () => 0, attributes: [{ a: 1 }] });
            const state = makeState({ siGet: vi.fn(() => si) });
            const ctx = makeCtx(state);
            const op: any = { attributeOperationType: 'create', attributeValueId: 100, signInterpretationId: 1 };
            await ctx.saveAttributes([op]);
            expect(ctx.signInterpretationService.createAttribute).toHaveBeenCalled();
        });

        it('saveAttributes update-op with the same value id updates the comment via update API', async () => {
            const si = makeSi({ findAttributeIndex: () => 0, attributes: [{ a: 1 }] });
            const state = makeState({ siGet: vi.fn(() => si) });
            const ctx = makeCtx(state);
            const op: any = {
                attributeOperationType: 'update',
                attributeValueId: 100,
                signInterpretationId: 1,
                prev: { attributeValueId: 100 },
                next: { attributeValueId: 100 },
            };
            await ctx.saveAttributes([op]);
            expect(ctx.signInterpretationService.updateAttribute).toHaveBeenCalled();
        });

        it('saveAttributes update-op with differing value ids deletes + recreates', async () => {
            const si = makeSi({
                // prev (200) present, next (300) absent
                findAttributeIndex: (id: number) => (id === 200 ? 0 : -1),
                attributes: [{ a: 1 }],
            });
            const state = makeState({ siGet: vi.fn(() => si) });
            const ctx = makeCtx(state);
            const op: any = {
                attributeOperationType: 'update',
                attributeValueId: 200,
                signInterpretationId: 1,
                prev: { attributeValueId: 200 },
                next: { attributeValueId: 300 },
            };
            await ctx.saveAttributes([op]);
            expect(ctx.signInterpretationService.deleteAttribute).toHaveBeenCalled();
            expect(ctx.signInterpretationService.createAttribute).toHaveBeenCalled();
        });

        it('saveAttributes delete-op deletes the attribute', async () => {
            const si = makeSi({ findAttributeIndex: () => -1 });
            const state = makeState({ siGet: vi.fn(() => si) });
            const ctx = makeCtx(state);
            const op: any = { attributeOperationType: 'delete', attributeValueId: 100, signInterpretationId: 1 };
            await ctx.saveAttributes([op]);
            expect(ctx.signInterpretationService.deleteAttribute).toHaveBeenCalled();
        });

        it('saveAttributes skips ops for a missing si', async () => {
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
            const state = makeState({ siGet: vi.fn(() => null) });
            const ctx = makeCtx(state);
            await ctx.saveAttributes([{ attributeOperationType: 'delete', attributeValueId: 1, signInterpretationId: 9 }]);
            expect(warn).toHaveBeenCalled();
            warn.mockRestore();
        });

        it('saveEntities runs the whole pipeline and returns true', async () => {
            const state = makeState({ params: { rotationAngle: 0, zoom: 1, imageSettings: {} } });
            const ctx = makeCtx(state);
            const rot = vi.spyOn(ctx, 'saveRotation').mockResolvedValue(false);
            const rois = vi.spyOn(ctx, 'saveROIs').mockResolvedValue(false);
            const sis = vi.spyOn(ctx, 'saveSignInterpretations').mockResolvedValue(undefined);
            const attrs = vi.spyOn(ctx, 'saveAttributes').mockResolvedValue(undefined);
            const comms = vi.spyOn(ctx, 'saveCommentaries').mockResolvedValue(undefined);
            const ops = [{ type: 'sign' }, { type: 'attr' }, { type: 'commentary' }];
            const res = await ctx.saveEntities(ops);
            expect(res).toBe(true);
            expect(rot).toHaveBeenCalled();
            expect(rois).toHaveBeenCalledTimes(2); // deleted + created
            expect(sis).toHaveBeenCalled();
            expect(attrs).toHaveBeenCalled();
            expect(comms).toHaveBeenCalled();
            expect(ctx.saving).toBe(false);
        });

        it('saveEntities returns false and logs when a step throws', async () => {
            const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
            const ctx = makeCtx();
            vi.spyOn(ctx, 'saveRotation').mockRejectedValue(new Error('boom'));
            const res = await ctx.saveEntities([]);
            expect(res).toBe(false);
            expect(err).toHaveBeenCalled();
            err.mockRestore();
        });

        it('saveAttributes throws on an update op missing prev/next', async () => {
            const si = makeSi({ findAttributeIndex: () => 0, attributes: [{ a: 1 }] });
            const state = makeState({ siGet: vi.fn(() => si) });
            const ctx = makeCtx(state);
            const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
            const op: any = { attributeOperationType: 'update', attributeValueId: 100, signInterpretationId: 1, prev: undefined, next: undefined };
            await expect(ctx.saveAttributes([op])).rejects.toThrow(/without both next and prev/);
            err.mockRestore();
        });

        it('saveAttributes throws when both prev and next are already current', async () => {
            // both prev (200) and next (300) resolve to an index -> illegal state
            const si = makeSi({ findAttributeIndex: () => 0, attributes: [{ a: 1 }] });
            const state = makeState({ siGet: vi.fn(() => si) });
            const ctx = makeCtx(state);
            const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
            const op: any = {
                attributeOperationType: 'update',
                attributeValueId: 200,
                signInterpretationId: 1,
                prev: { attributeValueId: 200 },
                next: { attributeValueId: 300 },
            };
            await expect(ctx.saveAttributes([op])).rejects.toThrow(/both prev and next/);
            err.mockRestore();
        });
    });

    describe('prepareArtefact', () => {
        it('resolves the recto image stack for a real artefact and computes the bbox', async () => {
            const art = makeArtefact({ side: 'recto', placement: { rotate: 15 } });
            const state = makeState({ artefact: art });
            const master = { type: 'color', width: 1, height: 1 };
            const stack = {
                images: [{ id: 'a' }, { id: 'b' }],
                availableImageTypes: ['color'],
                master,
                getImage: (t: string) => ({ type: t }),
            };
            state.imagedObjects.find = vi.fn(() => ({ recto: stack, verso: undefined }));
            const ctx = makeCtx(state);
            await ctx.prepareArtefact(1);
            expect(state.prepare.artefact).toHaveBeenCalledWith(ctx.editionId, 1);
            expect(state.prepare.artefactMask).toHaveBeenCalledWith(art);
            expect(ctx.imageStack).toBe(stack);
            expect(state.prepare.imageManifest).toHaveBeenCalledTimes(2);
            expect(state.artefactEditor.params.rotationAngle).toBe(15);
        });

        it('skips image handling for a virtual artefact', async () => {
            const art = makeArtefact({ isVirtual: true, placement: { rotate: 0 } });
            const state = makeState({ artefact: art });
            const ctx = makeCtx(state);
            await ctx.prepareArtefact(2);
            expect(state.imagedObjects.find).not.toHaveBeenCalled();
        });

        it('throws when the imaged object is missing', async () => {
            const art = makeArtefact();
            const state = makeState({ artefact: art });
            state.imagedObjects.find = vi.fn(() => undefined);
            const ctx = makeCtx(state);
            await expect(ctx.prepareArtefact(3)).rejects.toThrow(/Can't find imaged object/);
        });

        it('throws when the requested side is absent from the imaged object', async () => {
            const art = makeArtefact({ side: 'verso' });
            const state = makeState({ artefact: art });
            state.imagedObjects.find = vi.fn(() => ({ recto: {}, verso: undefined }));
            const ctx = makeCtx(state);
            await expect(ctx.prepareArtefact(4)).rejects.toThrow(/doesn't contain the/);
        });
    });

    describe('lifecycle hooks', () => {
        it('created prepares the edition + imaged objects and wires the event bus', async () => {
            const state = makeState();
            const ctx = makeCtx(state);
            await createdHook.call(ctx);
            expect(state.prepare.edition).toHaveBeenCalledWith(5);
            expect(state.prepare.imagedObjects).toHaveBeenCalledWith(5);
            expect(state.eventBus.on).toHaveBeenCalledWith('remove-roi', expect.any(Function));
            expect(state.eventBus.on).toHaveBeenCalledWith('new-operation', expect.any(Function));
        });

        it('mounted in artefact mode prepares the artefact + its text fragments', async () => {
            const art = makeArtefact({ textFragments: [{ id: 11 }, { id: 12 }] });
            const state = makeState({ artefact: art });
            const ctx = makeCtx(state);
            ctx.$route = { params: { editionId: '5', artefactId: '1' } };
            const prep = vi.spyOn(ctx, 'prepareArtefact').mockResolvedValue(undefined);
            vi.spyOn(ctx, 'setFirstZoom').mockImplementation(() => undefined);
            await mountedHook.call(ctx);
            expect(ctx.editorMode).toBe('artefact');
            expect(prep).toHaveBeenCalledWith(1);
            expect(state.prepare.textFragment).toHaveBeenCalledTimes(2);
            expect(ctx.waiting).toBe(false);
            expect(state.operationsManager).toBe(ctx.operationsManager);
        });

        it('mounted in text-fragment mode prepares the tf and selects the first artefact', async () => {
            const art = makeArtefact();
            const state = makeState({ artefact: art });
            state.textFragments.get = vi.fn(() => ({ id: 99 }));
            const ctx = makeCtx(state);
            ctx.$route = { params: { editionId: '5', textFragmentId: '99' } };
            const sel = vi.spyOn(ctx, 'selectArtefact').mockResolvedValue(undefined);
            vi.spyOn(ctx, 'setFirstZoom').mockImplementation(() => undefined);
            await mountedHook.call(ctx);
            expect(ctx.editorMode).toBe('text-fragment');
            expect(state.prepare.textFragment).toHaveBeenCalledWith(5, 99);
            expect(sel).toHaveBeenCalledWith(art.id);
            expect(ctx.textFragment).toEqual({ id: 99 });
        });

        it('unmounted tears down the event bus and disposes the operations manager', () => {
            const state = makeState();
            const ctx = makeCtx(state);
            ctx.operationsManager.dispose = vi.fn();
            unmountedHook.call(ctx);
            expect(state.eventBus.off).toHaveBeenCalledWith('remove-roi', expect.any(Function));
            expect(ctx.operationsManager.dispose).toHaveBeenCalled();
            expect(state.operationsManager).toBeNull();
        });
    });
});
