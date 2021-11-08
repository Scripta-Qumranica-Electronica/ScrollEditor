import { ImageSetting } from '@/components/image-settings/types';
import { BaseEditorParams } from '@/models/editor-params';

// export type ScrollEditorMode = '' | 'move'| 'scale' |'rotate' | 'manageGroup';
export type ScrollEditorOpMode =
    | ''
    | 'mirror'
    | 'move'
    | 'scale'
    | 'rotate'
    | 'manageGroup';
export type ArtefactEditorMode = 'artefact' | 'text-fragment';
export class ArtefactEditorParams implements BaseEditorParams {
    public imageSettings = {} as ImageSetting;
    public zoom: number = 0.15; // Zoom between 0 and 1
    public rotationAngle = 0;
    public fontSize: number;

    constructor() {
        this.fontSize = parseInt((localStorage.getItem('font-size') || '12'), 10);
    }

}

export class ScrollEditorParams extends ArtefactEditorParams {
    public mode: ScrollEditorOpMode = '';
    public move = 5;
    public scale = 5;
    public rotate = 45;
    public zoom: number = 0.1;
}

export interface ArtefactEditorParamsChangedArgs {
    property: string;
    value: any;
    params: ArtefactEditorParams | ScrollEditorParams;
}
