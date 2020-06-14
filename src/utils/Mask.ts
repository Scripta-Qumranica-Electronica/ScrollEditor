import { Polygon } from './Polygons';
import { TransformationDTO, PolygonDTO, TranslateDTO } from '@/dtos/sqe-dtos';

export class Matrix {
    public transformMatrix: string;

    constructor(obj: any) {
        this.transformMatrix = obj.transformMatrix;
    }
}


export class Transformation implements TransformationDTO {  // Shaindel - Rename into Placement
    public static get empty() {
        return new Transformation({
        } as TransformationDTO);
    }
    public scale: number;
    public rotate: number;
    public translate: TranslateDTO;
    public zIndex: number;

    public constructor(dto: TransformationDTO) {
        this.scale = dto.scale;
        this.rotate = dto.rotate;
        this.translate = dto.translate;
        this.zIndex = dto.zIndex;
    }

    public clone(): Transformation {
        return new Transformation({
            scale: this.scale,
            rotate: this.rotate,
            translate: { ...this.translate },
            zIndex: this.zIndex
        });
    }
}
// A Mask is a Polygon and Transformation pair
export class Mask {  // Shaindel - delete this object, we no longer need it
    public transformation: Transformation;
    public polygon: Polygon;

    constructor(obj: PolygonDTO) {
        this.transformation = new Transformation(obj.transformation);
        this.polygon = Polygon.fromWkt(obj.mask);
    }
}
