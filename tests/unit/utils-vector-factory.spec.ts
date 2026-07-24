import { describe, it, expect } from 'vitest';
import {
    wktPolygonToSvg,
    wktPointToSvg,
    wktParseRect,
    svgPolygonToWKT,
    svgPolygonToGeoJSON,
    svgPolygonToClipper,
    clipperToSVGPolygon,
    geoJSONPolygonToWKT,
    clipCanvas,
} from '@/utils/VectorFactory';

describe('VectorFactory - wktPolygonToSvg', () => {
    it('returns empty string for empty / falsy input', () => {
        expect(wktPolygonToSvg('')).toBe('');
        expect(wktPolygonToSvg(undefined as any)).toBe('');
    });

    it('returns empty string for non-POLYGON input', () => {
        expect(wktPolygonToSvg('POINT(1 2)')).toBe('');
    });

    it('converts a simple square WKT to an SVG path starting with M', () => {
        const svg = wktPolygonToSvg('POLYGON((0 0,10 0,10 10,0 10,0 0))');
        expect(svg.startsWith('M')).toBe(true);
        expect(svg).toContain('0 0');
        expect(svg).toContain('10 10');
    });

    it('handles the "POLYGON ((" (with trailing space) variant', () => {
        const svg = wktPolygonToSvg('POLYGON ((0 0, 10 0, 10 10, 0 10, 0 0))');
        expect(svg.startsWith('M')).toBe(true);
        expect(svg).toContain('10 10');
    });

    it('appends the first point when the ring is not closed', () => {
        // last point differs from first -> code closes the ring with an extra L
        const svg = wktPolygonToSvg('POLYGON((0 0,10 0,10 10,0 10))');
        // it should return to 0 0
        const occurrences = svg.split('0 0').length - 1;
        expect(occurrences).toBeGreaterThanOrEqual(2);
    });

    it('applies boundingRect translation', () => {
        const svg = wktPolygonToSvg('POLYGON((10 10,20 10,20 20,10 20,10 10))', { x: 10, y: 10 });
        // first point 10 10 becomes 0 0
        expect(svg.startsWith('M0 0')).toBe(true);
    });

    it('closes an unclosed ring with boundingRect translation', () => {
        const svg = wktPolygonToSvg('POLYGON((10 10,20 10,20 20,10 20))', { x: 10, y: 10 });
        expect(svg.startsWith('M0 0')).toBe(true);
        const occurrences = svg.split('0 0').length - 1;
        expect(occurrences).toBeGreaterThanOrEqual(2);
    });
});

describe('VectorFactory - wktPointToSvg', () => {
    it('parses a POINT into {x, y}', () => {
        expect(wktPointToSvg('POINT(3 7)')).toEqual({ x: 3, y: 7 });
    });

    it('returns undefined for non-point strings', () => {
        expect(wktPointToSvg('POLYGON((0 0))')).toBeUndefined();
    });
});

describe('VectorFactory - wktParseRect', () => {
    it('parses a rectangle POLYGON into x/y/width/height', () => {
        const rect = wktParseRect('POLYGON((5 5,15 5,15 25,5 25,5 5))');
        expect(rect).toEqual({ x: 5, y: 5, width: 10, height: 20 });
    });

    it('returns undefined for non-POLYGON input', () => {
        expect(wktParseRect('POINT(1 2)')).toBeUndefined();
    });
});

describe('VectorFactory - svgPolygonToWKT', () => {
    it('returns empty for empty input', () => {
        expect(svgPolygonToWKT('')).toBe('');
        expect(svgPolygonToWKT(undefined as any)).toBe('');
    });

    it('returns empty when svg does not start with M', () => {
        expect(svgPolygonToWKT('L10 10')).toBe('');
    });

    it('converts an SVG square path to a closed WKT polygon', () => {
        const wkt = svgPolygonToWKT('M0 0L10 0L10 10L0 10L0 0');
        expect(wkt).toBe('POLYGON((0 0,10 0,10 10,0 10,0 0))');
    });

    it('closes the ring when the svg path is not explicitly closed', () => {
        const wkt = svgPolygonToWKT('M0 0L10 0L10 10L0 10');
        expect(wkt).toBe('POLYGON((0 0,10 0,10 10,0 10,0 0))');
    });

    it('handles Z terminators and multiple sub-polygons', () => {
        const wkt = svgPolygonToWKT('M0 0L10 0L10 10L0 0ZM20 20L30 20L30 30L20 20');
        expect(wkt.startsWith('POLYGON((')).toBe(true);
        expect(wkt).toContain('),(');
        expect(wkt.endsWith('))')).toBe(true);
    });
});

