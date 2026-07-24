import { describe, it, expect, vi, beforeEach } from 'vitest';

// Component-mount unit test for boundary-drawer. Drives the pointer drawing
// state machine (box + polygon internalMode), Escape cancel, and the
// repairPolygon path. UtilsService is mocked so checkPolygon's repair branch is
// inert; eventToPoint is stubbed per-instance so we don't need a real SVG CTM.

const repairPolygon = vi.fn();
vi.mock('@/services/utils', () => ({
    default: class {
        public repairPolygon = repairPolygon;
    },
}));

// Polygon: control isLegal() per test via a module-level flag; capture the svg.
let legal = true;
vi.mock('@/utils/Polygons', () => ({
    Polygon: class {
        public svg: string;
        constructor(svg = '') {
            this.svg = svg;
        }
        public isLegal() {
            return legal;
        }
    },
}));

import BoundaryDrawer from '@/components/polygons/boundary-drawer.vue';
import { mountComponent } from './helpers/mount';

// A monotonically-increasing point source so each synthetic pointer event maps
// to a distinct SVG point without needing a real getScreenCTM().
function mountDrawer(mode: 'polygon' | 'box' | 'select' = 'polygon') {
    const w = mountComponent(BoundaryDrawer, {
        props: { mode, color: 'purple', transformRootId: 'root' },
    });
    let n = 0;
    // Stub the SVG-coordinate conversion so drawing math runs without a DOM CTM.
    (w.vm as any).eventToPoint = (e: any) => ({
        x: e?.clientX ?? n++ * 10,
        y: e?.clientY ?? n++ * 10,
    });
    return w;
}

function pe(id = 1, x?: number, y?: number): any {
    return { pointerId: id, clientX: x, clientY: y };
}

