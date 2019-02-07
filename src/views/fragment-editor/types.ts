import { IIIFImage } from '@/models/image';
import { Polygon } from '@/utils/Polygons';
import { Artefact } from '@/models/artefact';

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
    public zoom: number = 0.1;  // Zoom between 0 and 1
    public brushSize = 20;
    public clipMask = false;
    public drawingMode = DrawingMode.DRAW;
    public rotationAngle = 0;
}

export interface EditorParamsChangedArgs {
    property: string;
    value: any;
    params: EditorParams;
}

export class Operation {
    public artefact = {} as Artefact;

    public undo() {
        console.log('operation. undo');
    }

    public redo() {
        console.log('operation. redo');
    }
}

export class MaskChangeOperation extends Operation {
    public polygon = {} as Polygon;
    public drawingMode = DrawingMode.DRAW;
    public delta = {} as Polygon;
}

export class RotationOperation extends Operation {

}

export interface ZoomRequestEventArgs {
    amount: number;
    clientPosition: Position; // Position in client coordinates
}

export interface Position {
    x: number;
    y: number;
}

export class ArtefactEditingData {
    public undoList = [] as MaskChangeOperation[];
    public redoList = [] as MaskChangeOperation[];
    public dirty = false;
}