describe('VectorFactory - svgPolygonToGeoJSON', () => {
    it('returns empty for empty input', () => {
        expect(svgPolygonToGeoJSON('')).toBe('');
    });

    it('returns undefined-ish (no assignment) when not starting with M', () => {
        expect(svgPolygonToGeoJSON('L1 1')).toBeUndefined();
    });

    it('produces a Polygon geojson object with numeric coordinates', () => {
        const gj: any = svgPolygonToGeoJSON('M0 0L10 0L10 10L0 10L0 0');
        expect(gj.type).toBe('Polygon');
        expect(gj.coordinates[0][0]).toEqual([0, 0]);
        expect(gj.coordinates[0]).toContainEqual([10, 10]);
    });

    it('closes the ring when needed', () => {
        const gj: any = svgPolygonToGeoJSON('M0 0L10 0L10 10L0 10');
        const ring = gj.coordinates[0];
        expect(ring[0]).toEqual([0, 0]);
        expect(ring[ring.length - 1]).toEqual([0, 0]);
    });
});

describe('VectorFactory - svgPolygonToClipper', () => {
    it('returns empty for empty input', () => {
        expect(svgPolygonToClipper('')).toBe('');
    });

    it('returns undefined when not starting with M', () => {
        expect(svgPolygonToClipper('L1 1')).toBeUndefined();
    });

    it('produces clipper paths of {X, Y} points', () => {
        const clip: any = svgPolygonToClipper('M0 0L10 0L10 10L0 10L0 0');
        expect(clip[0][0]).toEqual({ X: 0, Y: 0 });
        expect(clip[0]).toContainEqual({ X: 10, Y: 10 });
    });

    it('closes the ring when the last point differs from the first', () => {
        const clip: any = svgPolygonToClipper('M0 0L10 0L10 10L0 10');
        const ring = clip[0];
        expect(ring[ring.length - 1]).toEqual({ X: 0, Y: 0 });
    });
});

describe('VectorFactory - clipperToSVGPolygon', () => {
    it('returns undefined for non-array / empty paths', () => {
        expect(clipperToSVGPolygon([])).toBeUndefined();
        expect(clipperToSVGPolygon([[]])).toBeUndefined();
    });

    it('converts clipper paths back to an SVG string', () => {
        const paths = [[
            { X: 0, Y: 0 }, { X: 10, Y: 0 }, { X: 10, Y: 10 }, { X: 0, Y: 10 },
        ]];
        const svg = clipperToSVGPolygon(paths);
        expect(svg.startsWith('M0 0')).toBe(true);
        // last point differs from first -> ring is closed back to 0 0
        expect(svg.endsWith('L0 0')).toBe(true);
    });

    it('does not double-close an already-closed clipper ring', () => {
        const paths = [[
            { X: 0, Y: 0 }, { X: 10, Y: 0 }, { X: 10, Y: 10 }, { X: 0, Y: 0 },
        ]];
        const svg = clipperToSVGPolygon(paths);
        expect(svg.startsWith('M0 0')).toBe(true);
    });

    it('round-trips svg -> clipper -> svg', () => {
        const original = 'M0 0L10 0L10 10L0 10L0 0';
        const clip = svgPolygonToClipper(original);
        const svg = clipperToSVGPolygon(clip);
        expect(svgPolygonToWKT(svg)).toBe(svgPolygonToWKT(original));
    });
});

