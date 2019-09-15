import { ImageSetting } from '@/components/image-settings/types';
import { BaseEditorParams } from '@/components/editors/types';
import { Polygon } from '@/utils/Polygons';

export enum DrawingShapesMode {
    POLYGON, RECTANGLE
}
export enum DrawingMode {
    DRAW, ERASE
}

export class ArtefactEditorParams implements BaseEditorParams {
    public imageSettings = {} as ImageSetting;
    public zoom: number = 0.1;  // Zoom between 0 and 1
    public rotationAngle = 0;
    public brushSize = 20;
    public drawingMode = DrawingMode.DRAW;
}

export interface ArtefactEditorParamsChangedArgs {
    property: string;
    value: any;
    params: ArtefactEditorParams;
}

export interface ShapeSign {
    char: string;
    signId: number ;
    shape: DrawingShapesMode;
    polygon: Polygon;
}
