import { IIIFImage } from '@/models/image';
import { Polygon, DrawPolygon, ExtractPolygon } from '@/utils/Polygons';
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

/* TODO: Report a bitmap and not a polygon */
export interface MaskChangedEventArgs {
    bitmap: ImageData;
}

export interface MaskChangeOperation { // extends Operation {
    polygon: Polygon;
    bitmap: ImageData;
    drawingMode: DrawingMode;
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
    public bitmap: ImageData;
    private bitmapWidth: number;
    private bitmapHeight: number;

    public constructor(artefact: Artefact, fragmentIndex: number, shrinkFactor: number, width: number, height: number) {
        super(artefact);

        this.color = OptimizedArtefact.colors[fragmentIndex % OptimizedArtefact.colors.length];
        this.shrinkFactor = shrinkFactor;

        this.bitmapWidth = width / shrinkFactor;
        this.bitmapHeight = height / shrinkFactor;
        this.bitmap = DrawPolygon(artefact.mask, this.bitmapWidth, this.bitmapHeight, this.color, 1 / shrinkFactor);
    }

    public async recalculateMask() {
        debugger
        this.mask = await ExtractPolygon(this.bitmap, this.bitmap.width, this.bitmap.height, 1);
        // console.log('New mask ', this.mask);
        this.mask = Polygon.scale(this.mask, this.shrinkFactor);
        // console.log('Scaled mask ', this.mask);
    }

    public async calcOptimizedPolygon() {
        return await ExtractPolygon(this.bitmap, this.bitmapWidth, this.bitmapHeight, 1);
    }
}
