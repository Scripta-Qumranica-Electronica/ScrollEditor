export enum DrawingMode {
    DRAW, ERASE
}

export interface SingleImageSetting {
    visible: boolean;
    opacity: number;
}

export interface ImageSetting {
    [image: string]: SingleImageSetting;
}

export class EditorParams {
    public imageSettings = {} as ImageSetting;
    public zoom = 50;
    public brushSize = 20;
    public clipMask = false;
    public drawingMode = DrawingMode.DRAW;
}

export interface EditorParamsChangedArgs {
    property: string;
    value: any;
    params: EditorParams;
}
