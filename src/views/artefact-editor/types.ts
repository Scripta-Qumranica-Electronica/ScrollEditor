import { ImageSetting } from '@/components/image-settings/types';
import { BaseEditorParams } from '@/models/editor-params';
import { Polygon } from '@/utils/Polygons';

export class ArtefactEditorParams implements BaseEditorParams {
    public imageSettings = {} as ImageSetting;
    public zoom: number = 0.15;  // Zoom between 0 and 1
    public rotationAngle = 0;
}

export interface ArtefactEditorParamsChangedArgs {
    property: string;
    value: any;
    params: ArtefactEditorParams;
}

