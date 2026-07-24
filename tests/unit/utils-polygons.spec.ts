import { describe, it, expect } from 'vitest';
import { Polygon } from '@/utils/Polygons';
import { BoundingBox } from '@/utils/helpers';

const SQUARE_WKT = 'POLYGON((0 0,10 0,10 10,0 10,0 0))';

function makeSquare(): Polygon {
    return Polygon.fromWkt(SQUARE_WKT);
}

describe('Polygon - construction & basic getters', () => {
    it('an empty polygon reports empty and blank derived values', () => {
        const p = new Polygon();
        expect(p.empty).toBe(true);
        expect(p.svg).toBe('');
        expect(p.wkt).toBe('');
        expect(p.geoJSON).toBeNull();
        expect(p.clipper).toBeNull();
    });

    it('normalizes " L " spacing in the svg', () => {
        const p = new Polygon('M0 0 L 10 0 L 10 10 L 0 10 L 0 0');
        expect(p.svg).not.toContain(' L ');
        expect(p.empty).toBe(false);
    });

    it('builds from WKT and exposes non-empty svg/wkt', () => {
        const p = makeSquare();
        expect(p.empty).toBe(false);
        expect(p.svg.startsWith('M')).toBe(true);
        expect(p.wkt).toBe(SQUARE_WKT);
    });

    it('fromSvg wraps an svg string', () => {
        const p = Polygon.fromSvg('M0 0L10 0L10 10L0 10L0 0');
        expect(p.wkt).toBe(SQUARE_WKT);
    });

    it('geoJSON round-trips through fromGeoJSON', () => {
        const p = makeSquare();
        const gj = p.geoJSON;
        const p2 = Polygon.fromGeoJSON(gj);
        expect(p2.wkt).toBe(p.wkt);
    });
});

describe('Polygon - fromBox / getBoundingBox', () => {
    it('fromBox produces a polygon whose bounding box matches the source box', () => {
        const box = new BoundingBox(5, 7, 20, 30);
        const p = Polygon.fromBox(box);
        const bb = p.getBoundingBox();
        expect(bb.x).toBe(5);
        expect(bb.y).toBe(7);
        expect(bb.width).toBe(20);
        expect(bb.height).toBe(30);
    });

    it('getBoundingBox on empty polygon returns a default (0,0,0,0) box', () => {
        const bb = new Polygon().getBoundingBox();
        expect(bb.x).toBe(0);
        expect(bb.y).toBe(0);
        expect(bb.width).toBe(0);
        expect(bb.height).toBe(0);
    });

    it('getBoundingBox of the unit square is (0,0,10,10)', () => {
        const bb = makeSquare().getBoundingBox();
        expect(bb.x).toBe(0);
        expect(bb.y).toBe(0);
        expect(bb.width).toBe(10);
        expect(bb.height).toBe(10);
    });
});

describe('Polygon - offset', () => {
    it('offsets every point by (dx, dy)', () => {
        const p = makeSquare();
        const moved = Polygon.offset(p, 5, 3);
        const bb = moved.getBoundingBox();
        expect(bb.x).toBe(5);
        expect(bb.y).toBe(3);
        expect(bb.width).toBe(10);
        expect(bb.height).toBe(10);
    });

    it('offset of an empty polygon is empty', () => {
        const moved = Polygon.offset(new Polygon(), 5, 5);
        expect(moved.empty).toBe(true);
    });
});

describe('Polygon - scale', () => {
    it('scaling by 1 returns the same instance', () => {
        const p = makeSquare();
        expect(Polygon.scale(p, 1)).toBe(p);
    });

    it('scaling an empty polygon returns an empty polygon', () => {
        expect(Polygon.scale(new Polygon(), 2).empty).toBe(true);
    });

    it('scaling by 2 doubles the bounding box dimensions', () => {
        const p = makeSquare();
        const scaled = Polygon.scale(p, 2);
        const bb = scaled.getBoundingBox();
        expect(bb.width).toBe(20);
        expect(bb.height).toBe(20);
    });
});

