import { describe, it, expect } from 'vitest';
import { integrifyPosition } from '@/models/misc';
import type { Position } from '@/models/misc';

describe('misc — integrifyPosition', () => {
    it('rounds positive fractional coordinates', () => {
        const p: Position = { x: 1.4, y: 2.6 };
        expect(integrifyPosition(p)).toEqual({ x: 1, y: 3 });
    });

    it('rounds negative fractional coordinates', () => {
        expect(integrifyPosition({ x: -1.5, y: -2.4 })).toEqual({ x: -1, y: -2 });
    });

    it('leaves whole numbers unchanged', () => {
        expect(integrifyPosition({ x: 10, y: 20 })).toEqual({ x: 10, y: 20 });
    });

    it('returns a new object (does not mutate)', () => {
        const p = { x: 1.2, y: 3.4 };
        const result = integrifyPosition(p);
        expect(result).not.toBe(p);
        expect(p).toEqual({ x: 1.2, y: 3.4 });
    });
});
