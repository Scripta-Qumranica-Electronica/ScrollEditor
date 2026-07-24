import { describe, it, expect } from 'vitest';
import { Placement, Matrix } from '@/utils/Placement';

describe('Placement', () => {
    it('empty() provides sensible defaults', () => {
        const p = Placement.empty;
        expect(p.scale).toBe(1);
        expect(p.rotate).toBe(0);
        expect(p.translate).toEqual({ x: 0, y: 0 });
        expect(p.zIndex).toBe(0);
    });

    it('constructs from a DTO', () => {
        const p = new Placement({
            scale: 2,
            rotate: 45,
            translate: { x: 10, y: 20 },
            zIndex: 3,
            mirrored: true,
        });
        expect(p.scale).toBe(2);
        expect(p.rotate).toBe(45);
        expect(p.translate).toEqual({ x: 10, y: 20 });
        expect(p.zIndex).toBe(3);
        expect(p.mirrored).toBe(true);
    });

    it('defaults translate to {0,0} when the DTO omits it', () => {
        const p = new Placement({ scale: 1, rotate: 0, zIndex: 0 } as any);
        expect(p.translate).toEqual({ x: 0, y: 0 });
    });

    it('clone() produces an equal but independent instance', () => {
        const p = new Placement({
            scale: 2,
            rotate: 45,
            translate: { x: 10, y: 20 },
            zIndex: 3,
            mirrored: false,
        });
        const c = p.clone();
        expect(c).not.toBe(p);
        expect(c.translate).not.toBe(p.translate);
        expect(c.scale).toBe(2);
        expect(c.translate).toEqual({ x: 10, y: 20 });

        // Mutating the clone's translate does not affect the original.
        c.translate.x = 999;
        expect(p.translate.x).toBe(10);
    });
});

describe('Placement.Matrix (transformMatrix wrapper)', () => {
    it('captures the transformMatrix property', () => {
        const m = new Matrix({ transformMatrix: 'foo' });
        expect(m.transformMatrix).toBe('foo');
    });
});
