import { Polygon } from './Polygons';

export class Matrix {
    public transformMatrix: string;

    constructor(obj: any) {
        this.transformMatrix = obj.transformMatrix;
    }
}


export class Mask {
    public matrix: Matrix;
    public polygon: Polygon;

    constructor(obj: any) {
        this.matrix = obj.matrix;
        this.polygon = obj.polygon ? Polygon.fromWkt(obj.polygon.mask) : {} as Polygon;
    }
}
