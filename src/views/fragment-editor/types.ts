export enum DrawingMode {
    DRAW, ERASE
}

export interface SingleImageSetting {
    show: boolean;
    intensity: number;
}

export interface ImageSetting { 
    [image: string]: SingleImageSetting;
}

export class EditorParams {
    public imageSettings = {} as ImageSetting;
    public zoom = 50;
    public brushSize = 20;
    public mask = false;
    public drawingMode = DrawingMode.DRAW;
}
