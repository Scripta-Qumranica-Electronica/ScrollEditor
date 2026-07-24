import { describe, it, expect, vi, beforeEach } from 'vitest';
import ScrollMap from '@/views/scroll-editor/scroll-map.vue';
import { mountComponent } from './helpers/mount';

// scroll-map uses ResizeObserver + SVG $refs (createSVGPoint / getScreenCTM),
// none of which happy-dom implements, so we exercise the compiled methods +
// computed getters against a hand-built `this`.
const methods = (ScrollMap as any).methods as Record<string, (...a: any[]) => any>;
const computed = (ScrollMap as any).computed as Record<string, any>;
const createdHook = (ScrollMap as any).created as (...a: any[]) => any;
const mountedHook = (ScrollMap as any).mounted as (...a: any[]) => any;
const unmountedHook = (ScrollMap as any).unmounted as (...a: any[]) => any;

function makeEdition(over: any = {}) {
    return {
        metrics: {
            width: over.width ?? 10,
            height: over.height ?? 20,
            xOrigin: over.xOrigin ?? 1,
            yOrigin: over.yOrigin ?? 2,
        },
        ppm: over.ppm ?? 2,
    };
}

function makeCtx(opts: any = {}) {
    const state = {
        editions: { current: opts.edition ?? makeEdition() },
        scrollEditor: { viewport: opts.viewport ?? { x: 0, y: 0, width: 5, height: 5 } },
        artefacts: { items: opts.artefacts ?? [] },
    };
    const ctx: any = {
        $state: state,
        $emit: vi.fn(),
        scaleFactor: opts.scaleFactor ?? 1,
        ready: false,
        $refs: opts.refs ?? {},
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

describe('scroll-map', () => {
    beforeEach(() => vi.clearAllMocks());

    it('transform reflects the scale factor', () => {
        const ctx = makeCtx({ scaleFactor: 2 });
        expect(ctx.transform).toBe('scale(2)');
    });

    it('edition + viewport getters read state', () => {
        const ctx = makeCtx();
        expect(ctx.edition).toBe(ctx.$state.editions.current);
        expect(ctx.viewport).toBe(ctx.$state.scrollEditor.viewport);
    });

    it('actual dimensions and origins scale the metrics', () => {
        // width 10 * ppm 2 * scale 3 = 60
        const ctx = makeCtx({ scaleFactor: 3 });
        expect(ctx.actualWidth).toBe(60);
        expect(ctx.actualHeight).toBe(120);
        expect(ctx.actualXOrigin).toBe(6); // 1*2*3
        expect(ctx.actualYOrigin).toBe(12); // 2*2*3
        expect(ctx.totalWidth).toBe(20); // 10*2
        expect(ctx.totalHeight).toBe(40); // 20*2
    });

    it('placedArtefacts filters placed and sorts by zIndex', () => {
        const ctx = makeCtx({
            artefacts: [
                { id: 1, isPlaced: true, placement: { zIndex: 5 } },
                { id: 2, isPlaced: false, placement: { zIndex: 0 } },
                { id: 3, isPlaced: true, placement: { zIndex: 1 } },
            ],
        });
        expect(ctx.placedArtefacts.map((a: any) => a.id)).toEqual([3, 1]);
    });

    it('setScaleFactor derives the scale from the div width', () => {
        const ctx = makeCtx({ edition: makeEdition({ width: 10, ppm: 2 }) });
        ctx.$refs.scrollMap = { clientWidth: 100 };
        ctx.setScaleFactor();
        // 100 / (10 * 2) = 5
        expect(ctx.scaleFactor).toBe(5);
    });

    it('onResize delegates to setScaleFactor', () => {
        const ctx = makeCtx();
        ctx.$refs.scrollMap = { clientWidth: 40 };
        const spy = vi.spyOn(ctx, 'setScaleFactor');
        ctx.onResize();
        expect(spy).toHaveBeenCalled();
    });

    it('navigateToPoint emits the point', () => {
        const ctx = makeCtx();
        const pt = { x: 1, y: 2 } as any;
        ctx.navigateToPoint(pt);
        expect(ctx.$emit).toHaveBeenCalledWith('navigateToPoint', pt);
    });

    it('eventToPoint transforms client coords through the SVG CTM', () => {
        const ctx = makeCtx();
        const svgPt: any = { x: 0, y: 0 };
        svgPt.matrixTransform = vi.fn(() => ({ x: 11, y: 22 }));
        ctx.$refs.svg = { createSVGPoint: () => svgPt };
        ctx.$refs.group = { getScreenCTM: () => ({ inverse: () => ({}) }) };
        const out = ctx.eventToPoint({ clientX: 3, clientY: 4 } as any);
        expect(svgPt.x).toBe(3);
        expect(svgPt.y).toBe(4);
        expect(out).toEqual({ x: 11, y: 22 });
    });

    it('onClick converts the event and navigates', () => {
        const ctx = makeCtx();
        ctx.eventToPoint = vi.fn(() => ({ x: 9, y: 9 }));
        ctx.navigateToPoint = vi.fn();
        ctx.onClick({} as any);
        expect(ctx.navigateToPoint).toHaveBeenCalledWith({ x: 9, y: 9 });
    });

    it('created / mounted / unmounted wire and tear down the ResizeObserver', () => {
        const observe = vi.fn();
        const disconnect = vi.fn();
        let cb: any;
        class RO {
            constructor(fn: any) { cb = fn; }
            observe = observe;
            disconnect = disconnect;
        }
        (globalThis as any).ResizeObserver = RO;
        const ctx = makeCtx();
        ctx.$refs.scrollMap = { clientWidth: 20 };
        createdHook.call(ctx);
        expect(ctx.ready).toBe(false);
        // Invoke the observer callback -> onResize -> setScaleFactor.
        cb([]);
        mountedHook.call(ctx);
        expect(observe).toHaveBeenCalledWith(ctx.$refs.scrollMap);
        expect(ctx.ready).toBe(true);
        unmountedHook.call(ctx);
        expect(disconnect).toHaveBeenCalled();
    });

    it('renders the svg + viewport rect + silhouettes once ready', async () => {
        const observe = vi.fn();
        const disconnect = vi.fn();
        class RO {
            observe = observe;
            disconnect = disconnect;
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            constructor(_fn: any) {}
        }
        (globalThis as any).ResizeObserver = RO;
        const state = {
            editions: { current: makeEdition() },
            scrollEditor: { viewport: { x: 0, y: 0, width: 5, height: 5 } },
            artefacts: {
                items: [
                    { id: 1, isPlaced: true, placement: { zIndex: 0 }, side: 'recto' },
                ],
            },
        };
        // mounted() reads $refs.scrollMap.clientWidth; under VTU/compat the div ref may
        // be undefined, so stub setScaleFactor to a no-op via the compiled method map.
        const orig = methods.setScaleFactor;
        methods.setScaleFactor = function () { (this as any).scaleFactor = 1; };
        try {
            const w = mountComponent(ScrollMap, {
                state,
                stubs: { 'artefact-sillhouette': true },
            });
            (w.vm as any).ready = true;
            (w.vm as any).scaleFactor = 1;
            await w.vm.$nextTick();
            expect(w.find('svg').exists()).toBe(true);
            expect(w.find('rect').exists()).toBe(true);
            w.unmount();
            expect(disconnect).toHaveBeenCalled();
        } finally {
            methods.setScaleFactor = orig;
        }
    });
});
