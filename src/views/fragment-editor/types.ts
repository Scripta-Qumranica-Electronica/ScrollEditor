import { IIIFImage } from '@/models/image';
import { Polygon } from '@/utils/Polygons';

export enum DrawingMode {
    DRAW, ERASE
}

export interface SingleImageSetting {
    // Keep information about the image itself, to make rendering based on the setting simpler
    image: IIIFImage;
    type: string;
    visible: boolean;
    opacity: number; // Between 0 and 1
}

export interface ImageSetting {
    [image: string]: SingleImageSetting;
}

export class EditorParams {
    public imageSettings = {} as ImageSetting;
    public zoom = 0.1;  // Zoom between 0 and 1
    public brushSize = 20;
    public clipMask = false;
    public drawingMode = DrawingMode.DRAW;
}

export interface EditorParamsChangedArgs {
    property: string;
    value: any;
    params: EditorParams;
}

export class MaskChangedEventArgs {
    public polygon = {} as Polygon;
    public drawingMode = DrawingMode.DRAW;
    public delta = {} as Polygon;
}

export class Point {
    public x: number;
    public y: number;

    constructor(obj: any) {
        this.x = obj.x;
        this.y = obj.y;
    }
}