describe('Polygon - clip (translate by box origin)', () => {
    it('translates coordinates so the box origin becomes (0,0)', () => {
        const p = Polygon.fromWkt('POLYGON((10 10,20 10,20 20,10 20,10 10))');
        const clipped = Polygon.clip(p, new BoundingBox(10, 10, 10, 10));
        const bb = clipped.getBoundingBox();
        expect(bb.x).toBe(0);
        expect(bb.y).toBe(0);
        expect(bb.width).toBe(10);
        expect(bb.height).toBe(10);
    });

    it('clip of an empty polygon is empty', () => {
        expect(Polygon.clip(new Polygon(), new BoundingBox(0, 0, 5, 5)).empty).toBe(true);
    });
});

describe('Polygon - boolean ops (add / subtract / intersect)', () => {
    const a = Polygon.fromWkt('POLYGON((0 0,10 0,10 10,0 10,0 0))');
    const b = Polygon.fromWkt('POLYGON((5 5,15 5,15 15,5 15,5 5))');

    it('add with an empty operand returns the other operand', () => {
        const empty = new Polygon();
        expect(Polygon.add(empty, a)).toBe(a);
        expect(Polygon.add(a, empty)).toBe(a);
    });

    it('union of two overlapping squares covers a larger bounding box', () => {
        const u = Polygon.add(a, b);
        expect(u.empty).toBe(false);
        const bb = u.getBoundingBox();
        expect(bb.x).toBe(0);
        expect(bb.y).toBe(0);
        expect(bb.width).toBe(15);
        expect(bb.height).toBe(15);
    });

    it('subtract with empty operand returns the first (a) operand', () => {
        expect(Polygon.subtract(a, new Polygon())).toBe(a);
        const empty = new Polygon();
        expect(Polygon.subtract(empty, b)).toBe(empty);
    });

    it('subtracting an overlapping square yields a non-empty L-shaped remainder', () => {
        const diff = Polygon.subtract(a, b);
        expect(diff.empty).toBe(false);
        // a is 0..10; removing the 5..15 overlap leaves the lower-left region.
        const bb = diff.getBoundingBox();
        expect(bb.x).toBe(0);
        expect(bb.y).toBe(0);
        expect(bb.width).toBe(10);
        expect(bb.height).toBe(10);
    });

    it('intersection of the two squares is the overlap 5..10 x 5..10', () => {
        const inter = Polygon.intersect(a, b);
        expect(inter.empty).toBe(false);
        const bb = inter.getBoundingBox();
        expect(bb.x).toBe(5);
        expect(bb.y).toBe(5);
        expect(bb.width).toBe(5);
        expect(bb.height).toBe(5);
    });

    it('intersection involving an empty polygon is empty', () => {
        expect(Polygon.intersect(a, new Polygon()).empty).toBe(true);
        expect(Polygon.intersect(new Polygon(), b).empty).toBe(true);
    });

    it('intersection of two disjoint squares is empty', () => {
        const far = Polygon.fromWkt('POLYGON((100 100,110 100,110 110,100 110,100 100))');
        expect(Polygon.intersect(a, far).empty).toBe(true);
    });
});

describe('Polygon - MULTIPOLYGON parsing', () => {
    it('parses a MULTIPOLYGON into a single (multi-ring) polygon', () => {
        const wkt =
            'MULTIPOLYGON(((0 0,10 0,10 10,0 10,0 0)),((20 20,30 20,30 30,20 30,20 20)))';
        const p = Polygon.fromWkt(wkt);
        expect(p.empty).toBe(false);
        const bb = p.getBoundingBox();
        expect(bb.x).toBe(0);
        expect(bb.y).toBe(0);
        // spans both sub-polygons
        expect(bb.width).toBe(30);
        expect(bb.height).toBe(30);
    });
});

describe('Polygon - isLegal', () => {
    it('a simple square is a legal polygon', () => {
        expect(makeSquare().isLegal()).toBe(true);
    });

    it('a self-intersecting bowtie is not legal', () => {
        // classic bowtie / figure-eight polygon
        const bowtie = Polygon.fromWkt('POLYGON((0 0,10 10,10 0,0 10,0 0))');
        expect(bowtie.isLegal()).toBe(false);
    });
});
