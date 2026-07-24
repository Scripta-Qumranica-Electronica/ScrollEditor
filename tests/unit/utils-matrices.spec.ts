import { describe, it, expect } from 'vitest';
import { Matrix } from '@/utils/Matrices';

describe('Matrices - factory constructors', () => {
    it('unit() is the identity matrix in SVG form', () => {
        // toSVG returns [a, b, c, d, e, f] = column-major 2x3 for SVG transform.
        expect(Matrix.unit().toSVG()).toEqual([1, 0, 0, 1, 0, 0]);
    });

    it('scale() builds a scaling matrix', () => {
        expect(Matrix.scale(2).toSVG()).toEqual([2, 0, 0, 2, 0, 0]);
    });

    it('translation() builds a translation matrix', () => {
        expect(Matrix.translation(5, 7).toSVG()).toEqual([1, 0, 0, 1, 5, 7]);
    });

    it('rotation(0) is the identity', () => {
        const svg = Matrix.rotation(0).toSVG();
        expect(svg[0]).toBeCloseTo(1);
        expect(svg[1]).toBeCloseTo(0);
        expect(svg[2]).toBeCloseTo(0);
        expect(svg[3]).toBeCloseTo(1);
    });

    it('rotation(90) rotates the axes', () => {
        const svg = Matrix.rotation(90).toSVG();
        // cos90=0, sin90=1: [cos, sin, -sin, cos, 0, 0]
        expect(svg[0]).toBeCloseTo(0); // cos
        expect(svg[1]).toBeCloseTo(1); // sin
        expect(svg[2]).toBeCloseTo(-1); // -sin
        expect(svg[3]).toBeCloseTo(0); // cos
    });

    it('rotation(-90) is the inverse rotation', () => {
        const svg = Matrix.rotation(-90).toSVG();
        expect(svg[1]).toBeCloseTo(-1);
        expect(svg[2]).toBeCloseTo(1);
    });
});

describe('Matrices - multiply', () => {
    it('multiplying by the unit matrix is a no-op', () => {
        const t = Matrix.translation(3, 4);
        const product = Matrix.multiply(t, Matrix.unit());
        expect(product.toSVG()).toEqual(t.toSVG());
    });

    it('composes scale then translate', () => {
        const product = Matrix.multiply(Matrix.translation(10, 20), Matrix.scale(2));
        const svg = product.toSVG();
        // scaling factors preserved, translation preserved
        expect(svg[0]).toBeCloseTo(2);
        expect(svg[3]).toBeCloseTo(2);
        expect(svg[4]).toBeCloseTo(10);
        expect(svg[5]).toBeCloseTo(20);
    });
});

describe('Matrices - fromXY / rawVector', () => {
    it('fromXY builds a homogeneous point vector', () => {
        const v = Matrix.fromXY(3, 4).rawVector;
        expect(v).toEqual([3, 4, 1]);
    });
});

describe('Matrices - toDB / fromDB', () => {
    it('toDB serializes the top two rows under a "matrix" key', () => {
        const db = Matrix.translation(5, 6).toDB();
        const parsed = JSON.parse(db);
        expect(parsed.matrix).toEqual([
            [1, 0, 5],
            [0, 1, 6],
        ]);
    });

    it('fromDB throws when the db object has no matrix-shaped array (array lacks a matrix property)', () => {
        // The DB format is a bare 2x3 array; the current implementation checks
        // hasOwnProperty('matrix') on the parsed array, which fails for arrays.
        expect(() => Matrix.fromDB('[[1,0,0],[0,1,0]]')).toThrow(
            "does not have a matrix property",
        );
    });

    it('fromDB throws for wrong dimensions', () => {
        // Give it an object that *has* a matrix property to pass the first guard,
        // but wrong dimensions so it hits the dimension guard.
        expect(() => Matrix.fromDB('{"matrix":[[1,2,3]]}')).toThrow();
    });
});
