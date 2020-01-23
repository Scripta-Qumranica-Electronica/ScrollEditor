import { Polygon } from './Polygons';
import { TransformationDTO, PolygonDTO } from '@/dtos/sqe-dtos';

export class Matrix {
    public transformMatrix: string;

    constructor(obj: any) {
        this.transformMatrix = obj.transformMatrix;
    }
}


// A Mask is a Polygon and Transformation pair
export class Mask {
    public transformation: TransformationDTO;
    public polygon: Polygon;

    constructor(obj: PolygonDTO) {
        this.transformation = obj.transformation;
        this.polygon = Polygon.fromWkt(obj.mask);
    }
}