describe('boundary-drawer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        legal = true;
    });

    it('mounts and created() seeds internalMode from the polygon mode', () => {
        const w = mountDrawer('polygon');
        expect(w.exists()).toBe(true);
        expect(w.vm.internalMode).toBe('before-polygon');
    });

    it('created() seeds before-corner1 for box mode', () => {
        const w = mountDrawer('box');
        expect(w.vm.internalMode).toBe('before-corner1');
    });

    it('polygonString / style getters format from points and color', () => {
        const w = mountDrawer('polygon');
        w.vm.polygonPoints = [{ x: 1, y: 2 }, { x: 3, y: 4 }] as any;
        expect(w.vm.polygonString).toBe('1, 2 3, 4');
        expect(w.vm.polygonStyle).toBe('stroke: purple;');
        expect(w.vm.polylineStyle).toBe('stroke: purple;');
    });

    it('svgClass reflects each internalMode', () => {
        const w = mountDrawer('polygon');
        w.vm.internalMode = 'before-polygon';
        expect(w.vm.svgClass).toEqual(['draw-boundary']);
        w.vm.internalMode = 'polygon';
        expect(w.vm.svgClass).toEqual(['draw-boundary']);
        w.vm.internalMode = 'before-corner1';
        expect(w.vm.svgClass).toEqual(['draw-first-corner']);
        w.vm.internalMode = 'before-corner2';
        expect(w.vm.svgClass).toEqual(['draw-second-corner']);
    });

    it('onModeChanged switches internalMode and cancels', () => {
        const w = mountDrawer('polygon');
        w.vm.onModeChanged('box');
        // mode prop is still 'polygon' so cancelOperation resets to before-polygon,
        // but the mode-branch sets before-corner1 first — cancelOperation wins last.
        expect(w.vm.internalMode).toBe('before-polygon');
    });

    it('pointerDown in polygon mode starts a polygon', () => {
        const w = mountDrawer('polygon');
        w.vm.pointerDown(pe(1, 5, 6));
        expect(w.vm.internalMode).toBe('polygon');
        expect(w.vm.polygonPoints.length).toBe(1);
        expect(w.vm.corner1).toEqual({ x: 5, y: 6 });
    });

    it('pointerDown in box mode advances to before-corner2', () => {
        const w = mountDrawer('box');
        w.vm.pointerDown(pe(1, 5, 6));
        expect(w.vm.internalMode).toBe('before-corner2');
    });

    it('a second pointer cancels the operation', () => {
        const w = mountDrawer('polygon');
        w.vm.pointerDown(pe(1, 5, 6));
        w.vm.pointerDown(pe(2, 9, 9));
        expect(w.vm.polygonPoints).toEqual([]);
        expect(w.vm.internalMode).toBe('before-polygon');
    });

    it('pointerMove in box mode builds a 4-corner closed box', () => {
        const w = mountDrawer('box');
        w.vm.pointerDown(pe(1, 0, 0));
        w.vm.pointerMove(pe(1, 10, 20));
        expect(w.vm.closedPolygon).toBe(true);
        expect(w.vm.polygonPoints.length).toBe(4);
        expect(w.vm.corner2).toEqual({ x: 10, y: 20 });
    });

    it('pointerMove in polygon mode appends points and grows the bbox', () => {
        const w = mountDrawer('polygon');
        w.vm.pointerDown(pe(1, 5, 5));
        w.vm.pointerMove(pe(1, 10, 12));
        w.vm.pointerMove(pe(1, -3, -4));
        expect(w.vm.polygonPoints.length).toBe(3);
        expect(w.vm.corner1).toEqual({ x: -3, y: -4 });
        expect(w.vm.corner2).toEqual({ x: 10, y: 12 });
        expect(w.vm.closedPolygon).toBe(false);
    });

    it('pointerMove is a no-op while waiting or multi-pointer', () => {
        const w = mountDrawer('polygon');
        w.vm.pointerDown(pe(1, 5, 5));
        w.vm.waiting = true;
        w.vm.pointerMove(pe(1, 99, 99));
        expect(w.vm.polygonPoints.length).toBe(1);
    });

    it('checkPolygonCloseness returns true when endpoints coincide', () => {
        const w = mountDrawer('polygon');
        w.vm.corner1 = { x: 0, y: 0 } as any;
        w.vm.corner2 = { x: 10, y: 10 } as any;
        w.vm.polygonPoints = [{ x: 1, y: 1 }, { x: 1, y: 1 }] as any;
        expect(w.vm.checkPolygonCloseness()).toBe(true);
    });

    it('checkPolygonCloseness returns false for far endpoints', () => {
        const w = mountDrawer('polygon');
        w.vm.corner1 = { x: 0, y: 0 } as any;
        w.vm.corner2 = { x: 10, y: 10 } as any;
        w.vm.polygonPoints = [{ x: 0, y: 0 }, { x: 10, y: 10 }] as any;
        expect(w.vm.checkPolygonCloseness()).toBe(false);
    });

    it('keyPress Escape cancels and prevents default', () => {
        const w = mountDrawer('polygon');
        w.vm.pointerDown(pe(1, 5, 5));
        const ev: any = { key: 'Escape', preventDefault: vi.fn() };
        w.vm.keyPress(ev);
        expect(ev.preventDefault).toHaveBeenCalled();
        expect(w.vm.polygonPoints).toEqual([]);
    });

    it('keyPress ignores non-Escape keys', () => {
        const w = mountDrawer('polygon');
        w.vm.pointerDown(pe(1, 5, 5));
        const ev: any = { key: 'a', preventDefault: vi.fn() };
        w.vm.keyPress(ev);
        expect(ev.preventDefault).not.toHaveBeenCalled();
        expect(w.vm.polygonPoints.length).toBe(1);
    });

    it('pointerUp calls checkPolygon then cancels (box)', () => {
        const w = mountDrawer('box');
        const spy = vi.spyOn(w.vm as any, 'checkPolygon').mockReturnValue(undefined);
        w.vm.pointerDown(pe(1, 0, 0));
        w.vm.pointerUp(pe(1, 0, 0));
        expect(spy).toHaveBeenCalled();
        expect(w.vm.polygonPoints).toEqual([]);
    });

    it('pointerCancel resets everything', () => {
        const w = mountDrawer('polygon');
        w.vm.pointerDown(pe(1, 5, 5));
        w.vm.pointerCancel();
        expect(w.vm.polygonPoints).toEqual([]);
        expect(w.vm.corner1).toBeUndefined();
        expect(w.vm.activePointers.size).toBe(0);
    });

    it('checkPolygon returns early for fewer than 3 points', async () => {
        const w = mountDrawer('polygon');
        w.vm.polygonPoints = [{ x: 0, y: 0 }, { x: 1, y: 1 }] as any;
        await w.vm.checkPolygon();
        expect(repairPolygon).not.toHaveBeenCalled();
        expect(w.emitted('newPolygon')).toBeFalsy();
    });

    it('checkPolygon emits newPolygon directly for a legal polygon', async () => {
        legal = true;
        const w = mountDrawer('polygon');
        w.vm.polygonPoints = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 8 }] as any;
        await w.vm.checkPolygon();
        expect(repairPolygon).not.toHaveBeenCalled();
        expect(w.emitted('newPolygon')).toBeTruthy();
    });

    it('checkPolygon repairs an illegal polygon and emits the fixed one', async () => {
        legal = false;
        const fixed = { fixed: true };
        repairPolygon.mockResolvedValueOnce(fixed);
        const w = mountDrawer('polygon');
        w.vm.polygonPoints = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 8 }] as any;
        await w.vm.checkPolygon();
        expect(repairPolygon).toHaveBeenCalledTimes(1);
        expect(w.vm.waiting).toBe(false);
        const emitted = w.emitted('newPolygon');
        expect(emitted).toBeTruthy();
        expect(emitted![0]).toEqual([fixed]);
    });

    it('checkPolygon swallows a repair failure and clears waiting', async () => {
        legal = false;
        repairPolygon.mockRejectedValueOnce(new Error('boom'));
        const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const w = mountDrawer('polygon');
        w.vm.polygonPoints = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 8 }] as any;
        await w.vm.checkPolygon();
        expect(repairPolygon).toHaveBeenCalledTimes(1);
        expect(w.vm.waiting).toBe(false);
        expect(w.emitted('newPolygon')).toBeFalsy();
        expect(errSpy).toHaveBeenCalled();
        errSpy.mockRestore();
    });
});
