import { TranslateDTO, PlacementDTO } from '@/dtos/sqe-dtos';

export class Matrix {
    public transformMatrix: string;

    constructor(obj: any) {
        this.transformMatrix = obj.transformMatrix;
    }
}


export class Placement implements PlacementDTO {
    public static get empty() {
        return new Placement({
            rotate: 0,
            scale: 1,
            translate: { x: 0, y: 0 },
            zIndex: 0
        } as PlacementDTO);
    }

    public scale: number;
    public rotate: number;
    public translate: TranslateDTO;
    public zIndex: number;
    public mirrored: boolean;

    public constructor(dto: PlacementDTO) {
        this.scale = dto.scale;
        this.rotate = dto.rotate;
        this.translate = dto.translate || { x: 0, y: 0 };
        this.zIndex = dto.zIndex;
        this.mirrored = false;
    }

    public clone(): Placement {
        return new Placement({
            scale: this.scale,
            rotate: this.rotate,
            translate: { ...this.translate },
            zIndex: this.zIndex,
            mirrored: this.mirrored
        });
    }
}

