import { Polygon } from '@/utils/Polygons';
import { Artefact } from '@/models/artefact';
import { ImageSetting } from '@/components/image-settings/types';
import { BaseEditorParams } from '@/models/editor-params';

export enum DrawingMode {
    DRAW, ERASE
}

export enum EditMode {
    DRAWING, ADJUSTING, NONE
}

export class ImagedObjectEditorParams implements BaseEditorParams {
    public imageSettings = {} as ImageSetting;
    public zoom: number = 0.1;  // Zoom between 0 and 1
    public clipMask = false;
    public background = true;
    public drawingMode = DrawingMode.DRAW;
    public rotationAngle = 0;
}

export interface EditorParamsChangedArgs {
    property: string;
    value: any;
    params: ImagedObjectEditorParams;
}

export interface MaskChangedEventArgs {
    mask: Polygon;
    drawingMode: DrawingMode;
}

export interface MaskChangeOperation {
    // Previous values for the undo
    prevMask: Polygon;

    // New values for the redo
    newMask: Polygon;
}

export class ArtefactEditingData {
    public undoList = [] as MaskChangeOperation[];
    public redoList = [] as MaskChangeOperation[];
    public dirty = false;
}
