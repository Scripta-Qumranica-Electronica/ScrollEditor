import { ImageSetting } from '@/components/image-settings/types';


export class ArtefactEditorParams {
    public imageSettings = {} as ImageSetting;
    public zoom: number = 0.1;  // Zoom between 0 and 1
    public rotationAngle = 0;
}

export interface ArtefactEditorParamsChangedArgs {
    property: string;
    value: any;
    params: ArtefactEditorParams;
}
