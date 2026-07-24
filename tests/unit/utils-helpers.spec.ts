import { describe, it, expect } from 'vitest';
import { countIf, BoundingBox } from '@/utils/helpers';

describe('helpers - countIf', () => {
    it('counts elements matching the predicate', () => {
        expect(countIf([1, 2, 3, 4, 5], x => x % 2 === 0)).toBe(2);
    });

    it('returns 0 for an empty array', () => {
        expect(countIf([], () => true)).toBe(0);
    });

    it('returns 0 when nothing matches', () => {
        expect(countIf([1, 3, 5], x => x % 2 === 0)).toBe(0);
    });

    it('returns the full length when everything matches', () => {
        expect(countIf(['a', 'b', 'c'], () => true)).toBe(3);
    });
});

describe('helpers - BoundingBox', () => {
    it('defaults to a zero box', () => {
        const bb = new BoundingBox();
        expect(bb.x).toBe(0);
        expect(bb.y).toBe(0);
        expect(bb.width).toBe(0);
        expect(bb.height).toBe(0);
    });

    it('stores constructor values', () => {
        const bb = new BoundingBox(1, 2, 3, 4);
        expect(bb.x).toBe(1);
        expect(bb.y).toBe(2);
        expect(bb.width).toBe(3);
        expect(bb.height).toBe(4);
    });

    it('toString renders the tuple', () => {
        expect(new BoundingBox(1, 2, 3, 4).toString()).toBe('(1, 2, 3, 4)');
    });

    it('combine merges multiple boxes into their bounding envelope', () => {
        const combined = BoundingBox.combine([
            new BoundingBox(0, 0, 10, 10),
            new BoundingBox(20, 5, 10, 30),
        ]);
        expect(combined.x).toBe(0);
        expect(combined.y).toBe(0);
        expect(combined.width).toBe(30); // 20 + 10 - 0
        expect(combined.height).toBe(35); // 5 + 30 - 0
    });

    it('combine of a single box returns an equivalent box', () => {
        const combined = BoundingBox.combine([new BoundingBox(3, 4, 5, 6)]);
        expect(combined.x).toBe(3);
        expect(combined.y).toBe(4);
        expect(combined.width).toBe(5);
        expect(combined.height).toBe(6);
    });

    it('combine handles negative-origin boxes', () => {
        const combined = BoundingBox.combine([
            new BoundingBox(-10, -10, 5, 5),
            new BoundingBox(0, 0, 10, 10),
        ]);
        expect(combined.x).toBe(-10);
        expect(combined.y).toBe(-10);
        expect(combined.width).toBe(20);
        expect(combined.height).toBe(20);
    });

    it('combine of no boxes throws', () => {
        expect(() => BoundingBox.combine([])).toThrow("Can't combine no bounding boxes");
    });
});
