// Return the count of elements in the array that fulfill some criteria
// Originally we used array.filter(x=>criteria(x)).length
// Bronson replaced it with a less readable but more efficient array.reduce((acc, x) => criteria(x) ? acc+1 : acc, 0)
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
