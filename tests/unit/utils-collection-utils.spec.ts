import { describe, it, expect } from 'vitest';
import {
    addToArray,
    updateInArray,
    removeFromArray,
} from '@/utils/collection-utils';

interface Item {
    id: number;
    label?: string;
}

describe('collection-utils - addToArray', () => {
    it('appends a new item', () => {
        const arr: Item[] = [{ id: 1 }];
        addToArray({ id: 2 }, arr);
        expect(arr.map(i => i.id)).toEqual([1, 2]);
    });

    it('replaces an existing item with the same id', () => {
        const arr: Item[] = [{ id: 1, label: 'old' }];
        addToArray({ id: 1, label: 'new' }, arr);
        expect(arr.length).toBe(1);
        expect(arr[0].label).toBe('new');
    });

    it('is a no-op when the array is undefined', () => {
        expect(() => addToArray({ id: 1 }, undefined)).not.toThrow();
    });
});

describe('collection-utils - updateInArray', () => {
    it('replaces an existing item and returns the array', () => {
        const arr: Item[] = [{ id: 1, label: 'old' }, { id: 2 }];
        const result = updateInArray({ id: 1, label: 'new' }, arr);
        expect(result).toBe(arr);
        expect(arr[0].label).toBe('new');
    });

    it('returns the array unchanged when the id is missing', () => {
        const arr: Item[] = [{ id: 1 }];
        const result = updateInArray({ id: 99 }, arr);
        expect(result).toBe(arr);
        expect(arr.length).toBe(1);
    });

    it('is a no-op (returns undefined) when the array is undefined', () => {
        expect(updateInArray({ id: 1 }, undefined)).toBeUndefined();
    });
});

describe('collection-utils - removeFromArray', () => {
    it('removes the item with the given id', () => {
        const arr: Item[] = [{ id: 1 }, { id: 2 }, { id: 3 }];
        removeFromArray(2, arr);
        expect(arr.map(i => i.id)).toEqual([1, 3]);
    });

    it('does nothing when the id is not present', () => {
        const arr: Item[] = [{ id: 1 }];
        removeFromArray(99, arr);
        expect(arr.length).toBe(1);
    });

    it('is a no-op when the array is undefined', () => {
        expect(() => removeFromArray(1, undefined)).not.toThrow();
    });
});
