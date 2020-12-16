import { ImagedObjectEditorParams } from '@/views/imaged-object-editor/types';
import { StateManager } from '.';

function state() {
    return StateManager.instance;
}

export class ImagedObjectState {
    public params: ImagedObjectEditorParams | null = null;

    constructor() {
        this.params = new ImagedObjectEditorParams();
    }
}
