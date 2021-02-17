// Return the count of elements in the array that fulfill some criteria
// Originally we used array.filter(x=>criteria(x)).length
// Bronson replaced it with a less readable but more efficient array.reduce((acc, x) => criteria(x) ? acc+1 : acc, 0)

import { bitXor } from 'mathjs';

// So we just moved it to this handy function
export function countIf<T>(array: T[], predicate: (element: T) => boolean) {
    // using array.filter creates a new array. array.reduce avoids this and just needs the accumulator
    return array.reduce((acc, element) => predicate(element) ? acc + 1 : acc, 0);
}

export interface BoundingBoxInterface {
    x: number;
    y: number;
    width: number;
    height: number;
}

export class BoundingBox implements BoundingBoxInterface {
    public x: number;
    public y: number;
    public width: number;
    public height: number;

    public static combine(boxes: BoundingBox[]): BoundingBox {
        if (!boxes.length) {
            throw new Error("Can't combine no bounding boxes");
        }

        // const x1s = boxes.map(b => b.x);
        // const x1 = Math.min(...x1s);

        // const x2s = boxes.map(b => b.x + b.width);
        // const x2 = Math.max(...x2s);

        // const y1s = boxes.map(b => b.y);
        // const y1 = Math.min(...y1s);

        // const y2s = boxes.map(b => b.y + b.height);
        // const y2 = Math.max(...y2s);

        let minX = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;

        for ( const box of boxes) {
           minX = Math.min(minX, box.x);
           minY = Math.min(minY, box.y);
           maxX = Math.max(maxX, box.x + box.width);
           maxY = Math.max(maxY, box.y + box.height);
        }

        // return new BoundingBox(x1, y1, x2 - x1, y2 - y1);
        return new BoundingBox(minX, minY, maxX - minX, maxY - minY);
    }

    constructor(x: number = 0, y: number = 0, width: number = 0, height: number = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    public toString() {
        return `(${this.x}, ${this.y}, ${this.width}, ${this.height})`;
    }
}


export interface Point {
    x: number;
    y: number;
}

export interface Rectangle {
    topLeft: Point;
    bottomRight: Point;
}

export interface DropdownOption {
    displayName: string;
    name: string;
}
