import { IIIFImage } from '@/models/image';

export enum DrawingMode {
    DRAW, ERASE
}

export interface SingleImageSetting {
    // Keep information about the image itself, to make rendering based on the setting simpler
    image: IIIFImage;
    type: string;
    visible: boolean;
    opacity: number;
}

export interface ImageSetting {
    [image: string]: SingleImageSetting;
}

export class EditorParams {
    public imageSettings = {} as ImageSetting;
    public zoom = 10;
    public brushSize = 20;
    public clipMask = false;
    public drawingMode = DrawingMode.DRAW;
}

export interface EditorParamsChangedArgs {
    property: string;
    value: any;
    params: EditorParams;
}
