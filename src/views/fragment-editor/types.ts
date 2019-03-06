import { IIIFImage } from '@/models/image';
import { Polygon } from '@/utils/Polygons';
import { Artefact } from '@/models/artefact';
import { Position, PointerTrackingEvent } from '@/utils/PointerTracker';

export enum DrawingMode {
    DRAW, ERASE
}

// export enum EditMode {
//     DRAWING, ADJUSTING, NONE
// }

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

export class MaskChangeOperation { // extends Operation {
    public polygon = {} as Polygon;
    public drawingMode = DrawingMode.DRAW;
    public delta = {} as Polygon;
}

export class RotationOperation extends Operation {
    public angle = 0;

    public combine() {
        console.log('combine angles');
    }
}

export interface ZoomRequestEventArgs {
    amount: number;
    clientPosition: Position; // Position in client coordinates
}

export interface MoveRequestEventArgs {
    delta: Position;
}

export class ArtefactEditingData {
    public undoList = [] as MaskChangeOperation[];
    public redoList = [] as MaskChangeOperation[];
    public dirty = false;
}

export class AdjustmentData {
    public center: Position;
    public distance: number;
    public timeStamp: number;

    public constructor(evt1: PointerTrackingEvent, evt2: PointerTrackingEvent) {
        this.center = {
            x: (evt1.logicalPosition.x + evt2.logicalPosition.x) / 2,
            y: (evt1.logicalPosition.y + evt2.logicalPosition.y) / 2,
        } as Position;

        const deltaX = evt1.logicalPosition.x - evt2.logicalPosition.x;
        const deltaY = evt1.logicalPosition.y - evt2.logicalPosition.y;
        this.distance = Math.sqrt(deltaX * deltaX + deltaY + deltaY);

        this.timeStamp = Math.max(evt1.timeStamp, evt2.timeStamp);
    }
}
