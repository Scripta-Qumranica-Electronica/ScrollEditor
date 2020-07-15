import { ImageSetting } from '@/components/image-settings/types';
import { BaseEditorParams } from '@/models/editor-params';
import { Polygon } from '@/utils/Polygons';

export type ScrollEditorMode = '' | 'move'| 'scale' |'rotate' | 'manageGroup';

export class ArtefactEditorParams implements BaseEditorParams {
    public imageSettings = {} as ImageSetting;
    public zoom: number = 0.15;  // Zoom between 0 and 1
    public rotationAngle = 0;
}

export class ScrollEditorParams extends ArtefactEditorParams {
    public mode: ScrollEditorMode = '';
    public move = 5;
    public scale = 5;
    public rotate = 45;
    public zoom: number = 0.10;
}

export interface ArtefactEditorParamsChangedArgs {
    property: string;
    value: any;
    params: ArtefactEditorParams | ScrollEditorParams;
}