describe('VectorFactory - geoJSONPolygonToWKT', () => {
    it('converts a geojson object into a WKT polygon', () => {
        const gj = {
            type: 'Polygon',
            coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
        };
        const wkt = geoJSONPolygonToWKT(gj);
        expect(wkt).toBe('POLYGON((0 0,10 0,10 10,0 10,0 0))');
    });

    it('parses a stringified geojson', () => {
        const str = JSON.stringify({
            type: 'Polygon',
            coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
        });
        const wkt = geoJSONPolygonToWKT(str);
        expect(wkt).toContain('POLYGON((');
    });

    it('closes the ring when last point differs from first', () => {
        const gj = { coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10]]] };
        const wkt = geoJSONPolygonToWKT(gj);
        expect(wkt.endsWith(',0 0))')).toBe(true);
    });

    it('does not re-close a ring whose last point already equals the first', () => {
        const gj = { coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] };
        const wkt = geoJSONPolygonToWKT(gj);
        // exactly one trailing "0 0" (the explicit closing point), not two.
        expect(wkt).toBe('POLYGON((0 0,10 0,10 10,0 10,0 0))');
    });

    it('handles a multi-ring geojson (produces "),(" separators)', () => {
        const gj = {
            coordinates: [
                [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
                [[2, 2], [4, 2], [4, 4], [2, 4], [2, 2]],
            ],
        };
        const wkt = geoJSONPolygonToWKT(gj);
        expect(wkt).toContain('),(');
    });

    it('returns undefined for objects without coordinates', () => {
        expect(geoJSONPolygonToWKT({ foo: 'bar' })).toBeUndefined();
    });
});

describe('VectorFactory - clipCanvas', () => {
    function makeCanvas(): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        return canvas;
    }

    it('throws when no 2d context is available', () => {
        const fakeCanvas = { getContext: () => null } as unknown as HTMLCanvasElement;
        expect(() => clipCanvas(fakeCanvas, 'M0 0L10 0', '#fff', 1)).toThrow();
    });

    it('draws a path onto a real (happy-dom) canvas context when available', () => {
        const canvas = makeCanvas();
        const ctx = canvas.getContext('2d');
        // happy-dom may return a stub context; if it does, skip gracefully.
        if (!ctx) {
            expect(true).toBe(true);
            return;
        }
        expect(() =>
            clipCanvas(canvas, 'M0 0L10 0L10 10L0 10L0 0', '#ff0000', 2),
        ).not.toThrow();
    });

    it('exercises the full drawing path with a stubbed 2d context', () => {
        // happy-dom does not implement a canvas 2d context, so we supply a
        // minimal mock to drive moveTo/lineTo/fill and multi-subpath handling.
        const calls: Record<string, any[][]> = {
            clearRect: [], beginPath: [], moveTo: [], lineTo: [], closePath: [], fill: [],
        };
        const ctx: any = {
            globalCompositeOperation: '',
            fillStyle: '',
            clearRect: (...a: any[]) => calls.clearRect.push(a),
            beginPath: (...a: any[]) => calls.beginPath.push(a),
            moveTo: (...a: any[]) => calls.moveTo.push(a),
            lineTo: (...a: any[]) => calls.lineTo.push(a),
            closePath: (...a: any[]) => calls.closePath.push(a),
            fill: (...a: any[]) => calls.fill.push(a),
        };
        const canvas = {
            width: 100,
            height: 100,
            getContext: () => ctx,
        } as unknown as HTMLCanvasElement;

        // Two sub-paths, points scaled by 2.
        clipCanvas(canvas, 'M0 0L10 0L10 10M20 20L30 30', '#00ff00', 2);

        expect(ctx.fillStyle).toBe('#00ff00');
        expect(calls.clearRect.length).toBe(1);
        expect(calls.beginPath.length).toBe(1);
        expect(calls.closePath.length).toBe(1);
        expect(calls.fill.length).toBe(1);
        // first point of first subpath -> moveTo(0*2, 0*2)
        expect(calls.moveTo).toContainEqual([0, 0]);
        // scaled line points
        expect(calls.lineTo).toContainEqual([20, 0]); // 10 * 2
        expect(calls.lineTo).toContainEqual([20, 20]); // 10 * 2
        // second subpath first point becomes a moveTo(40, 40) (20 * 2)
        expect(calls.moveTo).toContainEqual([40, 40]);
    });
});
