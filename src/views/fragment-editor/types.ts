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

/* TODO: Report a bitmap and not a polygon */
export class MaskChangeOperation { // extends Operation {
    public polygon = {} as Polygon;
    public drawingMode = DrawingMode.DRAW;
    // public delta = {} as Polygon;
}

/* TODO: Add a new type for the undo poerations, which will contain a bitmap *and* a polygon */

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

export class ArtefactEditingData {
    public undoList = [] as MaskChangeOperation[];
    public redoList = [] as MaskChangeOperation[];
    public dirty = false;
}

export class OptimizedArtefact extends Artefact {
    /* TODO: Add a bitmap instead of the optimized mask, and initialize it in the constructor (call DrawPolygon) */

    private static colors = [
        'purple', 'blue', 'orange', 'red', 'green', 'gray', 'magenta', 'olive', 'brown', 'cadetBlue'
    ];

    public color: string;
    public shrinkFactor: number;
    public optimizedMask: Polygon;

    public constructor(artefact: Artefact, fragmentIndex: number, shrinkFactor: number) {
        super(artefact);

        this.color = OptimizedArtefact.colors[fragmentIndex % OptimizedArtefact.colors.length];
        this.shrinkFactor = shrinkFactor;

        this.optimizedMask = Polygon.scale(artefact.mask, 1 / this.shrinkFactor);
    }

    public unoptimizeMask() {
        this.mask = Polygon.scale(this.optimizedMask, this.shrinkFactor);
    }

    /*
     * Add a shrinkFactor parameter to the constructor.
     * Add an optimizedMask property of type polygon.
     * Use this.optimizedMask = Polygon.scale(artefact.mask, 1 / this.shrinkFactor) to fill it (in the constructor);
     *
     * Add an unoptimize method: unoptimizeMask which will set this.mask to Polgyon.scale(optimizedMask,...)
     */
}
